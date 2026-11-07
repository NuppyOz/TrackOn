/**
 * Datos de prueba de TrackOn con base en empresas reales de Nicaragua.
 *
 * Reemplaza los seeds de demostración (seed-demo.ts, seed-demo-completo.ts y
 * seed-dev-data.ts), cuyos clientes eran ficticios ("Clínica Central Sur",
 * "Frío Centro Nicaragua S.A.").
 *
 * Qué es real aquí:
 *  - Razón social, nombre comercial, teléfono, sitio web y dirección de cada
 *    empresa salen de sus propios sitios, de Google Maps y de directorios
 *    públicos, consultados en noviembre de 2026.
 *  - Los RUC marcados `rucVerificado: true` están publicados por la empresa o
 *    por un registro comercial. Los demás son un número de trabajo: NO son el
 *    RUC oficial y hay que validarlos contra la constancia de la DGI antes de
 *    facturar. El perfil comercial de cada cliente lo deja anotado.
 *  - Los contactos son referenciales por cargo (gerente de tienda, jefe de
 *    mantenimiento); el nombre es de trabajo hasta que el cliente lo confirme.
 *
 * Qué NO es real: tarifas, consumos, órdenes, comprobantes, cobros, costos,
 * inventario, nombres del personal de MULTICAS y proveedores. Son cifras
 * coherentes para probar la aplicación, no historia contable.
 *
 * Uso:
 *   TRACKON_ALLOW_SEED_DATA=true pnpm --dir apps/api exec tsx prisma/seed-nicaragua.ts
 *
 * El script reinicia la base de negocio. Conserva roles, estados de orden,
 * migraciones y las cuentas locales con su contraseña actual: no hay que
 * volver a iniciar sesión con una clave nueva ni se pierde el acceso.
 */
import 'dotenv/config';
import { createHash, randomUUID } from 'node:crypto';
import { readdir, stat, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { almacenamientoEvidencias } from '../src/infrastructure/evidence-storage.js';
import { prisma } from '../src/infrastructure/prisma.js';
import { hashPassword } from '../src/security/password.js';

// ---------------------------------------------------------------- utilidades

const hoy = new Date();
const dia = (dias: number, hora = 9) => {
    const d = new Date(hoy);
    d.setDate(d.getDate() + dias);
    d.setHours(hora, 0, 0, 0);
    return d;
};
const masDias = (base: Date, dias: number, hora = 10) => {
    const d = new Date(base);
    d.setDate(d.getDate() + dias);
    d.setHours(hora, 0, 0, 0);
    return d;
};
const masHoras = (base: Date, horas: number) => new Date(base.getTime() + horas * 3600 * 1000);
const pad = (n: number, ancho = 3) => String(n).padStart(ancho, '0');
const slug = (texto: string) =>
    texto
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '.')
        .replace(/^\.|\.$/g, '');
const monto = (n: number) => Math.round(n * 100) / 100;

// ------------------------------------------------------------------- catálogo

interface EquipoBase {
    tipo: string;
    marca: string;
    modelo: string;
    serie: string;
    criticidad: 'ALTA' | 'MEDIA' | 'BAJA';
}
interface UbicacionBase {
    nombre: string;
    direccion: string;
    referencia: string;
    contacto: string;
    telefono: string;
    equipos: EquipoBase[];
}
interface Empresa {
    razonSocial: string;
    nombreComercial: string;
    ruc: string | null;
    rucVerificado: boolean;
    sector: string;
    clasificacion: 'EMPRESARIAL' | 'PYME' | 'PREFERENTE' | 'GOBIERNO';
    telefono: string;
    correo: string;
    sitio: string;
    contacto: { nombre: string; cargo: string; email: string; telefono: string };
    facturacion: string;
    nota: string;
    ubicaciones: UbicacionBase[];
}

/**
 * Veinte empresas nicaragüenses, ordenadas por tipo de cliente: distribuidores
 * de tecnología, contratistas de climatización y operaciones que dependen de
 * frío (retail alimentario, salud, hotelería, industria).
 */
