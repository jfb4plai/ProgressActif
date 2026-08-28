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

export function contexteReferentiel({ anneeDeclaree, champLabel, codeSousPoint }) {
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
  const typeTxt = item.type ? `[${item.type}] ` : ''
  const viseesTxt = item.visees?.length ? ` (visées : ${item.visees.join(', ')})` : ''
  return `${annee} — ${typeTxt}${item.contenu}${viseesTxt}\nAttendus : ${item.attendus.join(' | ')}\n${descripteursTxt}`
}

export function blocContexteReferentiel({ anneeDeclaree, champLabel, codeSousPoint }) {
  const ctx = contexteReferentiel({ anneeDeclaree, champLabel, codeSousPoint })
  return `## Contexte référentiel (source unique de vérité — ne rien inventer au-delà)

Année déclarée par l'enseignant : ${anneeDeclaree}
Rubrique : ${champLabel}

### Année précédente
${ctx.precedente ? formaterItem(ctx.precedente) : 'N/A (P1 est la première année du primaire).'}

### Année déclarée
${formaterItem(ctx.declaree)}

### Année suivante
${ctx.suivante ? formaterItem(ctx.suivante) : 'N/A (P6 est la dernière année couverte par le corpus actuel).'}`
}

export const ROLE = `Tu es un conseiller pédagogique FWB spécialisé en français (lecture, écriture, grammaire, vocabulaire) et en différenciation par les attendus du tronc commun.`

const NOTE_PLAFOND = `Attention (constat sur ce référentiel) : le texte d'un savoir-faire peut être QUASI IDENTIQUE d'une année à l'autre — le référentiel "plafonne" sur cet axe. Dans ce cas, n'invente pas de levier artificiel : utilise les DESCRIPTEURS TRANSVERSAUX (fluence en mots/minute, % de formes correctes, palier lecteur/scripteur) comme levier de calibrage réel.`

export function construirePromptCadrage({ anneeDeclaree, champLabel, codeSousPoint, exerciceTexte }) {
  return `## Étape 1 — Vérification a priori
Compare le texte de l'exercice source à l'attendu de l'année déclarée. Signale tout écart réel dans
"verification". ${NOTE_PLAFOND}
Si un item est marqué absent pour une année adjacente, ne fabrique pas d'attendu — dis-le.

## Étape 2 — Cadrage des 3 niveaux (PAS d'énoncé)
Pour chaque niveau, détermine annee_reference, attendu_cite (citation EXACTE de l'attendu OU du
descripteur transversal utilisé) et levier (une phrase : ce qui change réellement à ce palier).
Si le sous-point plafonne, l'assumer et l'expliquer dans "levier" via un descripteur transversal.

NE RÉDIGE AUCUN ÉNONCÉ D'EXERCICE à cette étape. Sortie contrainte par un schéma JSON.

## Exercice source à cadrer
${exerciceTexte}`
}

export function construirePromptEnonces({ anneeDeclaree, champLabel, codeSousPoint, exerciceTexte, cadrage }) {
  const c = (n) => `- ${n} : s'ancre sur ${cadrage[n].annee_reference}, attendu « ${cadrage[n].attendu_cite} », levier : ${cadrage[n].levier}`
  return `## Cadrage validé par l'enseignant (à respecter exactement, sans le renégocier)
${c('soutien')}
${c('cible')}
${c('depassement')}

## Tâche
Rédige les 3 énoncés d'exercice fidèles au cadrage et à l'attendu cité. Tu appliques le levier,
tu ne le renégocies pas. Sortie contrainte par un schéma JSON (enonces.soutien/cible/depassement).

## Exercice source de référence
${exerciceTexte}`
}

export function construirePromptGrille({ anneeDeclaree, champLabel, codeSousPoint, cadrage, enonces }) {
  return `## Niveau cible validé
Attendu cible : « ${cadrage.cible.attendu_cite} »
Énoncé cible : ${enonces.cible.enonce}

## Tâche — Étape 3 : grille d'évaluation
Grille de 3 à 6 critères observables, décomposés à partir du texte EXACT de l'attendu (ou
descripteur) cible. Si l'attendu combine plusieurs exigences (réception ET production, plusieurs
substituts...), sépare-les en critères distincts, chacun avec un indicateur cochable en classe.
"grille.attendu_cite" identique à l'attendu cible. Sortie contrainte par un schéma JSON.`
}

export function optionsCadrage({ anneeDeclaree, champLabel, codeSousPoint }) {
  const ctx = contexteReferentiel({ anneeDeclaree, champLabel, codeSousPoint })
  const out = []
  for (const key of ['precedente', 'declaree', 'suivante']) {
    const entry = ctx[key]
    if (!entry) continue
    // Descripteurs transversaux : le prompt de cadrage EXIGE de s'y rabattre quand le
    // référentiel plafonne (NOTE_PLAFOND). Ils doivent donc être des ancrages valides.
    const d = entry.descripteurs
    if (d) {
      if (d.fluence_lecture_mots_par_minute) out.push({ annee: entry.annee, texte: `fluence ≈ ${d.fluence_lecture_mots_par_minute} mots/min`, source: 'descripteur' })
      if (d.pourcentage_formes_correctes_ecriture) out.push({ annee: entry.annee, texte: `${d.pourcentage_formes_correctes_ecriture}% de formes correctes en écriture`, source: 'descripteur' })
      if (d.palier_lecteur_attendu) out.push({ annee: entry.annee, texte: `palier lecteur : ${d.palier_lecteur_attendu}`, source: 'descripteur' })
      if (d.palier_scripteur_attendu) out.push({ annee: entry.annee, texte: `palier scripteur : ${d.palier_scripteur_attendu}`, source: 'descripteur' })
    }
    if (!entry.existe || !entry.item) continue
    for (const att of entry.item.attendus ?? []) {
      out.push({ annee: entry.annee, texte: att, source: 'attendu' })
    }
  }
  return out
}
