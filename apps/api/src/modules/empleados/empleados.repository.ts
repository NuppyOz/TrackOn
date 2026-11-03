import { prisma } from '../../infrastructure/prisma.js'
import type { CreateEmpleadoInput, ListarEmpleadosInput, UpdateEmpleadoInput} from './empleados.schema.js'
import { paginaDesde } from '../../shared/pagination.js'

export function crearEmpleado(datos: CreateEmpleadoInput) {
    return prisma.empleado.create({
        data: {
            codEmpleado: datos.codEmpleado,

            persona: {
                create: {
                    firstName: datos.persona.firstName,
                    secondName: datos.persona.secondName ?? null,
                    firstLastName: datos.persona.firstLastName,
                    secondLastName: datos.persona.secondLastName ?? null,
                    typeDocument: datos.persona.typeDocument ?? null,
                    numberDocument: datos.persona.numberDocument ?? null,
                    telephone: datos.persona.telephone ?? null,
                    correo: datos.persona.correo ?? null,
                },
            },
        },

        select:{
            id: true,
            codEmpleado: true,
            active: true,
            personaId: true,

            persona:{
                select: {
                    id: true,
                    firstName: true,
                    secondName: true,
                    firstLastName: true,
                    secondLastName: true,
                    telephone: true,
                    correo: true,
                },
            },
        },
    })
}

export async function listarEmpleados (filtros: ListarEmpleadosInput) {
    const where = {
        ...(filtros.estado === 'todos' ? {} : { active: filtros.estado === 'activos' }),
        ...(filtros.tecnico === 'todos' ? {} : { habilitadoComoTecnico: filtros.tecnico === 'habilitados' }),
        ...(filtros.buscar ? { OR: [
            { codEmpleado: { contains: filtros.buscar, mode: 'insensitive' as const } },
            { persona: { is: { OR: [
                { firstName: { contains: filtros.buscar, mode: 'insensitive' as const } },
                { secondName: { contains: filtros.buscar, mode: 'insensitive' as const } },
                { firstLastName: { contains: filtros.buscar, mode: 'insensitive' as const } },
                { secondLastName: { contains: filtros.buscar, mode: 'insensitive' as const } },
            ] } } },
        ] } : {}),
    };
    const [items, total, totalEmpleados, activos, tecnicosHabilitados] = await Promise.all([
        prisma.empleado.findMany({
        where,
        select: {
            id: true,
            codEmpleado: true,
            active: true,
            habilitadoComoTecnico: true,

            persona:{
                select: {
                    firstName: true,
                    secondName: true,
                    firstLastName: true,
                    secondLastName: true,
                },
            },
        },

        orderBy: {
            codEmpleado: 'asc',
        },
        skip: (filtros.pagina - 1) * filtros.limite,
        take: filtros.limite + 1,
        }),
        prisma.empleado.count({ where }),
        prisma.empleado.count(),
        prisma.empleado.count({ where: { active: true } }),
        prisma.empleado.count({ where: { active: true, habilitadoComoTecnico: true } }),
    ]);
    return {
        ...paginaDesde(items, filtros),
        total,
        resumen: { total: totalEmpleados, activos, tecnicosHabilitados },
    };
}

export function buscarEmpleadoPorId(id: number) {
    return prisma.empleado.findUnique({
        where: { id },

        select: {
            id: true,
            codEmpleado: true,
            active: true,
            habilitadoComoTecnico: true,
            personaId: true,

            persona: {
                select: {
                    id: true,
                    firstName: true,
                    secondName: true,
                    firstLastName: true,
                    secondLastName: true,
                    typeDocument: true,
                    numberDocument: true,
                    telephone: true,
                    correo: true,
                },
            },
        },
    });
}

export function actualizarEmpleado(
    id: number,
    datos: UpdateEmpleadoInput,
) {
    const persona = datos.persona;

    return prisma.empleado.update({
        where: { id },

        data: {
            ...(datos.codEmpleado !== undefined
                ? { codEmpleado: datos.codEmpleado }
                : {}),

            ...(persona !== undefined
                ? {
                      persona: {
                          update: {
                              ...(persona.firstName !== undefined
                                  ? { firstName: persona.firstName }
                                  : {}),

                              ...(persona.secondName !== undefined
                                  ? { secondName: persona.secondName }
                                  : {}),

                              ...(persona.firstLastName !== undefined
                                  ? {
                                        firstLastName:
                                            persona.firstLastName,
                                    }
                                  : {}),

                              ...(persona.secondLastName !== undefined
                                  ? {
                                        secondLastName:
                                            persona.secondLastName,
                                    }
                                  : {}),

                              ...(persona.typeDocument !== undefined
                                  ? {
                                        typeDocument:
                                            persona.typeDocument,
                                    }
                                  : {}),

                              ...(persona.numberDocument !== undefined
                                  ? {
                                        numberDocument:
                                            persona.numberDocument,
                                    }
                                  : {}),

                              ...(persona.telephone !== undefined
                                  ? { telephone: persona.telephone }
                                  : {}),

                              ...(persona.correo !== undefined
                                  ? { correo: persona.correo }
                                  : {}),
                          },
                      },
                  }
                : {}),
        },

        select: {
            id: true,
            codEmpleado: true,
            active: true,
            habilitadoComoTecnico: true,
            personaId: true,

            persona: {
                select: {
                    id: true,
                    firstName: true,
                    secondName: true,
                    firstLastName: true,
                    secondLastName: true,
                    typeDocument: true,
                    numberDocument: true,
                    telephone: true,
                    correo: true,
                },
            },
        },
    });
}

export function actualizarEstadoEmpleado(
    id: number,
    active: boolean,
) {
    return prisma.empleado.update({
        where: {id},
        data: {active},
        select: {
            id: true,
            codEmpleado: true,
            active: true,
            habilitadoComoTecnico: true,
        },
    });
}


export function actualizarHabilitacionTecnica(
    id: number,
    habilitadoComoTecnico: boolean,
) {
    return prisma.empleado.update({
        where: {id},
        data: {habilitadoComoTecnico},
        select: {
            id: true,
            codEmpleado: true,
            active: true,
            habilitadoComoTecnico: true,
        },
    });
}
