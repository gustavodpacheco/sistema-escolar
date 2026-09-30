import Aluno from '../models/Aluno.js'
import bcrypt from 'bcryptjs'
import Usuario from '../models/Usuario.js'
import Turma from '../models/turmas.js'
import sequelize from '../config/database.js'
import { eventoDoUsuario, registrarAuditoria } from '../services/auditoriaService.js'

// Missao 006/008: a lista completa (CPF, telefone, endereco e o acesso do portal) e da secretaria.
// O professor precisa apenas do roster para a chamada e o boletim, entao recebe o recorte basico.
const ATRIBUTOS_DO_PROFESSOR = ['id', 'nome', 'email', 'data_nascimento', 'serie', 'turma_id'];

// Nunca aceitar id, createdAt, updatedAt ou qualquer outra coluna do corpo da
// requisicao: o cliente controla exatamente o que esta lista permitir.
const CAMPOS_DO_ALUNO = ['nome', 'email', 'data_nascimento', 'serie', 'cpf', 'telefone', 'endereco', 'turma_id'];

function dadosDoAluno(dados) {
    const aluno = Object.fromEntries(
        CAMPOS_DO_ALUNO.filter((campo) => dados[campo] !== undefined).map((campo) => [campo, dados[campo]])
    );
    // CPF, telefone, endereco, nascimento e serie sao opcionais. Banco nao deve
    // tratar string vazia como CPF duplicado.
    ['cpf', 'telefone', 'endereco', 'data_nascimento'].forEach((campo) => {
        if (aluno[campo] === '') aluno[campo] = null;
    });
    if (aluno.turma_id === '') aluno.turma_id = null;
    if (aluno.turma_id !== undefined && aluno.turma_id !== null) aluno.turma_id = Number(aluno.turma_id);
    // E-mail e a chave de acesso ao portal: gravar sempre no mesmo formato evita
    // duas contas para a mesma pessoa ("Ana@Escola.com" x "ana@escola.com").
    if (aluno.email !== undefined) aluno.email = String(aluno.email).trim().toLowerCase();
    if (aluno.nome !== undefined) aluno.nome = String(aluno.nome).trim();
    return aluno;
}

// O vinculo com a turma precisa existir de verdade: a FK do banco sozinha devolveria
// um 500 dificil de ler quando o id estivesse errado.
async function turmaValida(turma_id) {
    if (turma_id === null || turma_id === undefined) return { ok: true };
    if (!Number.isInteger(Number(turma_id))) return { erro: 'Turma invalida.' };
    if (!await Turma.findByPk(Number(turma_id))) return { erro: 'Turma nao encontrada.' };
    return { ok: true };
}

const emailValido = (email) => typeof email === 'string' && /^\S+@\S+\.\S+$/.test(email.trim());

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

async function listarAlunos(req, res) {
    try {
        const ehAdmin = req.usuario?.perfil === 'admin';
        const atributos = ehAdmin ? undefined : { attributes: ATRIBUTOS_DO_PROFESSOR };
        const alunos = await Aluno.findAll(atributos);
        const contas = ehAdmin
            ? await Usuario.findAll({ where: { perfil: 'aluno' } })
            : [];

        res.status(200).json(alunos.map((aluno) => {
            const base = ehAdmin
                ? aluno.get()
                : Object.fromEntries(ATRIBUTOS_DO_PROFESSOR.map((campo) => [campo, aluno.get(campo)]));

        return {
            ...base,
            // Missao 008: a secretaria precisa saber quem ja tem acesso ao portal.
            acesso: dadosPublicosDaConta(contas.find((conta) => conta.aluno_id === aluno.id)),
        };
        }));
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao listar alunos.' });
    }
}

async function cadastrarAluno(req, res) {
    const dados = dadosDoAluno(req.body);
    if (!dados.nome || !dados.nome.trim()) return res.status(400).json({ erro: 'Informe o nome do aluno.' });
    if (!emailValido(dados.email)) return res.status(400).json({ erro: 'Informe um e-mail valido.' });

    const turma = await turmaValida(dados.turma_id);
    if (turma.erro) return res.status(400).json({ erro: turma.erro });

    try {
        const novoAluno = await Aluno.create(dados);
        res.status(201).json(novoAluno);
    } catch (erro) {
        // UniqueConstraintError (e-mail ou CPF repetido) e uma falha de regra de negocio,
        // nao um erro interno: a mensagem do Sequelize vaza o SQL.
        if (erro.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ erro: 'Ja existe um aluno com este e-mail ou CPF.' });
        }
        if (erro.name === 'SequelizeValidationError') {
            return res.status(400).json({ erro: erro.errors?.[0]?.message || 'Dados invalidos.' });
        }
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao salvar o aluno.' });
    }
}

