# Génération progressive en 3 étapes validées — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Décomposer la génération unique de ProgressActif en trois appels validés (cadrage didactique → énoncés → grille), chacun un point d'arrêt éditable, sans changer le contrat de sortie ni l'export.

**Architecture:** `/api/generate` devient un routeur à trois `phase`. `_generationSchema.js` est éclaté en trois sous-schémas. Chaque module matière (`maths.js`, `francais.js`) expose trois constructeurs de prompt qui partagent un bloc « contexte référentiel » mis en cache. `Adapter.jsx` devient une machine à états qui reconstruit, à la fin, l'objet `resultat` à la forme actuelle. Un module de rate limiting in-memory protège la clé Anthropic.

**Tech Stack:** React 18, Vite 5, Vercel Serverless Functions (Node), appels HTTP bruts vers `api.anthropic.com` (modèle `claude-sonnet-4-6`), Vitest (ajouté par ce plan), `docx` + `file-saver` (inchangés).

---

## File Structure

| Fichier | Responsabilité | Action |
|---|---|---|
| `package.json` | scripts + devDep vitest | Modify |
| `vitest.config.js` | config test (environnement node par défaut, jsdom pour les tests React) | Create |
| `src/lib/matieres/_generationSchema.js` | schémas de sortie : 3 sous-schémas + `GENERATION_SCHEMA` conservé pour la validation post-reconstruction | Modify |
| `src/lib/matieres/_generationSchema.test.js` | forme des schémas | Create |
| `src/lib/matieres/maths.js` | contexte référentiel maths + 3 constructeurs de prompt | Modify |
| `src/lib/matieres/maths.test.js` | présence/absence de contenu par phase, options de cadrage | Create |
| `src/lib/matieres/francais.js` | idem, symétrique | Modify |
| `src/lib/matieres/francais.test.js` | idem | Create |
| `src/lib/reconstruction.js` | `reconstruireResultat()` — assemble cadrage + énoncés + grille à la forme `resultat` | Create |
| `src/lib/reconstruction.test.js` | forme de l'objet reconstruit | Create |
| `api/_rateLimit.js` | fenêtre glissante in-memory par IP | Create |
| `api/_rateLimit.test.js` | comptage, expiration de fenêtre | Create |
| `api/generate.js` | routage par `phase`, cache_control, max_tokens par phase, rate limiting | Modify |
| `src/pages/Adapter.jsx` | machine à états, `CadrageCard`, barre de progression, reconstruction finale | Modify |
| `scripts/eval-phases.mjs` | eval manuelle des 6 cas réels (appels API réels) | Create |
| `README.md` | documenter le flux 3 étapes + limite du rate limiting | Modify |

Inchangés : `src/lib/exportDocx.js`, `src/components/AccessGate.jsx`, `src/App.jsx`, `src/data/referentiel/**`, CSS/branding.

---

## Task 1: Ajouter Vitest

**Files:**
- Modify: `package.json`
- Create: `vitest.config.js`

- [ ] **Step 1: Installer vitest + jsdom**

Run:
```bash
npm install -D vitest@^2.1.0 jsdom@^25.0.0 @testing-library/react@^16.0.0 @testing-library/jest-dom@^6.5.0
```
Expected : les paquets s'ajoutent à `devDependencies`, pas d'erreur de peer-deps bloquante.

- [ ] **Step 2: Ajouter les scripts de test**

Dans `package.json`, remplacer le bloc `"scripts"` par :

```json
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "eval:phases": "node scripts/eval-phases.mjs"
  },
```

- [ ] **Step 3: Créer `vitest.config.js`**

```js
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    environmentMatchGlobs: [['**/*.jsx.test.js', 'jsdom'], ['src/pages/**', 'jsdom']],
    setupFiles: [],
  },
})
```

- [ ] **Step 4: Vérifier que le runner démarre**

Run: `npm test`
Expected : `No test files found` (aucun test encore) — exit code 0 ou message explicite, pas de crash de config.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.js
git commit -m "test: ajoute vitest + jsdom"
```

---

## Task 2: Éclater le schéma de génération en 3 sous-schémas

**Files:**
- Modify: `src/lib/matieres/_generationSchema.js`
- Create: `src/lib/matieres/_generationSchema.test.js`

- [ ] **Step 1: Écrire le test**

`src/lib/matieres/_generationSchema.test.js` :

```js
import { describe, it, expect } from 'vitest'
import {
  SCHEMA_CADRAGE, SCHEMA_ENONCES, SCHEMA_GRILLE, GENERATION_SCHEMA,
} from './_generationSchema.js'

describe('SCHEMA_CADRAGE', () => {
  it('exige verification + cadrage, jamais niveaux ni enonce', () => {
    expect(SCHEMA_CADRAGE.required).toEqual(['verification', 'cadrage'])
    const niveau = SCHEMA_CADRAGE.properties.cadrage.properties.cible
    expect(niveau.required).toEqual(['annee_reference', 'attendu_cite', 'levier'])
    expect(niveau.properties).not.toHaveProperty('enonce')
  })
})

describe('SCHEMA_ENONCES', () => {
  it('exige enonces avec un enonce par niveau', () => {
    expect(SCHEMA_ENONCES.required).toEqual(['enonces'])
    const niveau = SCHEMA_ENONCES.properties.enonces.properties.soutien
    expect(niveau.required).toEqual(['enonce'])
  })
})

describe('SCHEMA_GRILLE', () => {
  it('exige grille avec attendu_cite + criteres', () => {
    expect(SCHEMA_GRILLE.required).toEqual(['grille'])
    expect(SCHEMA_GRILLE.properties.grille.required).toEqual(['attendu_cite', 'criteres'])
  })
})

describe('GENERATION_SCHEMA (contrat post-reconstruction, conservé)', () => {
  it('exige verification + niveaux + grille', () => {
    expect(GENERATION_SCHEMA.required).toEqual(['verification', 'niveaux', 'grille'])
    expect(GENERATION_SCHEMA.properties.niveaux.properties.cible.required)
      .toEqual(['annee_reference', 'attendu_cite', 'levier', 'enonce'])
  })
})
```

- [ ] **Step 2: Lancer le test — il échoue**

Run: `npx vitest run src/lib/matieres/_generationSchema.test.js`
Expected : FAIL — `SCHEMA_CADRAGE` is undefined.

- [ ] **Step 3: Réécrire `_generationSchema.js`**

```js
// Schémas de sortie du générateur.
// La génération se fait en 3 phases (cadrage → énoncés → grille), chacune contrainte
// par son propre sous-schéma via output_config. GENERATION_SCHEMA reste la forme finale
// (après recomposition côté client) et sert de contrat de vérification dans les tests.

const VERIFICATION = {
  type: 'object',
  additionalProperties: false,
  required: ['ecart_detecte', 'details'],
  properties: {
    ecart_detecte: { type: 'boolean', description: 'true si l\'exercice source ou un palier voisin ne correspond pas à l\'attendu attendu pour son année.' },
    details: { type: 'string', description: 'Explication de l\'écart avec citation des attendus en cause. "" si aucun écart.' },
  },
}

const CADRAGE_NIVEAU = {
  type: 'object',
  additionalProperties: false,
  required: ['annee_reference', 'attendu_cite', 'levier'],
  properties: {
    annee_reference: { type: 'string', description: 'Année du référentiel sur laquelle ce niveau s\'ancre (ex. "P1", "P3").' },
    attendu_cite: { type: 'string', description: 'Citation exacte, mot pour mot, de l\'attendu ou du descripteur utilisé — jamais paraphrasé.' },
    levier: { type: 'string', description: 'Une phrase : ce qui change concrètement par rapport à la cible (borne numérique, structure, exigence ajoutée, formalisation, descripteur transversal...).' },
  },
}

const ENONCE_NIVEAU = {
  type: 'object',
  additionalProperties: false,
  required: ['enonce'],
  properties: {
    enonce: { type: 'string', description: 'Le texte complet de l\'exercice pour ce niveau, prêt à être relu par l\'enseignant.' },
  },
}

const TROIS_NIVEAUX = (niveau) => ({
  type: 'object',
  additionalProperties: false,
  required: ['soutien', 'cible', 'depassement'],
  properties: { soutien: niveau, cible: niveau, depassement: niveau },
})

const GRILLE = {
  type: 'object',
  additionalProperties: false,
  required: ['attendu_cite', 'criteres'],
  properties: {
    attendu_cite: { type: 'string', description: 'Citation exacte de l\'attendu cible sur lequel la grille s\'appuie — doit correspondre au niveau cible.' },
    criteres: {
      type: 'array',
      // L'API Anthropic rejette minItems/maxItems > 0/1 sur les tableaux — la contrainte
      // "3 à 6 critères" est portée par le prompt système (étape 3).
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['critere', 'indicateur_reussite'],
        properties: {
          critere: { type: 'string', description: 'Un aspect observable de la production de l\'élève, décomposé à partir du texte de l\'attendu cible — pas un critère générique.' },
          indicateur_reussite: { type: 'string', description: 'Ce qui permet de dire, concrètement, que ce critère est atteint — cochable en classe.' },
        },
      },
    },
  },
}

