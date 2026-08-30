import { describe, it, expect } from 'vitest'
import { versMarkdown } from './markdown.js'

const base = (over = {}) => ({ titre: 'Titre', sections: [], ...over })

describe('versMarkdown', () => {
  it('titre seul → # Titre, sans lignes vides superflues', () => {
    expect(versMarkdown(base())).toBe('# Titre\n')
  })

  it('sousTitre en italique sous le titre', () => {
    const md = versMarkdown(base({ sousTitre: 'sous' }))
    expect(md).toContain('# Titre\n_sous_\n')
  })

  it('meta → liste puce label/valeur', () => {
    const md = versMarkdown(base({ meta: [{ label: 'Année', valeur: 'P3' }, { label: 'Champ', valeur: 'Nombres' }] }))
    expect(md).toContain('- **Année** : P3\n- **Champ** : Nombres\n')
  })

  it('section niveau 1 → ##, niveau 2 → ###', () => {
    const md = versMarkdown(base({ sections: [
      { titre: 'S1', niveau: 1, blocs: [] },
      { titre: 'S2', niveau: 2, blocs: [] },
    ] }))
    expect(md).toContain('## S1\n')
    expect(md).toContain('### S2\n')
  })

  it('section sans niveau → ## (défaut 1)', () => {
    const md = versMarkdown(base({ sections: [{ titre: 'S', blocs: [] }] }))
    expect(md).toContain('## S\n')
  })

  it('bloc paragraphe', () => {
    const md = versMarkdown(base({ sections: [{ titre: 'S', blocs: [{ type: 'paragraphe', texte: 'Bonjour.' }] }] }))
    expect(md).toContain('## S\n\nBonjour.\n')
  })

  it('bloc liste', () => {
    const md = versMarkdown(base({ sections: [{ titre: 'S', blocs: [{ type: 'liste', items: ['a', 'b'] }] }] }))
    expect(md).toContain('- a\n- b\n')
  })

  it('bloc tableau, avec | échappé dans une cellule', () => {
    const md = versMarkdown(base({ sections: [{ titre: 'S', blocs: [{ type: 'tableau', entetes: ['A', 'B'], lignes: [['x', 'y|z']] }] }] }))
    expect(md).toContain('| A | B |\n| --- | --- |\n| x | y\\|z |\n')
  })

  it('bloc citation, multi-ligne', () => {
    const md = versMarkdown(base({ sections: [{ titre: 'S', blocs: [{ type: 'citation', texte: 'l1\nl2' }] }] }))
    expect(md).toContain('> l1\n> l2\n')
  })

  it('bloc de type inconnu → ignoré', () => {
    const md = versMarkdown(base({ sections: [{ titre: 'S', blocs: [{ type: 'wtf', x: 1 }, { type: 'paragraphe', texte: 'ok' }] }] }))
    expect(md).toContain('ok')
    expect(md).not.toContain('wtf')
  })

  it('jamais 3 lignes vides consécutives', () => {
    const md = versMarkdown(base({ meta: [{ label: 'A', valeur: 'B' }], sections: [{ titre: 'S', blocs: [{ type: 'paragraphe', texte: 'p' }] }] }))
    expect(md).not.toMatch(/\n\n\n/)
  })

  it('se termine par exactement un \\n', () => {
    const md = versMarkdown(base({ sections: [{ titre: 'S', blocs: [{ type: 'paragraphe', texte: 'p' }] }] }))
    expect(md.endsWith('\n')).toBe(true)
    expect(md.endsWith('\n\n')).toBe(false)
  })
})
