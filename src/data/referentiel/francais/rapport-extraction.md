# Rapport d'extraction — Référentiel de Français FWB (P1-P6)

Source : Référentiel de Français et Langues Anciennes — Tronc commun FWB, section FRANÇAIS uniquement (Langues anciennes et S1-S3 exclus), p.37-153.

Fichiers produits : `francais-P1.json` à `francais-P6.json` dans le dossier scratchpad.

## 1. Volume extrait par année

| Année | Pages | Rubriques (groupes) | Items Savoirs | Items Savoir-faire | Total items |
|---|---|---|---|---|---|
| P1 | 37-52 | 9 | 17 | 41 | 58 |
| P2 | 53-69 | 9 | 20 | 40 | 60 |
| P3 | 70-87 | 9 | 22 | 43 | 65 |
| P4 | 88-108 | 9 | 20 | 41 | 61 |
| P5 | 109-131 | 9 | 20 | 43 | 63 |
| P6 | 132-153 | 9 | 21 (dont Culture littéraire déplacée) | 41 | 62 |

Chaque année comporte en plus les blocs `competences_reception` (Écouter, Lire) et `competences_production` (Écrire, Parler), tous extraits.

## 2. Progression des descripteurs transversaux (fluence lecture / % formes correctes écriture)

| Année | Palier lecteur | Fluence (mots/min) | Palier scripteur | % formes correctes |
|---|---|---|---|---|
| P1 | apprenti lecteur | non chiffré dans le texte P1 (1er seuil chiffré = P2) | scripteur émergent → débutant | non chiffré dans le texte P1 (1re valeur = 50% en fin de P2) |
| P2 | lecteur débutant | **70** | scripteur débutant | **50** |
| P3 | lecteur en transition | non chiffré narrativement pour P3 (figure montre ±110 sous P4) | scripteur en transition | **60** |
| P4 | lecteur en transition | **110** | scripteur en transition | 60 (repris de P3, pas de nouvelle valeur narrative pour P4) |
| P5 | lecteur confirmé (cheminement) | **120** (tableau savoir-faire p.117) | scripteur confirmé (cheminement) | non chiffré narrativement pour P5 (palier P6:80% / S1... cité) |
| P6 | lecteur confirmé (cheminement) | **130** (tableau savoir-faire p.140) | scripteur confirmé (cheminement) | **80** (fin P6) → 90% en fin S3 |

Repères du schéma "Figure 1" (constant sur toutes les années, panneau récapitulatif) : P2 ≈70, P4 ≈110, S1 ≈170 mots/min. Les valeurs P1/P3/P5/P6 (120, 130) proviennent des tableaux Savoir-faire "Développer une lecture fluide" de chaque année, pas du schéma synthétique lui-même — à vérifier/confirmer si cette distinction (schéma vs texte détaillé) doit être conservée telle quelle dans le corpus JSON ou harmonisée.

Repères "Figure 2" écriture (constant) : P2=50%, P4=60%, P6=80%, S1... =90% en fin S3 (le jalon 90% est atteint en fin de secondaire, pas en primaire).

## 3. Divergences structurelles observées vs schéma initial (informations utiles, pas des erreurs)

1. **"Apprendre le code" ne disparaît PAS après P2** contrairement à l'hypothèse de départ — la sous-rubrique existe encore en P3 sous le nom "Apprendre et utiliser le code" (3 items). Ce n'est qu'à partir de P4 qu'elle se réduit et se renomme "Utiliser le code" (2 items seulement : ponctuation + fluence), confirmant la phrase narrative P3 "l'apprentissage du code s'efface". Le libellé reste "Utiliser le code" pour P4, P5 et P6.