export const SCHEMA_CADRAGE = {
  type: 'object',
  additionalProperties: false,
  required: ['verification', 'cadrage'],
  properties: { verification: VERIFICATION, cadrage: TROIS_NIVEAUX(CADRAGE_NIVEAU) },
}

export const SCHEMA_ENONCES = {
  type: 'object',
  additionalProperties: false,
  required: ['enonces'],
  properties: { enonces: TROIS_NIVEAUX(ENONCE_NIVEAU) },
}

export const SCHEMA_GRILLE = {
  type: 'object',
  additionalProperties: false,
  required: ['grille'],
  properties: { grille: GRILLE },
}

const NIVEAU_COMPLET = {
  type: 'object',
  additionalProperties: false,
  required: ['annee_reference', 'attendu_cite', 'levier', 'enonce'],
  properties: {
    ...CADRAGE_NIVEAU.properties,
    ...ENONCE_NIVEAU.properties,
  },
}

export const GENERATION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['verification', 'niveaux', 'grille'],
  properties: {
    verification: VERIFICATION,
    niveaux: TROIS_NIVEAUX(NIVEAU_COMPLET),
    grille: GRILLE,
  },
}
```

- [ ] **Step 4: Lancer le test — il passe**

Run: `npx vitest run src/lib/matieres/_generationSchema.test.js`
Expected : PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/matieres/_generationSchema.js src/lib/matieres/_generationSchema.test.js
git commit -m "feat: éclate le schéma de génération en cadrage/énoncés/grille"
```

---

## Task 3: Trois constructeurs de prompt — `maths.js`

**Files:**
- Modify: `src/lib/matieres/maths.js`
- Create: `src/lib/matieres/maths.test.js`

- [ ] **Step 1: Écrire le test**

`src/lib/matieres/maths.test.js` :

```js
import { describe, it, expect } from 'vitest'
import {
  construirePromptCadrage, construirePromptEnonces, construirePromptGrille,
  optionsCadrage,
} from './maths.js'

const base = {
  anneeDeclaree: 'P3',
  champLabel: 'Nombres',
  codeSousPoint: '1.1',
  exerciceTexte: 'Léa a 8 billes, elle en gagne 5. Combien en a-t-elle ?',
}

describe('construirePromptCadrage', () => {
  it('contient le contexte référentiel et interdit la rédaction d\'énoncé', () => {
    const p = construirePromptCadrage(base)
    expect(p).toContain('Contexte référentiel')
    expect(p).toContain('Année déclarée')
    expect(p.toLowerCase()).toContain('ne rédige aucun énoncé')
  })
  it('ne contient pas les instructions de rédaction d\'énoncé', () => {
    expect(construirePromptCadrage(base)).not.toContain('le texte complet de l\'exercice')
  })
})

describe('construirePromptEnonces', () => {
  it('injecte le cadrage validé et demande les 3 énoncés', () => {
    const cadrage = {
      soutien: { annee_reference: 'P2', attendu_cite: 'A', levier: 'borne à 10' },
      cible: { annee_reference: 'P3', attendu_cite: 'B', levier: 'borne à 20' },
      depassement: { annee_reference: 'P4', attendu_cite: 'C', levier: 'deux étapes' },
    }
    const p = construirePromptEnonces({ ...base, cadrage })
    expect(p).toContain('borne à 20')
    expect(p).toContain('sans le renégocier')
  })
})

describe('construirePromptGrille', () => {
  it('injecte l\'énoncé et le cadrage cible', () => {
    const p = construirePromptGrille({
      ...base,
      cadrage: { cible: { annee_reference: 'P3', attendu_cite: 'B', levier: 'x' } },
      enonces: { cible: { enonce: 'Énoncé cible reformulé.' } },
    })
    expect(p).toContain('Énoncé cible reformulé.')
    expect(p).toContain('3 à 6 critères')
  })
})

describe('optionsCadrage', () => {
  it('renvoie une entrée par année (précédente/déclarée/suivante) avec le texte d\'attendu', () => {
    const opts = optionsCadrage(base)
    expect(opts.length).toBeGreaterThanOrEqual(2)
    for (const o of opts) {
      expect(o).toHaveProperty('annee')
      expect(o).toHaveProperty('texte')
    }
  })
})
```

- [ ] **Step 2: Lancer le test — il échoue**

Run: `npx vitest run src/lib/matieres/maths.test.js`
Expected : FAIL — `construirePromptCadrage` is not exported.

- [ ] **Step 3: Réécrire la fin de `maths.js`**

Garder inchangées les lignes 1–63 (imports, `ANNEES`, `CORPUS`, `anneeSuivante`, `anneePrecedente`, `champsDisponibles`, `trouverSousPoint`, `contexteReferentiel`, `formaterSousPoint`).
Remplacer `construirePromptSysteme` (lignes 65–129) par :

```js
// --- Bloc partagé, identique aux 3 phases → marqué pour le prompt caching côté API ---
export function blocContexteReferentiel({ anneeDeclaree, champLabel, codeSousPoint }) {
  const ctx = contexteReferentiel({ anneeDeclaree, champLabel, codeSousPoint })
  return `## Contexte référentiel (source unique de vérité — ne rien inventer au-delà)

Année déclarée par l'enseignant : ${anneeDeclaree}
Champ : ${champLabel}
Sous-point ciblé : ${codeSousPoint}

### Année précédente (${ctx.precedente?.annee ?? 'aucune — c\'est déjà P1'})
${ctx.precedente ? formaterSousPoint(ctx.precedente.sousPoint) : 'N/A (P1 est la première année du primaire — s\'ancrer sur la posture maternelle si besoin).'}

### Année déclarée (${anneeDeclaree})
${formaterSousPoint(ctx.declaree.sousPoint)}

### Année suivante (${ctx.suivante?.annee ?? 'aucune — c\'est déjà P6'})
${ctx.suivante ? formaterSousPoint(ctx.suivante.sousPoint) : 'N/A (P6 est la dernière année couverte par le corpus actuel).'}`
}

const ROLE = `Tu es un conseiller pédagogique FWB spécialisé en mathématiques et en différenciation par les attendus du tronc commun.`

export function construirePromptCadrage({ anneeDeclaree, champLabel, codeSousPoint, exerciceTexte }) {
  return `${ROLE}

${blocContexteReferentiel({ anneeDeclaree, champLabel, codeSousPoint })}

## Étape 1 — Vérification a priori
Compare le texte de l'exercice source à l'attendu de l'année déclarée. Si l'exercice correspond
mieux à l'attendu d'une année voisine, signale-le dans "verification". Ne masque jamais un écart réel.
Si le sous-point est absent d'une année adjacente (marqué "N/A"), ne fabrique pas d'attendu — dis-le.

## Étape 2 — Cadrage des 3 niveaux (PAS d'énoncé)
Pour chaque niveau (soutien / cible / dépassement), détermine :
- annee_reference : l'année du référentiel sur laquelle ce palier s'ancre
- attendu_cite : la citation EXACTE, mot pour mot, de l'attendu ou du contexte annuel utilisé
- levier : une phrase disant ce qui change réellement par rapport à la cible (borne numérique,
  structure de l'énoncé, exigence ajoutée, niveau de formalisation) — ce levier diffère à chaque
  sous-point, ne le suppose jamais a priori.
Si une compétence transversale existe déjà à un palier antérieur sous forme plus simple, ne la
réserve pas au dépassement.

NE RÉDIGE AUCUN ÉNONCÉ D'EXERCICE à cette étape. La sortie est contrainte par un schéma JSON
(verification + cadrage.soutien/cible/depassement).

## Exercice source à cadrer
${exerciceTexte}`
}

export function construirePromptEnonces({ anneeDeclaree, champLabel, codeSousPoint, exerciceTexte, cadrage }) {
  const c = (n) => `- ${n} : s'ancre sur ${cadrage[n].annee_reference}, attendu « ${cadrage[n].attendu_cite} », levier : ${cadrage[n].levier}`
  return `${ROLE}

${blocContexteReferentiel({ anneeDeclaree, champLabel, codeSousPoint })}

## Cadrage validé par l'enseignant (à respecter exactement, sans le renégocier)
${c('soutien')}
${c('cible')}
${c('depassement')}

## Tâche
Rédige les 3 énoncés d'exercice (un par niveau), fidèles au cadrage ci-dessus et à l'attendu cité.
Ne modifie pas l'ancrage ni le levier — tu les appliques. Chaque énoncé est un texte complet,
prêt à être relu par l'enseignant. La sortie est contrainte par un schéma JSON (enonces.soutien/
cible/depassement, chacun avec un champ "enonce").

## Exercice source de référence
${exerciceTexte}`
}

