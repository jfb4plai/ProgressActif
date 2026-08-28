import { describe, it, expect } from 'vitest'
import {
  construirePromptCadrage, construirePromptEnonces, construirePromptGrille, optionsCadrage,
} from './francais.js'
import P3 from '../../data/referentiel/francais/P3.json' with { type: 'json' }

// Choisit une rubrique + item réels de P3 pour ne pas dépendre de valeurs devinées.
const champLabel = (P3.rubriques?.[0]?.rubrique ?? '') +
  (P3.rubriques?.[0]?.sous_rubrique ? ` — ${P3.rubriques[0].sous_rubrique}` : '')
const base = { anneeDeclaree: 'P3', champLabel, codeSousPoint: '0', exerciceTexte: 'Quel pronom remplace Nolan ? ....' }

describe('francais — cadrage', () => {
  it('contient le contexte et interdit la rédaction d\'énoncé', () => {
    const p = construirePromptCadrage(base)
    expect(p).toContain('Étape 1 — Vérification a priori')
    expect(p).toContain('Étape 2 — Cadrage des 3 niveaux')
    expect(p.toLowerCase()).toContain('ne rédige aucun énoncé')
  })
  it('mentionne les descripteurs transversaux comme levier possible', () => {
    expect(construirePromptCadrage(base).toLowerCase()).toContain('descripteur')
  })
})

describe('francais — énoncés', () => {
  it('injecte le cadrage validé', () => {
    const cadrage = {
      soutien: { annee_reference: 'P2', attendu_cite: 'A', levier: 'texte support plus court' },
      cible: { annee_reference: 'P3', attendu_cite: 'B', levier: 'fluence ≈90 mots/min' },
      depassement: { annee_reference: 'P4', attendu_cite: 'C', levier: 'fluence ≈110 mots/min' },
    }
    expect(construirePromptEnonces({ ...base, cadrage })).toContain('fluence ≈90 mots/min')
  })
})

describe('francais — grille', () => {
  it('injecte l\'énoncé cible', () => {
    const p = construirePromptGrille({
      ...base,
      cadrage: { cible: { annee_reference: 'P3', attendu_cite: 'B', levier: 'x' } },
      enonces: { cible: { enonce: 'Texte cible.' } },
    })
    expect(p).toContain('Texte cible.')
  })
})

describe('francais — optionsCadrage', () => {
  it('renvoie des entrées {annee, texte}', () => {
    const opts = optionsCadrage(base)
    for (const o of opts) { expect(o).toHaveProperty('annee'); expect(o).toHaveProperty('texte') }
  })
})