2. **Structure du tableau "Savoirs" P1 diverge du tableau "Savoir-faire"** : le tableau Savoirs ne répète pas systématiquement les sous-rubriques (ex. "Construire du sens à l'aide de stratégies" n'apparaît jamais comme intitulé explicite côté Savoirs, seulement côté Savoir-faire). Plusieurs items Savoirs (Adaptation à la situation de communication, Paramètres du corps et de la voix, Stratégies/habiletés de compréhension, Composantes de la production) ont donc été rattachés par défaut à "Construire un message significatif" avec `_a_verifier` documentant l'incertitude. Ce pattern se retrouve identique dans P2, P3, P4, P5, P6 (structure stable, donc probablement un choix éditorial du référentiel, pas une anomalie).

3. **La liste de caractéristiques "texte accessible"** (huit puces) n'apparaît qu'en P2. Elle n'est pas reprise (sous cette forme de liste à puces explicite) dans P1, P3, P4, P5, P6 — confirmé par lecture attentive des pages d'intro de chaque année.

4. **Niveaux de langue** : le savoir "Niveaux de langue" (familier/courant) apparaît pour la première fois en P4, puis s'enrichit du niveau "soutenu" à partir de P5 (maintenu en P6).

5. **"Pratiquer une lecture distanciée*"** apparaît pour la première fois en P2 (pas en P1), confirmant sa place de savoir-faire émergent en 2e primaire, consolidé ensuite chaque année.

6. **"Prendre des notes"** est un savoir-faire nouveau apparaissant uniquement en P6 (organiser ses notes en schéma, ligne du temps, carte mentale).

7. **La rubrique "Apprécier, agir/réagir, réviser"** perd son item "Savoir : Culture littéraire" comme rubrique séparée en P6 — il a été fusionné dans le bloc "Construire un message significatif" du tableau Savoirs P6 (l'ordre des rubriques dans le PDF P6 diffère légèrement : Culture littéraire apparaît avant le tableau Savoir-faire, sans bandeau "Apprécier, agir/réagir, réviser" séparé au niveau Savoirs). Reclassé fidèlement selon la position réelle dans le PDF.

8. **Fluence P6 = 130 mots/min** : valeur trouvée dans le tableau Savoir-faire p.140 ("s'approchant des 130 mots lus correctement par minute"), alors que la figure synthétique ne montre explicitement que les jalons P2/P4/S1. Valeur intermédiaire cohérente avec la progression 70→110→120→130→...→170, mais à confirmer qu'elle est bien correcte dans le document source (relue deux fois, confirmée).

## 4. Liste des `_a_verifier` rencontrés (par année)

- **P1** : item "Adaptation à la situation de communication" (et les 3 items suivants) — rattachement à "Construire un message significatif" par défaut faute d'intitulé de sous-rubrique explicite dans le tableau Savoirs.
- **P2** : idem P1 (même pattern), + "Pratiquer une lecture distanciée*" signalé comme nouveauté.
- **P4** : "Niveaux de langue" signalé comme savoir nouveau ; sous-rubrique "Utiliser le code" signalée comme confirmation de la réduction narrative du travail sur le code.
- **P5** : niveau de langue "soutenu" signalé comme ajout.
- **P6** : "Prendre des notes" signalé comme savoir-faire nouveau ; fluence 130 mots/min signalée avec sa source exacte (tableau Savoir-faire, pas figure schématique).

## 5. Fidélité et méthode

- Tout le texte des attendus a été recopié mot pour mot depuis les tableaux du PDF (Savoirs et Savoir-faire), sans reformulation ni résumé.
- Les rubriques/sous-rubriques utilisent l'intitulé exact du bandeau du PDF, sans numérotation inventée.
- Les paragraphes narratifs (`contexte_annuel`) sont des citations complètes et fidèles des sections "L'essentiel en [année] primaire" + "Regard sur la progression des apprentissages en lecture/écriture" de chaque année.
- Aucune ligne de tableau n'a été volontairement omise ; une relecture croisée page par page a été faite après extraction de chaque année.

## 6. Points d'attention pour la suite du projet

- La structure du français est bien plus riche que celle des maths (pas de 4 champs numérotés stables) : 9 groupes de rubriques + 2 blocs de compétences par année, avec un vocabulaire de rubriques stable d'une année à l'autre (bon signe pour construire une progression comparable programmatiquement).
- Le champ `visees` (ÉCOUTER/LIRE/PARLER/ÉCRIRE) est systématiquement présent par item, ce qui permettra de filtrer les attendus par compétence pour l'app ProgressActif (comme pour les 4 champs maths).
- Les `descripteurs_transversaux` (fluence, % formes correctes, paliers lecteur/scripteur) constituent un bon indicateur numérique de progression déjà présent dans les 6 fichiers — utile pour calibrer les 3 niveaux de différenciation (soutien/cible/dépassement) de l'app.
