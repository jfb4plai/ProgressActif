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
