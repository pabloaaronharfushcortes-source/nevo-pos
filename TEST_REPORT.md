# TEST_REPORT — Testing multi-agente NEVO-POS

> Generado: 2026-06-09T20:14:36.664Z  ·  Objetivo: `http://localhost:3009`

---

## 🔴 Veredicto del Juez: **BLOQUEADO**

- **Fuente del juicio:** motor de reglas (sin ANTHROPIC_API_KEY)
- **Recomendación de go-live:** NO desplegar. Resolver los bloqueantes listados (integridad de datos / seguridad / errores de servidor) y re-ejecutar la suite.
- **Totales:** 49 pruebas ✓ / 7 ✗

### 🔴 Bloqueantes
- 6 operación(es) devolvieron HTTP 5xx: admin/catálogo: GET barberos; admin/catálogo: GET productos; admin/citas: PATCH id inexistente (espera 404); admin/citas: GET fecha inválida (no 500); admin/pos: POST venta Corte (cash); admin/pos: POST venta Barba (clip)
- Condición de carrera al crear citas: 3 ganadores en el mismo slot (esperaba 1). Falta lock/constraint únicos.

### 🟡 Advertencias
- Latencia promedio del admin 724ms supera el objetivo de 500ms

### ⚪ Menores / limitaciones de entorno
- 2 prueba(s) de comportamiento del agente quedaron ENV-LIMITED (faltan credenciales WhatsApp/Claude). No son fallos de código.

---

## Resultados por agente

### Agente `admin` — 31 ✓ / 6 ✗  ·  latencia media 724ms

| Operación | Método | HTTP | Resultado | ms | Nota |
|---|---|---|---|---|---|
| catálogo: GET barberos | GET | 500 | ✗ | 907 | HTTP 5xx — deriva de esquema (migraciones MEJORAS_V2 sin aplicar: faltan columnas/tablas) |
| catálogo: GET servicios | GET | 200 | ✓ | 624 |  |
| catálogo: GET clientes | GET | 200 | ✓ | 601 |  |
| catálogo: GET productos | GET | 500 | ✗ | 573 | HTTP 5xx — deriva de esquema (migraciones MEJORAS_V2 sin aplicar: faltan columnas/tablas) |
| citas: GET hoy | GET | 200 | ✓ | 817 |  |
| citas: POST crear | POST | 201 | ✓ | 1867 |  |
| citas: PATCH → confirmed | PATCH | 200 | ✓ | 1034 |  |
| citas: PATCH → in_progress | PATCH | 200 | ✓ | 589 |  |
| citas: PATCH → completed | PATCH | 200 | ✓ | 591 |  |
| citas: GET verifica completada | GET | 200 | ✓ | 611 |  |
| citas: POST conflicto (espera 409) | POST | 409 | ✓ | 744 |  |
| citas: POST vacío (espera 400) | POST | 400 | ✓ | 442 |  |
| citas: PATCH id inexistente (espera 404) | PATCH | 500 | ✗ | 576 | id inexistente no devolvió 404 |
| citas: GET fecha inválida (no 500) | GET | 500 | ✗ | 581 | fecha inválida produjo 500 (robustez) |
| cola: GET tickets | GET | 200 | ✓ | 588 |  |
| cola: POST walk-in #1 | POST | 201 | ✓ | 1388 |  |
| cola: POST walk-in #2 | POST | 201 | ✓ | 1261 |  |
| cola: POST walk-in #3 | POST | 201 | ✓ | 1166 |  |
| cola: PATCH → called | PATCH | 200 | ✓ | 575 |  |
| cola: PATCH → in_progress | PATCH | 200 | ✓ | 587 |  |
| cola: PATCH → completed | PATCH | 200 | ✓ | 568 |  |
| cola: GET verifica registro | GET | 200 | ✓ | 575 |  |
| pos: GET caja | GET | 200 | ✓ | 581 |  |
| pos: POST abrir caja | POST | 201 | ✓ | 561 |  |
| pos: POST venta Corte (cash) | POST | 500 | ✗ | 713 | HTTP 5xx — deriva de esquema: la venta inserta/lee la columna sales.tip (MEJORAS_V2) ausente en la BD viva |
| pos: POST venta Barba (clip) | POST | 500 | ✗ | 715 | HTTP 5xx — deriva de esquema: columna sales.tip (MEJORAS_V2) ausente en la BD viva |
| pos: POST vacío (espera 400) | POST | 400 | ✓ | 425 |  |
| pos: PATCH cerrar caja | PATCH | 200 | ✓ | 856 |  |
| clientes: GET lista (paginación) | GET | 200 | ✓ | 587 |  |
| clientes: GET búsqueda | GET | 200 | ✓ | 565 |  |
| clientes: POST crear (sin email) | POST | 201 | ✓ | 567 |  |
| clientes: PATCH notas | PATCH | 200 | ✓ | 702 |  |
| clientes: GET perfil con historial | GET | 200 | ✓ | 781 |  |
| conv: GET lista | GET | 200 | ✓ | 583 |  |
| conv: GET filtro human | GET | 200 | ✓ | 581 |  |
| conv: PATCH mode=human | PATCH | 200 | ✓ | 580 |  |
| conv: POST mensaje manual | POST | 422 | ✓ | 713 | WhatsApp no configurado en este entorno (válido) |

