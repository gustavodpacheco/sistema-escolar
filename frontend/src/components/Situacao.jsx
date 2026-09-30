import { Chip } from '@mui/material';

// Missao 003 (notas) e Missao 004 (frequencia) usam as mesmas cores de situacao:
// verde aprovado/boa, amarelo recuperacao/atencao, vermelho reprovado/risco.
export const CORES = {
  aprovado: 'success',
  boa: 'success',
  recuperacao: 'warning',
  atencao: 'warning',
  reprovado: 'error',
  risco: 'error',
};

export function Situacao({ nivel, rotulo }) {
  if (!rotulo) return null;
  return <Chip size="small" color={CORES[nivel] || 'default'} label={rotulo} variant={nivel ? 'filled' : 'outlined'} />;
}

export function corDoNivel(nivel) {
  return { aprovado: '#2e7d32', boa: '#2e7d32', recuperacao: '#ef6c00', atencao: '#ef6c00', reprovado: '#c62828', risco: '#c62828' }[nivel] || '#555';
}
