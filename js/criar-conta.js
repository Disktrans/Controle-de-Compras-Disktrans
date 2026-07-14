// Cadastro em 3 passos: e-mail/nome -> código de verificação (OTP) -> senha.
//
// A restrição a e-mails @disktrans.com.br é validada aqui só por usabilidade
// (evita chamar a API e gastar envio de e-mail para domínio errado) — a
// barreira real está no banco (trigger `handle_new_user`), que rejeita a
// criação da conta se o e-mail não for do domínio, mesmo chamando a API
// diretamente.

import { supabaseClient } from './supabaseClient.js';

const DOMINIO_PERMITIDO = /^[^\s@]+@disktrans\.com\.br$/i;
const PAGINA_APOS_CADASTRO = 'dashboard.html';
const MENSAGEM_ERRO_GENERICA = 'Não foi possível concluir a operação. Tente novamente.';

const formPassoEmail = document.querySelector('[data-form="passo-email"]');
const formPassoCodigo = document.querySelector('[data-form="passo-codigo"]');
const formPassoSenha = document.querySelector('[data-form="passo-senha"]');
const mensagemStatus = document.getElementById('mensagem-status');

let emailCadastro = '';

inicializar();

function inicializar() {
  formPassoEmail?.addEventListener('submit', tratarSubmitEmail);
  formPassoCodigo?.addEventListener('submit', tratarSubmitCodigo);
  formPassoSenha?.addEventListener('submit', tratarSubmitSenha);
  document.querySelector('[data-acao="reenviar-codigo"]')?.addEventListener('click', reenviarCodigo);
}

async function tratarSubmitEmail(evento) {
  evento.preventDefault();
  ocultarMensagem();

  const nome = formPassoEmail.nome.value.trim();
  const email = formPassoEmail.email.value.trim();
  const botaoEnviar = formPassoEmail.querySelector('button[type="submit"]');

  if (!nome || !DOMINIO_PERMITIDO.test(email)) {
    exibirMensagem('Informe seu nome e um e-mail válido @disktrans.com.br.', 'erro');
    return;
  }

  try {
    botaoEnviar.disabled = true;

    const { error } = await supabaseClient.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        data: { nome },
      },
    });

    if (error) throw error;

    emailCadastro = email;
    exibirMensagem(`Enviamos um código de verificação para ${email}.`, 'sucesso');
    avancarPara(formPassoCodigo);
  } catch (erro) {
    console.error('Falha ao enviar código de verificação:', erro);
    exibirMensagem(MENSAGEM_ERRO_GENERICA, 'erro');
  } finally {
    botaoEnviar.disabled = false;
  }
}

async function tratarSubmitCodigo(evento) {
  evento.preventDefault();
  ocultarMensagem();

  const codigo = formPassoCodigo.codigo.value.trim();
  const botaoEnviar = formPassoCodigo.querySelector('button[type="submit"]');

  if (!/^\d{6}$/.test(codigo)) {
    exibirMensagem('Informe o código de 6 dígitos recebido por e-mail.', 'erro');
    return;
  }

  try {
    botaoEnviar.disabled = true;

    const { error } = await supabaseClient.auth.verifyOtp({
      email: emailCadastro,
      token: codigo,
      type: 'email',
    });

    if (error) throw error;

    ocultarMensagem();
    avancarPara(formPassoSenha);
  } catch (erro) {
    console.error('Falha ao verificar código:', erro);
    exibirMensagem('Código inválido ou expirado. Verifique e tente novamente.', 'erro');
  } finally {
    botaoEnviar.disabled = false;
  }
}

async function tratarSubmitSenha(evento) {
  evento.preventDefault();
  ocultarMensagem();

  const senha = formPassoSenha.senha.value;
  const confirmarSenha = formPassoSenha.confirmarSenha.value;
  const botaoEnviar = formPassoSenha.querySelector('button[type="submit"]');

  if (senha.length < 8) {
    exibirMensagem('A senha deve ter ao menos 8 caracteres.', 'erro');
    return;
  }

  if (senha !== confirmarSenha) {
    exibirMensagem('As senhas informadas não coincidem.', 'erro');
    return;
  }

  try {
    botaoEnviar.disabled = true;

    const { error } = await supabaseClient.auth.updateUser({ password: senha });
    if (error) throw error;

    exibirMensagem('Cadastro concluído. Redirecionando...', 'sucesso');
    setTimeout(() => {
      window.location.href = PAGINA_APOS_CADASTRO;
    }, 1000);
  } catch (erro) {
    console.error('Falha ao definir senha:', erro);
    exibirMensagem(MENSAGEM_ERRO_GENERICA, 'erro');
    botaoEnviar.disabled = false;
  }
}

async function reenviarCodigo() {
  ocultarMensagem();

  if (!emailCadastro) return;

  try {
    const { error } = await supabaseClient.auth.signInWithOtp({
      email: emailCadastro,
      options: { shouldCreateUser: true },
    });

    if (error) throw error;
    exibirMensagem('Novo código enviado.', 'sucesso');
  } catch (erro) {
    console.error('Falha ao reenviar código:', erro);
    exibirMensagem(MENSAGEM_ERRO_GENERICA, 'erro');
  }
}

function avancarPara(form) {
  [formPassoEmail, formPassoCodigo, formPassoSenha].forEach((f) => {
    if (f) f.hidden = true;
  });
  form.hidden = false;
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
