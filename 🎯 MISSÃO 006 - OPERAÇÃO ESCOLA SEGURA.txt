🎯 MISSÃO 005 - OPERAÇÃO ESCOLA SEGURA
DS QUEST MASTER
Sprint 05 - Protegendo o Sistema com Login e JWT
📖 CONTEXTO

O sistema da escola já possui:

✅ Cadastro de alunos

✅ Cadastro de turmas

✅ Controle de notas

✅ Controle de frequência

Mas surgiu um problema grave.

Qualquer pessoa consegue acessar o sistema.

A coordenação descobriu que informações de alunos, notas e frequência estão completamente desprotegidas.

A diretora entrou em contato com a Software House e fez uma exigência:

"Precisamos garantir que apenas usuários autorizados possam entrar no sistema."

Hoje vocês assumem o papel de Especialistas em Segurança Digital.

🎯 MISSÃO

Criar a primeira versão do sistema de autenticação da escola.

O sistema deverá:

✅ Permitir login

✅ Validar usuário e senha

✅ Gerar um Token JWT

✅ Garantir acesso apenas para usuários autenticados

✅ Exibir uma área protegida

👥 RESPONSABILIDADES DO SQUAD
🎨 Desenvolvedor Front-End

Criar a tela de Login.

Campos:

E-mail
Senha
Botão Entrar

Após login:

Mostrar mensagem de sucesso
Redirecionar para Dashboard
⚙️ Desenvolvedor Back-End

Criar API de autenticação.

Rota:

POST /login


Receber:

{
  "email": "admin@escola.com",
  "senha": "123456"
}


Retornar:

{
  "token": "jwt..."
}

🗄️ Desenvolvedor Banco de Dados

Modelar tabela:

USUARIOS
id
nome
email
senha
perfil


Perfis:

admin
professor
aluno


Criar MER atualizado.

🧪 Desenvolvedor QA

Testar:

✅ Login válido

✅ Login inválido

✅ Senha incorreta

✅ E-mail inexistente

✅ Token gerado

✅ Área protegida funcionando

Criar checklist.

📋 Scrum Master

Responsável por:

Distribuir tarefas
Organizar Sprint
Controlar tempo
Coordenar apresentação
🎓 MOMENTO DE DESCOBERTA

O professor NÃO explica JWT imediatamente.

Antes da implementação, o Squad deverá responder:

Problema 1

Como um site sabe que você está logado?

Problema 2

O que acontece depois que você faz login no Instagram?

Problema 3

Como o sistema sabe quem é você em cada página?

Problema 4

Como impedir que qualquer pessoa veja as notas dos alunos?

Após a discussão, o professor apresenta o conceito de:

✅ Autenticação

✅ Autorização

✅ Token

✅ JWT

🏆 CRITÉRIOS DE VITÓRIA

O Squad deverá apresentar:

✅ Tela de Login

✅ API de Login

✅ Geração de Token JWT

✅ Área protegida

✅ Modelagem do Banco

✅ Checklist QA

✅ Apresentação Final

💡 DICAS PROGRESSIVAS
Dica 1

Pesquise:

jsonwebtoken npm

Dica 2

Pesquise:

jwt.sign()

Dica 3

Pesquise:

jwt.verify()

👑 BOSS CHALLENGE

Após concluir a missão:

Nível 1

Criar Logout.

Nível 2

Exibir nome do usuário logado.

Nível 3

Restringir páginas por perfil.

Exemplo:

Admin pode tudo

Professor pode lançar notas

Aluno apenas consulta

Nível 4

Bloquear acesso direto à URL protegida.

Nível 5

Criar middleware JWT.

🎮 SISTEMA DE XP
Atividade	XPFront-End concluído	+100
Back-End concluído	+100
Banco concluído	+100
QA concluído	+50
Apresentação	+50
Boss Challenge	+100
🏆 XP Total

500 XP

🚀 SIDE QUESTS (GRUPOS RÁPIDOS)
Side Quest 1

Adicionar:

Mostrar foto do usuário

Side Quest 2

Criar página:

Meu Perfil

Side Quest 3

Criar recuperação de senha.

Side Quest 4

Criar tela:

Acesso Negado

Side Quest 5

Implementar criptografia de senha usando:

bcrypt

🎤 APRESENTAÇÃO FINAL

Cada Squad terá:

3 minutos

Para demonstrar:

Como o login funciona?
Onde o token é criado?
Como a rota protegida funciona?
O que acontece quando o usuário não possui permissão?
Como o JWT aumenta a segurança?
📊 MENÇÃO DA MISSÃO
🏆 MB

Login completo + JWT + Boss Challenge

✅ B

Login + JWT funcionando

⚠️ R

Login parcial ou sem proteção

❌ I

Sem entrega

🔥 FRASE DE ABERTURA

"Imagine que qualquer pessoa pudesse entrar na secretaria da escola e alterar notas, faltas e dados dos alunos.

Seria um desastre.

Hoje vocês não são apenas desenvolvedores.

Hoje vocês são a equipe responsável por proteger todo o sistema da escola." 🔐🚀

Conhecimentos que os alunos descobrirão durante a missão
Front-End
Formulários
Captura de dados
Fetch API
LocalStorage
Back-End
Rotas
Middleware
JWT
Autenticação
Autorização
Banco de Dados
Usuários
Perfis
Relacionamentos
Projeto Final

Ao concluir esta missão, os Squads terão um sistema escolar com:

✅ Alunos
 ✅ Turmas
 ✅ Notas
 ✅ Frequência
 ✅ Login
 ✅ Segurança JWT

ficando prontos para as próximas sprints de Dashboard, Relatórios e Deploy Final. 🚀