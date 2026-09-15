import express from 'express';
import turmaController from '../../controllers/turmaController.js';
import { autenticar, permitir } from '../../middlewares/auth.js';

const routes = express.Router();

routes.get('/turmas', autenticar, turmaController.listarTurmas);

routes.post('/turmas', autenticar, permitir('admin'), turmaController.cadastrarTurma);
routes.get('/turmas/:id/alunos', autenticar, turmaController.listarAlunosDaTurma);

export default routes;
