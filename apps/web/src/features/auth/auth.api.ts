import { setAccessToken } from '../../shared/api'

export interface UsuarioSesion { id: number; identificador: string; rol: { cod: string; nombre: string }; empleado: { persona: { firstName: string; firstLastName: string } } }
export async function renovarSesion() {
  const response = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include', signal: AbortSignal.timeout(8000) })
  if (!response.ok) return null
  const body = await response.json() as { data?: { accessToken: string; usuario: UsuarioSesion } }
  if (!body.data) return null
  setAccessToken(body.data.accessToken)
  return body.data.usuario
}
export async function cerrarSesion() {
  try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }) } finally { setAccessToken(null) }
}
