import { Prisma, type EtapaOportunidadComercial } from '@prisma/client';
import { AppError } from '../../../errors/AppError.js';
import { prisma } from '../../../infrastructure/prisma.js';
import type { ActualizarOportunidad, CrearOportunidad, FiltrosOportunidades } from './oportunidades.schema.js';

const include = {
  cliente: { select: { id: true, codigo: true, activo: true, persona: { select: { firstName: true, secondName: true, firstLastName: true, secondLastName: true } }, organizacion: { select: { razonSocial: true, nombreComercial: true } } } },
  responsable: { select: { id: true, identificador: true, empleado: { select: { persona: { select: { firstName: true, secondName: true, firstLastName: true, secondLastName: true } } } } } },
  cotizaciones: { select: { id: true, estado: true, total: true, venta: { select: { id: true } } }, orderBy: { creadaEn: 'desc' as const } },
} satisfies Prisma.OportunidadComercialInclude;
type Registro = Prisma.OportunidadComercialGetPayload<{ include: typeof include }>;
const nombre = (parts: Array<string | null | undefined>, fallback: string) => parts.filter(Boolean).join(' ') || fallback;
const nombreCliente = (row: Registro) => row.cliente.organizacion?.nombreComercial || row.cliente.organizacion?.razonSocial || nombre([row.cliente.persona?.firstName, row.cliente.persona?.secondName, row.cliente.persona?.firstLastName, row.cliente.persona?.secondLastName], row.cliente.codigo);
const nombreResponsable = (row: Registro) => nombre([row.responsable.empleado.persona.firstName, row.responsable.empleado.persona.secondName, row.responsable.empleado.persona.firstLastName, row.responsable.empleado.persona.secondLastName], row.responsable.identificador);
const dto = (row: Registro) => ({
  id: row.id, version: row.version, clienteId: row.clienteId, clienteNombre: nombreCliente(row), clienteActivo: row.cliente.activo,
  nombre: row.nombre, etapa: row.etapa, valorEstimado: row.valorEstimado?.toFixed(2) ?? null,
  proximaActividad: row.proximaActividad?.toISOString() ?? null, nota: row.nota,
  responsableId: row.responsableId, responsableNombre: nombreResponsable(row), creadaEn: row.creadaEn.toISOString(), actualizadaEn: row.actualizadaEn.toISOString(),
  cotizaciones: row.cotizaciones.map(item => ({ id: item.id, estado: item.estado, total: item.total.toFixed(2), ventaId: item.venta?.id ?? null })),
});
const auditoria = (tx: Prisma.TransactionClient, usuarioId: number, id: number, accion: string, anteriores: unknown, nuevos: unknown) => tx.auditoria.create({
  data: { usuarioId, tipoActor: 'USUARIO', entidad: 'OPORTUNIDAD_COMERCIAL', entidadId: String(id), accion, datosAnteriores: anteriores as Prisma.InputJsonValue, datosNuevos: nuevos as Prisma.InputJsonValue },
});

export async function listarOportunidades(filtros: FiltrosOportunidades) {
  const where: Prisma.OportunidadComercialWhereInput = {
    ...(filtros.clienteId ? { clienteId: filtros.clienteId } : {}),
    ...(filtros.etapa ? { etapa: filtros.etapa } : {}),
    ...(filtros.q ? { OR: [
      { nombre: { contains: filtros.q, mode: 'insensitive' } },
      { cliente: { is: { codigo: { contains: filtros.q, mode: 'insensitive' } } } },
      { cliente: { is: { organizacion: { is: { razonSocial: { contains: filtros.q, mode: 'insensitive' } } } } } },
      { cliente: { is: { organizacion: { is: { nombreComercial: { contains: filtros.q, mode: 'insensitive' } } } } } },
      { responsable: { is: { identificador: { contains: filtros.q, mode: 'insensitive' } } } },
    ] } : {}),
  };
  const [total, rows] = await Promise.all([prisma.oportunidadComercial.count({ where }), prisma.oportunidadComercial.findMany({ where, include, orderBy: [{ actualizadaEn: 'desc' }, { id: 'desc' }], skip: (filtros.pagina - 1) * filtros.limite, take: filtros.limite + 1 })]);
  return { items: rows.slice(0, filtros.limite).map(dto), pagina: filtros.pagina, limite: filtros.limite, hayMas: rows.length > filtros.limite, total };
}

