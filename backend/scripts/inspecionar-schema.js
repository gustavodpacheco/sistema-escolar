import 'dotenv/config';
import { Sequelize } from 'sequelize';

const s = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  dialect: 'mysql',
  logging: false,
});

for (const tabela of ['alunos', 'turmas', 'notas', 'frequencias', 'usuarios']) {
  const [indices] = await s.query(`SHOW INDEX FROM ${tabela}`);
  const nomes = [...new Set(indices.map((linha) => linha.Key_name))];
  console.log(`${tabela}: ${nomes.join(', ')}`);
}

const [colunas] = await s.query("SHOW COLUMNS FROM usuarios LIKE 'token_version'");
console.log(`usuarios.token_version: ${colunas.length ? 'presente' : 'AUSENTE'}`);

const [fks] = await s.query(
  "SELECT CONSTRAINT_NAME, TABLE_NAME FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND CONSTRAINT_TYPE = 'FOREIGN KEY'"
);
console.log('FKs:', fks.map((linha) => `${linha.TABLE_NAME}.${linha.CONSTRAINT_NAME}`).join(', '));

const [gatilhos] = await s.query('SELECT TRIGGER_NAME, EVENT_OBJECT_TABLE FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA = DATABASE()');
console.log('Triggers:', gatilhos.map((linha) => `${linha.EVENT_OBJECT_TABLE}.${linha.TRIGGER_NAME}`).join(', '));

// As garantias que protegem os dados: se alguma faltar, a migration nao rodou.
const obrigatorios = [
  ['alunos', 'alunos_turma_id'],
  ['turmas', 'turmas_identificacao_unica'],
  ['notas', 'notas_lancamento_unico'],
  ['frequencias', 'frequencias_aula_unica'],
  ['usuarios', 'usuarios_aluno_id'],
];
const faltando = [];
for (const [tabela, indice] of obrigatorios) {
  const [achou] = await s.query(`SHOW INDEX FROM \`${tabela}\` WHERE Key_name = ?`, { replacements: [indice] });
  if (!achou.length) faltando.push(`${tabela}.${indice}`);
}
console.log(faltando.length ? `GARANTIAS FALTANDO: ${faltando.join(', ')}` : 'Garantias anti-duplicata e de vinculo: OK');

await s.close();
