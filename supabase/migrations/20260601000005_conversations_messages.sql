-- =====================================================================
-- Migration 5: conversations + messages
-- =====================================================================
-- Se adelanta a Paso 9 del orden de construcción porque el seed de
-- Paso 4 incluye conversaciones de WhatsApp de prueba.
-- =====================================================================

-- ---------------------------------------------------------------------
-- TABLA: conversations
-- ---------------------------------------------------------------------
create table public.conversations (
  id                   uuid primary key default gen_random_uuid(),
  tenant_id            uuid not null references public.tenants (id) on delete restrict,
  client_id            uuid references public.clients (id) on delete set null,
  whatsapp_id          text not null,
  mode                 text not null default 'agent'
                         check (mode in ('agent','human')),
  last_message_at      timestamptz,
  last_message_preview text,
  unread_human_count   int not null default 0,
  created_at           timestamptz not null default now(),
  unique (tenant_id, whatsapp_id)
);

create index conversations_tenant_id_idx       on public.conversations (tenant_id);
create index conversations_last_message_at_idx on public.conversations (tenant_id, last_message_at desc nulls last);

comment on column public.conversations.mode is
  'agent = responde el Claude; human = recepcionista toma el hilo.';
comment on column public.conversations.unread_human_count is
  'Mensajes entrantes sin leer por recepción cuando mode = human.';

-- ---------------------------------------------------------------------
-- TABLA: messages
-- ---------------------------------------------------------------------
create table public.messages (
  id                  uuid primary key default gen_random_uuid(),
  conversation_id     uuid not null references public.conversations (id) on delete cascade,
  direction           text not null check (direction in ('inbound','outbound')),
  type                text not null check (type in ('text','image','audio','video','document')),
  content             text,
  media_url           text,
  whatsapp_message_id text unique,
  sent_by             text not null check (sent_by in ('agent','human','client')),
  created_at          timestamptz not null default now()
);

create index messages_conversation_id_idx on public.messages (conversation_id, created_at);

comment on column public.messages.whatsapp_message_id is
  'ID único de Meta — usado para deduplicar webhooks duplicados.';

-- ---------------------------------------------------------------------
-- RLS — conversations
-- ---------------------------------------------------------------------
alter table public.conversations enable row level security;

create policy tenant_isolation on public.conversations
  for all
  to authenticated
  using      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  with check (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- ---------------------------------------------------------------------
-- RLS — messages (acceso a través de conversations)
-- ---------------------------------------------------------------------
alter table public.messages enable row level security;

create policy tenant_isolation on public.messages
  for all
  to authenticated
  using (
    exists (
      select 1 from public.conversations c
       where c.id = messages.conversation_id
         and c.tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    )
  )
  with check (
    exists (
      select 1 from public.conversations c
       where c.id = messages.conversation_id
         and c.tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    )
  );
