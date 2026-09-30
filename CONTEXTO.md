# Contexto e decisões das missões 003 a 008

## Como executar localmente

```bash
# 1. banco (uma vez): MySQL rodando na porta 3306, root sem senha
# 2. backend
cd backend
npm install
npm run dev            # http://localhost:3000

# 3. frontend (outro terminal)
cd frontend
npm install
npm run dev            # http://localhost:5173
```

O frontend fala com o backend pelo proxy do Vite: `/api/*` → `http://localhost:3000/*`.
Ao subir o backend, a migration e o seed são aplicados sozinhos.

## Contas de demonstração

| Perfil   | E-mail                 | Senha    |
| -------- | ---------------------- | -------- |
| admin    | admin@escola.com       | 123456   |
| professor| ana@escola.com         | 123456   |
| professor| carlos.professor@escola.com | 123456 |
| aluno    | carlos@escola.com      | 123456   |
| aluno    | marina@escola.com      | 123456   |

O seed também garante cinco alunos no cadastro (Carlos, Marina, Bruno, Daniela e Enzo)
e **lista os alunos no console** ao subir a API. Os três últimos existem sem conta de
portal, de propósito: mostram que o cadastro é independente do acesso do aluno.

As senhas vêm de `SEED_PASSWORD` (ver `backend/.env`). A tela de login esconde as
contas de demonstração atrás de um botão, para não exibir segredo por padrão.

## Entregas

- **001 e 002:** turmas e cadastro de alunos pela secretaria (admin).
- **003:** módulo `notas` e boletim com média, maior/menor nota, média da turma e situação.
- **004 e 005:** módulo `frequencias`, uma presença/falta por aluno e por aula, com painel
  (percentual, ranking, alunos em risco) e histórico de chamadas.
- **006:** autenticação JWT, senhas com bcrypt, perfis e rotas protegidas.
- **007:** módulo independente `auditoria` (somente admin), com filtros e indicadores.
- **008:** portal do aluno — login próprio, notas, frequência, resumo, troca de senha e
  administração de credenciais.

## Decisões e riscos

- **Credenciais do aluno (decisão do DBA):** conta em `usuarios` com `aluno_id`, e não
  colunas de login na tabela `alunos`. Assim a senha fica no domínio de autenticação,
  separada do acadêmico, e o mesmo aluno nunca tem duas contas.
- `usuarios.aluno_id` é único: um aluno tem no máximo uma conta, e o índice protege a
  regra "login único por aluno".
- Redefinir senha altera apenas `usuarios.senha`; notas e frequências não são tocadas.
- Excluir um aluno exclui junto a conta do portal (transação), evitando login órfão.
- A resposta da secretaria ao definir acesso devolve apenas dados públicos da conta —
  **nunca** o hash da senha.
- O `aluno_id` usado em `/aluno/*` vem **sempre** do token. Query string, body e rota são
  ignorados; o aluno só enxerga o próprio `aluno_id`.
- O perfil `aluno` é somente leitura: as rotas administrativas de notas e frequências
  devolvem 403 para ele.
- Cada perfil tem sua entrada: `POST /login` é da equipe (admin/professor) e recusa contas
  de aluno; `POST /alunos/login` devolve o token com `aluno_id`.
- O token tem duração de 8 horas. O `JWT_SECRET` é **obrigatório**: sem ele (ou com menos de
  16 caracteres) a API não sobe, e não existe chave padrão no código.
