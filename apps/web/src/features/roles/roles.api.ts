import type { Rol, ListarRolesResponse } from './roles.types'

function isRol(
    valor: unknown): valor is Rol {
    if (typeof valor !== 'object' || valor === null){
        return false
    }

    return (
        'id' in valor &&
        typeof valor.id === 'number' &&
        Number.isInteger(valor.id) &&
        valor.id > 0 &&
        'cod' in valor &&
        typeof valor.cod === 'string' &&
        'nombre' in valor &&
        typeof valor.nombre === 'string' &&
        'descripcion' in valor &&
        (
            typeof valor.descripcion === 'string' ||
            valor.descripcion === null
        )
    )
}

function isResponseRoles(
    valor: unknown,): valor is ListarRolesResponse {
        return (
            typeof valor === 'object' &&
            valor !== null &&
            'data' in valor &&
            Array.isArray(valor.data) &&
            valor.data.every(isRol)
        )
}

export async function listarRoles(): Promise<Rol[]> {
    const response = await fetch('/api/roles', {
        signal: AbortSignal.timeout(5000),
    })

    if(!response.ok){
        throw new Error('No se pudieron obtener los roles.')
    }

    const content: unknown = await response.json()

    if(!isResponseRoles(content)){
        throw new Error('La respuesta de roles tiene un formato inadecuado.')
    }

    return content.data
}