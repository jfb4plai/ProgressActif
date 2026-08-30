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

## Limites connues (à traiter lors de l'extraction vers shared/)

- Le texte des blocs `paragraphe` / `citation` est passé en markdown **brut** : un `#`, `*`,
  `_` ou backtick dans le contenu sera interprété par le lecteur markdown. C'est voulu (le
  markdown est fait pour être recollé dans Word/LMS). Ne pas "corriger".
- Séparateur de tableau GFM basé sur `entetes.length` : suppose que chaque ligne a autant
  de cellules que d'en-têtes. Vrai pour `resultatVersDoc` ; à généraliser
  (`max(entetes.length, ...lignes.map(l => l.length))`) quand une 2ᵉ app envoie des
  tableaux irréguliers.
- `echapper` n'échappe pas `'` : sûr tant qu'aucune donnée utilisateur n'entre dans un
  attribut HTML. Ajouter `'` → `&#39;` si le module interpole un jour dans un attribut.
