import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CONTAS, derrubarApi, requisitar, SENHA_DEMO, subirApi, tokenAdmin, tokenAluno, tokenDaOutraAluna, tokenProfessor } from './helpers.js';

before(subirApi);
after(derrubarApi);

describe('Missao 008 - login do aluno', () => {
  it('login valido devolve token com perfil aluno e aluno_id', async () => {
    const { status, body } = await requisitar('/alunos/login', { method: 'POST', body: { email: CONTAS.aluno, senha: SENHA_DEMO } });
    assert.equal(status, 200);
    assert.ok(body.token);
    assert.equal(body.usuario.perfil, 'aluno');
    assert.equal(typeof body.usuario.aluno_id, 'number');
  });

  it('senha incorreta retorna 401', async () => {
    const { status } = await requisitar('/alunos/login', { method: 'POST', body: { email: CONTAS.aluno, senha: 'senha-errada' } });
    assert.equal(status, 401);
  });

  it('aluno inexistente retorna 401', async () => {
    const { status } = await requisitar('/alunos/login', { method: 'POST', body: { email: 'ninguem@escola.com', senha: SENHA_DEMO } });
    assert.equal(status, 401);
  });

  it('campos vazios retornam 400', async () => {
    const { status } = await requisitar('/alunos/login', { method: 'POST', body: { email: '', senha: '' } });
    assert.equal(status, 400);
  });
});

describe('Missao 008 - escopo do portal', () => {
  it('rota do aluno sem token retorna 401', async () => {
    assert.equal((await requisitar('/aluno/notas')).status, 401);
  });

  it('admin e professor recebem 403 no portal do aluno', async () => {
    assert.equal((await requisitar('/aluno/notas', { token: await tokenAdmin() })).status, 403);
    assert.equal((await requisitar('/aluno/notas', { token: await tokenProfessor() })).status, 403);
  });

  it('perfil traz nome e turma do aluno autenticado', async () => {
    const token = await tokenAluno();
    const { status, body } = await requisitar('/aluno/perfil', { token });
    assert.equal(status, 200);
    assert.equal(body.nome, 'Carlos Silva');
    assert.ok(body.turma?.nome);
  });

  it('notas retornam somente as notas do aluno do token', async () => {
    const token = await tokenAluno();
    const { body: meu } = await requisitar('/aluno/notas', { token });
    const { body: outro } = await requisitar('/aluno/notas', { token: await tokenDaOutraAluna() });
    assert.ok(meu.notas.length > 0);
    assert.ok(meu.notas.every((nota) => nota.aluno_id === meu.aluno.id));
    assert.ok(outro.aluno.id !== meu.aluno.id);
    assert.ok(!meu.notas.some((nota) => nota.aluno_id === outro.aluno.id));
  });

  it('aluno_id enviado pelo cliente nao altera o escopo do token', async () => {
    const token = await tokenAluno();
    const { body: meu } = await requisitar('/aluno/notas', { token });
    const { body: forjado } = await requisitar(`/aluno/notas?aluno_id=${meu.aluno.id + 1}`, { token });
    assert.deepEqual(forjado.notas.map((n) => n.id), meu.notas.map((n) => n.id));
  });

  it('frequencia e resumo batem com os registros do proprio aluno', async () => {
    const token = await tokenAluno();
    const { body: lista } = await requisitar('/aluno/frequencia', { token });
    const { body: resumo } = await requisitar('/aluno/frequencia/resumo', { token });
    assert.equal(resumo.total_aulas, lista.registros.length);
    assert.equal(resumo.presencas + resumo.faltas, resumo.total_aulas);
    assert.equal(lista.registros.every((registro) => registro.aluno_id === lista.aluno.id), true);
    assert.ok(resumo.classificacao.rotulo);
  });

  it('aluno nao cadastra, edita ou exclui notas e frequencias', async () => {
    const token = await tokenAluno();
    assert.equal((await requisitar('/notas', { token, method: 'POST', body: { aluno_id: 1, disciplina: 'Matemática', bimestre: '1º Bimestre', nota: 7 } })).status, 403);
    assert.equal((await requisitar('/notas/1', { token, method: 'PUT', body: { nota: 9 } })).status, 403);
    assert.equal((await requisitar('/notas/1', { token, method: 'DELETE' })).status, 403);
    assert.equal((await requisitar('/frequencias', { token, method: 'POST', body: { aluno_id: 1, disciplina: 'Matemática', data_aula: '2026-09-15', numero_aula: 1, presente: true } })).status, 403);
    assert.equal((await requisitar('/frequencias/1', { token, method: 'DELETE' })).status, 403);
  });
});

