/** Datos ficticios de demostración. No modifica ni elimina registros ajenos a DEMO-. */
import 'dotenv/config';
import { createHash, randomUUID } from 'node:crypto';
import { almacenamientoEvidencias } from '../src/infrastructure/evidence-storage.js';
import { prisma } from '../src/infrastructure/prisma.js';
import { hashPassword } from '../src/security/password.js';

const ahora = new Date();
const dia = (dias: number, hora = 10) => {
    const d = new Date(ahora);
    d.setDate(d.getDate() + dias);
    d.setHours(hora, 0, 0, 0);
    return d;
};
const codigo = (tipo: string, i: number) => `DEMO-${tipo}-${String(i).padStart(3, '0')}`;
const nombres = ['José', 'María', 'Luis', 'Ana', 'Carlos', 'Sofía', 'Jorge', 'Lucía', 'Pedro', 'Valeria'];
const apellidos = [
    'Rodríguez',
    'Martínez',
    'López',
    'García',
    'Hernández',
    'Castro',
    'Mendoza',
    'Ruiz',
    'Flores',
    'Vargas',
];
const zonas = ['Managua', 'Masaya', 'Granada', 'León', 'Estelí'];
const negocios = [
    'Clínica',
    'Hotel',
    'Supermercado',
    'Restaurante',
    'Laboratorio',
    'Distribuidora',
    'Panadería',
    'Centro comercial',
    'Hospital',
    'Almacén',
];
const marcas = ['Carrier', 'Daikin', 'York', 'LG', 'Samsung'];
const tareas = [
    'Mantenimiento preventivo',
    'Diagnóstico técnico',
    'Limpieza de condensador',
    'Instalación de climatización',
    'Reparación de compresor',
];
const repuestos = [
    'Refrigerante R410A',
    'Capacitor 45 µF',
    'Filtro secador',
    'Sensor de temperatura',
    'Válvula de expansión',
    'Contactor bipolar',
    'Tubería de cobre',
    'Aislante térmico',
    'Motor de ventilador',
    'Termostato digital',
];

