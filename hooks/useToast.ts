'use client'

import { useSyncExternalStore } from 'react'

export type ToastKind = 'success' | 'error' | 'info'
export type ToastItem = { id: number; kind: ToastKind; message: string }

// Store global de toasts — accesible desde cualquier componente vía `toast.*`,
// sin necesidad de un Provider. ToastContainer se suscribe a los cambios.
let items: ToastItem[] = []
const listeners = new Set<() => void>()
let nextId = 1

function emit() {
  listeners.forEach(l => l())
}

function remove(id: number) {
  items = items.filter(t => t.id !== id)
  emit()
}

function add(kind: ToastKind, message: string) {
  const id = nextId++
  items = [...items, { id, kind, message }]
  emit()
  // Desaparece solo a los 4 segundos
  setTimeout(() => remove(id), 4000)
}

export const toast = {
  success: (message: string) => add('success', message),
  error: (message: string) => add('error', message),
  info: (message: string) => add('info', message),
}

export function useToasts() {
  const subscribe = (cb: () => void) => {
    listeners.add(cb)
    return () => { listeners.delete(cb) }
  }
  const snapshot = () => items
  const current = useSyncExternalStore(subscribe, snapshot, snapshot)
  return { toasts: current, dismiss: remove }
}
