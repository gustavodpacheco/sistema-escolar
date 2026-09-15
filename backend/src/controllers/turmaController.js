import Turma from '../models/turmas.js';
import Aluno from '../models/Aluno.js';

async function listarTurmas(req, res) {
  try {
    const turmas = await Turma.findAll({ include: [{ model: Aluno, attributes: ['id', 'nome', 'email'] }] });

    res.status(200).json(turmas);
  } catch (erro) {
    console.error(erro);

    res.status(500).send(
      'Erro ao listar turmas: ' + erro.message
    );
  }
}

async function listarAlunosDaTurma(req, res) {
  try {
    const turma = await Turma.findByPk(req.params.id, { include: [{ model: Aluno }] });
    if (!turma) return res.status(404).json({ erro: 'Turma nao encontrada.' });
    res.json(turma);
  } catch (erro) {
    res.status(500).json({ erro: 'Erro ao consultar turma: ' + erro.message });
  }
}

async function cadastrarTurma(req, res) {
  try {
    const { nome, serie, ano } = req.body;

    if (!nome || !serie || !ano) {
      return res.status(400).send(
        'Nome, série e ano são obrigatórios.'
      );
    }

    const novaTurma = await Turma.create({
      nome,
      serie,
      ano
    });

    res.status(201).json(novaTurma);

  } catch (erro) {
    console.error(erro);

    res.status(500).send(
      'Erro ao cadastrar turma: ' + erro.message
    );
  }
}

export default {
  listarTurmas,
  cadastrarTurma,
  listarAlunosDaTurma
};
