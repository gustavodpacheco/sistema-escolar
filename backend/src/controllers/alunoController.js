import Aluno from '../models/Aluno.js'

function dadosDoAluno(dados) {
    const aluno = { ...dados };
    // CPF, telefone e endereco sao opcionais. Banco nao deve tratar vazio como CPF duplicado.
    ['cpf', 'telefone', 'endereco', 'data_nascimento', 'turma_id'].forEach((campo) => {
        if (aluno[campo] === '') aluno[campo] = null;
    });
    return aluno;
}

async function listarAlunos(req, res) {
    try {
        const alunos = await Aluno.findAll();
        res.status(200).json(alunos);
    } catch (erro) {
        res.status(500).send("Erro ao listar alunos: " + erro.message);
    }
}


async function cadastrarAluno(req, res) {
    try {
        const novoAluno = await Aluno.create(dadosDoAluno(req.body));
        res.status(201).json(novoAluno);
        console.log("Aluno salvo no banco:", novoAluno.nome);
    } catch (erro) {
        res.status(400).json({ erro: "Erro ao salvar: " + erro.message });
    }
}

async function atualizarAluno(req, res) {
    try {
        const aluno = await Aluno.findByPk(req.params.id);
        if (!aluno) return res.status(404).json({ erro: 'Aluno nao encontrado.' });
        await aluno.update(dadosDoAluno(req.body));
        res.json(aluno);
    } catch (erro) {
        res.status(400).json({ erro: 'Erro ao atualizar aluno: ' + erro.message });
    }
}

async function excluirAluno(req, res) {
    try {
        const aluno = await Aluno.findByPk(req.params.id);
        if (!aluno) return res.status(404).json({ erro: 'Aluno nao encontrado.' });
        await aluno.destroy();
        res.status(204).end();
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao excluir aluno: ' + erro.message });
    }
}

export default { cadastrarAluno, listarAlunos, atualizarAluno, excluirAluno };
