import { useState } from 'react';
import { Alert, Box, Button, LinearProgress, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { api } from '../api.js';
import { Situacao } from '../components/Situacao.jsx';

// Missao 004 (boss): percentual de frequencia, classificacao e ranking.
// Missao 005 (side quest): historico de chamadas feitas.
export default function ResumoFrequencia({ token, turmas, disciplinas }) {
  const [filtros, setFiltros] = useState({ turma_id: '', disciplina: '' });
  const [painel, setPainel] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [erro, setErro] = useState('');

  const consultar = async () => {
    setErro('');
    try {
      const query = new URLSearchParams(Object.entries(filtros).filter(([, valor]) => valor)).toString();
      const [dados, chamadas] = await Promise.all([
        api(token, `/frequencias/resumo${query ? `?${query}` : ''}`),
        api(token, '/frequencias/historico'),
      ]);
      setPainel(dados);
      setHistorico(chamadas);
    } catch (falha) {
      setErro(falha.message);
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>Painel de frequência</Typography>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField select label="Turma" value={filtros.turma_id} onChange={(e) => setFiltros({ ...filtros, turma_id: e.target.value })} sx={{ minWidth: 200 }}>
          <MenuItem value="">Todas as turmas</MenuItem>
          {turmas.map((turma) => <MenuItem key={turma.id} value={turma.id}>{turma.nome}</MenuItem>)}
        </TextField>
        <TextField select label="Disciplina" value={filtros.disciplina} onChange={(e) => setFiltros({ ...filtros, disciplina: e.target.value })} sx={{ minWidth: 200 }}>
          <MenuItem value="">Todas</MenuItem>
          {disciplinas.map((disciplina) => <MenuItem key={disciplina} value={disciplina}>{disciplina}</MenuItem>)}
        </TextField>
        <Button variant="contained" onClick={consultar}>Consultar</Button>
      </Stack>

      {erro && <Alert severity="error">{erro}</Alert>}

      {painel && (
        <>
          {painel.em_risco.length > 0 && (
            <Alert severity="error" sx={{ mb: 2 }}>
              Alunos abaixo de 75% de frequência: {painel.em_risco.map((linha) => `${linha.aluno_nome} (${linha.percentual}%)`).join(', ')}
            </Alert>
          )}

          <Typography variant="subtitle1" gutterBottom>Ranking de frequência</Typography>
          {painel.ranking.length === 0 ? (
            <Alert severity="info">Nenhum registro de frequência encontrado para o filtro escolhido.</Alert>
          ) : (
            <Paper variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Aluno</TableCell>
                    <TableCell>Turma</TableCell>
                    <TableCell>Aulas</TableCell>
                    <TableCell>Presenças</TableCell>
                    <TableCell>Faltas</TableCell>
                    <TableCell sx={{ width: 220 }}>Percentual</TableCell>
                    <TableCell>Classificação</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {painel.ranking.map((linha) => (
                    <TableRow key={linha.aluno_id}>
                      <TableCell>{linha.aluno_nome}</TableCell>
                      <TableCell>{linha.turma || '—'}</TableCell>
                      <TableCell>{linha.total_aulas}</TableCell>
                      <TableCell>{linha.presencas}</TableCell>
                      <TableCell>{linha.faltas}</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <LinearProgress
                            variant="determinate"
                            value={linha.percentual}
                            sx={{ flex: 1, height: 8, borderRadius: 1 }}
                            color={linha.classificacao.nivel === 'risco' ? 'error' : linha.classificacao.nivel === 'atencao' ? 'warning' : 'success'}
                          />
                          <Typography variant="body2">{linha.percentual}%</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell><Situacao nivel={linha.classificacao.nivel} rotulo={linha.classificacao.rotulo} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          )}

          <Typography variant="subtitle1" sx={{ mt: 3 }} gutterBottom>Histórico de chamadas</Typography>
          {historico.length === 0 ? (
            <Alert severity="info">Nenhuma chamada registrada até agora.</Alert>
          ) : (
            <Paper variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Data</TableCell>
                    <TableCell>Disciplina</TableCell>
                    <TableCell>Plano de aula</TableCell>
                    <TableCell>Aulas</TableCell>
                    <TableCell>Presenças</TableCell>
                    <TableCell>Faltas</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {historico.map((chamada) => (
                    <TableRow key={`${chamada.data_aula}-${chamada.disciplina}`}>
                      <TableCell>{formatarData(chamada.data_aula)}</TableCell>
                      <TableCell>{chamada.disciplina}</TableCell>
                      <TableCell>{chamada.plano_aula || '—'}</TableCell>
                      <TableCell>{chamada.quantidade_aulas}</TableCell>
                      <TableCell>{chamada.presencas}</TableCell>
                      <TableCell>{chamada.faltas}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          )}
        </>
      )}
    </Box>
  );
}

function formatarData(valor) {
  if (!valor) return '—';
  const [ano, mes, dia] = valor.slice(0, 10).split('-');
  return `${dia}/${mes}/${ano}`;
}
