# Module d'export — fiche AU imprimable + markdown

Date : 2026-08-28
Statut : design validé, spec en revue
Origine : roadmap « reprise sélective des mécanismes StudyRaid », chantier prioritaire nº4
(module export). Construit d'abord dans ProgressActif ; extraction vers `shared/` quand une
2ᵉ app en aura besoin.

---

## 1. Problème

~8 apps PLAI ont chacune leur propre code d'export, tous distincts et non partagés :
`docx` (ProgressActif, MathActif, DevoirActif), `jsPDF` avec coordonnées manuelles
(LireActif), HTML string (AdaptActif), PDF serveur (AccèsActif). PLAI n'a aucun pattern de
code partagé — seul `shared/css/plai-style.css` est « canonique, copié par app ».

ProgressActif produit aujourd'hui un exercice différencié en 3 niveaux + une grille. Sorties
actuelles : `exportDocx.js` (Word, bon) et `window.print()` qui imprime **toute la page**
avec une CSS `no-print` bricolée — pas une fiche propre, pas conforme aux Aménagements
Universels (AU).

## 2. Objectif

Un petit module d'export **autonome** (aucun import de code métier ProgressActif), avec :

- **`versMarkdown(doc)`** — un modèle de contenu neutre → markdown (GFM). Téléchargement `.md`.
- **`imprimerAU(doc)`** — le même modèle → HTML avec feuille de style AU (Arial 12pt,
  interligne généreux, hiérarchie sans dépendance à la couleur, `page-break-inside: avoid`
  par section) injecté dans un `<iframe>` caché, puis `iframe.print()`. Pas de dépendance
  nouvelle, pas de popup.

Un seul fichier couplé à ProgressActif : l'adaptateur qui mappe le `resultat` de
`Adapter.jsx` vers le modèle neutre.

Décidé le 2026-08-28 :

- **Besoin ciblé** : fiche imprimable AU + markdown. **Pas** de génération PDF réelle
  (jsPDF/serveur), **pas** d'epub, **pas** de « lien de partage ».
- **Partage** : construire dans ProgressActif (`src/lib/export/`), frontière propre,
  extraire vers `shared/js/plai-export/` seulement quand une 2ᵉ app en a besoin. Ne pas
  abstraire prématurément.

Hors périmètre : epub ; hébergement d'un rendu partageable par URL ; extraction effective
vers `shared/` ; toucher aux autres apps ; remplacer `exportDocx.js` (il reste).

## 3. Modèle de contenu (`Doc`)

Objet JS neutre. Décrit dans `src/lib/export/doc.js` en JSDoc (pas de types runtime).

```js
/**
 * @typedef {Object} Doc
 * @property {string} titre
 * @property {string} [sousTitre]
 * @property {{label: string, valeur: string}[]} [meta]
 * @property {Section[]} sections
 *
 * @typedef {Object} Section
 * @property {string} titre
 * @property {1|2} [niveau]   // défaut 1
 * @property {Bloc[]} blocs
 *
 * @typedef {{type:'paragraphe', texte:string}
 *   | {type:'liste', items:string[]}
 *   | {type:'tableau', entetes:string[], lignes:string[][]}
 *   | {type:'citation', texte:string}} Bloc
 */
```

Contraintes :

- `titre` obligatoire et non vide. `sections` peut être `[]` (produit un document
  quasi-vide, pas une erreur).
- Un bloc de type inconnu est **ignoré silencieusement** par les deux renderers (robustesse
  face à une évolution du modèle).
- Le texte n'est jamais du HTML : les renderers échappent (markdown : rien à échapper hors
  `|` dans les tableaux ; HTML : échapper `& < > "`).

## 4. Architecture

### 4.1 `src/lib/export/markdown.js` — `versMarkdown(doc): string`

- `# {titre}` ; si `sousTitre` : ligne `_{sousTitre}_` en dessous.
- `meta` : une liste `- **{label}** : {valeur}` par entrée, puis une ligne vide.
- Par section : `#` répété `1 + (niveau ?? 1)` fois + espace + `{titre}` (donc `##` pour
  niveau 1, `###` pour niveau 2), ligne vide, puis les blocs :
  - `paragraphe` → le texte, ligne vide après.
  - `liste` → `- {item}` par ligne, ligne vide après.
  - `tableau` → ligne d'en-têtes `| a | b |`, ligne séparatrice `| --- | --- |`, une ligne
    par `lignes[]` ; `|` dans les cellules remplacé par `\|` ; ligne vide après.
  - `citation` → `> {texte}` (multi-lignes : `>` sur chaque ligne), ligne vide après.
- Résultat : `.trim()` + `\n` final. Jamais 3 lignes vides consécutives.

### 4.2 `src/lib/export/styleAU.js` — `CSS_AU: string`

Template string de la feuille de style AU imprimable :

- `@page { margin: 2cm; }`
- `body { font-family: Arial, Helvetica, sans-serif; font-size: 12pt; line-height: 1.6;
  color: #000; }`
