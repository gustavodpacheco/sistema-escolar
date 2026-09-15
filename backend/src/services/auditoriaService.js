import Auditoria from '../models/Auditoria.js';

// Auditoria nunca bloqueia a operacao principal: falhas ficam registradas no servidor.
export async function registrarAuditoria(evento) {
  const seguro = { ...evento };
  delete seguro.senha;
  delete seguro.token;
  try {
    await Auditoria.create(seguro);
  } catch (error) {
    console.error('Auditoria indisponivel:', error.message);
  }
}

export function eventoDoUsuario(usuario, dados) {
  return {
    usuario_id: usuario?.id || null,
    usuario_nome: usuario?.nome || dados.usuario_nome || null,
    perfil: usuario?.perfil || dados.perfil || null,
    ...dados,
  };
}
