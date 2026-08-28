// Recompose l'objet `resultat` à la forme attendue par l'affichage et par exportDocx.js,
// à partir des sorties des 3 phases. C'est le point où le contrat de sortie historique
// est rétabli — ne pas changer la forme sans mettre à jour exportDocx.js et Adapter.jsx.

const NIVEAUX = ['soutien', 'cible', 'depassement']

export function reconstruireResultat({ verification, cadrage, enonces, grille }) {
  const niveaux = {}
  for (const n of NIVEAUX) {
    niveaux[n] = {
      annee_reference: cadrage[n].annee_reference,
      attendu_cite: cadrage[n].attendu_cite,
      levier: cadrage[n].levier,
      enonce: enonces[n].enonce,
    }
  }
  return { verification, niveaux, grille }
}
