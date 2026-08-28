// Vercel Serverless Function — POST /api/generate
// Body commun : { matiere, anneeDeclaree, champLabel, codeSousPoint, codeAcces, phase }
//   phase "cadrage"  : + exerciceTexte
//   phase "enonces"  : + exerciceTexte, cadrage
//   phase "grille"   : + cadrage, enonces
// ANTHROPIC_API_KEY reste côté serveur uniquement.

import * as Maths from '../src/lib/matieres/maths.js'
import * as Francais from '../src/lib/matieres/francais.js'
import { SCHEMA_CADRAGE, SCHEMA_ENONCES, SCHEMA_GRILLE } from '../src/lib/matieres/_generationSchema.js'
import { verifierQuota } from './_rateLimit.js'

const MODULES = { maths: Maths, francais: Francais }
const MODEL = 'claude-sonnet-4-6'

const PHASES = {
  cadrage: { schema: SCHEMA_CADRAGE, maxTokens: 2000, build: (m, b) => m.construirePromptCadrage(b) },
  enonces: { schema: SCHEMA_ENONCES, maxTokens: 6000, build: (m, b) => m.construirePromptEnonces(b) },
  grille:  { schema: SCHEMA_GRILLE,  maxTokens: 2000, build: (m, b) => m.construirePromptGrille(b) },
}

function ipDe(req) {
  const xff = req.headers['x-forwarded-for']
  if (xff) return String(xff).split(',')[0].trim()
  return req.socket?.remoteAddress ?? 'inconnue'
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' })

  const { matiere, anneeDeclaree, champLabel, codeSousPoint, exerciceTexte, cadrage, enonces, codeAcces, phase } = req.body ?? {}

  if (!phase || !PHASES[phase]) return res.status(400).json({ error: `Phase "${phase}" inconnue (attendu : cadrage, enonces ou grille).` })
  if (!matiere || !anneeDeclaree || !champLabel || !codeSousPoint) {
    return res.status(400).json({ error: 'Champs requis manquants (matiere, anneeDeclaree, champLabel, codeSousPoint).' })
  }
  if ((phase === 'cadrage' || phase === 'enonces') && !exerciceTexte) {
    return res.status(400).json({ error: 'exerciceTexte requis pour cette phase.' })
  }
  if ((phase === 'enonces' || phase === 'grille') && !cadrage) {
    return res.status(400).json({ error: 'cadrage requis pour cette phase.' })
  }
  if (phase === 'grille' && !enonces) {
    return res.status(400).json({ error: 'enonces requis pour la phase grille.' })
  }

  const codeAttendu = process.env.PROGRESSACTIF_ACCESS_CODE
  if (!codeAttendu) return res.status(500).json({ error: 'Code d\'accès non configuré côté serveur (PROGRESSACTIF_ACCESS_CODE).' })
  if (codeAcces !== codeAttendu) return res.status(401).json({ error: 'Code d\'accès invalide.' })

  const quota = verifierQuota(ipDe(req))
  if (!quota.ok) {
    res.setHeader?.('Retry-After', String(quota.retryAfterS))
    return res.status(429).json({ error: `Trop de générations récentes. Réessayez dans ~${Math.ceil(quota.retryAfterS / 60)} min.` })
  }

  const module = MODULES[matiere]
  if (!module) return res.status(400).json({ error: `Matière "${matiere}" non encore disponible.` })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'Clé API manquante (ANTHROPIC_API_KEY)' })

  const conf = PHASES[phase]
  const contexte = module.blocContexteReferentiel({ anneeDeclaree, champLabel, codeSousPoint })
  const promptPhase = conf.build(module, { anneeDeclaree, champLabel, codeSousPoint, exerciceTexte, cadrage, enonces })

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: conf.maxTokens,
        // system[0] = bloc contexte identique aux 3 phases → mis en cache.
        // system[1] = instructions propres à la phase (dont le cadrage injecté).
        system: [
          { type: 'text', text: contexte, cache_control: { type: 'ephemeral' } },
          { type: 'text', text: promptPhase },
        ],
        output_config: { format: { type: 'json_schema', schema: conf.schema } },
        messages: [{ role: 'user', content: `Traite la phase "${phase}".` }],
      }),
    })

    if (!resp.ok) {
      const errText = await resp.text()
      return res.status(502).json({ error: `Erreur API Anthropic : ${errText}` })
    }

    const data = await resp.json()
    const texte = data.content?.[0]?.text ?? '{}'
    const resultat = JSON.parse(texte)
    return res.status(200).json({ resultat })
  } catch (err) {
    return res.status(500).json({ error: `Erreur serveur : ${err.message}` })
  }
}
