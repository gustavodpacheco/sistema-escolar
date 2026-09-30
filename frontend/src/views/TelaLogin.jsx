import { useState } from 'react';
import { Alert, Box, Button, Container, Divider, Paper, Stack, Tab, Tabs, TextField, Typography } from '@mui/material';

// Missao 006 (equipe: admin/professor) e Missao 008 (portal do aluno).
// Cada perfil entra em um endpoint diferente: o do aluno so aceita conta de aluno.
export default function TelaLogin({ onEntrar }) {
  const [acesso, setAcesso] = useState('equipe');
  const [form, setForm] = useState({ email: '', senha: '' });
  const [erro, setErro] = useState('');
  // Missao 008: nenhuma credencial aparece na interface sem acao do usuario.
  const [mostrarDemo, setMostrarDemo] = useState(false);

  const entrar = async (evento) => {
    evento.preventDefault();
    setErro('');
    const rota = acesso === 'aluno' ? '/alunos/login' : '/login';
    try {
      const resposta = await fetch(`/api${rota}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const dados = await resposta.json().catch(() => null);
      if (!resposta.ok) throw new Error(dados?.erro || 'Não foi possível entrar com essas credenciais.');
      localStorage.setItem('sessao-escolar', JSON.stringify(dados));
      onEntrar(dados);
    } catch (falha) {
      setErro(falha.message);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4">Sistema Escolar</Typography>
        <Typography color="text.secondary">Acesso protegido</Typography>

        <Tabs value={acesso} onChange={(_, valor) => { setAcesso(valor); setErro(''); }} sx={{ mt: 3 }}>
          <Tab label="Equipe (admin/professor)" value="equipe" />
          <Tab label="Aluno" value="aluno" />
        </Tabs>

        {erro && <Alert severity="error" sx={{ mt: 2 }}>{erro}</Alert>}

        <Box component="form" onSubmit={entrar}>
          <Stack spacing={2} sx={{ mt: 3 }}>
            <TextField
              required
              type="email"
              label={acesso === 'aluno' ? 'E-mail do aluno' : 'E-mail'}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <TextField
              required
              type="password"
              label="Senha"
              value={form.senha}
              onChange={(e) => setForm({ ...form, senha: e.target.value })}
            />
            <Button type="submit" variant="contained">Entrar</Button>
          </Stack>
        </Box>

        <Divider sx={{ my: 3 }} />
        <Stack direction="row" spacing={1} alignItems="center">
          <Button size="small" onClick={() => setMostrarDemo(!mostrarDemo)}>
            {mostrarDemo ? 'Ocultar' : 'Ver'} contas de demonstração
          </Button>
          {mostrarDemo && (
            <Typography variant="caption" color="text.secondary">
              {acesso === 'aluno'
                ? 'carlos@escola.com / 123456 e marina@escola.com / 123456'
                : 'admin@escola.com / 123456 e ana@escola.com / 123456'}
            </Typography>
          )}
        </Stack>
      </Paper>
    </Container>
  );
}
