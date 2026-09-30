import Frequencia from '../models/Frequencia.js';
import Aluno from '../models/Aluno.js';
import Turma from '../models/turmas.js';

export const LIMITE_BOA = 90;
export const LIMITE_ATENCAO = 75;

const arredondar = (valor) => Math.round(Number(valor) * 10) / 10;

// Missao 004: percentual de frequencia e classificacao por faixas.
// Missao 005: a falta e registrada por aula (numero_aula), nao por dia.
export function classificarFrequencia(percentual) {
  if (percentual >= LIMITE_BOA) return { rotulo: 'Frequência boa', nivel: 'boa' };
  if (percentual >= LIMITE_ATENCAO) return { rotulo: 'Atenção', nivel: 'atencao' };
  return { rotulo: 'Risco de reprovação', nivel: 'risco' };
}

export function resumoDeFrequencia(registros) {
  const lista = Array.isArray(registros) ? registros : [];
  const totalAulas = lista.length;
  const presencas = lista.filter((registro) => registro.presente).length;
  const faltas = totalAulas - presencas;
  const percentual = totalAulas ? arredondar((presencas / totalAulas) * 100) : 0;
  return {
    total_aulas: totalAulas,
    presencas,
    faltas,
    percentual,
    classificacao: classificarFrequencia(percentual),
  };
}

export async function frequenciaDoAluno(alunoId) {
  const registros = await Frequencia.findAll({
    where: { aluno_id: alunoId },
    order: [['data_aula', 'DESC'], ['numero_aula', 'ASC']],
  });
  return { registros, resumo: resumoDeFrequencia(registros) };
}

// Missao 004 (boss): ranking de frequencia e lista de alunos em risco (< 75%).
export async function painelDeFrequencia({ turma_id, disciplina } = {}) {
  const where = {};
  if (turma_id) where.turma_id = Number(turma_id);
  if (disciplina) where.disciplina = disciplina;

  const registros = await Frequencia.findAll({ where, order: [['data_aula', 'DESC'], ['numero_aula', 'ASC']] });
  const alunos = await Aluno.findAll({
    where: turma_id ? { turma_id: Number(turma_id) } : {},
    include: turma_id ? [] : [{ model: Turma, attributes: ['id', 'nome'] }],
  });

  const porAluno = new Map();
  for (const registro of registros) {
    if (!porAluno.has(registro.aluno_id)) porAluno.set(registro.aluno_id, []);
    porAluno.get(registro.aluno_id).push(registro);
  }

  const linhas = alunos.map((aluno) => {
    const resumo = resumoDeFrequencia(porAluno.get(aluno.id) || []);
    return {
      aluno_id: aluno.id,
      aluno_nome: aluno.nome,
      turma: aluno.turma?.nome || null,
      ...resumo,
    };
  });

  const ranking = [...linhas]
    .filter((linha) => linha.total_aulas > 0)
    .sort((a, b) => b.percentual - a.percentual || a.aluno_nome.localeCompare(b.aluno_nome));

  return {
    ranking,
    em_risco: ranking.filter((linha) => linha.classificacao.nivel === 'risco'),
    sem_registros: linhas.filter((linha) => linha.total_aulas === 0),
  };
}

// Historico agrupado por chamada (data + disciplina + quantidade de aulas).
export function agruparChamadas(registros) {
  const grouped = new Map();
  for (const registro of registros) {
    const chave = `${registro.data_aula}|${registro.disciplina}`;
    if (!grouped.has(chave)) {
      grouped.set(chave, { data_aula: registro.data_aula, disciplina: registro.disciplina, plano_aula: registro.plano_aula, registros: [] });
    }
    grouped.get(chave).registros.push(registro);
  }
  return [...grouped.values()].map((chamada) => ({
    ...chamada,
    quantidade_aulas: new Set(chamada.registros.map((registro) => registro.numero_aula)).size,
    presencas: chamada.registros.filter((registro) => registro.presente).length,
    faltas: chamada.registros.filter((registro) => !registro.presente).length,
  }));
}
