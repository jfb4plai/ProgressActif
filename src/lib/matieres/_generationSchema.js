// Schéma de sortie du générateur — contraint la réponse de l'IA pour qu'elle soit
// directement exploitable par l'UI (3 niveaux distincts, chacun éditable séparément)
// plutôt qu'un bloc de prose Markdown à parser après coup.

const NIVEAU = {
  type: 'object',
  additionalProperties: false,
  required: ['annee_reference', 'attendu_cite', 'levier', 'enonce'],
  properties: {
    annee_reference: { type: 'string', description: 'Année du référentiel sur laquelle ce niveau s\'ancre (ex. "P1", "P3").' },
    attendu_cite: { type: 'string', description: 'Citation exacte, mot pour mot, de l\'attendu ou du contexte annuel utilisé — jamais paraphrasé.' },
    levier: { type: 'string', description: 'Une phrase : ce qui change concrètement par rapport à la cible (borne numérique, structure, exigence ajoutée, formalisation...).' },
    enonce: { type: 'string', description: 'Le texte complet de l\'exercice pour ce niveau, prêt à être relu par l\'enseignant.' },
  },
}

export const GENERATION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['verification', 'niveaux'],
  properties: {
    verification: {
      type: 'object',
      additionalProperties: false,
      required: ['ecart_detecte', 'details'],
      properties: {
        ecart_detecte: { type: 'boolean', description: 'true si l\'exercice source ou un palier voisin ne correspond pas à l\'attendu attendu pour son année.' },
        details: { type: 'string', description: 'Explication de l\'écart avec citation des attendus en cause. "" si aucun écart.' },
      },
    },
    niveaux: {
      type: 'object',
      additionalProperties: false,
      required: ['soutien', 'cible', 'depassement'],
      properties: {
        soutien: NIVEAU,
        cible: NIVEAU,
        depassement: NIVEAU,
      },
    },
  },
}
