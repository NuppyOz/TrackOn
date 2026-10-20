import { Prisma } from '@prisma/client';
import { prisma } from '../../../../infrastructure/prisma.js';
import type { HistorialQuery } from './historial.schema.js';

export interface HistorialComercialRow {
    id: string;
    tipo: 'NOTA' | 'COTIZACION' | 'VENTA';
    fecha: Date;
    titulo: string;
    descripcion: string;
    referenciaId: number;
}

/** Union con filtros, orden y paginación en PostgreSQL para no cargar el historial completo en memoria. */
export async function listar(clienteId: number, filtros: HistorialQuery): Promise<HistorialComercialRow[]> {
    const q = filtros.q || undefined;
    const offset = (filtros.pagina - 1) * filtros.limite;
    const take = filtros.limite + 1;
    const ramas: Prisma.Sql[] = [];

    if (!filtros.tipo || filtros.tipo === 'NOTA') {
        const filtroQ = q ? Prisma.sql`AND (
            POSITION(lower(${q}) IN lower(n."texto")) > 0 OR
            POSITION(lower(${q}) IN lower(n."id"::text)) > 0
        )` : Prisma.empty;
        ramas.push(Prisma.sql`
            SELECT ('NOTA:' || n."id"::text) AS id, 'NOTA'::text AS tipo,
                   n."creadaEn" AS fecha, 'Nota comercial'::text AS titulo,
                   n."texto" AS descripcion, n."id" AS "referenciaId"
            FROM "notas_comerciales" n
            WHERE n."clienteId" = ${clienteId} ${filtroQ}
        `);
    }
    if (!filtros.tipo || filtros.tipo === 'COTIZACION') {
        const filtroQ = q ? Prisma.sql`AND (
            POSITION(lower(${q}) IN lower(c."clienteNombreRegistrado")) > 0 OR
            POSITION(lower(${q}) IN lower(c."estado")) > 0 OR
            POSITION(lower(${q}) IN lower(coalesce(c."nota", ''))) > 0 OR
            POSITION(lower(${q}) IN lower(c."id"::text)) > 0 OR
            POSITION(lower(${q}) IN lower(c."total"::text)) > 0
        )` : Prisma.empty;
        ramas.push(Prisma.sql`
            SELECT ('COTIZACION:' || c."id"::text) AS id, 'COTIZACION'::text AS tipo,
                   c."creadaEn" AS fecha, ('Cotización #' || c."id"::text) AS titulo,
                   ('Estado ' || c."estado" || '; total ' || c."total"::text || ' ' || c."moneda") AS descripcion,
                   c."id" AS "referenciaId"
            FROM "cotizaciones_comerciales" c
            WHERE c."clienteId" = ${clienteId} ${filtroQ}
        `);
    }
    if (!filtros.tipo || filtros.tipo === 'VENTA') {
        const filtroQ = q ? Prisma.sql`AND (
            POSITION(lower(${q}) IN lower(v."id"::text)) > 0 OR
            POSITION(lower(${q}) IN lower(c."id"::text)) > 0 OR
            POSITION(lower(${q}) IN lower(c."clienteNombreRegistrado")) > 0 OR
            POSITION(lower(${q}) IN lower(v."total"::text)) > 0
        )` : Prisma.empty;
        ramas.push(Prisma.sql`
            SELECT ('VENTA:' || v."id"::text) AS id, 'VENTA'::text AS tipo,
                   v."confirmadaEn" AS fecha, ('Venta #' || v."id"::text) AS titulo,
                   ('Venta registrada para ' || c."clienteNombreRegistrado" || ', cotización #' || c."id"::text ||
                    ', total ' || v."total"::text || ' ' || v."moneda") AS descripcion,
                   v."id" AS "referenciaId"
            FROM "ventas_comerciales" v
            JOIN "cotizaciones_comerciales" c ON c."id" = v."cotizacionId"
            WHERE v."clienteId" = ${clienteId} ${filtroQ}
        `);
    }

    const union = Prisma.join(ramas, ' UNION ALL ');
    return prisma.$queryRaw<HistorialComercialRow[]>(Prisma.sql`
        SELECT id, tipo, fecha, titulo, descripcion, "referenciaId"
        FROM (${union}) AS historial
        ORDER BY fecha DESC, id ASC
        LIMIT ${take} OFFSET ${offset}
    `);
}
