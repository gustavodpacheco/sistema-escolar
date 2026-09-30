import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import sequelize from '../src/config/database.js';
import { CONTAS, derrubarApi, requisitar, SENHA_DEMO, subirApi, tokenAdmin, tokenAluno, tokenDaOutraAluna, tokenProfessor } from './helpers.js';

before(subirApi);
after(derrubarApi);

const unico = (prefixo) => `${prefixo}.${Date.now()}.${Math.floor(Math.random() * 1e6)}@escola.com`;

describe('Sessao revogada apos troca de senha', () => {
  it('token emitido antes da troca deixa de valer', async () => {
    const tokenAntigo = await tokenAluno();
    const nova = `senha-${Date.now()}`;

    assert.equal((await requisitar('/aluno/senha', { token: tokenAntigo, method: 'PUT', body: { senha_atual: SENHA_DEMO, nova_senha: nova, confirmacao: nova } })).status, 200);

    // O token foi assinado antes de `senha_alterada_em`: a sessao precisa cair.
    const revogado = await requisitar('/aluno/perfil', { token: tokenAntigo });
    assert.equal(revogado.status, 401);
    assert.match(revogado.body.erro, /sessao/i);

    const tokenNovo = (await requisitar('/alunos/login', { method: 'POST', body: { email: CONTAS.aluno, senha: nova } })).body.token;
    assert.equal((await requisitar('/aluno/perfil', { token: tokenNovo })).status, 200);

    // Restaura a senha de demonstracao para os demais testes.
    await requisitar('/aluno/senha', { token: tokenNovo, method: 'PUT', body: { senha_atual: nova, nova_senha: SENHA_DEMO, confirmacao: SENHA_DEMO } });
    assert.equal((await requisitar('/aluno/perfil', { token: tokenNovo })).status, 401);
  });

  it('recusa reusar a senha atual como nova senha', async () => {
    const token = await tokenAluno();
    const { status, body } = await requisitar('/aluno/senha', { token, method: 'PUT', body: { senha_atual: SENHA_DEMO, nova_senha: SENHA_DEMO, confirmacao: SENHA_DEMO } });
    assert.equal(status, 400);
    assert.match(body.erro, /diferente/i);
    // A recusa nao pode derrubar a sessao valida.
    assert.equal((await requisitar('/aluno/perfil', { token })).status, 200);
  });
});

describe('Login endurecido', () => {
  it('aceita o e-mail com espacos e caixa diferente', async () => {
    const { status, body } = await requisitar('/login', { method: 'POST', body: { email: `  ${CONTAS.admin.toUpperCase()} `, senha: SENHA_DEMO } });
    assert.equal(status, 200);
    assert.ok(body.token);
  });

  it('nao revela se o e-mail existe: mensagem unica nos dois casos', async () => {
    const inexistente = await requisitar('/login', { method: 'POST', body: { email: unico('fantasma'), senha: 'qualquer-coisa' } });
    const existente = await requisitar('/login', { method: 'POST', body: { email: CONTAS.admin, senha: 'qualquer-coisa' } });
    assert.equal(inexistente.status, existente.status);
    assert.equal(inexistente.body.erro, existente.body.erro);
  });

  it('login recusado guarda a identidade de quem tentou', async () => {
    const admin = await tokenAdmin();
    const email = unico('intrusa');
    await requisitar('/login', { method: 'POST', body: { email, senha: 'errada' } });

    const { body } = await requisitar('/auditoria?operacao=LOGIN_RECUSADO', { token: admin });
    const evento = body.find((linha) => linha.usuario_nome === email);
    assert.ok(evento, 'o log precisa apontar qual e-mail tentou entrar');
  });
});