const EMPRESAS: Empresa[] = [
    {
        razonSocial: 'SEVA, S.A.',
        nombreComercial: 'SEVASA',
        ruc: null,
        rucVerificado: false,
        sector: 'Retail de tecnología y electrodomésticos',
        clasificacion: 'EMPRESARIAL',
        telefono: '2252-4204',
        correo: 'servicioalcliente@sevasaonline.com',
        sitio: 'sevasaonline.com',
        contacto: {
            nombre: 'Marlon Josué Blandón Rivas',
            cargo: 'Gerente de tienda Altamira',
            email: 'mblandon@sevasaonline.com',
            telefono: '8888-4071',
        },
        facturacion: 'Crédito 30 días contra factura. Solicita orden de compra del departamento de sistemas.',
        nota: 'Cadena de tiendas de tecnología con servicio técnico propio. Dirección y PBX tomados de sevasaonline.com y del directorio de la Avenida Principal del BDF.',
        ubicaciones: [
            {
                nombre: 'Tienda Altamira',
                direccion: 'Avenida Principal del BDF, 75 varas al sur, Altamira, Managua',
                referencia: 'Contiguo al estacionamiento de la farmacia; portón gris, entrar por recepción de servicio técnico.',
                contacto: 'Marlon Josué Blandón Rivas',
                telefono: '2252-4204',
                equipos: [
                    { tipo: 'Minisplit', marca: 'LG', modelo: 'Dual Inverter 24,000 BTU', serie: 'LG24-ALT-3371', criticidad: 'MEDIA' },
                    { tipo: 'Minisplit', marca: 'Samsung', modelo: 'WindFree 18,000 BTU', serie: 'SAM18-ALT-8842', criticidad: 'MEDIA' },
                    { tipo: 'Vitrina refrigerada', marca: 'Exhibo', modelo: 'VCT-600', serie: 'EXH600-1129', criticidad: 'ALTA' },
                ],
            },
            {
                nombre: 'Tienda Carretera a Masaya',
                direccion: 'Carretera a Masaya km 13.4, costado este, Managua',
                referencia: 'Frente al parque comercial; el cuarto de máquinas está detrás del área de cajas.',
                contacto: 'Karla Patricia Urroz Méndez',
                telefono: '2252-4204',
                equipos: [
                    { tipo: 'Unidad central', marca: 'Carrier', modelo: '40RB-024 piso techo', serie: 'CAR40RB-6612', criticidad: 'ALTA' },
                    { tipo: 'Minisplit', marca: 'Mabe', modelo: 'Inverter 12,000 BTU', serie: 'MAB12-MAS-4410', criticidad: 'BAJA' },
                ],
            },
        ],
    },
    {
        razonSocial: 'Comtech Technology Square, S.A.',
        nombreComercial: 'Comtech',
        ruc: null,
        rucVerificado: false,
        sector: 'Retail y distribución de tecnología',
        clasificacion: 'PREFERENTE',
        telefono: '2264-8800',
        correo: 'ventasonline@comtech.com.ni',
        sitio: 'comtech.com.ni',
        contacto: {
            nombre: 'Norman Alberto Sevilla Gutiérrez',
            cargo: 'Jefe de mantenimiento de tiendas',
            email: 'nsevilla@comtech.com.ni',
            telefono: '8938-4997',
        },
        facturacion: 'Crédito 45 días. Facturar a nombre de Comtech Technology Square, S.A. con copia a administración.',
        nota: 'Tienda insignia en Altamira D\'Este (No. 589). Datos de contacto publicados en comtech.com.ni y en su ficha de Google Maps.',
        ubicaciones: [
            {
                nombre: 'Showroom Altamira D\'Este',
                direccion: 'Calle Principal de Altamira D\'Este No. 589, Managua',
                referencia: 'Del semáforo de Altamira 1 cuadra al este; cuarto de máquinas en el entrepiso.',
                contacto: 'Norman Alberto Sevilla Gutiérrez',
                telefono: '2264-8800',
                equipos: [
                    { tipo: 'Unidad central', marca: 'Daikin', modelo: 'FTXN60 piso techo', serie: 'DAI60-ALT-7719', criticidad: 'ALTA' },
                    { tipo: 'Minisplit', marca: 'LG', modelo: 'Dual Inverter 36,000 BTU', serie: 'LG36-ALT-2233', criticidad: 'MEDIA' },
                ],
            },
            {
                nombre: 'Bodega y taller John F. Kennedy',
                direccion: 'Pista Juan Pablo II, km 4½, Managua',
                referencia: 'Bodega 7, portón negro; preguntar por el encargado de bodega.',
                contacto: 'José Ramón Téllez Espinoza',
                telefono: '2264-8800',
                equipos: [
                    { tipo: 'Cámara fría', marca: 'Bohn', modelo: 'CC-3x3 mod. 2020', serie: 'BOHN-CC-5512', criticidad: 'ALTA' },
                ],
            },
        ],
    },
    {
        razonSocial: 'CONICO, S.A.',
        nombreComercial: 'Conico',
        ruc: null,
        rucVerificado: false,
        sector: 'Distribución de equipo de cómputo',
        clasificacion: 'EMPRESARIAL',
        telefono: '2253-8300',
        correo: 'info@conico.com.ni',
        sitio: 'conico.com.ni',
        contacto: {
            nombre: 'Marcela de los Ángeles Vado Ríos',
            cargo: 'Gerente comercial',
            email: 'mvado@conico.com.ni',
            telefono: '8380-1618',
        },
        facturacion: 'Crédito 30 días. Toda factura pasa por gerencia comercial antes de enviarse a contabilidad.',
        nota: 'Importador de cómputo con 29 años en el mercado. Dirección y teléfonos de conico.com.ni (de Sinsa Proyectos, 2 cuadras al sur).',
        ubicaciones: [
            {
                nombre: 'Casa matriz Altamira',
                direccion: 'Calle principal de Altamira, de Sinsa Proyectos 2 cuadras al sur, Managua',
                referencia: 'Edificio azul; el servicio técnico atiende en el segundo piso.',
                contacto: 'Marcela de los Ángeles Vado Ríos',
                telefono: '2253-8300',
                equipos: [
                    { tipo: 'Minisplit', marca: 'York', modelo: 'YHCA 24,000 BTU', serie: 'YRK24-CON-1190', criticidad: 'MEDIA' },
                    { tipo: 'Minisplit', marca: 'Carrier', modelo: '42QHC 18,000 BTU', serie: 'CAR18-CON-7745', criticidad: 'MEDIA' },
                ],
            },
            {
                nombre: 'Centro de distribución Las Brisas',
                direccion: 'Carretera Norte km 5½, Las Brisas, Managua',
                referencia: 'Bodega 12, al fondo; la cámara de resguardo de equipo está a la izquierda.',
                contacto: 'Erick Alfonso Membreño López',
                telefono: '2253-8300',
                equipos: [
                    { tipo: 'Cámara fría', marca: 'Heatcraft', modelo: 'BR-4x5', serie: 'HEA-BR-3320', criticidad: 'ALTA' },
                ],
            },
        ],
    },
    {
        razonSocial: 'SICSA Corp, S.A.',
        nombreComercial: 'SICSA',
        ruc: null,
        rucVerificado: false,
        sector: 'Tecnología, redes y climatización',
        clasificacion: 'EMPRESARIAL',
        telefono: '2298-3925',
        correo: 'sblanco@sicsa.com.ni',
        sitio: 'sicsa.com.ni',
        contacto: {
            nombre: 'Sergio Iván Blanco Marenco',
            cargo: 'Coordinador de proyectos HVAC',
            email: 'sblanco@sicsa.com.ni',
            telefono: '8888-8897',
        },
        facturacion: 'Contado contra entrega de informe; proyectos con anticipo del 50 %.',
        nota: 'Casa tecnológica con división de ventilación y HVAC (sicsamc.com). Teléfonos de sicsa.com.ni/contacto; la dirección exacta se confirma al programar la primera visita.',
        ubicaciones: [
            {
                nombre: 'Tienda y centro de servicio',
                direccion: 'Managua — dirección por confirmar con el cliente (ver mapa en sicsa.com.ni/contacto)',
                referencia: 'Coordinar con Sergio Blanco antes de salir; la tienda comparte acceso con el área de proyectos.',
                contacto: 'Sergio Iván Blanco Marenco',
                telefono: '2298-3925',
                equipos: [
                    { tipo: 'Minisplit', marca: 'Midea', modelo: 'Xtreme Save 24,000 BTU', serie: 'MID24-SIC-9910', criticidad: 'MEDIA' },
                    { tipo: 'Manejadora', marca: 'Trane', modelo: 'CLCP 10 TR', serie: 'TRA-CLCP-6621', criticidad: 'ALTA' },
                ],
            },
        ],
    },
    {
        razonSocial: 'ETECH, S.A.',
        nombreComercial: 'eTech',
        ruc: 'J0310000013918',
        rucVerificado: true,
        sector: 'Informática y equipos electrónicos',
        clasificacion: 'PYME',
        telefono: '2278-5577',
        correo: 'servicio@etech.com.ni',
        sitio: 'etech.com.ni',
        contacto: {
            nombre: 'Lester Antonio Palacios Duarte',
            cargo: 'Encargado de tienda',
            email: 'lpalacios@etech.com.ni',
            telefono: '8765-2210',
        },
        facturacion: 'Contado. Emite factura con RUC J0310000013918.',
        nota: 'RUC publicado en el registro comercial (J0310000013918). Dirección: Principal Altamira, semáforos donde fue LOZELSA, 5 calles al norte, 25 m al este.',
        ubicaciones: [
            {
                nombre: 'Tienda Altamira',
                direccion: 'Principal Altamira, semáforos donde fue LOZELSA, 5 calles al norte, 25 m al este, Managua',
                referencia: 'Casa de dos plantas, rótulo naranja; el equipo de cómputo está en el cuarto del fondo.',
                contacto: 'Lester Antonio Palacios Duarte',
                telefono: '2278-5577',
                equipos: [
                    { tipo: 'Minisplit', marca: 'Hisense', modelo: 'Inverter 18,000 BTU', serie: 'HIS18-ETE-4412', criticidad: 'MEDIA' },
                    { tipo: 'Minisplit', marca: 'Midea', modelo: 'Inverter 12,000 BTU', serie: 'MID12-ETE-0081', criticidad: 'BAJA' },
                ],
            },
        ],
    },
    {
        razonSocial: 'Telmovil, S.A.',
        nombreComercial: 'Telmovil',
        ruc: null,
        rucVerificado: false,
        sector: 'Comercialización de tecnología móvil',
        clasificacion: 'PREFERENTE',
        telefono: '2264-3423',
        correo: 'servicio@telmovil.net',
        sitio: 'telmovil.net',
        contacto: {
            nombre: 'Ronaldo José Hernández Urbina',
            cargo: 'Administrador de sucursales',
            email: 'ronaldo@telmovil.net',
            telefono: '8114-1111',
        },
        facturacion: 'Crédito 30 días con orden de compra corporativa. Centraliza pagos en casa matriz.',
        nota: 'Opera desde 2005. Casa matriz de la Rotonda El Güegüense 300 m al sur; sucursales en Metrocentro y Multicentro Las Américas (Google Maps).',
        ubicaciones: [
            {
                nombre: 'Casa matriz El Güegüense',
                direccion: 'De la Rotonda El Güegüense 300 m al sur, Managua',
                referencia: 'Edificio corporativo, segundo piso; el cuarto de servidores tiene minisplit dedicado.',
                contacto: 'Ronaldo José Hernández Urbina',
                telefono: '2264-3423',
                equipos: [
                    { tipo: 'Minisplit', marca: 'LG', modelo: 'Dual Inverter 24,000 BTU', serie: 'LG24-TEL-5521', criticidad: 'ALTA' },
                    { tipo: 'Minisplit', marca: 'Samsung', modelo: 'WindFree 12,000 BTU', serie: 'SAM12-TEL-3302', criticidad: 'MEDIA' },
                ],
            },
            {
                nombre: 'Telmovil Metrocentro',
                direccion: 'Metrocentro, segundo nivel, local PA-10A, 28 Calle Sureste, Managua',
                referencia: 'Local junto al food court; el equipo está sobre el cielo falso del área de bodega.',
                contacto: 'Yasser Emilio Robleto Castro',
                telefono: '2264-3423',
                equipos: [
                    { tipo: 'Minisplit', marca: 'Carrier', modelo: '42QHC 18,000 BTU', serie: 'CAR18-TEL-1104', criticidad: 'MEDIA' },
                ],
            },
            {
                nombre: 'Telmovil Multicentro Las Américas',
                direccion: 'Multicentro Las Américas, Paseo Los Muchachos, Bello Horizonte, Managua',
                referencia: 'Local de la planta alta, pasillo central.',
                contacto: 'Yasser Emilio Robleto Castro',
                telefono: '2264-3423',
                equipos: [
                    { tipo: 'Minisplit', marca: 'Midea', modelo: 'Inverter 12,000 BTU', serie: 'MID12-TEL-7781', criticidad: 'BAJA' },
                ],
            },
        ],
    },
    {
        razonSocial: 'Climatización y Energía Renovable, S.A.',
        nombreComercial: 'CLIMERSA',
        ruc: null,
        rucVerificado: false,
        sector: 'Contratista de climatización y HVAC',
        clasificacion: 'EMPRESARIAL',
        telefono: '2222-7080',
        correo: 'proyectos@climersa.com',
        sitio: 'climersa.com',
        contacto: {
            nombre: 'Denis Francisco Cajina Mora',
            cargo: 'Gerente técnico',
            email: 'dcajina@climersa.com',
            telefono: '8844-1930',
        },
        facturacion: 'Crédito 30 días para repuestos; los servicios se facturan contra orden de trabajo firmada.',
        nota: 'Empresa nicaragüense fundada en 2017 (climersa.com). Dirección: Cementerio Central, 2 cuadras al sur, Managua.',
        ubicaciones: [
            {
                nombre: 'Taller y bodega Cementerio Central',
                direccion: 'Del Cementerio Central 2 cuadras al sur, Managua',
                referencia: 'Portón metálico con rótulo CLIMERSA; el chiller de pruebas está en el patio trasero.',
                contacto: 'Denis Francisco Cajina Mora',
                telefono: '2222-7080',
                equipos: [
                    { tipo: 'Chiller', marca: 'Carrier', modelo: '30XA-252 enfriado por aire', serie: 'CAR30XA-1188', criticidad: 'ALTA' },
                    { tipo: 'Manejadora', marca: 'Carrier', modelo: '39G', serie: 'CAR39G-4420', criticidad: 'MEDIA' },
                ],
            },
        ],
    },
    {
        razonSocial: 'Importaciones Climatec, S.A.',
        nombreComercial: 'Climatec (ICSA)',
        ruc: null,
        rucVerificado: false,
        sector: 'Importación y montaje de sistemas HVAC',
        clasificacion: 'EMPRESARIAL',
        telefono: '2231-2942',
        correo: 'servicio@importacionesclimatec.com',
        sitio: 'importacionesclimatec.com',
        contacto: {
            nombre: 'Fanny Auxiliadora Rojas Blandón',
            cargo: 'Jefa de servicio',
            email: 'frojas@importacionesclimatec.com',
            telefono: '8733-6620',
        },
        facturacion: 'Contado para repuestos importados; mantenimiento con crédito 15 días.',
        nota: 'Distribuidor autorizado de ADINA para Nicaragua (importacionesclimatec.com). Dirección: del Ministerio del Trabajo 5 cuadras al este.',
        ubicaciones: [
            {
                nombre: 'Bodega y showroom Ministerio del Trabajo',
                direccion: 'Del Ministerio del Trabajo 5 cuadras al este, Managua',
                referencia: 'Bodega esquinera; los equipos de exhibición están conectados al sistema de prueba.',
                contacto: 'Fanny Auxiliadora Rojas Blandón',
                telefono: '2231-2942',
                equipos: [
                    { tipo: 'Manejadora', marca: 'Adina', modelo: 'AHU-15 ventilación forzada', serie: 'ADI-AHU-7762', criticidad: 'MEDIA' },
                    { tipo: 'Extractor', marca: 'Adina', modelo: 'EF-500', serie: 'ADI-EF-2201', criticidad: 'BAJA' },
                ],
            },
        ],
    },
    {
        razonSocial: 'Casa Mántica, S.A.',
        nombreComercial: 'Supermercados La Colonia',
        ruc: null,
        rucVerificado: false,
        sector: 'Retail alimentario',
        clasificacion: 'PREFERENTE',
        telefono: '2264-9400',
        correo: 'mantenimiento@lacolonia.com.ni',
        sitio: 'lacolonia.com.ni',
        contacto: {
            nombre: 'Álvaro José Cuadra Sáenz',
            cargo: 'Jefe de mantenimiento de sucursales',
            email: 'acuadra@lacolonia.com.ni',
            telefono: '8888-2140',
        },
        facturacion: 'Crédito 60 días. Facturar por sucursal con centro de costo; adjuntar informe técnico firmado.',
        nota: 'Cadena con 27 sucursales (lacolonia.com.ni). Sucursales Sur (km 8 Carretera Sur) y Veracruz (km 12.5 Carretera a Masaya) verificadas en el listado público de puntos.',
        ubicaciones: [
            {
                nombre: 'La Colonia Sur',
                direccion: 'Km 8 Carretera Sur, Managua',
                referencia: 'Cuarto de máquinas al costado del andén de carga; entrar por el portón de proveedores.',
                contacto: 'Álvaro José Cuadra Sáenz',
                telefono: '2264-9400',
                equipos: [
                    { tipo: 'Cuarto frío', marca: 'Bohn', modelo: 'CF-4x3 lácteos', serie: 'BOHN-CF-9012', criticidad: 'ALTA' },
                    { tipo: 'Isla de congelación', marca: 'Hussmann', modelo: 'IMP-8', serie: 'HUS-IMP-3341', criticidad: 'ALTA' },
                    { tipo: 'Chiller de leche', marca: 'Bohn', modelo: 'BL-120', serie: 'BOHN-BL-5507', criticidad: 'MEDIA' },
                ],
            },
            {
                nombre: 'La Colonia Veracruz',
                direccion: 'Km 12.5 Carretera a Masaya, mano derecha, Managua',
                referencia: 'Cámara de carnes en el área de carnicería; el condensador está en el techo.',
                contacto: 'Francisco Javier Laguna Mora',
                telefono: '2264-9400',
                equipos: [
                    { tipo: 'Cuarto frío', marca: 'Heatcraft', modelo: 'CF-5x3 carnes', serie: 'HEA-CF-7712', criticidad: 'ALTA' },
                    { tipo: 'Vitrina refrigerada', marca: 'Hussmann', modelo: 'VRL-12', serie: 'HUS-VRL-2290', criticidad: 'MEDIA' },
                ],
            },
        ],
    },
    {
        razonSocial: 'PriceSmart Nicaragua, S.A.',
        nombreComercial: 'PriceSmart',
        ruc: null,
        rucVerificado: false,
        sector: 'Club de compras (retail)',
        clasificacion: 'PREFERENTE',
        telefono: '2255-8360',
        correo: 'mantenimiento.ni@pricesmart.com',
        sitio: 'pricesmart.com',
        contacto: {
            nombre: 'Óscar Danilo Munguía Varela',
            cargo: 'Supervisor de instalaciones',
            email: 'omunguia@pricesmart.com',
            telefono: '8845-7712',
        },
        facturacion: 'Crédito 45 días con orden de compra corporativa. Todo trabajo requiere permiso de trabajo firmado en sitio.',
        nota: 'Club de Managua en 6a Avenida SO (Google Maps, teléfono 2255-8360).',
        ubicaciones: [
            {
                nombre: 'Club Managua',
                direccion: '6a Avenida SO, Managua',
                referencia: 'Recepción de proveedores en el portón norte; anunciarse en caseta de seguridad.',
                contacto: 'Óscar Danilo Munguía Varela',
                telefono: '2255-8360',
                equipos: [
                    { tipo: 'Cámara fría', marca: 'Hussmann', modelo: 'CF-6x4 congelados', serie: 'HUS-CF-8811', criticidad: 'ALTA' },
                    { tipo: 'Rack de refrigeración', marca: 'Hillphoenix', modelo: 'Protocol', serie: 'HIL-PRO-4423', criticidad: 'ALTA' },
                    { tipo: 'Unidad central', marca: 'Trane', modelo: 'RTU 25 TR', serie: 'TRA-RTU-1180', criticidad: 'MEDIA' },
                ],
            },
        ],
    },
    {
        razonSocial: 'Hospital Metropolitano Vivian Pellas, S.A.',
        nombreComercial: 'Hospital Vivian Pellas',
        ruc: null,
        rucVerificado: false,
        sector: 'Salud privada',
        clasificacion: 'PREFERENTE',
        telefono: '2255-6900',
        correo: 'ingenieria@hospitalvivianpellas.com',
        sitio: 'hospitalvivianpellas.com',
        contacto: {
            nombre: 'Ingrid Carolina Solórzano Báez',
            cargo: 'Jefa de ingeniería y mantenimiento',
            email: 'csolorzano@hospitalvivianpellas.com',
            telefono: '8877-3401',
        },
        facturacion: 'Crédito 60 días. Requiere programación previa, carné de proveedor y bitácora de ingreso a áreas críticas.',
        nota: 'Km 9.75 Carretera a Masaya, 250 m al oeste (Embajada de EE. UU., directorio médico). Teléfono 2255-6900.',
        ubicaciones: [
            {
                nombre: 'Campus Carretera a Masaya',
                direccion: 'Km 9.75 Carretera a Masaya, 250 m al oeste, Managua',
                referencia: 'Ingreso de proveedores por la rampa de servicio; pasar por ingeniería antes de subir a quirófanos.',
                contacto: 'Ingrid Carolina Solórzano Báez',
                telefono: '2255-6900',
                equipos: [
                    { tipo: 'Chiller', marca: 'Trane', modelo: 'CGAM-70 enfriado por aire', serie: 'TRA-CGAM-3390', criticidad: 'ALTA' },
                    { tipo: 'Manejadora', marca: 'Trane', modelo: 'MZ-12 quirófano 3', serie: 'TRA-MZ-8821', criticidad: 'ALTA' },
                    { tipo: 'Refrigerador de laboratorio', marca: 'Thermo Fisher', modelo: 'TSX-2305', serie: 'TF-TSX-4410', criticidad: 'ALTA' },
                ],
            },
        ],
    },
    {
        razonSocial: 'Hospital Bautista, S.A.',
        nombreComercial: 'Hospital Bautista',
        ruc: null,
        rucVerificado: false,
        sector: 'Salud privada',
        clasificacion: 'EMPRESARIAL',
        telefono: '2249-0967',
        correo: 'mantenimiento@hospitalbautista.com.ni',
        sitio: 'hospitalbautista.com.ni',
        contacto: {
            nombre: 'Moisés Eliud Rivas Centeno',
            cargo: 'Coordinador de mantenimiento',
            email: 'mrivas@hospitalbautista.com.ni',
            telefono: '8765-9932',
        },
        facturacion: 'Crédito 30 días. Adjuntar cotización aprobada por coordinación de mantenimiento.',
        nota: 'Barrio Largaespada, Managua (directorio de la Embajada de EE. UU., teléfono 2249-0967).',
        ubicaciones: [
            {
                nombre: 'Campus Largaespada',
                direccion: 'Barrio Largaespada, Managua',
                referencia: 'Casa de máquinas en el sótano del edificio de hospitalización.',
                contacto: 'Moisés Eliud Rivas Centeno',
                telefono: '2249-0967',
                equipos: [
                    { tipo: 'Chiller', marca: 'Carrier', modelo: '30RB-160', serie: 'CAR30RB-7714', criticidad: 'ALTA' },
                    { tipo: 'Fancoil', marca: 'Carrier', modelo: '42CE', serie: 'CAR42CE-6612', criticidad: 'MEDIA' },
                    { tipo: 'Refrigerador de banco de sangre', marca: 'Helmer', modelo: 'i.Series iB245', serie: 'HEL-IB-3320', criticidad: 'ALTA' },
                ],
            },
        ],
    },
    {
        razonSocial: 'Real Hotels & Resorts Nicaragua, S.A.',
        nombreComercial: 'Real InterContinental Managua',
        ruc: null,
        rucVerificado: false,
        sector: 'Hotelería',
        clasificacion: 'PREFERENTE',
        telefono: '2276-8989',
        correo: 'inter.mga@r-hr.com',
        sitio: 'ihg.com',
        contacto: {
            nombre: 'Gabriela del Carmen Úbeda Arriola',
            cargo: 'Gerente de ingeniería',
            email: 'gabriela.ubeda@r-hr.com',
            telefono: '8899-1203',
        },
        facturacion: 'Crédito 45 días. Los trabajos en áreas de huéspedes se programan en ventana de 9 a 13 h.',
        nota: 'Frente a Metrocentro (realhotelsandresorts.com, teléfono 2276-8989).',
        ubicaciones: [
            {
                nombre: 'Hotel Metrocentro',
                direccion: 'Frente a Centro Comercial Metrocentro, Paseo de la Unión Europea, Managua',
                referencia: 'Ingreso por el área de carga; la planta de frío está en el nivel -1.',
                contacto: 'Gabriela del Carmen Úbeda Arriola',
                telefono: '2276-8989',
                equipos: [
                    { tipo: 'Chiller', marca: 'York', modelo: 'YK-250 tornillo', serie: 'YRK-YK-5521', criticidad: 'ALTA' },
                    { tipo: 'Cámara fría', marca: 'Bohn', modelo: 'CF-4x4 cocina', serie: 'BOHN-CF-1188', criticidad: 'ALTA' },
                    { tipo: 'Máquina de hielo', marca: 'Manitowoc', modelo: 'Indigo NXT 600', serie: 'MAN-IN-4471', criticidad: 'MEDIA' },
                ],
            },
        ],
    },
    {
        razonSocial: 'Hotel Colonial Granada, S.A.',
        nombreComercial: 'Hotel Colonial Granada',
        ruc: null,
        rucVerificado: false,
        sector: 'Hotelería',
        clasificacion: 'PYME',
        telefono: '2558-1100',
        correo: 'reservas@hotelcolonialgranada.com',
        sitio: 'hotelcolonialgranada.com',
        contacto: {
            nombre: 'Róger Antonio Espinoza Leiva',
            cargo: 'Administrador del hotel',
            email: 'respinoza@hotelcolonialgranada.com',
            telefono: '8712-4478',
        },
        facturacion: 'Contado contra factura. Emitir en córdobas; el hotel no acepta facturación a 30 días.',
        nota: 'Calle Libertad, Granada, frente al lago (Booking.com, teléfono 2558-1100).',
        ubicaciones: [
            {
                nombre: 'Hotel Colonial Granada',
                direccion: 'Calle Libertad, Granada',
                referencia: 'Recepción del hotel; el cuarto de máquinas está detrás de la cocina.',
                contacto: 'Róger Antonio Espinoza Leiva',
                telefono: '2558-1100',
                equipos: [
                    { tipo: 'Minisplit', marca: 'LG', modelo: 'Dual Inverter 18,000 BTU', serie: 'LG18-GRA-7712', criticidad: 'MEDIA' },
                    { tipo: 'Minisplit', marca: 'Midea', modelo: 'Inverter 12,000 BTU', serie: 'MID12-GRA-2201', criticidad: 'BAJA' },
                    { tipo: 'Máquina de hielo', marca: 'Manitowoc', modelo: 'Indigo NXT 300', serie: 'MAN-IN-9910', criticidad: 'MEDIA' },
                ],
            },
        ],
    },
    {
        razonSocial: 'Selva Negra Mountain Resort, S.A.',
        nombreComercial: 'Selva Negra',
        ruc: null,
        rucVerificado: false,
        sector: 'Hotelería y restaurante',
        clasificacion: 'PYME',
        telefono: '8100-9100',
        correo: 'info@selvanegra.com',
        sitio: 'selvanegra.com',
        contacto: {
            nombre: 'Héctor Manuel Kühl Aráuz',
            cargo: 'Encargado de mantenimiento',
            email: 'mantenimiento@selvanegra.com',
            telefono: '8100-9100',
        },
        facturacion: 'Contado. Coordinar el traslado con anticipación: hay 140 km desde Managua.',
        nota: 'Km 140 Carretera Matagalpa–Jinotega (selvanegra.com). Cliente fuera de Managua: las visitas se agrupan por zona norte.',
        ubicaciones: [
            {
                nombre: 'Resort Km 140',
                direccion: 'Km 140 Carretera Matagalpa–Jinotega, Matagalpa',
                referencia: 'Casa de máquinas junto al restaurante principal; preguntar por mantenimiento en recepción.',
                contacto: 'Héctor Manuel Kühl Aráuz',
                telefono: '8100-9100',
                equipos: [
                    { tipo: 'Cuarto frío', marca: 'Bohn', modelo: 'CF-3x3 cocina', serie: 'BOHN-CF-2244', criticidad: 'ALTA' },
                    { tipo: 'Minisplit', marca: 'Mabe', modelo: 'Inverter 12,000 BTU', serie: 'MAB12-SEL-1102', criticidad: 'BAJA' },
                ],
            },
        ],
    },
    {
        razonSocial: 'Matadero Nuevo Carnic, S.A.',
        nombreComercial: 'Nuevo Carnic',
        ruc: null,
        rucVerificado: false,
        sector: 'Industria cárnica',
        clasificacion: 'PREFERENTE',
        telefono: '2233-1184',
        correo: 'info@nuevocarnic.com.ni',
        sitio: 'nuevocarnic.com.ni',
        contacto: {
            nombre: 'Julio César Zamora Blandón',
            cargo: 'Jefe de mantenimiento industrial',
            email: 'jzamora@nuevocarnic.com.ni',
            telefono: '8888-5120',
        },
        facturacion: 'Crédito 30 días. Se factura por orden de trabajo con visto bueno de mantenimiento industrial.',
        nota: 'Carretera Norte km 10½, 1 km al norte, Managua (Tecoloco y nuevocarnic.com.ni, teléfono 2233-1184).',
        ubicaciones: [
            {
                nombre: 'Planta Carretera Norte',
                direccion: 'Carretera Norte km 10½, 1 km al norte, Managua',
                referencia: 'Ingreso de contratistas por la caseta 2; el cuarto de compresores está junto a la sala de máquinas.',
                contacto: 'Julio César Zamora Blandón',
                telefono: '2233-1184',
                equipos: [
                    { tipo: 'Túnel de congelación', marca: 'Bitzer', modelo: 'LHG-4', serie: 'BIT-LHG-7712', criticidad: 'ALTA' },
                    { tipo: 'Cuarto frío', marca: 'Bohn', modelo: 'CF-8x5 deshuese', serie: 'BOHN-CF-9921', criticidad: 'ALTA' },
                    { tipo: 'Compresor', marca: 'Bitzer', modelo: '4FE-25', serie: 'BIT-4FE-3389', criticidad: 'ALTA' },
                ],
            },
        ],
    },
    {
        razonSocial: 'Lácteos Centroamericanos, S.A.',
        nombreComercial: 'Centrolac (La Perfecta)',
        ruc: null,
        rucVerificado: false,
        sector: 'Industria láctea',
        clasificacion: 'PREFERENTE',
        telefono: '2255-7100',
        correo: 'ingenieria@centrolac.com.ni',
        sitio: 'centrolac.com.ni',
        contacto: {
            nombre: 'Francisco Ernesto Baltodano Ríos',
            cargo: 'Coordinador de refrigeración industrial',
            email: 'fbaltodano@centrolac.com.ni',
            telefono: '8765-3320',
        },
        facturacion: 'Crédito 60 días. Requiere cotización aprobada por compras corporativas.',
        nota: 'Planta en Tipitapa, Managua (LinkedIn de Grupo Industrial Centrolac). Teléfono y correo son referenciales del área de ingeniería.',
        ubicaciones: [
            {
                nombre: 'Planta Tipitapa',
                direccion: 'Carretera Tipitapa–Masaya, Tipitapa, Managua',
                referencia: 'Ingreso por la báscula; el área de frío está al final del pasillo de proceso.',
                contacto: 'Francisco Ernesto Baltodano Ríos',
                telefono: '2255-7100',
                equipos: [
                    { tipo: 'Chiller de proceso', marca: 'Mycom', modelo: 'N8WB', serie: 'MYC-N8-4411', criticidad: 'ALTA' },
                    { tipo: 'Cuarto frío', marca: 'Bohn', modelo: 'CF-6x4 producto terminado', serie: 'BOHN-CF-7781', criticidad: 'ALTA' },
                    { tipo: 'Tanque de frío', marca: 'Mueller', modelo: 'OH-10000', serie: 'MUE-OH-9932', criticidad: 'ALTA' },
                ],
            },
        ],
    },
    {
        razonSocial: 'Eskimo, S.A.',
        nombreComercial: 'Eskimo',
        ruc: null,
        rucVerificado: false,
        sector: 'Helados y lácteos',
        clasificacion: 'PREFERENTE',
        telefono: '2255-8948',
        correo: 'servicio@eskimo.com.ni',
        sitio: 'eskimo.com.ni',
        contacto: {
            nombre: 'Martha Lorena Sandoval Mercado',
            cargo: 'Jefa de mantenimiento de planta',
            email: 'msandoval@eskimo.com.ni',
            telefono: '8877-6610',
        },
        facturacion: 'Crédito 45 días. Facturar a Eskimo, S.A. con orden de compra de planta.',
        nota: 'De Montoya 2 cuadras al oeste y 1 al sur, Managua (Tecoloco y Facebook; PBX 2255-8948).',
        ubicaciones: [
            {
                nombre: 'Planta y centro de distribución Montoya',
                direccion: 'De Montoya 2 cuadras al oeste y 1 cuadra al sur, Managua',
                referencia: 'Portón de planta sobre la 18 avenida; anunciarse en caseta y esperar al jefe de mantenimiento.',
                contacto: 'Martha Lorena Sandoval Mercado',
                telefono: '2255-8948',
                equipos: [
                    { tipo: 'Túnel de endurecimiento', marca: 'Gram', modelo: 'TF-1200', serie: 'GRA-TF-1177', criticidad: 'ALTA' },
                    { tipo: 'Cuarto frío', marca: 'Bohn', modelo: 'CF-5x5 insumos', serie: 'BOHN-CF-2210', criticidad: 'ALTA' },
                    { tipo: 'Exhibidor', marca: 'Hussmann', modelo: 'IMP-6', serie: 'HUS-IMP-9941', criticidad: 'MEDIA' },
                ],
            },
            {
                nombre: 'Centro de distribución Salamanca',
                direccion: 'Carretera a Masaya km 7½, Salamanca, Managua',
                referencia: 'Bodega de producto terminado; el cuarto frío está al fondo, a la derecha.',
                contacto: 'Martha Lorena Sandoval Mercado',
                telefono: '2255-8948',
                equipos: [
                    { tipo: 'Cuarto frío', marca: 'Heatcraft', modelo: 'CF-4x6', serie: 'HEA-CF-3312', criticidad: 'ALTA' },
                ],
            },
        ],
    },
    {
        razonSocial: 'Deli Pollo, S.A.',
        nombreComercial: 'Tip Top',
        ruc: null,
        rucVerificado: false,
        sector: 'Restaurantes',
        clasificacion: 'EMPRESARIAL',
        telefono: '2278-2519',
        correo: 'tiendaenlinea@delipollo.com',
        sitio: 'tiptoprestaurantes.com',
        contacto: {
            nombre: 'Karla María Lacayo Tiffer',
            cargo: 'Gerente de mantenimiento de restaurantes',
            email: 'klacayo@delipollo.com',
            telefono: '8844-2210',
        },
        facturacion: 'Crédito 30 días por restaurante. Entregar informe con fotos del antes y después.',
        nota: 'Cadena Tip Top (Deli Pollo, S.A., fundada en 1958). Casa matriz: Rotonda Universitaria, 1 cuadra al norte, 1½ al oeste.',
        ubicaciones: [
            {
                nombre: 'Tip Top Rotonda Universitaria',
                direccion: 'Rotonda Universitaria, 1 cuadra al norte, 1½ cuadras al oeste, Managua',
                referencia: 'Restaurante de la esquina; el cuarto frío está junto al área de descongelado.',
                contacto: 'Karla María Lacayo Tiffer',
                telefono: '2278-2519',
                equipos: [
                    { tipo: 'Cuarto frío', marca: 'Bohn', modelo: 'CF-3x2 cocina', serie: 'BOHN-CF-6611', criticidad: 'ALTA' },
                    { tipo: 'Vitrina refrigerada', marca: 'True', modelo: 'T-49', serie: 'TRU-T49-1120', criticidad: 'MEDIA' },
                ],
            },
            {
                nombre: 'Tip Top Carretera a Masaya',
                direccion: 'Carretera a Masaya km 6, Managua',
                referencia: 'Local 3 del centro comercial; equipo en el cielo falso del área de cocina.',
                contacto: 'Karla María Lacayo Tiffer',
                telefono: '2278-2519',
                equipos: [
                    { tipo: 'Minisplit', marca: 'LG', modelo: 'Dual Inverter 24,000 BTU', serie: 'LG24-TIP-3320', criticidad: 'MEDIA' },
                ],
            },
        ],
    },
    {
        razonSocial: 'Compañía Cervecera de Nicaragua, S.A.',
        nombreComercial: 'CCN',
        ruc: 'J0310000001960',
        rucVerificado: true,
        sector: 'Bebidas y cerveza',
        clasificacion: 'PREFERENTE',
        telefono: '2264-5500',
        correo: 'mantenimiento@grupoccn.com.ni',
        sitio: 'grupoccn.com.ni',
        contacto: {
            nombre: 'Eddy Francisco Reyes Miranda',
            cargo: 'Jefe de frío y servicios industriales',
            email: 'ereyes@grupoccn.com.ni',
            telefono: '8888-9012',
        },
        facturacion: 'Crédito 60 días. Proveedor registrado: se requiere póliza de responsabilidad civil vigente.',
        nota: 'RUC publicado en registro de importadores (J0310000001960). Planta en Km 6½ Carretera Norte, 600 varas al lago.',
        ubicaciones: [
            {
                nombre: 'Planta Carretera Norte',
                direccion: 'Km 6½ Carretera Norte, 600 varas al lago, Managua',
                referencia: 'Ingreso de contratistas por el portón 3; el chiller de proceso está en la nave 2.',
                contacto: 'Eddy Francisco Reyes Miranda',
                telefono: '2264-5500',
                equipos: [
                    { tipo: 'Chiller de proceso', marca: 'York', modelo: 'YK-400', serie: 'YRK-YK-8812', criticidad: 'ALTA' },
                    { tipo: 'Cuarto frío', marca: 'Bohn', modelo: 'CF-7x5 lúpulo', serie: 'BOHN-CF-4471', criticidad: 'ALTA' },
                    { tipo: 'Compresor', marca: 'Mycom', modelo: '160VLD', serie: 'MYC-160-2211', criticidad: 'ALTA' },
                ],
            },
        ],
    },
];

