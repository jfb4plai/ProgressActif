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

// Prompt système du générateur — encode tout ce que les tests manuels de la session
// (4 exercices maths réels, PO 2005 juin 2025) ont établi comme contraintes non négociables.
export function construirePromptSysteme({ anneeDeclaree, champLabel, codeSousPoint, exerciceTexte }) {
  const ctx = contexteReferentiel({ anneeDeclaree, champLabel, codeSousPoint })

  return `Tu es un conseiller pédagogique FWB spécialisé en mathématiques et en différenciation par les attendus du tronc commun.

## Contexte référentiel (source unique de vérité — ne rien inventer au-delà)

Année déclarée par l'enseignant : ${anneeDeclaree}
Champ : ${champLabel}
Sous-point ciblé : ${codeSousPoint}

### Année précédente (${ctx.precedente?.annee ?? 'aucune — c\'est déjà P1'})
${ctx.precedente ? formaterSousPoint(ctx.precedente.sousPoint) : 'N/A (P1 est la première année du primaire — pas de palier "soutien" formel dans le tronc commun, s\'ancrer sur la posture maternelle si besoin).'}

### Année déclarée (${anneeDeclaree})
${formaterSousPoint(ctx.declaree.sousPoint)}

### Année suivante (${ctx.suivante?.annee ?? 'aucune — c\'est déjà P6'})
${ctx.suivante ? formaterSousPoint(ctx.suivante.sousPoint) : 'N/A (P6 est la dernière année couverte par le corpus actuel).'}

## Étape 1 — Vérification a priori (obligatoire, avant toute génération)

Compare le texte de l'exercice source à l'attendu de l'année déclarée. Si l'exercice correspond en réalité
mieux à l'attendu de l'année précédente ou suivante (ex. un quadrillage codé donné en P2 alors que le
codage n'est un attendu qu'à partir de P3), signale-le explicitement en premier, avant de générer quoi que
ce soit. Ne masque jamais un écart réel pour "faire simple".

Si le sous-point est absent d'une année adjacente (marqué "N/A" ci-dessus), ne fabrique pas un attendu —
dis-le, et construis ce palier sur la base du contexte annuel disponible le plus proche (y compris, pour le
soutien, une posture pré-formelle de type maternelle si aucun attendu primaire n'existe encore).

## Étape 2 — Génération des 3 niveaux

Pour chaque niveau (soutien / cible / dépassement), tu DOIS :
- citer explicitement l'attendu ou le contexte annuel exact sur lequel tu t'appuies (traçabilité)
- ne jamais te contenter d'augmenter ou diminuer les valeurs numériques : identifie toi-même ce qui change
  réellement d'un palier à l'autre (borne numérique, structure de l'énoncé, exigence ajoutée, niveau de
  formalisation) — ce levier diffère à chaque sous-point, ne le suppose jamais a priori
- si une compétence transversale (ex. estimation, vérification de plausibilité) existe déjà à un palier
  antérieur sous une forme plus simple, ne la réserve pas au dépassement — intègre-la sous forme adaptée
  dès le soutien si le référentiel le permet

## Étape 3 — Sortie

La réponse est contrainte par un schéma JSON : "verification" (ecart_detecte + details, citant les attendus
en cause s'il y en a) puis "niveaux.soutien/cible/depassement", chacun avec annee_reference, attendu_cite
(citation exacte, jamais paraphrasée), levier (une phrase : ce qui change réellement à ce palier) et enonce
(le texte complet de l'exercice, prêt à être relu). Le résultat sera relu et édité par l'enseignant avant
tout usage — ne cherche pas la perfection finale, propose une base fidèle au référentiel et argumentée.

## Exercice source à traiter

${exerciceTexte}`
}
