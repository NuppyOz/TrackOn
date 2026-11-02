import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RootApp } from '../src/RootApp'

vi.mock('../src/App', () => ({ default: () => <p>aplicación interna</p> }))
vi.mock('../src/features/portal/PortalApp', () => ({ PortalApp: () => <p>portal cliente</p> }))

describe('enrutamiento principal', () => {
  afterEach(() => { cleanup(); window.history.replaceState({}, '', '/') })

  it('muestra la aplicación interna y reacciona a navegación del historial', async () => {
    window.history.replaceState({}, '', '/')
    render(<RootApp />)
    expect(screen.getByText('aplicación interna')).toBeTruthy()
    window.history.pushState({}, '', '/portal/ordenes')
    fireEvent(window, new PopStateEvent('popstate'))
    expect(await screen.findByText('portal cliente')).toBeTruthy()
  })

  it('atiende el evento de navegación propio de TrackOn', async () => {
    window.history.replaceState({}, '', '/portal')
    render(<RootApp />)
    expect(await screen.findByText('portal cliente')).toBeTruthy()
    window.history.pushState({}, '', '/dashboard')
    fireEvent(window, new CustomEvent('trackon:navigate'))
    expect(screen.getByText('aplicación interna')).toBeTruthy()
  })
})
