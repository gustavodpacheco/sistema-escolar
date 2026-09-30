import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { derrubarApi, requisitar, subirApi, tokenAdmin, tokenProfessor } from './helpers.js';

const DATA_DA_CHAMADA = '2026-09-22';
let admin;
let professor;
let aluno;
let outroAluno;
let idsDosTestes = [];

before(async () => {
  await subirApi();
  admin = await tokenAdmin();
  professor = await tokenProfessor();

  const marca = Date.now();
  const cadastrados = await Promise.all([1, 2].map((n) => requisitar('/alunos', {
    token: admin,
    method: 'POST',
    body: { nome: `Aluno Teste ${n}`, email: `aluno.teste.${n}.${marca}@escola.com`, serie: '3º DS' },
  })));
  [aluno, outroAluno] = cadastrados.map((resposta) => resposta.body);
  idsDosTestes = [aluno.id, outroAluno.id];
});

after(async () => {
  const { body: frequencias } = await requisitar('/frequencias', { token: admin });
  for (const registro of frequencias.filter((item) => idsDosTestes.includes(item.aluno_id) && item.data_aula === DATA_DA_CHAMADA)) {
    await requisitar(`/frequencias/${registro.id}`, { token: admin, method: 'DELETE' });
  }
  for (const id of idsDosTestes) await requisitar(`/alunos/${id}`, { token: admin, method: 'DELETE' });
  await derrubarApi();
});

describe('Missao 003 - notas e boletim', () => {
  it('campos obrigatorios vazios retornam 400', async () => {
    const { status } = await requisitar('/notas', { token: admin, method: 'POST', body: { aluno_id: aluno.id, disciplina: '', bimestre: '', nota: '' } });
    assert.equal(status, 400);
  });

  it('nota fora de 0 a 10 retorna 400', async () => {
    const alta = await requisitar('/notas', { token: admin, method: 'POST', body: { aluno_id: aluno.id, disciplina: 'Matemática', bimestre: '1º Bimestre', nota: 11 } });
    const baixa = await requisitar('/notas', { token: admin, method: 'POST', body: { aluno_id: aluno.id, disciplina: 'Matemática', bimestre: '1º Bimestre', nota: -1 } });
    assert.equal(alta.status, 400);
    assert.equal(baixa.status, 400);
  });

  it('disciplina nao autorizada retorna 403', async () => {
    const { status } = await requisitar('/notas', { token: professor, method: 'POST', body: { aluno_id: aluno.id, disciplina: 'Português', bimestre: '1º Bimestre', nota: 7 } });
    assert.equal(status, 403);
  });

  it('boletim traz media, maior, menor, situacao e media da turma', async () => {
    const { body: todos } = await requisitar('/alunos', { token: admin });
    const comNotas = todos.find((item) => item.email === 'carlos@aluno.com') ?? aluno;
    const { status, body } = await requisitar(`/notas/boletim/${comNotas.id}`, { token: admin });
    assert.equal(status, 200);
    assert.equal(typeof body.media, 'number');
    assert.ok(body.maior_nota >= body.menor_nota);
    assert.ok(['Aprovado', 'Recuperação', 'Reprovado'].includes(body.situacao.rotulo));
    assert.ok(body.por_disciplina.length > 0);
  });

  it('aluno inexistente no boletim retorna 404', async () => {
    assert.equal((await requisitar('/notas/boletim/999999', { token: admin })).status, 404);
  });
});

describe('Missao 004 e 005 - frequencia por aula', () => {
  it('chamada de duas aulas gera um registro por aula e por aluno', async () => {
    const respostas = await Promise.all([1, 2].flatMap((numero_aula) => idsDosTestes.map((aluno_id) => requisitar('/frequencias', {
      token: admin,
      method: 'POST',
      body: { aluno_id, disciplina: 'Front-End', data_aula: DATA_DA_CHAMADA, plano_aula: 'Chamada de teste', numero_aula, presente: !(aluno_id === idsDosTestes[0] && numero_aula === 2) },
    }))));
    assert.ok(respostas.every((resposta) => resposta.status === 201));

    const { body } = await requisitar('/frequencias', { token: admin });
    const doDia = body.filter((registro) => registro.data_aula === DATA_DA_CHAMADA && idsDosTestes.includes(registro.aluno_id));
    assert.equal(doDia.length, 4);
    const faltas = doDia.filter((registro) => Number(registro.presente) === 0);
    assert.equal(faltas.length, 1);
    assert.equal(faltas[0].numero_aula, 2);
  });

  it('painel de frequencia devolve percentual, ranking e alunos em risco', async () => {
    const { status, body } = await requisitar('/frequencias/resumo', { token: admin });
    assert.equal(status, 200);
    assert.ok(Array.isArray(body.ranking));
    assert.ok(Array.isArray(body.em_risco));
    for (const linha of body.ranking) {
      assert.equal(linha.presencas + linha.faltas, linha.total_aulas);
      assert.ok(linha.percentual >= 0 && linha.percentual <= 100);
      assert.ok(['boa', 'atencao', 'risco'].includes(linha.classificacao.nivel));
    }
    const percentuais = body.ranking.map((linha) => linha.percentual);
    assert.deepEqual(percentuais, [...percentuais].sort((a, b) => b - a));
    assert.ok(body.em_risco.every((linha) => linha.percentual < 75));
  });

  it('historico agrupa as chamadas por data e disciplina', async () => {
    const { status, body } = await requisitar('/frequencias/historico', { token: admin });
    assert.equal(status, 200);
    const chamada = body.find((item) => item.data_aula === DATA_DA_CHAMADA);
    assert.equal(chamada.quantidade_aulas, 2);
    assert.equal(chamada.presencas + chamada.faltas, chamada.registros.length);
  });
});

describe('Missao 006 - autenticacao e autorizacao', () => {
  it('login invalido retorna 401', async () => {
    assert.equal((await requisitar('/login', { method: 'POST', body: { email: 'admin@escola.com', senha: 'errada' } })).status, 401);
    assert.equal((await requisitar('/login', { method: 'POST', body: { email: 'ninguem@escola.com', senha: '123456' } })).status, 401);
  });

  it('rota protegida sem token retorna 401', async () => {
    assert.equal((await requisitar('/alunos')).status, 401);
    assert.equal((await requisitar('/turmas')).status, 401);
  });

  it('token invalido retorna 401', async () => {
    assert.equal((await requisitar('/alunos', { token: 'token.inventado' })).status, 401);
  });

  it('professor nao cadastra aluno', async () => {
    assert.equal((await requisitar('/alunos', { token: professor, method: 'POST', body: { nome: 'X', email: 'x@escola.com' } })).status, 403);
  });
});
