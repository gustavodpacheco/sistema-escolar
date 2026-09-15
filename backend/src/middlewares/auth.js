import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'troque-esta-chave-em-producao';

export function autenticar(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ erro: 'Token de autenticacao obrigatorio.' });
  try {
    req.usuario = jwt.verify(token, JWT_SECRET);
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
