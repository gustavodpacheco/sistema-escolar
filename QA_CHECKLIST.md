# Checklist QA — Missões 003 a 008

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
| Auditoria do portal | Filtrar `LOGIN_SUCESSO`/`LOGIN_RECUSADO` do recurso portal | Eventos sem senha, hash ou token |
| Excluir aluno | Admin exclui um aluno com acesso | `204`; login do aluno passa a dar `401` (conta removida junto) |
| Segredo na interface | Inspecionar a tela de login | Credenciais de demonstração só aparecem ao clicar no botão |
