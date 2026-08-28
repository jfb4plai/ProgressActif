import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import Adapter from './Adapter.jsx'

// RTL v16 + vitest sans globals ne nettoie pas automatiquement le DOM entre
// les tests : sans ce cleanup, le test suivant voit deux formulaires et
// getByLabelText échoue avec « multiple elements ».
afterEach(cleanup)

beforeEach(() => {
  sessionStorage.setItem('progressactif_code_acces', 'SECRET')
  vi.restoreAllMocks()
})

function mockFetchSequence(...payloads) {
  const fn = vi.fn()
  payloads.forEach(p => fn.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ resultat: p }) }))
  global.fetch = fn
  return fn
}

const CADRAGE_PAYLOAD = {
  verification: { ecart_detecte: false, details: '' },
  cadrage: {
    soutien: { annee_reference: 'P1', attendu_cite: 'a', levier: 'l1' },
    cible: { annee_reference: 'P2', attendu_cite: 'b', levier: 'l2' },
    depassement: { annee_reference: 'P3', attendu_cite: 'c', levier: 'l3' },
  },
}
const ENONCES_PAYLOAD = {
  enonces: {
    soutien: { enonce: 'énoncé soutien' },
    cible: { enonce: 'énoncé cible' },
    depassement: { enonce: 'énoncé dépassement' },
  },
}

function remplirFormulaire() {
  const champ = screen.getByLabelText(/Champ du référentiel/i)
  fireEvent.change(champ, { target: { value: champ.options[1].value } })
  const sp = screen.getByLabelText(/Sous-point précis/i)
  fireEvent.change(sp, { target: { value: sp.options[1].value } })
  fireEvent.change(screen.getByLabelText(/Exercice source/i), { target: { value: 'Un énoncé de test' } })
}

it('affiche le bouton "Générer le cadrage" à l\'état initial', () => {
  render(<Adapter />)
  expect(screen.getByRole('button', { name: /générer le cadrage/i })).toBeInTheDocument()
})

it('après le cadrage, affiche les cartes de cadrage et pas encore les énoncés', async () => {
  mockFetchSequence(CADRAGE_PAYLOAD)
  render(<Adapter />)
  remplirFormulaire()
  fireEvent.click(screen.getByRole('button', { name: /générer le cadrage/i }))

  await waitFor(() => expect(screen.getByText(/Valider le cadrage/i)).toBeInTheDocument())
  expect(screen.queryByText(/Valider les énoncés/i)).not.toBeInTheDocument()
})

it('éditer un levier après les énoncés fait redescendre la machine en phase cadrage', async () => {
  mockFetchSequence(CADRAGE_PAYLOAD, ENONCES_PAYLOAD)
  render(<Adapter />)
  remplirFormulaire()
  fireEvent.click(screen.getByRole('button', { name: /générer le cadrage/i }))
  await waitFor(() => expect(screen.getByText(/Valider le cadrage/i)).toBeInTheDocument())

  fireEvent.click(screen.getByRole('button', { name: /valider le cadrage/i }))
  await waitFor(() => expect(screen.getByText(/Valider les énoncés/i)).toBeInTheDocument())
  expect(screen.getAllByLabelText(/^Énoncé — /i).length).toBe(3)

  const leviers = screen.getAllByLabelText(/Levier de différenciation/i)
  fireEvent.change(leviers[1], { target: { value: 'nouveau levier édité' } })

  expect(screen.queryByText(/Valider les énoncés/i)).not.toBeInTheDocument()
  expect(screen.getByText(/Valider le cadrage/i)).toBeInTheDocument()
  expect(screen.queryAllByLabelText(/^Énoncé — /i).length).toBe(0)
})
