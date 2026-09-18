import { prisma } from '../../infrastructure/prisma.js';

/*
Este archivo contiene funciones para consultar la tabla
de roles en la base de datos.

El repository se encarga de acceder a los datos:

findMany consulta varios registros.
select indica qué campos queremos obtener.
orderBy ordena los resultados por nombre.

*/

export function listarRoles() {
    return prisma.rol.findMany({
        select: {
            id: true,
            cod: true,
            nombre: true,
            descripcion: true,
        },
        orderBy: {
            nombre: 'asc',
        },
    })
}