import Frequencia from '../models/Frequencia.js';
import { eventoDoUsuario, registrarAuditoria } from '../services/auditoriaService.js';
const autorizado = (u, disciplina) => u.perfil === 'admin' || (u.disciplinas || []).includes(disciplina);
export async function listar(req, res) { res.json(await Frequencia.findAll({ order: [['data_aula', 'DESC'], ['numero_aula', 'ASC']] })); }
export async function criar(req, res) {
  const { aluno_id, disciplina, data_aula, numero_aula, presente } = req.body;
  if (!aluno_id || !disciplina || !data_aula || numero_aula === undefined || presente === undefined) return res.status(400).json({ erro: 'Dados da frequencia incompletos.' });
  if (!autorizado(req.usuario, disciplina)) return res.status(403).json({ erro: 'Disciplina nao autorizada.' });
  const criada = await Frequencia.create(req.body); await registrarAuditoria(eventoDoUsuario(req.usuario, { operacao: 'CRIACAO', recurso: 'FREQUENCIA', recurso_id: criada.id })); res.status(201).json(criada);
}
export async function editar(req, res) { const item = await Frequencia.findByPk(req.params.id); if (!item) return res.status(404).json({ erro: 'Frequencia nao encontrada.' }); if (!autorizado(req.usuario, item.disciplina)) return res.status(403).json({ erro: 'Disciplina nao autorizada.' }); await item.update(req.body); await registrarAuditoria(eventoDoUsuario(req.usuario, { operacao: 'EDICAO', recurso: 'FREQUENCIA', recurso_id: item.id })); res.json(item); }
export async function excluir(req, res) { const item = await Frequencia.findByPk(req.params.id); if (!item) return res.status(404).json({ erro: 'Frequencia nao encontrada.' }); if (!autorizado(req.usuario, item.disciplina)) return res.status(403).json({ erro: 'Disciplina nao autorizada.' }); await item.destroy(); await registrarAuditoria(eventoDoUsuario(req.usuario, { operacao: 'EXCLUSAO', recurso: 'FREQUENCIA', recurso_id: Number(req.params.id) })); res.status(204).end(); }
