import Adapter from './pages/Adapter'

export default function App() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <nav className="plai-nav">
        <a href="/" className="plai-nav-logo">
          <img src="/plai-logo.jpg" alt="PLAI" style={{ height: 32, width: 'auto' }} />
          ProgressActif
        </a>
        <div className="plai-nav-actions">
          <span className="plai-nav-link" style={{ cursor: 'default' }}>bêta interne</span>
        </div>
      </nav>

      <div className="plai-banner">
        Ces 3 niveaux visent le même attendu — un élève DYS a besoin d'une adaptation de forme, pas
        seulement de difficulté. <a href="https://diffactif.vercel.app" target="_blank" rel="noreferrer">DiffActif</a> ajuste consignes, mise en page et support par profil (dyslexie, TDAH, dyspraxie…).
      </div>

      <Adapter />

      <footer className="plai-footer">
        <p>ProgressActif — outil PLAI, Pôle Territorial de la Ville de Liège</p>
        <p>Différenciation ancrée sur le Référentiel de Mathématiques du tronc commun FWB</p>
      </footer>
    </div>
  )
}
