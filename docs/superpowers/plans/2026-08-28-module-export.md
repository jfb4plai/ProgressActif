# Module d'export (fiche AU imprimable + markdown) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un module d'export autonome dans ProgressActif : un modèle de contenu neutre `Doc` → markdown (`.md` téléchargeable) et fiche HTML au format Aménagements Universels imprimée via un `<iframe>` caché ; un seul fichier couple le module au `resultat` de ProgressActif.

**Architecture:** `src/lib/export/` contient 5 fichiers sans aucun import de code métier (modèle, `versMarkdown`, `CSS_AU`, `versHtmlAU`, `imprimerAU`) + 1 adaptateur `resultatVersDoc` qui est le seul point de couplage. `Adapter.jsx` gagne 2 boutons (`.md`, fiche AU) et perd l'impression pleine-page. Zéro dépendance npm nouvelle (`file-saver` est déjà là). Extraction future vers `shared/js/plai-export/` = copie des 5 fichiers non couplés.

**Tech Stack:** React 18, Vite 5, Vitest (déjà en place — chantier Prio 1), `file-saver` (déjà une dépendance via `exportDocx.js`). Aucune lib PDF/epub.

---

## File Structure

| Fichier | Responsabilité | Action |
|---|---|---|
| `src/lib/export/markdown.js` | `versMarkdown(doc): string` + les `@typedef` du modèle `Doc` | Create |
| `src/lib/export/markdown.test.js` | tests de `versMarkdown` | Create |
| `src/lib/export/styleAU.js` | `CSS_AU` — la feuille de style d'impression AU (template string) | Create |
| `src/lib/export/html.js` | `versHtmlAU(doc): string`, `echapper(s): string` | Create |
| `src/lib/export/html.test.js` | tests de `versHtmlAU` + `echapper` | Create |
| `src/lib/export/impressionAU.js` | `imprimerAU(doc): void` — wrapper iframe + print (non testé) | Create |
| `src/lib/export/adaptateurProgressActif.js` | `resultatVersDoc(resultat, opts): Doc` — SEUL fichier couplé | Create |
| `src/lib/export/adaptateurProgressActif.test.js` | tests de `resultatVersDoc` | Create |
| `src/lib/export/README.md` | note d'extraction future vers `shared/` | Create |
| `src/pages/Adapter.jsx` | 3 handlers + 2 boutons (remplace print page, ajoute `.md`) | Modify |

Inchangés : `src/lib/exportDocx.js`, le pipeline de génération, le reste d'`Adapter.jsx`.

---

## Task 1: `versMarkdown`

**Files:**
- Create: `src/lib/export/markdown.js`
- Create: `src/lib/export/markdown.test.js`

- [ ] **Step 1: Écrire le test**

`src/lib/export/markdown.test.js` :

```js
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
```

- [ ] **Step 2: Lancer — échoue**

Run: `npx vitest run src/lib/export/markdown.test.js`
Expected : FAIL — module introuvable.

- [ ] **Step 3: Écrire `src/lib/export/markdown.js`**

