import rateLimit from 'express-rate-limit';

// Os limites sao lidos a cada requisicao (e nao na subida do modulo) para que os
// testes e o ambiente de demonstracao possam subir o teto via .env sem afrouxar o default.
const numero = (variavel, padrao) => {
  const valor = Number(process.env[variavel]);
  return Number.isFinite(valor) && valor > 0 ? valor : padrao;
};

const respostaDeBloqueio = (mensagem) => (req, res) =>
  res.status(429).json({ erro: mensagem, dica: 'Aguarde a janela e tente novamente.' });

// Missao 005 (side quest) e Missao 006: sem isso qualquer um testa senhas em
// velocidade e ainda inunda a tabela de auditoria com recusas.
export const limiteDeLogin = rateLimit({
  windowMs: numero('LOGIN_RATE_WINDOW_MS', 15 * 60 * 1000),
  limit: () => numero('LOGIN_RATE_MAX', 20),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  // Só tentativas recusadas contam: quem acerta a senha não gasta a cota.
  skipSuccessfulRequests: true,
  handler: respostaDeBloqueio('Muitas tentativas de login. Espere alguns minutos.'),
});

// Cota generosa para o resto da API, apenas contra abuso acidental.
export const limiteGeral = rateLimit({
  windowMs: 60 * 1000,
  limit: () => numero('API_RATE_MAX', 600),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: respostaDeBloqueio('Excesso de requisicoes. Aguarde um instante.'),
});
