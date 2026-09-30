import Nota from '../models/Nota.js';
import Aluno from '../models/Aluno.js';

export const MEDIA_APROVACAO = 7;
export const MEDIA_RECUPERACAO = 5;

const arredondar = (valor) => Math.round(Number(valor) * 100) / 100;

// Missao 003: media, maior, menor e situacao do aluno, alem da media da turma para
// comparacao. Reutilizado pelo boletim da secretaria e pelo portal do aluno.
export function situacaoDaMedia(media) {
  if (media >= MEDIA_APROVACAO) return { rotulo: 'Aprovado', nivel: 'aprovado' };
  if (media >= MEDIA_RECUPERACAO) return { rotulo: 'Recuperação', nivel: 'recuperacao' };
  return { rotulo: 'Reprovado', nivel: 'reprovado' };
}

export function situacaoDaNota(nota) {
  return situacaoDaMedia(Number(nota));
}

export async function resumoDoBoletim(alunoId) {
  const notas = await Nota.findAll({
    where: { aluno_id: alunoId },
    order: [['bimestre', 'ASC'], ['disciplina', 'ASC']],
  });

  const registros = notas.map((nota) => ({ ...nota.get(), situacao: situacaoDaNota(nota.nota) }));
  const valores = registros.map((nota) => Number(nota.nota));
  const media = mediaDe(valores);
  const mediaTurma = await mediaDaTurmaDoAluno(alunoId);

  return {
    aluno_id: Number(alunoId),
    notas: registros,
    media,
    maior_nota: valores.length ? Math.max(...valores) : null,
    menor_nota: valores.length ? Math.min(...valores) : null,
    situacao: situacaoDaMedia(media),
    media_turma: mediaTurma,
    por_disciplina: mediasPorDisciplina(registros),
  };
}

function mediaDe(valores) {
  if (!valores.length) return 0;
  return arredondar(valores.reduce((soma, valor) => soma + valor, 0) / valores.length);
}

function mediasPorDisciplina(registros) {
  const agrupado = registros.reduce((acumulado, nota) => {
    (acumulado[nota.disciplina] ||= []).push(Number(nota.nota));
    return acumulado;
  }, {});
  return Object.entries(agrupado).map(([disciplina, valores]) => ({
    disciplina,
    media: mediaDe(valores),
    situacao: situacaoDaMedia(mediaDe(valores)),
  }));
}

async function mediaDaTurmaDoAluno(alunoId) {
  const aluno = await Aluno.findByPk(alunoId);
  if (!aluno || !aluno.turma_id) return 0;
  const pares = await Aluno.findAll({ where: { turma_id: aluno.turma_id }, attributes: ['id'] });
  if (!pares.length) return 0;
  const notas = await Nota.findAll({ where: { aluno_id: pares.map((par) => par.id) }, attributes: ['nota'] });
  return mediaDe(notas.map((nota) => Number(nota.nota)));
}
