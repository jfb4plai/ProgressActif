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
