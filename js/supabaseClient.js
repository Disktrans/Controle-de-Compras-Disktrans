// Cliente único do Supabase, compartilhado por todas as páginas do portal.
//
// O SDK (@supabase/supabase-js) é carregado via <script> com SRI no <head> de
// cada página (ver login.html/dashboard.html/etc.), expondo o global
// `window.supabase`. Este módulo cria o client uma única vez e o exporta
// para os demais módulos ES6.

import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

if (!window.supabase || typeof window.supabase.createClient !== 'function') {
  throw new Error('SDK do Supabase não carregado. Verifique o <script> no <head> da página.');
}

export const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
