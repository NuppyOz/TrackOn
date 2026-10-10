import { Request, Response } from 'express';
import { OrdenesService } from './ordenes.service.js';
import { error } from 'console';

export class OrdenesController {
  
  static async crear(req: Request, res: Response) {
    try {
      // req.user.id vendría del middleware de autenticación que hizo tu equipo.
      // Si aún no está conectado, usamos un ID fijo de prueba temporal (ej. 1).
      const creadorId = (req as any).user?.id || 1; 
      
      const nuevaOrden = await OrdenesService.crearOrden(req.body, creadorId);
      res.status(201).json(nuevaOrden);
    } catch (error: any) {
      res.status(400).json({ error: 'No se pudo crear la orden', detalle: error.message });
    }
  }

  static async listar(req: Request, res: Response) {
    try {
      const ordenes = await OrdenesService.listarOrdenes(req.query);
      res.json(ordenes);
    } catch (error: any) {
      res.status(500).json({ error: 'Error al listar las órdenes', detalle: error.message });
    }
  }

  // Agrega este método dentro de la clase OrdenesController
  static async actualizarEstado(req: Request, res: Response) {
    try {
      console.error("🚨 ERROR REAL DE PRISMA:", error);
      // El ID de la orden viene en la URL (ej. /api/ordenes/5/estado)
      const ordenId = parseInt(req.params.id as string);
      
      // El nuevo estado y el motivo vienen en el cuerpo (JSON)
      const { nuevoEstado, motivo } = req.body;
      
      // ID del usuario logueado (temporal hasta tener el middleware)
      const cambiadoPorId = (req as any).user?.id || 1; 

      if (!nuevoEstado) {
        return res.status(400).json({ error: 'Debe especificar el nuevo estado' });
      }

      const resultado = await OrdenesService.cambiarEstado(ordenId, nuevoEstado, cambiadoPorId, motivo);
      res.json(resultado);
    } catch (err: any) {
      // 1. Esto imprimirá el error real en tu consola de forma limpia
      console.log("🚨 EL VERDADERO ERROR ES:", err);
      
      // 2. Esto enviará el mensaje limpio a Postman
      return res.status(400).json({ 
        error: "No se pudo cambiar el estado", 
        detalle: err.message
      });
    }
  }
}