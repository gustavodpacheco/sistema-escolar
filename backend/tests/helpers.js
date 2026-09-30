import { encerrarServidor, startServer } from '../src/server.js';
import sequelize from '../src/config/database.js';

// A suíte faz dezenas de logins do mesmo IP: o teto precisa ficar fora do caminho.
process.env.LOGIN_RATE_MAX = '10000';
process.env.API_RATE_MAX = '100000';

let servidor;
let base = '';

export const SENHA_DEMO = process.env.SEED_PASSWORD || '123456';

export const CONTAS = {
  admin: 'admin@escola.com',
  professor: 'ana@escola.com',
  aluno: 'carlos@escola.com',
  outraAluna: 'marina@escola.com',
};

export async function subirApi() {
  servidor = await startServer({ port: 0 });
  base = `http://127.0.0.1:${servidor.address().port}`;
  return base;
}

// O retry de banco e o pool do Sequelize seguram o event loop: sem isso o processo nao encerra.
export async function derrubarApi() {
  encerrarServidor();
  if (servidor) await new Promise((resolve) => servidor.close(resolve));
  servidor = null;
  await sequelize.close();
}

export async function requisitar(rota, { token, method = 'GET', body } = {}) {
  const resposta = await fetch(`${base}${rota}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const texto = await resposta.text();
  let dados = null;
  try { dados = texto ? JSON.parse(texto) : null; } catch { dados = texto; }
  return { status: resposta.status, body: dados };
}

export async function tokenDe(rota, corpo) {
  const { body } = await requisitar(rota, { method: 'POST', body: corpo });
  return body.token;
}

export const tokenAdmin = () => tokenDe('/login', { email: CONTAS.admin, senha: SENHA_DEMO });
export const tokenProfessor = () => tokenDe('/login', { email: CONTAS.professor, senha: SENHA_DEMO });
export const tokenAluno = (senha = SENHA_DEMO) => tokenDe('/alunos/login', { email: CONTAS.aluno, senha });
export const tokenDaOutraAluna = () => tokenDe('/alunos/login', { email: CONTAS.outraAluna, senha: SENHA_DEMO });
