// Restaura a conta de demonstracao do aluno: a suite altera a senha ao testar a
// revogacao de token, e uma execucao interrompida deixa o banco fora do estado
// esperado para a proxima.
import bcrypt from 'bcryptjs';
import sequelize from '../src/config/database.js';
import Usuario from '../src/models/Usuario.js';

const email = process.argv[2] || process.env.SEED_USER_ALUNO || 'carlos@escola.com';
const senha = process.argv[3] || process.env.SEED_PASSWORD || '123456';

await sequelize.authenticate();
const conta = await Usuario.findOne({ where: { email } });
if (!conta) {
  console.log(`Conta ${email} nao encontrada.`);
} else {
  await conta.update({ senha: await bcrypt.hash(senha, 10), token_version: 0 });
  console.log(`Senha de ${email} restaurada e token_version zerado.`);
}
await sequelize.close();