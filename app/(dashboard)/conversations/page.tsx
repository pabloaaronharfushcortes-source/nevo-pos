import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/supabase/auth'
import ConversationsBoard from '@/components/conversations/ConversationsBoard'
import type { ConversationWithClient } from '@/types/app'

export default async function ConversationsPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const supabase = await createClient()

  const { data: conversations } = await supabase
    .from('conversations')
    .select(`
      id, tenant_id, client_id, whatsapp_id, mode,
      last_message_at, last_message_preview, unread_human_count, created_at,
      client:clients(id, name, phone, classification)
    `)
    .eq('tenant_id', user.tenantId)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .limit(100)

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--surface-0)' }}>
      <div
        className="px-6 py-4 flex-shrink-0 border-b"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <h1 className="font-display text-xl font-medium" style={{ color: 'var(--ink-primary)' }}>
          Conversaciones
        </h1>
      </div>
      <div className="flex-1 min-h-0">
        <ConversationsBoard
          tenantId={user.tenantId}
          initialConversations={(conversations ?? []) as ConversationWithClient[]}
        />
      </div>
    </div>
  )
}
