import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CONTAS, derrubarApi, requisitar, SENHA_DEMO, subirApi, tokenAdmin } from './helpers.js';

before(subirApi);
after(derrubarApi);

const unico = (prefixo) => `${prefixo}.${Date.now()}.${Math.floor(Math.random() * 1e6)}@escola.com`;

async function criarTurma(token, { nome = `Turma Teste ${Date.now()}`, serie = '9º B', ano = 2026 } = {}) {
  const { body, status } = await requisitar('/turmas', { token, method: 'POST', body: { nome, serie, ano } });
  assert.equal(status, 201);
  return body;
}

async function criarAluno(token, extras = {}) {
  const { body, status } = await requisitar('/alunos', {
    token,
    method: 'POST',
    body: { nome: `Aluno ${Date.now()}`, email: unico('aluno'), serie: '9º B', ...extras },
  });
  assert.equal(status, 201);
  return body;
}

describe('Missao 001 - cadastro de alunos', () => {
  it('admin cadastra, consulta, altera e exclui', async () => {
    const admin = await tokenAdmin();
    const email = unico('ciclo');

    const { body: criado, status: statusCriacao } = await requisitar('/alunos', {
      token: admin,
      method: 'POST',
      body: { nome: 'Ana Paula Souza', email, serie: '8º A', data_nascimento: '2012-05-04', cpf: `1${Date.now()}`, telefone: '(11) 90000-0000', endereco: 'Rua das Flores, 120' },
    });
    assert.equal(statusCriacao, 201);
    assert.equal(criado.email, email);
    assert.equal(criado.nome, 'Ana Paula Souza');

    const { body: lista } = await requisitar('/alunos', { token: admin });
    assert.ok(lista.some((aluno) => aluno.id === criado.id), 'o aluno criado deve aparecer na listagem');

    const { body: alterado, status: statusAlteracao } = await requisitar(`/alunos/${criado.id}`, {
      token: admin,
      method: 'PUT',
      body: { nome: 'Ana Paula Souza Lima', telefone: '(11) 91111-1111' },
    });
    assert.equal(statusAlteracao, 200);
    assert.equal(alterado.nome, 'Ana Paula Souza Lima');
    assert.equal(alterado.telefone, '(11) 91111-1111');

    assert.equal((await requisitar(`/alunos/${criado.id}`, { token: admin, method: 'DELETE' })).status, 204);
    assert.equal((await requisitar(`/alunos/${criado.id}`, { token: admin })).status, 404);
  });

  it('recusa nome vazio e e-mail invalido', async () => {
    const admin = await tokenAdmin();
    assert.equal((await requisitar('/alunos', { token: admin, method: 'POST', body: { nome: '   ', email: unico('x'), serie: '9º B' } })).status, 400);
    assert.equal((await requisitar('/alunos', { token: admin, method: 'POST', body: { nome: 'Sem e-mail', email: 'nao-e-email', serie: '9º B' } })).status, 400);
  });

  it('e-mail repetido devolve 409 em vez de derrubar a API', async () => {
    const admin = await tokenAdmin();
    const email = unico('duplicado');
    const primeiro = await criarAluno(admin, { email });

    const { status, body } = await requisitar('/alunos', { token: admin, method: 'POST', body: { nome: 'Outro Aluno', email, serie: '9º B' } });
    assert.equal(status, 409);
    // A mensagem do Sequelize traria o SQL inteiro no corpo da resposta.
    assert.equal(/INSERT|SELECT|Sequelize/i.test(body.erro), false);

    await requisitar(`/alunos/${primeiro.id}`, { token: admin, method: 'DELETE' });
  });

  it('ignora colunas que o cliente tenta forjar', async () => {
    const admin = await tokenAdmin();
    const { body: criado } = await requisitar('/alunos', {
      token: admin,
      method: 'POST',
      body: { nome: 'Sem Fraude', email: unico('forja'), serie: '9º B', id: 999999 },
    });
    assert.notEqual(criado.id, 999999);
    await requisitar(`/alunos/${criado.id}`, { token: admin, method: 'DELETE' });
  });

  it('recusa turma inexistente com 400 legivel', async () => {
    const admin = await tokenAdmin();
    const { status, body } = await requisitar('/alunos', { token: admin, method: 'POST', body: { nome: 'Turma Fantasma', email: unico('fantasma'), serie: '9º B', turma_id: 987654 } });
    assert.equal(status, 400);
    assert.match(body.erro, /Turma nao encontrada/);
  });

  it('normaliza o e-mail para evitar contas duplicadas', async () => {
    const admin = await tokenAdmin();
    const email = unico('Caixa').toLowerCase();
    const { body: aluno } = await requisitar('/alunos', { token: admin, method: 'POST', body: { nome: 'Caixa Alta', email: `  ${email.toUpperCase()} `, serie: '9º B' } });
    assert.equal(aluno.email, email);

    const repetido = await requisitar('/alunos', { token: admin, method: 'POST', body: { nome: 'Mesma Caixa', email, serie: '9º B' } });
    assert.equal(repetido.status, 409);

    await requisitar(`/alunos/${aluno.id}`, { token: admin, method: 'DELETE' });
  });

  it('turma valida e aluno fica vinculado a ela', async () => {
    const admin = await tokenAdmin();
    const turma = await criarTurma(admin);
    const aluno = await criarAluno(admin, { turma_id: turma.id });

    const { body: roster } = await requisitar(`/turmas/${turma.id}/alunos`, { token: admin });
    assert.ok(roster.alunos.some((membro) => membro.id === aluno.id));

    // Sem turma valida a FK, limpar o vinculo volta o aluno para "sem turma".
    const { status, body } = await requisitar(`/alunos/${aluno.id}`, { token: admin, method: 'PUT', body: { turma_id: null } });
    assert.equal(status, 200);
    assert.equal(body.turma_id, null);

    await requisitar(`/alunos/${aluno.id}`, { token: admin, method: 'DELETE' });
  });
});

