'use client'

import { useState, useEffect, useRef } from 'react'
import type { ConversationWithMessages, Message } from '@/types/app'
import HandoffToggle from './HandoffToggle'

type Props = {
  conversation: ConversationWithMessages
  onModeChange: (mode: 'agent' | 'human') => Promise<void>
  onMessageSent: (message: Message) => void
}

// Etiqueta del autor de cada mensaje
const SENT_BY_LABEL: Record<string, string> = {
  agent: 'Agente',
  human: 'Recepción',
  client: 'Cliente',
}

function MessageBubble({ message }: { message: Message }) {
  const isInbound = message.direction === 'inbound'
  const time = new Date(message.created_at).toLocaleTimeString('es-MX', {
    hour: '2-digit', minute: '2-digit',
  })

  return (
    <div className={`flex ${isInbound ? 'justify-start' : 'justify-end'}`}>
      <div className="max-w-[72%]">
        <div
          className="px-3 py-2 text-sm"
          style={
            isInbound
              ? { background: 'var(--surface-2)', color: 'var(--ink-primary)', border: '1px solid var(--border-subtle)' }
              : message.sent_by === 'human'
                ? { background: 'var(--brass)', color: '#0C0A09' }
                : { background: 'var(--surface-3)', color: 'var(--ink-primary)' }
          }
        >
          {message.type === 'text'
            ? <p className="whitespace-pre-wrap break-words">{message.content}</p>
            : <p className="italic opacity-80">[{message.type}]{message.content ? ` ${message.content}` : ''}</p>
          }
        </div>
        <div className={`flex items-center gap-1.5 mt-0.5 ${isInbound ? 'justify-start' : 'justify-end'}`}>
          <span className="text-2xs uppercase tracking-wide" style={{ color: 'var(--ink-muted)' }}>
            {SENT_BY_LABEL[message.sent_by] ?? message.sent_by}
          </span>
          <span className="num text-2xs" style={{ color: 'var(--ink-muted)' }}>{time}</span>
        </div>
      </div>
    </div>
  )
}

export default function MessageThread({ conversation, onModeChange, onMessageSent }: Props) {
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const isHuman = conversation.mode === 'human'
  const name = conversation.client?.name ?? conversation.whatsapp_id

  // Auto-scroll al último mensaje cuando cambia el hilo
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [conversation.messages.length, conversation.id])

  async function send() {
    const text = draft.trim()
    if (!text || sending) return
    setSending(true)
    setError(null)
    try {
      const res = await fetch(`/api/conversations/${conversation.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const data: Message | { error: string } = await res.json()
      if (!res.ok || 'error' in data) {
        setError('error' in data ? data.error : 'Error al enviar')
        return
      }
      setDraft('')
      onMessageSent(data)
    } catch {
      setError('Error de conexión')
    } finally {
      setSending(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Enter envía; Shift+Enter inserta salto de línea
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void send()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="px-6 py-4 flex items-center justify-between flex-shrink-0 border-b"
        style={{ background: 'var(--surface-1)', borderColor: 'var(--border-subtle)' }}
      >
        <div>
          <h2 className="font-display text-lg font-medium" style={{ color: 'var(--ink-primary)' }}>{name}</h2>
          <p className="num text-2xs mt-0.5" style={{ color: 'var(--ink-muted)' }}>{conversation.whatsapp_id}</p>
        </div>
        <HandoffToggle mode={conversation.mode} onChange={onModeChange} />
      </div>

      {/* Hilo */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
        {conversation.messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm" style={{ color: 'var(--ink-muted)' }}>
            Sin mensajes en esta conversación
          </div>
        ) : (
          conversation.messages.map(m => <MessageBubble key={m.id} message={m} />)
        )}
      </div>

      {/* Composer */}
      <div className="px-6 py-4 flex-shrink-0 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
        {!isHuman ? (
          <p className="text-2xs uppercase tracking-wide text-center py-2" style={{ color: 'var(--ink-muted)' }}>
            El agente está respondiendo · toma el control para escribir
          </p>
        ) : (
          <>
            {error && <p className="text-xs mb-2" style={{ color: '#E05252' }}>{error}</p>}
            <div className="flex items-end gap-3">
              <textarea
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder="Escribe un mensaje…"
                className="flex-1 px-0 py-2 text-sm bg-transparent border-0 border-b focus:outline-none focus:ring-0 resize-none transition-colors"
                style={{ borderColor: 'var(--border-default)', color: 'var(--ink-primary)' }}
                onFocus={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--brass)' }}
                onBlur={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)' }}
              />
              <button
                onClick={send}
                disabled={sending || !draft.trim()}
                className="px-4 py-2 text-xs font-medium uppercase tracking-wide transition-opacity disabled:opacity-40"
                style={{ background: 'var(--brass)', color: '#0C0A09' }}
              >
                {sending ? '…' : 'Enviar'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
