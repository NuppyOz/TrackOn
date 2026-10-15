import { describe, expect, it } from 'vitest';
import { registrarMaterialOrdenSchema } from '../src/modules/ordenes/ordenes.trabajo.schema.js';
import { evidenciaSchema, tipoRealArchivo } from '../src/modules/ordenes/ordenes.evidencias.schema.js';
import { equipoProvisionalSchema } from '../src/modules/ordenes/ordenes.equipos.schema.js';
import { jornadaManagua } from '../src/modules/dashboard/dashboard.repository.js';

describe('Validaciones de ejecución técnica', () => {
    it.each([0, -1, 1.0001, 1000000000, Infinity, NaN])('rechaza cantidad inválida %s', cantidad => {
        expect(registrarMaterialOrdenSchema.safeParse({ materialId: 1, cantidad }).success).toBe(false);
    });
    it.each([0.001, 1.5, 999999999.999])('admite cantidades dentro de Decimal(12,3): %s', cantidad => {
        expect(registrarMaterialOrdenSchema.safeParse({ materialId: 1, cantidad }).success).toBe(true);
    });
    it('requiere razones para identificación no visible', () => {
        const datos = { descripcionProvisional: 'Equipo instalado en recepción', tipoRegistrado: 'Aire acondicionado', marcaRegistrada: null, modeloRegistrado: null, serieRegistrada: null, motivoMarcaNoVisible: null, motivoModeloNoVisible: null, motivoSerieNoVisible: null };
        expect(equipoProvisionalSchema.safeParse(datos).success).toBe(false);
        expect(equipoProvisionalSchema.safeParse({ ...datos, motivoMarcaNoVisible: 'Etiqueta deteriorada', motivoModeloNoVisible: 'Etiqueta deteriorada', motivoSerieNoVisible: 'Etiqueta deteriorada' }).success).toBe(true);
    });
    it('no confía en extensión o MIME declarado', () => {
        expect(tipoRealArchivo(Buffer.from('<script>alert(1)</script>'))).toBeNull();
        expect(tipoRealArchivo(Buffer.from('%PDF-1.7'))).toBe('application/pdf');
    });
    it('rechaza nombres con rutas y tamaños excesivos', () => {
        expect(evidenciaSchema.safeParse({ nombreOriginal: '../foto.png', tipoArchivo: 'image/png', tamanoBytes: 9000000, hashArchivo: 'a'.repeat(64) }).success).toBe(false);
    });
    it('calcula el día operativo de Managua incluso junto al cambio UTC de fecha', () => {
        const jornada = jornadaManagua(new Date('2026-10-11T01:00:00Z'));
        expect(jornada.fecha).toBe('2026-10-10');
        expect(jornada.inicio.toISOString()).toBe('2026-10-10T06:00:00.000Z');
        expect(jornada.fin.toISOString()).toBe('2026-10-11T06:00:00.000Z');
    });
});
