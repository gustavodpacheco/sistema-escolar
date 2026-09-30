import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CONTAS, derrubarApi, requisitar, SENHA_DEMO, subirApi, tokenAdmin, tokenProfessor } from './helpers.js';

before(subirApi);
after(derrubarApi);

describe('Missao 007 - auditoria', () => {
  it('sem token retorna 401', async () => {
    assert.equal((await requisitar('/auditoria')).status, 401);
  });

  it('professor recebe 403', async () => {
    assert.equal((await requisitar('/auditoria', { token: await tokenProfessor() })).status, 403);
  });

  it('admin consulta os eventos em ordem decrescente', async () => {
    const { status, body } = await requisitar('/auditoria', { token: await tokenAdmin() });
    assert.equal(status, 200);
    assert.ok(Array.isArray(body));
    const datas = body.map((evento) => new Date(evento.criado_em).getTime());
    assert.deepEqual(datas, [...datas].sort((a, b) => b - a));
  });

  it('login recusado gera evento sem senha nem token', async () => {
    const admin = await tokenAdmin();
    await requisitar('/alunos/login', { method: 'POST', body: { email: CONTAS.aluno, senha: 'senha-errada' } });
    const { body } = await requisitar('/auditoria?operacao=LOGIN_RECUSADO', { token: admin });
    assert.ok(body.length > 0);
    assert.ok(body.every((evento) => evento.operacao === 'LOGIN_RECUSADO'));
  });

  it('nenhum evento guarda senha nem token', async () => {
    const { body } = await requisitar('/auditoria', { token: await tokenAdmin() });
    for (const evento of body) {
      const detalhes = evento.detalhes || {};
      assert.equal('senha' in detalhes, false);
      assert.equal('token' in detalhes, false);
      assert.equal(JSON.stringify(evento).includes(SENHA_DEMO), false);
      assert.equal(/eyJ[\w-]+\.[\w-]+\.[\w-]+/.test(JSON.stringify(evento)), false);
    }
  });

  it('filtro por periodo devolve somente o periodo escolhido', async () => {
    const admin = await tokenAdmin();
    const { body } = await requisitar(`/auditoria?inicio=${new Date().toISOString().slice(0, 10)}`, { token: admin });
    const hoje = new Date().toISOString().slice(0, 10);
    assert.ok(body.length > 0);
    assert.ok(body.every((evento) => evento.criado_em.slice(0, 10) === hoje));
  });

  it('indicadores do painel respondem apenas para admin', async () => {
    assert.equal((await requisitar('/auditoria/indicadores')).status, 401);
    assert.equal((await requisitar('/auditoria/indicadores', { token: await tokenProfessor() })).status, 403);
    const { status, body } = await requisitar('/auditoria/indicadores', { token: await tokenAdmin() });
    assert.equal(status, 200);
    assert.equal(typeof body.total_eventos, 'number');
    assert.equal(typeof body.logins_recusados_24h, 'number');
    assert.ok(Array.isArray(body.por_operacao));
    assert.ok(Array.isArray(body.usuarios));
    assert.ok(Array.isArray(body.alertas));
  });
});