- Senhas, hashes e tokens são removidos antes de gravar um evento de auditoria.
- A falha ao gravar uma auditoria apenas é registrada no servidor: nunca impede nota ou frequência.
- Professores só podem criar, alterar ou excluir notas/frequências das disciplinas em `disciplinas` no seu token — **inclusive na leitura**: `GET /notas`, `/frequencias`, `/frequencias/historico` e o boletim devolvem só as disciplinas dele, e um `?disciplina=` alheio responde 403.
- `PUT /notas/:id` e `PUT /frequencias/:id` aceitam uma whitelist de campos e **revalidam a disciplina de destino**, então um professor não move a nota para uma matéria que não leciona nem troca o `aluno_id` para outro estudante.
- `GET /alunos`, `/turmas` e `/turmas/:id/alunos` são de `admin`/`professor`. O perfil `aluno` recebe 403.
- CPF, telefone, endereço e o acesso do portal são restritos ao `admin`; o professor recebe só `id`, `nome`, `e-mail`, `data_nascimento`, `série` e `turma_id`.
- A chamada valida a turma: quando o cliente não manda `turma_id`, a API infere a do aluno, e quando manda outra, responde 400. É por isso que a tela "Fazer chamada" exige a seleção da turma.
- Seed idempotente: pode rodar em todo boot sem duplicar alunos, notas ou contas.
- Riscos abertos: não há e-mail de recuperação de senha (a redefinição é feita pela
  secretaria); o token continua sendo um Bearer no `localStorage` (migrar para cookie
  httpOnly exigiria reescrever o contrato de autenticação do frontend).

## Hardenings aplicados

### Transporte e infraestrutura

- **Rate limiting** (`express-rate-limit`): 20 tentativas de login recusadas por
  janela de 15 min/IP e 600 requisições por minuto/IP no resto da API. O contador de
  login só soma falhas, então um professor que erra a senha uma vez não fica travado.
  Configurável por `LOGIN_RATE_MAX`, `API_RATE_MAX` e `API_RATE_WINDOW`.
- **CORS com allowlist** (`CORS_ORIGINS`, padrão `http://localhost:5173`), em vez de
  liberar qualquer origem.
- **Helmet** para os cabeçalhos de segurança e **limite de 100 KB** no corpo JSON.
- Falha de migration ou de seed **derruba a API** em vez de subir um servidor meio
  configurado. Só a autenticação usa retry de conexão.

### Integridade dos dados

As garantias abaixo vivem em `backend/src/config/migrations.js`, rodam a cada boot e
são idempotentes — inclusive sob execução paralela.

| Garantia | Onde |
| --- | --- |
| Nota duplicada: `UNIQUE (aluno_id, disciplina, bimestre)` | `notas_lancamento_unico` |
| Chamada duplicada: `UNIQUE (aluno_id, disciplina, data_aula, numero_aula)` | `frequencias_aula_unica` |
| Turma duplicada: `UNIQUE (nome, serie, ano)` | `turmas_identificacao_unica` |
| `alunos.turma_id` é FK de verdade | `alunos_turma_id_fk` |
| `usuarios.token_version` revoga tokens antigos | coluna nova |
| Auditoria não pode ser alterada nem apagada | triggers `auditoria_sem_update` / `auditoria_sem_delete` |

Reenviar a mesma chamada não duplica: `POST /frequencias` regrava o registro existente
(200 no lugar de 201) e a nota repetida responde **409** em vez de estourar um 500 com
o SQL dentro da mensagem.

### Autorização e validação

- `PUT /frequencias/:id` **não troca o `aluno_id`** — o professor corrigiria um dia com
  `POST`, que regrava a chamada do próprio aluno.
- Alunos e turmas usam **whitelist de campos**: `id`, `createdAt` e `updatedAt` enviados
  pelo cliente são descartados.
- E-mail é normalizado para `trim().toLowerCase()` no cadastro, na redefinição de acesso
  e no login, evitando duas contas para a mesma pessoa.
- `turma_id` é validado contra o banco antes de gravar: turma inexistente responde 400
  com mensagem legível, não 500 com constraint do MySQL.
- Erros de regra de negócio viram 409/400 com texto próprio; as mensagens do Sequelize
  (que carregam o SQL) não chegam mais ao cliente.
- `PUT /aluno/senha` recusa reutilizar a senha atual e **incrementa `token_version`**,
  derrubando as sessões abertas antes da troca.

### Auditoria

