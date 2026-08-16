import { useState } from 'react'

export const STORAGE_KEY = 'progressactif_code_acces'

export default function AccessGate({ children }) {
  const [code, setCode] = useState(() => sessionStorage.getItem(STORAGE_KEY) ?? '')
  const [saisie, setSaisie] = useState('')

  if (code) return children

  function valider(e) {
    e.preventDefault()
    if (!saisie.trim()) return
    sessionStorage.setItem(STORAGE_KEY, saisie.trim())
    setCode(saisie.trim())
  }

  return (
    <div className="plai-container plai-section">
      <div className="plai-card" style={{ maxWidth: 420, margin: '2rem auto' }}>
        <h2>Accès bêta interne</h2>
        <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 16 }}>
          ProgressActif est en test restreint. Entrez le code d'accès transmis par le Pôle Territorial
          de la Ville de Liège pour continuer.
        </p>
        <form onSubmit={valider}>
          <label className="plai-label" htmlFor="codeAcces">Code d'accès</label>
          <input
            id="codeAcces"
            type="password"
            className="plai-input"
            value={saisie}
            onChange={e => setSaisie(e.target.value)}
            placeholder="Reçu par email ou en formation"
            autoFocus
          />
          <p style={{ fontSize: 13, color: 'var(--text3)', margin: '4px 0 12px' }}>
            Le code n'est vérifié qu'au moment de générer un exercice — il n'est conservé que dans cet
            onglet, pas au-delà.
          </p>
          <button type="submit" className="plai-btn">Continuer</button>
        </form>
      </div>
    </div>
  )
}
