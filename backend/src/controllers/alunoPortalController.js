import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Usuario from '../models/Usuario.js';
import Aluno from '../models/Aluno.js';
import Turma from '../models/turmas.js';
import { JWT_SECRET } from '../middlewares/auth.js';
import { eventoDoUsuario, registrarAuditoria } from '../services/auditoriaService.js';
import { resumoDoBoletim } from '../services/boletimService.js';
import { agruparChamadas, frequenciaDoAluno } from '../services/frequenciaService.js';

// Missao 008: a identidade do aluno vem SEMPRE do token (aluno_id).
// Nenhum id enviado pelo cliente (query, body ou parametro) participa das consultas.
async function alunoDoToken(req, res) {
  const alunoId = req.usuario?.aluno_id;
  if (!alunoId) {
    res.status(403).json({ erro: 'Token sem vinculo de aluno.' });
    return null;
  }
  const aluno = await Aluno.findByPk(alunoId);
  if (!aluno) {
    res.status(404).json({ erro: 'Aluno nao encontrado para este acesso.' });
    return null;
  }
  return aluno;
}

async function contaDoAluno(alunoId) {
  return Usuario.findOne({ where: { perfil: 'aluno', aluno_id: alunoId } });
}

export async function login(req, res) {
  const { email, usuario, senha } = req.body;
  const identificacao = String(email || usuario || '').trim().toLowerCase();
  if (!identificacao || !senha) {
    return res.status(400).json({ erro: 'Identificacao e senha sao obrigatorios.' });
  }

  const conta = await localizarConta(identificacao);
  const valida = conta && conta.aluno_id && await bcrypt.compare(senha, conta.senha);

  if (!valida) {
    await registrarAuditoria(
      eventoDoUsuario(conta, { usuario_nome: identificacao, perfil: conta?.perfil || 'aluno', operacao: 'LOGIN_RECUSADO', recurso: 'PORTAL_ALUNO', detalhes: { motivo: 'credenciais_invalidas' } })
    );
    return res.status(401).json({ erro: 'Aluno ou senha invalidos.' });
  }

  const aluno = await Aluno.findByPk(conta.aluno_id);
  if (!aluno) {
    await registrarAuditoria(
      eventoDoUsuario(conta, { operacao: 'LOGIN_RECUSADO', recurso: 'PORTAL_ALUNO', detalhes: { motivo: 'aluno_inexistente' } })
    );
    return res.status(401).json({ erro: 'Aluno ou senha invalidos.' });
  }

  const payload = { id: conta.id, nome: aluno.nome, email: conta.email, perfil: 'aluno', aluno_id: aluno.id, disciplinas: [] };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
  await registrarAuditoria(eventoDoUsuario({ ...payload, id: conta.id }, { operacao: 'LOGIN_SUCESSO', recurso: 'PORTAL_ALUNO' }));
  return res.json({ token, usuario: payload });
}

// Aceita o e-mail da conta do portal ou o e-mail cadastrado na ficha do aluno.
async function localizarConta(identificacao) {
  const pelaConta = await Usuario.findOne({ where: { perfil: 'aluno', email: identificacao } });
  if (pelaConta) return pelaConta;
  const aluno = await Aluno.findOne({ where: { email: identificacao } });
  return aluno ? contaDoAluno(aluno.id) : null;
}

export async function perfil(req, res) {
  const aluno = await alunoDoToken(req, res);
  if (!aluno) return;
  const [turma, conta] = await Promise.all([
    aluno.turma_id ? Turma.findByPk(aluno.turma_id) : null,
    Usuario.findByPk(req.usuario.id),
  ]);
  return res.json({
    id: aluno.id,
    nome: aluno.nome,
    email: aluno.email,
    serie: aluno.serie,
    data_nascimento: aluno.data_nascimento,
    turma: turma ? { id: turma.id, nome: turma.nome, serie: turma.serie, ano: turma.ano } : null,
    login: conta ? conta.email : null,
  });
}

export async function notas(req, res) {
  const aluno = await alunoDoToken(req, res);
  if (!aluno) return;
  const boletim = await resumoDoBoletim(aluno.id);
  return res.json({ aluno: { id: aluno.id, nome: aluno.nome }, ...boletim });
}

export async function frequencia(req, res) {
  const aluno = await alunoDoToken(req, res);
  if (!aluno) return;
  const { registros, resumo } = await frequenciaDoAluno(aluno.id);
  return res.json({ aluno: { id: aluno.id, nome: aluno.nome }, registros, chamadas: agruparChamadas(registros), resumo });
}

export async function resumo(req, res) {
  const aluno = await alunoDoToken(req, res);
  if (!aluno) return;
  const { resumo: totais } = await frequenciaDoAluno(aluno.id);
  return res.json({ aluno_id: aluno.id, ...totais });
}

// Boss challenge da Missao 008: troca de senha exigindo a senha atual.
// A auditoria recebe somente o motivo da operacao, nunca valores de senha.
export async function alterarSenha(req, res) {
  const { senha_atual, nova_senha, confirmacao } = req.body;
  if (!senha_atual || !nova_senha || !confirmacao) {
    return res.status(400).json({ erro: 'Senha atual, nova senha e confirmacao sao obrigatorias.' });
  }
  if (String(nova_senha).length < 6) {
    return res.status(400).json({ erro: 'A nova senha deve ter no minimo 6 caracteres.' });
  }
  if (nova_senha !== confirmacao) {
    return res.status(400).json({ erro: 'A confirmacao nao confere com a nova senha.' });
  }

  const conta = await Usuario.findByPk(req.usuario.id);
  if (!conta || conta.perfil !== 'aluno') {
    return res.status(403).json({ erro: 'Conta de aluno nao encontrada.' });
  }
  if (!await bcrypt.compare(senha_atual, conta.senha)) {
    await registrarAuditoria(
      eventoDoUsuario(req.usuario, { operacao: 'LOGIN_RECUSADO', recurso: 'SENHA_ALUNO', detalhes: { motivo: 'senha_atual_incorreta' } })
    );
    return res.status(401).json({ erro: 'Senha atual incorreta.' });
  }

  await conta.update({ senha: await bcrypt.hash(String(nova_senha), 10) });
  await registrarAuditoria(
    eventoDoUsuario(req.usuario, { operacao: 'EDICAO', recurso: 'SENHA_ALUNO', recurso_id: conta.id, detalhes: { motivo: 'troca_de_senha_pelo_aluno' } })
  );
  return res.json({ mensagem: 'Senha alterada com sucesso.' });
}

export { alunoDoToken, contaDoAluno };
