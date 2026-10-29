import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '../../../../shared/ui'
import { listarMateriales, type Material } from '../../../materiales/materiales.api'
import { aIsoManagua } from './fechas'
import type { ArticuloNuevo } from './articulos.types'

const LIMITE = 25
const qty = /^(?:0|[1-9]\d{0,8})(?:\.\d{1,3})?$/
const costo = /^(?:0|[1-9]\d{0,9})(?:\.\d{1,6})?$/
export function ArticuloForm({ busy, onSave, onCancel }: Readonly<{ busy: boolean; onSave: (payload: ArticuloNuevo) => Promise<boolean>; onCancel: () => void }>) {
  const [materials, setMaterials] = useState<Material[]>([]); const [materialQ, setMaterialQ] = useState(''); const [materialPage, setMaterialPage] = useState(1); const [materialMore, setMaterialMore] = useState(false)
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null)
  const [code, setCode] = useState(''); const [name, setName] = useState(''); const [unit, setUnit] = useState(''); const [minimum, setMinimum] = useState('0'); const [materialId, setMaterialId] = useState('')
  const [reference, setReference] = useState(''); const [date, setDate] = useState(''); const [quantity, setQuantity] = useState('0'); const [unitCost, setUnitCost] = useState('0'); const [observation, setObservation] = useState(''); const [error, setError] = useState('')
  const matchingMaterials = materials
  const validSelectedMaterial = selectedMaterial && selectedMaterial.unidadMedida === unit ? selectedMaterial : null
  useEffect(() => {
    let live = true
    listarMateriales('activos', materialQ.trim(), materialPage, LIMITE).then(result => {
      if (live) { setMaterials(previous => materialPage === 1 ? result.items : mergeMaterials(previous, result.items)); setMaterialMore(result.hayMas) }
    }).catch(cause => { if (live) setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los materiales.') })
    return () => { live = false }
  }, [materialQ, materialPage])
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const fechaEfectiva = aIsoManagua(date)
    if (!code.trim() || code.trim().length > 60 || !name.trim() || name.trim().length > 150 || !unit.trim() || unit.trim().length > 30) { setError('Completa código (1–60), nombre (1–150) y unidad (1–30).'); return }
    if (!reference.trim() || reference.trim().length > 100 || !observation.trim() || observation.trim().length > 1000) { setError('Referencia obligatoria (hasta 100) y observación obligatoria (hasta 1000 caracteres).'); return }
    if (!fechaEfectiva || new Date(fechaEfectiva).getTime() > Date.now()) { setError('La fecha de apertura debe ser válida y no futura.'); return }
    if (!qty.test(minimum) || !qty.test(quantity) || !costo.test(unitCost)) { setError('Revisa mínimo/cantidad (3 decimales) y costo unitario (6 decimales).'); return }
    if (materialId && !validSelectedMaterial) { setError('La unidad del artículo debe coincidir con la unidad del material seleccionado.'); return }
    const payload: ArticuloNuevo = {
      codigo: code.trim().toUpperCase(), nombre: name.trim(), unidad: unit.trim(), minimo: minimum,
      ...(materialId ? { materialId: Number(materialId) } : {}),
      apertura: { referencia: reference.trim().toUpperCase(), fechaEfectiva, cantidad: quantity, costoUnitario: unitCost, observacion: observation.trim() },
    }
    setError('')
    if (!await onSave(payload)) setError('No se pudo guardar; revisa el error indicado y vuelve a intentarlo.')
  }
  return <section className="logistica__panel"><h2>Nuevo artículo</h2>{error && <p role="alert">{error}</p>}<form onSubmit={event => void save(event)} aria-label="Nuevo artículo">
      <fieldset disabled={busy}><legend>Artículo</legend><label>Código<input value={code} maxLength={60} onChange={event => setCode(event.target.value)} required /></label><label>Nombre<input value={name} maxLength={150} onChange={event => setName(event.target.value)} required /></label><label>Unidad<input value={unit} maxLength={30} disabled={Boolean(materialId)} onChange={event => setUnit(event.target.value)} required /></label><label>Mínimo (unidades)<input inputMode="decimal" value={minimum} onChange={event => setMinimum(event.target.value)} required /></label>
      <label>Material existente (opcional)<select value={materialId} onChange={event => { const material = matchingMaterials.find(item => String(item.id) === event.target.value) ?? null; setMaterialId(event.target.value); setSelectedMaterial(material); if (material) setUnit(material.unidadMedida) }}><option value="">Sin material asociado</option>{validSelectedMaterial && !matchingMaterials.some(item => item.id === validSelectedMaterial.id) && <option value={validSelectedMaterial.id}>{validSelectedMaterial.codigo} · {validSelectedMaterial.nombre}</option>}{matchingMaterials.map(item => <option key={item.id} value={item.id}>{item.codigo} · {item.nombre}</option>)}</select><small>Si vinculas un material, se usará su unidad.</small></label><label>Buscar material<input value={materialQ} onChange={event => { setMaterialQ(event.target.value.slice(0, 100)); setMaterialPage(1) }} /></label>{materialMore && <Button type="button" onClick={() => setMaterialPage(value => value + 1)}>Más materiales</Button>}</fieldset>
      <fieldset disabled={busy}><legend>Saldo de apertura</legend><label>Referencia<input value={reference} maxLength={100} onChange={event => setReference(event.target.value)} required /></label><label>Fecha efectiva<input type="datetime-local" step="1" value={date} onChange={event => setDate(event.target.value)} required /></label><label>Cantidad inicial<input inputMode="decimal" value={quantity} onChange={event => setQuantity(event.target.value)} required /></label><label>Costo unitario (hasta 6 decimales)<input inputMode="decimal" value={unitCost} onChange={event => setUnitCost(event.target.value)} required /></label><label>Observación (obligatoria)<textarea maxLength={1000} value={observation} onChange={event => setObservation(event.target.value)} required /></label></fieldset>
    <div className="logistica__actions"><Button variant="primary" type="submit" loading={busy}>Crear artículo con apertura</Button><Button type="button" disabled={busy} onClick={onCancel}>Cancelar</Button></div>
  </form></section>
}

function mergeMaterials(current: Material[], incoming: Material[]) {
  const values = new Map(current.map(item => [item.id, item]))
  incoming.forEach(item => values.set(item.id, item))
  return [...values.values()]
}
