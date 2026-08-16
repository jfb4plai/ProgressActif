// Vercel Serverless Function — Route : POST /api/generate
// Body : { matiere, anneeDeclaree, champLabel, codeSousPoint, exerciceTexte }
// ANTHROPIC_API_KEY reste côté serveur uniquement (jamais exposée au frontend).

import { construirePromptSysteme as promptMaths } from '../src/lib/matieres/maths.js'
import { construirePromptSysteme as promptFrancais } from '../src/lib/matieres/francais.js'
import { GENERATION_SCHEMA } from '../src/lib/matieres/_generationSchema.js'

const MODULES = {
  maths: { construirePromptSysteme: promptMaths },
  francais: { construirePromptSysteme: promptFrancais },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' })
  }

  const { matiere, anneeDeclaree, champLabel, codeSousPoint, exerciceTexte, codeAcces } = req.body ?? {}
  if (!matiere || !anneeDeclaree || !champLabel || !codeSousPoint || !exerciceTexte) {
    return res.status(400).json({ error: 'Champs requis manquants (matiere, anneeDeclaree, champLabel, codeSousPoint, exerciceTexte).' })
  }

  // Gate bêta interne — pas d'auth complète, juste un code partagé pour éviter qu'un usage
  // hors du cercle bêta ne consomme la clé Anthropic sans limite. Échec fermé : si le code
  // n'est pas configuré côté serveur, l'endpoint refuse plutôt que de tourner sans protection.
  const codeAttendu = process.env.PROGRESSACTIF_ACCESS_CODE
  if (!codeAttendu) return res.status(500).json({ error: 'Code d\'accès non configuré côté serveur (PROGRESSACTIF_ACCESS_CODE).' })
  if (codeAcces !== codeAttendu) {
    return res.status(401).json({ error: 'Code d\'accès invalide.' })
  }

  const module = MODULES[matiere]
  if (!module) {
    return res.status(400).json({ error: `Matière "${matiere}" non encore disponible.` })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'Clé API manquante (ANTHROPIC_API_KEY)' })

  const systemPrompt = module.construirePromptSysteme({ anneeDeclaree, champLabel, codeSousPoint, exerciceTexte })

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 6000,
        system: systemPrompt,
        // Sortie contrainte par schéma — pas de prose Markdown à parser côté client.
        output_config: { format: { type: 'json_schema', schema: GENERATION_SCHEMA } },
        messages: [{ role: 'user', content: 'Traite l\'exercice source selon les 3 étapes décrites.' }],
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
