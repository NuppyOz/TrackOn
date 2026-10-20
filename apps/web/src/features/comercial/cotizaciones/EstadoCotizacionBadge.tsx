import { SemanticBadge, type BadgeVariant } from '../../erp-ui/components'
import type { EstadoCotizacion } from './cotizaciones.types'

const config: Record<EstadoCotizacion, { label: string; variant: BadgeVariant; icon: string }> = {
  BORRADOR: { label: 'Borrador', variant: 'neutral', icon: '○' },
  ENVIADA: { label: 'Enviada', variant: 'info', icon: '↗' },
  APROBADA: { label: 'Aprobada', variant: 'success', icon: '✓' },
  RECHAZADA: { label: 'Rechazada', variant: 'danger', icon: '×' },
  VENCIDA: { label: 'Vencida', variant: 'warning', icon: '!' },
}

export function EstadoCotizacionBadge({ estado }: Readonly<{ estado: EstadoCotizacion }>) {
  const { label, variant, icon } = config[estado]
  return <SemanticBadge label={label} variant={variant} icon={icon} />
}
