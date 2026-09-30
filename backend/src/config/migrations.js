import sequelize from './database.js';

// `sequelize.sync` cria tabelas novas, mas nao altera tabelas existentes. Por isso
// colunas, chaves estrangeiras e indices unicos ficam garantidos aqui, de forma
// idempotente, para que uma base criada em uma sprint antiga continue valida.
export async function aplicarMigrations() {
  await migrarVinculoDaContaDoAluno();
  await migrarRevogacaoDeToken();
  await migrarChaveDeTurma();
  await migrarIndicesAntiDuplicata();
  await migrarTurmaUnica();
  await migrarImutabilidadeDaAuditoria();
}

// Missao 008: a conta do aluno vive em `usuarios` com `aluno_id` (Missao 006),
// mantendo a senha fora do modelo academico.
async function migrarVinculoDaContaDoAluno() {
  if (!await colunaExiste('usuarios', 'aluno_id')) {
    await sequelize.query('ALTER TABLE usuarios ADD COLUMN aluno_id INT NULL AFTER perfil');
    console.log('Migration: coluna usuarios.aluno_id criada.');
  }

  if (!await indiceExiste('usuarios', 'usuarios_aluno_id')) {
    await sequelize.query('ALTER TABLE usuarios ADD UNIQUE INDEX usuarios_aluno_id (aluno_id)');
    console.log('Migration: indice unico usuarios.aluno_id criado.');
  }
}

// Missao 008: `token_version` e o contador que permite revogar os tokens
// emitidos antes da troca de senha.
async function migrarRevogacaoDeToken() {
  if (await colunaExiste('usuarios', 'token_version')) return;
  await sequelize.query('ALTER TABLE usuarios ADD COLUMN token_version INT NOT NULL DEFAULT 0 AFTER aluno_id');
  console.log('Migration: coluna usuarios.token_version criada.');
}

// Missao 002: `aluno.turma_id` era um INTEGER solto, sem chave estrangeira. Um aluno
// podia ficar apontando para uma turma inexistente e sumir das listagens.
async function migrarChaveDeTurma() {
  if (!await indiceExiste('alunos', 'alunos_turma_id')) {
    await sequelize.query('ALTER TABLE alunos ADD INDEX alunos_turma_id (turma_id)');
    console.log('Migration: indice alunos.turma_id criado.');
  }

  if (await restricaoExiste('alunos', 'alunos_turma_id_fk')) return;

  // orphans = alunos apontando para uma turma que nao existe. Sem isso o MySQL
  // recusa a criacao da FK e a migration morreria num banco ja sujo.
  const [orphans] = await sequelize.query(
    'SELECT COUNT(*) AS total FROM alunos a LEFT JOIN turmas t ON t.id = a.turma_id WHERE a.turma_id IS NOT NULL AND t.id IS NULL'
  );
  if (Number(orphans[0]?.total) > 0) {
    await sequelize.query('UPDATE alunos SET turma_id = NULL WHERE turma_id IS NOT NULL AND turma_id NOT IN (SELECT id FROM turmas)');
    console.log(`Migration: ${orphans[0].total} aluno(s) com turma inexistente foram desvinculados.`);
  }

  await sequelize.query('ALTER TABLE alunos ADD CONSTRAINT alunos_turma_id_fk FOREIGN KEY (turma_id) REFERENCES turmas(id) ON DELETE SET NULL ON UPDATE CASCADE');
  console.log('Migration: chave estrangeira alunos.turma_id criada.');
}

// QA das missoes 003 e 004: "sem dados duplicados". Clicar duas vezes em "Salvar
// chamada" ou reenviar um lancamento criava registros repetidos e inflava o
// percentual de frequencia.
async function migrarIndicesAntiDuplicata() {
  if (!await indiceExiste('notas', 'notas_lancamento_unico')) {
    await sequelize.query('ALTER TABLE notas ADD UNIQUE INDEX notas_lancamento_unico (aluno_id, disciplina, bimestre)');
    console.log('Migration: indice unico notas(aluno_id, disciplina, bimestre) criado.');
  }

  if (!await indiceExiste('frequencias', 'frequencias_aula_unica')) {
    await deduplicarFrequencias();
    await sequelize.query('ALTER TABLE frequencias ADD UNIQUE INDEX frequencias_aula_unica (aluno_id, disciplina, data_aula, numero_aula)');
    console.log('Migration: indice unico frequencias(aluno_id, disciplina, data_aula, numero_aula) criado.');
  }
}

