/**
 * Seed de Mercurio Barbería (tenant 0)
 *
 * Uso: npm run seed
 * Advertencia: borra y recrea todos los datos del tenant mercurio-barberia.
 */

import { createClient } from '@supabase/supabase-js'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Database } from '../types/database'

// ─── env ─────────────────────────────────────────────────────────────────────

function loadEnv(): Record<string, string> {
  const path = resolve(process.cwd(), '.env.local')
  if (!existsSync(path)) return {}
  const out: Record<string, string> = {}
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq === -1) continue
    let v = t.slice(eq + 1).trim()
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1)
    out[t.slice(0, eq).trim()] = v
  }
  return out
}

const env = loadEnv()
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY ?? ''

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local')
  process.exit(1)
}

const db = createClient<Database>(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false }
})

// ─── datos estáticos ──────────────────────────────────────────────────────────

const TENANT_SLUG = 'mercurio-barberia'

const KB = readFileSync(resolve(process.cwd(), 'references/mercurio_knowledge_base.md'), 'utf8')

const TENANT = {
  name: 'Mercurio Barbería',
  slug: TENANT_SLUG,
  address: 'C. Juan Manuel 310, Zapopan Centro, Jalisco',
  phone: '+523314000000',
  email: 'contacto@barberiamercurio.com',
  website: 'https://www.barberiamercurio.com',
  timezone: 'America/Mexico_City',
  late_tolerance_minutes: 10,
  appointment_buffer_minutes: 5,
  agent_knowledge_base: KB,
  is_active: true,
}

// Catálogo real de Mercurio Barbería
const SERVICES = [
  { name: 'Corte de cabello',              price: 200,  duration_minutes: 45,  category: 'Corte',       sort_order: 1 },
  { name: 'Arreglo de barba',              price: 150,  duration_minutes: 25,  category: 'Barba',       sort_order: 2 },
  { name: 'Arreglo de ceja',               price: 20,   duration_minutes: 10,  category: 'Complemento', sort_order: 3 },
  { name: 'Paquete Facial Detox',          price: 100,  duration_minutes: 20,  category: 'Tratamiento', sort_order: 4 },
  { name: 'Paquete Premium',               price: 450,  duration_minutes: 105, category: 'Combo',       sort_order: 5 },
  { name: 'Paquete Ondulación Permanente', price: 1250, duration_minutes: 150, category: 'Tratamiento', sort_order: 6 },
  { name: 'Paquete Alaciado Permanente',   price: 1500, duration_minutes: 180, category: 'Tratamiento', sort_order: 7 },
  { name: 'Mechas',                        price: 1400, duration_minutes: 120, category: 'Tratamiento', sort_order: 8 },
]

// Productos de reventa (inventario). Algunos con stock bajo a propósito para
// demostrar la alerta de inventario del panel de configuración.
const PRODUCTS = [
  { name: 'Pomada mate 100g',        price: 220, cost: 110, stock_quantity: 18, stock_minimum: 5,  unit: 'pieza' },
  { name: 'Cera modeladora 80g',     price: 180, cost: 90,  stock_quantity: 4,  stock_minimum: 5,  unit: 'pieza' },
  { name: 'Shampoo anticaspa 250ml', price: 160, cost: 80,  stock_quantity: 12, stock_minimum: 4,  unit: 'pieza' },
  { name: 'Aceite para barba 30ml',  price: 240, cost: 120, stock_quantity: 2,  stock_minimum: 3,  unit: 'pieza' },
  { name: 'Loción after shave 120ml',price: 200, cost: 95,  stock_quantity: 9,  stock_minimum: 4,  unit: 'pieza' },
  { name: 'Peine de carbono',        price: 90,  cost: 35,  stock_quantity: 25, stock_minimum: 6,  unit: 'pieza' },
]

// Placeholders — confirmar nombres reales con el negocio
const BARBERS = [
  { name: 'Barbero1', commission_rate: 40, sort_order: 1 },
  { name: 'Barbero2', commission_rate: 45, sort_order: 2 },
  { name: 'Barbero3', commission_rate: 40, sort_order: 3 },
]

