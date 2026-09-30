// Remove os alunos sinteticos deixados por execucoes de teste interrompidas.
// Os cinco alunos de demonstracao sao preservados pelos e-mails abaixo.
import 'dotenv/config';
import sequelize from '../src/config/database.js';
import Aluno from '../src/models/Aluno.js';

const demos = ['carlos@aluno.com', 'marina@aluno.com', 'bruno@aluno.com', 'daniela@aluno.com', 'enzo@aluno.com'];

await sequelize.authenticate();
const { Op } = await import('sequelize');
const synthesizing = await Aluno.findAll({ where: { email: { [Op.notIn]: demos } }, order: [['id', 'ASC']] });

console.log(`Alunos de teste encontrados: ${synthesizing.length}`);
synthesizing.forEach((aluno) => console.log(`  #${aluno.id} ${aluno.nome} — ${aluno.email}`));

if (process.argv.includes('--aplicar')) {
  for (const aluno of synthesizing) await aluno.destroy();
  console.log(`${synthesizing.length} aluno(s) de teste removido(s).`);
} else {
  console.log('Use --aplicar para remover.');
}

await sequelize.close();