export async function obtenerOportunidad(id: number) {
  const row = await prisma.oportunidadComercial.findUnique({ where: { id }, include });
  if (!row) throw new AppError(404, 'La oportunidad no existe.');
  return dto(row);
}

export async function crearOportunidad(datos: CrearOportunidad, responsableId: number) {
  return prisma.$transaction(async tx => {
    const cliente = await tx.cliente.findUnique({ where: { id: datos.clienteId }, select: { id: true, activo: true } });
    if (!cliente) throw new AppError(404, 'El cliente no existe.');
    if (!cliente.activo) throw new AppError(409, 'No se puede crear una oportunidad para un cliente inactivo.');
    const creada = await tx.oportunidadComercial.create({ data: {
      clienteId: datos.clienteId, responsableId, nombre: datos.nombre,
      ...(datos.valorEstimado !== undefined ? { valorEstimado: new Prisma.Decimal(datos.valorEstimado) } : {}),
      ...(datos.proximaActividad ? { proximaActividad: new Date(datos.proximaActividad) } : {}), ...(datos.nota ? { nota: datos.nota } : {}),
    }, select: { id: true } });
    const row = await tx.oportunidadComercial.findUniqueOrThrow({ where: { id: creada.id }, include });
    await auditoria(tx, responsableId, creada.id, 'CREAR', Prisma.JsonNull, { clienteId: row.clienteId, nombre: row.nombre, etapa: row.etapa });
    return dto(row);
  });
}

const transiciones: Readonly<Record<EtapaOportunidadComercial, readonly EtapaOportunidadComercial[]>> = {
  NUEVA: ['CALIFICADA', 'PERDIDA'],
  CALIFICADA: ['PROPUESTA', 'PERDIDA'],
  PROPUESTA: ['CALIFICADA', 'PERDIDA'],
  GANADA: [],
  PERDIDA: ['CALIFICADA'],
};

export async function actualizarOportunidad(id: number, datos: ActualizarOportunidad, usuarioId: number) {
  return prisma.$transaction(async tx => {
    const anterior = await tx.oportunidadComercial.findUnique({ where: { id }, include });
    if (!anterior) throw new AppError(404, 'La oportunidad no existe.');
    if (anterior.version !== datos.version) throw new AppError(409, 'La oportunidad cambió. Actualiza antes de guardar.');
    if (!anterior.cliente.activo) throw new AppError(409, 'El cliente está inactivo; la oportunidad es de solo lectura.');
    if (datos.etapa && datos.etapa !== anterior.etapa && !transiciones[anterior.etapa].includes(datos.etapa)) {
      throw new AppError(409, `No se permite pasar de ${anterior.etapa} a ${datos.etapa}.`);
    }
    const changed = await tx.oportunidadComercial.updateMany({ where: { id, version: datos.version }, data: {
      ...(datos.nombre !== undefined ? { nombre: datos.nombre } : {}), ...(datos.etapa !== undefined ? { etapa: datos.etapa } : {}),
      ...(datos.valorEstimado !== undefined ? { valorEstimado: datos.valorEstimado === null ? null : new Prisma.Decimal(datos.valorEstimado) } : {}),
      ...(datos.proximaActividad !== undefined ? { proximaActividad: datos.proximaActividad === null ? null : new Date(datos.proximaActividad) } : {}),
      ...(datos.nota !== undefined ? { nota: datos.nota } : {}), version: { increment: 1 },
    } });
    if (!changed.count) throw new AppError(409, 'La oportunidad cambió. Actualiza antes de guardar.');
    const actual = await tx.oportunidadComercial.findUniqueOrThrow({ where: { id }, include });
    await auditoria(tx, usuarioId, id, 'ACTUALIZAR', { etapa: anterior.etapa, version: anterior.version }, { etapa: actual.etapa, version: actual.version, nombre: actual.nombre });
    return dto(actual);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
