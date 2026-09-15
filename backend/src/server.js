import express from 'express';
import cors from 'cors';
import sequelize from './config/database.js';
import routes from './routes/index.js';
import './config/associations.js';
import { criarUsuariosIniciais } from './config/seed.js';

const app = express();
const PORT = Number(process.env.PORT || 3000);
const DB_RETRY_DELAY_MS = Number(process.env.DB_RETRY_DELAY_MS || 5000);
const DB_SYNC_FORCE = String(process.env.DB_SYNC_FORCE || 'false').toLowerCase() === 'true';

// Middlewares
app.use(cors());
app.use(express.json());

// Rotas principais do sistema. Novos modulos entram no routes/index.js.
app.use(routes);

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Mantem o servidor HTTP no ar e tenta reconectar ao banco sem encerrar o processo.
async function connectDatabaseWithRetry() {
  while (true) {
    try {
      await sequelize.authenticate();
      console.log('Conexao com o banco de dados estabelecida com sucesso!');
console.log('DB_SYNC_FORCE =', DB_SYNC_FORCE);

      await sequelize.sync({ force: DB_SYNC_FORCE });
      await criarUsuariosIniciais();
      console.log('Banco de dados sincronizado com sucesso!');
      return;
    } catch (error) {
      console.error('Falha ao conectar no banco. Nova tentativa em alguns segundos.');
      console.error(error.message);
      await delay(DB_RETRY_DELAY_MS);
    }
  }
}

async function startServer() {
  app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
  });

  await connectDatabaseWithRetry();
}

startServer().catch((error) => {
  console.error('Erro inesperado ao iniciar o servidor:', error);
});
