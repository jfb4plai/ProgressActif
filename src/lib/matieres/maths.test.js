import { describe, it, expect } from 'vitest'
import {
  construirePromptCadrage, construirePromptEnonces, construirePromptGrille,
  optionsCadrage,
} from './maths.js'

// NOTE: le référentiel maths ne nomme pas les champs ("Nombres", ...) mais utilise
// des libellés génériques "Champ 1".."Champ 4". Le sous-point 1.1 existe bien en
// P2/P3/P4. base ajusté en conséquence (champLabel: 'Champ 1').
const base = {
  anneeDeclaree: 'P3',
  champLabel: 'Champ 1',
  codeSousPoint: '1.1',
  exerciceTexte: 'Léa a 8 billes, elle en gagne 5. Combien en a-t-elle ?',
}

describe('construirePromptCadrage', () => {
  it('contient le contexte référentiel et interdit la rédaction d\'énoncé', () => {
    const p = construirePromptCadrage(base)
    expect(p).toContain('Étape 1 — Vérification a priori')
    expect(p).toContain('Étape 2 — Cadrage des 3 niveaux')
    expect(p.toLowerCase()).toContain('ne rédige aucun énoncé')
  })
  it('ne contient pas les instructions de rédaction d\'énoncé', () => {
    expect(construirePromptCadrage(base)).not.toContain('le texte complet de l\'exercice')
  })
})

describe('construirePromptEnonces', () => {
  it('injecte le cadrage validé et demande les 3 énoncés', () => {
    const cadrage = {
      soutien: { annee_reference: 'P2', attendu_cite: 'A', levier: 'borne à 10' },
      cible: { annee_reference: 'P3', attendu_cite: 'B', levier: 'borne à 20' },
      depassement: { annee_reference: 'P4', attendu_cite: 'C', levier: 'deux étapes' },
    }
    const p = construirePromptEnonces({ ...base, cadrage })
    expect(p).toContain('borne à 20')
    expect(p).toContain('sans le renégocier')
  })
})

describe('construirePromptGrille', () => {
  it('injecte l\'énoncé et le cadrage cible', () => {
    const p = construirePromptGrille({
      ...base,
      cadrage: { cible: { annee_reference: 'P3', attendu_cite: 'B', levier: 'x' } },
      enonces: { cible: { enonce: 'Énoncé cible reformulé.' } },
    })
    expect(p).toContain('Énoncé cible reformulé.')
    expect(p).toContain('3 à 6 critères')
  })
})

describe('optionsCadrage', () => {
  it('renvoie une entrée par année (précédente/déclarée/suivante) avec le texte d\'attendu', () => {
    const opts = optionsCadrage(base)
    expect(opts.length).toBeGreaterThanOrEqual(2)
    for (const o of opts) {
      expect(o).toHaveProperty('annee')
      expect(o).toHaveProperty('texte')
    }
  })
})
