# Checklist QA — Missões 001 a 008

## Missões 001 a 007

| Cenário | Como validar | Resultado esperado |
|---|---|---|
| Lançar nota | Admin/professor autorizado envia aluno, disciplina, bimestre e nota 0–10 | `201`, nota aparece no boletim e média é recalculada |
| Impedir nota inválida | Enviar nota fora de 0–10 ou campos vazios | `400` |
| Chamada por aula | Selecionar 2 aulas e marcar uma falta | Dois registros por aluno; o marcado fica `presente=false` |
| Disciplina restrita | Professor de Front-End tenta lançar Matemática | `403` |
| Login válido | `admin@escola.com` / `123456` | `200`, JWT e dados do usuário |
| Login inválido | Senha errada | `401`; evento `LOGIN_RECUSADO` sem senha/token |
| Rota sem token | Consultar `/auditoria` sem Authorization | `401` |
| Rota de admin | Professor consulta `/auditoria` | `403` |
| Auditoria de dados | Criar/editar/excluir nota ou frequência | Evento com usuário, perfil, operação, recurso, id e data/hora |
| Filtros | Consultar auditoria por usuário, operação e período | Apenas eventos correspondentes, em ordem decrescente |
| Dados sensíveis | Inspecionar `auditoria.detalhes` | Nenhuma senha ou token completo |
| Boletim | Consultar `/notas/boletim/:alunoId` | média, maior, menor, média da turma, situação e média por disciplina |
| Painel de frequência | Consultar `/frequencias/resumo` | percentual, ranking decrescente, classificação e lista de em risco (< 75%) |
| Histórico | Consultar `/frequencias/historico` | Chamadas agrupadas por data e disciplina |
| Indicadores | Consultar `/auditoria/indicadores` (admin) | totais, recusados em 24h, por operação, último acesso e alertas |

## Escopo de acesso (revisão das missões 001 a 008)

| Cenário | Como validar | Resultado esperado |
|---|---|---|
| Segredo obrigatório | Iniciar a API sem `JWT_SECRET` no `.env` | A API não sobe; não existe chave padrão no código |
| Aluno não lista a escola | `GET /alunos`, `/turmas`, `/turmas/:id/alunos` com token `aluno` | `403` |
| PII restrita à secretaria | `GET /alunos` como professor | Sem `cpf`, `telefone`, `endereco` nem `acesso`; admin recebe tudo |
| Roster da turma | `GET /turmas/:id/alunos` | Só `id`, `nome`, `email`, `turma_id` |
| Leitura por disciplina | `GET /notas`, `/frequencias`, `/frequencias/historico` como professor | Apenas disciplinas em `disciplinas` |
| Filtro por disciplina alheia | `/frequencias/resumo?disciplina=Português` como professora de Matemática/Front-End | `403` |
| Boletim por disciplina | `/notas/boletim/:id?disciplina=Português` como professora | `403`; com disciplina autorizada, média e por_disciplina só dela |
| PUT não troca disciplina | Professor de Front-End faz `PUT /notas/:id` com `disciplina: Português` | `403`; a nota continua em Front-End |
| PUT não troca aluno | Professor envia `aluno_id` diferente no `PUT` | O `aluno_id` é ignorado; a nota muda de valor, não de dono |
| Chamada valida aluno | `POST /notas` e `POST /frequencias` com `aluno_id` inexistente | `404` (não 500) |
| Chamada valida turma | `POST /frequencias` com `turma_id` que não é a do aluno | `400`; sem `turma_id`, a turma é inferida do aluno |
| Cliente não escolhe id | `POST /frequencias` com `id: 987654` | `201`; o id gravado é o do banco |
| Entrada inválida | `data_aula: "ontem"` ou `numero_aula: 0` | `400` |
| Filtro de turma inválido | `/frequencias/resumo?turma_id=abc` | `400` (não consulta vazia) |
| Chamada por turma | Tela "Fazer chamada" sem selecionar a turma | Bloqueia com mensagem; a chamada só grava a turma escolhida |

## Missão 008 — portal do aluno

