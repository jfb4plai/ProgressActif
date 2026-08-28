import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import Adapter from './Adapter.jsx'

// RTL v16 + vitest sans globals ne nettoie pas automatiquement le DOM entre
// les tests : sans ce cleanup, le 2e test voit deux formulaires et
// getByLabelText échoue avec « multiple elements ».
afterEach(cleanup)

beforeEach(() => {
  sessionStorage.setItem('progressactif_code_acces', 'SECRET')
  vi.restoreAllMocks()
})

function mockFetchSequence(...payloads) {
  const fn = vi.fn()
  payloads.forEach(p => fn.mockResolvedValueOnce({ ok: true, json: async () => ({ resultat: p }) }))
  global.fetch = fn
  return fn
}

it('affiche le bouton "Générer le cadrage" à l\'état initial', () => {
  render(<Adapter />)
  expect(screen.getByRole('button', { name: /générer le cadrage/i })).toBeInTheDocument()
})

it('après le cadrage, affiche les cartes de cadrage et pas encore les énoncés', async () => {
  mockFetchSequence({
    verification: { ecart_detecte: false, details: '' },
    cadrage: {
      soutien: { annee_reference: 'P1', attendu_cite: 'a', levier: 'l1' },
      cible: { annee_reference: 'P2', attendu_cite: 'b', levier: 'l2' },
      depassement: { annee_reference: 'P3', attendu_cite: 'c', levier: 'l3' },
    },
  })
  render(<Adapter />)
  fireEvent.change(screen.getByLabelText(/Champ du référentiel/i), { target: { value: screen.getByLabelText(/Champ du référentiel/i).options[1].value } })
  fireEvent.change(screen.getByLabelText(/Sous-point précis/i), { target: { value: screen.getByLabelText(/Sous-point précis/i).options[1].value } })
  fireEvent.change(screen.getByLabelText(/Exercice source/i), { target: { value: 'Un énoncé de test' } })
  fireEvent.click(screen.getByRole('button', { name: /générer le cadrage/i }))

  await waitFor(() => expect(screen.getByText(/Valider le cadrage/i)).toBeInTheDocument())
  expect(screen.queryByText(/Valider les énoncés/i)).not.toBeInTheDocument()
})
