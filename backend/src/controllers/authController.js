import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Usuario from '../models/Usuario.js';
import { JWT_SECRET } from '../middlewares/auth.js';
import { eventoDoUsuario, registrarAuditoria } from '../services/auditoriaService.js';

export async function login(req, res) {
  const { email, senha } = req.body;
  if (!email || !senha) return res.status(400).json({ erro: 'E-mail e senha sao obrigatorios.' });
  const usuario = await Usuario.findOne({ where: { email } });
  const valido = usuario && await bcrypt.compare(senha, usuario.senha);
  if (!valido) {
    await registrarAuditoria(eventoDoUsuario(usuario, { usuario_nome: email, operacao: 'LOGIN_RECUSADO', recurso: 'AUTENTICACAO', detalhes: { motivo: 'credenciais_invalidas' } }));
    return res.status(401).json({ erro: 'E-mail ou senha invalidos.' });
  }
  const payload = { id: usuario.id, nome: usuario.nome, email: usuario.email, perfil: usuario.perfil, disciplinas: usuario.disciplinas || [] };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
  await registrarAuditoria(eventoDoUsuario(payload, { operacao: 'LOGIN_SUCESSO', recurso: 'AUTENTICACAO' }));
  return res.json({ token, usuario: payload });
}
