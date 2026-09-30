import { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Container, Grid, Paper, Stack, Tab, Table, TableBody, TableCell, TableHead, TableRow,
  Tabs, TextField, Typography,
} from '@mui/material';
import { api } from '../api.js';
import { Situacao } from '../components/Situacao.jsx';

// Missao 008 - Portal do Aluno.
// Tudo aqui e somente leitura: o token carrega o aluno_id e nenhuma tela aceita
// escolher outro aluno. A senha da sessao vive no localStorage da SecureApp.
export default function PortalAluno({ token, usuario, onSair }) {
  const [aba, setAba] = useState(0);
  const [perfil, setPerfil] = useState(null);
  const [boletim, setBoletim] = useState(null);
  const [frequencia, setFrequencia] = useState(null);
  const [senhas, setSenhas] = useState({ senha_atual: '', nova_senha: '', confirmacao: '' });
  const [aviso, setAviso] = useState({ tipo: 'success', texto: '' });

  const recarregar = async () => {
    try {
      const [dadosPerfil, dadosNotas, dadosFrequencia] = await Promise.all([
        api(token, '/aluno/perfil'),
        api(token, '/aluno/notas'),
        api(token, '/aluno/frequencia'),
      ]);
      setPerfil(dadosPerfil);
      setBoletim(dadosNotas);
      setFrequencia(dadosFrequencia);
    } catch (erro) {
      setAviso({ tipo: 'error', texto: erro.message });
    }
  };

  useEffect(() => { recarregar(); }, [token]);

  const trocarSenha = async (evento) => {
    evento.preventDefault();
    setAviso({ tipo: 'success', texto: '' });
    try {
      await api(token, '/aluno/senha', { method: 'PUT', body: JSON.stringify(senhas) });
      setSenhas({ senha_atual: '', nova_senha: '', confirmacao: '' });
      setAviso({ tipo: 'success', texto: 'Senha alterada com sucesso.' });
    } catch (erro) {
      setAviso({ tipo: 'error', texto: erro.message });
    }
  };

  const resumo = frequencia?.resumo;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Stack spacing={3}>
          <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
            <Box>
              <Typography variant="h4">Portal do Aluno</Typography>
              <Typography color="text.secondary">
                {perfil?.nome || usuario.nome} · {perfil?.turma ? `Turma ${perfil.turma.nome}` : 'Sem turma vinculada'}
                {perfil?.serie ? ` · ${perfil.serie}` : ''}
              </Typography>
            </Box>
            <Button variant="outlined" onClick={onSair}>Sair</Button>
          </Box>

          {aviso.texto && <Alert severity={aviso.tipo} onClose={() => setAviso({ ...aviso, texto: '' })}>{aviso.texto}</Alert>}

          <Grid container spacing={2}>
            <Indicador titulo="Média geral" valor={boletim?.media !== undefined ? boletim.media.toFixed(1) : '—'} extra={<Situacao nivel={boletim?.situacao?.nivel} rotulo={boletim?.situacao?.rotulo} />} />
            <Indicador titulo="Frequência" valor={resumo ? `${resumo.percentual}%` : '—'} extra={<Situacao nivel={resumo?.classificacao?.nivel} rotulo={resumo?.classificacao?.rotulo} />} />
            <Indicador titulo="Aulas registradas" valor={resumo ? resumo.total_aulas : '—'} extra={resumo ? `${resumo.presencas} presenças · ${resumo.faltas} faltas` : ''} />
          </Grid>

          <Tabs value={aba} onChange={(_, valor) => setAba(valor)}>
            <Tab label="Minhas notas" />
            <Tab label="Minha frequência" />
            <Tab label="Minha senha" />
          </Tabs>

          {aba === 0 && <AbaNotas boletim={boletim} />}
          {aba === 1 && <AbaFrequencia frequencia={frequencia} />}
          {aba === 2 && (
            <Box component="form" onSubmit={trocarSenha} sx={{ maxWidth: 420 }}>
              <Typography variant="h6" gutterBottom>Alterar minha senha</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Por segurança é preciso informar a senha atual. Nenhum valor de senha é gravado na auditoria.
              </Typography>
              <Stack spacing={2}>
                <TextField required type="password" label="Senha atual" value={senhas.senha_atual} onChange={(e) => setSenhas({ ...senhas, senha_atual: e.target.value })} />
                <TextField required type="password" label="Nova senha" value={senhas.nova_senha} onChange={(e) => setSenhas({ ...senhas, nova_senha: e.target.value })} />
                <TextField required type="password" label="Confirmar nova senha" value={senhas.confirmacao} onChange={(e) => setSenhas({ ...senhas, confirmacao: e.target.value })} />
                <Button type="submit" variant="contained">Salvar nova senha</Button>
              </Stack>
            </Box>
          )}
        </Stack>
      </Paper>
    </Container>
  );
}

