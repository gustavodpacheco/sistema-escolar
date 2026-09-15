import { Op } from 'sequelize';
import Auditoria from '../models/Auditoria.js';
export async function listar(req, res) {
  const { usuario, operacao, recurso, inicio, fim } = req.query;
  const where = {};
  if (usuario) where.usuario_nome = { [Op.like]: `%${usuario}%` };
  if (operacao) where.operacao = operacao;
  if (recurso) where.recurso = recurso;
  if (inicio || fim) where.criado_em = { ...(inicio && { [Op.gte]: new Date(inicio) }), ...(fim && { [Op.lte]: new Date(`${fim}T23:59:59`) }) };
  res.json(await Auditoria.findAll({ where, order: [['criado_em', 'DESC']] }));
}