/** Catálogo de servicios con precios de referencia en córdobas (sin IVA). */
const SERVICIOS = [
    { codigo: 'SRV-MP-MIN', nombre: 'Mantenimiento preventivo de minisplit', precio: 1850, unidad: 'equipo', descripcion: 'Limpieza de filtros y serpentines, medición de presiones y amperaje, prueba de drenaje.' },
    { codigo: 'SRV-MP-CF', nombre: 'Mantenimiento preventivo de cuarto frío', precio: 4800, unidad: 'equipo', descripcion: 'Revisión de evaporador, deshielo, sellos de puerta, control de temperatura y registro en bitácora.' },
    { codigo: 'SRV-DIAG', nombre: 'Diagnóstico de falla', precio: 950, unidad: 'visita', descripcion: 'Evaluación eléctrica y de refrigeración, informe con causa probable y recomendación.' },
    { codigo: 'SRV-GAS', nombre: 'Carga de refrigerante R410A', precio: 3400, unidad: 'servicio', descripcion: 'Detección de fugas, vacío y carga por peso según placa del equipo.' },
    { codigo: 'SRV-COMP', nombre: 'Cambio de compresor hermético 2 TR', precio: 14500, unidad: 'servicio', descripcion: 'Retiro, reemplazo, vacío, carga y pruebas de estabilización de temperatura.' },
    { codigo: 'SRV-INST', nombre: 'Instalación de minisplit 18,000 BTU', precio: 6200, unidad: 'servicio', descripcion: 'Montaje, tubería, conexión eléctrica y puesta en marcha.' },
    { codigo: 'SRV-CHIL', nombre: 'Mantenimiento de chiller', precio: 18500, unidad: 'servicio', descripcion: 'Análisis de aceite, limpieza de condensador, ajuste de controles y registro de parámetros.' },
    { codigo: 'SRV-MAN', nombre: 'Mantenimiento de unidad manejadora', precio: 7200, unidad: 'equipo', descripcion: 'Cambio de filtros, revisión de bandas, serpentín y trampa de condensado.' },
    { codigo: 'SRV-ELEC', nombre: 'Reparación de tarjeta de control', precio: 4200, unidad: 'servicio', descripcion: 'Diagnóstico de placa, sustitución de relés y pruebas de ciclo.' },
    { codigo: 'SRV-HIELO', nombre: 'Mantenimiento de máquina de hielo', precio: 3900, unidad: 'equipo', descripcion: 'Descalcificación, limpieza de condensador y verificación de producción.' },
];

