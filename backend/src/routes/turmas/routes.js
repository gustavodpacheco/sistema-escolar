import express from 'express';
import turmaController from '../../controllers/turmaController.js';
import { autenticar, permitir } from '../../middlewares/auth.js';

const routes = express.Router();

// Missao 008: turmas e a relacao de alunos nao sao visiveis para o perfil aluno,
// que so acessa o proprio portal (/aluno/*).
routes.get('/turmas', autenticar, permitir('admin', 'professor'), turmaController.listarTurmas);

routes.post('/turmas', autenticar, permitir('admin'), turmaController.cadastrarTurma);
routes.get('/turmas/:id/alunos', autenticar, permitir('admin', 'professor'), turmaController.listarAlunosDaTurma);

export default routes;
