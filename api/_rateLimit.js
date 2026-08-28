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
