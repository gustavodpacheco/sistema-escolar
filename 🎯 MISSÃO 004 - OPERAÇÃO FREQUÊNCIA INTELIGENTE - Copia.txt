🎯 MISSÃO 004 - OPERAÇÃO FREQUÊNCIA INTELIGENTE
DS QUEST MASTER
Sprint 04 - Quem Está Frequentando as Aulas?
📖 CONTEXTO

O sistema da escola já consegue:

✅ Cadastrar alunos

✅ Organizar turmas

✅ Registrar notas

Mas um novo problema apareceu.

A coordenação descobriu que alguns alunos estão faltando muito e ninguém percebeu a tempo.

A direção precisa acompanhar a frequência dos estudantes antes que o problema afete o desempenho escolar.

Sua Software House recebeu uma nova solicitação:

"Precisamos controlar a presença dos alunos e identificar rapidamente quem está com baixa frequência."

🎯 MISSÃO

Criar o primeiro módulo de controle de frequência.

O sistema deverá permitir:

✅ Registrar presença

✅ Registrar ausência

✅ Consultar frequência dos alunos

✅ Identificar alunos com baixa presença

👥 RESPONSABILIDADES DO SQUAD
🎨 Desenvolvedor Front-End

Criar uma tela de chamada contendo:

Registro de Frequência

Campos:

Aluno
Data
Presente (Sim/Não)
Botão Registrar

Além disso, exibir uma tabela com as presenças registradas.

⚙️ Desenvolvedor Back-End

Criar estrutura JavaScript para armazenar:

Aluno
Data
Presença


Exemplo:

João
26/08/2026
Presente


Deve permitir:

Adicionar frequência
Contar presenças
Contar faltas
🗄️ Desenvolvedor Banco de Dados

Criar a modelagem:

FREQUENCIAS
id
aluno_id
data_aula
presente


Relacionamento:

Aluno
↓
Possui
↓
Muitos Registros de Frequência


Criar o diagrama atualizado.

🧪 Desenvolvedor QA

Criar checklist:

Validação

✅ Registro de presença funciona

✅ Registro de falta funciona

✅ Data preenchida

✅ Aluno selecionado

✅ Quantidade de registros correta

✅ Sem duplicações

📋 Scrum Master

Responsável por:

Controlar a Sprint
Organizar entregas
Garantir integração do projeto
Coordenar a apresentação
🏆 CRITÉRIOS DE VITÓRIA

O Squad deverá apresentar:

✅ Tela de frequência

✅ Estrutura JavaScript funcionando

✅ Modelo de banco de dados

✅ Checklist de testes

✅ Apresentação final

💡 DICAS PROGRESSIVAS
Dica 1

Como contar presenças e faltas?

Pesquise:

contador javascript

Dica 2

Como armazenar datas?

Pesquise:

new Date()

Dica 3

Como calcular percentual?

Pesquise:

calcular porcentagem javascript

👑 BOSS CHALLENGE

Após concluir a missão principal:

Nível 1

Calcular automaticamente:

% de frequência do aluno

Nível 2

Classificar:

🟢 Frequência Boa

🟡 Atenção

🔴 Risco de Reprovação

Nível 3

Criar alerta:

Aluno abaixo de 75%

Nível 4

Criar ranking das melhores frequências da turma.

🎮 SISTEMA DE XP
Atividade	XPFront-End concluído	+100
Back-End concluído	+100
Banco concluído	+100
QA concluído	+50
Apresentação	+50
Boss Challenge	+100
🏆 XP Total

500 XP

🚀 SIDE QUESTS (PARA GRUPOS RÁPIDOS)
Side Quest 1

Criar painel do coordenador.

Side Quest 2

Mostrar frequência por turma.

Side Quest 3

Criar gráfico de presença.

Side Quest 4

Criar relatório dos alunos em risco.

Side Quest 5

Adicionar filtro por data.

🎤 APRESENTAÇÃO FINAL

Cada Squad terá:

3 minutos

Para explicar:

Como registraram as presenças?
Como calcularam a frequência?
Como identificaram alunos em risco?
Qual foi a principal dificuldade?
Como resolveram o problema?
📊 MENÇÃO DA MISSÃO
🏆 MB

Missão completa + Boss Challenge

✅ B

Missão completa

⚠️ R

Missão parcialmente concluída

❌ I

Sem entrega

📅 PREPARANDO A PRÓXIMA MISSÃO

Ao final da apresentação, faça a provocação:

"Agora a escola consegue cadastrar alunos, organizar turmas, registrar notas e controlar frequência.

Mas quem pode acessar essas informações?

Será que qualquer pessoa deveria conseguir entrar no sistema?

Na próxima missão, vocês terão que proteger a escola criando o sistema de Login e Controle de Acesso."

🔥 FRASE DE ABERTURA

"Uma escola sem controle de frequência é como um aplicativo sem usuários.

Os dados existem, mas ninguém sabe quem realmente está participando.

Hoje o desafio é descobrir quem está presente e quem está desaparecendo do sistema." 🚀