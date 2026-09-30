// backend/src/routes/alunos/routes.js
import express from 'express';
import alunoController from '../../controllers/alunoController.js';
import { autenticar, permitir } from '../../middlewares/auth.js';

const routes = express.Router();

// Missao 008: o perfil aluno nunca lista a escola inteira, so o proprio portal.
// GET /alunos e liberado a secretaria e ao professor (a chamada e o boletim precisam da lista).
routes.get('/alunos', autenticar, permitir('admin', 'professor'), alunoController.listarAlunos);
routes.post('/alunos', autenticar, permitir('admin'), alunoController.cadastrarAluno);
routes.put('/alunos/:id', autenticar, permitir('admin'), alunoController.atualizarAluno);
routes.delete('/alunos/:id', autenticar, permitir('admin'), alunoController.excluirAluno);

// Missao 008: criação/redefinição do acesso do aluno ao portal (secretaria).
routes.post('/alunos/:id/acesso', autenticar, permitir('admin'), alunoController.definirAcesso);

export default routes;
