import P1 from '../../data/referentiel/francais/P1.json' with { type: 'json' }
import P2 from '../../data/referentiel/francais/P2.json' with { type: 'json' }
import P3 from '../../data/referentiel/francais/P3.json' with { type: 'json' }
import P4 from '../../data/referentiel/francais/P4.json' with { type: 'json' }
import P5 from '../../data/referentiel/francais/P5.json' with { type: 'json' }
import P6 from '../../data/referentiel/francais/P6.json' with { type: 'json' }

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

// Regroupe rubriques (Savoir/Savoir-faire) ET compétences (réception/production) sous
// une même forme { label, items[] } — sans ce regroupement, les tâches de production
// ouverte ("Écrire pour...", "Prendre la parole pour...") restent invisibles de l'UI,
// qui n'aurait exposé que les tableaux Savoir/Savoir-faire.
function groupesDisponibles(annee) {
  const c = CORPUS[annee]
  if (!c) return []
  const groupes = (c.rubriques ?? []).map(r => ({
    label: r.rubrique + (r.sous_rubrique ? ` — ${r.sous_rubrique}` : ''),
    items: r.items,
  }))
  const competences = [
    ['Compétences — Écouter (réception)', c.competences_reception?.ecouter],
    ['Compétences — Lire (réception)', c.competences_reception?.lire],
    ['Compétences — Écrire (production)', c.competences_production?.ecrire],
    ['Compétences — Parler (production)', c.competences_production?.parler],
  ]
  for (const [label, items] of competences) {
    if (items?.length) groupes.push({ label, items })
  }
  return groupes
}

// Équivalent de champsDisponibles() côté maths — le français n'a pas de champs
// numérotés, mais des rubriques + blocs de compétences nommés (stables d'une année
// à l'autre, cf. rapport d'extraction : "vocabulaire de rubriques stable").
export function champsDisponibles(annee) {
  return groupesDisponibles(annee).map(g => ({
    champ: g.label,
    titre: '',
    sous_points: g.items.map((it, idx) => ({ code: String(idx), titre: it.contenu, ...it })),
  }))
}

// Retrouve le même item (par son "contenu" exact) dans une autre année. Renvoie null
// si le groupe ou l'item n'existe pas cette année-là — le français est globalement
// plus continu que les sciences, mais rien ne garantit qu'un item précis existe partout.
function trouverItem(annee, groupeLabel, contenuCible) {
  const groupe = groupesDisponibles(annee).find(g => g.label === groupeLabel)
  if (!groupe) return null
  return groupe.items.find(it => it.contenu === contenuCible) ?? null
}

function contexteReferentiel({ anneeDeclaree, champLabel, codeSousPoint }) {
  const avant = anneePrecedente(anneeDeclaree)
  const apres = anneeSuivante(anneeDeclaree)

  // codeSousPoint est l'index de l'item dans la rubrique (voir champsDisponibles) —
  // on retrouve son texte "contenu" dans l'année déclarée, puis on cherche ce même
  // texte dans les années voisines (l'item peut y être absent).
  const rubriquesDeclaree = champsDisponibles(anneeDeclaree)
  const rubriqueDeclaree = rubriquesDeclaree.find(c => c.champ === champLabel)
  const itemDeclare = rubriqueDeclaree?.sous_points.find(sp => sp.code === codeSousPoint)
  const contenuCible = itemDeclare?.contenu

  const decrire = (annee) => {
    if (!annee) return null
    const item = contenuCible ? trouverItem(annee, champLabel, contenuCible) : null
    return { annee, existe: !!item, item, descripteurs: CORPUS[annee]?.descripteurs_transversaux }
  }

  return {
    precedente: decrire(avant),
    declaree: { annee: anneeDeclaree, existe: !!itemDeclare, item: itemDeclare, descripteurs: CORPUS[anneeDeclaree]?.descripteurs_transversaux },
    suivante: decrire(apres),
  }
}