```js
/**
 * Modèle de contenu neutre pour l'export. Aucune app métier ne doit importer de code
 * d'ici hors de son propre adaptateur — voir src/lib/export/README.md.
 *
 * @typedef {Object} Doc
 * @property {string} titre
 * @property {string} [sousTitre]
 * @property {{label: string, valeur: string}[]} [meta]
 * @property {Section[]} sections
 *
 * @typedef {Object} Section
 * @property {string} titre
 * @property {1|2} [niveau]
 * @property {Bloc[]} blocs
 *
 * @typedef {{type:'paragraphe', texte:string}
 *   | {type:'liste', items:string[]}
 *   | {type:'tableau', entetes:string[], lignes:string[][]}
 *   | {type:'citation', texte:string}} Bloc
 */

function blocMarkdown(bloc) {
  switch (bloc.type) {
    case 'paragraphe':
      return `${bloc.texte ?? ''}\n`
    case 'liste':
      return `${(bloc.items ?? []).map(i => `- ${i}`).join('\n')}\n`
    case 'tableau': {
      const esc = (c) => String(c ?? '').replace(/\|/g, '\\|')
      const entetes = bloc.entetes ?? []
      const head = `| ${entetes.map(esc).join(' | ')} |`
      const sep = `| ${entetes.map(() => '---').join(' | ')} |`
      const lignes = (bloc.lignes ?? []).map(l => `| ${l.map(esc).join(' | ')} |`)
      return `${[head, sep, ...lignes].join('\n')}\n`
    }
    case 'citation':
      return `${String(bloc.texte ?? '').split('\n').map(l => `> ${l}`).join('\n')}\n`
    default:
      return null
  }
}

/**
 * @param {Doc} doc
 * @returns {string}
 */
export function versMarkdown(doc) {
  const parts = [`# ${doc.titre}`]
  if (doc.sousTitre) parts.push(`_${doc.sousTitre}_`)

  if (doc.meta && doc.meta.length > 0) {
    parts.push('')
    parts.push(doc.meta.map(m => `- **${m.label}** : ${m.valeur}`).join('\n'))
  }

  for (const section of doc.sections ?? []) {
    const diese = '#'.repeat(1 + (section.niveau ?? 1))
    parts.push('')
    parts.push(`${diese} ${section.titre}`)
    for (const bloc of section.blocs ?? []) {
      const rendu = blocMarkdown(bloc)
      if (rendu === null) continue
      parts.push('')
      parts.push(rendu.replace(/\n$/, ''))
    }
  }

  // Recompose, normalise les lignes vides, termine par un seul \n.
  return parts.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n'
}
```

- [ ] **Step 4: Lancer — passe**

Run: `npx vitest run src/lib/export/markdown.test.js`
Expected : PASS (tous). Si le test « titre seul » échoue sur un `\n` de trop, ajuster le
`trimEnd() + '\n'` final — la sortie attendue pour `{titre:'Titre', sections:[]}` est
exactement `"# Titre\n"`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/export/markdown.js src/lib/export/markdown.test.js
git commit -m "feat: export/versMarkdown — modèle Doc → markdown GFM"
```

---

## Task 2: `CSS_AU` + `versHtmlAU` + `echapper`

**Files:**
- Create: `src/lib/export/styleAU.js`
- Create: `src/lib/export/html.js`
- Create: `src/lib/export/html.test.js`

- [ ] **Step 1: Écrire le test**

`src/lib/export/html.test.js` :

```js
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
```

- [ ] **Step 2: Lancer — échoue**

Run: `npx vitest run src/lib/export/html.test.js`
Expected : FAIL — module introuvable.

- [ ] **Step 3: Écrire `src/lib/export/styleAU.js`**

