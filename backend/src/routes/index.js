import express from 'express';

import alunosRoutes from './alunos/routes.js';
import turmasRoutes from './turmas/routes.js';
import authRoutes from './auth/routes.js';
import notasRoutes from './notas/routes.js';
import frequenciasRoutes from './frequencias/routes.js';
import auditoriaRoutes from './auditoria/routes.js';

const routes = express.Router();

routes.use(alunosRoutes);
routes.use(turmasRoutes);
routes.use(authRoutes);
routes.use(notasRoutes);
routes.use(frequenciasRoutes);
routes.use(auditoriaRoutes);

export default routes;