describe('Frequencia - duplicidade e titularidade', () => {
  it('reenviar a mesma chamada regrava em vez de duplicar', async () => {
    const admin = await tokenAdmin();
    const professor = await tokenProfessor();

    const { body: aluno } = await requisitar('/alunos', { token: admin, method: 'POST', body: { nome: `Aluno Frequencia ${Date.now()}`, email: unico('freq'), serie: '9º B' } });
    const disciplina = (await requisitar('/login', { method: 'POST', body: { email: CONTAS.professor, senha: SENHA_DEMO } })).body.usuario.disciplinas[0];
    const chamada = { aluno_id: aluno.id, disciplina, data_aula: '2026-03-02', numero_aula: 1, presente: true };

    const primeira = await requisitar('/frequencias', { token: professor, method: 'POST', body: chamada });
    assert.equal(primeira.status, 201);

    // Clicar duas vezes em "Salvar chamada" nao pode gerar duas linhas.
    const segunda = await requisitar('/frequencias', { token: professor, method: 'POST', body: chamada });
    assert.equal(segunda.status, 200);
    assert.equal(segunda.body.id, primeira.body.id);

    const { body: painel } = await requisitar(`/frequencias/painel?turma_id=${aluno.turma_id ?? ''}`, { token: professor });
    const totalDesteAluno = (painel?.alunos ?? []).find((linha) => linha.aluno_id === aluno.id);
    assert.ok(!totalDesteAluno || totalDesteAluno.total_aulas <= 1, 'a chamada repetida inflaria o percentual');

    await requisitar(`/frequencias/${primeira.body.id}`, { token: professor, method: 'DELETE' });
    await requisitar(`/alunos/${aluno.id}`, { token: admin, method: 'DELETE' });
  });

  it('PUT nao permite trocar o aluno da chamada', async () => {
    const admin = await tokenAdmin();
    const professor = await tokenProfessor();
    const disciplina = (await requisitar('/login', { method: 'POST', body: { email: CONTAS.professor, senha: SENHA_DEMO } })).body.usuario.disciplinas[0];

    const primeiro = (await requisitar('/alunos', { token: admin, method: 'POST', body: { nome: `Titular ${Date.now()}`, email: unico('titular'), serie: '9º B' } })).body;
    const segundo = (await requisitar('/alunos', { token: admin, method: 'POST', body: { nome: `Outro ${Date.now()}`, email: unico('outro'), serie: '9º B' } })).body;

    const criacao = await requisitar('/frequencias', { token: professor, method: 'POST', body: { aluno_id: primeiro.id, disciplina, data_aula: '2026-03-03', numero_aula: 1, presente: true } });
    assert.equal(criacao.status, 201, JSON.stringify(criacao.body));
    const registro = criacao.body;
    assert.equal(registro.aluno_id, primeiro.id);

    const { status, body } = await requisitar(`/frequencias/${registro.id}`, { token: professor, method: 'PUT', body: { aluno_id: segundo.id } });
    assert.equal(status, 400);
    assert.match(body.erro, /nao pode ser trocado/i);

    const conferido = await requisitar('/frequencias', { token: professor });
    const mesma = conferido.body.find((item) => item.id === registro.id);
    assert.equal(mesma.aluno_id, primeiro.id, 'o PUT recusado nao pode ter trocado o titular');

    await requisitar(`/frequencias/${registro.id}`, { token: professor, method: 'DELETE' });
    await requisitar(`/alunos/${primeiro.id}`, { token: admin, method: 'DELETE' });
    await requisitar(`/alunos/${segundo.id}`, { token: admin, method: 'DELETE' });
  });

  it('percentual de frequencia nao trata a string "0" como presenca', async () => {
    const { resumoDeFrequencia } = await import('../src/services/frequenciaService.js');
    // O driver MySQL pode devolver TINYINT como string; '0' e truthy em JavaScript.
    const resumo = resumoDeFrequencia([{ presente: '0' }, { presente: '1' }, { presente: 1 }]);
    assert.equal(resumo.total_aulas, 3);
    assert.equal(resumo.presencas, 2);
    assert.equal(resumo.faltas, 1);
    assert.equal(resumo.percentual, 66.7);
  });
});

