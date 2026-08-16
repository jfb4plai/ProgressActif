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

      <div className="plai-container plai-section" style={{ borderTop: 'none' }}>
        <h2>Un exercice, trois niveaux, un seul attendu</h2>
        <p style={{ color: 'var(--text2)', marginBottom: '1.5rem' }}>
          Collez un exercice de votre farde et l'année visée. ProgressActif identifie l'attendu du tronc
          commun qu'il mobilise, puis génère trois versions calibrées sur les attendus des années
          voisines — jamais sur une difficulté inventée.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div className="plai-card">
            <strong style={{ color: 'var(--teal)' }}>Soutien</strong>
            <p style={{ fontSize: 14, color: 'var(--text2)', marginTop: 6 }}>
              Consolide l'attendu de l'année précédente avant de viser celui de l'année en cours.
            </p>
          </div>
          <div className="plai-card">
            <strong style={{ color: 'var(--teal)' }}>Cible</strong>
            <p style={{ fontSize: 14, color: 'var(--text2)', marginTop: 6 }}>
              Votre exercice, fidèle à l'attendu officiel de l'année déclarée.
            </p>
          </div>
          <div className="plai-card">
            <strong style={{ color: 'var(--teal)' }}>Dépassement</strong>
            <p style={{ fontSize: 14, color: 'var(--text2)', marginTop: 6 }}>
              Prolonge la même progression vers l'attendu de l'année suivante.
            </p>
          </div>
        </div>

        <p style={{ fontSize: 14, color: 'var(--text3)' }}>
          Chaque version cite l'attendu précis du référentiel sur lequel elle s'appuie — un argument
          concret pour vos préparations. Le résultat reste une base à relire et ajuster : rien n'est
          exporté sans passer par votre relecture.
        </p>
      </div>

      <Adapter />

      <footer className="plai-footer">
        <p>ProgressActif — outil PLAI, Pôle Territorial de la Ville de Liège</p>
        <p>Différenciation ancrée sur le Référentiel de Mathématiques du tronc commun FWB</p>
      </footer>
    </div>
  )
}
