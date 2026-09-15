# Persistema - Guia Pedagogico da Missao 002

Este README foi criado para orientar a turma do 3o ano (DS) na Missao 002 sem quebrar o que ja foi entregue na Missao 001.

Objetivo da Missao 002:
- Cadastrar turmas
- Relacionar alunos as turmas
- Consultar alunos por turma

Importante:
- A modularizacao atual esta pronta para receber novos modulos.
- Usem este guia como roteiro de trabalho do squad.

## 1) Como o sistema esta modularizado hoje

Backend:
- Entrada do servidor: backend/src/server.js
- Configuracao de banco: backend/src/config/database.js
- Roteador central: backend/src/routes/index.js
- Modulo alunos (Missao 001):
  - Rotas: backend/src/routes/alunos/routes.js
  - Controller: backend/src/controllers/alunoController.js
  - Model: backend/src/models/Aluno.js

Frontend:
- Entrada React: frontend/src/main.jsx
- Tela principal atual: frontend/src/App.jsx
- Estilos globais: frontend/src/styles.css

Regra de ouro de modularizacao:
- Cada novo modulo deve ter sua propria pasta de rotas e seu proprio controller.
- O arquivo backend/src/routes/index.js deve apenas "plugar" os modulos.

## 2) Arquivos que cada papel deve alterar na Missao 002

### Front-End
Arquivos principais:
- frontend/src/App.jsx

O que alterar:
- Criar interface para cadastro de turma (nome, serie, ano).
- Exibir lista de turmas cadastradas.
- Nao misturar regra de alunos com regra de turmas no mesmo bloco sem separacao.

Boa pratica didatica:
- Separar em funcoes/trechos claros:
  - estado de turma
  - formulario de turma
  - lista de turmas

### Back-End
Arquivos a criar/alterar:
- Criar: backend/src/routes/turmas/routes.js
- Criar: backend/src/controllers/turmaController.js
- Alterar: backend/src/routes/index.js

O que fazer:
- Criar rotas de turmas em modulo separado.
- Criar controller de turmas em arquivo separado.
- Registrar o novo modulo no roteador central.

Exemplo de rotas esperadas (sugestao):
- GET /turmas
- POST /turmas
- POST /turmas/:id/alunos

### Banco de Dados
Arquivos base:
- backend/src/models/Aluno.js (ja existe)

O que projetar na Missao 002:
- Nova entidade TURMA (id, nome, serie, ano)
- Relacao 1:N (1 turma para muitos alunos)

Primeiro em papel/diagrama:
- Entidade TURMA
- Chave estrangeira em ALUNOS (ex: turma_id)

Depois no codigo (fase de implementacao):
- Criar model Turma
- Definir associacoes no Sequelize

### QA
Checklist minimo:
- Cadastro de turma com campos obrigatorios
- Turma salva corretamente
- Vinculo aluno -> turma funcionando
- Consulta de turma com seus alunos
- Nao quebrou cadastro de alunos da Missao 001

## 3) Ordem recomendada de execucao (Sprint)

1. Scrum Master distribui tarefas por papel.
2. Banco faz modelagem no papel (1:N).
3. Back cria modulo de turmas (rotas + controller).
4. Front monta formulario/lista de turmas.
5. QA valida fluxo completo.
6. Squad prepara demo final.

## 4) Contrato entre Front e Back (combinado do squad)

Padrao de request para criar turma:

{
  "nome": "3o DS",
  "serie": "3o Ano",
  "ano": "2026"
}

Padrao de resposta esperada:

{
  "id": 1,
  "nome": "3o DS",
  "serie": "3o Ano",
  "ano": "2026"
}

## 5) Erros comuns que a turma deve evitar

- Colocar todas as rotas no mesmo arquivo.
- Misturar logica de alunos e turmas no mesmo controller.
- Alterar diretamente o server para adicionar regra de negocio.
- Quebrar o endpoint de alunos ja pronto.
- Pular validacao de campos obrigatorios.

## 6) Definicao de pronto da Missao 002

A missao esta pronta quando:
- Existe modulo de turmas separado no backend.
- Front consegue cadastrar e listar turmas.
- Existe relacao turma-aluno validada pelo QA.
- Missao 001 continua funcionando.

## 7) Sugestao de apresentacao final (3 minutos)

1. Problema: alunos sem organizacao por turma.
2. Solucao tecnica: novo modulo "turmas" com rotas e controller proprios.
3. Evidencia: cadastro de turma + vinculacao de aluno + consulta.
4. Aprendizado: separacao de responsabilidades e modularizacao.
