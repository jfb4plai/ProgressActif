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
