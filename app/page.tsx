import { redirect } from 'next/navigation'

// El middleware redirige a /login si no hay sesión.
// Si se llega aquí, el usuario está autenticado → ir al dashboard.
export default function RootPage() {
  redirect('/agenda')
}