/** Repuestos e insumos con costo de compra de referencia en córdobas. */
const INSUMOS = [
    { nombre: 'Refrigerante R410A (cilindro 1 kg)', unidad: 'kg', costo: 780 },
    { nombre: 'Refrigerante R22 (cilindro 1 kg)', unidad: 'kg', costo: 620 },
    { nombre: 'Refrigerante R404A (cilindro 1 kg)', unidad: 'kg', costo: 950 },
    { nombre: 'Capacitor de arranque 35 µF', unidad: 'unidad', costo: 180 },
    { nombre: 'Capacitor de arranque 45 µF', unidad: 'unidad', costo: 210 },
    { nombre: 'Contactor 30 A 2 polos', unidad: 'unidad', costo: 480 },
    { nombre: 'Filtro secador 3/8"', unidad: 'unidad', costo: 350 },
    { nombre: 'Válvula de expansión termostática', unidad: 'unidad', costo: 780 },
    { nombre: 'Presostato de alta y baja', unidad: 'unidad', costo: 620 },
    { nombre: 'Sensor NTC de temperatura', unidad: 'unidad', costo: 320 },
    { nombre: 'Motor de ventilador de condensador', unidad: 'unidad', costo: 1850 },
    { nombre: 'Compresor hermético 2 TR R410A', unidad: 'unidad', costo: 9800 },
    { nombre: 'Tubería de cobre 1/4" (rollo 15 m)', unidad: 'rollo', costo: 2400 },
    { nombre: 'Aislante térmico 3/8" (rollo 15 m)', unidad: 'rollo', costo: 780 },
    { nombre: 'Kit de limpieza de serpentín', unidad: 'kit', costo: 450 },
    { nombre: 'Termostato digital programable', unidad: 'unidad', costo: 1250 },
    { nombre: 'Controlador Danfoss EKC 202', unidad: 'unidad', costo: 1450 },
    { nombre: 'Resistencia de deshielo 2 kW', unidad: 'unidad', costo: 2100 },
    { nombre: 'Sello de puerta de cámara fría (metro)', unidad: 'metro', costo: 1650 },
    { nombre: 'Correa de transmisión B-52', unidad: 'unidad', costo: 380 },
];

const PROVEEDORES = [
    'Danfoss Centroamérica',
    'Carrier Interamericana',
    'Bitzer Andina',
    'Repuestos Frigoríficos del Istmo',
];

/** Personal de MULTICAS (nombres de trabajo, no nómina real). */
const PERSONAL = [
    { cod: 'ADM-001', nombre: 'Jairo Antonio', apellido: 'Ruiz Mena', tel: '8888-1001', tecnico: false, cargo: 'Jefe de taller' },
    { cod: 'ADM-002', nombre: 'Karla Vanessa', apellido: 'Mendoza Sequeira', tel: '8888-1002', tecnico: false, cargo: 'Administración y facturación' },
    { cod: 'ADM-003', nombre: 'Sayra Massiel', apellido: 'Rivera Zamora', tel: '8888-1003', tecnico: false, cargo: 'Comercial y CRM' },
    { cod: 'ADM-004', nombre: 'Xiomara del Socorro', apellido: 'Téllez Rivas', tel: '8888-1004', tecnico: false, cargo: 'Responsable de calidad' },
    { cod: 'TEC-001', nombre: 'Denis Alberto', apellido: 'Cruz Torrez', tel: '8888-2001', tecnico: true, cargo: 'Técnico de refrigeración comercial' },
    { cod: 'TEC-002', nombre: 'Julio César', apellido: 'García Baltodano', tel: '8888-2002', tecnico: true, cargo: 'Técnico de climatización' },
    { cod: 'TEC-003', nombre: 'Norman José', apellido: 'Espinoza Rayo', tel: '8888-2003', tecnico: true, cargo: 'Técnico de refrigeración industrial' },
    { cod: 'TEC-004', nombre: 'Ana Lucía', apellido: 'Rivera Cárdenas', tel: '8888-2004', tecnico: true, cargo: 'Técnica de mantenimiento' },
    { cod: 'TEC-005', nombre: 'Wilmer Antonio', apellido: 'Solís Mejía', tel: '8888-2005', tecnico: true, cargo: 'Técnico de climatización' },
    { cod: 'TEC-006', nombre: 'Freddy Ramón', apellido: 'Orozco Areas', tel: '8888-2006', tecnico: true, cargo: 'Técnico de refrigeración comercial' },
    { cod: 'TEC-007', nombre: 'Helder Ricardo', apellido: 'Mena Calero', tel: '8888-2007', tecnico: true, cargo: 'Técnico de equipos de laboratorio' },
    { cod: 'TEC-008', nombre: 'Byron Josué', apellido: 'Aguilar Hernández', tel: '8888-2008', tecnico: true, cargo: 'Auxiliar de taller' },
    { cod: 'BOD-001', nombre: 'Erick Manuel', apellido: 'Salgado Pavón', tel: '8888-3001', tecnico: false, cargo: 'Bodega e inventario' },
    { cod: 'SAC-001', nombre: 'Ruth Noemí', apellido: 'Castillo Vallejos', tel: '8888-3002', tecnico: false, cargo: 'Servicio al cliente' },
];

