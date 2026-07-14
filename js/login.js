// Tela de login: autenticação por e-mail/senha via Supabase Auth e
// recuperação de senha. Mensagens de erro são sempre genéricas — nunca
// revelam se um e-mail está cadastrado ou não (previne enumeração de contas).

import { supabaseClient } from './supabaseClient.js';

const PAGINA_APOS_LOGIN = 'dashboard.html';
const MENSAGEM_ERRO_LOGIN = 'E-mail ou senha inválidos.';
const MENSAGEM_ERRO_GENERICA = 'Não foi possível concluir a operação. Tente novamente.';
const MENSAGEM_RECUPERACAO_ENVIADA =
  'Se o e-mail informado estiver cadastrado, você receberá um link de recuperação em instantes.';

const formLogin = document.querySelector('[data-form="login"]');
const formRecuperar = document.querySelector('[data-form="recuperar-senha"]');
const mensagemStatus = document.getElementById('mensagem-status');
const botaoMostrarRecuperar = document.querySelector('[data-acao="mostrar-recuperar"]');
const botaoVoltarLogin = document.querySelector('[data-acao="voltar-login"]');

inicializar();

async function inicializar() {
  await redirecionarSeJaLogado();
  ligarEventos();
}

async function redirecionarSeJaLogado() {
  try {
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) throw error;
    if (data.session) {
      window.location.href = PAGINA_APOS_LOGIN;
    }
  } catch (erro) {
    console.error('Falha ao verificar sessão existente:', erro);
  }
}

function ligarEventos() {
  formLogin?.addEventListener('submit', tratarSubmitLogin);
  formRecuperar?.addEventListener('submit', tratarSubmitRecuperar);
  botaoMostrarRecuperar?.addEventListener('click', () => alternarFormulario(true));
  botaoVoltarLogin?.addEventListener('click', () => alternarFormulario(false));
}

function alternarFormulario(mostrarRecuperar) {
  formLogin.hidden = mostrarRecuperar;
  formRecuperar.hidden = !mostrarRecuperar;
  ocultarMensagem();
}

async function tratarSubmitLogin(evento) {
  evento.preventDefault();
  ocultarMensagem();

  const email = formLogin.email.value.trim();
  const senha = formLogin.senha.value;
  const botaoEnviar = formLogin.querySelector('button[type="submit"]');

  if (!email || !senha) {
    exibirMensagem(MENSAGEM_ERRO_LOGIN, 'erro');
    return;
  }

  try {
    botaoEnviar.disabled = true;

    const { error } = await supabaseClient.auth.signInWithPassword({ email, password: senha });

    if (error) {
      exibirMensagem(MENSAGEM_ERRO_LOGIN, 'erro');
      return;
    }

    window.location.href = PAGINA_APOS_LOGIN;
  } catch (erro) {
    console.error('Falha no login:', erro);
    exibirMensagem(MENSAGEM_ERRO_LOGIN, 'erro');
  } finally {
    botaoEnviar.disabled = false;
  }
}

async function tratarSubmitRecuperar(evento) {
  evento.preventDefault();
  ocultarMensagem();

  const email = formRecuperar.email.value.trim();
  const botaoEnviar = formRecuperar.querySelector('button[type="submit"]');

  if (!email) {
    exibirMensagem(MENSAGEM_ERRO_GENERICA, 'erro');
    return;
  }

  try {
    botaoEnviar.disabled = true;

    const redirectTo = new URL('redefinir-senha.html', window.location.href).toString();
    await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo });

    // Mensagem sempre igual, com sucesso ou falha do lado do servidor,
    // para não revelar se o e-mail existe na base.
    exibirMensagem(MENSAGEM_RECUPERACAO_ENVIADA, 'sucesso');
    formRecuperar.reset();
  } catch (erro) {
    console.error('Falha ao solicitar recuperação de senha:', erro);
    exibirMensagem(MENSAGEM_RECUPERACAO_ENVIADA, 'sucesso');
  } finally {
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