// Horario real: Lun-Sáb 11-20, Dom 10-16
const SCHEDULE = [
  { day_of_week: 0, start_time: '10:00', end_time: '16:00' },
  { day_of_week: 1, start_time: '11:00', end_time: '20:00' },
  { day_of_week: 2, start_time: '11:00', end_time: '20:00' },
  { day_of_week: 3, start_time: '11:00', end_time: '20:00' },
  { day_of_week: 4, start_time: '11:00', end_time: '20:00' },
  { day_of_week: 5, start_time: '11:00', end_time: '20:00' },
  { day_of_week: 6, start_time: '11:00', end_time: '20:00' },
]

// 30 clientes con nombres mexicanos realistas
const CLIENTS = [
  { name: 'Alejandro García Martínez',    phone: '+523314561001', email: 'alejandro.garcia@gmail.com',     classification: 'vip',       loyalty_stamps: 8,  total_spent: 2400 },
  { name: 'Carlos López Hernández',       phone: '+523314561002', email: 'carlos.lopez@hotmail.com',       classification: 'recurrent', loyalty_stamps: 5,  total_spent: 1200 },
  { name: 'Miguel Torres Sánchez',        phone: '+523314561003', email: 'miguel.torres@gmail.com',        classification: 'recurrent', loyalty_stamps: 3,  total_spent: 850  },
  { name: 'Luis Ramírez Flores',          phone: '+523314561004', email: 'luis.ramirez@outlook.com',       classification: 'recurrent', loyalty_stamps: 6,  total_spent: 1600 },
  { name: 'José González Pérez',          phone: '+523314561005', email: 'jose.gonzalez@gmail.com',        classification: 'vip',       loyalty_stamps: 10, total_spent: 3200 },
  { name: 'Juan Morales Cruz',            phone: '+523314561006', email: 'juan.morales@gmail.com',         classification: 'recurrent', loyalty_stamps: 4,  total_spent: 980  },
  { name: 'Andrés Reyes Rivera',          phone: '+523314561007', email: 'andres.reyes@hotmail.com',       classification: 'new',       loyalty_stamps: 1,  total_spent: 200  },
  { name: 'Diego Jiménez Gutiérrez',      phone: '+523314561008', email: 'diego.jimenez@gmail.com',        classification: 'recurrent', loyalty_stamps: 5,  total_spent: 1400 },
  { name: 'Fernando Mendoza Vargas',      phone: '+523314561009', email: 'fernando.mendoza@gmail.com',     classification: 'recurrent', loyalty_stamps: 3,  total_spent: 720  },
  { name: 'Eduardo Castillo Ramos',       phone: '+523314561010', email: 'eduardo.castillo@outlook.com',   classification: 'new',       loyalty_stamps: 0,  total_spent: 0    },
  { name: 'Ricardo Silva Ortega',         phone: '+523314561011', email: 'ricardo.silva@gmail.com',        classification: 'recurrent', loyalty_stamps: 7,  total_spent: 1950 },
  { name: 'Roberto Aguilar Ruiz',         phone: '+523314561012', email: 'roberto.aguilar@hotmail.com',    classification: 'recurrent', loyalty_stamps: 2,  total_spent: 560  },
  { name: 'Manuel Díaz Fuentes',          phone: '+523314561013', email: 'manuel.diaz@gmail.com',          classification: 'recurrent', loyalty_stamps: 4,  total_spent: 1100 },
  { name: 'Jorge Medina Soto',            phone: '+523314561014', email: 'jorge.medina@gmail.com',         classification: 'vip',       loyalty_stamps: 9,  total_spent: 2800 },
  { name: 'Marco Romero Herrera',         phone: '+523314561015', email: 'marco.romero@outlook.com',       classification: 'recurrent', loyalty_stamps: 3,  total_spent: 840  },
  { name: 'Sergio Vega Luna',             phone: '+523314561016', email: 'sergio.vega@gmail.com',          classification: 'recurrent', loyalty_stamps: 5,  total_spent: 1250 },
  { name: 'Héctor Guerrero Rojas',        phone: '+523314561017', email: 'hector.guerrero@hotmail.com',    classification: 'new',       loyalty_stamps: 1,  total_spent: 280  },
  { name: 'Arturo Campos Espinoza',       phone: '+523314561018', email: 'arturo.campos@gmail.com',        classification: 'recurrent', loyalty_stamps: 6,  total_spent: 1680 },
  { name: 'Rafael Mora Contreras',        phone: '+523314561019', email: 'rafael.mora@gmail.com',          classification: 'recurrent', loyalty_stamps: 2,  total_spent: 600  },
  { name: 'Pablo Ríos Domínguez',         phone: '+523314561020', email: 'pablo.rios@outlook.com',         classification: 'recurrent', loyalty_stamps: 4,  total_spent: 960  },
  { name: 'Daniel Salinas Méndez',        phone: '+523314561021', email: 'daniel.salinas@gmail.com',       classification: 'new',       loyalty_stamps: 0,  total_spent: 0    },
  { name: 'Antonio Rueda Cervantes',      phone: '+523314561022', email: 'antonio.rueda@hotmail.com',      classification: 'recurrent', loyalty_stamps: 3,  total_spent: 780  },
  { name: 'Rodrigo Sandoval Ponce',       phone: '+523314561023', email: 'rodrigo.sandoval@gmail.com',     classification: 'recurrent', loyalty_stamps: 5,  total_spent: 1350 },
  { name: 'Víctor Muñoz Delgado',         phone: '+523314561024', email: 'victor.munoz@gmail.com',         classification: 'vip',       loyalty_stamps: 8,  total_spent: 2600 },
  { name: 'Ernesto Villarreal Estrada',   phone: '+523314561025', email: 'ernesto.villarreal@outlook.com', classification: 'recurrent', loyalty_stamps: 2,  total_spent: 480  },
  { name: 'Gabriel Zúñiga Nava',          phone: '+523314561026', email: 'gabriel.zuniga@gmail.com',       classification: 'new',       loyalty_stamps: 1,  total_spent: 220  },
  { name: 'Oscar Pedraza Miranda',        phone: '+523314561027', email: 'oscar.pedraza@hotmail.com',      classification: 'recurrent', loyalty_stamps: 4,  total_spent: 1020 },
  { name: 'Francisco Ibarra Solís',       phone: '+523314561028', email: 'francisco.ibarra@gmail.com',     classification: 'recurrent', loyalty_stamps: 6,  total_spent: 1520 },
  { name: 'Javier Núñez Tapia',           phone: '+523314561029', email: 'javier.nunez@outlook.com',       classification: 'recurrent', loyalty_stamps: 3,  total_spent: 760  },
  { name: 'Mario Cárdenas Benítez',       phone: '+523314561030', email: 'mario.cardenas@gmail.com',       classification: 'recurrent', loyalty_stamps: 5,  total_spent: 1300 },
]

