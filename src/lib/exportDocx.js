/**
 * Export DOCX — ProgressActif
 * Génère un fichier Word avec les 3 niveaux différenciés, tels qu'édités par l'enseignant.
 */

import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, BorderStyle, Table, TableRow, TableCell,
  WidthType, ShadingType, Header, Footer, PageNumber,
} from 'docx'
import { saveAs } from 'file-saver'

const BRAND_TEAL = '0f6e56'
const GRAY_LIGHT = 'F3F4F6'
const GRAY_TEXT = '6B7280'

const LABELS = { soutien: 'Soutien', cible: 'Cible', depassement: 'Dépassement' }

function spacer() {
  return new Paragraph({ text: '', spacing: { after: 200 } })
}

function metaTable(rows) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(([label, value]) =>
      new TableRow({
        children: [
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.CLEAR, fill: GRAY_LIGHT },
            children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 20, color: GRAY_TEXT })] })],
          }),
          new TableCell({
            width: { size: 70, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: [new TextRun({ text: value, size: 20 })] })],
          }),
        ],
      })
    ),
  })
}

// Convertit un texte avec **gras** en TextRun, ligne par ligne.
function parseEnonce(texte) {
  if (!texte) return [new Paragraph({ text: '—' })]
  return texte.split('\n').map(ligne => {
    const trimmed = ligne.trim()
    if (!trimmed) return new Paragraph({ text: '', spacing: { after: 100 } })
    const tokens = trimmed.split(/(\*\*[^*]+\*\*)/g)
    const children = tokens.flatMap(tok =>
      tok.startsWith('**') && tok.endsWith('**')
        ? [new TextRun({ text: tok.slice(2, -2), bold: true })]
        : tok ? [new TextRun({ text: tok })] : []
    )
    return new Paragraph({ children, spacing: { after: 120, line: 300 } })
  })
}

function niveauSection(cle, niveau) {
  return [
    new Paragraph({
      children: [new TextRun({ text: `${LABELS[cle]} — ${niveau.annee_reference}`, bold: true, color: BRAND_TEAL, size: 28 })],
      spacing: { before: 320, after: 100 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: BRAND_TEAL } },
    }),
    new Paragraph({
      children: [new TextRun({ text: `« ${niveau.attendu_cite} »`, italics: true, size: 20, color: GRAY_TEXT })],
      spacing: { after: 160 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Levier de différenciation : ', bold: true, size: 20, color: GRAY_TEXT }),
        new TextRun({ text: niveau.levier ?? '', size: 20, color: GRAY_TEXT }),
      ],
      spacing: { after: 120 },
    }),
    ...parseEnonce(niveau.enonce),
  ]
}

function grilleSection(grille) {
  if (!grille) return []
  return [
    new Paragraph({
      children: [new TextRun({ text: 'Grille d\'évaluation — attendu cible', bold: true, color: BRAND_TEAL, size: 28 })],
      spacing: { before: 320, after: 100 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: BRAND_TEAL } },
    }),
    new Paragraph({
      children: [new TextRun({ text: `« ${grille.attendu_cite} »`, italics: true, size: 20, color: GRAY_TEXT })],
      spacing: { after: 160 },
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              shading: { type: ShadingType.CLEAR, fill: GRAY_LIGHT },
              children: [new Paragraph({ children: [new TextRun({ text: 'Critère', bold: true, size: 20, color: GRAY_TEXT })] })],
            }),
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              shading: { type: ShadingType.CLEAR, fill: GRAY_LIGHT },
              children: [new Paragraph({ children: [new TextRun({ text: 'Indicateur de réussite', bold: true, size: 20, color: GRAY_TEXT })] })],
            }),
          ],
        }),
        ...grille.criteres.map(c => new TableRow({
          children: [
            new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: c.critere, size: 20 })] })] }),
            new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: c.indicateur_reussite, size: 20 })] })] }),
          ],
        })),
      ],
    }),
  ]
}

function pageFooter() {
  return {
    default: new Footer({
      children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: 'Page ', size: 18, color: GRAY_TEXT }),
          new TextRun({ children: [PageNumber.CURRENT], size: 18, color: GRAY_TEXT }),
          new TextRun({ text: ' / ', size: 18, color: GRAY_TEXT }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: GRAY_TEXT }),
        ],
      })],
    }),
  }
}

export async function exportNiveauxDocx({ anneeDeclaree, champLabel, codeSousPoint, verification, niveaux, grille }) {
  const date = new Date().toLocaleDateString('fr-BE', { day: 'numeric', month: 'long', year: 'numeric' })

  const doc = new Document({
    styles: { default: { document: { run: { font: 'Arial', size: 24 } } } },
    sections: [{
      properties: { page: { margin: { top: 720, right: 850, bottom: 720, left: 850 } } },
      headers: {
        default: new Header({
          children: [new Paragraph({
            children: [
              new TextRun({ text: 'ProgressActif — PLAI', bold: true, color: BRAND_TEAL, size: 18 }),
              new TextRun({ text: `  |  ${date}`, color: GRAY_TEXT, size: 18 }),
            ],
            border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: BRAND_TEAL } },
          })],
        }),
      },
      footers: pageFooter(),
      children: [
        new Paragraph({
          text: 'Exercice différencié',
          heading: HeadingLevel.TITLE,
          spacing: { after: 200 },
          run: { color: BRAND_TEAL, bold: true, size: 36 },
        }),

        metaTable([
          ['Année', anneeDeclaree],
          ['Champ', champLabel],
          ['Sous-point', codeSousPoint],
          ['Date', date],
        ]),

        spacer(),

        ...(verification?.ecart_detecte ? [
          new Paragraph({
            children: [new TextRun({ text: '⚠ Écart avec l\'année déclarée : ', bold: true, color: 'A32D2D' })],
            spacing: { after: 60 },
          }),
          new Paragraph({
            children: [new TextRun({ text: verification.details, size: 20 })],
            spacing: { after: 320 },
          }),
        ] : []),

        ...niveauSection('soutien', niveaux.soutien),
        ...niveauSection('cible', niveaux.cible),
        ...niveauSection('depassement', niveaux.depassement),
        ...grilleSection(grille),
      ],
    }],
  })

  const blob = await Packer.toBlob(doc)
  const filename = `ProgressActif_${anneeDeclaree}_${codeSousPoint}_${new Date().toISOString().split('T')[0]}.docx`
  saveAs(blob, filename)
}
