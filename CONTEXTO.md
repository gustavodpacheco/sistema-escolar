# Contexto e decisões das missões 003 a 007

## Entregas

- **003:** módulo `notas`, boletim com média e situação.
- **004 e 005:** módulo `frequencias`, com uma presença/falta por aluno e por aula.
- **006:** autenticação JWT, senhas com bcrypt, perfis e rotas protegidas.
- **007:** módulo independente `auditoria`, consultável exclusivamente pelo admin.

## Decisões e riscos

- O token tem duração de 8 horas e deve ser configurado por `JWT_SECRET` em produção.
- A falha ao gravar uma auditoria apenas é registrada no servidor: nunca impede nota ou frequência.
- Senhas e tokens são removidos antes de gravar um evento de auditoria.
- Professores só podem criar, alterar ou excluir notas/frequências das disciplinas em `disciplinas` no seu token.
- Usuários iniciais de demonstração são criados apenas quando a tabela está vazia. Altere `SEED_PASSWORD` fora de ambiente didático.

## Modelo relacional

```text
TURMAS 1 ─── N ALUNOS 1 ─── N NOTAS
                    └──── N FREQUENCIAS

USUARIOS (admin | professor | aluno)
AUDITORIA (usuario_id, usuario_nome, perfil, operacao, recurso, recurso_id, detalhes, criado_em)
```

`FREQUENCIAS.numero_aula` identifica a aula específica; assim, uma chamada de três aulas pode conter três faltas distintas por aluno.
