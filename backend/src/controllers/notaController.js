import { Op } from 'sequelize';
import Nota from '../models/Nota.js';
import Aluno from '../models/Aluno.js';
import { resumoDoBoletim } from '../services/boletimService.js';
import { eventoDoUsuario, registrarAuditoria } from '../services/auditoriaService.js';

const podeLecionar = (usuario, disciplina) => usuario.perfil === 'admin' || (usuario.disciplinas || []).includes(disciplina);
const notaValida = (valor) => valor !== '' && valor !== null && !Number.isNaN(Number(valor)) && Number(valor) >= 0 && Number(valor) <= 10;

// Missao 005: o professor so enxerga as notas das disciplinas em que leciona.
// O admin mantem a visao completa da escola.
const filtroDeDisciplina = (usuario) => (usuario.perfil === 'admin' ? {} : { disciplina: { [Op.in]: usuario.disciplinas || [] } });

// Nunca aceitar id, aluno_id ou createdAt/updatedAt vindos do cliente.
const CAMPOS_EDITAVEIS = ['disciplina', 'bimestre', 'nota'];
const camposPermitidos = (corpo) => Object.fromEntries(CAMPOS_EDITAVEIS.filter((campo) => corpo[campo] !== undefined).map((campo) => [campo, corpo[campo]]));

// GET /notas
export async function listar(req, res) {
  res.json(await Nota.findAll({ where: filtroDeDisciplina(req.usuario), order: [['createdAt', 'DESC']] }));
}

// QA da Missao 003: um aluno tem uma nota por disciplina e bimestre. O indice unico
// `notas_lancamento_unico` garante isso no banco; aqui viramos a violacao em 409
// legivel em vez de deixar o erro do Sequelize vazar como 500.
export async function criar(req, res) {
  const { aluno_id, disciplina, bimestre, nota } = req.body;
  if (!aluno_id || !disciplina || !bimestre || nota === undefined) return res.status(400).json({ erro: 'Aluno, disciplina, bimestre e nota sao obrigatorios.' });
  if (!notaValida(nota)) return res.status(400).json({ erro: 'A nota deve estar entre 0 e 10.' });
  if (!podeLecionar(req.usuario, disciplina)) return res.status(403).json({ erro: 'Disciplina nao autorizada.' });
  if (!await Aluno.findByPk(aluno_id)) return res.status(404).json({ erro: 'Aluno nao encontrado.' });

  const jaExiste = await Nota.findOne({ where: { aluno_id, disciplina, bimestre } });
  if (jaExiste) return res.status(409).json({ erro: `Ja existe nota de ${disciplina} para este aluno no ${bimestre}. Use a edicao para corrigir o valor.` });

  const criada = await Nota.create({ aluno_id, disciplina, bimestre, nota });
  await registrarAuditoria(eventoDoUsuario(req.usuario, { operacao: 'CRIACAO', recurso: 'NOTA', recurso_id: criada.id, detalhes: { aluno_id, disciplina } }));
  res.status(201).json(criada);
}

export async function editar(req, res) {
  const nota = await Nota.findByPk(req.params.id);
  if (!nota) return res.status(404).json({ erro: 'Nota nao encontrada.' });
  if (!podeLecionar(req.usuario, nota.disciplina)) return res.status(403).json({ erro: 'Disciplina nao autorizada.' });

  const dados = camposPermitidos(req.body);
  // A permissao e conferida tambem sobre a disciplina de destino, senao o professor
  // moveria a nota para uma disciplina que ele nao leciona.
  if (dados.disciplina && !podeLecionar(req.usuario, dados.disciplina)) return res.status(403).json({ erro: 'Disciplina nao autorizada.' });
  if (dados.nota !== undefined && !notaValida(dados.nota)) return res.status(400).json({ erro: 'A nota deve estar entre 0 e 10.' });
  if (dados.bimestre !== undefined && !dados.bimestre) return res.status(400).json({ erro: 'O bimestre e obrigatorio.' });

  await nota.update(dados);
  await registrarAuditoria(eventoDoUsuario(req.usuario, { operacao: 'EDICAO', recurso: 'NOTA', recurso_id: nota.id, detalhes: { aluno_id: nota.aluno_id, disciplina: nota.disciplina } }));
  res.json(nota);
}

export async function excluir(req, res) {
  const nota = await Nota.findByPk(req.params.id);
  if (!nota) return res.status(404).json({ erro: 'Nota nao encontrada.' });
  if (!podeLecionar(req.usuario, nota.disciplina)) return res.status(403).json({ erro: 'Disciplina nao autorizada.' });
  await registrarAuditoria(eventoDoUsuario(req.usuario, { operacao: 'EXCLUSAO', recurso: 'NOTA', recurso_id: Number(req.params.id), detalhes: { aluno_id: nota.aluno_id, disciplina: nota.disciplina } }));
  await nota.destroy();
  res.status(204).end();
}

// Missao 003: mini boletim do aluno (media, maior, menor, situacao e media da turma).
export async function boletim(req, res) {
  const alunoId = Number(req.params.alunoId);
  if (!alunoId) return res.status(400).json({ erro: 'Aluno invalido.' });
  if (!await Aluno.findByPk(alunoId)) return res.status(404).json({ erro: 'Aluno nao encontrado.' });

  const disciplina = req.query.disciplina;
  if (disciplina && !podeLecionar(req.usuario, disciplina)) return res.status(403).json({ erro: 'Disciplina nao autorizada.' });
  res.json(await resumoDoBoletim(alunoId, { disciplina }));
}
