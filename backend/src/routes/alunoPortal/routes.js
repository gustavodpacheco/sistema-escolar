import express from 'express';
import * as controller from '../../controllers/alunoPortalController.js';
import { autenticar, permitir } from '../../middlewares/auth.js';
import { limiteDeLogin } from '../../middlewares/limites.js';

const routes = express.Router();

// Login do proprio aluno: publico, como /login, mas so aceita contas com perfil aluno.
routes.post('/alunos/login', limiteDeLogin, controller.login);

// Missao 008: area somente leitura, exclusiva do perfil aluno.
// A protecao fica em cada rota: um `routes.use` no nivel do router pegaria
// tambem as rotas registradas depois dele.
const somenteAluno = [autenticar, permitir('aluno')];
routes.get('/aluno/perfil', ...somenteAluno, controller.perfil);
routes.get('/aluno/notas', ...somenteAluno, controller.notas);
routes.get('/aluno/frequencia', ...somenteAluno, controller.frequencia);
routes.get('/aluno/frequencia/resumo', ...somenteAluno, controller.resumo);
routes.put('/aluno/senha', ...somenteAluno, controller.alterarSenha);

export default routes;
