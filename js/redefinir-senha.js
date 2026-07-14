// Página de destino do link de recuperação de senha enviado por e-mail.
// O supabase-js detecta o token na URL automaticamente (detectSessionInUrl)
// e dispara o evento PASSWORD_RECOVERY antes de liberarmos o formulário.

import { supabaseClient } from './supabaseClient.js';

const MENSAGEM_ERRO_GENERICA = 'Não foi possível concluir a operação. Tente novamente.';
const MENSAGEM_LINK_INVALIDO =
  'Este link de recuperação é inválido ou expirou. Solicite um novo link na tela de login.';
const MENSAGEM_SENHAS_DIFERENTES = 'As senhas informadas não coincidem.';

const form = document.querySelector('[data-form="redefinir-senha"]');
const mensagemStatus = document.getElementById('mensagem-status');

let sessaoDeRecuperacaoValida = false;

inicializar();

function inicializar() {
  form.querySelector('button[type="submit"]').disabled = true;

  supabaseClient.auth.onAuthStateChange((evento) => {
    if (evento === 'PASSWORD_RECOVERY') {
      sessaoDeRecuperacaoValida = true;
      form.querySelector('button[type="submit"]').disabled = false;
      ocultarMensagem();
    }
  });

  // Se depois de alguns segundos nenhum evento de recuperação chegou,
  // o link provavelmente é inválido/expirado.
  setTimeout(() => {
    if (!sessaoDeRecuperacaoValida) {
      exibirMensagem(MENSAGEM_LINK_INVALIDO, 'erro');
    }
  }, 4000);

  form.addEventListener('submit', tratarSubmit);
}

async function tratarSubmit(evento) {
  evento.preventDefault();
  ocultarMensagem();

  if (!sessaoDeRecuperacaoValida) {
    exibirMensagem(MENSAGEM_LINK_INVALIDO, 'erro');
    return;
  }

  const novaSenha = form.novaSenha.value;
  const confirmarSenha = form.confirmarSenha.value;
  const botaoEnviar = form.querySelector('button[type="submit"]');

  if (novaSenha.length < 8) {
    exibirMensagem('A senha deve ter ao menos 8 caracteres.', 'erro');
    return;
  }

  if (novaSenha !== confirmarSenha) {
    exibirMensagem(MENSAGEM_SENHAS_DIFERENTES, 'erro');
    return;
  }

  try {
    botaoEnviar.disabled = true;

    const { error } = await supabaseClient.auth.updateUser({ password: novaSenha });
    if (error) throw error;

    exibirMensagem('Senha redefinida com sucesso. Redirecionando para o login...', 'sucesso');
    await supabaseClient.auth.signOut();
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 1500);
  } catch (erro) {
    console.error('Falha ao redefinir senha:', erro);
    exibirMensagem(MENSAGEM_ERRO_GENERICA, 'erro');
    botaoEnviar.disabled = false;
  }
}

function exibirMensagem(texto, tipo) {
  mensagemStatus.textContent = texto;
  mensagemStatus.classList.remove('alerta--erro', 'alerta--sucesso');
  mensagemStatus.classList.add(tipo === 'sucesso' ? 'alerta--sucesso' : 'alerta--erro');
  mensagemStatus.hidden = false;
}

function ocultarMensagem() {
  mensagemStatus.hidden = true;
  mensagemStatus.textContent = '';
}
