import express from 'express';
import * as controller from '../../controllers/notaController.js';
import { autenticar, permitir } from '../../middlewares/auth.js';
const routes = express.Router();
// Autenticacao e autorizacao por rota: `routes.use` no nivel do router
// interceptaria tambem as rotas dos outros modulos.
const equipe = [autenticar, permitir('admin', 'professor')];
// Missao 008: o perfil aluno e somente leitura no proprio portal (/aluno/*).
routes.get('/notas', ...equipe, controller.listar);
routes.get('/notas/boletim/:alunoId', ...equipe, controller.boletim);
routes.post('/notas', ...equipe, controller.criar);
routes.put('/notas/:id', ...equipe, controller.editar);
routes.delete('/notas/:id', ...equipe, controller.excluir);
export default routes;
