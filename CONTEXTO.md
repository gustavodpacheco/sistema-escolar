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
- O token tem duração de 8 horas e deve ser configurado por `JWT_SECRET` em produção.
- Senhas, hashes e tokens são removidos antes de gravar um evento de auditoria.
- A falha ao gravar uma auditoria apenas é registrada no servidor: nunca impede nota ou frequência.
- Professores só podem criar, alterar ou excluir notas/frequências das disciplinas em `disciplinas` no seu token.
- Seed idempotente: pode rodar em todo boot sem duplicar alunos, notas ou contas.
- Riscos abertos: não há e-mail de recuperação de senha (a redefinição é feita pela
  secretaria) e o `JWT_SECRET` de desenvolvimento é fixo — trocar em produção invalida sessões.

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

37 testes automatizados cobrem 003, 004/005, 006, 007, 008 e o bloqueio de escopo
(`aluno_id` forjado, escrita negada ao aluno, ausência de hash nas respostas e na auditoria).
