// Monta o menu de navegação conforme o papel do usuário logado.
//
// IMPORTANTE: isto é só conveniência de interface — esconder/mostrar itens de
// menu não é controle de acesso. A autorização real de cada operação (ler,
// aprovar, administrar) está garantida pelas políticas de RLS no Supabase.

import { supabaseClient } from './supabaseClient.js';

const ITENS_POR_PAPEL = {
  solicitante: ['dashboard', 'pedidos'],
  aprovador: ['dashboard', 'pedidos', 'relatorios'],
  admin: ['dashboard', 'pedidos', 'relatorios', 'admin'],
};

const ROTULOS_PAPEL = {
  solicitante: 'Solicitante',
  aprovador: 'Aprovador',
  admin: 'Administrador',
};

/**
 * Busca o papel do usuário autenticado (via RPC get_my_role, que só lê o
 * papel do próprio chamador) e ajusta a visibilidade dos itens de menu com
 * atributo [data-papel-item] marcados na página atual.
 *
 * Retorna o papel (string) ou null em caso de falha.
 */
export async function montarMenu() {
  try {
    const { data: papel, error } = await supabaseClient.rpc('get_my_role');

    if (error) throw error;

    aplicarVisibilidadeMenu(papel);
    aplicarRotuloPapel(papel);
    marcarLinkAtivo();

    return papel;
  } catch (erro) {
    console.error('Falha ao carregar papel do usuário:', erro);
    return null;
  }
}

function aplicarVisibilidadeMenu(papel) {
  const itensPermitidos = ITENS_POR_PAPEL[papel] ?? [];

  document.querySelectorAll('[data-papel-item]').forEach((item) => {
    const chave = item.getAttribute('data-papel-item');
    item.hidden = !itensPermitidos.includes(chave);
  });
}

function aplicarRotuloPapel(papel) {
  const rotuloEl = document.querySelector('[data-papel-rotulo]');
  if (!rotuloEl) return;
  rotuloEl.textContent = ROTULOS_PAPEL[papel] ?? 'Usuário';
}

function marcarLinkAtivo() {
  const paginaAtual = window.location.pathname.split('/').pop();

  document.querySelectorAll('.menu__link').forEach((link) => {
    const destino = link.getAttribute('href');
    link.classList.toggle('menu__link--ativo', destino === paginaAtual);
  });
}
