import type { Request, Response } from 'express';
import { AppError } from '../../../../errors/AppError.js';
import { prisma } from '../../../../infrastructure/prisma.js';

const MAX_ID = 2_147_483_647;
function idPositivo(value: unknown, field: string): number {
    const id = typeof value === 'number' ? value : typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : NaN;
    if (!Number.isSafeInteger(id) || id < 1 || id > MAX_ID) throw new AppError(400, `${field} debe ser un entero positivo.`);
    return id;
}
function texto(value: unknown, field: string, max: number, optional = false): string | null {
    if (value == null && optional) return null;
    if (typeof value !== 'string') throw new AppError(400, `${field} debe ser texto.`);
    const clean = value.trim();
    if ((!clean && !optional) || clean.length > max) throw new AppError(400, `${field} debe tener entre ${optional ? 0 : 1} y ${max} caracteres.`);
    return clean || null;
}
function pagina(query: Request['query']) {
    if (Object.keys(query).some(key => !['pagina', 'limite', 'sortBy', 'sortDir', 'q'].includes(key))) throw new AppError(400, 'Hay parámetros de consulta no permitidos.');
    if (Object.values(query).some(value => Array.isArray(value))) throw new AppError(400, 'No se permiten parámetros de consulta repetidos.');
    const parse = (raw: unknown, fallback: number, max: number) => {
        if (raw === undefined) return fallback;
        if (typeof raw !== 'string' || !/^\d+$/.test(raw)) throw new AppError(400, 'Los parámetros de paginación deben ser enteros positivos.');
        const n = Number(raw);
        if (!Number.isSafeInteger(n) || n < 1 || n > max) throw new AppError(400, 'Los parámetros de paginación están fuera de rango.');
        return n;
    };
    const pagina = parse(query.pagina, 1, 1_000_000);
    const limite = parse(query.limite, 25, 100);
    const sortBy = query.sortBy ?? 'creadaEn';
    const sortDir = query.sortDir ?? 'desc';
    if (typeof sortBy !== 'string' || !['id', 'titulo', 'creadaEn'].includes(sortBy)) throw new AppError(400, 'sortBy no es válido.');
    if (typeof sortDir !== 'string' || !['asc', 'desc'].includes(sortDir)) throw new AppError(400, 'sortDir no es válido.');
    let q: string | undefined;
    if (query.q !== undefined) {
        if (typeof query.q !== 'string' || query.q.length > 100) throw new AppError(400, 'q debe tener máximo 100 caracteres.');
        q = query.q.trim();
    }
    return { pagina, limite, sortBy, sortDir, q };
}
async function cliente(clienteId: number, mutacion = false) {
    const row = await prisma.cliente.findUnique({ where: { id: clienteId }, select: { id: true, activo: true } });
    if (!row) throw new AppError(404, 'El cliente no existe.');
    if (mutacion && !row.activo) throw new AppError(409, 'No se pueden registrar documentos para un cliente inactivo.');
}
function actor(req: Request): number {
    if (!req.auth?.usuario?.id) throw new AppError(401, 'Se requiere autenticación.');
    return req.auth.usuario.id;
}

export async function listarDocumentos(req: Request, res: Response) {
    const clienteId = idPositivo(req.params.clienteId, 'clienteId');
    await cliente(clienteId);
    const p = pagina(req.query);
    const where = { clienteId, ...(p.q ? { OR: [
        { titulo: { contains: p.q, mode: 'insensitive' as const } },
        { tipo: { contains: p.q, mode: 'insensitive' as const } },
        { nota: { contains: p.q, mode: 'insensitive' as const } },
    ] } : {}) };
    const orderBy = p.sortBy === 'id' ? [{ id: p.sortDir as 'asc' | 'desc' }] : p.sortBy === 'titulo'
        ? [{ titulo: p.sortDir as 'asc' | 'desc' }, { id: 'desc' as const }]
        : [{ creadaEn: p.sortDir as 'asc' | 'desc' }, { id: 'desc' as const }];
    const rows = await prisma.referenciaDocumentoComercial.findMany({ where, orderBy, skip: (p.pagina - 1) * p.limite, take: p.limite + 1 });
    const hayMas = rows.length > p.limite;
    res.json({ data: { items: rows.slice(0, p.limite), pagina: p.pagina, limite: p.limite, hayMas } });
}

export async function crearDocumento(req: Request, res: Response) {
    const clienteId = idPositivo(req.params.clienteId, 'clienteId');
    await cliente(clienteId, true);
    const allowed = ['titulo', 'tipo', 'url', 'nota'];
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body) || Object.keys(req.body).some(k => !allowed.includes(k)) || !Object.hasOwn(req.body, 'titulo') || !Object.hasOwn(req.body, 'tipo')) {
        throw new AppError(400, 'El cuerpo debe contener titulo y tipo, y únicamente los campos permitidos.');
    }
    let url = texto(req.body.url, 'url', 2048, true);
    if (url !== null) {
        try {
            const parsed = new URL(url);
            if (parsed.protocol !== 'https:' || !parsed.hostname) throw new Error('invalid URL');
            url = parsed.toString();
            if (url.length > 2048) throw new Error('URL too long');
        } catch { throw new AppError(400, 'url debe ser una URL HTTPS válida.'); }
    }
    const created = await prisma.referenciaDocumentoComercial.create({ data: {
        clienteId, autorId: actor(req), titulo: texto(req.body.titulo, 'titulo', 150)!, tipo: texto(req.body.tipo, 'tipo', 60)!,
        url, nota: texto(req.body.nota, 'nota', 500, true),
    } });
    res.status(201).json({ data: created });
}
