import express from 'express';
import { listar } from '../../controllers/auditoriaController.js';
import { autenticar, permitir } from '../../middlewares/auth.js';
const routes = express.Router();
routes.get('/auditoria', autenticar, permitir('admin'), listar);
export default routes;
