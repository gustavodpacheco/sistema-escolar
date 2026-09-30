import Aluno from '../models/Aluno.js'
import bcrypt from 'bcryptjs'
import Usuario from '../models/Usuario.js'
import sequelize from '../config/database.js'
import { eventoDoUsuario, registrarAuditoria } from '../services/auditoriaService.js'

// Missao 008: nenhuma resposta pode carregar o hash da senha da conta do aluno.
function dadosPublicosDaConta(conta) {
    if (!conta) return null;
    return {
        id: conta.id,
        nome: conta.nome,
        email: conta.email,
        perfil: conta.perfil,
        aluno_id: conta.aluno_id,
        ultimo_acesso: conta.ultimo_acesso,
    };
}

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
        const contas = await Usuario.findAll({ where: { perfil: 'aluno' } });
        res.status(200).json(alunos.map((aluno) => ({
            ...aluno.get(),
            // Missao 008: a secretaria precisa saber quem ja tem acesso ao portal.
            acesso: dadosPublicosDaConta(contas.find((conta) => conta.aluno_id === aluno.id)),
        })));
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
        // Missao 008: a conta do portal segue o aluno, senao o login ficaria orfao.
        await sequelize.transaction(async (transacao) => {
            await Usuario.destroy({ where: { perfil: 'aluno', aluno_id: aluno.id }, transaction: transacao });
            await aluno.destroy({ transaction: transacao });
        });
        res.status(204).end();
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao excluir aluno: ' + erro.message });
    }
}

// Missao 008: a secretaria cria ou redefine o acesso do aluno ao portal.
// A senha e gravada somente com hash e nunca entra na auditoria.
async function definirAcesso(req, res) {
    try {
        const { email, senha } = req.body;
        const aluno = await Aluno.findByPk(req.params.id);
        if (!aluno) return res.status(404).json({ erro: 'Aluno nao encontrado.' });
        if (!email || !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ erro: 'Informe um e-mail valido para o login do aluno.' });
        if (!senha || String(senha).length < 6) return res.status(400).json({ erro: 'A senha deve ter no minimo 6 caracteres.' });

        const emailEmUso = await Usuario.findOne({ where: { email } });
        if (emailEmUso && emailEmUso.aluno_id !== aluno.id) {
            return res.status(409).json({ erro: 'Este e-mail ja pertence a outra conta.' });
        }

        const existente = await Usuario.findOne({ where: { perfil: 'aluno', aluno_id: aluno.id } });
        const senhaHash = await bcrypt.hash(String(senha), 10);

        if (existente) {
            await existente.update({ email, senha: senhaHash, nome: aluno.nome, perfil: 'aluno' });
            await registrarAuditoria(eventoDoUsuario(req.usuario, { operacao: 'EDICAO', recurso: 'CONTA_ALUNO', recurso_id: existente.id, detalhes: { aluno_id: aluno.id } }));
            return res.status(200).json({ mensagem: 'Acesso redefinido com sucesso.', conta: dadosPublicosDaConta(existente) });
        }

        const conta = await Usuario.create({ nome: aluno.nome, email, senha: senhaHash, perfil: 'aluno', disciplinas: [], aluno_id: aluno.id });
        await registrarAuditoria(eventoDoUsuario(req.usuario, { operacao: 'CRIACAO', recurso: 'CONTA_ALUNO', recurso_id: conta.id, detalhes: { aluno_id: aluno.id } }));
        return res.status(201).json({ mensagem: 'Acesso criado com sucesso.', conta: dadosPublicosDaConta(conta) });
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao definir acesso do aluno: ' + erro.message });
    }
}

export default { cadastrarAluno, listarAlunos, atualizarAluno, excluirAluno, definirAcesso };
