import { useState, useMemo } from 'react'
import * as Maths from '../lib/matieres/maths'
import * as Francais from '../lib/matieres/francais'
import { exportNiveauxDocx } from '../lib/exportDocx'
import { STORAGE_KEY as CLE_CODE_ACCES } from '../components/AccessGate'

const MATIERES = {
  maths: { label: 'Maths', module: Maths, labelChamp: 'Champ du référentiel', aideChamp: 'Le domaine mathématique travaillé par l\'exercice (ex. Géométrie, Nombres). Détermine quels attendus seront utilisés pour calibrer les 3 niveaux.', labelSousPoint: 'Sous-point précis', aideSousPoint: 'Le sous-point exact du référentiel que l\'exercice mobilise. Si vous hésitez entre deux, choisissez celui qui décrit le mieux ce que l\'élève doit produire, pas juste le thème général.' },
  francais: { label: 'Français', module: Francais, labelChamp: 'Rubrique du référentiel', aideChamp: 'La rubrique du référentiel de français travaillée par l\'exercice (ex. lecture, grammaire, vocabulaire). Détermine quels attendus et quels descripteurs (fluence, % de formes correctes) seront utilisés.', labelSousPoint: 'Item précis', aideSousPoint: 'Le savoir ou savoir-faire exact que l\'exercice mobilise dans cette rubrique.' },
}

const LABELS = {
  soutien: 'Soutien',
  cible: 'Cible',
  depassement: 'Dépassement',
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
            <textarea
              className="plai-input"
              rows={2}
              value={c.critere}
              onChange={e => onChangeCritere(i, 'critere', e.target.value)}
              style={{ fontSize: 13 }}
              aria-label={`Critère ${i + 1}`}
            />
            <textarea
              className="plai-input"
              rows={2}
              value={c.indicateur_reussite}
              onChange={e => onChangeCritere(i, 'indicateur_reussite', e.target.value)}
              style={{ fontSize: 13 }}
              aria-label={`Indicateur de réussite ${i + 1}`}
            />
          </div>
        ))}
      </div>
      <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 10 }}>
        Colonne de gauche : le critère observable. Colonne de droite : ce qui permet de dire qu'il est
        atteint. Ajustez le vocabulaire à vos élèves avant d'imprimer.
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

      <p style={{ fontSize: 13, color: 'var(--text2)', fontStyle: 'italic', marginBottom: 4 }}>
        « {niveau.attendu_cite} »
      </p>
      <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 10 }}>
        {niveau.levier}
      </p>

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

