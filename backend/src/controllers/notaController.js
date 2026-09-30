import Nota from '../models/Nota.js';
import Aluno from '../models/Aluno.js';
import { resumoDoBoletim } from '../services/boletimService.js';
import { eventoDoUsuario, registrarAuditoria } from '../services/auditoriaService.js';

const podeLecionar = (usuario, disciplina) => usuario.perfil === 'admin' || (usuario.disciplinas || []).includes(disciplina);
const notaValida = (valor) => valor !== '' && valor !== null && !Number.isNaN(Number(valor)) && Number(valor) >= 0 && Number(valor) <= 10;
export async function listar(req, res) { res.json(await Nota.findAll({ order: [['createdAt', 'DESC']] })); }
export async function criar(req, res) {
  const { aluno_id, disciplina, bimestre, nota } = req.body;
  if (!aluno_id || !disciplina || !bimestre || nota === undefined) return res.status(400).json({ erro: 'Aluno, disciplina, bimestre e nota sao obrigatorios.' });
  if (!notaValida(nota)) return res.status(400).json({ erro: 'A nota deve estar entre 0 e 10.' });
  if (!podeLecionar(req.usuario, disciplina)) return res.status(403).json({ erro: 'Disciplina nao autorizada.' });
  const criada = await Nota.create({ aluno_id, disciplina, bimestre, nota });
  await registrarAuditoria(eventoDoUsuario(req.usuario, { operacao: 'CRIACAO', recurso: 'NOTA', recurso_id: criada.id }));
  res.status(201).json(criada);
}
export async function editar(req, res) {
  const nota = await Nota.findByPk(req.params.id); if (!nota) return res.status(404).json({ erro: 'Nota nao encontrada.' });
  if (!podeLecionar(req.usuario, nota.disciplina)) return res.status(403).json({ erro: 'Disciplina nao autorizada.' });
  if (req.body.nota !== undefined && !notaValida(req.body.nota)) return res.status(400).json({ erro: 'A nota deve estar entre 0 e 10.' });
  await nota.update(req.body); await registrarAuditoria(eventoDoUsuario(req.usuario, { operacao: 'EDICAO', recurso: 'NOTA', recurso_id: nota.id })); res.json(nota);
}
export async function excluir(req, res) {
  const nota = await Nota.findByPk(req.params.id); if (!nota) return res.status(404).json({ erro: 'Nota nao encontrada.' });
  if (!podeLecionar(req.usuario, nota.disciplina)) return res.status(403).json({ erro: 'Disciplina nao autorizada.' });
  await nota.destroy(); await registrarAuditoria(eventoDoUsuario(req.usuario, { operacao: 'EXCLUSAO', recurso: 'NOTA', recurso_id: Number(req.params.id) })); res.status(204).end();
}
// Missao 003: mini boletim do aluno (media, maior, menor, situacao e media da turma).
export async function boletim(req, res) {
  const alunoId = Number(req.params.alunoId);
  if (!alunoId) return res.status(400).json({ erro: 'Aluno invalido.' });
  if (!await Aluno.findByPk(alunoId)) return res.status(404).json({ erro: 'Aluno nao encontrado.' });
  res.json(await resumoDoBoletim(alunoId));
}