describe('Missao 002 - turmas', () => {
  it('admin cadastra turma e professor/aluno recebem 403', async () => {
    const admin = await tokenAdmin();
    const turma = await criarTurma(admin);
    assert.equal(turma.nome.startsWith('Turma Teste'), true);

    const professor = (await requisitar('/login', { method: 'POST', body: { email: CONTAS.professor, senha: SENHA_DEMO } })).body.token;
    assert.equal((await requisitar('/turmas', { token: professor, method: 'POST', body: { nome: 'Turma do Professor', serie: '9º B', ano: 2026 } })).status, 403);
    assert.equal((await requisitar('/turmas')).status, 401);
  });

  it('recusa campos obrigatorios vazios e ano invalido', async () => {
    const admin = await tokenAdmin();
    assert.equal((await requisitar('/turmas', { token: admin, method: 'POST', body: { nome: '', serie: '9º B', ano: 2026 } })).status, 400);
    assert.equal((await requisitar('/turmas', { token: admin, method: 'POST', body: { nome: 'Sem Ano', serie: '9º B', ano: 'dois mil' } })).status, 400);
  });

  it('turma duplicada devolve 409', async () => {
    const admin = await tokenAdmin();
    const nome = `Turma Unica ${Date.now()}`;
    await criarTurma(admin, { nome });
    const { status } = await requisitar('/turmas', { token: admin, method: 'POST', body: { nome, serie: '9º B', ano: 2026 } });
    assert.equal(status, 409);
  });

  it('ignora colunas que o cliente tenta forjar', async () => {
    const admin = await tokenAdmin();
    const { body: turma } = await requisitar('/turmas', { token: admin, method: 'POST', body: { nome: `Turma Forja ${Date.now()}`, serie: '9º B', ano: 2026, id: 999999 } });
    assert.notEqual(turma.id, 999999);
  });

  it('turma inexistente responde 404 e nao 500', async () => {
    const admin = await tokenAdmin();
    assert.equal((await requisitar('/turmas/987654/alunos', { token: admin })).status, 404);
  });
});