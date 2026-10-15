import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prepararEvidencia } from '../src/features/ordenes/ordenes.evidencias.api';
const mocks = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock('../src/shared/api', () => ({ api: mocks.api }));
beforeEach(() => vi.resetAllMocks());
describe('Validación previa a una carga de evidencia', () => {
    it.each([
        new File([], 'vacia.png', { type: 'image/png' }),
        new File(['contenido'], 'script.html', { type: 'text/html' }),
    ])('rechaza un archivo inválido antes de crear metadatos', async archivo => {
        await expect(prepararEvidencia(1, 2, archivo)).rejects.toThrow();
        expect(mocks.api).not.toHaveBeenCalled();
    });
});
