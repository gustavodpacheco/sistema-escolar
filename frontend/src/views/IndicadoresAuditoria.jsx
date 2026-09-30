import { useEffect, useState } from 'react';
import { Alert, Box, Button, Grid, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { api } from '../api.js';

// Boss challenge da Missao 007: painel de indicadores de confianca.
export default function IndicadoresAuditoria({ token }) {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');

  const consultar = async () => {
    setErro('');
    try {
      setDados(await api(token, '/auditoria/indicadores'));
    } catch (falha) {
      setErro(falha.message);
    }
  };

  useEffect(() => { consultar(); }, [token]);

  if (erro) return <Alert severity="error">{erro}</Alert>;
  if (!dados) return <Alert severity="info">Carregando indicadores…</Alert>;

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h6">Indicadores das últimas 24h</Typography>
        <Button variant="outlined" onClick={consultar}>Atualizar</Button>
      </Stack>

      {dados.alertas.length > 0 && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {dados.alertas.map((alerta) => alerta.aviso).join(' ')}
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Cartao titulo="Eventos registrados" valor={dados.total_eventos} />
        <Cartao titulo="Logins recusados" valor={dados.logins_recusados_24h} alerta={dados.logins_recusados_24h > 0} />
        <Cartao titulo="Usuários ativos" valor={dados.usuarios.length} />
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={5}>
          <Typography variant="subtitle1" gutterBottom>Eventos por operação</Typography>
          <Paper variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow><TableCell>Operação</TableCell><TableCell align="right">Total</TableCell></TableRow>
              </TableHead>
              <TableBody>
                {dados.por_operacao.map((item) => (
                  <TableRow key={item.operacao}>
                    <TableCell>{item.operacao}</TableCell>
                    <TableCell align="right">{item.total}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </Grid>

        <Grid item xs={12} md={7}>
          <Typography variant="subtitle1" gutterBottom>Último acesso por usuário</Typography>
          <Paper variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Usuário</TableCell>
                  <TableCell>Perfil</TableCell>
                  <TableCell>Último acesso</TableCell>
                  <TableCell align="right">Recusados 24h</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {dados.usuarios.map((usuario) => (
                  <TableRow key={usuario.usuario_nome}>
                    <TableCell>{usuario.usuario_nome}</TableCell>
                    <TableCell>{usuario.perfil || '—'}</TableCell>
                    <TableCell>{new Date(usuario.ultimo_acesso).toLocaleString('pt-BR')}</TableCell>
                    <TableCell align="right">{usuario.logins_recusados_24h}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

function Cartao({ titulo, valor, alerta }) {
  return (
    <Grid item xs={12} md={4}>
      <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderColor: alerta ? 'error.main' : undefined }}>
        <Typography variant="caption" color="text.secondary">{titulo}</Typography>
        <Typography variant="h4" color={alerta ? 'error.main' : 'text.primary'}>{valor}</Typography>
      </Paper>
    </Grid>
  );
}
