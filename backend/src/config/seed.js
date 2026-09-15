import bcrypt from 'bcryptjs';
import Usuario from '../models/Usuario.js';

export async function criarUsuariosIniciais() {
  if (await Usuario.count()) return;
  const senha = await bcrypt.hash(process.env.SEED_PASSWORD || '123456', 10);
  await Usuario.bulkCreate([
    { nome: 'Administrador', email: 'admin@escola.com', senha, perfil: 'admin', disciplinas: [] },
    { nome: 'Professora Ana', email: 'ana@escola.com', senha, perfil: 'professor', disciplinas: ['Matematica', 'Front-End'] },
  ]);
  console.log('Usuarios iniciais criados: admin@escola.com e ana@escola.com (senha 123456).');
}
