import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { derrubarApi, requisitar, subirApi, tokenAdmin, tokenAluno, tokenProfessor } from './helpers.js';

// Fecha as brechas achadas na revisao das missoes 001 a 008:
// leitura de dados de terceiros, escopo de disciplina e bypass no PUT.
const DATA_DA_CHAMADA = '2026-09-24';
const DISCIPLINAS_DA_PROFESSORA = ['Matemática', 'Front-End'];

let admin;
let professor;
let aluno;
let idsDosTestes = [];
let turmas = [];
let turma;

const ehDaProfessora = (registro) => DISCIPLINAS_DA_PROFESSORA.includes(registro.disciplina);

before(async () => {
  await subirApi();
  admin = await tokenAdmin();
  professor = await tokenProfessor();

  const marca = Date.now();
  const cadastrados = await Promise.all([1, 2].map((n) => requisitar('/alunos', {
    token: admin,
    method: 'POST',
    body: {
      nome: `Aluno Escopo ${n}`,
      email: `aluno.escopo.${n}.${marca}@escola.com`,
      serie: '3º DS',
      // PII que o professor nao pode receber.
      cpf: `999.${n}88.777-0${n}`,
      telefone: `(11) 9000-000${n}`,
      endereco: `Rua Exposta, ${n}`,
    },
  })));
  [aluno] = cadastrados.map((resposta) => resposta.body);
  idsDosTestes = [aluno.id];

  turmas = (await requisitar('/turmas', { token: admin })).body;
  turma = turmas.find((item) => item.nome === '3º DS');
  await requisitar(`/alunos/${aluno.id}`, { token: admin, method: 'PUT', body: { turma_id: turma.id } });
});

after(async () => {
  const { body: frequencias } = await requisitar('/frequencias', { token: admin });
  for (const registro of frequencias.filter((item) => idsDosTestes.includes(item.aluno_id) && item.data_aula === DATA_DA_CHAMADA)) {
    await requisitar(`/frequencias/${registro.id}`, { token: admin, method: 'DELETE' });
  }
  const { body: notas } = await requisitar('/notas', { token: admin });
  for (const nota of notas.filter((item) => idsDosTestes.includes(item.aluno_id))) {
    await requisitar(`/notas/${nota.id}`, { token: admin, method: 'DELETE' });
  }
  for (const id of idsDosTestes) await requisitar(`/alunos/${id}`, { token: admin, method: 'DELETE' });
  await derrubarApi();
});

describe('Missao 006/008 - o perfil aluno nao alcanca os dados da secretaria', () => {
  it('aluno recebe 403 ao tentar listar alunos, turmas e roster', async () => {
    const token = await tokenAluno();
    assert.equal((await requisitar('/alunos', { token })).status, 403);
    assert.equal((await requisitar('/turmas', { token })).status, 403);
    assert.equal((await requisitar(`/turmas/${turma.id}/alunos`, { token })).status, 403);
  });

  it('aluno nao acessa as rotas de escrita da equipe', async () => {
    const token = await tokenAluno();
    assert.equal((await requisitar('/turmas', { token, method: 'POST', body: { nome: 'X', serie: '3º DS', ano: 2026 } })).status, 403);
    assert.equal((await requisitar('/alunos', { token, method: 'POST', body: { nome: 'X', email: 'x@escola.com' } })).status, 403);
  });
});

describe('Missao 006 - PII restrita a secretaria', () => {
  it('professor recebe o roster basico, sem cpf, telefone e endereco', async () => {
    const { status, body } = await requisitar('/alunos', { token: professor });
    assert.equal(status, 200);
    const linha = body.find((item) => item.id === aluno.id);
    assert.ok(linha.nome);
    assert.equal('cpf' in linha, false);
    assert.equal('telefone' in linha, false);
    assert.equal('endereco' in linha, false);
    // O acesso do portal tambem e da secretaria.
    assert.equal(linha.acesso, null);
  });

  it('admin continua recebendo os dados completos', async () => {
    const { status, body } = await requisitar('/alunos', { token: admin });
    assert.equal(status, 200);
    const linha = body.find((item) => item.id === aluno.id);
    assert.ok(linha.cpf);
    assert.ok(linha.telefone);
    assert.ok(linha.endereco);
  });

  it('roster da turma expoe apenas o necessario para a chamada', async () => {
    const { status, body } = await requisitar(`/turmas/${turma.id}/alunos`, { token: professor });
    assert.equal(status, 200);
    for (const membro of body.alunos || []) {
      assert.deepEqual(Object.keys(membro).sort(), ['email', 'id', 'nome', 'turma_id']);
    }
  });
});

