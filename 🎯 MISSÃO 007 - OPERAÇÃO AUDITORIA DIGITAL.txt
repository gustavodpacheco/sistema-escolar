🎯 MISSÃO 007 - OPERAÇÃO AUDITORIA DIGITAL
DS QUEST MASTER
Sprint 07 - Rastreamento, Perfis e Evidências de Segurança

📖 CONTEXTO

O sistema escolar agora possui login, JWT e rotas protegidas. Porém, a direção
precisa responder perguntas importantes:

- Quem entrou no sistema?
- Quando uma nota ou frequência foi alterada?
- Qual perfil realizou a operação?
- Como provar que um professor não acessou dados de outra disciplina?

Nesta semana, o Squad atuará como equipe de Auditoria e Confiabilidade.

🎯 MISSÃO

Criar uma camada de auditoria para registrar operações importantes do sistema
e tornar o controle de acesso demonstrável.

O sistema deverá:

✅ Registrar login bem-sucedido e login recusado
✅ Registrar criação, edição e exclusão de notas
✅ Registrar criação, edição e exclusão de frequências
✅ Guardar usuário, perfil, operação, recurso, identificador e data/hora
✅ Permitir consulta dos registros apenas para o perfil admin
✅ Exibir uma tela de auditoria com busca por usuário, operação e período

👥 RESPONSABILIDADES DO SQUAD

🎨 Desenvolvedor Front-End

Criar a tela "Auditoria" no painel administrativo, contendo:

- tabela com data/hora, usuário, perfil, operação e recurso;
- busca global;
- filtro por operação;
- filtro por período;
- mensagem clara quando não houver registros.

⚙️ Desenvolvedor Back-End

Criar o módulo separado de auditoria com model, controller e rotas.

Rotas sugeridas:

GET /auditoria

A rota deve:

- exigir token válido;
- permitir acesso somente ao perfil admin;
- aceitar filtros por usuario, operacao, recurso, inicio e fim;
- ordenar os eventos do mais recente para o mais antigo.

O registro deve acontecer sem interromper a operação principal quando a auditoria
estiver temporariamente indisponível.

🗄️ Desenvolvedor Banco de Dados

Criar a tabela AUDITORIA:

- id
- usuario_id (quando existir)
- usuario_nome
- perfil
- operacao
- recurso
- recurso_id
- detalhes
- criado_em

Criar índices para criado_em, operacao e recurso.

🧪 Desenvolvedor QA

Criar checklist e testes automatizados para:

✅ Login válido gera evento de auditoria
✅ Login inválido gera evento sem armazenar senha
✅ Admin consulta a auditoria
✅ Professor recebe 403 ao consultar a auditoria
✅ Usuário sem token recebe 401
✅ Cadastro de nota gera evento
✅ Exclusão de frequência gera evento
✅ Filtros retornam somente os eventos esperados
✅ Nenhum registro contém senha ou token completo

📋 Scrum Master

- dividir as tarefas por módulo;
- acompanhar a definição de pronto;
- organizar a demonstração com evidências;
- registrar riscos e decisões no CONTEXTO.md.

🏆 CRITÉRIOS DE VITÓRIA

A missão está pronta quando:

✅ Existe módulo de auditoria separado
✅ A API registra as operações definidas
✅ Somente admin consulta os eventos
✅ A tela exibe busca e filtros
✅ Os testes comprovam 401, 403 e sucesso
✅ A apresentação mostra um fluxo real do login até a consulta do evento
✅ Nenhuma senha ou token é armazenado no log

💡 BOSS CHALLENGE

Criar um painel de indicadores com:

- total de eventos por operação;
- logins recusados nas últimas 24 horas;
- último acesso de cada usuário;
- alerta para várias tentativas recusadas do mesmo usuário.

🎓 PERGUNTAS PARA DISCUSSÃO

1. Por que guardar o token inteiro em um log seria um risco?
2. Qual é a diferença entre autenticação, autorização e auditoria?
3. Por que a auditoria não deve impedir o cadastro de uma nota?
4. Que informações são necessárias para investigar uma alteração?