| Cenário | Como validar | Resultado esperado |
|---|---|---|
| Definir acesso | Admin cria/redefine acesso na tela de alunos | `201`/`200`; resposta **sem** campo `senha` |
| Listar acesso | Abrir a lista de alunos como admin | Coluna "Portal do aluno" com o e-mail ou "sem acesso" |
| Login do aluno | Aba "Aluno" com `carlos@escola.com` / `123456` | `200`, token com `perfil: aluno` e `aluno_id` |
| Login por e-mail da ficha | Usar o e-mail cadastrado no aluno | `200` (mesma conta) |
| Credenciais inválidas | Senha ou e-mail errados | `401` com mensagem clara na tela |
| Equipe no login do aluno | `admin@escola.com` na aba "Aluno" | `401` |
| Aluno no login da equipe | `carlos@escola.com` na aba "Equipe" | `401` ("Use o portal do aluno") |
| Área inicial | Entrar como aluno | Nome e turma, sem menus de cadastro, edição ou exclusão |
| Minhas notas | Aba "Minhas notas" | Tabela com disciplina, bimestre, nota e situação |
| Situação | Aluno com média 8,2 | "Aprovado" |
| Minha frequência | Aba "Minha frequência" | Total de aulas, presenças, faltas, percentual e classificação |
| Sem registros | Aluno novo sem notas/frequência | Mensagem clara de que não há dados |
| Escopo do token | Trocar `aluno_id` na query ou forjar token | Mesmos dados do próprio aluno (nada do colega) |
| Outro aluno | Comparar `/aluno/notas` de carlos e marina | Conjuntos diferentes e sem sobreposição |
| Sem token | `GET /aluno/notas` sem Authorization | `401` |
| Outro perfil | Admin/professor em `/aluno/notas` | `403` |
| Aluno somente leitura | Aluno tentando `POST/PUT/DELETE` em `/notas` e `/frequencias` | `403` |
| Troca de senha (boss) | Informar senha atual, nova e confirmação | `200`; nova senha funciona, antiga falha |
| Troca de senha inválida | Confirmação diferente ou senha atual errada | `400` / `401` |
| Troca para a mesma senha | Nova senha igual à senha atual | `400`; a sessão continua válida |
| Sessão antiga morre | Trocar a senha e usar o token anterior | `401` ("Sua sessão foi encerrada") |
| Auditoria do portal | Filtrar `LOGIN_SUCESSO`/`LOGIN_RECUSADO` do recurso portal | Eventos sem senha, hash ou token |
| Excluir aluno | Admin exclui um aluno com acesso | `204`; login do aluno passa a dar `401` (conta removida junto) |
| Segredo na interface | Inspecionar a tela de login | Credenciais de demonstração só aparecem ao clicar no botão |

## Cadastro e turmas (missões 001 e 002)

| Cenário | Como validar | Resultado esperado |
|---|---|---|
| Ciclo completo do aluno | Admin cria, lista, altera e exclui | `201` → aparece na lista → `200` no PUT → `204` e `404` depois |
| Campos da Missão 001 | Formulário de cadastro | Nome, e-mail, nascimento, série, CPF, telefone, endereço e turma |
| Cinco alunos no cadastro | Subir a API e ler o console | Lista com os cinco (Carlos, Marina, Bruno, Daniela, Enzo) |
| Nome ou e-mail inválido | Nome em branco ou `nao-e-email` | `400` |
| E-mail duplicado | Cadastrar o mesmo e-mail de novo | `409`, sem vazar SQL na mensagem |
| E-mail normalizado | Cadastrar ` Ana@Escola.com ` e depois `ana@escola.com` | Uma conta só: o segundo cadastro dá `409` |
| Cliente não forja id | `POST /alunos` ou `/turmas` com `id: 999999` | `201`; o id gravado é o do banco |
| Turma inexistente | `POST /alunos` com `turma_id: 987654` | `400` "Turma nao encontrada" (não 500 de FK) |
| Turma duplicada | Criar duas turmas com mesmo nome, série e ano | `409` |
| Ano inválido | `POST /turmas` com `ano: "dois mil"` | `400` |
| Turma inexistente no roster | `GET /turmas/987654/alunos` | `404` |

## Integridade e robustez (missões 003 a 008)

| Cenário | Como validar | Resultado esperado |
|---|---|---|
| Chamada repetida | Enviar o mesmo `POST /frequencias` duas vezes | `201` e depois `200` no mesmo registro; nenhuma linha a mais |
| PUT não troca o titular | `PUT /frequencias/:id` com outro `aluno_id` | `400`; o registro continua do aluno original |
| Nota duplicada | `POST /notas` repetindo aluno, disciplina e bimestre | `409` |
| Frequência com string | Inserir `presente: "0"` e conferir o percentual | A falta é contada como falta (não 100% de presença) |
| Aluno sem nota | Consultar o boletim de um aluno recém-criado | `media: null`, `situacao.nivel: 'sem_dados'`, situação "Sem dados" |
| Tela sem nota | Abrir o boletim e o portal desse aluno | "Sem dados" e "—" no lugar de `0,0` / "Reprovado" |
| Log do dia | `GET /auditoria?inicio=hoje&fim=hoje` | Cobre `00:00:00` a `23:59:59`; o dia não aparece truncado |
| Paginação da auditoria | `GET /auditoria?pagina=1&limite=3` | `{ dados, total, pagina, limite, paginas }` |
| Último acesso real | Editar uma nota e olhar o painel de indicadores | `ultima_atividade` muda; `ultimo_acesso` só com `LOGIN_SUCESSO` |
| Segredo aninhado | Gravar detalhe com `detalhes.usuario.senha` | Vira `[oculto]` em qualquer nível do payload |
| Auditoria imutável | Tentar `UPDATE`/`DELETE` na tabela `auditoria` | O banco recusa (triggers) |
| Limite de login | Errar a senha 20 vezes em 15 min no mesmo IP | `429` |
| Origem não permitida | Requisição com `Origin` fora do `CORS_ORIGINS` | Sem cabeçalho de CORS liberado |
| Corpo grande | JSON acima de 100 KB | `413` |
| Payload npm | `cd backend && npm audit` | 2 moderadas em `uuid` (via Sequelize), sem correção sem breaking change |
