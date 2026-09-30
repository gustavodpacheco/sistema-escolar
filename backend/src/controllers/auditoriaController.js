import { Op } from 'sequelize';
import Auditoria from '../models/Auditoria.js';
import { periodoDoFiltro } from '../services/auditoriaService.js';

const LIMITE_MAXIMO = 200;
const PAGINA_PADRAO = 1;

// Missao 007: a trilha cresce sem limite. `?pagina=`/`?limite=` evita que o admin
// carregue a base inteira no navegador, mas o padrao (sem query) continua
// devolvendo a lista pura para nao quebrar consumidores atuais.
function paginacao(query) {
  const pagina = Math.max(1, Number.parseInt(query.pagina, 10) || PAGINA_PADRAO);
  const limite = Math.min(LIMITE_MAXIMO, Math.max(1, Number.parseInt(query.limite, 10) || LIMITE_MAXIMO));
  return { pagina, limite, offset: (pagina - 1) * limite };
}

export async function listar(req, res) {
  const { usuario, operacao, recurso } = req.query;
  const { pagina, limite, offset } = paginacao(req.query);

  const where = {};
  if (usuario) where.usuario_nome = { [Op.like]: `%${usuario}%` };
  if (operacao) where.operacao = operacao;
  if (recurso) where.recurso = recurso;
  // `inicio`/`fim` sao dias completos: o filtro precisa cobrir 00:00:00 ate
  // 23:59:59, senao o log do dia corrente aparece truncado.
  Object.assign(where, periodoDoFiltro(req.query.inicio, req.query.fim));

  const { rows, count } = await Auditoria.findAndCountAll({
    where,
    order: [['criado_em', 'DESC']],
    limit: limite,
    offset,
  });

  const paginado = Boolean(req.query.pagina || req.query.limite);
  if (!paginado) return res.json(rows);

  return res.json({ dados: rows, total: count, pagina, limite, paginas: Math.max(1, Math.ceil(count / limite)) });
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
      porUsuario.set(nome, { usuario_nome: nome, perfil: evento.perfil || null, ultimo_acesso: null, ultima_atividade: null, total_eventos: 0, logins_recusados_24h: 0 });
    }
    const linha = porUsuario.get(nome);
    linha.total_eventos += 1;
    if (evento.operacao === 'LOGIN_RECUSADO') linha.logins_recusados_24h += 1;

    const quando = new Date(evento.criado_em);
    // "ultimo_acesso" e so um login bem-sucedido. Antes pegava o evento mais
    // recente de qualquer tipo, entao editar uma nota contava como acesso.
    if (evento.operacao === 'LOGIN_SUCESSO' && (!linha.ultimo_acesso || quando > new Date(linha.ultimo_acesso))) {
      linha.ultimo_acesso = evento.criado_em;
    }
    if (!linha.ultima_atividade || quando > new Date(linha.ultima_atividade)) {
      linha.ultima_atividade = evento.criado_em;
    }
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