// Usage : ANTHROPIC_API_KEY=... PROGRESSACTIF_ACCESS_CODE=... npm run eval:phases
// PAS un test CI — appels API réels (coût + non-déterminisme). À lancer manuellement
// après toute modif de prompt (maths.js / francais.js / generate.js), avant push.
//
// Les coordonnées (champLabel / codeSousPoint) ci-dessous sont dérivées de la mémoire
// projet "progressactif-prototype-p1-exemple" puis RÉSOLUES contre le référentiel réel
// via Maths.champsDisponibles() / Francais.champsDisponibles() (2026-08-28) :
//   - maths : champLabel = "Champ 1".."Champ 4" (libellé générique, pas thématique),
//     codeSousPoint = code du sous-point ("1.1", "2.3", "3.1", "3.2"...).
//   - français : champLabel = libellé exact de la rubrique, codeSousPoint = index de
//     l'item dans la rubrique (chaîne : "0", "1", "2"...).
// Re-vérifier ces valeurs si le référentiel change.

import handler from '../api/generate.js'

const CAS = [
  {
    // A — décomposition D/U — memoire "Champ 3.1 Décomposer et recomposer les nombres"
    // résolu : Champ 3 / sous-point 3.1 "Appréhender le nombre puis la lettre dans tous leurs aspects"
    nom: 'A — décomposition D/U (P2 maths 3.1)',
    coords: { matiere: 'maths', anneeDeclaree: 'P2', champLabel: 'Champ 3', codeSousPoint: '3.1' },
    exercice: 'Observe le tableau des représentations de 24. Complète le tableau suivant en respectant la structure de l\'exemple : 42 → dessin / D U / ___ + ___',
  },
  {
    // B — problème Lou/cartes — memoire "Champ 3.2 Résoudre des problèmes"
    // résolu : Champ 3 / 3.2 "Opérer sur des nombres et sur des expressions algébriques"
    nom: 'B — problème Lou/cartes (P2 maths 3.2)',
    coords: { matiere: 'maths', anneeDeclaree: 'P2', champLabel: 'Champ 3', codeSousPoint: '3.2' },
    exercice: 'Lou fête ses 7 ans. Elle reçoit 3 paquets de 5 cartes de sa collection préférée. Elle y découvre 3 cartes qu\'elle avait déjà et les offre à son amie Juliette. Combien de nouvelles cartes lui reste-t-il ?',
  },
  {
    // C — périmètre du carré — memoire "Champ 2.3 Opérer sur des grandeurs"
    // résolu : Champ 2 / 2.3 "Opérer sur des grandeurs – périmètres, aires et volumes"
    nom: 'C — périmètre du carré (P2 maths 2.3)',
    coords: { matiere: 'maths', anneeDeclaree: 'P2', champLabel: 'Champ 2', codeSousPoint: '2.3' },
    exercice: 'a) Trace le contour déplié de ce carré sur quadrillage. b) Coche la réponse correcte. Le périmètre du carré est de… 9 cm / 12 cm / 8 cm.',
  },
  {
    // D — quadrillage codé — memoire "Champ 1.1 Situer dans un quadrillage"
    // résolu : Champ 1 / 1.1 "(Se) repérer et communiquer des positionnements ou des déplacements"
    // NOTE : ce cas DEVRAIT déclencher verification.ecart_detecte = true — l'énoncé source
    // mélange repérage sur grille et suite de déplacements relatifs, plus riche que l'attendu P2.
    nom: 'D — quadrillage codé (P2 maths 1.1) [écart attendu]',
    coords: { matiere: 'maths', anneeDeclaree: 'P2', champLabel: 'Champ 1', codeSousPoint: '1.1' },
    exercice: 'Grille A-I sur 1-9, un ballon en H3. a) Trace une X en D5. b) Complète la phrase pour situer le ballon : le ballon est situé dans la … ligne et dans la colonne … . c) En partant du ballon, trace le trajet : monte de 2 cases ; tourne à gauche et avance de 3 cases ; descend de 6 cases ; tourne à droite et avance de 3 cases ; monte de 2 cases. d) Où arrives-tu ?',
  },
  {
    // E — problème P1 (test 1) — memoire "Champ 3.2"
    // résolu : Champ 3 / 3.2 en P1
    nom: 'E — problème P1 billes (P1 maths 3.2)',
    coords: { matiere: 'maths', anneeDeclaree: 'P1', champLabel: 'Champ 3', codeSousPoint: '3.2' },
    exercice: 'Léa a 8 billes. Elle en gagne 5 pendant la récré. Combien de billes a-t-elle maintenant ?',
  },
  {
    // F — pronoms de reprise (français) — memoire exercice E
    // résolu : rubrique "Dégager et assurer la cohérence du message/texte",
    // item index 2 "Utiliser des reprises d'informations d'une phrase à l'autre pour construire du sens"
    // (attendus : associer un pronom personnel à un personnage, un substitut lexical...).
    nom: 'F — pronoms de reprise (P2 français)',
    coords: { matiere: 'francais', anneeDeclaree: 'P2', champLabel: 'Dégager et assurer la cohérence du message/texte', codeSousPoint: '2' },
    exercice: 'Quel pronom remplace Nolan ? ……. / Quel pronom remplace Victor et Chad ? …….',
  },
]

