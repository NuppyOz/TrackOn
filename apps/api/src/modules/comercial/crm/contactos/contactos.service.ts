import { AppError } from '../../../../errors/AppError.js';
import { obtenerClienteComercial } from '../../adapters/cliente-comercial.adapter.js';
import type { ActualizarContactoInput, CrearContactoInput, ListarContactosQuery } from '../../contracts/crm.schema.js';
import * as repository from './contactos.repository.js';

async function validarCliente(clienteId: number) {
    const cliente = await obtenerClienteComercial(clienteId);
    if (!cliente.activo) throw new AppError(409, 'No se pueden modificar contactos de un cliente inactivo.');
}

export async function listar(clienteId: number, filtros: ListarContactosQuery) {
    await obtenerClienteComercial(clienteId);
    return repository.listar(clienteId, filtros);
}

export async function crear(clienteId: number, datos: CrearContactoInput) {
    await validarCliente(clienteId);
    return repository.crear(clienteId, datos);
}

export async function actualizar(clienteId: number, id: number, datos: ActualizarContactoInput) {
    await validarCliente(clienteId);
    const resultado = await repository.actualizarVersionado(id, clienteId, datos);
    if (resultado.tipo === 'no-encontrado') throw new AppError(404, 'El contacto no existe para este cliente.');
    if (resultado.tipo === 'conflicto') throw new AppError(409, 'El contacto cambió. Actualiza los datos e inténtalo nuevamente.');
    if (!resultado.contacto) throw new AppError(404, 'El contacto no existe para este cliente.');
    return resultado.contacto;
}
