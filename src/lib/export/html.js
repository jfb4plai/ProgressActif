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
      return `<p>${echapper(bloc.texte).replace(/\n/g, '<br>')}</p>`
    case 'liste':
      return `<ul>${(bloc.items ?? []).map(i => `<li>${echapper(i)}</li>`).join('')}</ul>`
    case 'tableau': {
      const th = (bloc.entetes ?? []).map(e => `<th>${echapper(e)}</th>`).join('')
      const rows = (bloc.lignes ?? [])
        .map(l => `<tr>${(Array.isArray(l) ? l : [l]).map(c => `<td>${echapper(c)}</td>`).join('')}</tr>`)
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
