import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
    cliente: { findUnique: vi.fn() },
    notaComercial: { findMany: vi.fn(), create: vi.fn() },
    referenciaDocumentoComercial: { findMany: vi.fn(), create: vi.fn() },
}));
vi.mock('../src/infrastructure/prisma.js', () => ({ prisma: prismaMock }));

import { listarNotas, crearNota } from '../src/modules/comercial/crm/notas/notas.controller.js';
import { listarDocumentos, crearDocumento } from '../src/modules/comercial/crm/documentos/documentos.controller.js';
import { AppError } from '../src/errors/AppError.js';

function request({ params = { clienteId: '12' }, query = {}, body = {}, auth = { usuario: { id: 7 } } }: any = {}) {
    return { params, query, body, auth } as any;
}
function response() {
    const res: any = { statusCode: 200, status(code: number) { this.statusCode = code; return this; }, json(body: unknown) { this.body = body; return this; } };
    return res;
}

describe('BE03 notas y referencias documentales CRM', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        prismaMock.cliente.findUnique.mockResolvedValue({ id: 12, activo: true });
    });

    it('crea nota con actor de sesión y texto recortado', async () => {
        prismaMock.notaComercial.create.mockImplementation(async ({ data }) => data);
        const res = response();
        await crearNota(request({ body: { texto: '  Llamar el viernes  ' } }), res);
        expect(res.statusCode).toBe(201);
        expect(prismaMock.notaComercial.create).toHaveBeenCalledWith({ data: { clienteId: 12, autorId: 7, texto: 'Llamar el viernes' } });
    });

    it('rechaza cuerpo abierto, texto fuera de límite y cliente inactivo en mutaciones', async () => {
        await expect(crearNota(request({ body: { texto: 'nota', autorId: 99 } }), response())).rejects.toBeInstanceOf(AppError);
        await expect(crearNota(request({ body: { texto: 'x'.repeat(2001) } }), response())).rejects.toBeInstanceOf(AppError);
        prismaMock.cliente.findUnique.mockResolvedValueOnce({ id: 12, activo: false });
        await expect(crearNota(request({ body: { texto: 'nota' } }), response())).rejects.toMatchObject({ statusCode: 409 });
        expect(prismaMock.notaComercial.create).not.toHaveBeenCalled();
    });

    it('busca y pagina antes de responder con orden estable', async () => {
        prismaMock.notaComercial.findMany.mockResolvedValue([{ id: 8 }, { id: 7 }, { id: 6 }]);
        const res = response();
        await listarNotas(request({ query: { q: '  visita ', pagina: '2', limite: '2' } }), res);
        expect(prismaMock.notaComercial.findMany).toHaveBeenCalledWith(expect.objectContaining({
            where: { clienteId: 12, texto: { contains: 'visita', mode: 'insensitive' } },
            orderBy: [{ creadaEn: 'desc' }, { id: 'desc' }], skip: 2, take: 3,
        }));
        expect(res.body).toEqual({ data: { items: [{ id: 8 }, { id: 7 }], pagina: 2, limite: 2, hayMas: true } });
    });

    it('rechaza filtros ignorados, orden no permitido e IDs inválidos', async () => {
        await expect(listarNotas(request({ query: { desconocido: 'x' } }), response())).rejects.toBeInstanceOf(AppError);
        await expect(listarDocumentos(request({ params: { clienteId: '0' } }), response())).rejects.toBeInstanceOf(AppError);
        await expect(listarDocumentos(request({ query: { sortBy: 'autorId' } }), response())).rejects.toBeInstanceOf(AppError);
        expect(prismaMock.referenciaDocumentoComercial.findMany).not.toHaveBeenCalled();
    });

    it('acepta URL HTTPS y rechaza otros esquemas sin persistirlos', async () => {
        prismaMock.referenciaDocumentoComercial.create.mockImplementation(async ({ data }) => data);
        const res = response();
        await crearDocumento(request({ body: { titulo: ' Contrato ', tipo: ' PDF ', url: 'https://example.com/doc' } }), res);
        expect(res.statusCode).toBe(201);
        expect(prismaMock.referenciaDocumentoComercial.create).toHaveBeenCalledWith({ data: expect.objectContaining({
            clienteId: 12, autorId: 7, titulo: 'Contrato', tipo: 'PDF', url: 'https://example.com/doc', nota: null,
        }) });
        await expect(crearDocumento(request({ body: { titulo: 'Contrato', tipo: 'PDF', url: 'http://example.com/doc' } }), response())).rejects.toMatchObject({ statusCode: 400 });
        expect(prismaMock.referenciaDocumentoComercial.create).toHaveBeenCalledTimes(1);
    });
});
