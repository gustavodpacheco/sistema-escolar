# Checklist QA — Missões 003 a 007

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
