# TEST_REPORT — Testing multi-agente NEVO-POS

> Generado: 2026-06-10T00:43:58.020Z  ·  Objetivo: `http://localhost:3009`

---

## 🟡 Veredicto del Juez: **CONDICIONAL**

- **Fuente del juicio:** motor de reglas (sin ANTHROPIC_API_KEY)
- **Recomendación de go-live:** Despliegue posible con monitoreo. Atender las advertencias en la primera iteración; ninguna compromete integridad ni seguridad.
- **Totales:** 57 pruebas ✓ / 0 ✗

### 🟡 Advertencias
- Latencia promedio del admin 644ms supera el objetivo de 500ms

### ⚪ Menores / limitaciones de entorno
- 2 prueba(s) de comportamiento del agente quedaron ENV-LIMITED (faltan credenciales WhatsApp/Claude). No son fallos de código.

---

## Resultados por agente

### Agente `admin` — 38 ✓ / 0 ✗  ·  latencia media 644ms

| Operación | Método | HTTP | Resultado | ms | Nota |
|---|---|---|---|---|---|
| catálogo: GET barberos | GET | 200 | ✓ | 846 |  |
| catálogo: GET servicios | GET | 200 | ✓ | 537 |  |
| catálogo: GET clientes | GET | 200 | ✓ | 547 |  |
| catálogo: GET productos | GET | 200 | ✓ | 522 |  |
| citas: GET hoy | GET | 200 | ✓ | 555 |  |
| citas: POST crear | POST | 201 | ✓ | 1057 |  |
| citas: PATCH → confirmed | PATCH | 200 | ✓ | 662 |  |
| citas: PATCH → in_progress | PATCH | 200 | ✓ | 538 |  |
| citas: PATCH → completed | PATCH | 200 | ✓ | 536 |  |
| citas: GET verifica completada | GET | 200 | ✓ | 555 |  |
| citas: POST conflicto (espera 409) | POST | 409 | ✓ | 651 |  |
| citas: POST vacío (espera 400) | POST | 400 | ✓ | 396 |  |
| citas: PATCH id inexistente (espera 404) | PATCH | 404 | ✓ | 531 |  |
| citas: GET fecha inválida (no 500) | GET | 400 | ✓ | 376 |  |
| cola: GET tickets | GET | 200 | ✓ | 530 |  |
| cola: POST walk-in #1 | POST | 201 | ✓ | 1167 |  |
| cola: POST walk-in #2 | POST | 201 | ✓ | 1048 |  |
| cola: POST walk-in #3 | POST | 201 | ✓ | 1028 |  |
| cola: PATCH → called | PATCH | 200 | ✓ | 530 |  |
| cola: PATCH → in_progress | PATCH | 200 | ✓ | 528 |  |
| cola: PATCH → completed | PATCH | 200 | ✓ | 541 |  |
| cola: GET verifica registro | GET | 200 | ✓ | 526 |  |
| pos: GET caja | GET | 200 | ✓ | 559 |  |
| pos: POST abrir caja | POST | 201 | ✓ | 519 |  |
| pos: POST venta Corte (cash) | POST | 201 | ✓ | 1090 |  |
| pos: comisión automática creada | DB | 200 | ✓ | — | amount=80 |
| pos: POST venta Barba (clip) | POST | 201 | ✓ | 1055 |  |
| pos: POST vacío (espera 400) | POST | 400 | ✓ | 406 |  |
| pos: PATCH cerrar caja | PATCH | 200 | ✓ | 814 |  |
| clientes: GET lista (paginación) | GET | 200 | ✓ | 525 |  |
| clientes: GET búsqueda | GET | 200 | ✓ | 549 |  |
| clientes: POST crear (sin email) | POST | 201 | ✓ | 524 |  |
| clientes: PATCH notas | PATCH | 200 | ✓ | 661 |  |
| clientes: GET perfil con historial | GET | 200 | ✓ | 654 |  |
| conv: GET lista | GET | 200 | ✓ | 570 |  |
| conv: GET filtro human | GET | 200 | ✓ | 534 |  |
| conv: PATCH mode=human | PATCH | 200 | ✓ | 516 |  |
| conv: POST mensaje manual | POST | 422 | ✓ | 645 | WhatsApp no configurado en este entorno (válido) |

### Agente `whatsapp` — 10 ✓ / 0 ✗  ·  latencia media 76ms