export function construirePromptGrille({ anneeDeclaree, champLabel, codeSousPoint, cadrage, enonces }) {
  return `${ROLE}

${blocContexteReferentiel({ anneeDeclaree, champLabel, codeSousPoint })}

## Niveau cible validé
Attendu cible : « ${cadrage.cible.attendu_cite} »
Énoncé cible : ${enonces.cible.enonce}

## Tâche — Étape 3 : grille d'évaluation (attendu cible uniquement)
Construis une grille de 3 à 6 critères observables, décomposés à partir du texte EXACT de
l'attendu cible. Chaque exigence mentionnée dans l'attendu devient un critère séparé, avec un
indicateur de réussite concret et cochable en classe — pas une reformulation abstraite.
"grille.attendu_cite" doit être identique à l'attendu cible ci-dessus. La sortie est contrainte
par un schéma JSON.`
}

// Options du menu déroulant "attendu_cite" côté client — attendus réels du référentiel
// pour ce sous-point aux 3 années. Aucun appel réseau.
export function optionsCadrage({ anneeDeclaree, champLabel, codeSousPoint }) {
  const ctx = contexteReferentiel({ anneeDeclaree, champLabel, codeSousPoint })
  const out = []
  for (const key of ['precedente', 'declaree', 'suivante']) {
    const entry = ctx[key]
    if (!entry || !entry.sousPoint) continue
    for (const it of entry.sousPoint.items ?? []) {
      for (const att of it.attendus ?? []) {
        out.push({ annee: entry.annee, texte: att })
      }
    }
  }
  return out
}
```

- [ ] **Step 4: Lancer le test — il passe**

Run: `npx vitest run src/lib/matieres/maths.test.js`
Expected : PASS (5 tests). Si `optionsCadrage` renvoie moins de 2 entrées pour `P3 / Nombres / 1.1`, ajuster le `champLabel`/`codeSousPoint` du test à un sous-point réellement présent dans `src/data/referentiel/maths/P3.json` (ouvrir le fichier pour choisir).

- [ ] **Step 5: Commit**

```bash
git add src/lib/matieres/maths.js src/lib/matieres/maths.test.js
git commit -m "feat: 3 constructeurs de prompt maths (cadrage/énoncés/grille) + optionsCadrage"
```

---

## Task 4: Trois constructeurs de prompt — `francais.js`

**Files:**
- Modify: `src/lib/matieres/francais.js`
- Create: `src/lib/matieres/francais.test.js`

- [ ] **Step 1: Écrire le test**

`src/lib/matieres/francais.test.js` :

```js
import { describe, it, expect } from 'vitest'
import {
  construirePromptCadrage, construirePromptEnonces, construirePromptGrille, optionsCadrage,
} from './francais.js'
import P3 from '../../data/referentiel/francais/P3.json' with { type: 'json' }

// Choisit une rubrique + item réels de P3 pour ne pas dépendre de valeurs devinées.
const champLabel = (P3.rubriques?.[0]?.rubrique ?? '') +
  (P3.rubriques?.[0]?.sous_rubrique ? ` — ${P3.rubriques[0].sous_rubrique}` : '')
const base = { anneeDeclaree: 'P3', champLabel, codeSousPoint: '0', exerciceTexte: 'Quel pronom remplace Nolan ? ....' }

describe('francais — cadrage', () => {
  it('contient le contexte et interdit la rédaction d\'énoncé', () => {
    const p = construirePromptCadrage(base)
    expect(p).toContain('Contexte référentiel')
    expect(p.toLowerCase()).toContain('ne rédige aucun énoncé')
  })
  it('mentionne les descripteurs transversaux comme levier possible', () => {
    expect(construirePromptCadrage(base).toLowerCase()).toContain('descripteur')
  })
})

describe('francais — énoncés', () => {
  it('injecte le cadrage validé', () => {
    const cadrage = {
      soutien: { annee_reference: 'P2', attendu_cite: 'A', levier: 'texte support plus court' },
      cible: { annee_reference: 'P3', attendu_cite: 'B', levier: 'fluence ≈90 mots/min' },
      depassement: { annee_reference: 'P4', attendu_cite: 'C', levier: 'fluence ≈110 mots/min' },
    }
    expect(construirePromptEnonces({ ...base, cadrage })).toContain('fluence ≈90 mots/min')
  })
})

describe('francais — grille', () => {
  it('injecte l\'énoncé cible', () => {
    const p = construirePromptGrille({
      ...base,
      cadrage: { cible: { annee_reference: 'P3', attendu_cite: 'B', levier: 'x' } },
      enonces: { cible: { enonce: 'Texte cible.' } },
    })
    expect(p).toContain('Texte cible.')
  })
})

describe('francais — optionsCadrage', () => {
  it('renvoie des entrées {annee, texte}', () => {
    const opts = optionsCadrage(base)
    for (const o of opts) { expect(o).toHaveProperty('annee'); expect(o).toHaveProperty('texte') }
  })
})
```

- [ ] **Step 2: Lancer le test — il échoue**

Run: `npx vitest run src/lib/matieres/francais.test.js`
Expected : FAIL — exports absents.

- [ ] **Step 3: Réécrire la fin de `francais.js`**

Garder inchangées les lignes 1–106 (imports, helpers, `contexteReferentiel`, `formaterItem`).
Ajouter `export` devant `function contexteReferentiel` (ligne 65) pour permettre `optionsCadrage`.
Remplacer `construirePromptSysteme` (lignes 113–176) par :

```js
export function blocContexteReferentiel({ anneeDeclaree, champLabel, codeSousPoint }) {
  const ctx = contexteReferentiel({ anneeDeclaree, champLabel, codeSousPoint })
  return `## Contexte référentiel (source unique de vérité — ne rien inventer au-delà)

Année déclarée par l'enseignant : ${anneeDeclaree}
Rubrique : ${champLabel}

### Année précédente
${ctx.precedente ? formaterItem(ctx.precedente) : 'N/A (P1 est la première année du primaire).'}

### Année déclarée
${formaterItem(ctx.declaree)}

### Année suivante
${ctx.suivante ? formaterItem(ctx.suivante) : 'N/A (P6 est la dernière année couverte par le corpus actuel).'}`
}

const ROLE = `Tu es un conseiller pédagogique FWB spécialisé en français (lecture, écriture, grammaire, vocabulaire) et en différenciation par les attendus du tronc commun.`

const NOTE_PLAFOND = `Attention (constat sur ce référentiel) : le texte d'un savoir-faire peut être QUASI IDENTIQUE d'une année à l'autre — le référentiel "plafonne" sur cet axe. Dans ce cas, n'invente pas de levier artificiel : utilise les DESCRIPTEURS TRANSVERSAUX (fluence en mots/minute, % de formes correctes, palier lecteur/scripteur) comme levier de calibrage réel.`

export function construirePromptCadrage({ anneeDeclaree, champLabel, codeSousPoint, exerciceTexte }) {
  return `${ROLE}

${blocContexteReferentiel({ anneeDeclaree, champLabel, codeSousPoint })}

## Étape 1 — Vérification a priori
Compare le texte de l'exercice source à l'attendu de l'année déclarée. Signale tout écart réel dans
"verification". ${NOTE_PLAFOND}
Si un item est marqué absent pour une année adjacente, ne fabrique pas d'attendu — dis-le.

## Étape 2 — Cadrage des 3 niveaux (PAS d'énoncé)
Pour chaque niveau, détermine annee_reference, attendu_cite (citation EXACTE de l'attendu OU du
descripteur transversal utilisé) et levier (une phrase : ce qui change réellement à ce palier).
Si le sous-point plafonne, l'assumer et l'expliquer dans "levier" via un descripteur transversal.

NE RÉDIGE AUCUN ÉNONCÉ D'EXERCICE à cette étape. Sortie contrainte par un schéma JSON.

## Exercice source à cadrer
${exerciceTexte}`
}

export function construirePromptEnonces({ anneeDeclaree, champLabel, codeSousPoint, exerciceTexte, cadrage }) {
  const c = (n) => `- ${n} : s'ancre sur ${cadrage[n].annee_reference}, attendu « ${cadrage[n].attendu_cite} », levier : ${cadrage[n].levier}`
  return `${ROLE}

${blocContexteReferentiel({ anneeDeclaree, champLabel, codeSousPoint })}

## Cadrage validé par l'enseignant (à respecter exactement, sans le renégocier)
${c('soutien')}
${c('cible')}
${c('depassement')}

## Tâche
Rédige les 3 énoncés d'exercice fidèles au cadrage et à l'attendu cité. Tu appliques le levier,
tu ne le renégocies pas. Sortie contrainte par un schéma JSON (enonces.soutien/cible/depassement).

## Exercice source de référence
${exerciceTexte}`
}

