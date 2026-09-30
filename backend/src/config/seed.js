import bcrypt from 'bcryptjs';
import Usuario from '../models/Usuario.js';
import Aluno from '../models/Aluno.js';
import Turma from '../models/turmas.js';
import Nota from '../models/Nota.js';
import Frequencia from '../models/Frequencia.js';

// Contas de demonstracao. O seed e idempotente: cada conta e conferida pelo e-mail
// e so e criada quando ainda nao existe, assim a Missao 008 consegue delivers
// um portal do aluno pronto para apresentacao sem duplicar registros.
const contasDemo = [
  { nome: 'Administrador', email: 'admin@escola.com', perfil: 'admin', disciplinas: [] },
  { nome: 'Professora Ana', email: 'ana@escola.com', perfil: 'professor', disciplinas: ['Matemática', 'Front-End'] },
  { nome: 'Carlos Silva', email: 'carlos@escola.com', perfil: 'aluno', disciplinas: [], aluno: { nome: 'Carlos Silva', email: 'carlos@aluno.com', data_nascimento: '2008-03-12', serie: '3º DS' } },
  { nome: 'Marina Souza', email: 'marina@escola.com', perfil: 'aluno', disciplinas: [], aluno: { nome: 'Marina Souza', email: 'marina@aluno.com', data_nascimento: '2008-07-30', serie: '3º DS' } },
];

function hashDaSenhaDemo() {
  return bcrypt.hash(process.env.SEED_PASSWORD || '123456', 10);
}

export async function criarUsuariosIniciais() {
  const senha = await hashDaSenhaDemo();
  const criadas = [];

  for (const conta of contasDemo) {
    let usuario = await Usuario.findOne({ where: { email: conta.email } });
    if (!usuario) {
      usuario = await Usuario.create({ nome: conta.nome, email: conta.email, senha, perfil: conta.perfil, disciplinas: conta.disciplinas, aluno_id: null });
      criadas.push(`${conta.email} (${conta.perfil})`);
    }
    // Mantem as disciplinas de demonstracao alinhadas com as Offering cards do painel.
    if (JSON.stringify(usuario.disciplinas || []) !== JSON.stringify(conta.disciplinas)) {
      await usuario.update({ disciplinas: conta.disciplinas });
    }
    if (conta.perfil === 'aluno') await vincularContaAluno(usuario, conta.aluno);
  }

  if (criadas.length) console.log(`Usuarios iniciais criados: ${criadas.join(', ')} (senha ${process.env.SEED_PASSWORD || '123456'}).`);
  if (process.env.SEED_DADOS_DEMO !== 'false') await criarDadosAcademicosDemo();
}

// Missao 008: um aluno, uma conta. O vinculo e obrigatorio e unico.
async function vincularContaAluno(usuario, dadosAluno) {
  let aluno = usuario.aluno_id ? await Aluno.findByPk(usuario.aluno_id) : await Aluno.findOne({ where: { email: dadosAluno.email } });
  if (!aluno) aluno = await Aluno.create(dadosAluno);
  if (aluno.id !== usuario.aluno_id) await usuario.update({ aluno_id: aluno.id });
}

// Amostra academica para a demonstracao: os dois alunos do portal veem dados diferentes.
async function criarDadosAcademicosDemo() {
  const [carlos, marina] = await Promise.all([
    Aluno.findOne({ where: { email: 'carlos@aluno.com' } }),
    Aluno.findOne({ where: { email: 'marina@aluno.com' } }),
  ]);
  if (!carlos || !marina) return;

  const turma = await garantirTurma('3º DS', '3º ano', new Date().getFullYear());
  for (const aluno of [carlos, marina]) {
    if (!aluno.turma_id) await aluno.update({ turma_id: turma.id });
  }

  const notas = [
    { aluno_id: carlos.id, disciplina: 'Matemática', bimestre: '1º Bimestre', nota: 8.5 },
    { aluno_id: carlos.id, disciplina: 'Português', bimestre: '1º Bimestre', nota: 7 },
    { aluno_id: carlos.id, disciplina: 'Front-End', bimestre: '1º Bimestre', nota: 9 },
    { aluno_id: marina.id, disciplina: 'Matemática', bimestre: '1º Bimestre', nota: 5.5 },
    { aluno_id: marina.id, disciplina: 'Português', bimestre: '1º Bimestre', nota: 6.5 },
    { aluno_id: marina.id, disciplina: 'Front-End', bimestre: '1º Bimestre', nota: 4 },
  ];
  for (const nota of notas) {
    if (await Nota.findOne({ where: { aluno_id: nota.aluno_id, disciplina: nota.disciplina, bimestre: nota.bimestre } })) continue;
    await Nota.create(nota);
  }

  const aulas = [
    { data_aula: '2026-09-01', numero_aula: 1, carlos: true, marina: true },
    { data_aula: '2026-09-01', numero_aula: 2, carlos: true, marina: false },
    { data_aula: '2026-09-08', numero_aula: 1, carlos: true, marina: false },
    { data_aula: '2026-09-08', numero_aula: 2, carlos: false, marina: false },
  ];
  for (const aula of aulas) {
    for (const aluno of [carlos, marina]) {
      const registro = { aluno_id: aluno.id, turma_id: turma.id, disciplina: 'Front-End', data_aula: aula.data_aula, plano_aula: 'Front-End', numero_aula: aula.numero_aula, presente: aluno === carlos ? aula.carlos : aula.marina };
      if (await Frequencia.findOne({ where: { aluno_id: registro.aluno_id, disciplina: registro.disciplina, data_aula: registro.data_aula, numero_aula: registro.numero_aula } })) continue;
      await Frequencia.create(registro);
    }
  }
}

async function garantirTurma(nome, serie, ano) {
  const [turma] = await Turma.findOrCreate({ where: { nome }, defaults: { nome, serie, ano } });
  return turma;
}
