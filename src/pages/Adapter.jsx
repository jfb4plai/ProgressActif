import { useState, useMemo } from 'react'
import { ANNEES, champsDisponibles } from '../lib/matieres/maths'

export default function Adapter() {
  const [annee, setAnnee] = useState('P2')
  const [champLabel, setChampLabel] = useState('')
  const [codeSousPoint, setCodeSousPoint] = useState('')
  const [exerciceTexte, setExerciceTexte] = useState('')
  const [resultat, setResultat] = useState('')
  const [erreur, setErreur] = useState('')
  const [enCours, setEnCours] = useState(false)

  const champs = useMemo(() => champsDisponibles(annee), [annee])
  const sousPoints = useMemo(
    () => champs.find(c => c.champ === champLabel)?.sous_points ?? [],
    [champs, champLabel]
  )

  async function generer() {
    setErreur('')
    setResultat('')
    if (!champLabel || !codeSousPoint || !exerciceTexte.trim()) {
      setErreur('Sélectionnez un champ, un sous-point, et collez le texte de l\'exercice avant de générer.')
      return
    }
    setEnCours(true)
    try {
      const resp = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matiere: 'maths', anneeDeclaree: annee, champLabel, codeSousPoint, exerciceTexte }),
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error ?? 'Erreur inconnue')
      setResultat(data.resultat)
    } catch (e) {
      setErreur(e.message)
    } finally {
      setEnCours(false)
    }
  }

  return (
    <div className="plai-container plai-section">
      <span className="plai-badge">Différenciation par attendus — maths</span>
      <h2>Adapter un exercice</h2>

      {erreur && <div className="plai-error">{erreur}</div>}

      <div className="plai-field">
        <label className="plai-label" htmlFor="annee">Année de la classe</label>
        <select id="annee" className="plai-input" value={annee} onChange={e => { setAnnee(e.target.value); setChampLabel(''); setCodeSousPoint('') }}>
          {ANNEES.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>
          L'année pour laquelle l'exercice a été conçu — pas l'année de chaque élève. Les 3 niveaux
          générés s'ancreront sur les attendus des années voisines (une avant, une après).
        </p>
      </div>

      <div className="plai-field">
        <label className="plai-label" htmlFor="champ">Champ du référentiel</label>
        <select id="champ" className="plai-input" value={champLabel} onChange={e => { setChampLabel(e.target.value); setCodeSousPoint('') }}>
          <option value="">— choisir un champ —</option>
          {champs.map(c => <option key={c.champ} value={c.champ}>{c.champ} — {c.titre}</option>)}
        </select>
        <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>
          Le domaine mathématique travaillé par l'exercice (ex. Géométrie, Nombres). Détermine quels
          attendus seront utilisés pour calibrer les 3 niveaux.
        </p>
      </div>

      {champLabel && (
        <div className="plai-field">
          <label className="plai-label" htmlFor="sousPoint">Sous-point précis</label>
          <select id="sousPoint" className="plai-input" value={codeSousPoint} onChange={e => setCodeSousPoint(e.target.value)}>
            <option value="">— choisir un sous-point —</option>
            {sousPoints.map(sp => <option key={sp.code} value={sp.code}>{sp.code} — {sp.titre}</option>)}
          </select>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>
            Le sous-point exact du référentiel que l'exercice mobilise. Si vous hésitez entre deux,
            choisissez celui qui décrit le mieux ce que l'élève doit produire, pas juste le thème général.
          </p>
        </div>
      )}

      <div className="plai-field">
        <label className="plai-label" htmlFor="exercice">Exercice source</label>
        <textarea
          id="exercice"
          className="plai-input"
          rows={6}
          placeholder={'Ex. : "Léa a 8 billes. Elle en gagne 5 pendant la récré. Combien de billes a-t-elle maintenant ?"'}
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

      {resultat && (
        <div className="plai-field" style={{ marginTop: '1.5rem' }}>
          <label className="plai-label" htmlFor="resultat">Résultat — à relire et corriger avant tout usage</label>
          <textarea
            id="resultat"
            className="plai-input"
            rows={20}
            value={resultat}
            onChange={e => setResultat(e.target.value)}
          />
          <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>
            Zone entièrement éditable : ajustez le vocabulaire, le contexte de vos élèves, ou corrigez
            toute vérification signalée avant d'imprimer ou d'enregistrer. Rien n'est sauvegardé
            automatiquement.
          </p>
        </div>
      )}
    </div>
  )
}
