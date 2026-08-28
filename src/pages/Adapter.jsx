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
  const [cadrage, setCadrage] = useState(null)
  const [enonces, setEnonces] = useState(null)
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

          {cadrage && (
            <>
              <h3 style={{ marginTop: '1.5rem' }} className="no-print">Étape 1 — Cadrage didactique</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
                {CLES.map(cle => (
                  <CadrageCard key={cle} cle={cle} niveau={cadrage[cle]} options={optionsParNiveau} onChange={modifierCadrage} />
                ))}
              </div>
              {phase === 'cadrageReview' && (
                <button className="plai-btn no-print" style={{ marginTop: '1rem' }} onClick={genererEnonces} disabled={enCours}>
                  {enCours ? 'Génération des énoncés…' : 'Valider le cadrage → générer les énoncés'}
                </button>
              )}
            </>
          )}

          {enonces && (
            <>
              <h3 style={{ marginTop: '2rem' }} className="no-print">Étape 2 — Énoncés différenciés</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
                {CLES.map(cle => (
                  <NiveauCard key={cle} cle={cle} niveau={{ ...cadrage[cle], enonce: enonces[cle].enonce }} onChangeEnonce={modifierEnonce} />
                ))}
              </div>
              {phase === 'enoncesReview' && (
                <button className="plai-btn no-print" style={{ marginTop: '1rem' }} onClick={genererGrille} disabled={enCours}>
                  {enCours ? 'Génération de la grille…' : 'Valider les énoncés → générer la grille'}
                </button>
              )}
            </>
          )}

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