function formaterItem(entry) {
  if (!entry) return ''
  const { annee, existe, item, descripteurs } = entry
  const descripteursTxt = descripteurs
    ? `Descripteurs transversaux ${annee} : palier lecteur "${descripteurs.palier_lecteur_attendu ?? '—'}"` +
      (descripteurs.fluence_lecture_mots_par_minute ? `, fluence ≈${descripteurs.fluence_lecture_mots_par_minute} mots/min` : '') +
      `, palier scripteur "${descripteurs.palier_scripteur_attendu ?? '—'}"` +
      (descripteurs.pourcentage_formes_correctes_ecriture ? `, ${descripteurs.pourcentage_formes_correctes_ecriture}% de formes correctes en écriture` : '')
    : ''

  if (!existe) {
    return `${annee} : (item absent — ce savoir/savoir-faire précis n'existe pas cette année-là dans le référentiel)\n${descripteursTxt}`
  }
  return `${annee} — [${item.type}] ${item.contenu} (visées : ${item.visees.join(', ')})\nAttendus : ${item.attendus.join(' | ')}\n${descripteursTxt}`
}

// Prompt système du générateur français — même exigence de rigueur que maths.js,
// mais intègre la leçon du test manuel de session : un savoir-faire peut plafonner
// d'une année à l'autre (texte d'attendu quasi identique), auquel cas le vrai levier
// de calibrage se trouve dans les descripteurs transversaux (fluence, % de formes
// correctes, complexité de texte), pas dans le sous-point lui-même.
export function construirePromptSysteme({ anneeDeclaree, champLabel, codeSousPoint, exerciceTexte }) {
  const ctx = contexteReferentiel({ anneeDeclaree, champLabel, codeSousPoint })

  return `Tu es un conseiller pédagogique FWB spécialisé en français (lecture, écriture, grammaire, vocabulaire) et en différenciation par les attendus du tronc commun.

## Contexte référentiel (source unique de vérité — ne rien inventer au-delà)

Année déclarée par l'enseignant : ${anneeDeclaree}
Rubrique : ${champLabel}

### Année précédente
${ctx.precedente ? formaterItem(ctx.precedente) : 'N/A (P1 est la première année du primaire).'}

### Année déclarée
${formaterItem(ctx.declaree)}

### Année suivante
${ctx.suivante ? formaterItem(ctx.suivante) : 'N/A (P6 est la dernière année couverte par le corpus actuel).'}

## Étape 1 — Vérification a priori (obligatoire, avant toute génération)

Compare le texte de l'exercice source à l'attendu de l'année déclarée.

Attention particulière (constat établi sur ce référentiel) : le texte d'un savoir-faire peut être
QUASI IDENTIQUE d'une année à l'autre — ce n'est pas une erreur d'extraction, c'est le référentiel qui
"plafonne" sur cet axe précis (ex. la reprise par pronom personnel ne change pas de formulation entre P2
et P3 côté production). Dans ce cas, ne force jamais un levier artificiel sur le sous-point lui-même :
utilise les DESCRIPTEURS TRANSVERSAUX (fluence en mots/minute, % de formes correctes en écriture, palier
lecteur/scripteur) comme levier de calibrage réel, en priorité pour le dépassement, mais aussi pour le
soutien si le référentiel le permet (ex. accepter davantage d'aide, un texte support plus court/simple).

Si un item est marqué absent pour une année adjacente, ne fabrique pas un attendu — dis-le, et construis
ce palier sur la base du contexte annuel ou des descripteurs transversaux disponibles.

## Étape 2 — Génération des 3 niveaux

Pour chaque niveau (soutien / cible / dépassement), tu DOIS :
- citer explicitement l'attendu exact sur lequel tu t'appuies (traçabilité) — ou, si le levier vient des
  descripteurs transversaux, citer le descripteur exact (ex. "fluence ≈110 mots/min en P4" ou "80% de
  formes correctes attendues en P6")
- ne jamais te contenter d'un changement générique de longueur de texte sans justification référentielle
- si le sous-point plafonne, l'assumer et l'expliquer dans "levier" plutôt que d'inventer une différence
  qui n'existe pas dans le texte du référentiel

## Étape 3 — Sortie

La réponse est contrainte par un schéma JSON : "verification" (ecart_detecte + details) puis
"niveaux.soutien/cible/depassement", chacun avec annee_reference, attendu_cite (citation exacte de
l'attendu OU du descripteur transversal utilisé), levier (une phrase : ce qui change réellement à ce
palier) et enonce (le texte complet de l'exercice, prêt à être relu). Le résultat sera relu et édité par
l'enseignant avant tout usage.

## Exercice source à traiter

${exerciceTexte}`
}