- `h1 { font-size: 18pt; } h2 { font-size: 14pt; margin-top: 1.2em; } h3 { font-size: 12pt;
  font-weight: bold; }`
- `section { page-break-inside: avoid; margin-bottom: 1em; }`
- `.meta { font-size: 11pt; color: #000; border-left: 3px solid #000; padding-left: .8em;
  margin: 1em 0; }` (bordure noire, pas de couleur PLAI — impression N&B fidèle)
- `blockquote { border-left: 3px solid #666; padding-left: .8em; font-style: italic;
  margin: .8em 0; }`
- `table { border-collapse: collapse; width: 100%; margin: .8em 0; }
  th, td { border: 1px solid #000; padding: .4em .6em; text-align: left; font-size: 11pt; }`
- `ul { margin: .6em 0; padding-left: 1.4em; }  li { margin: .3em 0; }`
- Pas de `@media` : la feuille est déjà pensée pour l'impression.

Cohérent avec la mémoire `feedback_police_au_impression` (Arial 12 pour supports imprimés
AU, distinct du seuil 16px écran).

### 4.3 `src/lib/export/html.js` — `versHtmlAU(doc): string`

Document HTML complet : `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<title>{titre échappé}</title><style>{CSS_AU}</style></head><body>…</body></html>`.

Corps :
- `<h1>{titre}</h1>` ; si `sousTitre` : `<p class="soustitre">…</p>`.
- `meta` : `<div class="meta">` avec un `<p><strong>{label}</strong> : {valeur}</p>` par
  entrée.
- Par section : `<section>` + titre en `<h2>`/`<h3>` selon `niveau`, puis les blocs :
  - `paragraphe` → `<p>`
  - `liste` → `<ul><li>…`
  - `tableau` → `<table><thead><tr><th>…</thead><tbody><tr><td>…`
  - `citation` → `<blockquote>` (les sauts de ligne du texte → `<br>`)
- Tout texte passé par une fonction `echapper(s)` (`&`→`&amp;` en premier, puis `<`, `>`,
  `"`).

Fonction pure et testable (assertions sur le string).

### 4.4 `src/lib/export/impressionAU.js` — `imprimerAU(doc): void`

```js
import { versHtmlAU } from './html.js'

export function imprimerAU(doc) {
  const html = versHtmlAU(doc)
  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  document.body.appendChild(iframe)

  const win = iframe.contentWindow
  const cleanup = () => { setTimeout(() => iframe.remove(), 1000) }
  win.addEventListener('afterprint', cleanup)

  const idoc = iframe.contentDocument
  idoc.open()
  idoc.write(html)
  idoc.close()

  // Laisser le rendu se poser avant d'imprimer (polices, layout table)
  setTimeout(() => {
    win.focus()
    win.print()
    // Filet si afterprint ne se déclenche pas (certains navigateurs)
    setTimeout(cleanup, 500)
  }, 250)
}
```

