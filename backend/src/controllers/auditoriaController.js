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

const LIMITE_TENTATIVAS = 3;

// Boss challenge da Missao 007: indicadores de confianca para o painel do admin.
export async function indicadores(req, res) {
  const desde = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const eventos = await Auditoria.findAll({ where: { criado_em: { [Op.gte]: desde } }, order: [['criado_em', 'DESC']] });

  const contagem = eventos.reduce((acumulado, evento) => {
    acumulado[evento.operacao] = (acumulado[evento.operacao] || 0) + 1;
    return acumulado;
  }, {});
  const porOperacao = Object.entries(contagem)
    .map(([operacao, total]) => ({ operacao, total }))
    .sort((a, b) => b.total - a.total);

  const porUsuario = new Map();
  for (const evento of eventos) {
    const nome = evento.usuario_nome || 'desconhecido';
    if (!porUsuario.has(nome)) {
      porUsuario.set(nome, { usuario_nome: nome, perfil: evento.perfil || null, ultimo_acesso: null, total_eventos: 0, logins_recusados_24h: 0 });
    }
    const linha = porUsuario.get(nome);
    linha.total_eventos += 1;
    if (evento.operacao === 'LOGIN_RECUSADO') linha.logins_recusados_24h += 1;
    const quando = new Date(evento.criado_em);
    if (!linha.ultimo_acesso || quando > new Date(linha.ultimo_acesso)) linha.ultimo_acesso = evento.criado_em;
  }

  const usuarios = [...porUsuario.values()];
  res.json({
    janela: { inicio: desde, fim: new Date() },
    total_eventos: eventos.length,
    por_operacao: porOperacao,
    logins_recusados_24h: eventos.filter((evento) => evento.operacao === 'LOGIN_RECUSADO').length,
    usuarios,
    alertas: usuarios.filter((usuario) => usuario.logins_recusados_24h >= LIMITE_TENTATIVAS)
      .map((usuario) => ({ ...usuario, aviso: `Login recusado ${usuario.logins_recusados_24h} vezes nas ultimas 24h.` })),
  });
}
