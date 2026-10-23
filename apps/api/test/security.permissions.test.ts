import { describe, expect, it } from 'vitest';

import {
    hasPermission,
    PERMISSION_CODES,
    resolvePermissions,
} from '../src/security/permissions.js';

describe('permisos efectivos', () => {
    it('usa los permisos predeterminados de cada rol', () => {
        expect(resolvePermissions('ADMIN')).toEqual(Object.values(PERMISSION_CODES));
        expect(resolvePermissions('GTE_OPE')).not.toContain(PERMISSION_CODES.USUARIOS);
        expect(resolvePermissions('GTE_OPE')).not.toContain(PERMISSION_CODES.AUDITORIA);
        expect(resolvePermissions('TEC')).toEqual([
            PERMISSION_CODES.OPERACION,
            PERMISSION_CODES.CLIENTES,
            PERMISSION_CODES.EQUIPOS,
        ]);
        expect(resolvePermissions('DESCONOCIDO')).toEqual([]);
    });

    it('filtra y elimina permisos personalizados duplicados', () => {
        expect(resolvePermissions('TEC', [
            PERMISSION_CODES.COMERCIAL,
            'NO_EXISTE',
            PERMISSION_CODES.COMERCIAL,
        ])).toEqual([PERMISSION_CODES.COMERCIAL]);
    });

    it('vuelve a los valores del rol si la lista guardada no aporta permisos válidos', () => {
        expect(resolvePermissions('TEC', [])).toContain(PERMISSION_CODES.OPERACION);
        expect(resolvePermissions('TEC', ['NO_EXISTE'])).toContain(PERMISSION_CODES.CLIENTES);
    });

    it('comprueba permisos predeterminados y personalizados', () => {
        expect(hasPermission('TEC', undefined, PERMISSION_CODES.EQUIPOS)).toBe(true);
        expect(hasPermission('TEC', [PERMISSION_CODES.COMERCIAL], PERMISSION_CODES.EQUIPOS)).toBe(false);
    });
});
