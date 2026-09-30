import { Op } from 'sequelize';
import Frequencia from '../models/Frequencia.js';
import Aluno from '../models/Aluno.js';
import { agruparChamadas, painelDeFrequencia } from '../services/frequenciaService.js';
import { eventoDoUsuario, registrarAuditoria } from '../services/auditoriaService.js';

const autorizado = (u, disciplina) => u.perfil === 'admin' || (u.disciplinas || []).includes(disciplina);

// Missao 005: o professor so enxerga a chamada das disciplinas em que leciona.
const filtroDeDisciplina = (usuario) => (usuario.perfil === 'admin' ? {} : { disciplina: { [Op.in]: usuario.disciplinas || [] } });

// Nunca aceitar id, createdAt ou updatedAt vindos do cliente.
const CAMPOS_DA_CHAMADA = ['aluno_id', 'disciplina', 'data_aula', 'plano_aula', 'turma_id', 'numero_aula', 'presente'];

// Num PUT o `aluno_id` e o titular da chamada: permitir a troca deixaria o professor
// transferir a presenca de um aluno para outro da mesma turma, apagando o lancamento
// original sem nenhuma rastro. A correcao de um dia continua sendo feita com um POST,
// que regrava a chamada do proprio aluno.
const CAMPOS_EDITAVEIS = CAMPOS_DA_CHAMADA.filter((campo) => campo !== 'aluno_id');

const recortar = (permitidos, corpo) =>
  Object.fromEntries(permitidos.filter((campo) => corpo[campo] !== undefined).map((campo) => [campo, corpo[campo]]));

const camposPermitidos = (corpo) => recortar(CAMPOS_DA_CHAMADA, corpo);
const camposEditaveis = (corpo) => recortar(CAMPOS_EDITAVEIS, corpo);

const dataValida = (valor) => !Number.isNaN(Date.parse(valor)) && /^\d{4}-\d{2}-\d{2}$/.test(String(valor));

// O registro tem de pertencer a uma chamada real: aluno existente e, quando ha turma,
// o aluno precisa estar nessa turma. Sem isso o cliente forja o grupo da chamada.
async function chamadaValida({ aluno_id, disciplina, data_aula, numero_aula, presente, turma_id }) {
  if (!aluno_id || !disciplina || !data_aula || numero_aula === undefined || presente === undefined) {
    return { erro: 'Dados da frequencia incompletos.', status: 400 };
  }
  if (!dataValida(data_aula)) return { erro: 'Data da aula invalida.', status: 400 };
  if (Number(numero_aula) < 1) return { erro: 'O numero da aula comeca em 1.', status: 400 };

  const aluno = await Aluno.findByPk(aluno_id);
  if (!aluno) return { erro: 'Aluno nao encontrado.', status: 404 };

  const turmaDoAluno = aluno.turma_id ? Number(aluno.turma_id) : null;
  if (turma_id === null || turma_id === undefined) {
    return { dados: { ...aluno, turma_id: turmaDoAluno } };
  }
  if (Number(turma_id) !== turmaDoAluno) {
    return { erro: 'O aluno nao pertence a turma informada.', status: 400 };
  }
  return { dados: aluno };
}

export async function listar(req, res) {
  res.json(await Frequencia.findAll({ where: filtroDeDisciplina(req.usuario), order: [['data_aula', 'DESC'], ['numero_aula', 'ASC']] }));
}

// Missao 004: percentual, classificacao, ranking de frequencia e alunos em risco.
export async function painel(req, res) {
  const disciplina = req.query.disciplina;
  if (disciplina && !autorizado(req.usuario, disciplina)) return res.status(403).json({ erro: 'Disciplina nao autorizado.' });

  const turma_id = req.query.turma_id ? Number(req.query.turma_id) : undefined;
  if (Number.isNaN(turma_id)) return res.status(400).json({ erro: 'Turma invalida.' });

  // O professor fica preso as propias disciplinas mesmo que nao filtre por uma.
  const escopo = filtroDeDisciplina(req.usuario);
  res.json(await painelDeFrequencia({ turma_id, disciplina, where: escopo }));
}

