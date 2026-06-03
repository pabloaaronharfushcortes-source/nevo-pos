import { describe, it, expect } from 'vitest'
import { parseAgentText } from './agent'

describe('parseAgentText', () => {
  it('devuelve el texto tal cual cuando no hay tags', () => {
    const r = parseAgentText('Hola, claro que sí, ¿a qué hora te acomoda?')
    expect(r.text).toBe('Hola, claro que sí, ¿a qué hora te acomoda?')
    expect(r.escalate).toBe(false)
    expect(r.appointment).toBeNull()
  })

  it('detecta [ESCALATE] al inicio y lo remueve del texto', () => {
    const r = parseAgentText('[ESCALATE] Te conecto con el equipo, un momento.')
    expect(r.escalate).toBe(true)
    expect(r.text).toBe('Te conecto con el equipo, un momento.')
  })

  it('no escala si [ESCALATE] no está al inicio', () => {
    const r = parseAgentText('Claro, no hay problema [ESCALATE]')
    expect(r.escalate).toBe(false)
  })

  it('extrae el bloque <APPOINTMENT> y lo quita del texto visible', () => {
    const raw = '¡Listo! Te agendo con Carlos.\n<APPOINTMENT>{"barberId":"b-1","serviceId":"s-1","startsAt":"2026-06-04T15:00:00-06:00"}</APPOINTMENT>'
    const r = parseAgentText(raw)
    expect(r.appointment).toEqual({
      barberId: 'b-1',
      serviceId: 's-1',
      startsAt: '2026-06-04T15:00:00-06:00',
      clientName: undefined,
    })
    expect(r.text).toBe('¡Listo! Te agendo con Carlos.')
    expect(r.text).not.toContain('APPOINTMENT')
  })

  it('incluye clientName cuando el cliente es nuevo', () => {
    const raw = 'Perfecto.\n<APPOINTMENT>{"barberId":"b-1","serviceId":"s-1","startsAt":"2026-06-04T15:00:00-06:00","clientName":"Juan Pérez"}</APPOINTMENT>'
    const r = parseAgentText(raw)
    expect(r.appointment?.clientName).toBe('Juan Pérez')
  })

  it('ignora un bloque <APPOINTMENT> con JSON malformado pero limpia el texto', () => {
    const raw = 'Texto.\n<APPOINTMENT>{no es json}</APPOINTMENT>'
    const r = parseAgentText(raw)
    expect(r.appointment).toBeNull()
    expect(r.text).toBe('Texto.')
  })

  it('ignora el bloque si faltan campos requeridos', () => {
    const raw = 'Texto.\n<APPOINTMENT>{"barberId":"b-1"}</APPOINTMENT>'
    const r = parseAgentText(raw)
    expect(r.appointment).toBeNull()
  })

  it('maneja escalación y cita en el mismo mensaje', () => {
    const raw = '[ESCALATE] Caso especial.\n<APPOINTMENT>{"barberId":"b-1","serviceId":"s-1","startsAt":"2026-06-04T15:00:00-06:00"}</APPOINTMENT>'
    const r = parseAgentText(raw)
    expect(r.escalate).toBe(true)
    expect(r.appointment).not.toBeNull()
    expect(r.text).toBe('Caso especial.')
  })
})
