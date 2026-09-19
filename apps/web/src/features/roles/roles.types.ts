export interface Rol {
    id: number
    cod: string
    nombre: string
    descripcion: string | null
}

export interface ListarRolesResponse {
    data: Rol[]
}