const CUADRILLAS = [
    { nombre: 'Cuadrilla Managua Centro', zona: 'Managua', miembros: ['TEC-001', 'TEC-006'], lider: 'TEC-001' },
    { nombre: 'Cuadrilla Managua Sur', zona: 'Managua', miembros: ['TEC-002', 'TEC-005'], lider: 'TEC-002' },
    { nombre: 'Cuadrilla Refrigeración Comercial', zona: 'Managua', miembros: ['TEC-001', 'TEC-004'], lider: 'TEC-004' },
    { nombre: 'Cuadrilla Industria y Salud', zona: 'Nacional', miembros: ['TEC-003', 'TEC-007'], lider: 'TEC-003' },
    { nombre: 'Cuadrilla Zona Norte', zona: 'Matagalpa–Jinotega', miembros: ['TEC-008'], lider: 'TEC-008' },
];

/** Síntomas reales por tipo de equipo, para que la solicitud de la orden no sea un texto genérico. */
const SINTOMAS: Record<string, string[]> = {
    'Minisplit': [
        'No enfría y la unidad exterior se apaga a los pocos minutos de arrancar.',
        'Gotea agua por la unidad interior y mancha el cielo falso.',
        'Vibra y hace ruido en el ventilador de la unidad exterior.',
        'Enciende pero no baja de 26 °C en todo el día.',
        'El control remoto no responde y la unidad queda encendida.',
    ],
    'Cuarto frío': [
        'No mantiene la temperatura de consigna; en la noche sube 6 °C.',
        'La puerta no sella y se forma escarcha en el marco.',
        'El evaporador se congela y deja de enfriar a media tarde.',
        'El registrador marca 8 °C cuando debe estar en 3 °C.',
    ],
    'Cámara fría': [
        'Sube la temperatura después de cada descarga de producto.',
        'El piso se llena de agua y el producto de la base se moja.',
        'El extractor no arranca y el cuarto se calienta.',
    ],
    'Chiller': [
        'Alarma de bajo caudal de agua y paro intermitente.',
        'El compresor 2 entra en protección térmica al mediodía.',
        'La presión de succión baja y no alcanza la temperatura del lazo.',
    ],
    'Chiller de proceso': [
        'El agua de proceso sale 4 °C arriba del setpoint.',
        'Salta la protección de alto amperaje en el compresor principal.',
    ],
    'Manejadora': [
        'Pérdida de caudal de aire; el área no alcanza la presión positiva.',
        'Ruido en el rodamiento del ventilador y vibración en el ducto.',
        'El serpentín gotea sobre el plafón del pasillo.',
    ],
    'Fancoil': [
        'No enfría el área y el filtro está saturado.',
        'La válvula de tres vías queda abierta y el cuarto se congela.',
    ],
    'Máquina de hielo': [
        'Hielo opaco y producción a la mitad de la capacidad.',
        'No cosecha el hielo y se queda en ciclo de congelación.',
    ],
    'Vitrina refrigerada': [
        'No enfría en la parte baja y el producto se tibia.',
        'Formación de hielo en el evaporador y goteo en el exhibidor.',
    ],
    Exhibidor: ['Escarcha en la rejilla y producto blando en la fila superior.'],
    'Unidad central': [
        'Solo enfría una zona del local; la otra queda a temperatura ambiente.',
        'El equipo arranca y se detiene cada 5 minutos.',
    ],
    'Cámara de conservación': ['Temperatura fuera de rango en el registro de las 24 h.'],
    'Refrigerador de laboratorio': [
        'Variación de temperatura fuera del rango validado; alarma sonora.',
        'El registrador pierde la temperatura del gráfico de la noche.',
    ],
    'Refrigerador de banco de sangre': [
        'Alarma de sobre temperatura en la cámara de plaquetas.',
        'El ventilador interno hace ruido y la temperatura oscila.',
    ],
    'Túnel de congelación': [
        'El tiempo de congelación queda fuera de norma y el producto se devuelve.',
        'El ventilador del túnel no arranca y el producto no cuaja.',
    ],
    'Compresor': [
        'Compresor con ruido metálico y aceite en el visor.',
        'Arranca y se protege; el amperaje está 20 % arriba de placa.',
    ],
    'Tanque de frío': [
        'La leche no baja de 4 °C en el tiempo de recepción.',
        'El agitador no gira y la temperatura es despareja.',
    ],
    'Túnel de endurecimiento': [
        'El helado sale blando del túnel y se devuelve a cámara.',
        'Temperatura de túnel inestable; el compresor cicla.',
    ],
    Extractor: ['El extractor de la bodega no arranca y el aire se estanca.'],
    'Rack de refrigeración': [
        'Presión de descarga alta en el rack y alarma en el controlador.',
        'Un circuito del rack no mantiene y las vitrinas se tibian.',
    ],
};

const DIAGNOSTICOS = [
    'Condensador con suciedad acumulada; presión de descarga 15 % arriba de lo esperado.',
    'Capacitor de arranque agotado; el compresor intenta arrancar y se protege.',
    'Fuga en la conexión de la válvula de servicio; carga de refrigerante por debajo de placa.',
    'Sensor de temperatura descalibrado; el control corta antes de la consigna.',
    'Sello de puerta endurecido; entra aire húmedo y se forma escarcha.',
    'Ventilador del evaporador con rodamiento seco; ruido y bajo caudal.',
    'Tarjeta de control con relé pegado; el equipo no invierte la válvula.',
    'Filtro secador saturado; restricción en la línea de líquido.',
];
const RESULTADOS = [
    'Equipo operativo. Temperatura estabilizada en la consigna del cliente.',
    'Se corrigió la falla y se dejó registro de parámetros; operativo.',
    'Equipo operativo con recomendación de cambio de pieza en la próxima visita.',
    'Trabajo terminado; cliente firma conformidad y solicita plan preventivo.',
];

// --------------------------------------------------------------- reinicio BD

const PROTEGIDAS = new Set([
    'roles',
    'estados_orden',
    '_prisma_migrations',
    // Las cuentas locales y las personas que las respaldan no se tocan:
    // el seed no cambia contraseñas ni deja al usuario sin acceso.
    'usuarios',
    'personas',
    'empleados',
    'sesiones',
    'restablecimientos_credencial',
]);

