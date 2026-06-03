import type { Tenant, Client, Barber, Service } from '@/types/app'
import type { BarberAvailability } from '@/lib/utils/slots'

// Cliente identificado con datos de contexto para el agente
export type AgentClient = Pick<
  Client,
  'id' | 'name' | 'classification' | 'loyalty_stamps' | 'preferred_barber_id'
> & { visitCount: number; preferredBarberName: string | null }

const TZ = 'America/Mexico_City'

// Formatea la disponibilidad de forma legible para el modelo
function formatAvailability(availability: BarberAvailability[], timezone: string): string {
  if (availability.length === 0) return 'Sin barberos activos en este momento.'

  const lines: string[] = []
  for (const barber of availability) {
    if (barber.slots.length === 0) {
      lines.push(`• ${barber.barberName} (id: ${barber.barberId}): sin huecos disponibles.`)
      continue
    }
    const slotStrs = barber.slots.slice(0, 8).map(s => {
      const day = s.start.toLocaleDateString('es-MX', { weekday: 'short', day: '2-digit', month: 'short', timeZone: timezone })
      const startH = s.start.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', timeZone: timezone })
      const endH = s.end.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', timeZone: timezone })
      return `${day} ${startH}–${endH}`
    })
    lines.push(`• ${barber.barberName} (id: ${barber.barberId}): ${slotStrs.join(' · ')}`)
  }
  return lines.join('\n')
}

// Catálogo de servicios para que el agente conozca ids, precios y duración
function formatServices(services: Service[]): string {
  if (services.length === 0) return 'Sin servicios configurados.'
  return services
    .map(s => `• ${s.name} (id: ${s.id}) — $${Number(s.price).toFixed(2)} · ${s.duration_minutes} min`)
    .join('\n')
}

type BuildParams = {
  tenant: Pick<Tenant, 'agent_knowledge_base' | 'timezone' | 'name'>
  client: AgentClient | null
  availability: BarberAvailability[]
  services: Service[]
  barbers: Pick<Barber, 'id' | 'name'>[]
}

// Construye el system prompt completo del agente (per CLAUDE.md §7).
export function buildSystemPrompt({ tenant, client, availability, services, barbers }: BuildParams): string {
  const timezone = tenant.timezone || TZ
  const now = new Date().toLocaleString('es-MX', { timeZone: timezone, dateStyle: 'full', timeStyle: 'short' })

  const clientBlock = client
    ? `Nombre: ${client.name}
Visitas previas: ${client.visitCount}
Barbero preferido: ${client.preferredBarberName ?? 'Sin preferencia'}
Clasificación: ${client.classification}
Sellos de lealtad: ${client.loyalty_stamps}`
    : 'Cliente nuevo — no está registrado en el sistema.'

  return `${tenant.agent_knowledge_base ?? `Eres el asistente de ${tenant.name}.`}

---
FECHA Y HORA ACTUAL: ${now} (${timezone})

---
CATÁLOGO DE SERVICIOS:
${formatServices(services)}

---
BARBEROS:
${barbers.map(b => `• ${b.name} (id: ${b.id})`).join('\n')}

---
DISPONIBILIDAD ACTUAL DE LA AGENDA (próximas 48 horas):
${formatAvailability(availability, timezone)}

---
CLIENTE ACTUAL:
${clientBlock}

---
INSTRUCCIÓN DE ESCALACIÓN:
Si determinas que debes escalar la conversación (según las reglas del Knowledge Base),
responde con [ESCALATE] al inicio de tu mensaje.
Ejemplo: "[ESCALATE] Para este caso te conecto con alguien del equipo, un momento."
El sistema procesará el tag automáticamente.

---
HERRAMIENTAS DISPONIBLES:
Puedes crear citas directamente. Para hacerlo, incluye al final de tu mensaje un bloque:
<APPOINTMENT>{"barberId":"<uuid>","serviceId":"<uuid>","startsAt":"<ISO 8601 con offset>","clientName":"<nombre>"}</APPOINTMENT>
Reglas para crear citas:
- Usa SIEMPRE un barberId y serviceId de las listas de arriba (nunca inventes ids).
- startsAt debe caer dentro de un hueco disponible del barbero elegido.
- Incluye "clientName" solo si el cliente es nuevo (no registrado); pídele su nombre antes.
- Confirma con el cliente el servicio, barbero y hora ANTES de emitir el bloque.
- El sistema validará el horario y confirmará la cita; si hay conflicto te lo informará.
- El texto de tu mensaje debe confirmar la cita de forma natural, sin mostrar el JSON.`
}