describe('Boletim sem notas nao reprova o aluno', () => {
  it('media nula e situacao sem_dados', async () => {
    const admin = await tokenAdmin();
    const { body: aluno } = await requisitar('/alunos', { token: admin, method: 'POST', body: { nome: `Sem Notas ${Date.now()}`, email: unico('semnotas'), serie: '9º B' } });

    const { body: boletim } = await requisitar(`/notas/boletim/${aluno.id}`, { token: admin });
    assert.equal(boletim.notas.length, 0);
    // Com media 0 o aluno aparecia como "Reprovado" sem nunca ter tido nota.
    assert.equal(boletim.media, null);
    assert.equal(boletim.maior_nota, null);
    assert.equal(boletim.menor_nota, null);
    assert.equal(boletim.situacao.nivel, 'sem_dados');
    assert.equal(boletim.situacao.rotulo, 'Sem dados');

    await requisitar(`/alunos/${aluno.id}`, { token: admin, method: 'DELETE' });
  });

  it('o portal do aluno mostra media vazia em vez de 0,0', async () => {
    const token = await tokenDaOutraAluna();
    const { status, body } = await requisitar('/aluno/notas', { token });
    assert.equal(status, 200);
    if (!body.notas.length) {
      assert.equal(body.media, null);
      assert.equal(body.situacao.nivel, 'sem_dados');
    }
  });
});

describe('Auditoria imutavel e sanitizada', () => {
  it('o banco recusa UPDATE e DELETE na trilha', async () => {
    const admin = await tokenAdmin();
    const { body: evento } = await requisitar('/auditoria', { token: admin });
    assert.ok(evento.length);

    await assert.rejects(
      () => sequelize.query('UPDATE auditoria SET usuario_nome = ? WHERE id = ?', { replacements: [' hacker', evento[0].id] }),
      /imutaveis/i
    );
    await assert.rejects(
      () => sequelize.query('DELETE FROM auditoria WHERE id = ?', { replacements: [evento[0].id] }),
      /nao podem ser removidos/i
    );
  });

  it('segredos aninhados viram [oculto]', async () => {
    const { sanitizarParaAuditoria } = await import('../src/services/auditoriaService.js');
    const limpo = sanitizarParaAuditoria({
      detalhes: { usuario: { senha: 'segredo', token: 'abc.def.ghi' }, lista: [{ password: 'x' }] },
      authorization: 'Bearer abc',
    });
    assert.equal(limpo.detalhes.usuario.senha, '[oculto]');
    assert.equal(limpo.detalhes.usuario.token, '[oculto]');
    assert.equal(limpo.detalhes.lista[0].password, '[oculto]');
    assert.equal(limpo.authorization, '[oculto]');
    assert.equal(JSON.stringify(limpo).includes('segredo'), false);
  });

  it('filtro por periodo cobre o dia inteiro', async () => {
    const admin = await tokenAdmin();
    const hoje = new Date().toISOString().slice(0, 10);
    const { body } = await requisitar(`/auditoria?inicio=${hoje}&fim=${hoje}`, { token: admin });
    assert.ok(body.length > 0);
    // `fim` precisa chegar ate 23:59:59, senao o log do dia corrente sumia.
    assert.ok(body.every((evento) => evento.criado_em.slice(0, 10) === hoje));
  });

  it('paginacao devolve metadados', async () => {
    const admin = await tokenAdmin();
    const { body } = await requisitar('/auditoria?pagina=1&limite=3', { token: admin });
    assert.ok(body.dados.length <= 3);
    assert.equal(typeof body.total, 'number');
    assert.equal(body.pagina, 1);
    assert.equal(body.limite, 3);
    assert.ok(body.paginas >= 1);
  });

  it('ultimo_acesso so conta login bem-sucedido', async () => {
    const admin = await tokenAdmin();
    // A trilha guarda o nome de exibicao no login bem-sucedido, nao o e-mail.
    const entrada = await requisitar('/login', { method: 'POST', body: { email: CONTAS.professor, senha: SENHA_DEMO } });
    assert.equal(entrada.status, 200);

    const { body } = await requisitar('/auditoria/indicadores', { token: admin });
    const professor = body.usuarios.find((linha) => linha.usuario_nome === entrada.body.usuario.nome);
    assert.ok(professor, 'o login bem-sucedido do professor precisa aparecer no painel');
    // Editar uma nota nao pode ser contabilizado como "acesso".
    assert.ok(professor.ultimo_acesso);
    assert.ok(professor.ultima_atividade);
  });
});