// Guarda de rota: nenhuma página do portal renderiza dados sem sessão válida.
//
// Toda página protegida (dashboard, pedidos, relatorios, admin) deve chamar
// exigirSessao() antes de buscar ou exibir qualquer dado. Sem sessão válida,
// o usuário é redirecionado para login.html.

import { supabaseClient } from './supabaseClient.js';

const PAGINA_LOGIN = 'login.html';

/**
 * Garante que existe uma sessão Supabase válida. Redireciona para o login
 * caso contrário. Retorna a sessão (ou null se redirecionou).
 */
export async function exigirSessao() {
  try {
    const { data, error } = await supabaseClient.auth.getSession();

    if (error) throw error;

    if (!data.session) {
      redirecionarParaLogin();
      return null;
    }

    return data.session;
  } catch (erro) {
    console.error('Falha ao verificar sessão:', erro);
    redirecionarParaLogin();
    return null;
  }
}

/**
 * Encerra a sessão no Supabase (servidor) e redireciona para o login.
 * Nunca apenas limpa estado local — o token precisa ser invalidado no servidor.
 */
export async function encerrarSessao() {
  try {
    const { error } = await supabaseClient.auth.signOut();
    if (error) throw error;
  } catch (erro) {
    console.error('Falha ao encerrar sessão:', erro);
  } finally {
    redirecionarParaLogin();
  }
}

/**
 * Reage a mudanças de sessão (ex.: expiração, logout em outra aba) enquanto
 * a página estiver aberta, redirecionando ao login se a sessão terminar.
 */
export function observarSessao() {
  supabaseClient.auth.onAuthStateChange((evento) => {
    if (evento === 'SIGNED_OUT') {
      redirecionarParaLogin();
    }
  });
}

function redirecionarParaLogin() {
  window.location.href = PAGINA_LOGIN;
}
