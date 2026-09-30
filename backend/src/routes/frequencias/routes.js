import express from 'express';
import * as controller from '../../controllers/frequenciaController.js';
import { autenticar, permitir } from '../../middlewares/auth.js';
const routes = express.Router();
const equipe = [autenticar, permitir('admin', 'professor')];
// Missao 008: o perfil aluno e somente leitura no proprio portal (/aluno/*).
routes.get('/frequencias', ...equipe, controller.listar);
routes.get('/frequencias/resumo', ...equipe, controller.painel);
routes.get('/frequencias/historico', ...equipe, controller.historico);
routes.post('/frequencias', ...equipe, controller.criar);
routes.put('/frequencias/:id', ...equipe, controller.editar);
routes.delete('/frequencias/:id', ...equipe, controller.excluir);
export default routes;