Wrapper mince, non testé automatiquement (DOM + dialogue d'impression). Le risque est
contenu : toute la logique de contenu est dans `versHtmlAU` (testée).

### 4.5 `src/lib/export/adaptateurProgressActif.js` — le seul fichier couplé

```js
// resultat : { verification: {ecart_detecte, details},
//   niveaux: {soutien/cible/depassement: {annee_reference, attendu_cite, levier, enonce}},
//   grille: {attendu_cite, criteres: [{critere, indicateur_reussite}]} }
export function resultatVersDoc(resultat, { matiereLabel, annee, champLabel, sousPointTitre }) { … }
```

Mappe vers `Doc` :

- `titre` = `Exercice différencié — {matiereLabel}`
- `sousTitre` = `{champLabel} · {sousPointTitre}`
- `meta` = `[{label:'Année de référence', valeur: annee}, {label:'Champ', valeur: champLabel}]`
- Section « Vérification a priori » (niveau 1) : un `paragraphe` = `verification.details` si
  `ecart_detecte`, sinon `Aucun écart détecté — l'exercice correspond à l'attendu de {annee}.`
- Une section par niveau (`Soutien` / `Cible` / `Dépassement`, niveau 1) :
  `citation` = `« {attendu_cite} » ({annee_reference})`, `paragraphe` = `Levier : {levier}`,
  `paragraphe` = `{enonce}`.
- Section « Grille d'évaluation » (niveau 1) : `citation` = `« {grille.attendu_cite} »`,
  `tableau` entetes `['Critère', 'Indicateur de réussite']`, une ligne par
  `grille.criteres`.

Testé sur un `resultat` réaliste (forme figée depuis Prio 1).

### 4.6 UI — `src/pages/Adapter.jsx`

Dans le bloc `{grille && (…)}`, la barre de boutons (lignes ~407-410) :

- **Remplacer** `<button className="plai-btn-ghost" onClick={() => window.print()}>Imprimer / PDF</button>`
  par `<button className="plai-btn-ghost" onClick={imprimerFiche} disabled={!resultat}>Imprimer la fiche (AU)</button>`.
- **Ajouter** `<button className="plai-btn-ghost" onClick={telechargerMd} disabled={!resultat}>Télécharger (.md)</button>`.
- **Conserver** `<button className="plai-btn" onClick={telechargerWord}>Télécharger en Word</button>`.

Handlers dans le composant :

```js
import { resultatVersDoc } from '../lib/export/adaptateurProgressActif'
import { imprimerAU } from '../lib/export/impressionAU'
import { versMarkdown } from '../lib/export/markdown'
import { saveAs } from 'file-saver'   // déjà une dépendance (exportDocx)

function docCourant() {
  return resultatVersDoc(resultat, {
    matiereLabel: conf.label,
    annee,
    champLabel,
    sousPointTitre: sousPoints.find(sp => sp.code === codeSousPoint)?.titre ?? codeSousPoint,
  })
}
function imprimerFiche() { if (resultat) imprimerAU(docCourant()) }
function telechargerMd() {
  if (!resultat) return
  const blob = new Blob([versMarkdown(docCourant())], { type: 'text/markdown;charset=utf-8' })
  saveAs(blob, `ProgressActif_${annee}_${codeSousPoint}_${new Date().toISOString().slice(0,10)}.md`)
}
```

`sousPoints` et `conf` sont déjà dans le scope du composant (`Adapter.jsx`).

## 5. Fichiers touchés

| Fichier | Nature |
|---|---|
| `src/lib/export/doc.js` | **créer** — JSDoc du modèle, aucune logique (ou omis si les typedef vivent dans `markdown.js`) |
| `src/lib/export/markdown.js` + `.test.js` | **créer** — `versMarkdown` |
| `src/lib/export/styleAU.js` | **créer** — `CSS_AU` |
| `src/lib/export/html.js` + `.test.js` | **créer** — `versHtmlAU`, `echapper` |
| `src/lib/export/impressionAU.js` | **créer** — `imprimerAU` (wrapper, non testé) |
| `src/lib/export/adaptateurProgressActif.js` + `.test.js` | **créer** — `resultatVersDoc` |
| `src/pages/Adapter.jsx` | 2 boutons (remplace print page, ajoute .md), 3 handlers |
| `README` court dans `src/lib/export/` | **créer** — note d'extraction future vers `shared/` |

Inchangés : `exportDocx.js`, le reste d'`Adapter.jsx`, le pipeline de génération.

## 6. Tests

- **`versMarkdown`** : titre + sousTitre ; meta ; section niveau 1 → `##`, niveau 2 →
  `###` ; paragraphe / liste / tableau (avec `|` échappé) / citation ; bloc de type inconnu
  ignoré ; `sections: []` → juste le titre ; pas de triple ligne vide.
- **`versHtmlAU`** : contient `<style>` avec `Arial` et `12pt` ; `echapper` transforme
  `<script>` en `&lt;script&gt;` ; un `&` dans un texte → `&amp;` (pas `&amp;amp;`) ;
  tableau → `<th>` + `<td>` ; citation multi-ligne → `<br>`.
- **`resultatVersDoc`** : sur un `resultat` réaliste, produit un `Doc` avec 5 sections
  (vérification + 3 niveaux + grille), le tableau de la grille a autant de lignes que
  `criteres`, `ecart_detecte: false` → phrase « Aucun écart détecté ».
- **Non testé** : `imprimerAU` (DOM/impression), le rendu visuel de la fiche (vérif manuelle
  en prod : imprimer une fiche, contrôler Arial 12, sauts de page propres).

## 7. Risques et limites

| Risque | Traitement |
|---|---|
| Dérive future entre `src/lib/export/` et une copie dans une 2ᵉ app | Aucune copie tant qu'une 2ᵉ app n'en a pas besoin ; à ce moment → `shared/js/plai-export/` canonique, adaptateurs par app. Rappel de mutualisation à chaque chantier touchant l'export. |
| `iframe.print()` non fiable sur un navigateur | Filet `setTimeout(cleanup, 500)` + `afterprint` ; toute la logique testable est dans `versHtmlAU` |
| Polices non chargées au moment du `print()` | `setTimeout(…, 250)` avant `print()` ; Arial est une police système (pas de webfont à attendre) |
| Le modèle `Doc` évolue et une app envoie un bloc inconnu | Ignoré silencieusement par les deux renderers (choix de robustesse, §3) |
| `window.print()` retiré d'`Adapter.jsx` : perte de l'impression « pleine page » | Volontaire — la fiche AU est le bon livrable ; la CSS `no-print` / `.impression-titre` d'`Adapter.jsx` peut être nettoyée dans un lot séparé (hors périmètre) |

## 8. Décisions ouvertes pour le plan

- `doc.js` séparé vs typedef dans `markdown.js` — trancher à l'implémentation (cosmétique).
- Nom exact des fichiers `.md` téléchargés — aligné sur `exportDocx.js`
  (`ProgressActif_{annee}_{codeSousPoint}_{date}`).
- Faut-il garder un bouton « Imprimer la page entière » en plus de la fiche AU ? Design
  actuel : non (une seule impression, la bonne). À confirmer.
