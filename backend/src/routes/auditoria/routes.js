import express from 'express';
import { indicadores, listar } from '../../controllers/auditoriaController.js';
import { autenticar, permitir } from '../../middlewares/auth.js';
const routes = express.Router();
const somenteAdmin = [autenticar, permitir('admin')];
routes.get('/auditoria', ...somenteAdmin, listar);
routes.get('/auditoria/indicadores', ...somenteAdmin, indicadores);
export default routes;
