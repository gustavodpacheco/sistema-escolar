import sequelize from './database.js';

// Missao 008: a conta do aluno vive em `usuarios` com `aluno_id` (Missao 006),
// mantendo a senha fora do modelo academico. `sequelize.sync` cria tabelas
// novas, mas nao altera tabelas existentes: por isso a coluna e o indice
// unico sao garantidos aqui de forma idempotente.
export async function aplicarMigrations() {
  const { colunas, indices } = await alvoDaMissao008();

  if (!colunas) {
    await sequelize.query('ALTER TABLE usuarios ADD COLUMN aluno_id INT NULL AFTER perfil');
    console.log('Migration: coluna usuarios.aluno_id criada.');
  }

  if (!indices) {
    await sequelize.query('ALTER TABLE usuarios ADD UNIQUE INDEX usuarios_aluno_id (aluno_id)');
    console.log('Migration: indice unico usuarios.aluno_id criado.');
  }
}

async function alvoDaMissao008() {
  const [colunas] = await sequelize.query("SHOW COLUMNS FROM usuarios LIKE 'aluno_id'");
  const [indices] = await sequelize.query("SHOW INDEX FROM usuarios WHERE Key_name = 'usuarios_aluno_id'");
  return { colunas: colunas.length > 0, indices: indices.length > 0 };
}