// ─── helpers ──────────────────────────────────────────────────────────────────

// Crea un ISO string para un día offset + hora local (México CDT = UTC-6)
function isoMx(daysOffset: number, hour: number, minute = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + daysOffset)
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const dy = String(d.getDate()).padStart(2, '0')
  const hh = String(hour).padStart(2, '0')
  const mn = String(minute).padStart(2, '0')
  return `${y}-${mo}-${dy}T${hh}:${mn}:00-06:00`
}

// Suma durationMinutes a startHour:00 y devuelve ISO correcto
function isoMxEnd(daysOffset: number, startHour: number, durationMinutes: number): string {
  const total = startHour * 60 + durationMinutes
  return isoMx(daysOffset, Math.floor(total / 60), total % 60)
}

// Fecha ISO solo (YYYY-MM-DD) para un día offset
function isoDate(daysOffset: number): string {
  const d = new Date()
  d.setDate(d.getDate() + daysOffset)
  return d.toISOString().split('T')[0]
}

// Quincena del mes para la fecha dada
function quincena(daysOffset: number): { period_start: string; period_end: string } {
  const d = new Date()
  d.setDate(d.getDate() + daysOffset)
  const y = d.getFullYear()
  const m = d.getMonth()
  const day = d.getDate()
  if (day <= 15) {
    return {
      period_start: new Date(y, m, 1).toISOString().split('T')[0],
      period_end:   new Date(y, m, 15).toISOString().split('T')[0],
    }
  }
  return {
    period_start: new Date(y, m, 16).toISOString().split('T')[0],
    period_end:   new Date(y, m + 1, 0).toISOString().split('T')[0],
  }
}

