import { useEffect, useState } from 'react'
import App from './App'
import { PortalApp } from './features/portal/PortalApp'

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
  return /^\/portal(?:\/|$)/.test(pathname) ? <PortalApp /> : <App />
}
