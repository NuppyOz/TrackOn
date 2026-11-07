import type { Seccion } from './layout/Sidebar';

export const RUTAS = {
    dashboard: '/dashboard',
    clientes: '/clientes',
    empleados: '/empleados',
    equipos: '/equipos',
    servicios: '/servicios',
    ordenes: '/ordenes',
    cuadrillas: '/cuadrillas',
    materiales: '/materiales',
    agenda: '/agenda',
    administracion: {
        inicio: '/administracion',
        usuarios: '/administracion/usuarios',
        roles: '/administracion/roles',
    },
    auditoria: '/auditoria',
    comercial: {
        inicio: '/comercial',
        crm: '/comercial/crm',
        'cotizaciones-ventas': '/comercial/cotizaciones-ventas',
        'catalogo-tarifas': '/comercial/catalogo-tarifas',
        'portal-cuentas': '/comercial/portal-cuentas',
    },
    inteligencia: {
        inicio: '/inteligencia',
        operacion: {
            resumen: '/inteligencia/operacion/resumen',
            centro: '/inteligencia/operacion/centro',
            seguimiento: '/inteligencia/operacion/seguimiento',
            indicadores: '/inteligencia/operacion/indicadores',
        },
        comercial: '/inteligencia/comercial',
        financiero: '/inteligencia/financiero',
        logistico: '/inteligencia/logistico',
        calidad: '/inteligencia/calidad',
        origen: {
            contratos: '/inteligencia/origen/contratos',
            finanzas: '/inteligencia/origen/finanzas',
            logistica: '/inteligencia/origen/logistica',
            calidad: '/inteligencia/origen/calidad',
        },
        cobertura: '/inteligencia/cobertura',
    },
    operaciones: {
        inicio: '/operaciones',
        solicitudes: '/operaciones/solicitudes',
        diagnostico: '/operaciones/diagnostico',
        ordenes: '/operaciones/ordenes',
        tiposServicio: '/operaciones/tipos-servicio',
        ejecucion: '/operaciones/ejecucion',
        evidencias: '/operaciones/evidencias',
        agenda: '/operaciones/agenda',
        despacho: '/operaciones/despacho',
        field: '/operaciones/field',
    },
    field: {
        inicio: '/field',
        registro: '/field/registro',
        inspeccion: '/field/inspeccion',
        creacion: '/field/creacion',
        instalacion: '/field/instalacion',
        inicioTrabajo: '/field/inicio-trabajo',
        fotosIniciales: '/field/fotos-iniciales',
        calendario: '/field/calendario',
        tecnicos: '/field/tecnicos',
        misOrdenes: '/field/mis-ordenes',
    },
    portal: '/portal',
} as const;

export const RUTA_INICIAL_POR_SECCION: Readonly<Record<Seccion, string>> = {
    agenda: RUTAS.agenda,
    administracion: RUTAS.administracion.usuarios,
    auditoria: RUTAS.auditoria,
    dashboard: RUTAS.dashboard,
    materiales: RUTAS.materiales,
    clientes: RUTAS.clientes,
    empleados: RUTAS.empleados,
    ordenes: RUTAS.ordenes,
    equipos: RUTAS.equipos,
    servicios: RUTAS.servicios,
    cuadrillas: RUTAS.cuadrillas,
    comercial: RUTAS.comercial.crm,
    inteligencia: RUTAS.inteligencia.operacion.resumen,
    operaciones: RUTAS.operaciones.solicitudes,
    field: RUTAS.field.misOrdenes,
};

const rutasRaiz: Readonly<Record<string, Seccion>> = {
    '/': 'dashboard',
    [RUTAS.dashboard]: 'dashboard',
    [RUTAS.clientes]: 'clientes',
    [RUTAS.empleados]: 'empleados',
    [RUTAS.equipos]: 'equipos',
    [RUTAS.servicios]: 'servicios',
    [RUTAS.ordenes]: 'ordenes',
    [RUTAS.cuadrillas]: 'cuadrillas',
    [RUTAS.materiales]: 'materiales',
    [RUTAS.agenda]: 'agenda',
    [RUTAS.administracion.inicio]: 'administracion',
    [RUTAS.administracion.usuarios]: 'administracion',
    [RUTAS.administracion.roles]: 'administracion',
    [RUTAS.auditoria]: 'auditoria',
};

const rutasComerciales: ReadonlySet<string> = new Set(Object.values(RUTAS.comercial));
const rutasInteligencia: ReadonlySet<string> = new Set([
    RUTAS.inteligencia.inicio,
    ...Object.values(RUTAS.inteligencia.operacion),
    RUTAS.inteligencia.comercial,
    RUTAS.inteligencia.financiero,
    RUTAS.inteligencia.logistico,
    RUTAS.inteligencia.calidad,
    ...Object.values(RUTAS.inteligencia.origen),
    RUTAS.inteligencia.cobertura,
]);
const rutasOperaciones: ReadonlySet<string> = new Set(Object.values(RUTAS.operaciones));
const rutasField: ReadonlySet<string> = new Set(Object.values(RUTAS.field));

export type RutaLeida = Readonly<{
    seccion: Seccion;
    ordenId?: number;
    ordenNueva: boolean;
    ruta: string;
    valida: boolean;
}>;

export function leerRuta(pathname = window.location.pathname): RutaLeida {
    const ruta = pathname.split('?')[0].replace(/\/+$/, '') || '/';
    const [segmento, detalle] = ruta.split('/').filter(Boolean);

    if (ruta in rutasRaiz) {
        return { seccion: rutasRaiz[ruta], ruta, ordenNueva: false, valida: true };
    }
    if (rutasComerciales.has(ruta)) {
        return { seccion: 'comercial', ruta, ordenNueva: false, valida: true };
    }
    if (rutasInteligencia.has(ruta)) {
        return { seccion: 'inteligencia', ruta, ordenNueva: false, valida: true };
    }
    if (rutasOperaciones.has(ruta)) {
        return { seccion: 'operaciones', ruta, ordenNueva: false, valida: true };
    }
    if (rutasField.has(ruta)) {
        return { seccion: 'field', ruta, ordenNueva: false, valida: true };
    }
    if (segmento === 'ordenes' && detalle === 'nueva' && ruta === '/ordenes/nueva') {
        return { seccion: 'ordenes', ruta, ordenNueva: true, valida: true };
    }
    if (segmento === 'ordenes' && detalle && /^[1-9]\d*$/.test(detalle) && ruta === `/ordenes/${detalle}`) {
        const ordenId = Number(detalle);
        if (Number.isSafeInteger(ordenId) && ordenId <= 2_147_483_647) {
            return { seccion: 'ordenes', ordenId, ordenNueva: false, ruta, valida: true };
        }
    }

    return { seccion: 'dashboard', ruta, ordenNueva: false, valida: false };
}

export function irA(ruta: string) {
    if (window.location.pathname === ruta) return;
    window.history.pushState(null, '', ruta);
    window.dispatchEvent(new Event('trackon:navigate'));
}
