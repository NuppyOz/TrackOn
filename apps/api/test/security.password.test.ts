import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../src/security/password.js';

describe('protección de contraseñas', () => {
    it('almacena un hash scrypt con salt y nunca la contraseña original', async () => {
        const password = 'Clave-segura-1234';
        const primero = await hashPassword(password);
        const segundo = await hashPassword(password);
        expect(primero).toMatch(/^scrypt\$/);
        expect(primero).not.toContain(password);
        expect(primero).not.toBe(segundo);
        expect(await verifyPassword(password, primero)).toBe(true);
        expect(await verifyPassword('incorrecta', primero)).toBe(false);
    });
});
