'use client'

import { useToasts } from '@/hooks/useToast'
import { Toast } from './Toast'

// Contenedor fijo en la esquina inferior derecha; apila los toasts activos.
export default function ToastContainer() {
  const { toasts, dismiss } = useToasts()

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map(item => (
        <Toast key={item.id} item={item} onClose={() => dismiss(item.id)} />
      ))}
    </div>
  )
}
