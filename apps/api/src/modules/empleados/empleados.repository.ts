import { prisma } from '../../infrastructure/prisma.js'
import type { CreateEmpleadoInput } from './empleados.schema.js'

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
                    telephone: true,
                    correo: true,
                },
            },
        },
    });
}