// So a linha mais antiga de cada chamada sobrevive; as repetidas ja distorceram
// totais em bases de demonstracao.
async function deduplicarFrequencias() {
  const [repetidas] = await sequelize.query(`
    SELECT MIN(id) AS manter
    FROM frequencias
    GROUP BY aluno_id, disciplina, data_aula, numero_aula
    HAVING COUNT(*) > 1
  `);
  if (!repetidas.length) return;

  const manter = repetidas.map((linha) => Number(linha.manter));
  await sequelize.query(`DELETE FROM frequencias WHERE (aluno_id, disciplina, data_aula, numero_aula) IN (
    SELECT aluno_id, disciplina, data_aula, numero_aula FROM (
      SELECT aluno_id, disciplina, data_aula, numero_aula, MIN(id) AS manter
      FROM frequencias GROUP BY aluno_id, disciplina, data_aula, numero_aula HAVING COUNT(*) > 1
    ) AS repetidas
  ) AND id NOT IN (${manter.map(() => '?').join(', ')})`, { replacements: manter });
  console.log(`Migration: ${repetidas.length} chamada(s) duplicada(s) foram compactadas.`);
}

// Missao 002: "7ºA / 2026" nao pode existir duas vezes. Sem o indice, a tela de
// chamada oferecia duas turmas identicas e o professor lancava a chamada na errada.
async function migrarTurmaUnica() {
  if (await indiceExiste('turmas', 'turmas_identificacao_unica')) return;
  await deduplicarTurmas();
  await sequelize.query('ALTER TABLE turmas ADD UNIQUE INDEX turmas_identificacao_unica (nome, serie, ano)');
  console.log('Migration: indice unico turmas(nome, serie, ano) criado.');
}

async function deduplicarTurmas() {
  // Toda linha que nao e a mais antiga do seu grupo (nome, serie, ano) e repetida.
  // A FK de alunos.turma_id usa ON DELETE SET NULL, entao os alunos dessas turmas
  // saem como "sem turma" em vez de quebrar a migration.
  const [descartes] = await sequelize.query(`
    SELECT id FROM turmas
    WHERE id NOT IN (SELECT MIN(id) FROM turmas GROUP BY nome, serie, ano)
  `);
  if (!descartes.length) return;

  const ids = descartes.map((linha) => Number(linha.id));
  await sequelize.query(`DELETE FROM turmas WHERE id IN (${ids.map(() => '?').join(', ')})`, { replacements: ids });
  console.log(`Migration: ${ids.length} turma(s) duplicada(s) foram removidas.`);
}

// Missao 007: a trilha de auditoria e a unica prova de quem fez o que. O
// controle de acesso no banco impede que o proprio admin apague o historico.
// Cada trigger e verificado separadamente: se um ja existir, o outro ainda precisa
// ser criado (uma execucao interrompida no meio nao pode deixar a tabela editavel).
async function migrarImutabilidadeDaAuditoria() {
  if (!await gatilhoExiste('auditoria', 'auditoria_sem_update')) {
    await sequelize.query(`
      CREATE TRIGGER IF NOT EXISTS auditoria_sem_update BEFORE UPDATE ON auditoria
      FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Registros de auditoria sao imutaveis.'
    `);
    console.log('Migration: trigger de imutabilidade de UPDATE criado.');
  }
  if (!await gatilhoExiste('auditoria', 'auditoria_sem_delete')) {
    await sequelize.query(`
      CREATE TRIGGER IF NOT EXISTS auditoria_sem_delete BEFORE DELETE ON auditoria
      FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Registros de auditoria nao podem ser removidos.'
    `);
    console.log('Migration: trigger de imutabilidade de DELETE criado.');
  }
}

async function indiceExiste(tabela, nome) {
  const [linhas] = await sequelize.query(`SHOW INDEX FROM \`${tabela}\` WHERE Key_name = ?`, { replacements: [nome] });
  return linhas.length > 0;
}

// Uma chave estrangeira nao aparece no SHOW INDEX, so no catalogo do MySQL.
async function restricaoExiste(tabela, nome) {
  const [linhas] = await sequelize.query(
    `SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ?`,
    { replacements: [tabela, nome] }
  );
  return linhas.length > 0;
}

async function gatilhoExiste(tabela, nome) {
  const [linhas] = await sequelize.query(
    'SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA = DATABASE() AND EVENT_OBJECT_TABLE = ? AND TRIGGER_NAME = ?',
    { replacements: [tabela, nome] }
  );
  return linhas.length > 0;
}

async function colunaExiste(tabela, coluna) {
  const [linhas] = await sequelize.query(`SHOW COLUMNS FROM \`${tabela}\` LIKE ?`, { replacements: [coluna] });
  return linhas.length > 0;
}
