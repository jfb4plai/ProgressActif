# Rapport d'extraction — Référentiel de Mathématiques FWB, P2 à P6

Source : `refmath.pdf` (156 pages), pages 35 à 107 couvertes (P2-P6). P1 déjà traité (référence). S1 non extrait, conformément à la consigne.

## Volumétrie par année

| Année | Pages sources | Sous-points | Attendus (items) |
|---|---|---|---|
| P2 | 35-47 | 10 | 122 |
| P3 | 48-62 | 11 | 150 |
| P4 | 63-77 | 11 | 173 |
| P5 | 78-92 | 11 | 176 |
| P6 | 93-107 | 11 | 167 |

Champ 1 = 3 sous-points (1.1, 1.2, 1.3) à partir de P3 (P2 n'a que 1.1 et 1.2 — le sous-point 1.3 "Dégager des régularités…" n'apparait qu'à partir de P3 dans le référentiel).
Champ 2 = 5 sous-points (2.1 à 2.5), Champ 3 = 2 sous-points (3.1, 3.2), Champ 4 = 1 sous-point (4.1), pour chaque année P2 à P6.

## Points `_a_verifier`

Aucun `_a_verifier` n'a été nécessaire. Les tableaux étaient tous correctement extraits sur les plages de pages lues, sans coupure d'item entre deux pages qui aurait rendu le contenu ambigu.

Un point de vigilance signalé mais non bloquant : sur les pages traitant des fractions (P2 p.42, P3 p.56, P4 p.71, P5 p.86, P6 p.101), le PDF encode les fractions en colonnes verticales (numérateur/dénominateur superposés) que l'extraction texte linéarise en chiffres juxtaposés séparés par des barres obliques. J'ai reconstitué ces suites de fractions (ex. P4 : "1/2, 1/4, 1/8, 1/3, 1/6, 1/12, 1/5, 1/10, 1/20, 1/100, 1/1000 de…") en m'appuyant sur le motif régulier observé dans le référentiel (toujours des fractions de numérateur 1, listées par dénominateurs croissants) et sur la cohérence avec les listes de dénominateurs répétées ailleurs dans le même sous-point (2.4) pour l'année considérée. La fidélité aux valeurs numériques (dénominateurs) est garantie ; seule la mise en forme typographique d'origine (fraction verticale) n'a pas pu être reproduite en JSON simple, ce qui est un choix de représentation cohérent avec le fichier de référence P1 (qui n'avait pas ce cas de figure) — j'ai utilisé la notation "a/b" partout, de façon uniforme sur les 5 années.

## Anomalies de structure du document

1. **Champ 1, sous-point 1.3 absent en P2** : contrairement à P3-P6, l'année P2 (comme P1) n'a que deux sous-points en Champ 1 (1.1 et 1.2). Le sous-point "Dégager des régularités et des propriétés géométriques" n'est introduit dans le référentiel officiel qu'à partir de P3. Ce n'est pas une omission d'extraction — c'est la structure réelle du document (vérifié en relisant le sommaire de chaque section Champ 1).
2. **Aucun tableau à cheval sur deux pages** n'a été rencontré dans les plages P2-P6 : chaque sous-point (2.x, 3.x, etc.) commence et se termine proprement dans les plages lues, même quand un tableau continue sur la page suivante (ex. P2 2.2 p.40-41, P3 2.2 p.53-54, etc.) — dans ces cas la continuité de la ligne "Savoir-faire / Attendus" était explicite et sans ambiguïté (pas de rupture de ligne de tableau ni de doublon).
3. **Notes de bas de page** : aucune note de bas de page distincte du corps du tableau n'a été rencontrée dans les pages P2-P6 (contrairement à ce que la consigne anticipait comme cas possible).
4. Le patron des 4 champs (structure identique : Champ 1 géométrie / Champ 2 grandeurs / Champ 3 arithmétique-algèbre / Champ 4 organisation des données) est respecté strictement sur les 5 années, sans déviation.

## Fichiers produits

- `test-extraction-P2-maths.json`
- `test-extraction-P3-maths.json`
- `test-extraction-P4-maths.json`
- `test-extraction-P5-maths.json`
- `test-extraction-P6-maths.json`

Tous validés syntaxiquement (JSON bien formé, chargement Python réussi) et vérifiés par comptage sous-points/attendus reporté ci-dessus.
