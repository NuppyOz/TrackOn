import { Request, Response } from 'express';
import { OrdenesService } from './ordenes.service.js';

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
}