describe('Missao 008 - alteracao de senha pelo aluno (boss challenge)', () => {
  it('senha atual incorreta retorna 401', async () => {
    const token = await tokenAluno();
    const { status } = await requisitar('/aluno/senha', { token, method: 'PUT', body: { senha_atual: 'errada', nova_senha: 'nova-senha-123', confirmacao: 'nova-senha-123' } });
    assert.equal(status, 401);
  });

  it('confirmacao divergente retorna 400', async () => {
    const token = await tokenAluno();
    const { status } = await requisitar('/aluno/senha', { token, method: 'PUT', body: { senha_atual: SENHA_DEMO, nova_senha: 'nova-senha-123', confirmacao: 'outra-coisa' } });
    assert.equal(status, 400);
  });

  it('senha nova curta retorna 400', async () => {
    const token = await tokenAluno();
    const { status } = await requisitar('/aluno/senha', { token, method: 'PUT', body: { senha_atual: SENHA_DEMO, nova_senha: '123', confirmacao: '123' } });
    assert.equal(status, 400);
  });

  it('aluno troca a senha, entra com a nova e restaura a senha de demonstracao', async () => {
    const token = await tokenAluno();
    const nova = 'senha-temporaria-1';
    assert.equal((await requisitar('/aluno/senha', { token, method: 'PUT', body: { senha_atual: SENHA_DEMO, nova_senha: nova, confirmacao: nova } })).status, 200);
    assert.equal((await requisitar('/alunos/login', { method: 'POST', body: { email: CONTAS.aluno, senha: nova } })).status, 200);
    assert.equal((await requisitar('/alunos/login', { method: 'POST', body: { email: CONTAS.aluno, senha: SENHA_DEMO } })).status, 401);
    // A sessao antiga foi emitida com a senha anterior: entra de novo com a nova senha.
    const tokenNovo = await tokenAluno(nova);
    assert.equal((await requisitar('/aluno/senha', { token: tokenNovo, method: 'PUT', body: { senha_atual: nova, nova_senha: SENHA_DEMO, confirmacao: SENHA_DEMO } })).status, 200);
    assert.equal((await requisitar('/alunos/login', { method: 'POST', body: { email: CONTAS.aluno, senha: SENHA_DEMO } })).status, 200);
  });
});

describe('Missao 008 - a secretaria mantem os fluxos anteriores', () => {
  it('admin cadastra aluno e define o acesso ao portal', async () => {
    const admin = await tokenAdmin();
    const { body: aluno, status: statusAluno } = await requisitar('/alunos', { token: admin, method: 'POST', body: { nome: 'Aluno de Teste', email: 'aluno.teste@escola.com', serie: '3º DS' } });
    assert.equal(statusAluno, 201);

    const login = `teste.${Date.now()}@escola.com`;
    const { status, body: acesso } = await requisitar(`/alunos/${aluno.id}/acesso`, { token: admin, method: 'POST', body: { email: login, senha: SENHA_DEMO } });
    assert.equal(status, 201);
    // A resposta da secretaria nunca pode carregar o hash da senha.
    assert.equal('senha' in acesso.conta, false);
    assert.equal(JSON.stringify(acesso).includes(SENHA_DEMO), false);
    assert.equal(acesso.conta.email, login);
    assert.equal(acesso.conta.aluno_id, aluno.id);
    assert.equal((await requisitar('/alunos/login', { method: 'POST', body: { email: login, senha: SENHA_DEMO } })).status, 200);

    // A listagem de alunos mostra o acesso sem expor segredos.
    const listagem = await requisitar('/alunos', { token: admin });
    const naListagem = listagem.body.find((item) => item.id === aluno.id);
    assert.equal(naListagem.acesso.email, login);
    assert.equal('senha' in naListagem.acesso, false);

    // Excluir o aluno leva junto a conta do portal (login nao fica orfao).
    assert.equal((await requisitar(`/alunos/${aluno.id}`, { token: admin, method: 'DELETE' })).status, 204);
    assert.equal((await requisitar('/alunos/login', { method: 'POST', body: { email: login, senha: SENHA_DEMO } })).status, 401);
  });

  it('admin e professor continuam autenticando e usando os fluxos atuais', async () => {
    const admin = await tokenAdmin();
    const professor = await tokenProfessor();
    assert.equal((await requisitar('/alunos', { token: admin })).status, 200);
    assert.equal((await requisitar('/notas', { token: admin })).status, 200);
    assert.equal((await requisitar('/notas', { token: professor })).status, 200);
    assert.equal((await requisitar('/frequencias', { token: professor })).status, 200);
  });

  it('conta de aluno nao entra pelo login da equipe', async () => {
    const { status, body } = await requisitar('/login', { method: 'POST', body: { email: CONTAS.aluno, senha: SENHA_DEMO } });
    assert.equal(status, 401);
    assert.match(body.erro, /portal do aluno/i);
    // ...mas continua entrando normalmente pelo portal.
    assert.equal((await requisitar('/alunos/login', { method: 'POST', body: { email: CONTAS.aluno, senha: SENHA_DEMO } })).status, 200);
  });
});
