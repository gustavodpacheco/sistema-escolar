import { Chip } from '@mui/material';

// Missao 003 (notas) e Missao 004 (frequencia) usam as mesmas cores de situacao:
// verde aprovado/boa, amarelo recuperacao/atencao, vermelho reprovado/risco.
// `sem_dados` e neutro: falta lancamento nao e reprovacao.
export const CORES = {
  aprovado: 'success',
  boa: 'success',
  recuperacao: 'warning',
  atencao: 'warning',
  reprovado: 'error',
  risco: 'error',
  sem_dados: 'default',
};

export function Situacao({ nivel, rotulo }) {
  if (!rotulo) return null;
  return <Chip size="small" color={CORES[nivel] || 'default'} label={rotulo} variant={nivel ? 'filled' : 'outlined'} />;
}

export function corDoNivel(nivel) {
  return { aprovado: '#2e7d32', boa: '#2e7d32', recuperacao: '#ef6c00', atencao: '#ef6c00', reprovado: '#c62828', risco: '#c62828', sem_dados: '#757575' }[nivel] || '#555';
}

// Media, maior e menor nota chegam como `null` quando o aluno nao tem lancamento.
export function notaFormatada(valor) {
  return valor === null || valor === undefined ? '—' : Number(valor).toFixed(1);
}