export default function Adapter() {
  const [matiere, setMatiere] = useState('maths')
  const [annee, setAnnee] = useState('P2')
  const [champLabel, setChampLabel] = useState('')
  const [codeSousPoint, setCodeSousPoint] = useState('')
  const [exerciceTexte, setExerciceTexte] = useState('')
  const [resultat, setResultat] = useState(null)
  const [erreur, setErreur] = useState('')
  const [enCours, setEnCours] = useState(false)

  const conf = MATIERES[matiere]
  const champs = useMemo(() => conf.module.champsDisponibles(annee), [conf, annee])
  const sousPoints = useMemo(
    () => champs.find(c => c.champ === champLabel)?.sous_points ?? [],
    [champs, champLabel]
  )

  function changerMatiere(m) {
    setMatiere(m)
    setChampLabel('')
    setCodeSousPoint('')
    setResultat(null)
  }

  async function generer() {
    setErreur('')
    setResultat(null)
    if (!champLabel || !codeSousPoint || !exerciceTexte.trim()) {
      setErreur('Sélectionnez un champ, un sous-point, et collez le texte de l\'exercice avant de générer.')
      return
    }
    setEnCours(true)
    try {
      const codeAcces = sessionStorage.getItem(CLE_CODE_ACCES) ?? ''
      const resp = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matiere, anneeDeclaree: annee, champLabel, codeSousPoint, exerciceTexte, codeAcces }),
      })
      const data = await resp.json()
      if (resp.status === 401) {
        sessionStorage.removeItem(CLE_CODE_ACCES)
        throw new Error('Code d\'accès invalide ou expiré. Rechargez la page pour le ressaisir.')
      }
      if (!resp.ok) throw new Error(data.error ?? 'Erreur inconnue')
      setResultat(data.resultat)
    } catch (e) {
      setErreur(e.message)
    } finally {
      setEnCours(false)
    }
  }

  function modifierEnonce(cle, texte) {
    setResultat(r => ({ ...r, niveaux: { ...r.niveaux, [cle]: { ...r.niveaux[cle], enonce: texte } } }))
  }

  function modifierCritere(index, champ, texte) {
    setResultat(r => ({
      ...r,
      grille: {
        ...r.grille,
        criteres: r.grille.criteres.map((c, i) => i === index ? { ...c, [champ]: texte } : c),
      },
    }))
  }

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
          Chaque matière a sa propre logique de calibrage — le référentiel de français n'ancre pas les
          3 niveaux de la même façon que les maths.
        </p>
      </div>

      <div className="plai-field">
        <label className="plai-label" htmlFor="annee">Année de la classe</label>
        <select id="annee" className="plai-input" value={annee} onChange={e => { setAnnee(e.target.value); setChampLabel(''); setCodeSousPoint('') }}>
          {conf.module.ANNEES.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>
          L'année pour laquelle l'exercice a été conçu — pas l'année de chaque élève. Les 3 niveaux
          générés s'ancreront sur les attendus des années voisines (une avant, une après).
        </p>
      </div>

      <div className="plai-field">
        <label className="plai-label" htmlFor="champ">{conf.labelChamp}</label>
        <select id="champ" className="plai-input" value={champLabel} onChange={e => { setChampLabel(e.target.value); setCodeSousPoint('') }}>
          <option value="">— choisir —</option>
          {champs.map(c => <option key={c.champ} value={c.champ}>{c.champ}{c.titre ? ` — ${c.titre}` : ''}</option>)}
        </select>
        <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>
          {conf.aideChamp}
        </p>
      </div>

      {champLabel && (
        <div className="plai-field">
          <label className="plai-label" htmlFor="sousPoint">{conf.labelSousPoint}</label>
          <select id="sousPoint" className="plai-input" value={codeSousPoint} onChange={e => setCodeSousPoint(e.target.value)}>
            <option value="">— choisir —</option>
            {sousPoints.map(sp => <option key={sp.code} value={sp.code}>{sp.titre}</option>)}
          </select>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>
            {conf.aideSousPoint}
          </p>
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
          onChange={e => setExerciceTexte(e.target.value)}
        />
        <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>
          Collez l'énoncé tel qu'il figure dans votre farde ou votre manuel. Aucune donnée d'élève —
          uniquement le texte de l'exercice.
        </p>
      </div>

      <button className="plai-btn" onClick={generer} disabled={enCours}>
        {enCours ? 'Génération en cours…' : 'Générer les 3 niveaux'}
      </button>
      </div>

      {resultat && (
        <div style={{ marginTop: '2rem' }} id="zone-resultat">
          <p className="impression-titre" style={{ display: 'none' }}>
            ProgressActif — {conf.label} — {annee} — {champLabel}
          </p>

          {resultat.verification?.ecart_detecte ? (
            <div className="plai-error">
              <strong>Écart avec l'année déclarée</strong><br />
              {resultat.verification.details}
            </div>
          ) : (
            <div className="plai-success">
              Aucun écart détecté — l'exercice correspond à l'attendu de {annee}.
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem', marginTop: '1rem' }}>
            {['soutien', 'cible', 'depassement'].map(cle => (
              <NiveauCard key={cle} cle={cle} niveau={resultat.niveaux[cle]} onChangeEnonce={modifierEnonce} />
            ))}
          </div>

          {resultat.grille && <GrilleEvaluation grille={resultat.grille} onChangeCritere={modifierCritere} />}

          <p style={{ fontSize: 13, color: 'var(--text3)', margin: '1rem 0' }}>
            Chaque zone est éditable indépendamment : ajustez le vocabulaire ou le contexte de vos
            élèves avant d'imprimer ou d'enregistrer. Rien n'est sauvegardé automatiquement.
          </p>

          <div className="no-print" style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="plai-btn" onClick={telechargerWord}>Télécharger en Word</button>
            <button className="plai-btn-ghost" onClick={() => window.print()}>Imprimer / PDF</button>
          </div>
        </div>
      )}
    </div>
  )
}
