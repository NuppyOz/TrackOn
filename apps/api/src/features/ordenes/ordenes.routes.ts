import { Router } from 'express';
import { OrdenesController } from './ordenes.controller.js';
// import { authMiddleware } from '../auth/auth.middleware'; // Descomenta cuando auth esté listo

const router = Router();

// Protegemos las rutas
// router.use(authMiddleware); 

// Endpoint para crear una orden (POST /api/ordenes)
router.post('/', OrdenesController.crear);

// Endpoint para listar las órdenes (GET /api/ordenes)
router.get('/', OrdenesController.listar);

export default router;