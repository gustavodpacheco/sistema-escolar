import Turma from '../models/turmas.js';
import Aluno from '../models/Aluno.js';
import { registrarAuditoria, eventoDoUsuario } from '../services/auditoriaService.js';

// O roster de uma turma carrega so o necessario para a chamada: nome e e-mail do aluno.
// CPF, telefone e endereco sao PII da secretaria e ficam fora do roster (Missao 008).
const ATRIBUTOS_DO_ROSTER = ['id', 'nome', 'email', 'turma_id'];

// Missao 002: apenas nome, serie e ano sao gravados. Sem whitelist, o cliente
// poderia tentar setar `id` e colunas que nao fazem parte do cadastro.
const CAMPOS_DA_TURMA = ['nome', 'serie', 'ano'];

function dadosDaTurma(dados) {
  const turma = Object.fromEntries(
    CAMPOS_DA_TURMA.filter((campo) => dados[campo] !== undefined).map((campo) => [campo, dados[campo]])
  );
  if (turma.nome !== undefined) turma.nome = String(turma.nome).trim();
  if (turma.serie !== undefined) turma.serie = String(turma.serie).trim();
  // `ano` e o filtro do relatorio anual: normalizar aqui evita "2026 " != 2026.
  if (turma.ano !== undefined && turma.ano !== '') turma.ano = Number(turma.ano);
  return turma;
}

async function listarTurmas(req, res) {
  try {
    const turmas = await Turma.findAll({ include: [{ model: Aluno, attributes: ['id', 'nome', 'email'] }] });

    res.status(200).json(turmas);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro ao listar turmas.' });
  }
}

async function listarAlunosDaTurma(req, res) {
  try {
    const turma = await Turma.findByPk(req.params.id, { include: [{ model: Aluno, attributes: ATRIBUTOS_DO_ROSTER }] });
    if (!turma) return res.status(404).json({ erro: 'Turma nao encontrada.' });
    res.json(turma);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro ao consultar turma.' });
  }
}

async function cadastrarTurma(req, res) {
  const dados = dadosDaTurma(req.body);

  if (!dados.nome || !dados.serie || !dados.ano) {
    return res.status(400).json({ erro: 'Nome, serie e ano sao obrigatorios.' });
  }
  if (!Number.isInteger(dados.ano) || dados.ano < 1900 || dados.ano > 2200) {
    return res.status(400).json({ erro: 'Informe um ano valido.' });
  }

  try {
    const novaTurma = await Turma.create(dados);
    await registrarAuditoria(eventoDoUsuario(req.usuario, { operacao: 'CRIACAO', recurso: 'TURMA', recurso_id: novaTurma.id, detalhes: { nome: novaTurma.nome, serie: novaTurma.serie, ano: novaTurma.ano } }));

    res.status(201).json(novaTurma);
  } catch (erro) {
    if (erro.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ erro: 'Ja existe uma turma com este nome, serie e ano.' });
    }
    if (erro.name === 'SequelizeValidationError') {
      return res.status(400).json({ erro: erro.errors?.[0]?.message || 'Dados invalidos.' });
    }
    console.error(erro);
    res.status(500).json({ erro: 'Erro ao cadastrar turma.' });
  }
}

export default {
  listarTurmas,
  cadastrarTurma,
  listarAlunosDaTurma
};