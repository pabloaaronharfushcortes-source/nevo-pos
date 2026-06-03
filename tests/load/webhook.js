import http from 'k6/http'
import crypto from 'k6/crypto'
import { check } from 'k6'

// Test de carga del webhook de WhatsApp (CLAUDE.md §13).
//
// Envía eventos de tipo "statuses" (no "messages"): pasan la verificación de
// firma pero el webhook los ignora con 200 sin invocar a Claude. Así medimos el
// throughput y la latencia de la capa de verificación + rate limiting sin gastar
// tokens del agente.
//
// Uso:
//   k6 run -e BASE_URL=http://localhost:3000 -e APP_SECRET=xxx tests/load/webhook.js

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'
const APP_SECRET = __ENV.APP_SECRET || ''

export const options = {
  scenarios: {
    ramp: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 20 },
        { duration: '1m', target: 50 },
        { duration: '30s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<800'],   // p95 por debajo de 800ms
    checks: ['rate>0.95'],              // ≥95% de checks correctos
  },
}

function buildPayload(i) {
  return JSON.stringify({
    entry: [{
      changes: [{
        field: 'statuses',
        value: {
          metadata: { phone_number_id: 'load-test' },
          statuses: [{ id: `wamid.load-${i}`, status: 'delivered' }],
        },
      }],
    }],
  })
}

function sign(body) {
  if (!APP_SECRET) return ''
  return 'sha256=' + crypto.hmac('sha256', APP_SECRET, body, 'hex')
}

export default function () {
  const body = buildPayload(__ITER)
  const res = http.post(`${BASE_URL}/api/webhooks/whatsapp`, body, {
    headers: {
      'Content-Type': 'application/json',
      'x-hub-signature-256': sign(body),
    },
  })

  // Con firma válida y evento ignorado → 200; sin APP_SECRET → 401 (firma inválida)
  check(res, {
    'status esperado (200 con firma, 401 sin ella)': r =>
      APP_SECRET ? r.status === 200 : r.status === 401,
  })
}