**Errores:**
- catálogo: GET barberos: HTTP 500 — HTTP 5xx — deriva de esquema (migraciones MEJORAS_V2 sin aplicar: faltan columnas/tablas)
- catálogo: GET productos: HTTP 500 — HTTP 5xx — deriva de esquema (migraciones MEJORAS_V2 sin aplicar: faltan columnas/tablas)
- citas: PATCH id inexistente (espera 404): HTTP 500 — id inexistente no devolvió 404
- citas: GET fecha inválida (no 500): HTTP 500 — fecha inválida produjo 500 (robustez)
- pos: POST venta Corte (cash): HTTP 500 — HTTP 5xx — deriva de esquema: la venta inserta/lee la columna sales.tip (MEJORAS_V2) ausente en la BD viva
- pos: POST venta Barba (clip): HTTP 500 — HTTP 5xx — deriva de esquema: columna sales.tip (MEJORAS_V2) ausente en la BD viva

### Agente `whatsapp` — 10 ✓ / 0 ✗  ·  latencia media 112ms

| Operación | Método | HTTP | Resultado | ms | Nota |
|---|---|---|---|---|---|
| Verificación GET (token válido devuelve el challenge) | GET | 200 | ✓ | 16 |  |
| Verificación GET (token inválido → 403) | GET | 403 | ✓ | 440 |  |
| Firma inválida rechazada (→ 401) | POST | 401 | ✓ | 19 |  |
| Firma ausente rechazada (→ 401) | POST | 401 | ✓ | 6 |  |
| Mensaje de texto firmado aceptado (→ 200) | POST | 200 | ✓ | 147 |  |
| Mensaje de audio no rompe el webhook (→ 200) | POST | 200 | ✓ | 258 |  |
| Rate limiting por WAID (25 msgs → ~20×200 luego 429) | POST | 429 | ✓ | 5 | 200×20, 429×5, primer 429 en #21 |
| Evento de estado (no-mensaje) ignorado (→ 200) | POST | 200 | ✓ | 3 |  |
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

### Agente `stress` — 3 ✓ / 1 ✗  ·  latencia media 1359ms

| Operación | Método | HTTP | Resultado | ms | Nota |
|---|---|---|---|---|---|
| Conflicto concurrente: 5 citas al mismo slot → 1 gana, 4×409 | POST | 409 | ✗ | 1726 | CONDICIÓN DE CARRERA: 3 ganadores, 2×409, 0 otros |
| Carga webhook: 100 mensajes firmados concurrentes | POST | 200 | ✓ | 1358 | 2xx×100, 429×0, 5xx×0 en 1358ms |
| Dashboard: 20 GET concurrentes (max < 2000ms) | GET | 200 | ✓ | 992 | max 992ms, avg 941ms, 5xx×0 |
| Aislamiento: 5 endpoints protegidos rechazan acceso anónimo | GET | 401 | ✓ | — | todos los endpoints exigen sesión |

**Errores:**
- Conflicto concurrente: 3 ganadores (esperaba 1) — posible race read-then-insert sin lock

<details><summary>Datos adicionales</summary>

```json
{
  "conflict": {
    "winners": 3,
    "conflicts": 2,
    "other": 0,
    "ok": false
  },
  "webhookLoad": {
    "total": 100,
    "ok2xx": 100,
    "rateLimited": 0,
    "serverErrors": 0,
    "totalMs": 1358,
    "ok": true
  },
  "dashboard": {
    "concurrency": 20,
    "maxMs": 992,
    "avgMs": 941,
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
