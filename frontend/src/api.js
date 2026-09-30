// Cliente HTTP do painel. O Vite encaminha /api para o backend (vite.config.js),
// entao o front nunca fala com a porta 3000 diretamente.
export async function api(token, url, options = {}) {
  const resposta = await fetch(`/api${url}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
  });
  const texto = resposta.status === 204 ? '' : await resposta.text();
  let dados = null;
  try {
    dados = texto ? JSON.parse(texto) : null;
  } catch {
    throw new Error(`O servidor respondeu com erro (${resposta.status}). Reinicie o backend e tente novamente.`);
  }
  if (!resposta.ok) throw new Error(dados?.erro || 'Operação não realizada.');
  return dados;
}

export const consultar = (token, url) => api(token, url);
export const enviar = (token, url, method, body) => api(token, url, { method, body: JSON.stringify(body) });
