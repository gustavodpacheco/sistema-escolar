import { useState } from 'react';
import { Alert, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import { api } from '../api.js';

// Missao 008 (banco): a secretaria cria ou redefine o login do aluno.
// A senha e enviada uma vez, guardada apenas como hash e nunca exibida de volta.
export default function AcessoAluno({ token, aluno, onCancelar, onConcluir }) {
  const [form, setForm] = useState({ email: aluno.acesso?.email || aluno.email || '', senha: '' });
  const [mensagem, setMensagem] = useState({ tipo: 'success', texto: '' });

  const salvar = async (evento) => {
    evento.preventDefault();
    setMensagem({ tipo: 'success', texto: '' });
    try {
      await api(token, `/alunos/${aluno.id}/acesso`, { method: 'POST', body: JSON.stringify(form) });
      setForm({ ...form, senha: '' });
      setMensagem({ tipo: 'success', texto: `Acesso de ${aluno.nome} definido. O aluno já pode entrar no portal.` });
      onConcluir();
    } catch (erro) {
      setMensagem({ tipo: 'error', texto: erro.message });
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 2, mt: 1 }}>
      <Typography variant="subtitle1" gutterBottom>
        {aluno.acesso ? 'Redefinir acesso' : 'Criar acesso'} de {aluno.nome}
      </Typography>
      <BoxForm onSubmit={salvar} form={form} setForm={setForm} onCancelar={onCancelar} />
      {mensagem.texto && <Alert severity={mensagem.tipo} sx={{ mt: 2 }}>{mensagem.texto}</Alert>}
    </Paper>
  );
}

function BoxForm({ onSubmit, form, setForm, onCancelar }) {
  return (
    <form onSubmit={onSubmit}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems="center">
        <TextField
          required
          type="email"
          label="E-mail de login"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <TextField
          required
          type="password"
          label="Senha provisória"
          value={form.senha}
          onChange={(e) => setForm({ ...form, senha: e.target.value })}
        />
        <Button type="submit" variant="contained">Salvar acesso</Button>
        <Button onClick={onCancelar}>Cancelar</Button>
      </Stack>
    </form>
  );
}