export function construirePromptGrille({ anneeDeclaree, champLabel, codeSousPoint, cadrage, enonces }) {
  return `${ROLE}

${blocContexteReferentiel({ anneeDeclaree, champLabel, codeSousPoint })}

## Niveau cible validé
Attendu cible : « ${cadrage.cible.attendu_cite} »
Énoncé cible : ${enonces.cible.enonce}

## Tâche — Étape 3 : grille d'évaluation
Grille de 3 à 6 critères observables, décomposés à partir du texte EXACT de l'attendu (ou
descripteur) cible. Si l'attendu combine plusieurs exigences (réception ET production, plusieurs
substituts...), sépare-les en critères distincts, chacun avec un indicateur cochable en classe.
"grille.attendu_cite" identique à l'attendu cible. Sortie contrainte par un schéma JSON.`
}

export function optionsCadrage({ anneeDeclaree, champLabel, codeSousPoint }) {
  const ctx = contexteReferentiel({ anneeDeclaree, champLabel, codeSousPoint })
  const out = []
  for (const key of ['precedente', 'declaree', 'suivante']) {
    const entry = ctx[key]
    if (!entry || !entry.existe || !entry.item) continue
    for (const att of entry.item.attendus ?? []) {
      out.push({ annee: entry.annee, texte: att })
    }
  }
  return out
}
```

- [ ] **Step 4: Lancer le test — il passe**

Run: `npx vitest run src/lib/matieres/francais.test.js`
Expected : PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/matieres/francais.js src/lib/matieres/francais.test.js
git commit -m "feat: 3 constructeurs de prompt français + optionsCadrage"
```

---

## Task 5: Helper de reconstruction de l'objet final

**Files:**
- Create: `src/lib/reconstruction.js`
- Create: `src/lib/reconstruction.test.js`

- [ ] **Step 1: Écrire le test**

`src/lib/reconstruction.test.js` :

```js
import { describe, it, expect } from 'vitest'
import { reconstruireResultat } from './reconstruction.js'

const cadrage = {
  soutien: { annee_reference: 'P2', attendu_cite: 'att-s', levier: 'lev-s' },
  cible: { annee_reference: 'P3', attendu_cite: 'att-c', levier: 'lev-c' },
  depassement: { annee_reference: 'P4', attendu_cite: 'att-d', levier: 'lev-d' },
}
const enonces = {
  soutien: { enonce: 'e-s' }, cible: { enonce: 'e-c' }, depassement: { enonce: 'e-d' },
}
const verification = { ecart_detecte: false, details: '' }
const grille = { attendu_cite: 'att-c', criteres: [{ critere: 'x', indicateur_reussite: 'y' }] }

describe('reconstruireResultat', () => {
  it('produit la forme { verification, niveaux, grille } avec niveaux complets', () => {
    const r = reconstruireResultat({ verification, cadrage, enonces, grille })
    expect(r.verification).toEqual(verification)
    expect(r.grille).toEqual(grille)
    expect(r.niveaux.cible).toEqual({
      annee_reference: 'P3', attendu_cite: 'att-c', levier: 'lev-c', enonce: 'e-c',
    })
    expect(r.niveaux.soutien.enonce).toBe('e-s')
    expect(r.niveaux.depassement.annee_reference).toBe('P4')
  })
})
```

- [ ] **Step 2: Lancer — échoue**

Run: `npx vitest run src/lib/reconstruction.test.js`
Expected : FAIL — module introuvable.

- [ ] **Step 3: Écrire `src/lib/reconstruction.js`**

```js
// Recompose l'objet `resultat` à la forme attendue par l'affichage et par exportDocx.js,
// à partir des sorties des 3 phases. C'est le point où le contrat de sortie historique
// est rétabli — ne pas changer la forme sans mettre à jour exportDocx.js et Adapter.jsx.

const NIVEAUX = ['soutien', 'cible', 'depassement']

export function reconstruireResultat({ verification, cadrage, enonces, grille }) {
  const niveaux = {}
  for (const n of NIVEAUX) {
    niveaux[n] = {
      annee_reference: cadrage[n].annee_reference,
      attendu_cite: cadrage[n].attendu_cite,
      levier: cadrage[n].levier,
      enonce: enonces[n].enonce,
    }
  }
  return { verification, niveaux, grille }
}
```

- [ ] **Step 4: Lancer — passe**

Run: `npx vitest run src/lib/reconstruction.test.js`
Expected : PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/reconstruction.js src/lib/reconstruction.test.js
git commit -m "feat: reconstruireResultat (recompose l'objet final à partir des 3 phases)"
```

---

## Task 6: Module de rate limiting

**Files:**
- Create: `api/_rateLimit.js`
- Create: `api/_rateLimit.test.js`

- [ ] **Step 1: Écrire le test**

`api/_rateLimit.test.js` :

```js
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { verifierQuota, _reset } from './_rateLimit.js'

beforeEach(() => { _reset() ; vi.useRealTimers() })

describe('verifierQuota', () => {
  it('autorise sous la limite et refuse au-delà', () => {
    for (let i = 0; i < 5; i++) expect(verifierQuota('1.2.3.4', 5, 1000).ok).toBe(true)
    expect(verifierQuota('1.2.3.4', 5, 1000).ok).toBe(false)
  })

  it('isole les IP', () => {
    for (let i = 0; i < 5; i++) verifierQuota('1.1.1.1', 5, 1000)
    expect(verifierQuota('2.2.2.2', 5, 1000).ok).toBe(true)
  })

  it('rouvre le quota après expiration de la fenêtre', () => {
    vi.useFakeTimers()
    for (let i = 0; i < 5; i++) verifierQuota('9.9.9.9', 5, 1000)
    expect(verifierQuota('9.9.9.9', 5, 1000).ok).toBe(false)
    vi.advanceTimersByTime(1001)
    expect(verifierQuota('9.9.9.9', 5, 1000).ok).toBe(true)
  })
})
```

- [ ] **Step 2: Lancer — échoue**

Run: `npx vitest run api/_rateLimit.test.js`
Expected : FAIL — module introuvable.

- [ ] **Step 3: Écrire `api/_rateLimit.js`**

```js
// Rate limiting in-memory par IP, fenêtre glissante.
// LIMITE CONNUE : l'état vit dans le process de l'instance serverless — il est remis à
// zéro à chaque cold start et n'est pas partagé entre instances concurrentes. Suffisant
// pour la bêta fermée (protège la clé Anthropic d'un usage en boucle). À remplacer par un
// store partagé (Vercel KV / Upstash) si l'app s'ouvre au-delà du cercle bêta.

const hits = new Map() // ip -> number[] (timestamps ms)

export function verifierQuota(ip, max = 30, fenetreMs = 10 * 60 * 1000) {
  const now = Date.now()
  const recents = (hits.get(ip) ?? []).filter(t => now - t < fenetreMs)
  if (recents.length >= max) {
    const retryMs = fenetreMs - (now - recents[0])
    return { ok: false, retryAfterS: Math.ceil(retryMs / 1000) }
  }
  recents.push(now)
  hits.set(ip, recents)
  return { ok: true }
}

// Réservé aux tests.
export function _reset() { hits.clear() }
```

- [ ] **Step 4: Lancer — passe**

Run: `npx vitest run api/_rateLimit.test.js`
Expected : PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add api/_rateLimit.js api/_rateLimit.test.js
git commit -m "feat: rate limiting in-memory par IP (fenêtre glissante)"
```

---

## Task 7: Routage par phase dans `api/generate.js`

**Files:**
- Modify: `api/generate.js`
- Create: `api/generate.test.js`

- [ ] **Step 1: Écrire le test (fetch Anthropic mocké)**

`api/generate.test.js` :

