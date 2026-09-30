import { useState } from 'react';
import { Alert, Box, Button, Grid, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { api } from '../api.js';
import { Situacao } from '../components/Situacao.jsx';

// Missao 003 (boss challenge): mini boletim com media, maior, menor,
// media da turma e situacao do aluno escolhido.
export default function Boletim({ token, alunos }) {
  const [alunoId, setAlunoId] = useState('');
  const [boletim, setBoletim] = useState(null);
  const [erro, setErro] = useState('');

  const consultar = async () => {
    if (!alunoId) return;
    setErro('');
    try {
      setBoletim(await api(token, `/notas/boletim/${alunoId}`));
    } catch (falha) {
      setBoletim(null);
      setErro(falha.message);
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>Boletim do aluno</Typography>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }} alignItems="center">
        <TextField select label="Aluno" value={alunoId} onChange={(e) => setAlunoId(e.target.value)} sx={{ minWidth: 260 }}>
          {alunos.map((aluno) => <MenuItem key={aluno.id} value={aluno.id}>{aluno.nome}</MenuItem>)}
        </TextField>
        <Button variant="contained" onClick={consultar} disabled={!alunoId}>Consultar boletim</Button>
      </Stack>

      {erro && <Alert severity="error">{erro}</Alert>}
      {!alunoId && !erro && <Alert severity="info">Escolha um aluno para consultar o boletim.</Alert>}
      {boletim && !boletim.notas.length && <Alert severity="info">Este aluno ainda não possui notas lançadas.</Alert>}

      {boletim?.notas.length > 0 && (
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Cartao titulo="Média geral" valor={boletim.media.toFixed(1)} extra={<Situacao nivel={boletim.situacao.nivel} rotulo={boletim.situacao.rotulo} />} />
          <Cartao titulo="Maior nota" valor={Number(boletim.maior_nota).toFixed(1)} />
          <Cartao titulo="Menor nota" valor={Number(boletim.menor_nota).toFixed(1)} />
          <Cartao titulo="Média da turma" valor={Number(boletim.media_turma).toFixed(1)} />
        </Grid>
      )}

      {boletim?.notas.length > 0 && (
        <Paper variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Disciplina</TableCell>
                <TableCell>Bimestre</TableCell>
                <TableCell>Nota</TableCell>
                <TableCell>Situação</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {boletim.notas.map((nota) => (
                <TableRow key={nota.id}>
                  <TableCell>{nota.disciplina}</TableCell>
                  <TableCell>{nota.bimestre}</TableCell>
                  <TableCell>{Number(nota.nota).toFixed(1)}</TableCell>
                  <TableCell><Situacao nivel={nota.situacao.nivel} rotulo={nota.situacao.rotulo} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      {boletim?.por_disciplina?.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle1" gutterBottom>Média por disciplina</Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {boletim.por_disciplina.map((item) => (
              <Paper key={item.disciplina} variant="outlined" sx={{ p: 1.5 }}>
                <Typography variant="body2">{item.disciplina}</Typography>
                <Typography variant="h6">{item.media.toFixed(1)}</Typography>
                <Situacao nivel={item.situacao.nivel} rotulo={item.situacao.rotulo} />
              </Paper>
            ))}
          </Stack>
        </Box>
      )}
    </Box>
  );
}

function Cartao({ titulo, valor, extra }) {
  return (
    <Grid item xs={6} md={3}>
      <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary">{titulo}</Typography>
        <Typography variant="h5">{valor}</Typography>
        {extra}
      </Paper>
    </Grid>
  );
}
