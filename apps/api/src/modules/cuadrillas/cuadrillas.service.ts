import { Prisma } from '@prisma/client';
import { AppError } from '../../errors/AppError.js';
import * as repository from './cuadrillas.repository.js';
import type { CreateCuadrillaInput, CuadrillaFilters, UpdateCuadrillaInput } from './cuadrillas.schema.js';

function traducirError(error: unknown): never {
    const prismaError = error as Prisma.PrismaClientKnownRequestError;
    if (error instanceof Prisma.PrismaClientKnownRequestError && prismaError.code === 'P2002') throw new AppError(409, 'Ya existe una cuadrilla con ese nombre o el empleado ya pertenece a ella.');
    if (error instanceof Prisma.PrismaClientKnownRequestError && prismaError.code === 'P2025') throw new AppError(404, 'La cuadrilla o membresía no existe.');
    throw error;
}

async function obtenerCuadrilla(id: number) {
    const cuadrilla = await repository.buscarCuadrillaPorId(id);
    if (!cuadrilla) throw new AppError(404, 'La cuadrilla no existe.');
    return cuadrilla;
}

async function validarEmpleadoParaCuadrilla(empleadoId: number) {
    const empleado = await repository.buscarEmpleadoPorId(empleadoId);
    if (!empleado) throw new AppError(404, 'El empleado no existe.');
    if (!empleado.active) throw new AppError(400, 'El empleado está inactivo y no puede integrar una cuadrilla.');
    // El rol Técnico participa operativamente y requiere habilitación vigente.
    if (empleado.usuario?.rol.cod === 'TEC' && !empleado.habilitadoComoTecnico) {
        throw new AppError(400, 'El empleado con rol Técnico no cuenta con habilitación técnica vigente.');
    }
    return empleado;
}

export async function crearCuadrilla(datos: CreateCuadrillaInput) { try { return await repository.crearCuadrilla(datos); } catch (error) { traducirError(error); } }
export function listarCuadrillas(filtros: CuadrillaFilters) { return repository.listarCuadrillas(filtros); }
export async function obtenerCuadrillaPorId(id: number) { return obtenerCuadrilla(id); }
export async function actualizarCuadrilla(id: number, datos: UpdateCuadrillaInput) { await obtenerCuadrilla(id); try { return await repository.actualizarCuadrilla(id, datos); } catch (error) { traducirError(error); } }
export async function actualizarEstadoCuadrilla(id: number, activa: boolean) { await obtenerCuadrilla(id); try { return await repository.actualizarEstadoCuadrilla(id, activa); } catch (error) { traducirError(error); } }
export function listarEmpleadosElegibles() { return repository.listarEmpleadosElegibles(); }

export async function agregarMiembro(cuadrillaId: number, empleadoId: number) {
    const cuadrilla = await obtenerCuadrilla(cuadrillaId);
    if (!cuadrilla.activa) throw new AppError(400, 'No puedes agregar integrantes a una cuadrilla inactiva.');
    await validarEmpleadoParaCuadrilla(empleadoId);
    if (await repository.buscarMembresiaVigente(cuadrillaId, empleadoId)) throw new AppError(409, 'El empleado ya es integrante vigente de la cuadrilla.');
    try { return await repository.agregarMiembro(cuadrillaId, empleadoId); } catch (error) { traducirError(error); }
}

export async function retirarMiembro(cuadrillaId: number, miembroId: number) {
    await obtenerCuadrilla(cuadrillaId);
    const membresia = await repository.buscarMembresiaVigentePorId(cuadrillaId, miembroId);
    if (!membresia) throw new AppError(404, 'El integrante vigente no existe en esta cuadrilla.');
    try { return await repository.retirarMiembro(membresia.id); } catch (error) { traducirError(error); }
}

export async function definirLider(cuadrillaId: number, empleadoId: number) {
    await obtenerCuadrilla(cuadrillaId);
    const membresia = await repository.buscarMembresiaVigente(cuadrillaId, empleadoId);
    if (!membresia) throw new AppError(400, 'El líder debe ser un integrante vigente de la cuadrilla.');
    await validarEmpleadoParaCuadrilla(empleadoId);
    try { return await repository.definirLider(cuadrillaId, empleadoId); } catch (error) { traducirError(error); }
}