```js
import { describe, it, expect, beforeEach, vi } from 'vitest'
import handler from './generate.js'
import { _reset } from './_rateLimit.js'

const ENV = { PROGRESSACTIF_ACCESS_CODE: 'SECRET', ANTHROPIC_API_KEY: 'k' }

function mockRes() {
  return {
    statusCode: 0, body: null,
    status(c) { this.statusCode = c; return this },
    json(b) { this.body = b; return this },
    end() { return this },
  }
}

function mockAnthropic(payloadText) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ content: [{ text: JSON.stringify(payloadText) }] }),
  })
}

beforeEach(() => {
  _reset()
  Object.assign(process.env, ENV)
  vi.restoreAllMocks()
})

const bodyBase = {
  matiere: 'maths', anneeDeclaree: 'P3', champLabel: 'Nombres',
  codeSousPoint: '1.1', exerciceTexte: 'Léa a 8 billes...', codeAcces: 'SECRET',
}

it('refuse un code d\'accès invalide', async () => {
  const res = mockRes()
  await handler({ method: 'POST', headers: {}, body: { ...bodyBase, codeAcces: 'X', phase: 'cadrage' } }, res)
  expect(res.statusCode).toBe(401)
})

it('phase cadrage : renvoie verification + cadrage, jamais d\'énoncé', async () => {
  global.fetch = mockAnthropic({
    verification: { ecart_detecte: false, details: '' },
    cadrage: {
      soutien: { annee_reference: 'P2', attendu_cite: 'a', levier: 'l' },
      cible: { annee_reference: 'P3', attendu_cite: 'b', levier: 'l' },
      depassement: { annee_reference: 'P4', attendu_cite: 'c', levier: 'l' },
    },
  })
  const res = mockRes()
  await handler({ method: 'POST', headers: {}, body: { ...bodyBase, phase: 'cadrage' } }, res)
  expect(res.statusCode).toBe(200)
  expect(res.body.resultat.cadrage.cible).not.toHaveProperty('enonce')
  const sentBody = JSON.parse(global.fetch.mock.calls[0][1].body)
  expect(sentBody.max_tokens).toBe(2000)
  expect(sentBody.system[0].cache_control).toEqual({ type: 'ephemeral' })
})

it('phase enonces : passe le cadrage au prompt', async () => {
  global.fetch = mockAnthropic({ enonces: { soutien: { enonce: 'x' }, cible: { enonce: 'y' }, depassement: { enonce: 'z' } } })
  const res = mockRes()
  const cadrage = {
    soutien: { annee_reference: 'P2', attendu_cite: 'a', levier: 'borne 10' },
    cible: { annee_reference: 'P3', attendu_cite: 'b', levier: 'borne 20' },
    depassement: { annee_reference: 'P4', attendu_cite: 'c', levier: 'deux étapes' },
  }
  await handler({ method: 'POST', headers: {}, body: { ...bodyBase, phase: 'enonces', cadrage } }, res)
  expect(res.statusCode).toBe(200)
  const sentBody = JSON.parse(global.fetch.mock.calls[0][1].body)
  expect(sentBody.system[1].text).toContain('borne à 20')
})

it('phase inconnue → 400', async () => {
  const res = mockRes()
  await handler({ method: 'POST', headers: {}, body: { ...bodyBase, phase: 'bleh' } }, res)
  expect(res.statusCode).toBe(400)
})

it('rate limiting : 401 code ok mais 429 après 30 requêtes', async () => {
  global.fetch = mockAnthropic({
    verification: { ecart_detecte: false, details: '' },
    cadrage: { soutien: {}, cible: {}, depassement: {} },
  })
  const req = () => handler(
    { method: 'POST', headers: { 'x-forwarded-for': '5.5.5.5' }, body: { ...bodyBase, phase: 'cadrage' } },
    mockRes(),
  )
  for (let i = 0; i < 30; i++) await req()
  const res = mockRes()
  await handler({ method: 'POST', headers: { 'x-forwarded-for': '5.5.5.5' }, body: { ...bodyBase, phase: 'cadrage' } }, res)
  expect(res.statusCode).toBe(429)
})
```

- [ ] **Step 2: Lancer — échoue**

Run: `npx vitest run api/generate.test.js`
Expected : FAIL — le handler actuel ne connaît pas `phase`, renvoie 400 « Champs requis manquants ».

- [ ] **Step 3: Réécrire `api/generate.js`**

```js
// Vercel Serverless Function — POST /api/generate
// Body commun : { matiere, anneeDeclaree, champLabel, codeSousPoint, codeAcces, phase }
//   phase "cadrage"  : + exerciceTexte
//   phase "enonces"  : + exerciceTexte, cadrage
//   phase "grille"   : + cadrage, enonces
// ANTHROPIC_API_KEY reste côté serveur uniquement.

import * as Maths from '../src/lib/matieres/maths.js'
import * as Francais from '../src/lib/matieres/francais.js'
import { SCHEMA_CADRAGE, SCHEMA_ENONCES, SCHEMA_GRILLE } from '../src/lib/matieres/_generationSchema.js'
import { verifierQuota } from './_rateLimit.js'

const MODULES = { maths: Maths, francais: Francais }
const MODEL = 'claude-sonnet-4-6'

const PHASES = {
  cadrage: { schema: SCHEMA_CADRAGE, maxTokens: 2000, build: (m, b) => m.construirePromptCadrage(b) },
  enonces: { schema: SCHEMA_ENONCES, maxTokens: 6000, build: (m, b) => m.construirePromptEnonces(b) },
  grille:  { schema: SCHEMA_GRILLE,  maxTokens: 2000, build: (m, b) => m.construirePromptGrille(b) },
}

function ipDe(req) {
  const xff = req.headers['x-forwarded-for']
  if (xff) return String(xff).split(',')[0].trim()
  return req.socket?.remoteAddress ?? 'inconnue'
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' })

  const { matiere, anneeDeclaree, champLabel, codeSousPoint, exerciceTexte, cadrage, enonces, codeAcces, phase } = req.body ?? {}

  if (!phase || !PHASES[phase]) return res.status(400).json({ error: `Phase "${phase}" inconnue (attendu : cadrage, enonces ou grille).` })
  if (!matiere || !anneeDeclaree || !champLabel || !codeSousPoint) {
    return res.status(400).json({ error: 'Champs requis manquants (matiere, anneeDeclaree, champLabel, codeSousPoint).' })
  }
  if ((phase === 'cadrage' || phase === 'enonces') && !exerciceTexte) {
    return res.status(400).json({ error: 'exerciceTexte requis pour cette phase.' })
  }
  if ((phase === 'enonces' || phase === 'grille') && !cadrage) {
    return res.status(400).json({ error: 'cadrage requis pour cette phase.' })
  }
  if (phase === 'grille' && !enonces) {
    return res.status(400).json({ error: 'enonces requis pour la phase grille.' })
  }

  const codeAttendu = process.env.PROGRESSACTIF_ACCESS_CODE
  if (!codeAttendu) return res.status(500).json({ error: 'Code d\'accès non configuré côté serveur (PROGRESSACTIF_ACCESS_CODE).' })
  if (codeAcces !== codeAttendu) return res.status(401).json({ error: 'Code d\'accès invalide.' })

  const quota = verifierQuota(ipDe(req))
  if (!quota.ok) {
    res.setHeader?.('Retry-After', String(quota.retryAfterS))
    return res.status(429).json({ error: `Trop de générations récentes. Réessayez dans ~${Math.ceil(quota.retryAfterS / 60)} min.` })
  }

  const module = MODULES[matiere]
  if (!module) return res.status(400).json({ error: `Matière "${matiere}" non encore disponible.` })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'Clé API manquante (ANTHROPIC_API_KEY)' })

  const conf = PHASES[phase]
  const contexte = module.blocContexteReferentiel({ anneeDeclaree, champLabel, codeSousPoint })
  const promptPhase = conf.build(module, { anneeDeclaree, champLabel, codeSousPoint, exerciceTexte, cadrage, enonces })

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: conf.maxTokens,
        // system[0] = bloc contexte identique aux 3 phases → mis en cache.
        // system[1] = instructions propres à la phase (dont le cadrage injecté).
        system: [
          { type: 'text', text: contexte, cache_control: { type: 'ephemeral' } },
          { type: 'text', text: promptPhase },
        ],
        output_config: { format: { type: 'json_schema', schema: conf.schema } },
        messages: [{ role: 'user', content: `Traite la phase "${phase}".` }],
      }),
    })

    if (!resp.ok) {
      const errText = await resp.text()
      return res.status(502).json({ error: `Erreur API Anthropic : ${errText}` })
    }

    const data = await resp.json()
    const texte = data.content?.[0]?.text ?? '{}'
    const resultat = JSON.parse(texte)
    return res.status(200).json({ resultat })
  } catch (err) {
    return res.status(500).json({ error: `Erreur serveur : ${err.message}` })
  }
}
```

- [ ] **Step 4: Lancer — passe**

Run: `npx vitest run api/generate.test.js`
Expected : PASS (5 tests). Note : le test « rate limiting » du Step 1 déclenche 30 appels `mockAnthropic` — vérifier que `_reset()` est bien appelé en `beforeEach`.

- [ ] **Step 5: Toute la suite passe**

Run: `npm test`
Expected : PASS, tous fichiers.

- [ ] **Step 6: Commit**

```bash
git add api/generate.js api/generate.test.js
git commit -m "feat: /api/generate route par phase (cadrage/énoncés/grille) + cache + rate limit"
```

---

## Task 8: `Adapter.jsx` — machine à états 3 phases

**Files:**
- Modify: `src/pages/Adapter.jsx`
- Create: `src/pages/Adapter.jsx.test.js`

- [ ] **Step 1: Écrire le test (rendu + transition cadrage)**

`src/pages/Adapter.jsx.test.js` :

