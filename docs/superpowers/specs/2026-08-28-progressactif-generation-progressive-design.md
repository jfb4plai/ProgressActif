# ProgressActif — Génération progressive en 3 étapes validées

Date : 2026-08-28
Statut : design validé, spec en revue
Origine : analyse du mécanisme StudyRaid (génération plan → remplissage), transposée au
contexte PLAI. Chantier prioritaire nº1 de la roadmap « reprise sélective des mécanismes
StudyRaid ».

---

## 1. Problème

Aujourd'hui `Adapter.jsx` + `/api/generate` fonctionnent en **un seul appel Sonnet** :
un exercice source + coordonnées référentiel → l'IA produit d'un coup la vérification
d'écart, les 3 énoncés différenciés (soutien / cible / dépassement) et la grille
d'évaluation, le tout affiché ensemble dans des zones éditables.

Le prompt système ([maths.js](../../../src/lib/matieres/maths.js), francais.js) décrit
explicitement quatre étapes (vérification a priori → cadrage des 3 niveaux → grille →
sortie), mais **l'IA les enchaîne en silence**. Or les décisions des étapes 1–2 sont les
décisions didactiques dures :

- quel attendu de l'année voisine ancre le palier soutien / dépassement ;
- quel est le **levier** de différenciation réel à ce sous-point précis (borne numérique,
  structure de l'énoncé, exigence ajoutée, niveau de formalisation) — le prompt insiste
  lui-même sur le fait que ce levier « diffère à chaque sous-point, ne le suppose jamais
  a priori ».

L'enseignant ne voit ces choix qu'*après coup*, incarnés dans des énoncés déjà rédigés.
Son 20 % de singularité (contexte classe, vocabulaire, élèves réels) s'exerce alors sur la
forme, pas sur le cadrage. C'est l'inverse du principe fondateur « IA = amplificateur,
pas substitut » : la décision structurante doit être un geste conscient de l'enseignant.

## 2. Objectif

Décomposer la génération en **trois appels, chacun un point d'arrêt éditable**, de sorte
qu'il soit **impossible de générer les énoncés sans avoir vu et validé le cadrage
didactique**.

Hors périmètre (décidé le 2026-08-28) :

- Pas de couche de justification RISS sous les leviers. Les attendus mobilisés sont
  curriculaires (référentiel FWB), pas des affirmations scientifiques — pas d'obligation
  RISS. La couche « pourquoi ce levier » RISS-sourcée est réservée au chantier CorpusActif
  synthèse.
- Pas de persistance en base : l'état intermédiaire vit en React state uniquement, comme
  aujourd'hui (« Rien n'est sauvegardé automatiquement »).
- Pas de changement du référentiel, de l'export, du branding, de l'AccessGate.

## 3. Architecture

### 3.1 API — endpoint unique, paramètre `phase`