// Missao 005: historico de chamadas agrupado por data e disciplina.
export async function historico(req, res) {
  res.json(agruparChamadas(await Frequencia.findAll({ where: filtroDeDisciplina(req.usuario), order: [['data_aula', 'DESC'], ['numero_aula', 'ASC']] })));
}

// QA da Missao 004 ("sem duplicacoes"): a tela de chamada dispara um POST por aluno
// e por aula. Sem isto, clicar duas vezes em "Salvar chamada" duplicava as linhas e
// inflava o percentual de frequencia. O registro existente e reescrito, o que
// tambem deixa o professor corrigir uma falta sem procurar o id na URL.
export async function criar(req, res) {
  const entrada = camposPermitidos(req.body);
  if (!autorizado(req.usuario, entrada.disciplina)) return res.status(403).json({ erro: 'Disciplina nao autorizada.' });

  const validacao = await chamadaValida(entrada);
  if (validacao.erro) return res.status(validacao.status).json({ erro: validacao.erro });

  const dados = { ...entrada, turma_id: validacao.dados.turma_id };
  const existente = await Frequencia.findOne({
    where: { aluno_id: dados.aluno_id, disciplina: dados.disciplina, data_aula: dados.data_aula, numero_aula: dados.numero_aula },
  });

  if (existente) {
    await existente.update({ presente: dados.presente, plano_aula: dados.plano_aula ?? existente.plano_aula, turma_id: dados.turma_id });
    await registrarAuditoria(eventoDoUsuario(req.usuario, { operacao: 'EDICAO', recurso: 'FREQUENCIA', recurso_id: existente.id, detalhes: { aluno_id: existente.aluno_id, disciplina: existente.disciplina, motivo: 'chamada regravada' } }));
    return res.status(200).json(existente);
  }

  const criada = await Frequencia.create(dados);
  await registrarAuditoria(eventoDoUsuario(req.usuario, { operacao: 'CRIACAO', recurso: 'FREQUENCIA', recurso_id: criada.id, detalhes: { aluno_id: criada.aluno_id, disciplina: criada.disciplina } }));
  res.status(201).json(criada);
}

export async function editar(req, res) {
  const item = await Frequencia.findByPk(req.params.id);
  if (!item) return res.status(404).json({ erro: 'Frequencia nao encontrada.' });
  if (!autorizado(req.usuario, item.disciplina)) return res.status(403).json({ erro: 'Disciplina nao autorizada.' });

  const dados = camposEditaveis(req.body);
  if (Object.prototype.hasOwnProperty.call(req.body, 'aluno_id')) {
    return res.status(400).json({ erro: 'O aluno de uma chamada nao pode ser trocado. Use POST /frequencias para regravar a chamada.' });
  }
  // A permissao e conferida tambem sobre a disciplina de destino, senao o professor
  // moveria a frequencia para uma disciplina que ele nao leciona.
  if (dados.disciplina && !autorizado(req.usuario, dados.disciplina)) return res.status(403).json({ erro: 'Disciplina nao autorizada.' });

  const validacao = await chamadaValida({ ...item.get(), ...dados });
  if (validacao.erro) return res.status(validacao.status).json({ erro: validacao.erro });

  const antes = { aluno_id: item.aluno_id, disciplina: item.disciplina, presente: item.presente };
  await item.update({ ...dados, turma_id: validacao.dados.turma_id });
  await registrarAuditoria(eventoDoUsuario(req.usuario, {
    operacao: 'EDICAO',
    recurso: 'FREQUENCIA',
    recurso_id: item.id,
    detalhes: { aluno_id: item.aluno_id, disciplina: item.disciplina, de: antes, para: { disciplina: item.disciplina, presente: item.presente } },
  }));
  res.json(item);
}

export async function excluir(req, res) {
  const item = await Frequencia.findByPk(req.params.id);
  if (!item) return res.status(404).json({ erro: 'Frequencia nao encontrada.' });
  if (!autorizado(req.usuario, item.disciplina)) return res.status(403).json({ erro: 'Disciplina nao autorizada.' });
  await registrarAuditoria(eventoDoUsuario(req.usuario, { operacao: 'EXCLUSAO', recurso: 'FREQUENCIA', recurso_id: Number(req.params.id), detalhes: { aluno_id: item.aluno_id, disciplina: item.disciplina } }));
  await item.destroy();
  res.status(204).end();
}
