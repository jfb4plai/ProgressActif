import { describe, it, expect } from 'vitest'
import { reconstruireResultat } from './reconstruction.js'

const cadrage = {
  soutien: { annee_reference: 'P2', attendu_cite: 'att-s', levier: 'lev-s' },
  cible: { annee_reference: 'P3', attendu_cite: 'att-c', levier: 'lev-c' },
  depassement: { annee_reference: 'P4', attendu_cite: 'att-d', levier: 'lev-d' },
}
const enonces = {
  soutien: { enonce: 'e-s' }, cible: { enonce: 'e-c' }, depassement: { enonce: 'e-d' },
}
const verification = { ecart_detecte: false, details: '' }
const grille = { attendu_cite: 'att-c', criteres: [{ critere: 'x', indicateur_reussite: 'y' }] }

describe('reconstruireResultat', () => {
  it('produit la forme { verification, niveaux, grille } avec niveaux complets', () => {
    const r = reconstruireResultat({ verification, cadrage, enonces, grille })
    expect(r.verification).toEqual(verification)
    expect(r.grille).toEqual(grille)
    expect(r.niveaux.cible).toEqual({
      annee_reference: 'P3', attendu_cite: 'att-c', levier: 'lev-c', enonce: 'e-c',
    })
    expect(r.niveaux.soutien.enonce).toBe('e-s')
    expect(r.niveaux.depassement.annee_reference).toBe('P4')
  })
})
