import { AppError } from '../../../../errors/AppError.js';
import { obtenerClienteComercial } from '../../adapters/cliente-comercial.adapter.js';
import type { ActualizarPerfilInput } from '../../contracts/crm.schema.js';
import * as repository from './perfil.repository.js';

export async function obtener(clienteId: number) {
    await obtenerClienteComercial(clienteId);
    const perfil = await repository.obtenerPorCliente(clienteId);
    return perfil ?? { clienteId, clasificacion: null, instruccionesFacturacion: null, version: 0 };
}

export async function actualizar(clienteId: number, datos: ActualizarPerfilInput) {
    const cliente = await obtenerClienteComercial(clienteId);
    if (!cliente.activo) throw new AppError(409, 'No se puede modificar el perfil de un cliente inactivo.');
    const perfil = await repository.guardarVersionado(clienteId, datos);
    if (!perfil) throw new AppError(409, 'El perfil cambió o la versión enviada ya no es vigente. Actualiza los datos.');
    return perfil;
}
