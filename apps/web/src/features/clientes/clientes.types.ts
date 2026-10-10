export type TipoCliente = "NATURAL" | "EMPRESA";
export type TipoDocumento = "CEDULA_NIC" | "CEDULA_RESIDENCIA" | "PASAPORTE";

export interface Cliente {
    id: number;
    codigo: string;
    activo: boolean;
    telefonoComercial: string | null;
    correoComercial: string | null;
    persona: {
        firstName: string;
        secondName: string | null;
        firstLastName: string;
        secondLastName: string | null;
        typeDocument: TipoDocumento | null;
        numberDocument: string | null;
        telephone: string | null;
        correo: string | null;
    } | null;
    organizacion: {
        razonSocial: string;
        nombreComercial: string | null;
        identificacionTributaria: string | null;
    } | null;
}

export type ClienteNuevo = {
    codigo: string;
    telefonoComercial?: string;
    correoComercial?: string;
} & (
    | {
        tipo: "NATURAL";
        persona: {
            firstName: string;
            firstLastName: string;
            typeDocument: TipoDocumento;
            numberDocument: string;
            secondName?: string;
            secondLastName?: string;
            telephone?: string;
            correo?: string;
        };
    }
    | {
        tipo: "EMPRESA";
        organizacion: {
            razonSocial: string;
            identificacionTributaria: string;
            nombreComercial?: string;
        };
    }
);

export interface UbicacionCliente {
    id: number;
    clienteId: number;
    nombre: string;
    direccion: string;
    referencia: string | null;
    contactoNombre: string | null;
    contactoTelefono: string | null;
    activa: boolean;
    _count?: { equipos: number };
}

export interface UbicacionNueva {
    clienteId: number;
    nombre: string;
    direccion: string;
    referencia?: string;
    contactoNombre?: string;
    contactoTelefono?: string;
}

export interface PaginaUbicaciones {
    items: UbicacionCliente[];
    pagina: number;
    limite: number;
    hayMas: boolean;
}

export function nombreCliente(cliente: Cliente): string {
    if (cliente.organizacion) {
        return cliente.organizacion.nombreComercial || cliente.organizacion.razonSocial;
    }
    if (cliente.persona) {
        return [cliente.persona.firstName, cliente.persona.secondName,
            cliente.persona.firstLastName, cliente.persona.secondLastName]
            .filter(Boolean).join(" ");
    }
    return cliente.codigo;
}
