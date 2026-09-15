// backend/src/routes/alunos/routes.js
import express from 'express';
import alunoController from '../../controllers/alunoController.js';
import { autenticar, permitir } from '../../middlewares/auth.js';

const routes = express.Router();

// Quando o React enviar um POST para /alunos, o controlador será ativado [18, 19]
routes.get('/alunos', autenticar, alunoController.listarAlunos);
routes.post('/alunos', autenticar, permitir('admin'), alunoController.cadastrarAluno);
routes.put('/alunos/:id', autenticar, permitir('admin'), alunoController.atualizarAluno);
routes.delete('/alunos/:id', autenticar, permitir('admin'), alunoController.excluirAluno);

export default routes;
