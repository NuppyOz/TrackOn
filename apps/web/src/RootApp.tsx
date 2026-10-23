import { lazy, Suspense, useEffect, useState } from 'react'
import App from './App'
const PortalApp = lazy(() => import('./features/portal/PortalApp').then(module => ({ default: module.PortalApp })))

export function RootApp() {
  const [pathname, setPathname] = useState(() => window.location.pathname)
  useEffect(() => {
    const actualizar = () => setPathname(window.location.pathname)
    window.addEventListener('popstate', actualizar)
    window.addEventListener('trackon:navigate', actualizar)
    return () => {
      window.removeEventListener('popstate', actualizar)
      window.removeEventListener('trackon:navigate', actualizar)
    }
  }, [])
  return /^\/portal(?:\/|$)/.test(pathname) ? <Suspense fallback={<p role="status">Cargando portal…</p>}><PortalApp /></Suspense> : <App />
}