describe('Missao 005 - o professor so enxerga as proprias disciplinas', () => {
  it('GET /notas devolve somente as disciplinas que ele leciona', async () => {
    const { status, body } = await requisitar('/notas', { token: professor });
    assert.equal(status, 200);
    assert.ok(body.length > 0, 'esperava ao menos uma nota da professora');
    assert.ok(body.every(ehDaProfessora), 'nota de disciplina alheia vazou para o professor');
  });

  it('GET /frequencias nao devolve chamada de disciplina alheia', async () => {
    await requisitar('/frequencias', {
      token: admin,
      method: 'POST',
      body: { aluno_id: aluno.id, disciplina: 'Português', data_aula: DATA_DA_CHAMADA, numero_aula: 1, presente: true },
    });

    const { body: doProfessor } = await requisitar('/frequencias', { token: professor });
    assert.ok(doProfessor.every(ehDaProfessora));

    const { body: doAdmin } = await requisitar('/frequencias', { token: admin });
    assert.ok(doAdmin.some((registro) => registro.disciplina === 'Português'), 'o admin precisa enxergar a chamada completa');
  });

  it('o historico tambem respeita o escopo de disciplina', async () => {
    const { body } = await requisitar('/frequencias/historico', { token: professor });
    assert.ok(body.every((chamada) => ehDaProfessora(chamada)));
  });

  it('o painel rejeita disciplina que o professor nao leciona', async () => {
    const { status } = await requisitar('/frequencias/resumo?disciplina=Português', { token: professor });
    assert.equal(status, 403);
  });

  it('o boletim rejeita disciplina que o professor nao leciona', async () => {
    const { body: comNotas } = await requisitar('/alunos', { token: admin });
    const carlos = comNotas.find((item) => item.email === 'carlos@aluno.com');
    assert.equal((await requisitar(`/notas/boletim/${carlos.id}?disciplina=Português`, { token: professor })).status, 403);
  });

  it('o boletim do professor so resume a disciplina consultada', async () => {
    const { body: comNotas } = await requisitar('/alunos', { token: admin });
    const carlos = comNotas.find((item) => item.email === 'carlos@aluno.com');
    const { body } = await requisitar(`/notas/boletim/${carlos.id}?disciplina=Matemática`, { token: professor });
    assert.ok(body.notas.length > 0);
    assert.ok(body.notas.every((nota) => nota.disciplina === 'Matemática'));
    assert.deepEqual(body.por_disciplina.map((item) => item.disciplina), ['Matemática']);
  });
});

