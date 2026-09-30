import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Usuario from '../models/Usuario.js';
import { JWT_SECRET } from '../middlewares/auth.js';
import { eventoDoUsuario, registrarAuditoria } from '../services/auditoriaService.js';

// Hash descartavel usado quando o e-mail nao existe. Sem comparar contra alguma
// coisa, um e-mail inexistente respondia em ~1ms e um existente em ~100ms: o
// tempo de resposta sozinho revelava quais e-mails tem conta.
const HASH_FALSO = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

export async function login(req, res) {
  const senha = String(req.body.senha || '');
  // Normalizado igual ao cadastro: " Admin@Escola.com " e "admin@escola.com"
  // precisam ser a mesma conta, senao o usuario honesto leva 401.
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!email || !senha) return res.status(400).json({ erro: 'E-mail e senha sao obrigatorios.' });
  const usuario = await Usuario.findOne({ where: { email } });
  const valido = await bcrypt.compare(senha, usuario ? usuario.senha : HASH_FALSO);
  if (!usuario || !valido) {
    await registrarAuditoria(eventoDoUsuario(usuario, { usuario_nome: email, perfil: usuario?.perfil || 'desconhecido', operacao: 'LOGIN_RECUSADO', recurso: 'AUTENTICACAO', detalhes: { motivo: usuario ? 'senha_incorreta' : 'usuario_inexistente' } }));
    // Mensagem unica para os dois casos: nao confirma se o e-mail existe.
    return res.status(401).json({ erro: 'E-mail ou senha invalidos.' });
  }
  // Missao 008: cada perfil tem sua propria entrada. A conta de aluno usa /alunos/login,
  // que devolve o aluno_id; aqui recusamos para nao gerar token sem vinculo de aluno.
  if (usuario.perfil === 'aluno') {
    await registrarAuditoria(eventoDoUsuario(usuario, { operacao: 'LOGIN_RECUSADO', recurso: 'AUTENTICACAO', detalhes: { motivo: 'conta_de_aluno_no_login_da_equipe' } }));
    return res.status(401).json({ erro: 'Use o portal do aluno para entrar com esta conta.' });
  }
  const payload = { id: usuario.id, nome: usuario.nome, email: usuario.email, perfil: usuario.perfil, disciplinas: usuario.disciplinas || [], tv: Number(usuario.token_version || 0) };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
  await registrarAuditoria(eventoDoUsuario(payload, { operacao: 'LOGIN_SUCESSO', recurso: 'AUTENTICACAO' }));
  return res.json({ token, usuario: payload });
}