```js
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import Adapter from './Adapter.jsx'

beforeEach(() => {
  sessionStorage.setItem('progressactif_code_acces', 'SECRET')
  vi.restoreAllMocks()
})

function mockFetchSequence(...payloads) {
  const fn = vi.fn()
  payloads.forEach(p => fn.mockResolvedValueOnce({ ok: true, json: async () => ({ resultat: p }) }))
  global.fetch = fn
  return fn
}

it('affiche le bouton "Générer le cadrage" à l\'état initial', () => {
  render(<Adapter />)
  expect(screen.getByRole('button', { name: /générer le cadrage/i })).toBeInTheDocument()
})

it('après le cadrage, affiche les cartes de cadrage et pas encore les énoncés', async () => {
  mockFetchSequence({
    verification: { ecart_detecte: false, details: '' },
    cadrage: {
      soutien: { annee_reference: 'P1', attendu_cite: 'a', levier: 'l1' },
      cible: { annee_reference: 'P2', attendu_cite: 'b', levier: 'l2' },
      depassement: { annee_reference: 'P3', attendu_cite: 'c', levier: 'l3' },
    },
  })
  render(<Adapter />)
  // sélectionner champ + sous-point + exercice (valeurs réelles à ajuster selon le référentiel P2 maths)
  fireEvent.change(screen.getByLabelText(/Champ du référentiel/i), { target: { value: screen.getByLabelText(/Champ du référentiel/i).options[1].value } })
  fireEvent.change(screen.getByLabelText(/Sous-point précis/i), { target: { value: screen.getByLabelText(/Sous-point précis/i).options[1].value } })
  fireEvent.change(screen.getByLabelText(/Exercice source/i), { target: { value: 'Un énoncé de test' } })
  fireEvent.click(screen.getByRole('button', { name: /générer le cadrage/i }))

  await waitFor(() => expect(screen.getByText(/Valider le cadrage/i)).toBeInTheDocument())
  expect(screen.queryByText(/Valider les énoncés/i)).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Lancer — échoue**

Run: `npx vitest run src/pages/Adapter.jsx.test.js`
Expected : FAIL — pas de bouton « Générer le cadrage » (le bouton actuel dit « Générer les 3 niveaux »).

- [ ] **Step 3: Réécrire `src/pages/Adapter.jsx`**

```jsx
import { useState, useMemo } from 'react'
import * as Maths from '../lib/matieres/maths'
import * as Francais from '../lib/matieres/francais'
import { exportNiveauxDocx } from '../lib/exportDocx'
import { reconstruireResultat } from '../lib/reconstruction'
import { STORAGE_KEY as CLE_CODE_ACCES } from '../components/AccessGate'

const MATIERES = {
  maths: { label: 'Maths', module: Maths, labelChamp: 'Champ du référentiel', aideChamp: 'Le domaine mathématique travaillé par l\'exercice (ex. Géométrie, Nombres). Détermine quels attendus calibrent les 3 niveaux.', labelSousPoint: 'Sous-point précis', aideSousPoint: 'Le sous-point exact du référentiel que l\'exercice mobilise.' },
  francais: { label: 'Français', module: Francais, labelChamp: 'Rubrique du référentiel', aideChamp: 'La rubrique de français travaillée (ex. lecture, grammaire, vocabulaire). Détermine attendus et descripteurs (fluence, % de formes correctes).', labelSousPoint: 'Item précis', aideSousPoint: 'Le savoir ou savoir-faire exact que l\'exercice mobilise dans cette rubrique.' },
}

const LABELS = { soutien: 'Soutien', cible: 'Cible', depassement: 'Dépassement' }
const CLES = ['soutien', 'cible', 'depassement']

const ETAPES = [
  { id: 'cadrage', num: 1, titre: 'Cadrage' },
  { id: 'enonces', num: 2, titre: 'Énoncés' },
  { id: 'grille', num: 3, titre: 'Grille' },
]

function BarreProgression({ phase }) {
  const rang = { idle: 0, cadrageReview: 1, enoncesReview: 2, resultat: 3 }[phase] ?? 0
  return (
    <div className="no-print" style={{ display: 'flex', gap: 8, margin: '1rem 0' }}>
      {ETAPES.map(e => (
        <span key={e.id} style={{
          fontSize: 12, padding: '4px 10px', borderRadius: 999,
          background: e.num <= rang ? 'var(--teal)' : 'var(--border)',
          color: e.num <= rang ? '#fff' : 'var(--text3)',
        }}>
          {e.num}. {e.titre}
        </span>
      ))}
    </div>
  )
}

function CadrageCard({ cle, niveau, options, onChange }) {
  const optionIA = options.some(o => o.texte === niveau.attendu_cite)
    ? null
    : niveau.attendu_cite
  return (
    <div className="plai-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <strong style={{ color: 'var(--teal)', fontSize: 15 }}>{LABELS[cle]}</strong>
        <span style={{ fontSize: 12, color: 'var(--text3)' }}>{niveau.annee_reference}</span>
      </div>

      <label className="plai-label" style={{ fontSize: 13 }}>Attendu de référence</label>
      <select
        className="plai-input"
        value={niveau.attendu_cite}
        onChange={e => onChange(cle, 'attendu_cite', e.target.value)}
        style={{ fontSize: 13 }}
      >
        {optionIA && <option value={optionIA}>{optionIA} — proposé par l'IA, non trouvé tel quel dans le référentiel</option>}
        {options.map((o, i) => (
          <option key={i} value={o.texte}>[{o.annee}] {o.texte}</option>
        ))}
      </select>
      <p style={{ fontSize: 12, color: 'var(--text3)', margin: '4px 0 10px' }}>
        L'attendu du référentiel FWB sur lequel ce palier s'ancre. L'IA en propose un ; changez-le
        si un autre décrit mieux ce que l'élève doit produire à ce niveau.
      </p>

      <label className="plai-label" style={{ fontSize: 13 }}>Levier de différenciation</label>
      <textarea
        className="plai-input"
        rows={3}
        value={niveau.levier}
        onChange={e => onChange(cle, 'levier', e.target.value)}
        style={{ fontSize: 13 }}
      />
      <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
        Ce qui change concrètement par rapport à la cible (borne numérique, structure, exigence
        ajoutée, descripteur transversal). C'est cette phrase qui pilotera la rédaction de l'énoncé —
        précisez-la avec le vocabulaire et les contraintes de vos élèves.
      </p>
    </div>
  )
}

function NiveauCard({ cle, niveau, onChangeEnonce }) {
  return (
    <div className="plai-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <strong style={{ color: 'var(--teal)', fontSize: 15 }}>{LABELS[cle]}</strong>
        <span style={{ fontSize: 12, color: 'var(--text3)' }}>{niveau.annee_reference}</span>
      </div>
      <p style={{ fontSize: 12, color: 'var(--text2)', fontStyle: 'italic', marginBottom: 4 }}>
        « {niveau.attendu_cite} »
      </p>
      <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 10 }}>Levier validé : {niveau.levier}</p>
      <textarea
        className="plai-input"
        rows={10}
        value={niveau.enonce}
        onChange={e => onChangeEnonce(cle, e.target.value)}
        style={{ fontSize: 14 }}
      />
    </div>
  )
}

function GrilleEvaluation({ grille, onChangeCritere }) {
  return (
    <div className="plai-card" style={{ marginTop: '1.5rem' }}>
      <strong style={{ color: 'var(--teal)', fontSize: 15 }}>Grille d'évaluation — attendu cible</strong>
      <p style={{ fontSize: 13, color: 'var(--text2)', fontStyle: 'italic', margin: '4px 0 12px' }}>
        « {grille.attendu_cite} »
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {grille.criteres.map((c, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <textarea className="plai-input" rows={2} value={c.critere} onChange={e => onChangeCritere(i, 'critere', e.target.value)} style={{ fontSize: 13 }} aria-label={`Critère ${i + 1}`} />
            <textarea className="plai-input" rows={2} value={c.indicateur_reussite} onChange={e => onChangeCritere(i, 'indicateur_reussite', e.target.value)} style={{ fontSize: 13 }} aria-label={`Indicateur de réussite ${i + 1}`} />
          </div>
        ))}
      </div>
      <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 10 }}>
        Gauche : le critère observable. Droite : ce qui permet de dire qu'il est atteint. Ajustez le
        vocabulaire à vos élèves avant d'imprimer.
      </p>
    </div>
  )
}