```js
// Feuille de style d'impression conforme aux Aménagements Universels (AU) — supports
// imprimés : Arial 12pt, interligne généreux, hiérarchie sans dépendance à la couleur,
// bordures noires pour une impression N&B fidèle. Cf mémoire feedback_police_au_impression.
export const CSS_AU = `
@page { margin: 2cm; }
* { box-sizing: border-box; }
body { font-family: Arial, Helvetica, sans-serif; font-size: 12pt; line-height: 1.6; color: #000; margin: 0; }
h1 { font-size: 18pt; margin: 0 0 .3em; }
h2 { font-size: 14pt; margin: 1.2em 0 .4em; }
h3 { font-size: 12pt; font-weight: bold; margin: 1em 0 .3em; }
.soustitre { font-size: 12pt; font-style: italic; margin: 0 0 1em; }
.meta { font-size: 11pt; border-left: 3px solid #000; padding-left: .8em; margin: 1em 0; }
.meta p { margin: .2em 0; }
section { page-break-inside: avoid; margin-bottom: 1em; }
p { margin: .5em 0; }
ul { margin: .6em 0; padding-left: 1.4em; }
li { margin: .3em 0; }
blockquote { border-left: 3px solid #666; padding-left: .8em; font-style: italic; margin: .8em 0; }
table { border-collapse: collapse; width: 100%; margin: .8em 0; }
th, td { border: 1px solid #000; padding: .4em .6em; text-align: left; font-size: 11pt; vertical-align: top; }
`
```

- [ ] **Step 4: Écrire `src/lib/export/html.js`**

```js
import { CSS_AU } from './styleAU.js'

export function echapper(s) {
  if (s === null || s === undefined) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function blocHtml(bloc) {
  switch (bloc.type) {
    case 'paragraphe':
      return `<p>${echapper(bloc.texte)}</p>`
    case 'liste':
      return `<ul>${(bloc.items ?? []).map(i => `<li>${echapper(i)}</li>`).join('')}</ul>`
    case 'tableau': {
      const th = (bloc.entetes ?? []).map(e => `<th>${echapper(e)}</th>`).join('')
      const rows = (bloc.lignes ?? [])
        .map(l => `<tr>${l.map(c => `<td>${echapper(c)}</td>`).join('')}</tr>`)
        .join('')
      return `<table><thead><tr>${th}</tr></thead><tbody>${rows}</tbody></table>`
    }
    case 'citation':
      return `<blockquote>${echapper(bloc.texte).replace(/\n/g, '<br>')}</blockquote>`
    default:
      return null
  }
}

/**
 * @param {import('./markdown.js').Doc} doc
 * @returns {string}
 */
export function versHtmlAU(doc) {
  const corps = []
  corps.push(`<h1>${echapper(doc.titre)}</h1>`)
  if (doc.sousTitre) corps.push(`<p class="soustitre">${echapper(doc.sousTitre)}</p>`)

  if (doc.meta && doc.meta.length > 0) {
    corps.push('<div class="meta">')
    for (const m of doc.meta) corps.push(`<p><strong>${echapper(m.label)}</strong> : ${echapper(m.valeur)}</p>`)
    corps.push('</div>')
  }

  for (const section of doc.sections ?? []) {
    const tag = (section.niveau ?? 1) === 2 ? 'h3' : 'h2'
    const blocs = (section.blocs ?? []).map(blocHtml).filter(Boolean).join('')
    corps.push(`<section><${tag}>${echapper(section.titre)}</${tag}>${blocs}</section>`)
  }

  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${echapper(doc.titre)}</title><style>${CSS_AU}</style></head><body>${corps.join('')}</body></html>`
}
```

- [ ] **Step 5: Lancer — passe**

Run: `npx vitest run src/lib/export/html.test.js`
Expected : PASS. Note : le test `<section><h2>S1</h2></section>` suppose que les sections
sans bloc ne produisent rien entre `</h2>` et `</section>` — le `.filter(Boolean).join('')`
sur une liste vide donne `''`, donc OK.

- [ ] **Step 6: Commit**

```bash
git add src/lib/export/styleAU.js src/lib/export/html.js src/lib/export/html.test.js
git commit -m "feat: export/versHtmlAU + CSS_AU — modèle Doc → fiche HTML AU"
```

---

## Task 3: `imprimerAU`

**Files:**
- Create: `src/lib/export/impressionAU.js`

Pas de test automatique (DOM + dialogue d'impression natif). Vérification : `node --check`
+ build.

- [ ] **Step 1: Écrire `src/lib/export/impressionAU.js`**

```js
import { versHtmlAU } from './html.js'

/**
 * Ouvre la fiche AU dans un <iframe> caché et déclenche l'impression du navigateur.
 * L'utilisateur choisit « Enregistrer en PDF » dans le dialogue d'impression.
 * @param {import('./markdown.js').Doc} doc
 */
export function imprimerAU(doc) {
  const html = versHtmlAU(doc)

  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  Object.assign(iframe.style, {
    position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0',
  })
  document.body.appendChild(iframe)

  let nettoye = false
  const nettoyer = () => {
    if (nettoye) return
    nettoye = true
    setTimeout(() => iframe.remove(), 1000)
  }

  const win = iframe.contentWindow
  win.addEventListener('afterprint', nettoyer)

  const idoc = iframe.contentDocument
  idoc.open()
  idoc.write(html)
  idoc.close()

  // Laisser le layout se poser (tables, interligne) avant d'imprimer.
  setTimeout(() => {
    win.focus()
    win.print()
    // Filet : certains navigateurs ne déclenchent pas 'afterprint'.
    setTimeout(nettoyer, 500)
  }, 250)
}
```

- [ ] **Step 2: Vérifier**

Run: `node --check src/lib/export/impressionAU.js`
Expected : pas d'erreur de syntaxe.

- [ ] **Step 3: Commit**

```bash
git add src/lib/export/impressionAU.js
git commit -m "feat: export/imprimerAU — iframe caché + window.print"
```

---

## Task 4: `resultatVersDoc` (adaptateur ProgressActif)

**Files:**
- Create: `src/lib/export/adaptateurProgressActif.js`
- Create: `src/lib/export/adaptateurProgressActif.test.js`

- [ ] **Step 1: Écrire le test**

`src/lib/export/adaptateurProgressActif.test.js` :

```js
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
```

- [ ] **Step 2: Lancer — échoue**

Run: `npx vitest run src/lib/export/adaptateurProgressActif.test.js`
Expected : FAIL — module introuvable.

- [ ] **Step 3: Écrire `src/lib/export/adaptateurProgressActif.js`**

```js
// SEUL fichier du dossier export/ couplé à ProgressActif. Lors d'une extraction future
// vers shared/js/plai-export/, ce fichier reste ici ; chaque app garde son propre adaptateur.

const LABELS = { soutien: 'Soutien', cible: 'Cible', depassement: 'Dépassement' }
const CLES = ['soutien', 'cible', 'depassement']

/**
 * @param {{verification:{ecart_detecte:boolean, details:string},
 *   niveaux:Record<'soutien'|'cible'|'depassement',{annee_reference:string, attendu_cite:string, levier:string, enonce:string}>,
 *   grille:{attendu_cite:string, criteres:{critere:string, indicateur_reussite:string}[]}}} resultat
 * @param {{matiereLabel:string, annee:string, champLabel:string, sousPointTitre:string}} opts
 * @returns {import('./markdown.js').Doc}
 */
export function resultatVersDoc(resultat, { matiereLabel, annee, champLabel, sousPointTitre }) {
  const { verification, niveaux, grille } = resultat

  const sectionVerif = {
    titre: 'Vérification a priori',
    niveau: 1,
    blocs: [{
      type: 'paragraphe',
      texte: verification.ecart_detecte
        ? verification.details
        : `Aucun écart détecté — l'exercice correspond à l'attendu de ${annee}.`,
    }],
  }

  const sectionsNiveaux = CLES.map(cle => {
    const n = niveaux[cle]
    return {
      titre: LABELS[cle],
      niveau: 1,
      blocs: [
        { type: 'citation', texte: `« ${n.attendu_cite} » (${n.annee_reference})` },
        { type: 'paragraphe', texte: `Levier : ${n.levier}` },
        { type: 'paragraphe', texte: n.enonce },
      ],
    }
  })

  const sectionGrille = {
    titre: "Grille d'évaluation",
    niveau: 1,
    blocs: [
      { type: 'citation', texte: `« ${grille.attendu_cite} »` },
      {
        type: 'tableau',
        entetes: ['Critère', 'Indicateur de réussite'],
        lignes: grille.criteres.map(c => [c.critere, c.indicateur_reussite]),
      },
    ],
  }

  return {
    titre: `Exercice différencié — ${matiereLabel}`,
    sousTitre: `${champLabel} · ${sousPointTitre}`,
    meta: [
      { label: 'Année de référence', valeur: annee },
      { label: 'Champ', valeur: champLabel },
    ],
    sections: [sectionVerif, ...sectionsNiveaux, sectionGrille],
  }
}
```

- [ ] **Step 4: Lancer — passe**

Run: `npx vitest run src/lib/export/adaptateurProgressActif.test.js`
Expected : PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/export/adaptateurProgressActif.js src/lib/export/adaptateurProgressActif.test.js
git commit -m "feat: export/resultatVersDoc — adaptateur ProgressActif → modèle Doc"
```

---

## Task 5: câbler `Adapter.jsx` + README export

**Files:**
- Modify: `src/pages/Adapter.jsx`
- Create: `src/lib/export/README.md`

- [ ] **Step 1: Créer `src/lib/export/README.md`**

```markdown
# Module d'export PLAI (fiche AU imprimable + markdown)

`markdown.js`, `styleAU.js`, `html.js`, `impressionAU.js` : **aucun import de code métier**.
`adaptateurProgressActif.js` : le seul fichier couplé à cette app.

## Extraction future

Quand une 2ᵉ app PLAI a besoin de ce module :
1. Copier `markdown.js` + `styleAU.js` + `html.js` + `impressionAU.js` vers
   `claude-workspace/shared/js/plai-export/` (source canonique).
2. Chaque app garde/écrit son propre `adaptateur<NomApp>.js`.
3. Convention de copie identique à `shared/css/plai-style.css`.

Ne pas extraire tant qu'une seule app l'utilise (éviter d'abstraire trop tôt).
```

- [ ] **Step 2: Modifier `src/pages/Adapter.jsx` — imports**

Ajouter aux imports (près de `import { exportNiveauxDocx } from '../lib/exportDocx'`) :

```js
import { resultatVersDoc } from '../lib/export/adaptateurProgressActif'
import { imprimerAU } from '../lib/export/impressionAU'
import { versMarkdown } from '../lib/export/markdown'
import { saveAs } from 'file-saver'
```

- [ ] **Step 3: Ajouter les handlers**

Juste après la fonction `telechargerWord()` (vers la ligne 275) :

```js
  function docCourant() {
    return resultatVersDoc(resultat, {
      matiereLabel: conf.label,
      annee,
      champLabel,
      sousPointTitre: sousPoints.find(sp => sp.code === codeSousPoint)?.titre ?? codeSousPoint,
    })
  }

  function imprimerFiche() {
    if (resultat) imprimerAU(docCourant())
  }

  function telechargerMd() {
    if (!resultat) return
    const blob = new Blob([versMarkdown(docCourant())], { type: 'text/markdown;charset=utf-8' })
    saveAs(blob, `ProgressActif_${annee}_${codeSousPoint}_${new Date().toISOString().slice(0, 10)}.md`)
  }
```

Note : `conf`, `sousPoints`, `codeSousPoint`, `annee`, `champLabel`, `resultat` sont déjà
dans le scope du composant (`conf` = `MATIERES[matiere]`, `sousPoints` = `useMemo` existant).

- [ ] **Step 4: Modifier la barre de boutons**

Dans le bloc `{grille && (…)}`, remplacer :

```jsx
              <div className="no-print" style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="plai-btn" onClick={telechargerWord} disabled={!resultat}>Télécharger en Word</button>
                <button className="plai-btn-ghost" onClick={() => window.print()}>Imprimer / PDF</button>
              </div>
```

par :

```jsx
              <div className="no-print" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button className="plai-btn" onClick={telechargerWord} disabled={!resultat}>Télécharger en Word</button>
                <button className="plai-btn-ghost" onClick={imprimerFiche} disabled={!resultat}>Imprimer la fiche (AU)</button>
                <button className="plai-btn-ghost" onClick={telechargerMd} disabled={!resultat}>Télécharger (.md)</button>
              </div>
```

- [ ] **Step 5: Build check**

Run: `npx vite build`
Expected : build OK, aucune erreur.

- [ ] **Step 6: Suite complète**

Run: `npm test`
Expected : tous verts (les tests des chantiers précédents + markdown + html + adaptateur).

- [ ] **Step 7: Commit**

```bash
git add src/pages/Adapter.jsx src/lib/export/README.md
git commit -m "feat: Adapter — bouton fiche AU + téléchargement .md, remplace l'impression pleine page"
```

---

## Task 6: Vérification finale

- [ ] **Step 1: Suite + build**

Run: `npm test && npx vite build`
Expected : tous les tests verts, build OK.

- [ ] **Step 2: (manuel, après déploiement) Vérification prod**

Sur `progress-actif.vercel.app` :
1. Générer un exercice complet (cadrage → énoncés → grille).
2. « Télécharger (.md) » → ouvrir le fichier : titre, sous-titre, meta, 5 sections,
   tableau de grille bien formés.
3. « Imprimer la fiche (AU) » → le dialogue d'impression s'ouvre sur une **fiche propre**
   (pas la page entière). Vérifier : Arial 12, interligne large, un attendu par section,
   pas de coupure de section en travers de deux pages. « Enregistrer en PDF » produit un
   PDF lisible.
4. « Télécharger en Word » fonctionne toujours (inchangé).

---

## Notes de mise en œuvre

- **Pas de push sur `master`** — branche Vercel = `main`.
- **Build check obligatoire** (`npx vite build`) avant tout push.
- **Aucune dépendance npm nouvelle** — `file-saver` est déjà présent (`exportDocx.js`).
- **RISS** : aucune référence scientifique — un gabarit d'impression, pas de contenu à
  portée pédagogique. Le format AU s'appuie sur le cadre FWB (hors RISS) et la mémoire
  `feedback_police_au_impression`.
- **Frontière** : rien dans `markdown.js` / `styleAU.js` / `html.js` / `impressionAU.js`
  n'importe de code ProgressActif — c'est ce qui rend l'extraction future triviale. Un
  reviewer doit le vérifier.
- **Mutualisation** : ne PAS extraire vers `shared/` dans ce chantier. Le faire quand une
  2ᵉ app en a besoin (rappel à consigner).