function Indicador({ titulo, valor, extra }) {
  return (
    <Grid item xs={12} md={4}>
      <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary">{titulo}</Typography>
        <Typography variant="h4">{valor}</Typography>
        {extra}
      </Paper>
    </Grid>
  );
}

function AbaNotas({ boletim }) {
  if (!boletim) return <Alert severity="info">Carregando suas notas…</Alert>;
  if (!boletim.notas.length) return <Alert severity="info">Você ainda não possui notas lançadas. Volte depois que a escola lançar o primeiro bimestre.</Alert>;
  return (
    <Box>
      <Typography variant="h6" gutterBottom>Minhas notas</Typography>
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
      <Alert severity={boletim.situacao.nivel === 'aprovado' ? 'success' : boletim.situacao.nivel === 'recuperacao' ? 'warning' : 'error'} sx={{ mt: 2 }}>
        Média geral {boletim.media.toFixed(1)} · {boletim.situacao.rotulo} · média da turma {Number(boletim.media_turma).toFixed(1)}
      </Alert>
    </Box>
  );
}

function AbaFrequencia({ frequencia }) {
  if (!frequencia) return <Alert severity="info">Carregando sua frequência…</Alert>;
  const { resumo, chamadas, registros } = frequencia;
  if (!registros.length) return <Alert severity="info">Você ainda não possui registros de frequência. Nenhuma chamada foi lançada para você até agora.</Alert>;
  return (
    <Box>
      <Typography variant="h6" gutterBottom>Resumo da minha frequência</Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
        <Typography variant="body2">Total de aulas: <b>{resumo.total_aulas}</b></Typography>
        <Typography variant="body2">Presenças: <b>{resumo.presencas}</b></Typography>
        <Typography variant="body2">Faltas: <b>{resumo.faltas}</b></Typography>
        <Typography variant="body2">Percentual: <b>{resumo.percentual}%</b></Typography>
        <Situacao nivel={resumo.classificacao.nivel} rotulo={resumo.classificacao.rotulo} />
      </Stack>

      <Typography variant="subtitle1" gutterBottom>Minhas chamadas</Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Data</TableCell>
            <TableCell>Disciplina</TableCell>
            <TableCell>Aulas</TableCell>
            <TableCell>Presenças</TableCell>
            <TableCell>Faltas</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {chamadas.map((chamada) => (
            <TableRow key={`${chamada.data_aula}-${chamada.disciplina}`}>
              <TableCell>{formatarData(chamada.data_aula)}</TableCell>
              <TableCell>{chamada.disciplina}</TableCell>
              <TableCell>{chamada.quantidade_aulas}</TableCell>
              <TableCell>{chamada.presencas}</TableCell>
              <TableCell>{chamada.faltas}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Typography variant="subtitle1" sx={{ mt: 3 }} gutterBottom>Registro aula a aula</Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Data</TableCell>
            <TableCell>Disciplina</TableCell>
            <TableCell>Aula nº</TableCell>
            <TableCell>Presença</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {registros.map((registro) => (
            <TableRow key={registro.id}>
              <TableCell>{formatarData(registro.data_aula)}</TableCell>
              <TableCell>{registro.disciplina}</TableCell>
              <TableCell>{registro.numero_aula}</TableCell>
              <TableCell>{Number(registro.presente) === 1 ? 'Presente' : 'Falta'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}

function formatarData(valor) {
  if (!valor) return '—';
  const [ano, mes, dia] = valor.slice(0, 10).split('-');
  return `${dia}/${mes}/${ano}`;
}