export default function Adapter() {
  const [matiere, setMatiere] = useState('maths')
  const [annee, setAnnee] = useState('P2')
  const [champLabel, setChampLabel] = useState('')
  const [codeSousPoint, setCodeSousPoint] = useState('')
  const [exerciceTexte, setExerciceTexte] = useState('')

  const [phase, setPhase] = useState('idle') // idle | cadrageReview | enoncesReview | resultat
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState('')

  const [verification, setVerification] = useState(null)
  const [cadrage, setCadrage] = useState(null)   // { soutien/cible/depassement: { annee_reference, attendu_cite, levier } }
  const [enonces, setEnonces] = useState(null)   // { soutien/cible/depassement: { enonce } }
  const [grille, setGrille] = useState(null)

  const conf = MATIERES[matiere]
  const champs = useMemo(() => conf.module.champsDisponibles(annee), [conf, annee])
  const sousPoints = useMemo(
    () => champs.find(c => c.champ === champLabel)?.sous_points ?? [],
    [champs, champLabel]
  )
  const optionsParNiveau = useMemo(() => {
    if (!champLabel || !codeSousPoint) return []
    return conf.module.optionsCadrage({ anneeDeclaree: annee, champLabel, codeSousPoint })
  }, [conf, annee, champLabel, codeSousPoint])

  function resetAval(depuis) {
    if (depuis === 'idle') { setVerification(null); setCadrage(null); setEnonces(null); setGrille(null); setPhase('idle') }
    if (depuis === 'cadrage') { setEnonces(null); setGrille(null) }
    if (depuis === 'enonces') { setGrille(null) }
  }

  function changerMatiere(m) { setMatiere(m); setChampLabel(''); setCodeSousPoint(''); resetAval('idle') }
  function changerAnnee(a) { setAnnee(a); setChampLabel(''); setCodeSousPoint(''); resetAval('idle') }
  function changerChamp(v) { setChampLabel(v); setCodeSousPoint(''); resetAval('idle') }
  function changerSousPoint(v) { setCodeSousPoint(v); resetAval('idle') }
  function changerExercice(v) { setExerciceTexte(v); if (phase !== 'idle') resetAval('idle') }

  async function appelPhase(nomPhase, corps) {
    const codeAcces = sessionStorage.getItem(CLE_CODE_ACCES) ?? ''
    const resp = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matiere, anneeDeclaree: annee, champLabel, codeSousPoint, codeAcces, phase: nomPhase, ...corps }),
    })
    const data = await resp.json()
    if (resp.status === 401) {
      sessionStorage.removeItem(CLE_CODE_ACCES)
      throw new Error('Code d\'accès invalide ou expiré. Rechargez la page pour le ressaisir.')
    }
    if (resp.status === 429) throw new Error(data.error)
    if (!resp.ok) throw new Error(data.error ?? 'Erreur inconnue')
    return data.resultat
  }

  async function genererCadrage() {
    setErreur('')
    if (!champLabel || !codeSousPoint || !exerciceTexte.trim()) {
      setErreur('Sélectionnez un champ, un sous-point, et collez le texte de l\'exercice avant de générer.')
      return
    }
    setEnCours(true)
    try {
      const r = await appelPhase('cadrage', { exerciceTexte })
      setVerification(r.verification)
      setCadrage(r.cadrage)
      setEnonces(null); setGrille(null)
      setPhase('cadrageReview')
    } catch (e) { setErreur(e.message) } finally { setEnCours(false) }
  }

  async function genererEnonces() {
    setErreur(''); setEnCours(true)
    try {
      const r = await appelPhase('enonces', { exerciceTexte, cadrage })
      setEnonces(r.enonces)
      setGrille(null)
      setPhase('enoncesReview')
    } catch (e) { setErreur(e.message) } finally { setEnCours(false) }
  }

  async function genererGrille() {
    setErreur(''); setEnCours(true)
    try {
      const r = await appelPhase('grille', { cadrage, enonces })
      setGrille(r.grille)
      setPhase('resultat')
    } catch (e) { setErreur(e.message) } finally { setEnCours(false) }
  }

  function modifierCadrage(cle, champ, valeur) {
    setCadrage(c => ({ ...c, [cle]: { ...c[cle], [champ]: valeur } }))
    resetAval('cadrage')
    if (phase !== 'cadrageReview') setPhase('cadrageReview')
  }
  function modifierEnonce(cle, texte) {
    setEnonces(e => ({ ...e, [cle]: { ...e[cle], enonce: texte } }))
    resetAval('enonces')
    if (phase !== 'enoncesReview') setPhase('enoncesReview')
  }
  function modifierCritere(index, champ, texte) {
    setGrille(g => ({ ...g, criteres: g.criteres.map((c, i) => i === index ? { ...c, [champ]: texte } : c) }))
  }

  const resultat = useMemo(() => {
    if (phase !== 'resultat' || !verification || !cadrage || !enonces || !grille) return null
    return reconstruireResultat({ verification, cadrage, enonces, grille })
  }, [phase, verification, cadrage, enonces, grille])

  function telechargerWord() {
    exportNiveauxDocx({ anneeDeclaree: annee, champLabel, codeSousPoint, verification: resultat.verification, niveaux: resultat.niveaux, grille: resultat.grille })
  }

  return (
    <div className="plai-container plai-section">
      <div className="no-print">
        <span className="plai-badge">Différenciation par attendus</span>
        <h2>Adapter un exercice</h2>

        {erreur && <div className="plai-error">{erreur}</div>}

        <div className="plai-field">
          <label className="plai-label" htmlFor="matiere">Matière</label>
          <select id="matiere" className="plai-input" value={matiere} onChange={e => changerMatiere(e.target.value)}>
            {Object.entries(MATIERES).map(([key, m]) => <option key={key} value={key}>{m.label}</option>)}
          </select>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>
            Chaque matière a sa propre logique de calibrage.
          </p>
        </div>

        <div className="plai-field">
          <label className="plai-label" htmlFor="annee">Année de la classe</label>
          <select id="annee" className="plai-input" value={annee} onChange={e => changerAnnee(e.target.value)}>
            {conf.module.ANNEES.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>
            L'année pour laquelle l'exercice a été conçu — pas l'année de chaque élève.
          </p>
        </div>

        <div className="plai-field">
          <label className="plai-label" htmlFor="champ">{conf.labelChamp}</label>
          <select id="champ" className="plai-input" value={champLabel} onChange={e => changerChamp(e.target.value)}>
            <option value="">— choisir —</option>
            {champs.map(c => <option key={c.champ} value={c.champ}>{c.champ}{c.titre ? ` — ${c.titre}` : ''}</option>)}
          </select>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>{conf.aideChamp}</p>
        </div>

        {champLabel && (
          <div className="plai-field">
            <label className="plai-label" htmlFor="sousPoint">{conf.labelSousPoint}</label>
            <select id="sousPoint" className="plai-input" value={codeSousPoint} onChange={e => changerSousPoint(e.target.value)}>
              <option value="">— choisir —</option>
              {sousPoints.map(sp => <option key={sp.code} value={sp.code}>{sp.titre}</option>)}
            </select>
            <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>{conf.aideSousPoint}</p>
          </div>
        )}

        <div className="plai-field">
          <label className="plai-label" htmlFor="exercice">Exercice source</label>
          <textarea
            id="exercice"
            className="plai-input"
            rows={6}
            placeholder={matiere === 'maths'
              ? 'Ex. : "Léa a 8 billes. Elle en gagne 5 pendant la récré. Combien de billes a-t-elle maintenant ?"'
              : 'Ex. : "Quel pronom remplace Nolan ? ......."'}
            value={exerciceTexte}
            onChange={e => changerExercice(e.target.value)}
          />
          <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>
            Collez l'énoncé tel qu'il figure dans votre farde ou votre manuel. Aucune donnée d'élève.
          </p>
        </div>

        <button className="plai-btn" onClick={genererCadrage} disabled={enCours}>
          {enCours && phase === 'idle' ? 'Cadrage en cours…' : 'Générer le cadrage'}
        </button>
      </div>

      {phase !== 'idle' && (
        <div style={{ marginTop: '2rem' }} id="zone-resultat">
          <BarreProgression phase={phase} />

          {verification && (
            verification.ecart_detecte
              ? <div className="plai-error"><strong>Écart avec l'année déclarée</strong><br />{verification.details}</div>
              : <div className="plai-success">Aucun écart détecté — l'exercice correspond à l'attendu de {annee}.</div>
          )}

          {/* Étape 1 : cadrage éditable */}
          {cadrage && (
            <>
              <h3 style={{ marginTop: '1.5rem' }} className="no-print">Étape 1 — Cadrage didactique</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
                {CLES.map(cle => (
                  <CadrageCard
                    key={cle}
                    cle={cle}
                    niveau={cadrage[cle]}
                    options={optionsParNiveau}
                    onChange={modifierCadrage}
                  />
                ))}
              </div>
              {phase === 'cadrageReview' && (
                <button className="plai-btn no-print" style={{ marginTop: '1rem' }} onClick={genererEnonces} disabled={enCours}>
                  {enCours ? 'Génération des énoncés…' : 'Valider le cadrage → générer les énoncés'}
                </button>
              )}
            </>
          )}

          {/* Étape 2 : énoncés éditables */}
          {enonces && (
            <>
              <h3 style={{ marginTop: '2rem' }} className="no-print">Étape 2 — Énoncés différenciés</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
                {CLES.map(cle => (
                  <NiveauCard
                    key={cle}
                    cle={cle}
                    niveau={{ ...cadrage[cle], enonce: enonces[cle].enonce }}
                    onChangeEnonce={modifierEnonce}
                  />
                ))}
              </div>
              {phase === 'enoncesReview' && (
                <button className="plai-btn no-print" style={{ marginTop: '1rem' }} onClick={genererGrille} disabled={enCours}>
                  {enCours ? 'Génération de la grille…' : 'Valider les énoncés → générer la grille'}
                </button>
              )}
            </>
          )}

          {/* Étape 3 : grille + export */}
          {grille && (
            <>
              <h3 style={{ marginTop: '2rem' }} className="no-print">Étape 3 — Grille d'évaluation</h3>
              <GrilleEvaluation grille={grille} onChangeCritere={modifierCritere} />
              <p style={{ fontSize: 13, color: 'var(--text3)', margin: '1rem 0' }}>
                Chaque zone est éditable indépendamment. Rien n'est sauvegardé automatiquement.
              </p>
              <div className="no-print" style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="plai-btn" onClick={telechargerWord} disabled={!resultat}>Télécharger en Word</button>
                <button className="plai-btn-ghost" onClick={() => window.print()}>Imprimer / PDF</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Lancer le test — il passe**

Run: `npx vitest run src/pages/Adapter.jsx.test.js`
Expected : PASS. Si les sélecteurs `options[1]` ne trouvent rien (référentiel P2 maths sans second champ), remplacer par une année/matière ayant au moins un champ et un sous-point (ouvrir `src/data/referentiel/maths/P2.json` pour choisir des valeurs réelles).

- [ ] **Step 5: Build check**

Run: `npx vite build`
Expected : build OK, aucune erreur.

- [ ] **Step 6: Commit**

```bash
git add src/pages/Adapter.jsx src/pages/Adapter.jsx.test.js
git commit -m "feat: Adapter en 3 phases validées (cadrage éditable → énoncés → grille)"
```

---

## Task 9: Eval manuelle des 6 cas réels

**Files:**
- Create: `scripts/eval-phases.mjs`

- [ ] **Step 1: Créer le script**

`scripts/eval-phases.mjs` — appels API réels, exige `ANTHROPIC_API_KEY` et `PROGRESSACTIF_ACCESS_CODE` dans l'environnement. Rejoue chaque cas en 3 phases et vérifie les 4 assertions du spec.

```js
// Usage : ANTHROPIC_API_KEY=... PROGRESSACTIF_ACCESS_CODE=... npm run eval:phases
// N'est PAS un test CI (appels API réels, coût + non-déterminisme). Le lancer après
// toute modif des prompts, avant un push qui touche maths.js / francais.js / generate.js.

import handler from '../api/generate.js'

const CAS = [
  // Renseigner les 6 cas réels de progressactif-prototype-p1-exemple :
  // 4 maths (patterns continu / plafonnant / discontinu), 1 français, 1 sciences.
  // Exemple de forme :
  { nom: 'maths P3 nombres — progression continue', matiere: 'maths', anneeDeclaree: 'P3', champLabel: 'Nombres', codeSousPoint: '1.1', exerciceTexte: 'Léa a 8 billes, elle en gagne 5. Combien en a-t-elle ?' },
  // ... 5 autres, copiés depuis les cas de test réels documentés dans la mémoire projet.
]

function mkRes() {
  return { statusCode: 0, body: null, status(c){this.statusCode=c;return this}, json(b){this.body=b;return this}, end(){return this}, setHeader(){} }
}
async function call(body) {
  const res = mkRes()
  await handler({ method: 'POST', headers: { 'x-forwarded-for': `eval-${Math.random()}` }, body: { ...body, codeAcces: process.env.PROGRESSACTIF_ACCESS_CODE } }, res)
  if (res.statusCode !== 200) throw new Error(`${res.statusCode} ${JSON.stringify(res.body)}`)
  return res.body.resultat
}

let echecs = 0
for (const c of CAS) {
  console.log(`\n=== ${c.nom} ===`)
  const cad = await call({ ...c, phase: 'cadrage' })

  // Assertion 1 : cadrage sans énoncé
  const aEnonce = Object.values(cad.cadrage).some(n => 'enonce' in n || /\?|\.\.\./.test(n.levier))
  console.log(aEnonce ? '  ✗ A1 : le cadrage contient un énoncé' : '  ✓ A1 : cadrage sans énoncé')
  if (aEnonce) echecs++

  // énoncés avec le cadrage IA
  const enoIA = await call({ ...c, phase: 'enonces', cadrage: cad.cadrage })

  // Assertion 2 : un cadrage édité change l'énoncé cible
  const cadEdite = JSON.parse(JSON.stringify(cad.cadrage))
  cadEdite.cible.levier = cadEdite.cible.levier + ' — resserrer la borne numérique de moitié'
  const enoEdit = await call({ ...c, phase: 'enonces', cadrage: cadEdite })
  const change = enoEdit.enonces.cible.enonce !== enoIA.enonces.cible.enonce
  console.log(change ? '  ✓ A2 : cadrage édité → énoncé cible différent' : '  ✗ A2 : énoncé cible inchangé malgré cadrage édité')
  if (!change) echecs++

  // Assertion 3 : forme finale + grille
  const gr = await call({ ...c, phase: 'grille', cadrage: cad.cadrage, enonces: enoIA.enonces })
  const okGrille = gr.grille && Array.isArray(gr.grille.criteres) && gr.grille.criteres.length >= 3
  console.log(okGrille ? '  ✓ A3 : grille ≥ 3 critères' : '  ✗ A3 : grille invalide')
  if (!okGrille) echecs++
}

console.log(`\n${echecs === 0 ? 'OK' : echecs + ' échec(s)'}`)
process.exit(echecs === 0 ? 0 : 1)
```

- [ ] **Step 2: Renseigner les 6 cas réels**

Ouvrir la mémoire projet `progressactif-prototype-p1-exemple.md` (ou les cas documentés) et remplir le tableau `CAS` avec les 6 exercices sources réels et leurs coordonnées référentiel exactes.

- [ ] **Step 3: Lancer l'eval**

Run: `ANTHROPIC_API_KEY=<clé> PROGRESSACTIF_ACCESS_CODE=<code> npm run eval:phases`
Expected : `OK` — A1/A2/A3 vertes sur les 6 cas. En cas d'échec A2 (énoncé inchangé), renforcer dans `construirePromptEnonces` la consigne « applique le levier tel quel ».

- [ ] **Step 4: Commit**

```bash
git add scripts/eval-phases.mjs
git commit -m "test: eval manuelle des 3 phases sur les 6 cas réels"
```

---

## Task 10: Documentation + vérification finale

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Documenter le flux dans `README.md`**

Ajouter une section :

```markdown
## Flux de génération (3 étapes validées)

1. **Cadrage** — l'IA propose, pour chaque niveau, l'attendu de référence et le levier de
   différenciation. L'enseignant édite (menu déroulant contraint au référentiel) et valide.
2. **Énoncés** — générés à partir du cadrage validé. Éditables.
3. **Grille** — dérivée du niveau cible validé. Éditable, puis export Word / PDF.

`/api/generate` route sur `phase: cadrage | enonces | grille`. Le bloc de contexte
référentiel est identique aux 3 appels et mis en cache (`cache_control`).

## Rate limiting

`api/_rateLimit.js` : 30 requêtes / 10 min par IP, in-memory. **Limite connue** : l'état
est remis à zéro à chaque cold start serverless et non partagé entre instances. Suffisant
pour la bêta fermée ; passer à un store partagé (Vercel KV) avant toute ouverture.

## Tests

- `npm test` — unitaires (schémas, prompts, reconstruction, rate limit, routage API mocké, Adapter)
- `npm run eval:phases` — eval sur appels API réels (6 cas), à lancer manuellement après
  toute modif de prompt, avant push.
```

- [ ] **Step 2: Suite complète + build**

Run: `npm test && npx vite build`
Expected : tous les tests PASS, build OK.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: flux 3 étapes, rate limiting, tests"
```

- [ ] **Step 4: (optionnel) Vérification navigateur**

Run: `vercel dev` (pas `vite dev` — les routes `/api/*` ne tournent pas sous Vite seul).
Ouvrir l'app, entrer le code d'accès, dérouler cadrage → énoncés → grille sur un cas maths,
éditer un levier au cadrage et vérifier que l'énoncé régénéré en tient compte. Export Word OK.

---

## Notes de mise en œuvre

- **Modèle** : `claude-sonnet-4-6` — ID valide sans suffixe de date (vérifié via la doc API).
  Le flag d'audit « modèle à vérifier » est clos.
- **Pas de push sur `master`** — la branche Vercel est `main`.
- **Build check obligatoire avant tout push** (`npx vite build`).
- **RISS** : aucune référence scientifique introduite par ce chantier — périmètre strictement
  référentiel FWB, conforme à la décision du 2026-08-28.
- Les valeurs `champLabel` / `codeSousPoint` des tests sont indicatives : les ajuster aux
  sous-points réellement présents dans `src/data/referentiel/{maths,francais}/P*.json`.
