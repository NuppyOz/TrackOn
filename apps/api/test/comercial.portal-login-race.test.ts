import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const account = {
    id: 5, clienteId: 9, identificador: 'cliente9', passwordHash: 'old-hash', activo: true, version: 1,
    cliente: { activo: true, persona: null, organizacion: null },
  };
  return {
    account,
    current: { ...account, cliente: { activo: true } },
    verify: vi.fn<(...args: unknown[]) => Promise<boolean>>(),
    createSession: vi.fn(),
    findCount: 0,
    transaction: vi.fn(),
  };
});

vi.mock('../src/infrastructure/prisma.js', () => ({
  prisma: {
    cuentaPortal: { findUnique: vi.fn(async () => {
      mocks.findCount += 1;
      return mocks.findCount === 1 ? mocks.account : mocks.current;
    }) },
    sesionPortal: { create: mocks.createSession },
    $transaction: mocks.transaction,
  },
}));
vi.mock('../src/security/password.js', () => ({ verifyPassword: mocks.verify, hashPassword: vi.fn() }));

import { AppError } from '../src/errors/AppError.js';
import { iniciarSesion } from '../src/modules/comercial/portal/portal.service.js';

describe('portal login concurrente con restablecimiento', () => {
  beforeEach(() => {
    mocks.account.passwordHash = 'old-hash';
    mocks.account.version = 1;
    mocks.current.passwordHash = 'old-hash';
    mocks.current.version = 1;
    mocks.findCount = 0;
    mocks.createSession.mockReset();
    mocks.verify.mockReset();
    mocks.verify.mockImplementation(async () => true);
    mocks.transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => callback({
      cuentaPortal: { findUnique: async () => mocks.current },
      sesionPortal: { create: mocks.createSession },
    }));
  });

  it('no crea sesión si el password/version cambia tras verificar la contraseña', async () => {
    let finishVerification: (() => void) | undefined;
    mocks.verify.mockImplementation(() => new Promise(resolve => {
      finishVerification = () => resolve(true);
    }));
    const login = iniciarSesion('cliente9', 'password-capturada');
    await Promise.resolve();
    await Promise.resolve();
    mocks.current.passwordHash = 'new-hash';
    mocks.current.version = 2;
    finishVerification?.();
    await expect(login).rejects.toMatchObject<AppError>({ statusCode: 401 });
    expect(mocks.createSession).not.toHaveBeenCalled();
  });
});