describe('Missao 005/006 - o PUT nao burla a permissao de disciplina', () => {
  it('professor nao move uma nota para disciplina que nao leciona', async () => {
    const { body: nota } = await requisitar('/notas', {
      token: admin,
      method: 'POST',
      body: { aluno_id: aluno.id, disciplina: 'Matemática', bimestre: '1º Bimestre', nota: 7 },
    });

    const { status } = await requisitar(`/notas/${nota.id}`, { token: professor, method: 'PUT', body: { disciplina: 'Português' } });
    assert.equal(status, 403);

    const { body: conferida } = await requisitar(`/notas/boletim/${aluno.id}?disciplina=Matemática`, { token: admin });
    assert.ok(conferida.notas.some((item) => item.id === nota.id && item.disciplina === 'Matemática'));
  });

  it('professor nao transpoe a nota para outro aluno', async () => {
    const { body: nota } = await requisitar('/notas', {
      token: admin,
      method: 'POST',
      body: { aluno_id: aluno.id, disciplina: 'Matemática', bimestre: '2º Bimestre', nota: 6 },
    });
    const outro = (await requisitar('/alunos', { token: admin })).body.find((item) => item.email === 'carlos@aluno.com');

    await requisitar(`/notas/${nota.id}`, { token: professor, method: 'PUT', body: { aluno_id: outro.id, nota: 10 } });

    const { body: conferida } = await requisitar('/notas', { token: admin });
    const gravada = conferida.find((item) => item.id === nota.id);
    assert.equal(gravada.aluno_id, aluno.id);
    assert.equal(Number(gravada.nota), 10, 'a nota muda de valor, mas nao de dono');
  });

  it('professor nao move a frequencia para disciplina que nao leciona', async () => {
    const { body: registro } = await requisitar('/frequencias', {
      token: admin,
      method: 'POST',
      body: { aluno_id: aluno.id, disciplina: 'Front-End', data_aula: DATA_DA_CHAMADA, numero_aula: 3, presente: true },
    });

    assert.equal((await requisitar(`/frequencias/${registro.id}`, { token: professor, method: 'PUT', body: { disciplina: 'Português' } })).status, 403);

    const { body: conferida } = await requisitar('/frequencias', { token: admin });
    assert.ok(conferida.find((item) => item.id === registro.id).disciplina.includes('Front-End'));
  });
});

describe('Missao 004/005 - a chamada valida aluno e turma', () => {
  it('aluno inexistente retorna 404 em nota e frequencia', async () => {
    assert.equal((await requisitar('/notas', { token: admin, method: 'POST', body: { aluno_id: 999999, disciplina: 'Matemática', bimestre: '1º Bimestre', nota: 7 } })).status, 404);
    assert.equal((await requisitar('/frequencias', { token: admin, method: 'POST', body: { aluno_id: 999999, disciplina: 'Matemática', data_aula: DATA_DA_CHAMADA, numero_aula: 1, presente: true } })).status, 404);
  });

  it('turma que nao e a do aluno retorna 400', async () => {
    // Sem turma o aluno nao pertence a nenhuma, entao citar a turma do seed e forjar.
    await requisitar(`/alunos/${aluno.id}`, { token: admin, method: 'PUT', body: { turma_id: null } });
    const resposta = await requisitar('/frequencias', {
      token: admin,
      method: 'POST',
      body: { aluno_id: aluno.id, turma_id: turma.id, disciplina: 'Matemática', data_aula: DATA_DA_CHAMADA, numero_aula: 1, presente: true },
    });
    assert.equal(resposta.status, 400);
    await requisitar(`/alunos/${aluno.id}`, { token: admin, method: 'PUT', body: { turma_id: turma.id } });
  });

  it('a turma e inferreda do aluno quando o cliente nao a informa', async () => {
    const { status, body } = await requisitar('/frequencias', {
      token: admin,
      method: 'POST',
      body: { aluno_id: aluno.id, disciplina: 'Matemática', data_aula: DATA_DA_CHAMADA, numero_aula: 2, presente: true },
    });
    assert.equal(status, 201);
    assert.equal(Number(body.turma_id), Number(turma.id));
  });

  it('id enviado pelo cliente e ignorado', async () => {
    const { status, body } = await requisitar('/frequencias', {
      token: admin,
      method: 'POST',
      body: { id: 987654, aluno_id: aluno.id, disciplina: 'Matemática', data_aula: DATA_DA_CHAMADA, numero_aula: 4, presente: true },
    });
    assert.equal(status, 201);
    assert.notEqual(body.id, 987654);
  });

  it('data invalida e numero de aula abaixo de 1 retornam 400', async () => {
    const base = { aluno_id: aluno.id, disciplina: 'Matemática', presente: true };
    assert.equal((await requisitar('/frequencias', { token: admin, method: 'POST', body: { ...base, data_aula: 'ontem', numero_aula: 1 } })).status, 400);
    assert.equal((await requisitar('/frequencias', { token: admin, method: 'POST', body: { ...base, data_aula: DATA_DA_CHAMADA, numero_aula: 0 } })).status, 400);
  });

  it('turma invalida no painel retorna 400 em vez de consulta vazia', async () => {
    assert.equal((await requisitar('/frequencias/resumo?turma_id=abc', { token: admin })).status, 400);
  });
});
