// Inicialização compartilhada de toda página protegida do portal:
// 1. Exige sessão válida (redireciona ao login se ausente).
// 2. Monta o menu conforme o papel do usuário.
// 3. Liga o botão de logout (encerra sessão no Supabase, não só no navegador).
// 4. Exibe o e-mail do usuário autenticado no cabeçalho.

import { exigirSessao, encerrarSessao, observarSessao } from './auth-guard.js';
import { montarMenu } from './nav.js';

/**
 * Deve ser chamada no início de cada página protegida.
 * Retorna { sessao, papel } ou null se o usuário foi redirecionado ao login.
 */
export async function inicializarPortal() {
  const sessao = await exigirSessao();
  if (!sessao) return null;

  observarSessao();

  const papel = await montarMenu();
  ligarBotaoSair();
  exibirEmailUsuario(sessao);

  return { sessao, papel };
}

function ligarBotaoSair() {
  const botaoSair = document.querySelector('[data-acao="sair"]');
  if (!botaoSair) return;

  botaoSair.addEventListener('click', async () => {
    botaoSair.disabled = true;
    await encerrarSessao();
  });
}

function exibirEmailUsuario(sessao) {
  const emailEl = document.querySelector('[data-usuario-email]');
  if (!emailEl) return;
  emailEl.textContent = sessao.user.email;
}
