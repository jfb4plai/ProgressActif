import { describe, it, expect } from 'vitest'
import {
  SCHEMA_CADRAGE, SCHEMA_ENONCES, SCHEMA_GRILLE, GENERATION_SCHEMA,
} from './_generationSchema.js'

describe('SCHEMA_CADRAGE', () => {
  it('exige verification + cadrage, jamais niveaux ni enonce', () => {
    expect(SCHEMA_CADRAGE.required).toEqual(['verification', 'cadrage'])
    const niveau = SCHEMA_CADRAGE.properties.cadrage.properties.cible
    expect(niveau.required).toEqual(['annee_reference', 'attendu_cite', 'levier'])
    expect(niveau.properties).not.toHaveProperty('enonce')
  })
})

describe('SCHEMA_ENONCES', () => {
  it('exige enonces avec un enonce par niveau', () => {
    expect(SCHEMA_ENONCES.required).toEqual(['enonces'])
    const niveau = SCHEMA_ENONCES.properties.enonces.properties.soutien
    expect(niveau.required).toEqual(['enonce'])
  })
})

describe('SCHEMA_GRILLE', () => {
  it('exige grille avec attendu_cite + criteres', () => {
    expect(SCHEMA_GRILLE.required).toEqual(['grille'])
    expect(SCHEMA_GRILLE.properties.grille.required).toEqual(['attendu_cite', 'criteres'])
  })
})

describe('GENERATION_SCHEMA (contrat post-reconstruction, conservé)', () => {
  it('exige verification + niveaux + grille', () => {
    expect(GENERATION_SCHEMA.required).toEqual(['verification', 'niveaux', 'grille'])
    expect(GENERATION_SCHEMA.properties.niveaux.properties.cible.required)
      .toEqual(['annee_reference', 'attendu_cite', 'levier', 'enonce'])
  })
})