function mkRes() {
  return {
    statusCode: 0, body: null,
    status(c) { this.statusCode = c; return this },
    json(b) { this.body = b; return this },
    end() { return this },
    setHeader() {},
  }
}

async function call(body) {
  const res = mkRes()
  await handler({
    method: 'POST',
    headers: { 'x-forwarded-for': `eval-${Math.random()}` },
    body: { ...body, codeAcces: process.env.PROGRESSACTIF_ACCESS_CODE },
  }, res)
  if (res.statusCode !== 200) throw new Error(`${res.statusCode} ${JSON.stringify(res.body)}`)
  return res.body.resultat
}

if (!process.env.ANTHROPIC_API_KEY || !process.env.PROGRESSACTIF_ACCESS_CODE) {
  console.error('ANTHROPIC_API_KEY et PROGRESSACTIF_ACCESS_CODE requis dans l\'environnement.')
  process.exit(2)
}

let echecs = 0
for (const c of CAS) {
  console.log(`\n=== ${c.nom} ===`)
  try {
    const cad = await call({ ...c.coords, phase: 'cadrage', exerciceTexte: c.exercice })

    // A1 — le cadrage ne contient aucun énoncé
    const a1 = Object.values(cad.cadrage).every(n => !('enonce' in n))
    console.log(a1 ? '  OK  A1 cadrage sans énoncé' : '  ECHEC A1 cadrage contient un énoncé')
    if (!a1) echecs++
    if (cad.verification?.ecart_detecte) {
      console.log(`  i   verification.ecart_detecte = true : ${cad.verification.details}`)
    }

    // énoncés avec le cadrage IA
    const enoIA = await call({ ...c.coords, phase: 'enonces', exerciceTexte: c.exercice, cadrage: cad.cadrage })

    // A2 — un cadrage édité change l'énoncé cible
    const cadEdite = JSON.parse(JSON.stringify(cad.cadrage))
    cadEdite.cible.levier += ' — resserrer nettement la borne numérique et simplifier la structure'
    const enoEdit = await call({ ...c.coords, phase: 'enonces', exerciceTexte: c.exercice, cadrage: cadEdite })
    const a2 = enoEdit.enonces.cible.enonce !== enoIA.enonces.cible.enonce
    console.log(a2 ? '  OK  A2 cadrage édité → énoncé cible différent' : '  ECHEC A2 énoncé cible inchangé')
    if (!a2) echecs++

    // A3 — grille valide (≥ 3 critères)
    const gr = await call({ ...c.coords, phase: 'grille', cadrage: cad.cadrage, enonces: enoIA.enonces })
    const a3 = gr.grille && Array.isArray(gr.grille.criteres) && gr.grille.criteres.length >= 3
    console.log(a3 ? '  OK  A3 grille ≥ 3 critères' : '  ECHEC A3 grille invalide')
    if (!a3) echecs++
  } catch (e) {
    console.log(`  ECHEC ERREUR : ${e.message}`)
    echecs++
  }
}

console.log(`\n${echecs === 0 ? 'OK — toutes les assertions vertes' : echecs + ' échec(s)'}`)
process.exit(echecs === 0 ? 0 : 1)
