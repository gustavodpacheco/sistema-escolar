import Auditoria from '../models/Auditoria.js';
import { Op } from 'sequelize';

// Qualquer chave que sugira credencial e removida em qualquer nivel do payload.
// Antes a limpeza era rasa: um `detalhes: { usuario: { senha } }` chegava inteiro
// na trilha, que e justamente o registro que nunca pode vazar segredo.
const CHAVES_SENSIVEIS = [
  'senha', 'senha_hash', 'senhaHash', 'password', 'pass', 'secret', 'senha_atual',
  'nova_senha', 'confirmacao', 'confirmacao_senha', 'token', 'jwt', 'authorization',
  'access_token', 'refresh_token', 'bearer', 'cpf', 'senhaAntiga', 'senhaAtual',
];

const LIMITE_DE_PROFUNDIDADE = 6;
const LIMITE_DE_CARACTERES = 500;

const chaveSensivel = (chave) => {
  const normalizada = String(chave).toLowerCase();
  return CHAVES_SENSIVEIS.some((proibida) => normalizada.includes(proibida.toLowerCase()));
};

export function sanitizarParaAuditoria(valor, profundidade = 0) {
  if (valor === null || valor === undefined) return valor ?? null;

  const tipo = typeof valor;
  if (tipo === 'string') {
    return valor.length > LIMITE_DE_CARACTERES ? `${valor.slice(0, LIMITE_DE_CARACTERES)}...` : valor;
  }
  if (tipo === 'number' || tipo === 'boolean') return valor;
  if (tipo === 'bigint') return String(valor);
  if (valor instanceof Date) return valor;
  // Buffer, Express request e afins nao tem util na trilha e serializam mal.
  if (tipo === 'function' || tipo === 'symbol') return undefined;
  if (Buffer.isBuffer(valor)) return '[buffer]';

  if (profundidade >= LIMITE_DE_PROFUNDIDADE) return '[objeto muito aninhado]';

  if (Array.isArray(valor)) {
    return valor.slice(0, 100).map((item) => sanitizarParaAuditoria(item, profundidade + 1));
  }

  if (tipo === 'object') {
    const saida = {};
    for (const [chave, conteudo] of Object.entries(valor)) {
      if (chaveSensivel(chave)) {
        saida[chave] = '[oculto]';
        continue;
      }
      const limpo = sanitizarParaAuditoria(conteudo, profundidade + 1);
      if (limpo !== undefined) saida[chave] = limpo;
    }
    return saida;
  }

  return String(valor);
}

// Auditoria nunca bloqueia a operacao principal: falhas ficam registradas no servidor.
export async function registrarAuditoria(evento) {
  try {
    await Auditoria.create(sanitizarParaAuditoria({ ...evento }));
  } catch (error) {
    console.error('Auditoria indisponivel:', error.message);
  }
}

export function eventoDoUsuario(usuario, dados) {
  return {
    usuario_id: usuario?.id || null,
    usuario_nome: usuario?.nome || dados.usuario_nome || null,
    perfil: usuario?.perfil || dados.perfil || null,
    ...dados,
  };
}

// Login recusado nao tem `req.usuario`, mas a trilha precisa dizer QUEM tentou,
// senao o log e inutil para investigar forca bruta.
export function eventoDeTentativaDeLogin(dados) {
  return {
    usuario_id: null,
    usuario_nome: dados.usuario_nome || null,
    perfil: dados.perfil || null,
    ...dados,
  };
}

// Missao 007: os filtros chegam como `YYYY-MM-DD`. Sem converter para o fuso do
// servidor, uma janela de 24h terminava 3h antes do que o admin pediu e o log de
// "hoje" aparecia vazio.
export function periodoDoFiltro(inicio, fim) {
  const dia = (valor) => (/^\d{4}-\d{2}-\d{2}$/.test(String(valor || '').trim()) ? String(valor).trim() : null);

  const filtros = {};
  const inicioLimpo = dia(inicio);
  const fimLimpo = dia(fim);

  if (inicioLimpo) filtros.criado_em = { ...(filtros.criado_em || {}), [Op.gte]: `${inicioLimpo} 00:00:00` };
  if (fimLimpo) filtros.criado_em = { ...(filtros.criado_em || {}), [Op.lte]: `${fimLimpo} 23:59:59` };

  return filtros;
}