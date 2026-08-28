import P1 from '../../data/referentiel/maths/P1.json' with { type: 'json' }
import P2 from '../../data/referentiel/maths/P2.json' with { type: 'json' }
import P3 from '../../data/referentiel/maths/P3.json' with { type: 'json' }
import P4 from '../../data/referentiel/maths/P4.json' with { type: 'json' }
import P5 from '../../data/referentiel/maths/P5.json' with { type: 'json' }
import P6 from '../../data/referentiel/maths/P6.json' with { type: 'json' }

export const ANNEES = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6']

const CORPUS = { P1, P2, P3, P4, P5, P6 }

export function anneeSuivante(annee) {
  const i = ANNEES.indexOf(annee)
  return i >= 0 && i < ANNEES.length - 1 ? ANNEES[i + 1] : null
}

export function anneePrecedente(annee) {
  const i = ANNEES.indexOf(annee)
  return i > 0 ? ANNEES[i - 1] : null
}

export function champsDisponibles(annee) {
  return CORPUS[annee]?.champs ?? []
}

// Retrouve le même sous-point (identifié par son code, ex. "3.2") dans une autre année.
// Renvoie null si le sous-point n'existe pas cette année-là — cas réel rencontré en
// sciences (sous-thème absent une année) et jamais à exclure côté maths sans vérifier.
export function trouverSousPoint(annee, champLabel, codeSousPoint) {
  const champs = champsDisponibles(annee)
  const champ = champs.find(c => c.champ === champLabel)
  if (!champ) return null
  return champ.sous_points.find(sp => sp.code === codeSousPoint) ?? null
}

// Construit le bloc de contexte référentiel pour un sous-point donné, sur les 3 années
// (précédente / déclarée / suivante). N'invente rien si un palier n'a pas ce sous-point —
// le prompt système doit pouvoir raisonner sur son absence plutôt que de la masquer.
export function contexteReferentiel({ anneeDeclaree, champLabel, codeSousPoint }) {
  const avant = anneePrecedente(anneeDeclaree)
  const apres = anneeSuivante(anneeDeclaree)

  const decrire = (annee) => {
    if (!annee) return null
    const sp = trouverSousPoint(annee, champLabel, codeSousPoint)
    if (!sp) return { annee, existe: false }
    return { annee, existe: true, sousPoint: sp }
  }

  return {
    precedente: decrire(avant),
    declaree: decrire(anneeDeclaree),
    suivante: decrire(apres),
  }
}

function formaterSousPoint(sp) {
  if (!sp) return '(absent — pas d\'attendu officiel à cette année pour ce sous-point)'
  const lignes = (sp.items ?? []).map(it =>
    `  - [${it.type}] ${it.contenu}\n    Attendus : ${it.attendus.join(' | ')}`
  ).join('\n')
  return `${sp.code} — ${sp.titre}\nContexte annuel : ${sp.contexte_annuel}\n${lignes}`
}

// --- Bloc partagé, identique aux 3 phases → marqué pour le prompt caching côté API ---
export function blocContexteReferentiel({ anneeDeclaree, champLabel, codeSousPoint }) {
  const ctx = contexteReferentiel({ anneeDeclaree, champLabel, codeSousPoint })
  return `## Contexte référentiel (source unique de vérité — ne rien inventer au-delà)

Année déclarée par l'enseignant : ${anneeDeclaree}
Champ : ${champLabel}
Sous-point ciblé : ${codeSousPoint}

### Année précédente (${ctx.precedente?.annee ?? 'aucune — c\'est déjà P1'})
${ctx.precedente ? formaterSousPoint(ctx.precedente.sousPoint) : 'N/A (P1 est la première année du primaire — s\'ancrer sur la posture maternelle si besoin).'}

### Année déclarée (${anneeDeclaree})
${formaterSousPoint(ctx.declaree.sousPoint)}

### Année suivante (${ctx.suivante?.annee ?? 'aucune — c\'est déjà P6'})
${ctx.suivante ? formaterSousPoint(ctx.suivante.sousPoint) : 'N/A (P6 est la dernière année couverte par le corpus actuel).'}`
}