async function atualizarAluno(req, res) {
    const dados = dadosDoAluno(req.body);
    if (dados.email !== undefined && !emailValido(dados.email)) return res.status(400).json({ erro: 'Informe um e-mail valido.' });
    if (dados.nome !== undefined && !dados.nome.trim()) return res.status(400).json({ erro: 'Informe o nome do aluno.' });

    const turma = await turmaValida(dados.turma_id);
    if (turma.erro) return res.status(400).json({ erro: turma.erro });

    try {
        const aluno = await Aluno.findByPk(req.params.id);
        if (!aluno) return res.status(404).json({ erro: 'Aluno nao encontrado.' });
        await aluno.update(dados);
        res.json(aluno);
    } catch (erro) {
        if (erro.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ erro: 'Ja existe um aluno com este e-mail ou CPF.' });
        }
        if (erro.name === 'SequelizeValidationError') {
            return res.status(400).json({ erro: erro.errors?.[0]?.message || 'Dados invalidos.' });
        }
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao atualizar aluno.' });
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
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao excluir aluno.' });
    }
}

// Missao 008: a secretaria cria ou redefine o acesso do aluno ao portal.
// A senha e gravada somente com hash e nunca entra na auditoria.
async function definirAcesso(req, res) {
    try {
        const { senha } = req.body;
        // Normalizado igual ao login: evita que "Ana@Escola.com " crie uma conta
        // separada da conta "ana@escola.com".
        const email = String(req.body.email || '').trim().toLowerCase();
        const aluno = await Aluno.findByPk(req.params.id);
        if (!aluno) return res.status(404).json({ erro: 'Aluno nao encontrado.' });
        if (!emailValido(email)) return res.status(400).json({ erro: 'Informe um e-mail valido para o login do aluno.' });
        if (!senha || String(senha).length < 6) return res.status(400).json({ erro: 'A senha deve ter no minimo 6 caracteres.' });

        const emailEmUso = await Usuario.findOne({ where: { email } });
        if (emailEmUso && emailEmUso.aluno_id !== aluno.id) {
            return res.status(409).json({ erro: 'Este e-mail ja pertence a outra conta.' });
        }

        const existente = await Usuario.findOne({ where: { perfil: 'aluno', aluno_id: aluno.id } });
        const senhaHash = await bcrypt.hash(String(senha), 10);

        if (existente) {
            // Redefinir a senha tambem revoga as sessoes abertas com a senha antiga.
            await existente.update({ email, senha: senhaHash, nome: aluno.nome, perfil: 'aluno', token_version: Number(existente.token_version || 0) + 1 });
            await registrarAuditoria(eventoDoUsuario(req.usuario, { operacao: 'EDICAO', recurso: 'CONTA_ALUNO', recurso_id: existente.id, detalhes: { aluno_id: aluno.id, motivo: 'acesso redefinido' } }));
            return res.status(200).json({ mensagem: 'Acesso redefinido com sucesso.', conta: dadosPublicosDaConta(existente) });
        }

        const conta = await Usuario.create({ nome: aluno.nome, email, senha: senhaHash, perfil: 'aluno', disciplinas: [], aluno_id: aluno.id });
        await registrarAuditoria(eventoDoUsuario(req.usuario, { operacao: 'CRIACAO', recurso: 'CONTA_ALUNO', recurso_id: conta.id, detalhes: { aluno_id: aluno.id } }));
        return res.status(201).json({ mensagem: 'Acesso criado com sucesso.', conta: dadosPublicosDaConta(conta) });
    } catch (erro) {
        if (erro.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ erro: 'Este e-mail ja pertence a outra conta.' });
        }
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao definir acesso do aluno.' });
    }
}

export default { cadastrarAluno, listarAlunos, atualizarAluno, excluirAluno, definirAcesso };
