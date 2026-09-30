import jwt from 'jsonwebtoken';
import 'dotenv/config';
import Usuario from '../models/Usuario.js';

// Missao 006: a chave que assina os tokens nunca pode ter valor padrao no codigo.
// Sem JWT_SECRET no ambiente a API nao sobe, em vez de aceitar tokens forjaveis.
const JWT_SECRET = process.env.JWT_SECRET?.trim();

if (!JWT_SECRET || JWT_SECRET.length < 16) {
  throw new Error('JWT_SECRET ausente ou muito curto. Defina uma chave com 16+ caracteres no .env antes de iniciar a API.');
}

// Revogacao por troca de senha (Missao 008): um JWT e valido ate expirar, entao a
// senha trocada precisa matar as sessoes ja abertas em outros dispositivos.
// `tv` e um contador, nao um relogio: token emitido na mesma hora da troca ainda
// precisa ser considerado antigo.
export async function autenticar(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ erro: 'Token de autenticacao obrigatorio.' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);

    const conta = await Usuario.findByPk(payload.id, { attributes: ['id', 'token_version'] });
    if (conta && Number(payload.tv || 0) < Number(conta.token_version || 0)) {
      return res.status(401).json({ erro: 'Sua sessao foi encerrada. Entre novamente.' });
    }

    req.usuario = payload;
    next();
  } catch {
    return res.status(401).json({ erro: 'Token invalido ou expirado.' });
  }
}

export function permitir(...perfis) {
  return (req, res, next) => perfis.includes(req.usuario?.perfil)
    ? next()
    : res.status(403).json({ erro: 'Voce nao tem permissao para esta operacao.' });
}

export { JWT_SECRET };