export const ROLE = `Tu es un conseiller pédagogique FWB spécialisé en mathématiques et en différenciation par les attendus du tronc commun.`

export function construirePromptCadrage({ anneeDeclaree, champLabel, codeSousPoint, exerciceTexte }) {
  return `${ROLE}

## Étape 1 — Vérification a priori
Compare le texte de l'exercice source à l'attendu de l'année déclarée. Si l'exercice correspond
mieux à l'attendu d'une année voisine, signale-le dans "verification". Ne masque jamais un écart réel.
Si le sous-point est absent d'une année adjacente (marqué "N/A"), ne fabrique pas d'attendu — dis-le.

## Étape 2 — Cadrage des 3 niveaux (PAS d'énoncé)
Pour chaque niveau (soutien / cible / dépassement), détermine :
- annee_reference : l'année du référentiel sur laquelle ce palier s'ancre
- attendu_cite : la citation EXACTE, mot pour mot, de l'attendu ou du contexte annuel utilisé
- levier : une phrase disant ce qui change réellement par rapport à la cible (borne numérique,
  structure de l'énoncé, exigence ajoutée, niveau de formalisation) — ce levier diffère à chaque
  sous-point, ne le suppose jamais a priori.
Si une compétence transversale existe déjà à un palier antérieur sous forme plus simple, ne la
réserve pas au dépassement.

NE RÉDIGE AUCUN ÉNONCÉ D'EXERCICE à cette étape. La sortie est contrainte par un schéma JSON
(verification + cadrage.soutien/cible/depassement).

## Exercice source à cadrer
${exerciceTexte}`
}

export function construirePromptEnonces({ anneeDeclaree, champLabel, codeSousPoint, exerciceTexte, cadrage }) {
  const c = (n) => `- ${n} : s'ancre sur ${cadrage[n].annee_reference}, attendu « ${cadrage[n].attendu_cite} », levier : ${cadrage[n].levier}`
  return `${ROLE}

## Cadrage validé par l'enseignant (à respecter exactement, sans le renégocier)
${c('soutien')}
${c('cible')}
${c('depassement')}

## Tâche
Rédige les 3 énoncés d'exercice (un par niveau), fidèles au cadrage ci-dessus et à l'attendu cité.
Ne modifie pas l'ancrage ni le levier — tu les appliques. Chaque énoncé est un texte complet,
prêt à être relu par l'enseignant. La sortie est contrainte par un schéma JSON (enonces.soutien/
cible/depassement, chacun avec un champ "enonce").

## Exercice source de référence
${exerciceTexte}`
}

export function construirePromptGrille({ anneeDeclaree, champLabel, codeSousPoint, cadrage, enonces }) {
  return `${ROLE}

## Niveau cible validé
Attendu cible : « ${cadrage.cible.attendu_cite} »
Énoncé cible : ${enonces.cible.enonce}

## Tâche — Étape 3 : grille d'évaluation (attendu cible uniquement)
Construis une grille de 3 à 6 critères observables, décomposés à partir du texte EXACT de
l'attendu cible. Chaque exigence mentionnée dans l'attendu devient un critère séparé, avec un
indicateur de réussite concret et cochable en classe — pas une reformulation abstraite.
"grille.attendu_cite" doit être identique à l'attendu cible ci-dessus. La sortie est contrainte
par un schéma JSON.`
}

// Options du menu déroulant "attendu_cite" côté client — attendus réels du référentiel
// pour ce sous-point aux 3 années. Aucun appel réseau.
export function optionsCadrage({ anneeDeclaree, champLabel, codeSousPoint }) {
  const ctx = contexteReferentiel({ anneeDeclaree, champLabel, codeSousPoint })
  const out = []
  for (const key of ['precedente', 'declaree', 'suivante']) {
    const entry = ctx[key]
    if (!entry || !entry.sousPoint) continue
    for (const it of entry.sousPoint.items ?? []) {
      for (const att of it.attendus ?? []) {
        out.push({ annee: entry.annee, texte: att })
      }
    }
  }
  return out
}
