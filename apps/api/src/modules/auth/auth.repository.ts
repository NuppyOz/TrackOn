import { prisma } from '../../infrastructure/prisma.js';

export function buscarUsuarioParaLogin(
    identificador: string,
) {
    return prisma.usuario.findUnique({
        where: {
            identificador,
        },

        select: {
            id: true,
            identificador: true,
            passwordHash: true,
            activo: true,

            rol: {
                select: {
                    id: true,
                    cod: true,
                    nombre: true,
                },
            },

            empleado: {
                select: {
                    id: true,
                    codEmpleado: true,
                    active: true,
                    habilitadoComoTecnico: true,

                    persona: {
                        select: {
                            firstName: true,
                            secondName: true,
                            firstLastName: true,
                            secondLastName: true,
                        },
                    },
                },
            },
        },
    });
}

export function crearSesion(
    usuarioId: number,
    tokenRenovacionHash: string,
    expiraEn: Date,
) {
    return prisma.sesion.create({
        data: {
            usuarioId,
            tokenRenovacionHash,
            expiraEn,
        },

        select: {
            id: true,
            creadaEn: true,
            expiraEn: true,
        },
    });
}

export async function findSessionByRefreshTokenHash(
    tokenRenovacionHash: string,
) {
    return prisma.sesion.findUnique({
        where: {
            tokenRenovacionHash,
        },

        select: {
            id: true,
            creadaEn: true,
            expiraEn: true,
            revocadaEn: true,

            usuario: {
                select: {
                    id: true,
                    identificador: true,
                    activo: true,

                    rol: {
                        select: {
                            id: true,
                            cod: true,
                            nombre: true,
                        },
                    },

                    empleado: {
                        select: {
                            id: true,
                            codEmpleado: true,
                            active: true,
                            habilitadoComoTecnico: true,
                        },
                    },
                },
            },
        },
    });
}

export async function revokeSessionByRefreshTokenHash(
    tokenRenovacionHash: string,
) {
    return prisma.sesion.updateMany({
        where: {
            tokenRenovacionHash,
            revocadaEn: null,
        },

        data: {
            revocadaEn: new Date(),
        },
    });
}

export function buscarSesionParaAutenticacion(
    sesionId: number,
) {
    return prisma.sesion.findUnique({
        where: {
            id: sesionId,
        },

        select: {
            id: true,
            creadaEn: true,
            expiraEn: true,
            revocadaEn: true,

            usuario: {
                select: {
                    id: true,
                    identificador: true,
                    activo: true,

                    rol: {
                        select: {
                            id: true,
                            cod: true,
                            nombre: true,
                        },
                    },

                    empleado: {
                        select: {
                            id: true,
                            codEmpleado: true,
                            active: true,
                            habilitadoComoTecnico: true,

                            persona: {
                                select: {
                                    firstName: true,
                                    secondName: true,
                                    firstLastName: true,
                                    secondLastName: true,
                                },
                            },
                        },
                    },
                },
            },
        },
    });
}