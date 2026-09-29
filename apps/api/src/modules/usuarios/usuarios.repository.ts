import { prisma } from '../../infrastructure/prisma.js';
import type {
    CreateUsuarioInput,
    UpdateUsuarioInput,
} from './usuarios.schema.js';

type CreateUsuarioRepositoryInput =
    Omit<CreateUsuarioInput, 'password'> & {
        passwordHash: string;
    };

export function buscarEmpleadoParaUsuario(
    empleadoId: number,
) {
    return prisma.empleado.findUnique({
        where: {
            id: empleadoId,
        },

        select: {
            id: true,
            codEmpleado: true,
            active: true,
            habilitadoComoTecnico: true,

            usuario: {
                select: {
                    id: true,
                },
            },

            persona: {
                select: {
                    firstName: true,
                    secondName: true,
                    firstLastName: true,
                    secondLastName: true,
                },
            },
        },
    });
}

export function buscarRolPorId(rolId: number) {
    return prisma.rol.findUnique({
        where: {
            id: rolId,
        },

        select: {
            id: true,
            cod: true,
            nombre: true,
        },
    });
}

export function buscarUsuarioPorIdentificador(
    identificador: string,
) {
    return prisma.usuario.findUnique({
        where: {
            identificador,
        },

        select: {
            id: true,
            identificador: true,
        },
    });
}

export function crearUsuario(
    datos: CreateUsuarioRepositoryInput,
) {
    return prisma.usuario.create({
        data: {
            empleadoId: datos.empleadoId,
            rolId: datos.rolId,
            identificador: datos.identificador,
            passwordHash: datos.passwordHash,
        },

        select: {
            id: true,
            identificador: true,
            activo: true,
            creadoEn: true,
            actualizadoEn: true,

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

export function listarUsuarios() {
    return prisma.usuario.findMany({
        select: {
            id: true,
            identificador: true,
            activo: true,
            creadoEn: true,
            actualizadoEn: true,

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

        orderBy: {
            identificador: 'asc',
        },
    });
}

export function buscarUsuarioPorId(id: number) {
    return prisma.usuario.findUnique({
        where: {
            id,
        },

        select: {
            id: true,
            identificador: true,
            activo: true,
            creadoEn: true,
            actualizadoEn: true,

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
                            telephone: true,
                            correo: true,
                        },
                    },
                },
            },
        },
    });
}

export function actualizarUsuario(
    id: number,
    datos: UpdateUsuarioInput,
) {
    return prisma.usuario.update({
        where: {
            id,
        },

        data: {
            ...(datos.identificador !== undefined
                ? {
                      identificador:
                          datos.identificador,
                  }
                : {}),

            ...(datos.rolId !== undefined
                ? {
                      rolId: datos.rolId,
                  }
                : {}),
        },

        select: {
            id: true,
            identificador: true,
            activo: true,
            creadoEn: true,
            actualizadoEn: true,

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

export function actualizarEstadoUsuario(
    id: number,
    activo: boolean,
) {
    return prisma.usuario.update({
        where: {
            id,
        },

        data: {
            activo,
        },

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
    });
}