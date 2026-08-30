import { describe, it, expect } from 'vitest'
import { resultatVersDoc } from './adaptateurProgressActif.js'

const niveau = (a, att, lev, en) => ({ annee_reference: a, attendu_cite: att, levier: lev, enonce: en })

const resultat = {
  verification: { ecart_detecte: false, details: '' },
  niveaux: {
    soutien: niveau('P1', 'att S', 'lev S', 'énoncé S'),
    cible: niveau('P2', 'att C', 'lev C', 'énoncé C'),
    depassement: niveau('P3', 'att D', 'lev D', 'énoncé D'),
  },
  grille: {
    attendu_cite: 'att C',
    criteres: [
      { critere: 'c1', indicateur_reussite: 'i1' },
      { critere: 'c2', indicateur_reussite: 'i2' },
    ],
  },
}

const opts = { matiereLabel: 'Maths', annee: 'P2', champLabel: 'Champ 3', sousPointTitre: 'Opérer' }

describe('resultatVersDoc', () => {
  it('titre + sousTitre + meta', () => {
    const doc = resultatVersDoc(resultat, opts)
    expect(doc.titre).toBe('Exercice différencié — Maths')
    expect(doc.sousTitre).toBe('Champ 3 · Opérer')
    expect(doc.meta).toEqual([
      { label: 'Année de référence', valeur: 'P2' },
      { label: 'Champ', valeur: 'Champ 3' },
    ])
  })

  it('5 sections : vérification + 3 niveaux + grille', () => {
    const doc = resultatVersDoc(resultat, opts)
    expect(doc.sections.map(s => s.titre)).toEqual([
      'Vérification a priori', 'Soutien', 'Cible', 'Dépassement', 'Grille d\'évaluation',
    ])
  })

  it('sans écart → phrase « Aucun écart détecté »', () => {
    const doc = resultatVersDoc(resultat, opts)
    const verif = doc.sections[0].blocs[0]
    expect(verif).toEqual({ type: 'paragraphe', texte: "Aucun écart détecté — l'exercice correspond à l'attendu de P2." })
  })

  it('avec écart → details', () => {
    const r = { ...resultat, verification: { ecart_detecte: true, details: 'quadrillage codé = P3' } }
    const doc = resultatVersDoc(r, opts)
    expect(doc.sections[0].blocs[0]).toEqual({ type: 'paragraphe', texte: 'quadrillage codé = P3' })
  })

  it('section niveau : citation attendu + levier + énoncé', () => {
    const doc = resultatVersDoc(resultat, opts)
    const cible = doc.sections[2]
    expect(cible.titre).toBe('Cible')
    expect(cible.blocs).toEqual([
      { type: 'citation', texte: '« att C » (P2)' },
      { type: 'paragraphe', texte: 'Levier : lev C' },
      { type: 'paragraphe', texte: 'énoncé C' },
    ])
  })

  it('grille : citation + tableau à N lignes', () => {
    const doc = resultatVersDoc(resultat, opts)
    const g = doc.sections[4]
    expect(g.blocs[0]).toEqual({ type: 'citation', texte: '« att C »' })
    expect(g.blocs[1]).toEqual({
      type: 'tableau',
      entetes: ['Critère', 'Indicateur de réussite'],
      lignes: [['c1', 'i1'], ['c2', 'i2']],
    })
  })
})
