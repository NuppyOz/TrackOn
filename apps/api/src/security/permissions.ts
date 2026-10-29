import type { RoleCode } from './roles.js';

export const PERMISSION_CODES = {
    DASHBOARD: 'DASHBOARD',
    OPERACION: 'OPERACION',
    CLIENTES: 'CLIENTES',
    EMPLEADOS: 'EMPLEADOS',
    EQUIPOS: 'EQUIPOS',
    CUADRILLAS: 'CUADRILLAS',
    SERVICIOS: 'SERVICIOS',
    MATERIALES: 'MATERIALES',
    COMERCIAL: 'COMERCIAL',
    INTELIGENCIA: 'INTELIGENCIA',
    USUARIOS: 'USUARIOS',
    AUDITORIA: 'AUDITORIA',
} as const;

export type PermissionCode = typeof PERMISSION_CODES[keyof typeof PERMISSION_CODES];

const ALL_PERMISSIONS = Object.values(PERMISSION_CODES);

const ROLE_DEFAULTS: Record<RoleCode, readonly PermissionCode[]> = {
    ADMIN: ALL_PERMISSIONS,
    GTE_OPE: ALL_PERMISSIONS.filter(permission => !['USUARIOS', 'AUDITORIA'].includes(permission)),
    TEC: [PERMISSION_CODES.OPERACION, PERMISSION_CODES.CLIENTES, PERMISSION_CODES.EQUIPOS],
};

export function resolvePermissions(role: string, storedPermissions?: readonly string[]): PermissionCode[] {
    const validStored = storedPermissions?.filter((permission): permission is PermissionCode =>
        ALL_PERMISSIONS.includes(permission as PermissionCode),
    );

    if (validStored && validStored.length > 0) return [...new Set(validStored)];

    return [...(ROLE_DEFAULTS[role as RoleCode] ?? [])];
}

export function hasPermission(role: string, storedPermissions: readonly string[] | undefined, permission: PermissionCode): boolean {
    return resolvePermissions(role, storedPermissions).includes(permission);
}
