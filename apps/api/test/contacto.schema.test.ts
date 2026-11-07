import { describe, expect, it } from 'vitest';
import { correoOpcionalSchema, telefonoNicaraguenseSchema } from '../src/shared/contacto.schema.js';

describe('validaciones de contacto nicaragüense', () => {
  it('normaliza teléfonos nacionales a +505 y exige ocho dígitos', () => {
    expect(telefonoNicaraguenseSchema.parse('88881234')).toBe('+50588881234');
    expect(telefonoNicaraguenseSchema.parse(' +50588881234 ')).toBe('+50588881234');
    for (const value of ['8888123', '888812345', '8888-1234', '+50688881234', 'abc888812']) {
      expect(telefonoNicaraguenseSchema.safeParse(value).success).toBe(false);
    }
    expect(telefonoNicaraguenseSchema.parse('   ')).toBeNull();
  });

  it('recorta y valida correo opcional', () => {
    const correo = correoOpcionalSchema();
    expect(correo.parse('  persona@example.com  ')).toBe('persona@example.com');
    expect(correo.parse('')).toBeNull();
    expect(correo.safeParse('persona@').success).toBe(false);
  });
});
