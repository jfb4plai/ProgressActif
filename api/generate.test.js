import { it, expect, beforeEach, vi } from 'vitest'
import handler from './generate.js'
import { _reset } from './_rateLimit.js'

const ENV = { PROGRESSACTIF_ACCESS_CODE: 'SECRET', ANTHROPIC_API_KEY: 'k' }

function mockRes() {
  return {
    statusCode: 0, body: null,
    status(c) { this.statusCode = c; return this },
    json(b) { this.body = b; return this },
    setHeader() { return this },
    end() { return this },
  }
}

function mockAnthropic(payloadText) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ content: [{ text: JSON.stringify(payloadText) }] }),
  })
}

beforeEach(() => {
  _reset()
  Object.assign(process.env, ENV)
  vi.restoreAllMocks()
})

const bodyBase = {
  matiere: 'maths', anneeDeclaree: 'P3', champLabel: 'Nombres',
  codeSousPoint: '1.1', exerciceTexte: 'Léa a 8 billes...', codeAcces: 'SECRET',
}

it('refuse un code d\'accès invalide', async () => {
  const res = mockRes()
  await handler({ method: 'POST', headers: {}, body: { ...bodyBase, codeAcces: 'X', phase: 'cadrage' } }, res)
  expect(res.statusCode).toBe(401)
})

it('phase cadrage : renvoie verification + cadrage, jamais d\'énoncé', async () => {
  global.fetch = mockAnthropic({
    verification: { ecart_detecte: false, details: '' },
    cadrage: {
      soutien: { annee_reference: 'P2', attendu_cite: 'a', levier: 'l' },
      cible: { annee_reference: 'P3', attendu_cite: 'b', levier: 'l' },
      depassement: { annee_reference: 'P4', attendu_cite: 'c', levier: 'l' },
    },
  })
  const res = mockRes()
  await handler({ method: 'POST', headers: {}, body: { ...bodyBase, phase: 'cadrage' } }, res)
  expect(res.statusCode).toBe(200)
  expect(res.body.resultat.cadrage.cible).not.toHaveProperty('enonce')
  const sentBody = JSON.parse(global.fetch.mock.calls[0][1].body)
  expect(sentBody.max_tokens).toBe(2000)
  expect(sentBody.system[0].cache_control).toEqual({ type: 'ephemeral' })
})

it('phase enonces : passe le cadrage au prompt', async () => {
  global.fetch = mockAnthropic({ enonces: { soutien: { enonce: 'x' }, cible: { enonce: 'y' }, depassement: { enonce: 'z' } } })
  const res = mockRes()
  const cadrage = {
    soutien: { annee_reference: 'P2', attendu_cite: 'a', levier: 'borne 10' },
    cible: { annee_reference: 'P3', attendu_cite: 'b', levier: 'borne à 20' },
    depassement: { annee_reference: 'P4', attendu_cite: 'c', levier: 'deux étapes' },
  }
  await handler({ method: 'POST', headers: {}, body: { ...bodyBase, phase: 'enonces', cadrage } }, res)
  expect(res.statusCode).toBe(200)
  const sentBody = JSON.parse(global.fetch.mock.calls[0][1].body)
  expect(sentBody.system[1].text).toContain('borne à 20')
})

it('throttle des échecs d\'auth : 401 "Trop de tentatives" après 10 codes faux', async () => {
  const bad = () => handler(
    { method: 'POST', headers: { 'x-forwarded-for': '9.9.9.9' }, body: { ...bodyBase, codeAcces: 'FAUX', phase: 'cadrage' } },
    mockRes(),
  )
  for (let i = 0; i < 10; i++) await bad()
  const res = mockRes()
  await handler({ method: 'POST', headers: { 'x-forwarded-for': '9.9.9.9' }, body: { ...bodyBase, codeAcces: 'FAUX', phase: 'cadrage' } }, res)
  expect(res.statusCode).toBe(401)
  expect(res.body.error).toMatch(/Trop de tentatives/)
})

it('phase inconnue → 400', async () => {
  const res = mockRes()
  await handler({ method: 'POST', headers: {}, body: { ...bodyBase, phase: 'bleh' } }, res)
  expect(res.statusCode).toBe(400)
})

it('rate limiting : 401 code ok mais 429 après 30 requêtes', async () => {
  global.fetch = mockAnthropic({
    verification: { ecart_detecte: false, details: '' },
    cadrage: { soutien: {}, cible: {}, depassement: {} },
  })
  const req = () => handler(
    { method: 'POST', headers: { 'x-forwarded-for': '5.5.5.5' }, body: { ...bodyBase, phase: 'cadrage' } },
    mockRes(),
  )
  for (let i = 0; i < 30; i++) await req()
  const res = mockRes()
  await handler({ method: 'POST', headers: { 'x-forwarded-for': '5.5.5.5' }, body: { ...bodyBase, phase: 'cadrage' } }, res)
  expect(res.statusCode).toBe(429)
})