`POST /api/generate` conserve son gate (code d'accès partagé, échec fermé) et prend un
champ `phase` : `"cadrage" | "enonces" | "grille"`.

| phase | body entrant (en plus du gate) | sortie (`output_config` json_schema) |
|---|---|---|
| `cadrage` | `matiere`, `anneeDeclaree`, `champLabel`, `codeSousPoint`, `exerciceTexte` | `{ verification: { ecart_detecte, details }, cadrage: { soutien, cible, depassement: { annee_reference, attendu_cite, levier } } }` |
| `enonces` | ci-dessus + `cadrage` (validé/édité par l'enseignant) | `{ enonces: { soutien, cible, depassement: { enonce } } }` |
| `grille` | `matiere`, `anneeDeclaree`, `champLabel`, `codeSousPoint`, `cadrage`, `enonces` | `{ grille: { attendu_cite, criteres: [{ critere, indicateur_reussite }] } }` |

Règles :

- **Un sous-schéma par phase.** `_generationSchema.js` est éclaté en `SCHEMA_CADRAGE`,
  `SCHEMA_ENONCES`, `SCHEMA_GRILLE`. Le `NIVEAU` actuel (annee_reference + attendu_cite +
  levier + enonce) est scindé : `CADRAGE_NIVEAU` (sans `enonce`), `ENONCE_NIVEAU`
  (`enonce` seul). `GRILLE` inchangé. `verification` inchangé.
- **Un sous-prompt système par phase**, extrait du prompt actuel :
  - `cadrage` : sections « Contexte référentiel » + « Étape 1 — Vérification a priori » +
    la partie de l'« Étape 2 » qui concerne le choix de l'attendu ancré et
    l'identification du levier (pas la rédaction de l'énoncé). Consigne de sortie : ne
    produire aucun texte d'exercice.
  - `enonces` : « Contexte référentiel » + le cadrage validé injecté comme contrainte
    (« tu rédiges les 3 énoncés en respectant exactement ces attendus et ces leviers, sans
    les renégocier ») + la partie rédaction de l'« Étape 2 ».
  - `grille` : « Contexte référentiel » + « Étape 3 — Grille » + le cadrage cible et
    l'énoncé cible validés injectés.
- **`cache_control`** sur le bloc « Contexte référentiel » (identique aux 3 phases) pour
  amortir le surcoût des appels multiples.
- **`max_tokens`** : `cadrage` ~2000, `enonces` ~6000, `grille` ~2000 (aujourd'hui 6000
  pour tout).
- **Modèle** : `claude-sonnet-4-6` conservé (ID valide, sans suffixe de date). Le flag
  d'audit « modèle à vérifier » est clos par ce constat. Pas de bascule Haiku : le
  calibrage didactique justifie Sonnet.
- **Rate limiting réel** ajouté dans ce lot (finding d'audit connu) : le code d'accès
  partagé n'empêche pas la sur-consommation. Limite par IP + fenêtre glissante (ex.
  30 requêtes / 10 min, in-memory sur l'instance serverless — suffisant pour la bêta ;
  documenter la limite de ce choix). À affiner à l'implémentation.

### 3.2 Client — `Adapter.jsx` en machine à états

État `phase` :
`idle → cadrageGen → cadrageReview → enoncesGen → enoncesReview → grilleGen → resultat`

Transitions :

| depuis | action | vers |
|---|---|---|
| `idle` | « Générer le cadrage » (après sélection matière/année/champ/sous-point + exercice) | `cadrageGen` → `cadrageReview` |
| `cadrageReview` | « Valider le cadrage → générer les énoncés » | `enoncesGen` → `enoncesReview` |
| `enoncesReview` | « Valider les énoncés → générer la grille » | `grilleGen` → `resultat` |
| `cadrageReview` / `enoncesReview` / `resultat` | « Revenir à l'étape précédente » | l'étape amont ; l'aval déjà généré est effacé |
| toute étape | changement d'un champ du formulaire source | retour `idle`, tout l'aval effacé |

Composants :

- **`CadrageCard`** (nouveau) — une par niveau. Affiche `annee_reference`. Champ
  `attendu_cite` = **menu déroulant** dont les options sont les attendus réels du
  sous-point aux années concernées, obtenus côté client via `contexteReferentiel()` /
  `formaterSousPoint()` (données déjà chargées, aucun appel réseau). L'option
  pré-sélectionnée est celle proposée par l'IA ; si la citation IA ne correspond
  exactement à aucun attendu du corpus, l'afficher en tête avec un marqueur « proposé par
  l'IA — non trouvé tel quel dans le référentiel » et laisser l'enseignant trancher.
  Champ `levier` = textarea éditable. Texte d'aide sous chaque champ (règle PLAI :
  guidage contextuel obligatoire).
- **Bloc `verification`** — réutilise l'affichage actuel (`plai-error` si
  `ecart_detecte`, sinon `plai-success`), rendu en `cadrageReview` et conservé jusqu'à
  `resultat`.
- **`NiveauCard`** (existant) — inchangé, rendu en `enoncesReview` et `resultat`. La carte
  n'affiche plus `levier` en lecture seule au-dessus de l'énoncé : le levier a été validé
  à l'étape précédente et reste visible (lecture seule) dans un rappel compact.
- **`GrilleEvaluation`** (existant) — inchangé, rendu en `resultat`.
- Barre de progression 3 étapes (Cadrage · Énoncés · Grille) en tête de la zone résultat,
  `no-print`.

### 3.3 Reconstruction de l'objet final

