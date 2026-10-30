export type TipoDocumento = 'CEDULA_NIC' | 'CEDULA_RESIDENCIA' | 'PASAPORTE';

export interface PersonaEmpleado {
    id?: number;
    firstName: string;
    secondName?: string | null;
    firstLastName: string;
    secondLastName?: string | null;
    typeDocument?: TipoDocumento | null;
    numberDocument?: string | null;
    telephone?: string | null;
    correo?: string | null;
}

export interface EmpleadoResumen {
    id: number;
    codEmpleado: string;
    active: boolean;
    habilitadoComoTecnico: boolean;
    persona: Pick<PersonaEmpleado, 'firstName' | 'secondName' | 'firstLastName' | 'secondLastName'>;
}

export interface EmpleadoDetalle extends EmpleadoResumen {
    personaId: number;
    persona: PersonaEmpleado;
}

export interface CrearEmpleado {
    codEmpleado: string;
    persona: Omit<PersonaEmpleado, 'id'>;
}

export interface EditarEmpleado {
    codEmpleado?: string;
    persona?: Partial<Omit<PersonaEmpleado, 'id'>>;
}

export type FiltroEstado = 'todos' | 'activos' | 'inactivos';
export type FiltroTecnico = 'todos' | 'habilitados' | 'no-habilitados';

export interface FiltrosEmpleados {
    buscar: string;
    estado: FiltroEstado;
    tecnico: FiltroTecnico;
    pagina: number;
    limite: number;
}

export function nombreEmpleado(empleado: Pick<EmpleadoResumen, 'persona'>): string {
    return [empleado.persona.firstName, empleado.persona.secondName,
        empleado.persona.firstLastName, empleado.persona.secondLastName]
        .filter(Boolean).join(' ');
}