async function main() {
    if (process.env.NODE_ENV === 'production' || process.env.TRACKON_ALLOW_DEMO_DATA !== 'true')
        throw new Error('Sólo desarrollo con TRACKON_ALLOW_DEMO_DATA=true.');
    const host = new URL(process.env.DATABASE_URL!).hostname;
    if (!['localhost', '127.0.0.1', '::1'].includes(host))
        throw new Error('La demo completa requiere una base local.');
    const admin = await prisma.usuario.findUniqueOrThrow({ where: { identificador: 'administrador' } });
    const passwordHash = await hashPassword('TrackOn-Demo-2026!');
    const rol = await prisma.rol.findUniqueOrThrow({ where: { cod: 'TEC' } });
    for (let i = 1; i <= 100; i++) {
        await prisma.$transaction(
            async (tx) => {
                const ref = codigo('CLI', i);
                if (await tx.cliente.findUnique({ where: { codigo: ref } })) return;
                const nombre = `${negocios[(i - 1) % 10]} ${['Central', 'Las Palmas', 'El Roble', 'San Rafael', 'Los Pinos'][Math.floor((i - 1) / 10) % 5]} ${i > 50 ? 'Norte' : 'Sur'}`;
                const cliente = await tx.cliente.create({
                    data: {
                        codigo: ref,
                        telefonoComercial: `22${String(500000 + i)}`,
                        correoComercial: `compras${i}@example.com`,
                        organizacion: {
                            create: {
                                razonSocial: nombre,
                                nombreComercial: nombre,
                                identificacionTributaria: `J${3100000000000 + i}`,
                            },
                        },
                        perfilComercial: {
                            create: {
                                clasificacion: ['EMPRESARIAL', 'PYME', 'PREFERENTE'][i % 3],
                                instruccionesFacturacion:
                                    'Crédito 30 días. Datos ficticios para demostración.',
                            },
                        },
                        contactosComerciales: {
                            create: {
                                nombre: `${nombres[i % 10]} ${apellidos[Math.floor(i / 10) % 10]}`,
                                email: `contacto${i}@example.com`,
                                telefono: `88${String(100000 + i)}`,
                                cargo: 'Responsable de mantenimiento',
                            },
                        },
                        notasComerciales: {
                            create: {
                                autorId: admin.id,
                                texto: 'Visita comercial realizada. Cliente interesado en mantenimiento trimestral. Registro ficticio.',
                            },
                        },
                        documentosComerciales: {
                            create: {
                                autorId: admin.id,
                                titulo: 'Condiciones de servicio',
                                tipo: 'COMERCIAL',
                                nota: 'Documento de referencia ficticio; solicitar validación de cobertura.',
                            },
                        },
                        ubicaciones: {
                            create: {
                                nombre: `Sede ${zonas[i % 5]}`,
                                direccion: `${zonas[i % 5]}, avenida principal, local ${i}`,
                                contactoNombre: `${nombres[i % 10]} ${apellidos[i % 10]}`,
                                contactoTelefono: `88${String(100000 + i)}`,
                            },
                        },
                        cuentaPortal: { create: { identificador: `demo.cliente${i}`, passwordHash } },
                    },
                });
                const ubicacion = await tx.ubicacion.findFirstOrThrow({ where: { clienteId: cliente.id } });
                const empleado = await tx.empleado.create({
                    data: {
                        codEmpleado: codigo('EMP', i),
                        habilitadoComoTecnico: true,
                        persona: {
                            create: {
                                firstName: nombres[(i - 1) % 10],
                                firstLastName: apellidos[Math.floor((i - 1) / 10)],
                                telephone: `85${String(200000 + i)}`,
                                correo: `tecnico${i}@example.com`,
                            },
                        },
                        usuario: {
                            create: { identificador: `demo.tecnico${i}`, passwordHash, rolId: rol.id },
                        },
                    },
                });
                const cuadrilla = await tx.cuadrilla.create({
                    data: {
                        nombre: `DEMO Cuadrilla ${zonas[i % 5]} ${i}`,
                        miembros: { create: { empleadoId: empleado.id, esLider: true } },
                    },
                });
                const equipo = await tx.equipo.create({
                    data: {
                        codigo: codigo('EQ', i),
                        ubicacionId: ubicacion.id,
                        tipo: ['Minisplit', 'Cámara fría', 'Unidad central', 'Congelador', 'Chiller'][i % 5],
                        marca: marcas[i % 5],
                        modelo: `INV-${18000 + (i % 5) * 6000}`,
                        numeroSerie: codigo('SER', i),
                    },
                });
                const servicio = await tx.servicio.create({
                    data: {
                        codigo: codigo('SRV', i),
                        nombre: `${tareas[i % 5]} · ${equipo.tipo}`,
                        descripcion:
                            'Inspección, limpieza, pruebas eléctricas y verificación de temperatura. Datos de demostración.',
                    },
                });
                const material = await tx.material.create({
                    data: {
                        codigo: codigo('MAT', i),
                        nombre: `${repuestos[i % 10]} · ${marcas[i % 5]} ${i}`,
                        unidadMedida: 'unidad',
                    },
                });
                const concepto = await tx.conceptoComercial.create({
                    data: {
                        codigo: codigo('CAT', i),
                        nombre: servicio.nombre,
                        tipo: 'SERVICIO',
                        unidad: 'servicio',
                        servicioId: servicio.id,
                        tarifas: {
                            create: [
                                { precio: 2400 + (i % 10) * 100 },
                                { clienteId: cliente.id, precio: 2300 + (i % 10) * 100 },
                            ],
                        },
                    },
                });
                await tx.conceptoComercial.create({
                    data: {
                        codigo: codigo('REP', i),
                        nombre: material.nombre,
                        tipo: ['REPUESTO', 'INSUMO', 'EQUIPO', 'MANO_OBRA'][i % 4],
                        unidad: 'unidad',
                        materialId: material.id,
                        tarifas: { create: { precio: 450 + (i % 10) * 25 } },
                    },
                });
                const estado = ['PENDIENTE', 'ASIGNADA', 'EN_EJECUCION', 'EN_REVISION', 'CERRADA'][i % 5];
                const fecha = i % 3 === 0 ? dia(0, 9 + (i % 10)) : dia(-(i % 20), 9 + (i % 8));
                const orden = await tx.ordenTrabajo.create({
                    data: {
                        ubicacionId: ubicacion.id,
                        estadoCodigo: estado,
                        creadaPorId: admin.id,
                        solicitud: `${codigo('OT', i)} · ${servicio.nombre}. Revisar rendimiento y registrar mediciones.`,
                        prioridad: i % 8 === 0 ? 'URGENTE' : i % 3 === 0 ? 'ALTA' : 'MEDIA',
                        fechaProgramada: fecha,
                        creadaEn: dia(-25),
                        cerradaEn: estado === 'CERRADA' ? dia(-(i % 5)) : null,
                        clienteNombreRegistrado: nombre,
                        ubicacionNombreRegistrado: ubicacion.nombre,
                        direccionRegistrada: ubicacion.direccion,
                        equipos: {
                            create: {
                                equipoId: equipo.id,
                                tipoRegistrado: equipo.tipo,
                                marcaRegistrada: equipo.marca,
                                modeloRegistrado: equipo.modelo,
                                serieRegistrada: equipo.numeroSerie,
                                diagnostico:
                                    'Condensador con suciedad moderada; presión y voltaje dentro del rango esperado.',
                                resultado:
                                    estado === 'CERRADA' || estado === 'EN_REVISION'
                                        ? 'Equipo operativo. Temperatura estabilizada en 22 °C.'
                                        : null,
                                servicios: {
                                    create: {
                                        servicioId: servicio.id,
                                        nombreRegistrado: servicio.nombre,
                                        cantidad: 1,
                                        descripcionTrabajo:
                                            'Inspección, limpieza y pruebas de funcionamiento.',
                                    },
                                },
                                materiales: {
                                    create: {
                                        materialId: material.id,
                                        nombreRegistrado: material.nombre,
                                        unidadRegistrada: 'unidad',
                                        cantidad: 2,
                                    },
                                },
                            },
                        },
                        historial: {
                            create: {
                                estadoNuevo: estado,
                                cambiadoPorId: admin.id,
                                motivo: 'Carga de demostración',
                                fecha,
                            },
                        },
                        ...(estado !== 'PENDIENTE'
                            ? {
                                  asignaciones: {
                                      create: {
                                          cuadrillaId: cuadrilla.id,
                                          asignadaPorId: admin.id,
                                          motivo: 'Programación de demostración',
                                          inicio: fecha,
                                          fin: estado === 'CERRADA' ? dia(0, 20) : null,
                                      },
                                  },
                              }
                            : {}),
                    },
                });
                // Dos cotizaciones por cliente: una venta confirmada y otra en seguimiento.
                const total = 2400 + (i % 10) * 100;
                for (const venta of [true, false]) {
                    const estadoCot = venta ? 'APROBADA' : ['BORRADOR', 'ENVIADA', 'RECHAZADA'][i % 3];
                    await tx.cotizacionComercial.create({
                        data: {
                            clienteId: cliente.id,
                            creadaPorId: admin.id,
                            estado: estadoCot,
                            clienteNombreRegistrado: nombre,
                            subtotal: total,
                            descuento: 0,
                            total,
                            venceEn: dia(15),
                            creadaEn: dia(-(i % 20)),
                            nota: 'Mantenimiento con materiales básicos incluidos. Datos ficticios.',
                            enviadaEn: estadoCot !== 'BORRADOR' ? dia(-(i % 20)) : null,
                            ...(['APROBADA', 'RECHAZADA'].includes(estadoCot)
                                ? {
                                      decididaEn: dia(0),
                                      decisionOrigen: 'INTERNO',
                                      decisionUsuarioId: admin.id,
                                      decisionComentario: 'Decisión ficticia de demostración.',
                                  }
                                : {}),
                            lineas: {
                                create: {
                                    conceptoId: concepto.id,
                                    posicion: 0,
                                    descripcion: concepto.nombre,
                                    tipo: 'SERVICIO',
                                    unidad: 'servicio',
                                    cantidad: 1,
                                    precio: total,
                                    descuento: 0,
                                    subtotal: total,
                                    total,
                                },
                            },
                            notas: {
                                create: {
                                    autorId: admin.id,
                                    texto: 'Seguimiento comercial: se revisaron condiciones y fecha de visita.',
                                },
                            },
                            ...(venta
                                ? {
                                      venta: {
                                          create: {
                                              clienteId: cliente.id,
                                              confirmadaPorId: admin.id,
                                              total,
                                              confirmadaEn: dia(-(i % 20)),
                                          },
                                      },
                                  }
                                : {}),
                        },
                    });
                }
                const contrato = await tx.contratoGerencial.create({
                    data: {
                        clienteId: cliente.id,
                        referencia: codigo('CON', i),
                        inicio: dia(-10 - (i % 5)),
                        fin: dia(i % 4 === 0 ? 15 : 180),
                        importe: 18000 + (i % 10) * 500,
                        autorId: admin.id,
                        observacion: 'Plan preventivo trimestral de demostración.',
                    },
                });
                await tx.contratoGerencial.create({
                    data: {
                        clienteId: cliente.id,
                        referencia: codigo('CON-ANT', i),
                        inicio: dia(-540),
                        fin: dia(-11 - (i % 5)),
                        importe: contrato.importe,
                        autorId: admin.id,
                    },
                });
                const comprobante = await tx.comprobanteGerencial.create({
                    data: {
                        clienteId: cliente.id,
                        referencia: codigo('FAC', i),
                        emisor: 'DEMO MULTICAS',
                        emitidaEn: dia(-(10 + (i % 20))),
                        venceEn: dia(i % 4 === 0 ? -3 : 15),
                        importeFinal: total,
                        autorId: admin.id,
                        lineas: {
                            create: {
                                descripcion: servicio.nombre,
                                importe: total,
                                ordenId: orden.id,
                                conceptoId: concepto.id,
                            },
                        },
                    },
                });
                const linea = await tx.lineaComprobanteGerencial.findFirstOrThrow({
                    where: { comprobanteId: comprobante.id },
                });
                const facturable = await tx.facturableGerencial.create({
                    data: {
                        clienteId: cliente.id,
                        conceptoId: concepto.id,
                        ordenId: orden.id,
                        referencia: codigo('FACT', i),
                        fechaEfectiva: dia(-10),
                        cantidad: 1,
                        unidad: 'servicio',
                        autorId: admin.id,
                        aplicaciones: {
                            create: {
                                lineaComprobanteId: linea.id,
                                cantidad: 1,
                                fechaEfectiva: dia(-5),
                                autorId: admin.id,
                            },
                        },
                    },
                });
                await tx.facturableGerencial.create({
                    data: {
                        clienteId: cliente.id,
                        conceptoId: concepto.id,
                        ordenId: orden.id,
                        referencia: `${facturable.referencia}-PEND`,
                        fechaEfectiva: dia(-2),
                        cantidad: 1,
                        unidad: 'servicio',
                        autorId: admin.id,
                    },
                });
                await tx.cobroGerencial.create({
                    data: {
                        clienteId: cliente.id,
                        referencia: codigo('COB', i),
                        fechaEfectiva: dia(-(i % 8)),
                        importe: i % 3 === 0 ? total : total / 2,
                        autorId: admin.id,
                        aplicaciones: {
                            create: {
                                comprobanteId: comprobante.id,
                                importe: i % 3 === 0 ? total : total / 2,
                            },
                        },
                    },
                });
                await tx.costoGerencial.create({
                    data: {
                        referencia: codigo('COST', i),
                        fechaEfectiva: dia(-(i % 10)),
                        categoria: ['MANO_OBRA', 'MATERIAL', 'TRANSPORTE', 'OTRO'][i % 4],
                        importe: 1200 + (i % 10) * 40,
                        clienteId: cliente.id,
                        ordenId: orden.id,
                        comprobanteId: comprobante.id,
                        autorId: admin.id,
                    },
                });
                const cantidad = i % 8 === 0 ? 2 : 24 + (i % 10);
                const costo = 280 + (i % 10) * 10;
                const articulo = await tx.articuloGerencial.create({
                    data: {
                        codigo: codigo('ART', i),
                        nombre: material.nombre,
                        unidad: 'unidad',
                        materialId: material.id,
                        minimo: 8,
                        saldoCantidad: cantidad,
                        saldoValor: cantidad * costo,
                        ultimaFecha: dia(-1),
                        autorId: admin.id,
                    },
                });
                await tx.movimientoGerencial.create({
                    data: {
                        articuloId: articulo.id,
                        tipo: 'APERTURA',
                        sentido: 1,
                        cantidad: 30,
                        valor: 30 * costo,
                        saldoCantidad: 30,
                        saldoValor: 30 * costo,
                        referencia: codigo('AP', i),
                        fechaEfectiva: dia(-35),
                        observacion: 'Inventario inicial ficticio',
                        autorId: admin.id,
                    },
                });
                const compra = await tx.compraGerencial.create({
                    data: {
                        proveedor: `DEMO Suministros ${zonas[i % 5]}`,
                        referencia: codigo('OC', i),
                        fechaEfectiva: dia(-14),
                        autorId: admin.id,
                        lineas: {
                            create: {
                                articuloId: articulo.id,
                                cantidad: 10,
                                costoUnitario: costo,
                                prometidaEn: dia(-7),
                            },
                        },
                    },
                });
                const lineaCompra = await tx.lineaCompraGerencial.findFirstOrThrow({
                    where: { compraId: compra.id },
                });
                const entrada = await tx.movimientoGerencial.create({
                    data: {
                        articuloId: articulo.id,
                        tipo: 'ENTRADA',
                        sentido: 1,
                        cantidad: 10,
                        valor: 10 * costo,
                        saldoCantidad: 40,
                        saldoValor: 40 * costo,
                        referencia: codigo('ENT', i),
                        fechaEfectiva: dia(-7),
                        observacion: 'Recepción de compra de demostración',
                        autorId: admin.id,
                    },
                });
                await tx.recepcionGerencial.create({
                    data: {
                        lineaId: lineaCompra.id,
                        cantidad: 10,
                        fechaEfectiva: dia(-7),
                        referencia: codigo('REC', i),
                        movimientoId: entrada.id,
                        autorId: admin.id,
                    },
                });
                await tx.movimientoGerencial.create({
                    data: {
                        articuloId: articulo.id,
                        tipo: 'CONSUMO',
                        sentido: -1,
                        cantidad: 40 - cantidad,
                        valor: (40 - cantidad) * costo,
                        saldoCantidad: cantidad,
                        saldoValor: cantidad * costo,
                        referencia: codigo('CONS', i),
                        fechaEfectiva: dia(-1),
                        ordenId: orden.id,
                        observacion: 'Consumo en mantenimiento de demostración',
                        autorId: admin.id,
                    },
                });
                const herramienta = await tx.herramientaGerencial.create({
                    data: {
                        codigo: codigo('HER', i),
                        nombre: `${['Multímetro', 'Manómetro', 'Bomba de vacío', 'Pinza amperimétrica', 'Termómetro'][i % 5]} ${i}`,
                        autorId: admin.id,
                    },
                });
                await tx.prestamoHerramientaGerencial.create({
                    data: {
                        herramientaId: herramienta.id,
                        empleadoId: empleado.id,
                        prestadaEn: dia(-5),
                        previstaEn: dia(2),
                        referencia: codigo('PRE', i),
                        autorId: admin.id,
                        ...(i % 3 === 0 ? { devueltaEn: dia(-1), devueltaPorId: admin.id } : {}),
                    },
                });
                const garantia = await tx.garantiaGerencial.create({
                    data: {
                        referencia: codigo('GAR', i),
                        clienteId: cliente.id,
                        tipo: 'SERVICIO',
                        activoReferencia: equipo.codigo,
                        equipoId: equipo.id,
                        ordenId: orden.id,
                        inicio: dia(-30),
                        fin: dia(60),
                        cobertura: 'Mano de obra y revisión de la intervención; datos ficticios.',
                        exclusiones: 'Daños por variación eléctrica y manipulación externa.',
                        autorId: admin.id,
                    },
                });
                const resuelto = i % 3 !== 0;
                const caso = await tx.casoCalidadGerencial.create({
                    data: {
                        referencia: codigo('CAS', i),
                        clienteId: cliente.id,
                        activoReferencia: equipo.codigo,
                        codigoFalla: 'TEMPERATURA',
                        descripcion: 'Cliente reporta variación leve de temperatura después de la visita.',
                        equipoId: equipo.id,
                        ordenId: orden.id,
                        garantiaId: garantia.id,
                        abiertaEn: dia(-6),
                        respuestaLimiteEn: dia(-5),
                        resolucionLimiteEn: dia(-2),
                        respondidaEn: dia(-5),
                        ...(resuelto
                            ? {
                                  resueltaEn: dia(-3),
                                  resultado: 'PROCEDE',
                                  causaRaiz: 'Ajuste de sensor y limpieza de filtro.',
                                  cerradaEn: i % 2 === 0 ? dia(-2) : null,
                              }
                            : {}),
                        autorId: admin.id,
                        retrabajos: {
                            create: {
                                referenciaTrabajo: codigo('RET', i),
                                fechaEfectiva: dia(-4),
                                motivo: 'Verificación y ajuste del sensor.',
                                ordenId: orden.id,
                                autorId: admin.id,
                            },
                        },
                        correctivas: {
                            create: {
                                descripcion:
                                    'Verificar sensor y registrar temperatura posterior al servicio.',
                                responsableId: empleado.id,
                                creadaEn: dia(-4),
                                venceEn: dia(3),
                                autorId: admin.id,
                                ...(resuelto
                                    ? { cerradaEn: dia(-2), resultado: 'Prueba satisfactoria.' }
                                    : {}),
                            },
                        },
                    },
                });
                await tx.casoCalidadGerencial.create({
                    data: {
                        referencia: codigo('REINC', i),
                        clienteId: cliente.id,
                        activoReferencia: equipo.codigo,
                        codigoFalla: 'TEMPERATURA',
                        descripcion: 'Seguimiento de reincidencia para verificar estabilidad.',
                        anteriorId: caso.id,
                        equipoId: equipo.id,
                        ordenId: orden.id,
                        abiertaEn: dia(-1),
                        respuestaLimiteEn: dia(1),
                        resolucionLimiteEn: dia(3),
                        autorId: admin.id,
                    },
                });
                await tx.notificacion.create({
                    data: {
                        usuarioId: admin.id,
                        ordenId: orden.id,
                        tipo: 'DEMO_ORDEN',
                        mensaje: `Seguimiento de OT-${orden.numero}: ${nombre}.`,
                        creadaEn: dia(0, 8 + (i % 10)),
                        leidaEn: i % 4 === 0 ? dia(0, 20) : null,
                    },
                });
                await tx.auditoria.create({
                    data: {
                        tipoActor: 'USUARIO',
                        usuarioId: admin.id,
                        entidad: 'ORDEN_TRABAJO',
                        entidadId: String(orden.id),
                        accion: 'SEED_DEMO',
                        datosNuevos: { cliente: nombre, estado },
                        fecha: dia(0, 8 + (i % 10)),
                    },
                });
            },
            { timeout: 30000 },
        );
    }
    // Completar relaciones secundarias de forma repetible, también en demos ya cargadas.
    const storage = almacenamientoEvidencias();
    const clientes = await prisma.cliente.findMany({
        where: { codigo: { startsWith: 'DEMO-CLI-' } },
        orderBy: { codigo: 'asc' },
        include: {
            organizacion: true,
            ubicaciones: {
                include: { equipos: true, ordenes: { include: { equipos: true, asignaciones: true } } },
            },
        },
    });
    for (const [indice, cliente] of clientes.entries()) {
        const i = indice + 1;
        if (cliente.organizacion?.identificacionTributaria?.startsWith('DEMO-RUC-')) {
            await prisma.organizacion.update({
                where: { id: cliente.organizacion.id },
                data: { identificacionTributaria: `J${3100000000000 + i}` },
            });
        }
        // Al menos 100 conceptos en cada categoría comercial, con precios cercanos.
        if (i > 25) {
            for (const tipo of ['REPUESTO', 'INSUMO', 'EQUIPO', 'MANO_OBRA']) {
                const nombre =
                    tipo === 'EQUIPO'
                        ? `Unidad de climatización ${marcas[i % 5]} ${18000 + (i % 5) * 6000} BTU · ${i}`
                        : tipo === 'MANO_OBRA'
                          ? `Hora técnica de ${['refrigeración', 'climatización', 'electricidad'][i % 3]} · ${i}`
                          : tipo === 'INSUMO'
                            ? `Kit de limpieza de climatización · ${i}`
                            : `${repuestos[i % 10]} · ${marcas[i % 5]} ${i}`;
                const ref = codigo(tipo, i);
                if (!(await prisma.conceptoComercial.findUnique({ where: { codigo: ref } }))) {
                    await prisma.conceptoComercial.create({
                        data: {
                            codigo: ref,
                            tipo,
                            nombre,
                            unidad: tipo === 'MANO_OBRA' ? 'hora' : 'unidad',
                            tarifas: {
                                create: {
                                    precio: tipo === 'EQUIPO' ? 24000 + (i % 10) * 500 : 450 + (i % 10) * 25,
                                },
                            },
                        },
                    });
                }
            }
        }

        const orden = cliente.ubicaciones[0]?.ordenes[0];
        if (!orden) continue;
        const actual = await prisma.contratoGerencial.findUniqueOrThrow({
            where: { referencia: codigo('CON', i) },
        });
        const anterior = await prisma.contratoGerencial.findUniqueOrThrow({
            where: { referencia: codigo('CON-ANT', i) },
        });
        if (actual.inicio.getTime() === dia(-180).getTime()) {
            await prisma.contratoGerencial.update({
                where: { id: actual.id },
                data: { inicio: dia(-10 - (i % 5)) },
            });
            await prisma.contratoGerencial.update({
                where: { id: anterior.id },
                data: { fin: dia(-11 - (i % 5)) },
            });
        }
        if (!actual.anteriorId)
            await prisma.contratoGerencial.update({
                where: { id: actual.id },
                data: { anteriorId: anterior.id },
            });
        if (orden.asignaciones[0] && !orden.asignaciones[0].empleadoResponsableId) {
            const empleado = await prisma.empleado.findUniqueOrThrow({
                where: { codEmpleado: codigo('EMP', i) },
            });
            if (i % 2 === 0)
                await prisma.asignacion.update({
                    where: { id: orden.asignaciones[0].id },
                    data: { cuadrillaId: null, empleadoResponsableId: empleado.id },
                });
            await prisma.asignacionTecnico.upsert({
                where: {
                    asignacionId_empleadoId: {
                        asignacionId: orden.asignaciones[0].id,
                        empleadoId: empleado.id,
                    },
                },
                update: {},
                create: { asignacionId: orden.asignaciones[0].id, empleadoId: empleado.id },
            });
        }
        const registro = orden.equipos[0];
        if (!registro) continue;
        const existe = await prisma.evidenciaEquipo.findFirst({
            where: { ordenEquipoId: registro.id, nombreOriginal: 'informe-demo.pdf' },
        });
        if (!existe) {
            const contenido = `BT /F1 16 Tf 50 780 Td (TRACKON - INFORME DE DEMOSTRACION) Tj 0 -35 Td /F1 11 Tf (Orden ${String(orden.numero)} - Equipo de climatizacion) Tj 0 -25 Td (Inspeccion, limpieza y verificacion de funcionamiento.) Tj 0 -25 Td (Voltaje: 220 V. Temperatura: 22 C. Resultado satisfactorio.) Tj 0 -35 Td (Datos ficticios para demostracion. Sin validez tecnica.) Tj ET`;
            const objetos = [
                '<< /Type /Catalog /Pages 2 0 R >>',
                '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
                '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
                '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
                `<< /Length ${Buffer.byteLength(contenido)} >>\nstream\n${contenido}\nendstream`,
            ];
            let pdf = '%PDF-1.4\n';
            const offsets = [0];
            objetos.forEach((o, j) => {
                offsets.push(Buffer.byteLength(pdf));
                pdf += `${j + 1} 0 obj\n${o}\nendobj\n`;
            });
            const xref = Buffer.byteLength(pdf);
            pdf += `xref\n0 6\n0000000000 65535 f \n${offsets
                .slice(1)
                .map((n) => String(n).padStart(10, '0') + ' 00000 n ')
                .join('\n')}\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
            const buffer = Buffer.from(pdf);
            const clave = randomUUID();
            await storage.guardar(clave, buffer);
            await prisma.evidenciaEquipo.create({
                data: {
                    ordenEquipoId: registro.id,
                    cargadaPorId: admin.id,
                    claveArchivo: clave,
                    nombreOriginal: 'informe-demo.pdf',
                    tipoArchivo: 'application/pdf',
                    tamanoBytes: buffer.length,
                    hashArchivo: createHash('sha256').update(buffer).digest('hex'),
                    estadoCarga: 'DISPONIBLE',
                    creadaEn: dia(-2),
                    disponibleEn: dia(-1),
                    revisiones: {
                        create: {
                            revisadaPorId: admin.id,
                            decision: 'ACEPTADA',
                            observacion: 'Informe ficticio de demostración.',
                        },
                    },
                },
            });
        }
    }
    for (const area of ['COMERCIAL', 'FINANCIERO', 'LOGISTICO', 'CALIDAD'])
        await prisma.coberturaGerencial.upsert({
            where: { area },
            update: {},
            create: {
                area,
                desde: dia(-365),
                hastaVerificada: ahora,
                responsableId: admin.id,
                observacion: 'Cobertura de demostración: datos ficticios relacionados.',
            },
        });
    console.log(
        'Demo completa: 100 clientes, contactos, ubicaciones, equipos, técnicos, usuarios, cuadrillas, servicios, materiales, cuentas portal, ventas, comprobantes, cobros, costos, artículos, compras, recepciones, herramientas, préstamos, garantías, retrabajos y correctivas; 200 cotizaciones, contratos, facturables y casos; 500 conceptos (100 por categoría), 600 tarifas y 300 movimientos.',
    );
}
main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
