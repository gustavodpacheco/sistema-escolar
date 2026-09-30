import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { pathToFileURL } from 'node:url';
import sequelize from './config/database.js';
import routes from './routes/index.js';
import './config/associations.js';
import { aplicarMigrations } from './config/migrations.js';
import { criarUsuariosIniciais } from './config/seed.js';
import { limiteGeral } from './middlewares/limites.js';

const app = express();
const PORT = Number(process.env.PORT || 3000);
const DB_RETRY_DELAY_MS = Number(process.env.DB_RETRY_DELAY_MS || 5000);
const DB_SYNC_FORCE = String(process.env.DB_SYNC_FORCE || 'false').toLowerCase() === 'true';

// Missao 006: so o frontend autorizado fala com a API. O dev server do Vite roda em
// 5173 e faz proxy de /api, entao e a origem que o navegador realmente envia.
const origensPermitidas = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((origem) => origem.trim())
  .filter(Boolean);

// Middlewares
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false }));
app.use(cors({ origin: origensPermitidas }));
app.use(express.json({ limit: '100kb' }));
app.use(limiteGeral);

// Rotas principais do sistema. Novos modulos entram no routes/index.js.
app.use(routes);

// Erros de validacao do Sequelize viram 400; o resto vira 500 sem expor stack.
app.use((error, req, res, next) => {
  if (error?.name === 'SequelizeValidationError' || error?.name === 'SequelizeUniqueConstraintError') {
    return res.status(400).json({ erro: error.errors?.[0]?.message || 'Dados invalidos.' });
  }
  console.error('Erro nao tratado:', error);
  return res.status(500).json({ erro: 'Erro interno do servidor.' });
});

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let encerrando = false;

// Mantem o servidor HTTP no ar e tenta reconectar ao banco sem encerrar o processo.
// So a conexao e retentada: uma migration quebrada e erro de codigo, nao indisponibilidade,
// e rodar em loop esconderia o problema por sempre.
async function connectDatabaseWithRetry() {
  while (!encerrando) {
    try {
      await sequelize.authenticate();
      console.log('Conexao com o banco de dados estabelecida com sucesso!');
      break;
    } catch (error) {
      if (encerrando) return;
      console.error('Falha ao conectar no banco. Nova tentativa em alguns segundos.');
      console.error(error.message);
      await delay(DB_RETRY_DELAY_MS);
    }
  }

  console.log('DB_SYNC_FORCE =', DB_SYNC_FORCE);
  await sequelize.sync({ force: DB_SYNC_FORCE });
  await aplicarMigrations();
  await criarUsuariosIniciais();
  console.log('Banco de dados sincronizado com sucesso!');
}

export async function startServer({ port = PORT } = {}) {
  encerrando = false;
  const servidor = app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
  });

  try {
    await connectDatabaseWithRetry();
  } catch (error) {
    // Sem banco migrado a API responderia 500 em tudo; melhor encerrar com a causa.
    console.error('Falha ao preparar o banco de dados:', error.message);
    servidor.close();
    throw error;
  }
  return servidor;
}

// Usado pelos testes: interrompe o retry de banco antes de derrubar o servidor.
export function encerrarServidor() {
  encerrando = true;
}

export { app };

// Nos testes a API e importada sem subir servidor nem retry de banco.
const executadoDiretamente = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (executadoDiretamente) {
  startServer().catch((error) => {
    console.error('Erro inesperado ao iniciar o servidor:', error);
  });
}
