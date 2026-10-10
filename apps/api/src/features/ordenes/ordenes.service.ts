import { prisma } from '../../infrastructure/prisma.js';
import { PrioridadOrden } from '@prisma/client';
export class OrdenesService {
  static async crearOrden(data: any, creadorId: number) {
    // 1. Buscar la ubicación y su cliente asociado para crear el Snapshot (RN-02)
    console.log("Datos recibidos:", data);
    const ubicacion = await prisma.ubicacion.findUnique({
      where: { id: Number(data.ubicacionId) },
      include: {
        cliente: {
          include: { persona: true, organizacion: true }
        }
      }
    });


    if (!ubicacion) {
      throw new Error('La ubicación especificada no existe.');
    }

    // 2. Determinar el nombre e identificación del cliente (Persona u Organización)
    let clienteNombre = '';
    let clienteIdentificacion = null;

    if (ubicacion.cliente.persona) {
      clienteNombre = `${ubicacion.cliente.persona.firstName} ${ubicacion.cliente.persona.firstLastName}`;
      clienteIdentificacion = ubicacion.cliente.persona.numberDocument;
    } else if (ubicacion.cliente.organizacion) {
      clienteNombre = ubicacion.cliente.organizacion.razonSocial;
      clienteIdentificacion = ubicacion.cliente.organizacion.identificacionTributaria;
    }

    // 3. Crear la orden de trabajo en la base de datos
    const nuevaOrden = await prisma.ordenTrabajo.create({
      data: {
        ubicacionId: data.ubicacionId,
        creadaPorId: creadorId,
        solicitud: data.solicitud,
        prioridad: data.prioridad || PrioridadOrden.MEDIA,
        fechaProgramada: data.fechaProgramada ? new Date(data.fechaProgramada) : null,
        // RN-03: El estado inicial de una orden creada (Asegúrate de que 'BORRADOR' exista en la tabla EstadoOrden)
        estadoCodigo: 'BORRADOR', 
        
        // Snapshots extraídos automáticamente de las tablas de la Persona 1
        clienteNombreRegistrado: clienteNombre,
        clienteIdentificacionRegistrada: clienteIdentificacion,
        ubicacionNombreRegistrado: ubicacion.nombre,
        direccionRegistrada: ubicacion.direccion,
      }
    });

    // Como 'numero' es BigInt, al devolverlo en JSON hay que convertirlo a String
    return {
      ...nuevaOrden,
      numero: nuevaOrden.numero.toString() 
    };
  }

  static async listarOrdenes(filtros: any) {
    const whereClause: any = {};
    
    if (filtros.estadoCodigo) whereClause.estadoCodigo = filtros.estadoCodigo;
    if (filtros.prioridad) whereClause.prioridad = filtros.prioridad;
    if (filtros.ubicacionId) whereClause.ubicacionId = Number(filtros.ubicacionId);

    const ordenes = await prisma.ordenTrabajo.findMany({
      where: whereClause,
      include: {
        estado: true, // Trae el nombre del estado
        creadaPor: { select: { identificador: true } } // Trae quién la creó
      },
      orderBy: { creadaEn: 'desc' }
    });

    // Convertir los BigInt a String para evitar errores al mandar a React
    return ordenes.map((orden: any) => ({
      ...orden,
      numero: orden.numero.toString()
    }));
  }

  //TK 8
  // Agrega este método dentro de la clase OrdenesService
  static async cambiarEstado(ordenId: number, nuevoEstado: string, cambiadoPorId: number, motivo?: string) {
    // 1. Buscar la orden actual para saber cuál era su estado anterior
    console.log("ID que llega a Prisma:", ordenId, "Tipo:", typeof ordenId);
    const ordenActual = await prisma.ordenTrabajo.findUnique({
    where: { id: Number(ordenId) }
    });
    if (!ordenActual) {
      throw new Error('La orden especificada no existe.');
    }

    if (ordenActual.estadoCodigo === nuevoEstado) {
      throw new Error('La orden ya se encuentra en este estado.');
    }

    // 2. Ejecutar la actualización y el registro histórico en una sola transacción
    const [ordenActualizada, historial] = await prisma.$transaction([
      // A. Actualizar el estado en la orden
      prisma.ordenTrabajo.update({
        where: { id: ordenId },
        data: { estadoCodigo: nuevoEstado }
      }),
      // B. Crear el registro en la tabla de historial
      prisma.historialEstado.create({
        data: {
          ordenId: ordenId,
          estadoAnterior: ordenActual.estadoCodigo,
          estadoNuevo: nuevoEstado,
          cambiadoPorId: cambiadoPorId,
          motivo: motivo || 'Actualización de estado operativo',
        }
      })
    ]);

    return {
      orden: { ...ordenActualizada, numero: ordenActualizada.numero.toString() },
      historial
    };
  }

}

