// Schémas de sortie du générateur.
// La génération se fait en 3 phases (cadrage → énoncés → grille), chacune contrainte
// par son propre sous-schéma via output_config. GENERATION_SCHEMA reste la forme finale
// (après recomposition côté client) et sert de contrat de vérification dans les tests.

const VERIFICATION = {
  type: 'object',
  additionalProperties: false,
  required: ['ecart_detecte', 'details'],
  properties: {
    ecart_detecte: { type: 'boolean', description: 'true si l\'exercice source ou un palier voisin ne correspond pas à l\'attendu attendu pour son année.' },
    details: { type: 'string', description: 'Explication de l\'écart avec citation des attendus en cause. "" si aucun écart.' },
  },
}

const CADRAGE_NIVEAU = {
  type: 'object',
  additionalProperties: false,
  required: ['annee_reference', 'attendu_cite', 'levier'],
  properties: {
    annee_reference: { type: 'string', description: 'Année du référentiel sur laquelle ce niveau s\'ancre (ex. "P1", "P3").' },
    attendu_cite: { type: 'string', description: 'Citation exacte, mot pour mot, de l\'attendu ou du descripteur utilisé — jamais paraphrasé.' },
    levier: { type: 'string', description: 'Une phrase : ce qui change concrètement par rapport à la cible (borne numérique, structure, exigence ajoutée, formalisation, descripteur transversal...).' },
  },
}

const ENONCE_NIVEAU = {
  type: 'object',
  additionalProperties: false,
  required: ['enonce'],
  properties: {
    enonce: { type: 'string', description: 'Le texte complet de l\'exercice pour ce niveau, prêt à être relu par l\'enseignant.' },
  },
}

const TROIS_NIVEAUX = (niveau) => ({
  type: 'object',
  additionalProperties: false,
  required: ['soutien', 'cible', 'depassement'],
  properties: { soutien: niveau, cible: niveau, depassement: niveau },
})

const GRILLE = {
  type: 'object',
  additionalProperties: false,
  required: ['attendu_cite', 'criteres'],
  properties: {
    attendu_cite: { type: 'string', description: 'Citation exacte de l\'attendu cible sur lequel la grille s\'appuie — doit correspondre au niveau cible.' },
    criteres: {
      type: 'array',
      // L'API Anthropic rejette minItems/maxItems > 0/1 sur les tableaux — la contrainte
      // "3 à 6 critères" est portée par le prompt système (étape 3).
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['critere', 'indicateur_reussite'],
        properties: {
          critere: { type: 'string', description: 'Un aspect observable de la production de l\'élève, décomposé à partir du texte de l\'attendu cible — pas un critère générique.' },
          indicateur_reussite: { type: 'string', description: 'Ce qui permet de dire, concrètement, que ce critère est atteint — cochable en classe.' },
        },
      },
    },
  },
}

export const SCHEMA_CADRAGE = {
  type: 'object',
  additionalProperties: false,
  required: ['verification', 'cadrage'],
  properties: { verification: VERIFICATION, cadrage: TROIS_NIVEAUX(CADRAGE_NIVEAU) },
}

export const SCHEMA_ENONCES = {
  type: 'object',
  additionalProperties: false,
  required: ['enonces'],
  properties: { enonces: TROIS_NIVEAUX(ENONCE_NIVEAU) },
}

export const SCHEMA_GRILLE = {
  type: 'object',
  additionalProperties: false,
  required: ['grille'],
  properties: { grille: GRILLE },
}

const NIVEAU_COMPLET = {
  type: 'object',
  additionalProperties: false,
  required: ['annee_reference', 'attendu_cite', 'levier', 'enonce'],
  properties: {
    ...CADRAGE_NIVEAU.properties,
    ...ENONCE_NIVEAU.properties,
  },
}

export const GENERATION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['verification', 'niveaux', 'grille'],
  properties: {
    verification: VERIFICATION,
    niveaux: TROIS_NIVEAUX(NIVEAU_COMPLET),
    grille: GRILLE,
  },
}