- Sanitização **recursiva** de chaves sensíveis (`senha`, `token`, `cpf`, `authorization`…)
  em qualquer nível do payload, com limite de profundidade e de tamanho. Antes, só o
  primeiro nível era limpo e um segredo aninhado vazava.
- `inicio`/`fim` cobrem o dia inteiro (`00:00:00` a `23:59:59`), então o log do dia
  corrente não aparece truncado.
- `ultimo_acesso` só conta `LOGIN_SUCESSO`; `ultima_atividade` traz o evento mais recente
  de qualquer tipo. Editar uma nota não conta mais como acesso.
- `GET /auditoria?pagina=&limite=` devolve `{ dados, total, pagina, limite, paginas }`.
  Sem esses parâmetros a rota continua devolvendo a lista pura, para não quebrar consumidores.

### Correção de cálculo

- Aluno **sem nota** tem `media: null` e `situacao.nivel: 'sem_dados'`. Antes a média
  zero o classificava como "Reprovado" sem nunca ter tido nota lançada.
- `media_turma` também pode ser `null` (aluno sem turma) e a tela mostra `—` em vez de `0,0`.
- O cálculo de frequência compara `Number(presente) === 1`. O MySQL pode devolver o TINYINT
  como string, e `'0'` é *truthy* em JavaScript — toda falta contava como presença.

## Modelo relacional

```text
TURMAS 1 ─── N ALUNOS 1 ─── N NOTAS
                    └──── N FREQUENCIAS

USUARIOS (admin | professor | aluno) 1 ─── 0..1 ALUNOS
AUDITORIA (usuario_id, usuario_nome, perfil, operacao, recurso, recurso_id, detalhes, criado_em)
```

`FREQUENCIAS.numero_aula` identifica a aula específica; assim, uma chamada de três aulas pode conter três faltas distintas por aluno.

## Rotas do portal do aluno

| Método | Rota                        | Quem pode |
| ------ | --------------------------- | --------- |
| POST   | `/alunos/login`             | público   |
| GET    | `/aluno/perfil`             | aluno     |
| GET    | `/aluno/notas`              | aluno     |
| GET    | `/aluno/frequencia`         | aluno     |
| GET    | `/aluno/frequencia/resumo`  | aluno     |
| PUT    | `/aluno/senha`              | aluno     |
| POST   | `/alunos/:id/acesso`        | admin     |
| GET    | `/notas/boletim/:alunoId`   | admin/professor |
| GET    | `/frequencias/resumo`       | admin/professor |
| GET    | `/frequencias/historico`    | admin/professor |
| GET    | `/auditoria/indicadores`    | admin     |

## Testes

```bash
cd backend
npm test
```

84 testes automatizados cobrem 001 a 008:

| Arquivo | Foco |
| --- | --- |
| `tests/cadastro.test.js` | CRUD de aluno e turma, whitelist, e-mail, FK de turma, duplicatas |
| `tests/notas-frequencia.test.js` | boletim, chamada por aula, painel e histórico |
| `tests/escopo-e-permissao.test.js` | escopo por disciplina, PII e bloqueio do perfil aluno |
| `tests/missao007.test.js` | auditoria: acesso, ordem, filtros e ausência de segredo |
| `tests/missao008.test.js` | portal do aluno, redefinição de acesso e troca de senha |
| `tests/endurecimento.test.js` | revogação de token, login endurecido, duplicidade, `sem_dados`, sanitização |

Para inspecionar as garantias do banco:

```bash
cd backend
node scripts/inspecionar-schema.js
```

Se uma execução interrompida deixar a conta de demonstração do aluno com a senha trocada:

```bash
node scripts/restaurar-conta-demo.js
```

## Vulnerabilidades conhecidas

`npm audit` fica em 2 vulnerabilidades **moderadas**, ambas em `uuid`, dentro do
`sequelize`. O `npm audit fix --force` resolveria rebaixando o Sequelize para 3.x
(breaking change não aceitável). O aviso do `uuid` só afeta `v3/v5/v6` quando o
chamador passa um `buf`, o que não acontece no uso deste projeto.
