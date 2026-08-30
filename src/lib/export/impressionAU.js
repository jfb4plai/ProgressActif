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
