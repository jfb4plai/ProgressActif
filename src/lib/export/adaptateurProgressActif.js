// SEUL fichier du dossier export/ couplé à ProgressActif. Lors d'une extraction future
// vers shared/js/plai-export/, ce fichier reste ici ; chaque app garde son propre adaptateur.

const LABELS = { soutien: 'Soutien', cible: 'Cible', depassement: 'Dépassement' }
const CLES = ['soutien', 'cible', 'depassement']

/**
 * @param {{verification:{ecart_detecte:boolean, details:string},
 *   niveaux:Record<'soutien'|'cible'|'depassement',{annee_reference:string, attendu_cite:string, levier:string, enonce:string}>,
 *   grille:{attendu_cite:string, criteres:{critere:string, indicateur_reussite:string}[]}}} resultat
 * @param {{matiereLabel:string, annee:string, champLabel:string, sousPointTitre:string}} opts
 * @returns {import('./markdown.js').Doc}
 */
export function resultatVersDoc(resultat, { matiereLabel, annee, champLabel, sousPointTitre }) {
  const { verification, niveaux, grille } = resultat

  const sectionVerif = {
    titre: 'Vérification a priori',
    niveau: 1,
    blocs: [{
      type: 'paragraphe',
      texte: verification.ecart_detecte
        ? verification.details
        : `Aucun écart détecté — l'exercice correspond à l'attendu de ${annee}.`,
    }],
  }

  const sectionsNiveaux = CLES.map(cle => {
    const n = niveaux[cle]
    return {
      titre: LABELS[cle],
      niveau: 1,
      blocs: [
        { type: 'citation', texte: `« ${n.attendu_cite} » (${n.annee_reference})` },
        { type: 'paragraphe', texte: `Levier : ${n.levier}` },
        { type: 'paragraphe', texte: n.enonce },
      ],
    }
  })

  const sectionGrille = {
    titre: "Grille d'évaluation",
    niveau: 1,
    blocs: [
      { type: 'citation', texte: `« ${grille.attendu_cite} »` },
      {
        type: 'tableau',
        entetes: ['Critère', 'Indicateur de réussite'],
        lignes: grille.criteres.map(c => [c.critere, c.indicateur_reussite]),
      },
    ],
  }

  return {
    titre: `Exercice différencié — ${matiereLabel}`,
    sousTitre: `${champLabel} · ${sousPointTitre}`,
    meta: [
      { label: 'Année de référence', valeur: annee },
      { label: 'Champ', valeur: champLabel },
    ],
    sections: [sectionVerif, ...sectionsNiveaux, sectionGrille],
  }
}
