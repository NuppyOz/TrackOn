import { AppError } from '../../errors/AppError.js';
import * as repository from './ordenes.repository.js';
import type { CambiarEstadoOrdenInput, CrearOrdenInput, EstadoOrdenCodigo, ListarOrdenesInput } from './ordenes.schema.js';

const transiciones: Record<EstadoOrdenCodigo, readonly EstadoOrdenCodigo[]> = {
    BORRADOR: ['PENDIENTE', 'CANCELADA'],
    PENDIENTE: ['ASIGNADA', 'CANCELADA'],
    ASIGNADA: ['EN_EJECUCION', 'CANCELADA'],
    EN_EJECUCION: ['EN_REVISION', 'CANCELADA'],
    EN_REVISION: ['EN_EJECUCION', 'CERRADA'],
    CERRADA: [],
    CANCELADA: [],
};

function normalizarNumero<T extends { numero: bigint }>(orden: T) {
    return { ...orden, numero: orden.numero.toString() };
}

export async function crear(datos: CrearOrdenInput, usuarioId: number) {
    const ubicacion = await repository.buscarUbicacionActiva(datos.ubicacionId);
    if (!ubicacion) {
        throw new AppError(400, 'La ubicación no existe, está inactiva o pertenece a un cliente inactivo.');
    }
    const { persona, organizacion } = ubicacion.cliente;
    const nombrePersona = persona ? `${persona.firstName} ${persona.firstLastName}` : '';
    const nombre = organizacion?.razonSocial ?? nombrePersona;
    if (!nombre) throw new AppError(409, 'El cliente no tiene un nombre válido.');

    const orden = await repository.crear(datos, usuarioId, {
        clienteNombre: nombre,
        clienteIdentificacion: organizacion?.identificacionTributaria ?? persona?.numberDocument ?? null,
        ubicacionNombre: ubicacion.nombre,
        direccion: ubicacion.direccion,
    });
    return normalizarNumero(orden);
}

export async function listar(filtros: ListarOrdenesInput) {
    const pagina = await repository.listar(filtros);
    return { ...pagina, items: pagina.items.map(normalizarNumero) };
}

export async function obtener(id: number) {
    const orden = await repository.buscarPorId(id);
    if (!orden) throw new AppError(404, 'La orden de trabajo no existe.');
    return normalizarNumero(orden);
}

export async function cambiarEstado(id: number, datos: CambiarEstadoOrdenInput, usuarioId: number) {
    const orden = await repository.buscarPorId(id);
    if (!orden) throw new AppError(404, 'La orden de trabajo no existe.');
    const actual = orden.estadoCodigo as EstadoOrdenCodigo;
    if (!transiciones[actual].includes(datos.estado)) {
        throw new AppError(409, 'La transición de estado no está permitida.');
    }
    if (datos.estado === 'ASIGNADA' && !await repository.tieneAsignacionVigente(id)) {
        throw new AppError(409, 'La orden necesita una asignación vigente antes de marcarse como asignada.');
    }
    const actualizada = await repository.cambiarEstado(
        id, actual, datos.estado, orden.version, datos.motivo, usuarioId,
    );
    return normalizarNumero(actualizada);
}
