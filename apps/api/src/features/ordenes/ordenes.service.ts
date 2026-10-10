import { PrismaClient, PrioridadOrden } from '@prisma/client';

const prisma = new PrismaClient();

export class OrdenesService {
  
  static async crearOrden(data: any, creadorId: number) {
    // 1. Buscar la ubicación y su cliente asociado para crear el Snapshot (RN-02)
    const ubicacion = await prisma.ubicacion.findUnique({
      where: { id: data.ubicacionId },
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
}