À l'entrée de `resultat`, le client reconstruit l'objet `resultat` **à la forme actuelle** :

```js
{ verification, niveaux: { soutien: {...cadrage.soutien, enonce}, cible: {...}, depassement: {...} }, grille }
```

Conséquence : `exportDocx.js` (`exportNiveauxDocx`), l'affichage `#zone-resultat`,
`window.print()` — **aucun changement**. Le contrat de sortie est préservé ; seul le
chemin pour y arriver change.

## 4. Fichiers touchés

| Fichier | Nature |
|---|---|
| `api/generate.js` | routage par `phase`, 3 branches, cache_control, rate limiting, max_tokens par phase |
| `src/lib/matieres/_generationSchema.js` | éclatement en `SCHEMA_CADRAGE` / `SCHEMA_ENONCES` / `SCHEMA_GRILLE` |
| `src/lib/matieres/maths.js` | `construirePromptSysteme` → 3 fonctions `construirePrompt{Cadrage,Enonces,Grille}` partageant le bloc contexte |
| `src/lib/matieres/francais.js` | idem, symétrique |
| `src/pages/Adapter.jsx` | machine à états, nouveaux appels, `CadrageCard`, barre de progression, reconstruction objet final |
| `src/lib/matieres/*.test.*` (ou dossier de tests existant) | rejouer les 6 cas réels en 3 phases |
| `README` / doc courte | documenter le flux 3 étapes et la limite du rate limiting in-memory |

Inchangés : `exportDocx.js`, `AccessGate.jsx`, `App.jsx`, référentiel JSON, CSS/branding.

## 5. Tests

Base : les 6 cas réels de `progressactif-prototype-p1-exemple` (4 maths + 1 français +
1 sciences, patterns de progression continu / plafonnant / discontinu).

Assertions par cas :

1. **Cadrage sans énoncé** — la sortie `phase: cadrage` ne contient aucun champ `enonce`
   et aucun texte d'exercice dans `levier` / `attendu_cite`.
2. **Le cadrage édité change l'énoncé** — rejouer `phase: enonces` avec un `levier` cible
   modifié (ex. resserrer une borne numérique) produit un `enonce` cible différent de
   celui obtenu avec le cadrage IA d'origine. *C'est le test qui prouve que le 20 %
   enseignant est structurel et pas cosmétique.*
3. **Forme finale** — l'objet reconstruit après `phase: grille` valide `GENERATION_SCHEMA`
   d'origine (on garde ce schéma comme contrat de vérification post-reconstruction) et
   `exportNiveauxDocx` s'exécute sans erreur.
4. **Absence de sous-point voisin** — le cas sciences (sous-thème absent une année) :
   `attendu_cite` du palier concerné porte le marqueur « absent » et non un attendu
   fabriqué ; le menu déroulant `CadrageCard` propose le repli sur le contexte annuel.

Commande : aligner sur la convention DiffActif (`npm run test:*`). Build check
obligatoire avant push (`npx vite build`).

## 6. Risques et limites

| Risque | Traitement |
|---|---|
| Friction : 3 clics au lieu d'1 | Accepté — c'est le geste qu'on veut rendre conscient. Cadrage court et lisible, pas de mur de texte. |
| Enseignant qui « valide » sans lire | Le cadrage tient en 3 cartes courtes ; on ne peut pas le supprimer sans supprimer l'objet du chantier. |
| Surcoût API (×3 appels) | cache_control sur le contexte + max_tokens réduits sur cadrage/grille + rate limiting. Mesurer le coût réel sur les 6 cas de test. |
| Rate limiting in-memory non partagé entre instances serverless | Suffisant pour la bêta fermée ; documenté ; à remplacer par un store partagé (KV) si l'app s'ouvre. |
| Citation IA hors corpus au cadrage | Rendue visible et non sélectionnée par défaut ; l'enseignant tranche via le menu déroulant. |

## 7. Décisions ouvertes pour le plan d'implémentation

- Store exact du rate limiting (in-memory simple vs Vercel KV) — trancher à
  l'implémentation selon l'effort.
- Emplacement et runner des tests (le dépôt n'a pas encore de dossier `test/` visible) —
  à cadrer dans le plan.
