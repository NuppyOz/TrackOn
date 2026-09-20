import { prisma } from '../../infrastructure/prisma.js'
import type { CreateEmpleadoInput, UpdateEmpleadoInput} from './empleados.schema.js'

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

export function listarEmpleados () {
    return prisma.empleado.findMany({
        select: {
            id: true,
            codEmpleado: true,
            active: true,

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
    })
}

export function buscarEmpleadoPorId(id: number) {
    return prisma.empleado.findUnique({
        where: { id },

        select: {
            id: true,
            codEmpleado: true,
            active: true,
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