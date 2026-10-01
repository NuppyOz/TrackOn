export type AuthContext = {
    sesionId: number;

    usuario: {
        id: number;
        identificador: string;

        rol: {
            id: number;
            cod: string;
            nombre: string;
        };

        empleado: {
            id: number;
            codEmpleado: string;
            active: boolean;
            habilitadoComoTecnico: boolean;

            persona: {
                firstName: string;
                secondName: string | null;
                firstLastName: string;
                secondLastName: string | null;
            };
        };
    };
};

declare global {
    namespace Express {
        interface Request {
            auth?: AuthContext;
        }
    }
}