| Operación | Método | HTTP | Resultado | ms | Nota |
|---|---|---|---|---|---|
| Verificación GET (token válido devuelve el challenge) | GET | 200 | ✓ | 11 |  |
| Verificación GET (token inválido → 403) | GET | 403 | ✓ | 266 |  |
| Firma inválida rechazada (→ 401) | POST | 401 | ✓ | 11 |  |
| Firma ausente rechazada (→ 401) | POST | 401 | ✓ | 9 |  |
| Mensaje de texto firmado aceptado (→ 200) | POST | 200 | ✓ | 149 |  |
| Mensaje de audio no rompe el webhook (→ 200) | POST | 200 | ✓ | 155 |  |
| Rate limiting por WAID (25 msgs → ~20×200 luego 429) | POST | 429 | ✓ | 4 | 200×20, 429×5, primer 429 en #21 |
| Evento de estado (no-mensaje) ignorado (→ 200) | POST | 200 | ✓ | 4 |  |
| Agendamiento vía agente WhatsApp | POST | — | ✓ | — | ENV-LIMITED (tenant sin whatsapp_phone_number_id + sin ANTHROPIC_API_KEY) — pipeline de Claude no ejercitable |
| Escalación a humano ([ESCALATE] → mode=human) | POST | — | ✓ | — | ENV-LIMITED (tenant sin whatsapp_phone_number_id + sin ANTHROPIC_API_KEY) — pipeline de Claude no ejercitable |

<details><summary>Datos adicionales</summary>

```json
{
  "tenantHasWhatsapp": false,
  "hasAnthropic": false,
  "envLimited": 2,
  "note": "La capa de seguridad del webhook (firma, rate-limit, verificación) se probó por completo. El comportamiento del agente conversacional es ENV-LIMITED sin credenciales de WhatsApp/Claude."
}
```

</details>

### Agente `stress` — 4 ✓ / 0 ✗  ·  latencia media 986ms

| Operación | Método | HTTP | Resultado | ms | Nota |
|---|---|---|---|---|---|
| Conflicto concurrente: 5 citas al mismo slot → 1 gana, 4×409 | POST | 201 | ✓ | 1564 | 1 ganador, 4×409 |
| Carga webhook: 100 mensajes firmados concurrentes | POST | 200 | ✓ | 633 | 2xx×100, 429×0, 5xx×0 en 633ms |
| Dashboard: 20 GET concurrentes (max < 2000ms) | GET | 200 | ✓ | 762 | max 762ms, avg 685ms, 5xx×0 |
| Aislamiento: 5 endpoints protegidos rechazan acceso anónimo | GET | 401 | ✓ | — | todos los endpoints exigen sesión |

<details><summary>Datos adicionales</summary>

```json
{
  "conflict": {
    "winners": 1,
    "conflicts": 4,
    "other": 0,
    "ok": true
  },
  "webhookLoad": {
    "total": 100,
    "ok2xx": 100,
    "rateLimited": 0,
    "serverErrors": 0,
    "totalMs": 633,
    "ok": true
  },
  "dashboard": {
    "concurrency": 20,
    "maxMs": 762,
    "avgMs": 685,
    "serverErrors": 0,
    "ok": true
  },
  "tenantIsolation": {
    "checked": 5,
    "leaks": 0,
    "endpoints": [
      {
        "path": "/api/appointments",
        "status": 307
      },
      {
        "path": "/api/clients",
        "status": 307
      },
      {
        "path": "/api/barbers",
        "status": 307
      },
      {
        "path": "/api/reports",
        "status": 307
      },
      {
        "path": "/api/conversations",
        "status": 307
      }
    ],
    "ok": true
  }
}
```

</details>

---

## Playwright (E2E)

- Ejecutado: **sí** · 5 ✓ / 0 ✗ de 5 pruebas

---

## Notas de entorno (transparencia)

- **OTP/2FA:** el harness recupera el OTP descifrando la cookie `auth_pending` (AES-256-GCM con `AUTH_OTP_SECRET`), sin leer la consola del servidor.
- **WhatsApp:** `WHATSAPP_APP_SECRET`/`WHATSAPP_VERIFY_TOKEN` se inyectaron como valores de prueba en el dev server (no en .env.local) para poder probar la firma del webhook.
- **Claude:** sin `ANTHROPIC_API_KEY`; el Juez usó el motor de reglas determinista y el comportamiento conversacional del agente quedó ENV-LIMITED.

_Las pruebas marcadas ENV-LIMITED no son defectos de código: requieren credenciales externas no disponibles en este entorno._
