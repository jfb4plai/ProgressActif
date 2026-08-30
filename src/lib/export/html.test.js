import { describe, it, expect } from 'vitest'
import { versHtmlAU, echapper } from './html.js'

const base = (over = {}) => ({ titre: 'Titre', sections: [], ...over })

describe('echapper', () => {
  it('& avant tout, puis < > "', () => {
    expect(echapper('a & b < c > d "e"')).toBe('a &amp; b &lt; c &gt; d &quot;e&quot;')
  })
  it('échappe le & littéral d\'un texte déjà entité (comportement voulu : c\'est du texte brut)', () => {
    // echapper traite son entrée comme du texte brut ; "&amp;" est un texte contenant un &.
    expect(echapper('&amp;')).toBe('&amp;amp;')
  })
  it('valeur non-string → chaîne vide', () => {
    expect(echapper(null)).toBe('')
    expect(echapper(undefined)).toBe('')
    expect(echapper(42)).toBe('42')
  })
})

describe('versHtmlAU', () => {
  it('document complet avec <style> AU (Arial, 12pt)', () => {
    const h = versHtmlAU(base())
    expect(h).toMatch(/^<!doctype html>/i)
    expect(h).toContain('<html lang="fr">')
    expect(h).toContain('<style>')
    expect(h).toContain('Arial')
    expect(h).toContain('12pt')
    expect(h).toContain('<h1>Titre</h1>')
  })

  it('titre échappé dans <title> et <h1>', () => {
    const h = versHtmlAU(base({ titre: '<script>x</script>' }))
    expect(h).toContain('<title>&lt;script&gt;x&lt;/script&gt;</title>')
    expect(h).toContain('<h1>&lt;script&gt;x&lt;/script&gt;</h1>')
    expect(h).not.toContain('<script>x</script>')
  })

  it('sousTitre → <p class="soustitre">', () => {
    expect(versHtmlAU(base({ sousTitre: 's' }))).toContain('<p class="soustitre">s</p>')
  })

  it('meta → div.meta avec <strong>', () => {
    const h = versHtmlAU(base({ meta: [{ label: 'Année', valeur: 'P3' }] }))
    expect(h).toContain('<div class="meta">')
    expect(h).toContain('<p><strong>Année</strong> : P3</p>')
  })

  it('section niveau 1 → <h2>, niveau 2 → <h3>, dans <section>', () => {
    const h = versHtmlAU(base({ sections: [
      { titre: 'S1', niveau: 1, blocs: [] },
      { titre: 'S2', niveau: 2, blocs: [] },
    ] }))
    expect(h).toContain('<section><h2>S1</h2></section>')
    expect(h).toContain('<section><h3>S2</h3></section>')
  })

  it('bloc paragraphe / liste / citation', () => {
    const h = versHtmlAU(base({ sections: [{ titre: 'S', blocs: [
      { type: 'paragraphe', texte: 'p & q' },
      { type: 'liste', items: ['a', 'b'] },
      { type: 'citation', texte: 'l1\nl2' },
    ] }] }))
    expect(h).toContain('<p>p &amp; q</p>')
    expect(h).toContain('<ul><li>a</li><li>b</li></ul>')
    expect(h).toContain('<blockquote>l1<br>l2</blockquote>')
  })

  it('bloc tableau → thead/th + tbody/td, cellules échappées', () => {
    const h = versHtmlAU(base({ sections: [{ titre: 'S', blocs: [
      { type: 'tableau', entetes: ['A', 'B'], lignes: [['x', '<y>']] },
    ] }] }))
    expect(h).toContain('<thead><tr><th>A</th><th>B</th></tr></thead>')
    expect(h).toContain('<tbody><tr><td>x</td><td>&lt;y&gt;</td></tr></tbody>')
  })

  it('bloc de type inconnu → ignoré', () => {
    const h = versHtmlAU(base({ sections: [{ titre: 'S', blocs: [{ type: 'wtf' }, { type: 'paragraphe', texte: 'ok' }] }] }))
    expect(h).toContain('<p>ok</p>')
    expect(h).not.toContain('wtf')
  })
})