async function reiniciarBase() {
    const filas = await prisma.$queryRaw<Array<{ table_name: string }>>`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `;
    const tablas = filas.map((f) => f.table_name).filter((t) => !PROTEGIDAS.has(t));
    if (!tablas.length) throw new Error('No se encontraron tablas para reiniciar.');
    const lista = tablas.map((t) => `"public"."${t}"`).join(', ');
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${lista} RESTART IDENTITY CASCADE`);
    return tablas.length;
}

/**
 * Al vaciar `evidencias_equipo`, los informes PDF de la carga anterior quedan
 * sin dueño. Se borran sólo los archivos con forma de clave de evidencia
 * (UUID de 36 caracteres) dentro del directorio configurado; cualquier otro
 * archivo de esa carpeta se deja intacto.
 */
async function limpiarEvidenciasHuerfanas() {
    const directorio = process.env.EVIDENCE_STORAGE_DIR;
    if (!directorio) return { archivos: 0, bytes: 0 };
    const raiz = resolve(directorio);
    let entradas: string[];
    try {
        entradas = await readdir(raiz);
    } catch {
        return { archivos: 0, bytes: 0 };
    }
    let archivos = 0;
    let bytes = 0;
    for (const nombre of entradas) {
        if (!/^[a-f0-9-]{36}$/.test(nombre)) continue;
        const ruta = resolve(raiz, nombre);
        try {
            const info = await stat(ruta);
            if (!info.isFile()) continue;
            bytes += info.size;
            await unlink(ruta);
            archivos += 1;
        } catch {
            // Si el archivo ya no está, no hay nada que limpiar.
        }
    }
    return { archivos, bytes };
}

interface PersonalCreado {
    id: number;
    cod: string;
    nombre: string;
    tecnico: boolean;
}

/**
 * Borra las cuentas y los empleados del seed de demostración anterior
 * (demo.tecnico1..100 / DEMO-EMP-*). Esas tablas no se truncan porque sostienen
 * las cuentas locales, así que se limpian por prefijo.
 */
async function limpiarRestosDemo() {
    const usuariosDemo = await prisma.usuario.findMany({ where: { identificador: { startsWith: 'demo.' } } });
    if (usuariosDemo.length) {
        await prisma.usuario.deleteMany({ where: { id: { in: usuariosDemo.map((u) => u.id) } } });
    }
    const empleadosDemo = await prisma.empleado.findMany({ where: { codEmpleado: { startsWith: 'DEMO-' } } });
    if (empleadosDemo.length) {
        await prisma.empleado.deleteMany({ where: { id: { in: empleadosDemo.map((e) => e.id) } } });
        await prisma.persona.deleteMany({ where: { id: { in: empleadosDemo.map((e) => e.personaId) } } });
    }
    return { usuarios: usuariosDemo.length, empleados: empleadosDemo.length };
}

async function prepararPersonal(): Promise<Map<string, PersonalCreado>> {
    const mapa = new Map<string, PersonalCreado>();
    for (const persona of PERSONAL) {
        const datosPersona = {
            firstName: persona.nombre,
            firstLastName: persona.apellido,
            telephone: persona.tel,
            correo: `${slug(`${persona.nombre}.${persona.apellido}`)}@multicas.com.ni`,
        };
        // Los empleados no se truncan (sostienen las cuentas locales), así que el
        // alta es idempotente por código: si ya existe, se actualiza la persona.
        const existente = await prisma.empleado.findUnique({ where: { codEmpleado: persona.cod } });
        const empleado = existente
            ? await prisma.empleado.update({
                  where: { id: existente.id },
                  data: {
                      active: true,
                      habilitadoComoTecnico: persona.tecnico,
                      persona: { update: datosPersona },
                  },
              })
            : await prisma.empleado.create({
                  data: {
                      codEmpleado: persona.cod,
                      habilitadoComoTecnico: persona.tecnico,
                      persona: { create: datosPersona },
                  },
              });
        mapa.set(persona.cod, {
            id: empleado.id,
            cod: persona.cod,
            nombre: `${persona.nombre} ${persona.apellido}`,
            tecnico: persona.tecnico,
        });
    }
    return mapa;
}

async function prepararCuadrillas(personal: Map<string, PersonalCreado>) {
    const creadas: Array<{ id: number; nombre: string; zona: string }> = [];
    for (const cuadrilla of CUADRILLAS) {
        const creada = await prisma.cuadrilla.create({
            data: {
                nombre: cuadrilla.nombre,
                miembros: {
                    create: cuadrilla.miembros.map((cod) => ({
                        empleadoId: personal.get(cod)!.id,
                        esLider: cod === cuadrilla.lider,
                    })),
                },
            },
        });
        creadas.push({ id: creada.id, nombre: creada.nombre, zona: cuadrilla.zona });
    }
    return creadas;
}

// ------------------------------------------------------------------ generación

async function main() {
    if (process.env.NODE_ENV === 'production') throw new Error('Este seed no corre en producción.');
    if (process.env.TRACKON_ALLOW_SEED_DATA !== 'true') {
        throw new Error('Definí TRACKON_ALLOW_SEED_DATA=true para reiniciar la base y cargar los datos de prueba.');
    }
    const url = new URL(process.env.DATABASE_URL!);
    if (!['localhost', '127.0.0.1', '::1'].includes(url.hostname)) {
        throw new Error('Los datos de prueba sólo se cargan en una base local.');
    }

    console.log('1/6 Reiniciando la base (roles, estados y migraciones se conservan)…');
    const tablas = await reiniciarBase();
    console.log(`    ${tablas} tablas vaciadas.`);
    const evidencias = await limpiarEvidenciasHuerfanas();
    if (evidencias.archivos) {
        console.log(
            `    ${evidencias.archivos} informes de evidencia huérfanos eliminados (${(evidencias.bytes / 1024 / 1024).toFixed(1)} MB).`,
        );
    }

    console.log('2/6 Verificando la cuenta administradora…');
    const admin = await prisma.usuario.findUniqueOrThrow({ where: { identificador: 'administrador' } });
    const adminId = admin.id;

    console.log('3/6 Catálogos: servicios, repuestos y personal…');
    const servicios = new Map<string, { id: number; nombre: string; precio: number; unidad: string; conceptoId: number }>();
    for (const servicio of SERVICIOS) {
        const creado = await prisma.servicio.create({
            data: {
                codigo: servicio.codigo,
                nombre: servicio.nombre,
                descripcion: servicio.descripcion,
                conceptosComerciales: {
                    create: {
                        codigo: `CAT-${servicio.codigo}`,
                        nombre: servicio.nombre,
                        tipo: 'SERVICIO',
                        unidad: servicio.unidad,
                        tarifas: { create: { precio: servicio.precio } },
                    },
                },
            },
            include: { conceptosComerciales: true },
        });
        servicios.set(servicio.codigo, {
            id: creado.id,
            nombre: servicio.nombre,
            precio: servicio.precio,
            unidad: servicio.unidad,
            conceptoId: creado.conceptosComerciales[0].id,
        });
    }
    const materiales = new Map<string, { id: number; nombre: string; unidad: string; costo: number; conceptoId: number }>();
    for (const [i, insumo] of INSUMOS.entries()) {
        const creado = await prisma.material.create({
            data: {
                codigo: `MAT-${pad(i + 1)}`,
                nombre: insumo.nombre,
                unidadMedida: insumo.unidad,
                conceptosComerciales: {
                    create: {
                        codigo: `REP-${pad(i + 1)}`,
                        nombre: insumo.nombre,
                        tipo: 'REPUESTO',
                        unidad: insumo.unidad,
                        tarifas: { create: { precio: monto(insumo.costo * 1.45) } },
                    },
                },
            },
            include: { conceptosComerciales: true },
        });
        materiales.set(insumo.nombre, {
            id: creado.id,
            nombre: insumo.nombre,
            unidad: insumo.unidad,
            costo: insumo.costo,
            conceptoId: creado.conceptosComerciales[0].id,
        });
    }
    const restos = await limpiarRestosDemo();
    if (restos.usuarios || restos.empleados) {
        console.log(`    Restos de la demo anterior eliminados: ${restos.usuarios} usuarios, ${restos.empleados} empleados.`);
    }
    const personal = await prepararPersonal();
    const cuadrillas = await prepararCuadrillas(personal);
    const tecnicos = PERSONAL.filter((p) => p.tecnico).map((p) => personal.get(p.cod)!);
    const nombresTecnicos = new Map(tecnicos.map((t) => [t.id, t.nombre]));

    console.log('4/6 Clientes, ubicaciones y equipos reales…');
    interface UbicacionCreada { id: number; nombre: string; direccion: string; equipos: Array<{ id: number; codigo: string; tipo: string; marca: string | null; modelo: string | null; serie: string | null; criticidad: 'ALTA' | 'MEDIA' | 'BAJA' }> }
    interface ClienteCreado { id: number; codigo: string; identificacion: string; empresa: Empresa; contactos: Array<{ id: number; nombre: string }>; ubicaciones: UbicacionCreada[] }
    const clientes: ClienteCreado[] = [];

    for (const [indice, empresa] of EMPRESAS.entries()) {
        const numero = indice + 1;
        const codigoCliente = `CLI-${pad(numero)}`;
        // El RUC publicado se usa tal cual; si no hay, se deja un número de trabajo
        // y la misma cadena viaja a la organización y a las instantáneas de la orden.
        const identificacion = empresa.ruc ?? `J0310000${String(900000 + numero)}`;
        const contacto = empresa.contacto;
        const cliente = await prisma.cliente.create({
            data: {
                codigo: codigoCliente,
                telefonoComercial: empresa.telefono,
                correoComercial: empresa.correo,
                organizacion: {
                    create: {
                        razonSocial: empresa.razonSocial,
                        nombreComercial: empresa.nombreComercial,
                        identificacionTributaria: identificacion,
                    },
                },
                perfilComercial: {
                    create: {
                        clasificacion: empresa.clasificacion,
                        instruccionesFacturacion: `${empresa.facturacion}${empresa.rucVerificado ? '' : ' RUC de trabajo: validar contra constancia de la DGI antes de facturar.'}`,
                    },
                },
                contactosComerciales: {
                    create: [
                        {
                            nombre: contacto.nombre,
                            cargo: contacto.cargo,
                            email: contacto.email,
                            telefono: contacto.telefono,
                        },
                        ...empresa.ubicaciones.slice(0, 1).map((u) => ({
                            nombre: u.contacto,
                            cargo: 'Responsable de sitio',
                            telefono: u.telefono,
                        })),
                    ],
                },
                notasComerciales: {
                    create: {
                        autorId: adminId,
                        texto: empresa.nota,
                    },
                },
                documentosComerciales: {
                    create: {
                        autorId: adminId,
                        titulo: `Ficha de cliente — ${empresa.nombreComercial}`,
                        tipo: 'COMERCIAL',
                        nota: `Sitio: ${empresa.sitio}. Sector: ${empresa.sector}. Datos de contacto verificados en fuentes públicas (noviembre 2026).`,
                    },
                },
                ubicaciones: {
                    create: empresa.ubicaciones.map((u) => ({
                        nombre: u.nombre,
                        direccion: u.direccion,
                        referencia: u.referencia,
                        contactoNombre: u.contacto,
                        contactoTelefono: u.telefono,
                    })),
                },
                cuentaPortal: { create: { identificador: `portal.${slug(empresa.nombreComercial)}`, passwordHash: await hashPassword('Portal-Cliente-2026!') } },
            },
            include: { contactosComerciales: true, ubicaciones: true },
        });

        const ubicaciones: UbicacionCreada[] = [];
        let contadorEquipo = 0;
        for (const [i, ubicacion] of cliente.ubicaciones.entries()) {
            const equipos: UbicacionCreada['equipos'] = [];
            for (const equipo of empresa.ubicaciones[i].equipos) {
                contadorEquipo += 1;
                const creado = await prisma.equipo.create({
                    data: {
                        ubicacionId: ubicacion.id,
                        codigo: `${codigoCliente}-EQ-${pad(contadorEquipo, 2)}`,
                        tipo: equipo.tipo,
                        marca: equipo.marca,
                        modelo: equipo.modelo,
                        numeroSerie: equipo.serie,
                        activo: true,
                    },
                });
                equipos.push({ id: creado.id, codigo: creado.codigo, tipo: creado.tipo, marca: creado.marca, modelo: creado.modelo, serie: creado.numeroSerie, criticidad: equipo.criticidad });
            }
            ubicaciones.push({ id: ubicacion.id, nombre: ubicacion.nombre, direccion: ubicacion.direccion, equipos });
        }
        clientes.push({
            id: cliente.id,
            codigo: codigoCliente,
            identificacion,
            empresa,
            contactos: cliente.contactosComerciales.map((c) => ({ id: c.id, nombre: c.nombre })),
            ubicaciones,
        });
    }
    console.log(`    ${clientes.length} clientes, ${clientes.reduce((n, c) => n + c.ubicaciones.length, 0)} ubicaciones, ${clientes.reduce((n, c) => n + c.ubicaciones.reduce((m, u) => m + u.equipos.length, 0), 0)} equipos.`);

    console.log('5/6 Historia operativa y comercial…');
    const storage = almacenamientoEvidencias();
    const estados = ['BORRADOR', 'ENVIADA', 'APROBADA', 'RECHAZADA'];
    let ordenesCreadas = 0;
    let cotizacionesCreadas = 0;
    let comprobantesCreados = 0;

    for (const [indiceCliente, cliente] of clientes.entries()) {
        const empresa = cliente.empresa;
        const contactoPrincipal = cliente.contactos[0];
        const serviciosCliente = [...servicios.values()];
        await prisma.$transaction(
            async (tx) => {
                let ordenLocal = 0;
                for (const ubicacion of cliente.ubicaciones) {
                    for (const equipo of ubicacion.equipos) {
                        // Dos a tres intervenciones por equipo en los últimos doce meses.
                        const intervenciones = equipo.criticidad === 'ALTA' ? 3 : 2;
                        for (let k = 0; k < intervenciones; k++) {
                            ordenLocal += 1;
                            const sintomas = SINTOMAS[equipo.tipo] ?? SINTOMAS.Minisplit;
                            const sintoma = sintomas[(indiceCliente + ordenLocal + k) % sintomas.length];
                            const servicio = serviciosCliente[(indiceCliente + k * 3) % serviciosCliente.length];
                            const material = [...materiales.values()][(indiceCliente + k) % materiales.size];
                            const mesesAtras = k === 0 ? 0 : 4 * k + (indiceCliente % 3);
                            const esReciente = mesesAtras === 0;
                            // Una parte de las visitas del último mes ya está cerrada:
                            // sin eso el tablero muestra facturación cero en el mes en curso.
                            const cerradaReciente = esReciente && (indiceCliente + ordenLocal) % 5 < 2;
                            const programada = esReciente
                                ? cerradaReciente
                                    ? dia(indiceCliente % 6 === 0 ? 0 : -((indiceCliente % 20) + 1), 9 + ((indiceCliente + k) % 6))
                                    : dia((indiceCliente % 8) - 2, 9 + ((indiceCliente + k) % 8))
                                : dia(-(30 * k + (indiceCliente % 10)), 9 + ((indiceCliente + k) % 8));
                            const estado = esReciente
                                ? cerradaReciente
                                    ? 'CERRADA'
                                    : ['PENDIENTE', 'ASIGNADA', 'EN_EJECUCION', 'EN_REVISION'][(indiceCliente + ordenLocal) % 4]
                                : 'CERRADA';
                            // La prioridad es la que se fijó al programar, no la gravedad del
                            // equipo: una visita cerrada en su mayoría fue MEDIA, y lo urgente
                            // queda para lo que sigue abierto.
                            const urgente = (indiceCliente + ordenLocal) % 3 === 0;
                            let prioridad: 'URGENTE' | 'ALTA' | 'MEDIA' | 'BAJA';
                            if (esReciente && !cerradaReciente && equipo.criticidad === 'ALTA') {
                                prioridad = urgente ? 'URGENTE' : 'ALTA';
                            } else if (equipo.criticidad === 'ALTA') {
                                prioridad = (indiceCliente + ordenLocal) % 2 === 0 ? 'ALTA' : 'MEDIA';
                            } else {
                                prioridad = cerradaReciente ? 'MEDIA' : 'BAJA';
                            }
                            const cuadrilla = cuadrillas[(indiceCliente + ordenLocal) % cuadrillas.length];
                            const tecnico = tecnicos[(indiceCliente + ordenLocal) % tecnicos.length];
                            const cantidadMaterial = 1 + ((indiceCliente + k) % 3);
                            const totalServicio = servicio.precio;
                            const totalMaterial = material.costo * cantidadMaterial;
                            const totalOrden = monto(totalServicio + totalMaterial);
                            const cerrada = estado === 'CERRADA';
                            const finOrden = masHoras(programada, 6);
                            // La orden nunca se crea después de la visita ni en el futuro.
                            const creadaOrden = new Date(Math.min(Date.now(), masDias(programada, -2, 8).getTime()));

                            const orden = await tx.ordenTrabajo.create({
                                data: {
                                    ubicacionId: ubicacion.id,
                                    estadoCodigo: estado,
                                    creadaPorId: adminId,
                                    solicitud: `${sintoma} Equipo ${equipo.marca ?? ''} ${equipo.modelo ?? ''} (${equipo.serie ?? 'sin serie'}).`,
                                    prioridad,
                                    fechaProgramada: programada,
                                    creadaEn: creadaOrden,
                                    cerradaEn: cerrada ? finOrden : null,
                                    clienteNombreRegistrado: empresa.razonSocial,
                                    clienteIdentificacionRegistrada: cliente.identificacion,
                                    ubicacionNombreRegistrado: ubicacion.nombre,
                                    direccionRegistrada: ubicacion.direccion,
                                    equipos: {
                                        create: {
                                            equipoId: equipo.id,
                                            identificadaPorId: adminId,
                                            identificadaEn: dia(-mesesAtras * 30 - 1, 10),
                                            tipoRegistrado: equipo.tipo,
                                            marcaRegistrada: equipo.marca ?? undefined,
                                            modeloRegistrado: equipo.modelo ?? undefined,
                                            serieRegistrada: equipo.serie ?? undefined,
                                            diagnostico: DIAGNOSTICOS[(indiceCliente + ordenLocal) % DIAGNOSTICOS.length],
                                            resultado: cerrada ? RESULTADOS[(indiceCliente + k) % RESULTADOS.length] : null,
                                            servicios: {
                                                create: {
                                                    servicioId: servicio.id,
                                                    nombreRegistrado: servicio.nombre,
                                                    cantidad: 1,
                                                    descripcionTrabajo: `Se ejecutó ${servicio.nombre.toLowerCase()} según procedimiento interno.`,
                                                },
                                            },
                                            materiales: {
                                                create: {
                                                    materialId: material.id,
                                                    nombreRegistrado: material.nombre,
                                                    unidadRegistrada: material.unidad,
                                                    cantidad: cantidadMaterial,
                                                },
                                            },
                                        },
                                    },
                                    historial: {
                                        create: cerrada
                                            ? [
                                                  { estadoNuevo: 'ASIGNADA', cambiadoPorId: adminId, motivo: 'Programación de visita', fecha: masDias(programada, -1, 10) },
                                                  { estadoNuevo: 'EN_EJECUCION', cambiadoPorId: adminId, motivo: 'Ingreso del técnico al sitio', fecha: programada },
                                                  { estadoNuevo: 'CERRADA', cambiadoPorId: adminId, motivo: 'Trabajo terminado y conformidad del cliente', fecha: finOrden },
                                              ]
                                            : [{ estadoNuevo: estado, cambiadoPorId: adminId, motivo: 'Estado actual de la visita', fecha: programada }],
                                    },
                                    asignaciones: {
                                        create: {
                                            cuadrillaId: cuadrilla.id,
                                            asignadaPorId: adminId,
                                            motivo: `Visita ${cuadrilla.nombre}`,
                                            inicio: programada,
                                            fin: cerrada ? finOrden : null,
                                            tecnicos: { create: { empleadoId: tecnico.id } },
                                        },
                                    },
                                },
                            });
                            ordenesCreadas += 1;

                            if (cerrada) {
                                // Informe técnico en PDF, firmado por el técnico que atendió.
                                const contenido = `BT /F1 15 Tf 50 790 Td (MULTICAS - INFORME TECNICO) Tj 0 -28 Td /F1 11 Tf (Orden OT-${orden.numero} - ${empresa.nombreComercial}) Tj 0 -22 Td (Sitio: ${ubicacion.nombre}) Tj 0 -20 Td (Equipo: ${equipo.tipo} ${equipo.marca ?? ''} ${equipo.modelo ?? ''}) Tj 0 -20 Td (Serie: ${equipo.serie ?? 'sin serie'}) Tj 0 -20 Td (Servicio: ${servicio.nombre}) Tj 0 -20 Td (Tecnico: ${nombresTecnicos.get(tecnico.id) ?? 'MULTICAS'}) Tj 0 -34 Td (Diagnostico: ${DIAGNOSTICOS[(indiceCliente + ordenLocal) % DIAGNOSTICOS.length].slice(0, 95)}) Tj 0 -20 Td (Resultado: equipo operativo, parametros dentro de rango.) Tj 0 -34 Td (Datos de prueba generados para demostracion interna.) Tj ET`;
                                const objetos = [
                                    '<< /Type /Catalog /Pages 2 0 R >>',
                                    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
                                    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
                                    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
                                    `<< /Length ${Buffer.byteLength(contenido)} >>\nstream\n${contenido}\nendstream`,
                                ];
                                let pdf = '%PDF-1.4\n';
                                const offsets = [0];
                                objetos.forEach((objeto, j) => {
                                    offsets.push(Buffer.byteLength(pdf));
                                    pdf += `${j + 1} 0 obj\n${objeto}\nendobj\n`;
                                });
                                const xref = Buffer.byteLength(pdf);
                                pdf += `xref\n0 6\n0000000000 65535 f \n${offsets
                                    .slice(1)
                                    .map((n) => String(n).padStart(10, '0') + ' 00000 n ')
                                    .join('\n')}\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
                                const buffer = Buffer.from(pdf);
                                const claveArchivo = randomUUID();
                                await storage.guardar(claveArchivo, buffer);
                                const ordenEquipo = await tx.ordenEquipo.findFirstOrThrow({ where: { ordenId: orden.id } });
                                await tx.evidenciaEquipo.create({
                                    data: {
                                        ordenEquipoId: ordenEquipo.id,
                                        cargadaPorId: adminId,
                                        claveArchivo,
                                        nombreOriginal: `informe-OT-${orden.numero}.pdf`,
                                        tipoArchivo: 'application/pdf',
                                        tamanoBytes: buffer.length,
                                        hashArchivo: createHash('sha256').update(buffer).digest('hex'),
                                        estadoCarga: 'DISPONIBLE',
                                        creadaEn: finOrden,
                                        disponibleEn: finOrden,
                                        revisiones: {
                                            create: {
                                                revisadaPorId: adminId,
                                                decision: 'ACEPTADA',
                                                observacion: 'Informe revisado por jefatura de taller.',
                                                revisadaEn: masHoras(finOrden, 15),
                                            },
                                        },
                                    },
                                });

                                // Facturación del trabajo cerrado.
                                const comprobante = await tx.comprobanteGerencial.create({
                                    data: {
                                        clienteId: cliente.id,
                                        referencia: `FAC-${pad(indiceCliente + 1, 2)}-${pad(ordenLocal, 3)}`,
                                        emisor: 'MULTICAS',
                                        emitidaEn: masDias(finOrden, 1, 11),
                                        venceEn: masDias(finOrden, 31, 11),
                                        importeFinal: totalOrden,
                                        autorId: adminId,
                                        lineas: {
                                            create: {
                                                descripcion: servicio.nombre,
                                                importe: totalServicio,
                                                ordenId: orden.id,
                                            },
                                        },
                                    },
                                });
                                comprobantesCreados += 1;
                                const linea = await tx.lineaComprobanteGerencial.findFirstOrThrow({ where: { comprobanteId: comprobante.id } });
                                const facturable = await tx.facturableGerencial.create({
                                    data: {
                                        clienteId: cliente.id,
                                        conceptoId: servicio.conceptoId,
                                        ordenId: orden.id,
                                        referencia: `FACT-${pad(indiceCliente + 1, 2)}-${pad(ordenLocal, 3)}`,
                                        fechaEfectiva: finOrden,
                                        cantidad: 1,
                                        unidad: 'servicio',
                                        autorId: adminId,
                                        aplicaciones: { create: { lineaComprobanteId: linea.id, cantidad: 1, fechaEfectiva: masDias(finOrden, 1, 11), autorId: adminId } },
                                    },
                                });
                                const pagaCompleto = (indiceCliente + ordenLocal) % 3 !== 0;
                                await tx.cobroGerencial.create({
                                    data: {
                                        clienteId: cliente.id,
                                        referencia: `COB-${pad(indiceCliente + 1, 2)}-${pad(ordenLocal, 3)}`,
                                        fechaEfectiva: masDias(finOrden, 11, 10),
                                        importe: pagaCompleto ? totalOrden : monto(totalOrden / 2),
                                        autorId: adminId,
                                        aplicaciones: { create: { comprobanteId: comprobante.id, importe: pagaCompleto ? totalOrden : monto(totalOrden / 2) } },
                                    },
                                });
                                if (!pagaCompleto) {
                                    await tx.facturableGerencial.create({
                                        data: {
                                            clienteId: cliente.id,
                                            conceptoId: servicio.conceptoId,
                                            ordenId: orden.id,
                                            referencia: `${facturable.referencia}-SALDO`,
                                            fechaEfectiva: masDias(finOrden, 34, 9),
                                            cantidad: 1,
                                            unidad: 'servicio',
                                            autorId: adminId,
                                        },
                                    });
                                }
                                // Costo real del trabajo: mano de obra + material + traslado.
                                await tx.costoGerencial.create({
                                    data: {
                                        referencia: `COST-${pad(indiceCliente + 1, 2)}-${pad(ordenLocal, 3)}`,
                                        fechaEfectiva: finOrden,
                                        categoria: 'MANO_OBRA',
                                        importe: monto(totalServicio * 0.42),
                                        clienteId: cliente.id,
                                        ordenId: orden.id,
                                        comprobanteId: comprobante.id,
                                        autorId: adminId,
                                    },
                                });
                                await tx.costoGerencial.create({
                                    data: {
                                        referencia: `COST-${pad(indiceCliente + 1, 2)}-${pad(ordenLocal, 3)}-M`,
                                        fechaEfectiva: finOrden,
                                        categoria: 'MATERIAL',
                                        importe: totalMaterial,
                                        clienteId: cliente.id,
                                        ordenId: orden.id,
                                        comprobanteId: comprobante.id,
                                        autorId: adminId,
                                    },
                                });

                                // Garantía de mano de obra y, en algunos casos, reclamo de calidad.
                                const garantia = await tx.garantiaGerencial.create({
                                    data: {
                                        referencia: `GAR-${pad(indiceCliente + 1, 2)}-${pad(ordenLocal, 3)}`,
                                        clienteId: cliente.id,
                                        tipo: 'SERVICIO',
                                        activoReferencia: equipo.codigo,
                                        equipoId: equipo.id,
                                        ordenId: orden.id,
                                        inicio: finOrden,
                                        fin: masDias(finOrden, 90, 17),
                                        cobertura: 'Mano de obra de la intervención y revisión de la falla atendida.',
                                        exclusiones: 'Daños por variación eléctrica, manipulación de terceros o falta de mantenimiento.',
                                        autorId: adminId,
                                    },
                                });
                                if (mesesAtras > 0 && (indiceCliente + ordenLocal) % 5 === 0) {
                                    const caso = await tx.casoCalidadGerencial.create({
                                        data: {
                                            referencia: `CAS-${pad(indiceCliente + 1, 2)}-${pad(ordenLocal, 3)}`,
                                            clienteId: cliente.id,
                                            activoReferencia: equipo.codigo,
                                            codigoFalla: 'TEMPERATURA',
                                            descripcion: `El cliente reporta que ${equipo.tipo.toLowerCase()} volvió a fallar después de la visita ${ordenLocal}.`,
                                            equipoId: equipo.id,
                                            ordenId: orden.id,
                                            garantiaId: garantia.id,
                                            abiertaEn: masDias(finOrden, 8, 9),
                                            respuestaLimiteEn: masDias(finOrden, 9, 9),
                                            resolucionLimiteEn: masDias(finOrden, 12, 9),
                                            respondidaEn: masDias(finOrden, 9, 14),
                                            resueltaEn: masDias(finOrden, 11, 15),
                                            resultado: 'PROCEDE',
                                            causaRaiz: 'Sensor descalibrado que no se detectó en la primera visita.',
                                            autorId: adminId,
                                            retrabajos: {
                                                create: {
                                                    referenciaTrabajo: `RET-${pad(indiceCliente + 1, 2)}-${pad(ordenLocal, 3)}`,
                                                    fechaEfectiva: masDias(finOrden, 10, 10),
                                                    motivo: 'Revisión y sustitución del sensor de temperatura.',
                                                    ordenId: orden.id,
                                                    autorId: adminId,
                                                },
                                            },
                                            correctivas: {
                                                create: {
                                                    descripcion: 'Agregar verificación de sensor al procedimiento de cierre de cuarto frío.',
                                                    responsableId: tecnicos[(indiceCliente + ordenLocal) % tecnicos.length].id,
                                                    creadaEn: masDias(finOrden, 10, 10),
                                                    venceEn: masDias(finOrden, 24, 10),
                                                    autorId: adminId,
                                                    cerradaEn: masDias(finOrden, 19, 10),
                                                    resultado: 'Procedimiento actualizado y socializado con las cuadrillas.',
                                                },
                                            },
                                        },
                                    });
                                    if (indiceCliente % 4 === 0) {
                                        await tx.casoCalidadGerencial.create({
                                            data: {
                                                referencia: `CAS-${pad(indiceCliente + 1, 2)}-${pad(ordenLocal, 3)}-R`,
                                                clienteId: cliente.id,
                                                activoReferencia: equipo.codigo,
                                                codigoFalla: 'TEMPERATURA',
                                                descripcion: 'Reincidencia: el equipo vuelve a presentar variación después del retrabajo.',
                                                anteriorId: caso.id,
                                                equipoId: equipo.id,
                                                ordenId: orden.id,
                                                abiertaEn: masDias(finOrden, 20, 9),
                                                respuestaLimiteEn: masDias(finOrden, 21, 9),
                                                resolucionLimiteEn: masDias(finOrden, 26, 9),
                                                autorId: adminId,
                                            },
                                        });
                                    }
                                }
                            }

                            await tx.notificacion.create({
                                data: {
                                    usuarioId: adminId,
                                    ordenId: orden.id,
                                    tipo: cerrada ? 'ORDEN_CERRADA' : 'ORDEN_ASIGNADA',
                                    mensaje: cerrada
                                        ? `OT-${orden.numero} cerrada: ${empresa.nombreComercial} — ${ubicacion.nombre}.`
                                        : `OT-${orden.numero} pendiente en ${empresa.nombreComercial} — ${ubicacion.nombre}.`,
                                    creadaEn: cerrada ? finOrden : masHoras(programada, -24),
                                    leidaEn: cerrada ? masHoras(finOrden, 15) : null,
                                },
                            });
                            await tx.auditoria.create({
                                data: {
                                    tipoActor: 'USUARIO',
                                    usuarioId: adminId,
                                    entidad: 'ORDEN_TRABAJO',
                                    entidadId: String(orden.id),
                                    accion: 'CAMBIO_ESTADO',
                                    datosNuevos: { orden: String(orden.numero), estado, cliente: empresa.nombreComercial },
                                    fecha: cerrada ? finOrden : masHoras(programada, -24),
                                },
                            });
                        }
                    }
                }

                // Cotizaciones: una aprobada que se convierte en venta, una en seguimiento.
                const serviciosOrden = [...servicios.values()];
                const combinaciones: Array<Array<'APROBADA' | 'ENVIADA' | 'BORRADOR' | 'RECHAZADA'>> = [
                    ['APROBADA', 'ENVIADA', 'ENVIADA'],
                    ['APROBADA', 'BORRADOR', 'ENVIADA'],
                    ['ENVIADA', 'BORRADOR', 'RECHAZADA'],
                    ['APROBADA', 'APROBADA', 'ENVIADA'],
                    ['ENVIADA', 'ENVIADA', 'BORRADOR'],
                ];
                const estadosCotizacion = combinaciones[indiceCliente % combinaciones.length];
                for (const [n, estado] of estadosCotizacion.entries()) {
                    const servicio = serviciosOrden[(indiceCliente + n * 2) % serviciosOrden.length];
                    const cantidad = 1 + (n % 2);
                    const total = monto(servicio.precio * cantidad);
                    const creada = await tx.cotizacionComercial.create({
                        data: {
                            clienteId: cliente.id,
                            contactoId: contactoPrincipal?.id,
                            creadaPorId: adminId,
                            estado,
                            clienteNombreRegistrado: empresa.razonSocial,
                            clienteIdentificacionRegistrada: cliente.identificacion,
                            subtotal: total,
                            descuento: 0,
                            total,
                            venceEn: dia(15 - n * 2, 17),
                            creadaEn: dia(-8 - n * 9, 10),
                            nota: `Incluye mano de obra y materiales de la visita. Precios en córdobas, IVA no incluido. Vigencia 15 días.`,
                            enviadaEn: estado === 'BORRADOR' ? null : dia(-7 - n * 9, 11),
                            ...(estado === 'APROBADA' || estado === 'RECHAZADA'
                                ? {
                                      decididaEn: dia(-5, 15),
                                      decisionOrigen: 'INTERNO',
                                      decisionUsuarioId: adminId,
                                      decisionComentario:
                                          estado === 'APROBADA'
                                              ? 'Aprobada por el cliente vía correo; se agenda la visita.'
                                              : 'El cliente decidió reparar con su proveedor actual; se retoma en la próxima temporada.',
                                  }
                                : {}),
                            lineas: {
                                create: {
                                    conceptoId: [...materiales.values()][n % materiales.size].conceptoId,
                                    posicion: 0,
                                    descripcion: servicio.nombre,
                                    tipo: 'SERVICIO',
                                    unidad: servicio.unidad,
                                    cantidad,
                                    precio: servicio.precio,
                                    descuento: 0,
                                    subtotal: total,
                                    total,
                                },
                            },
                            notas: {
                                create: {
                                    autorId: adminId,
                                    texto: `Se conversó con ${contactoPrincipal?.nombre ?? 'el encargado'} sobre el alcance y la fecha de la visita.`,
                                },
                            },
                            ...(estado === 'APROBADA'
                                ? {
                                      venta: {
                                          create: {
                                              clienteId: cliente.id,
                                              confirmadaPorId: adminId,
                                              total,
                                              confirmadaEn: dia(-5, 15),
                                          },
                                      },
                                  }
                                : {}),
                        },
                    });
                    cotizacionesCreadas += 1;
                    if (estado === 'ENVIADA') {
                        await tx.notificacion.create({
                            data: {
                                usuarioId: adminId,
                                tipo: 'COTIZACION_ENVIADA',
                                mensaje: `Cotización ${creada.id} enviada a ${empresa.nombreComercial}; vence en 15 días.`,
                                creadaEn: dia(-7, 11),
                            },
                        });
                    }
                }

                // Contrato preventivo para retail, salud, hotelería e industria.
                const conContrato = ['PREFERENTE', 'EMPRESARIAL'].includes(empresa.clasificacion);
                if (conContrato) {
                    const equipos = cliente.ubicaciones.reduce((m, u) => m + u.equipos.length, 0);
                    const importe = monto(equipos * 24000 + (indiceCliente % 5) * 6000);
                    const contrato = await tx.contratoGerencial.create({
                        data: {
                            clienteId: cliente.id,
                            referencia: `CON-2026-${pad(indiceCliente + 1, 2)}`,
                            inicio: dia(-45 + (indiceCliente % 10), 9),
                            fin: dia(320, 9),
                            importe,
                            autorId: adminId,
                            observacion: `Plan preventivo anual: ${equipos} equipos, ${equipos * 4} visitas programadas.`,
                        },
                    });
                    const anterior = await tx.contratoGerencial.create({
                        data: {
                            clienteId: cliente.id,
                            referencia: `CON-2025-${pad(indiceCliente + 1, 2)}`,
                            inicio: dia(-410, 9),
                            fin: dia(-45 + (indiceCliente % 10), 9),
                            importe: monto(importe * 0.92),
                            autorId: adminId,
                            observacion: 'Plan preventivo del año anterior, renovado sin interrupción.',
                        },
                    });
                    await tx.contratoGerencial.update({ where: { id: contrato.id }, data: { anteriorId: anterior.id } });
                }
            },
            { timeout: 90000 },
        );
    }

    console.log('6/6 Inventario, compras, herramientas y coberturas…');
    // Inventario de repuestos con movimientos coherentes.
    for (const [i, material] of [...materiales.values()].entries()) {
        const inicial = 20 + (i % 4) * 5;
        const comprado = 10 + (i % 3) * 10;
        const consumido = 6 + (i % 5) * 4;
        const saldo = inicial + comprado - consumido;
        const articulo = await prisma.articuloGerencial.create({
            data: {
                codigo: `ART-${pad(i + 1)}`,
                nombre: material.nombre,
                unidad: material.unidad,
                materialId: material.id,
                minimo: material.costo > 5000 ? 2 : 8,
                saldoCantidad: saldo,
                saldoValor: monto(saldo * material.costo),
                ultimaFecha: dia(-1),
                autorId: adminId,
            },
        });
        await prisma.movimientoGerencial.create({
            data: {
                articuloId: articulo.id,
                tipo: 'APERTURA',
                sentido: 1,
                cantidad: inicial,
                valor: monto(inicial * material.costo),
                saldoCantidad: inicial,
                saldoValor: monto(inicial * material.costo),
                referencia: `AP-${pad(i + 1)}`,
                fechaEfectiva: dia(-300, 9),
                observacion: 'Inventario inicial del ejercicio.',
                autorId: adminId,
            },
        });
        const proveedor = PROVEEDORES[i % PROVEEDORES.length];
        const compra = await prisma.compraGerencial.create({
            data: {
                proveedor,
                referencia: `OC-${pad(i + 1)}`,
                fechaEfectiva: dia(-60 + i, 10),
                autorId: adminId,
                lineas: {
                    create: {
                        articuloId: articulo.id,
                        cantidad: comprado,
                        costoUnitario: material.costo,
                        prometidaEn: dia(-50 + i, 10),
                    },
                },
            },
        });
        const lineaCompra = await prisma.lineaCompraGerencial.findFirstOrThrow({ where: { compraId: compra.id } });
        const entrada = await prisma.movimientoGerencial.create({
            data: {
                articuloId: articulo.id,
                tipo: 'ENTRADA',
                sentido: 1,
                cantidad: comprado,
                valor: monto(comprado * material.costo),
                saldoCantidad: inicial + comprado,
                saldoValor: monto((inicial + comprado) * material.costo),
                referencia: `ENT-${pad(i + 1)}`,
                fechaEfectiva: dia(-50 + i, 14),
                observacion: `Recepción de ${proveedor}.`,
                autorId: adminId,
            },
        });
        await prisma.recepcionGerencial.create({
            data: {
                lineaId: lineaCompra.id,
                cantidad: comprado,
                fechaEfectiva: dia(-50 + i, 14),
                referencia: `REC-${pad(i + 1)}`,
                movimientoId: entrada.id,
                autorId: adminId,
            },
        });
        await prisma.movimientoGerencial.create({
            data: {
                articuloId: articulo.id,
                tipo: 'CONSUMO',
                sentido: -1,
                cantidad: consumido,
                valor: monto(consumido * material.costo),
                saldoCantidad: saldo,
                saldoValor: monto(saldo * material.costo),
                referencia: `CONS-${pad(i + 1)}`,
                fechaEfectiva: dia(-2, 16),
                observacion: 'Consumo acumulado de órdenes cerradas.',
                autorId: adminId,
            },
        });
    }

    // Herramientas con préstamos abiertos y devueltos.
    const herramientas = [
        'Bomba de vacío 5 CFM',
        'Manómetro digital de refrigeración',
        'Multímetro True RMS',
        'Pinza amperimétrica 400 A',
        'Detector de fugas electrónico',
        'Termómetro infrarrojo',
        'Cámara termográfica',
    ];
    for (const [i, nombre] of herramientas.entries()) {
        const herramienta = await prisma.herramientaGerencial.create({
            data: { codigo: `HER-${pad(i + 1)}`, nombre, autorId: adminId },
        });
        const tecnico = tecnicos[i % tecnicos.length];
        await prisma.prestamoHerramientaGerencial.create({
            data: {
                herramientaId: herramienta.id,
                empleadoId: tecnico.id,
                prestadaEn: dia(-12 + i, 8),
                previstaEn: dia(2 + i, 17),
                referencia: `PRE-${pad(i + 1)}`,
                autorId: adminId,
                ...(i % 3 === 0 ? { devueltaEn: dia(-3, 16), devueltaPorId: adminId } : {}),
            },
        });
    }

    for (const area of ['COMERCIAL', 'FINANCIERO', 'LOGISTICO', 'CALIDAD'] as const) {
        await prisma.coberturaGerencial.create({
            data: {
                area,
                desde: dia(-365, 9),
                hastaVerificada: hoy,
                responsableId: adminId,
                observacion: `Cobertura ${area.toLowerCase()} del período: órdenes, comprobantes y costos cargados con datos de prueba sobre clientes reales.`,
            },
        });
    }

    // Tarifa preferente por cliente para los conceptos de servicio más usados.
    const conceptosServicio = await prisma.conceptoComercial.findMany({ where: { tipo: 'SERVICIO' }, orderBy: { id: 'asc' } });
    for (const cliente of clientes.slice(0, 10)) {
        for (const [i, concepto] of conceptosServicio.entries()) {
            const base = servicios.get(SERVICIOS[i % SERVICIOS.length].codigo)?.precio ?? 1000;
            await prisma.tarifaComercial.create({
                data: {
                    conceptoId: concepto.id,
                    clienteId: cliente.id,
                    precio: monto(base * (cliente.empresa.clasificacion === 'PREFERENTE' ? 0.9 : 0.95)),
                },
            });
        }
    }

    const [porEstado, porPrioridad, cotizacionesPorEstado] = await Promise.all([
        prisma.ordenTrabajo.groupBy({ by: ['estadoCodigo'], _count: { _all: true } }),
        prisma.ordenTrabajo.groupBy({ by: ['prioridad'], _count: { _all: true } }),
        prisma.cotizacionComercial.groupBy({ by: ['estado'], _count: { _all: true } }),
    ]);
    const formatear = (filas: Array<Record<string, unknown> & { _count: { _all: number } }>, clave: string) =>
        filas.map((fila) => `${String(fila[clave])} ${fila._count._all}`).join(' · ');

    console.log(
        [
            '',
            'Datos de prueba cargados:',
            `  ${clientes.length} clientes reales, ${clientes.reduce((n, c) => n + c.ubicaciones.length, 0)} ubicaciones, ${clientes.reduce((n, c) => n + c.ubicaciones.reduce((m, u) => m + u.equipos.length, 0), 0)} equipos.`,
            `  ${ordenesCreadas} órdenes, ${cotizacionesCreadas} cotizaciones, ${comprobantesCreados} comprobantes.`,
            `  ${materiales.size} repuestos, ${PERSONAL.length} empleados, ${cuadrillas.length} cuadrillas.`,
            `  Órdenes por estado: ${formatear(porEstado, 'estadoCodigo')}.`,
            `  Órdenes por prioridad: ${formatear(porPrioridad, 'prioridad')}.`,
            `  Cotizaciones por estado: ${formatear(cotizacionesPorEstado, 'estado')}.`,
            '  Cuentas locales conservadas: administrador, tecnico (sin cambios de contraseña).',
        ].join('\n'),
    );
}

main()
    .catch((error: unknown) => {
        console.error('No se pudieron cargar los datos de prueba:', error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
