# ProgressActif

Différenciation à 3 niveaux (soutien / cible / dépassement) ancrée dans le référentiel
de compétences FWB. À partir d'un exercice source, l'outil propose un cadrage, des
énoncés et une grille d'évaluation, éditables à chaque étape.

## Flux de génération (3 étapes validées)

1. **Cadrage** — l'IA propose, pour chaque niveau, l'attendu de référence et le levier de
   différenciation. L'enseignant édite (menu déroulant contraint au référentiel, groupé par
   année) et valide.
2. **Énoncés** — générés à partir du cadrage validé. Éditables.
3. **Grille** — dérivée du niveau cible validé. Éditable, puis export Word / PDF.

`/api/generate` route sur `phase: cadrage | enonces | grille`. Le préfixe système (rôle +
contexte référentiel) est identique aux 3 appels et porte `cache_control`.

Modifier l'exercice source après le lancement efface les 3 étapes (bouton explicite, pas
de perte silencieuse).

## Rate limiting

`api/_rateLimit.js` : 30 requêtes / 10 min par IP (succès), plus un compteur strict sur les
échecs d'authentification (10 / 10 min). **Limite connue** : état in-memory, remis à zéro à
chaque cold start serverless et non partagé entre instances. Suffisant pour la bêta fermée ;
passer à un store partagé (Vercel KV) avant toute ouverture.

## Tests

- `npm test` — unitaires (schémas, prompts, reconstruction, rate limit, routage API mocké, Adapter)
- `npm run eval:phases` — eval sur appels API réels (6 cas), `ANTHROPIC_API_KEY` +
  `PROGRESSACTIF_ACCESS_CODE` requis, à lancer manuellement après toute modif de prompt.