// Método de pago determinístico según índice (22 cash, 10 clip, 4 getnet, 4 transfer)
const PAYMENT_CYCLE = [
  'cash','cash','cash','cash','cash',
  'cash','clip','clip','cash','cash',
  'cash','cash','cash','clip','clip',
  'clip','clip','cash','cash','cash',
  'cash','cash','getnet','getnet','cash',
  'cash','transfer','transfer','cash','cash',
  'cash','clip','clip','cash','getnet',
  'getnet','transfer','transfer','cash','cash',
] as const

// Para inserts con .select() — devuelve array no nulo
function rows<T>(result: { data: T[] | null; error: unknown }, label: string): T[] {
  if (result.error) { console.error(`✗ ${label}:`, result.error); process.exit(1) }
  if (!result.data) { console.error(`✗ ${label}: sin datos`); process.exit(1) }
  return result.data
}

// Para inserts sin .select() — solo valida ausencia de error
function run(result: { data: unknown; error: unknown }, label: string): void {
  if (result.error) { console.error(`✗ ${label}:`, result.error); process.exit(1) }
}

// ─── limpieza ─────────────────────────────────────────────────────────────────

async function wipeTenant(tenantId: string) {
  // Orden inverso a FK: mensajes → conversaciones → comisiones →
  // sale_items → sales → cash_registers → citas → tickets →
  // clientes → barber_schedules → barbers → services → users (auth) → tenant
  const steps: Array<{ table: string; field: string }> = [
    { table: 'messages',        field: 'conversation_id' },
    { table: 'conversations',   field: 'tenant_id' },
    { table: 'commissions',     field: 'tenant_id' },
    { table: 'sale_items',      field: 'sale_id' },
    { table: 'sales',           field: 'tenant_id' },
    { table: 'cash_registers',  field: 'tenant_id' },
    { table: 'appointments',    field: 'tenant_id' },
    { table: 'queue_tickets',   field: 'tenant_id' },
    { table: 'clients',         field: 'tenant_id' },
    { table: 'barber_schedules', field: 'barber_id' },
    { table: 'barbers',         field: 'tenant_id' },
    { table: 'services',        field: 'tenant_id' },
    { table: 'products',        field: 'tenant_id' },
  ]

  // messages y sale_items no tienen tenant_id directo — los borramos vía joins
  const { data: convIds } = await db.from('conversations').select('id').eq('tenant_id', tenantId)
  if (convIds?.length) {
    await db.from('messages').delete().in('conversation_id', convIds.map(c => c.id))
  }
  const { data: saleIds } = await db.from('sales').select('id').eq('tenant_id', tenantId)
  if (saleIds?.length) {
    await db.from('sale_items').delete().in('sale_id', saleIds.map(s => s.id))
  }
  const { data: barberIds } = await db.from('barbers').select('id').eq('tenant_id', tenantId)
  if (barberIds?.length) {
    await db.from('barber_schedules').delete().in('barber_id', barberIds.map(b => b.id))
  }

  for (const { table, field } of steps.filter(s =>
    !['messages','sale_items','barber_schedules'].includes(s.table)
  )) {
    await (db.from(table as 'tenants') as ReturnType<typeof db.from>)
      .delete()
      .eq(field, tenantId)
  }

  // Borrar usuario admin de auth si existe
  const { data: users } = await db.from('users').select('id').eq('tenant_id', tenantId)
  if (users?.length) {
    for (const u of users) {
      await db.auth.admin.deleteUser(u.id)
    }
  }

  await db.from('tenants').delete().eq('id', tenantId)
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seed: Mercurio Barbería\n')

  // ── idempotencia ──────────────────────────────────────────────────────────
  const { data: existing } = await db.from('tenants').select('id').eq('slug', TENANT_SLUG).maybeSingle()
  if (existing?.id) {
    console.log('  Tenant existente detectado — limpiando datos anteriores...')
    await wipeTenant(existing.id)
    console.log('  Limpieza completada.\n')
  }

  // ── 1. Tenant ─────────────────────────────────────────────────────────────
  const [tenant] = rows(
    await db.from('tenants').insert(TENANT).select('*'),
    'tenant'
  )
  console.log(`✓ Tenant: ${tenant.name} (${tenant.id})`)

  // ── 2. Admin auth user ────────────────────────────────────────────────────
  const { data: authData, error: authError } = await db.auth.admin.createUser({
    email: 'admin@mercuriobarberia.com',
    password: 'MercurioAdmin2026!',
    email_confirm: true,
  })
  if (authError) { console.error('✗ auth user:', authError); process.exit(1) }
  const authUser = authData.user!

  const [adminUser] = rows(
    await db.from('users').insert({
      id: authUser.id,
      tenant_id: tenant.id,
      role: 'admin',
      name: 'Administrador',
      email: 'admin@mercuriobarberia.com',
    }).select('*'),
    'admin user'
  )
  console.log(`✓ Admin: ${adminUser.email}  contraseña: MercurioAdmin2026!`)

  // ── 3. Servicios ──────────────────────────────────────────────────────────
  const services = rows(
    await db.from('services')
      .insert(SERVICES.map(s => ({ ...s, tenant_id: tenant.id, is_active: true })))
      .select('*'),
    'services'
  )
  console.log(`✓ Servicios: ${services.length}`)

  // ── 3b. Productos (inventario) ───────────────────────────────────────────
  // La migración de productos (Fase 2) puede no estar aplicada en este entorno.
  // Si la tabla no existe, se omite con aviso en lugar de abortar el seed.
  const productsRes = await db.from('products')
    .insert(PRODUCTS.map(p => ({ ...p, tenant_id: tenant.id, is_active: true })))
    .select('*')
  let products: Array<{ id: string }> = []
  if (productsRes.error) {
    console.warn(`⚠ Productos omitidos: ${(productsRes.error as { message?: string }).message ?? productsRes.error}`)
  } else {
    products = (productsRes.data ?? []) as Array<{ id: string }>
    console.log(`✓ Productos: ${products.length}`)
  }

  // ── 4. Barberos + horarios ────────────────────────────────────────────────
  const barbers = rows(
    await db.from('barbers')
      .insert(BARBERS.map(b => ({ ...b, tenant_id: tenant.id, is_active: true })))
      .select('*'),
    'barbers'
  )

  const scheduleRows = barbers.flatMap(b =>
    SCHEDULE.map(s => ({ barber_id: b.id, ...s }))
  )
  run(await db.from('barber_schedules').insert(scheduleRows), 'schedules')
  console.log(`✓ Barberos: ${barbers.length}  (${barbers.length * SCHEDULE.length} horarios)`)

  // ── 5. Clientes ───────────────────────────────────────────────────────────
  // Los 4 clientes VIP tienen barbero preferido asignado cíclicamente
  const clientRows = CLIENTS.map((c, i) => ({
    tenant_id:  tenant.id,
    name:       c.name,
    phone:      c.phone,
    email:      c.email,
    whatsapp_id: c.phone.replace('+', ''),
    classification: c.classification as 'new' | 'recurrent' | 'vip',
    loyalty_stamps: c.loyalty_stamps,
    total_spent: c.total_spent,
    preferred_barber_id: c.classification === 'vip' ? barbers[i % barbers.length].id : null,
    last_visit_at: c.total_spent > 0 ? isoMx(-1, 15) : null,
  }))
  const clients = rows(
    await db.from('clients').insert(clientRows).select('*'),
    'clients'
  )
  console.log(`✓ Clientes: ${clients.length}`)

  // ── 6. Caja ───────────────────────────────────────────────────────────────
  const [register] = rows(
    await db.from('cash_registers').insert({
      tenant_id: tenant.id,
      cashier_id: adminUser.id,
      opened_at: isoMx(0, 11),
      opening_amount: 3000,
    }).select('*'),
    'cash_register'
  )
  console.log(`✓ Caja abierta con $3,000`)

  // ── 7. Citas + ventas + comisiones ────────────────────────────────────────
  // 4 slots por barbero por día · 3 barberos · 7 días = 84 citas
  // Slots de inicio (hora local): 11, 13, 15, 17
  // Servicios en rotación: corte(0), barba(1), paquete premium(4), corte(0)
  const SLOTS = [11, 13, 15, 17]
  const SERVICE_ROTATION = [0, 1, 4, 0] // índices en services[]
  const BOOKED_VIA: Array<'whatsapp' | 'reception'> = ['whatsapp', 'reception', 'whatsapp', 'reception']

  let appointmentCount = 0
  let saleCount = 0
  const salesForCommission: Array<{ saleId: string; barberId: string; total: number; rate: number; dayOffset: number }> = []

  for (let dayOffset = -3; dayOffset <= 3; dayOffset++) {
    const isPast   = dayOffset < 0
    const isToday  = dayOffset === 0
    const isFuture = dayOffset > 0

    for (let bi = 0; bi < barbers.length; bi++) {
      const barber = barbers[bi]

      for (let si = 0; si < SLOTS.length; si++) {
        const hour    = SLOTS[si]
        const svc     = services[SERVICE_ROTATION[si]]
        const client  = clients[(dayOffset + 3) * barbers.length * SLOTS.length + bi * SLOTS.length + si % clients.length]
          ?? clients[0]
        const startsAt = isoMx(dayOffset, hour)
        const endsAt   = isoMxEnd(dayOffset, hour, svc.duration_minutes)

        const status = isPast ? 'completed'
          : isToday && si < 2 ? 'completed'
          : isToday ? 'confirmed'
          : 'pending'

        const [appt] = rows(
          await db.from('appointments').insert({
            tenant_id: tenant.id,
            client_id: client.id,
            barber_id: barber.id,
            service_id: svc.id,
            starts_at: startsAt,
            ends_at:   endsAt,
            status,
            booked_via: BOOKED_VIA[si],
          }).select('id'),
          `appointment day${dayOffset} barber${bi} slot${si}`
        )
        appointmentCount++

        // Crear venta solo para citas completadas
        if (status === 'completed') {
          const price   = Number(svc.price)
          const discount = si === 0 && isPast && bi === 0 ? 20 : 0 // descuento simbólico
          const total   = price - discount

          const [sale] = rows(
            await db.from('sales').insert({
              tenant_id:       tenant.id,
              appointment_id:  appt.id,
              client_id:       client.id,
              barber_id:       barber.id,
              cashier_id:      adminUser.id,
              cash_register_id: register.id,
              subtotal:        price,
              discount,
              total,
              payment_method:  PAYMENT_CYCLE[saleCount % PAYMENT_CYCLE.length],
              created_at:      isoMx(dayOffset, hour + 1),
            }).select('id'),
            `sale day${dayOffset}`
          )

          run(
            await db.from('sale_items').insert({
              sale_id:    sale.id,
              type:       'service',
              name:       svc.name,
              price,
              quantity:   1,
              subtotal:   price,
              service_id: svc.id,
            }),
            'sale_item'
          )

          salesForCommission.push({
            saleId:    sale.id,
            barberId:  barber.id,
            total,
            rate:      Number(barber.commission_rate),
            dayOffset,
          })
          saleCount++
        }
      }
    }
  }

  // ── 4 ventas walk-in (sin cita) para completar variedad ──────────────────
  const walkInData = [
    { dayOffset: -3, bi: 0, hour: 12, svcIdx: 1 },
    { dayOffset: -2, bi: 1, hour: 14, svcIdx: 0 },
    { dayOffset: -1, bi: 2, hour: 16, svcIdx: 3 },
    { dayOffset: -1, bi: 0, hour: 18, svcIdx: 0 },
  ]
  for (const w of walkInData) {
    const barber = barbers[w.bi]
    const svc    = services[w.svcIdx]
    const client = clients[saleCount % clients.length]
    const total  = Number(svc.price)

    const [sale] = rows(
      await db.from('sales').insert({
        tenant_id:        tenant.id,
        client_id:        client.id,
        barber_id:        barber.id,
        cashier_id:       adminUser.id,
        cash_register_id: register.id,
        subtotal:         total,
        discount:         0,
        total,
        payment_method:   PAYMENT_CYCLE[saleCount % PAYMENT_CYCLE.length],
        created_at:       isoMx(w.dayOffset, w.hour + 1),
        notes:            'Walk-in sin cita previa',
      }).select('id'),
      'walk-in sale'
    )
    run(
      await db.from('sale_items').insert({
        sale_id:    sale.id,
        type:       'service',
        name:       svc.name,
        price:      total,
        quantity:   1,
        subtotal:   total,
        service_id: svc.id,
      }),
      'walk-in sale_item'
    )
    salesForCommission.push({ saleId: sale.id, barberId: barber.id, total, rate: Number(barber.commission_rate), dayOffset: w.dayOffset })
    saleCount++
  }

  // ── Comisiones ────────────────────────────────────────────────────────────
  const commissionRows = salesForCommission.map(s => ({
    tenant_id:    tenant.id,
    barber_id:    s.barberId,
    sale_id:      s.saleId,
    amount:       Math.round((s.total * s.rate) / 100 * 100) / 100,
    rate:         s.rate,
    ...quincena(s.dayOffset),
    status: 'pending' as const,
  }))
  run(await db.from('commissions').insert(commissionRows), 'commissions')

  console.log(`✓ Citas: ${appointmentCount}  Ventas: ${saleCount}  Comisiones: ${commissionRows.length}`)

  // ── 8. Conversaciones de WhatsApp ─────────────────────────────────────────
  type ConvMode = 'agent' | 'human'
  const convDefs: Array<{
    clientIdx:    number
    mode:         ConvMode
    lastPreview:  string
    unread:       number
    messages:     Array<{ direction: 'inbound' | 'outbound'; content: string; sent_by: 'agent' | 'human' | 'client'; minutesAgo: number }>
  }> = [
    {
      clientIdx: 0,
      mode: 'agent',
      lastPreview: 'Perfecto, te confirmamos tu cita para mañana a las 11.',
      unread: 0,
      messages: [
        { direction: 'inbound',  sent_by: 'client', content: 'Hola! quería saber si tienen espacio mañana para un corte', minutesAgo: 60 },
        { direction: 'outbound', sent_by: 'agent',  content: '¡Hola Alejandro! Claro que sí, mañana tenemos disponibilidad. ¿A qué hora te viene bien?', minutesAgo: 58 },
        { direction: 'inbound',  sent_by: 'client', content: 'A las 11 estaría perfecto', minutesAgo: 55 },
        { direction: 'outbound', sent_by: 'agent',  content: 'Listo, te agendo a las 11 am con Barbero1. Solo confirma tu correo para registrarte. 👍', minutesAgo: 53 },
        { direction: 'inbound',  sent_by: 'client', content: 'alejandro.garcia@gmail.com', minutesAgo: 50 },
        { direction: 'outbound', sent_by: 'agent',  content: 'Perfecto, te confirmamos tu cita para mañana a las 11. ¡Nos vemos!', minutesAgo: 48 },
      ],
    },
    {
      clientIdx: 4,
      mode: 'agent',
      lastPreview: '¿Más info sobre la ondulación permanente?',
      unread: 0,
      messages: [
        { direction: 'inbound',  sent_by: 'client', content: 'Buenas, quiero info sobre la ondulación permanente', minutesAgo: 120 },
        { direction: 'outbound', sent_by: 'agent',  content: 'Hola José! La ondulación permanente incluye corte + crema hidratante. Precio base $1,250. Requiere cabello de al menos 4 dedos. ¿Tu cabello ha pasado por algún proceso químico reciente?', minutesAgo: 118 },
        { direction: 'inbound',  sent_by: 'client', content: 'No, está natural. ¿Cuánto tarda?', minutesAgo: 115 },
        { direction: 'outbound', sent_by: 'agent',  content: 'Aproximadamente 2.5 horas. Muchos aprovechan y agregan el Facial Detox (+$100, solo 20 min extra) — queda muy bien combinado. ¿Te interesa?', minutesAgo: 112 },
        { direction: 'inbound',  sent_by: 'client', content: '¿Más info sobre la ondulación permanente?', minutesAgo: 30 },
      ],
    },
    {
      clientIdx: 13,
      mode: 'human',
      lastPreview: 'Para darte la mejor respuesta te conecto con alguien del equipo.',
      unread: 2,
      messages: [
        { direction: 'inbound',  sent_by: 'client', content: 'Vengo hace 3 meses y el corte de la semana pasada no quedó como lo pedí', minutesAgo: 240 },
        { direction: 'outbound', sent_by: 'agent',  content: 'Hola Jorge, lamento escuchar eso. ¿Me puedes contar más sobre qué fue diferente a lo que esperabas?', minutesAgo: 238 },
        { direction: 'inbound',  sent_by: 'client', content: 'Le pedí un degradado específico y quedó muy diferente, quiero que lo corrijan', minutesAgo: 235 },
        { direction: 'outbound', sent_by: 'agent',  content: 'Para darte la mejor respuesta te conecto con alguien del equipo. Un momento.', minutesAgo: 233 },
        { direction: 'inbound',  sent_by: 'client', content: '¿Cuándo me pueden atender?', minutesAgo: 20 },
        { direction: 'inbound',  sent_by: 'client', content: 'Sigo esperando respuesta', minutesAgo: 5 },
      ],
    },
    {
      clientIdx: 6,
      mode: 'agent',
      lastPreview: '¡Listo! Cita cancelada sin problema.',
      unread: 0,
      messages: [
        { direction: 'inbound',  sent_by: 'client', content: 'Hola necesito cancelar mi cita de mañana', minutesAgo: 180 },
        { direction: 'outbound', sent_by: 'agent',  content: 'Hola Andrés, claro. ¿A qué hora tenías agendada tu cita?', minutesAgo: 178 },
        { direction: 'inbound',  sent_by: 'client', content: 'A las 2 de la tarde', minutesAgo: 175 },
        { direction: 'outbound', sent_by: 'agent',  content: '¡Listo! Cita cancelada sin problema. Cuando quieras reagendar, aquí estamos. 😊', minutesAgo: 173 },
      ],
    },
    {
      clientIdx: 26,
      mode: 'agent',
      lastPreview: '¿Tienes una foto de referencia del estilo que buscas?',
      unread: 0,
      messages: [
        { direction: 'inbound',  sent_by: 'client', content: 'Buenas, ¿hacen cortes estilo texturizado?', minutesAgo: 45 },
        { direction: 'outbound', sent_by: 'agent',  content: 'Sí Gabriel, manejamos todo tipo de cortes. ¿Tienes una foto de referencia del estilo que buscas?', minutesAgo: 43 },
      ],
    },
  ]

  let convCount = 0
  let msgCount = 0

  for (const def of convDefs) {
    const client = clients[def.clientIdx]
    const now = Date.now()

    const [conv] = rows(
      await db.from('conversations').insert({
        tenant_id:           tenant.id,
        client_id:           client.id,
        whatsapp_id:         client.whatsapp_id!,
        mode:                def.mode,
        last_message_preview: def.lastPreview,
        last_message_at:     new Date(now - def.messages[def.messages.length - 1].minutesAgo * 60000).toISOString(),
        unread_human_count:  def.unread,
      }).select('id'),
      'conversation'
    )

    const msgRows = def.messages.map((m, idx) => ({
      conversation_id: conv.id,
      direction:       m.direction,
      type:            'text' as const,
      content:         m.content,
      sent_by:         m.sent_by,
      whatsapp_message_id: `fake_wamid_${conv.id}_${idx}`,
      created_at:      new Date(now - m.minutesAgo * 60000).toISOString(),
    }))
    run(await db.from('messages').insert(msgRows), 'messages')

    convCount++
    msgCount += msgRows.length
  }

  console.log(`✓ Conversaciones: ${convCount}  Mensajes: ${msgCount}`)

  // ── resumen ───────────────────────────────────────────────────────────────
  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Seed completado — Mercurio Barbería

  Tenant ID:  ${tenant.id}
  Admin:      admin@mercuriobarberia.com
  Contraseña: MercurioAdmin2026!

  Servicios:      ${services.length}
  Barberos:       ${barbers.length}
  Clientes:       ${clients.length}
  Citas:          ${appointmentCount}
  Ventas:         ${saleCount}
  Comisiones:     ${commissionRows.length}
  Conversaciones: ${convCount}
  Mensajes:       ${msgCount}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`)
}

main().catch(err => {
  console.error('\n✗ Seed falló:', err)
  process.exit(1)
})
