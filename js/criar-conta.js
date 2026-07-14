// Cadastro em uma única etapa: nome + e-mail + senha.
//
// A restrição a e-mails @disktrans.com.br é validada aqui só por usabilidade
// (evita chamar a API com um domínio errado) — a barreira real está no banco
// (trigger `handle_new_user`), que rejeita a criação da conta se o e-mail não
// for do domínio, mesmo chamando a API diretamente.
//
// Este fluxo depende da opção "Confirm email" estar desabilitada em
// Authentication > Providers > Email no painel do Supabase. Com ela
// desabilitada, signUp() já retorna uma sessão válida imediatamente, sem
// precisar de código ou link enviado por e-mail.

import { supabaseClient } from './supabaseClient.js';

const DOMINIO_PERMITIDO = /^[^\s@]+@disktrans\.com\.br$/i;
const PAGINA_APOS_CADASTRO = 'dashboard.html';
const MENSAGEM_ERRO_GENERICA = 'Não foi possível concluir o cadastro. Tente novamente.';

const formCadastro = document.querySelector('[data-form="cadastro"]');
const mensagemStatus = document.getElementById('mensagem-status');

inicializar();

function inicializar() {
  formCadastro?.addEventListener('submit', tratarSubmitCadastro);
}

async function tratarSubmitCadastro(evento) {
  evento.preventDefault();
  ocultarMensagem();

  const nome = formCadastro.nome.value.trim();
  const email = formCadastro.email.value.trim();
  const senha = formCadastro.senha.value;
  const confirmarSenha = formCadastro.confirmarSenha.value;
  const botaoEnviar = formCadastro.querySelector('button[type="submit"]');

  if (!nome || !DOMINIO_PERMITIDO.test(email)) {
    exibirMensagem('Informe seu nome e um e-mail válido @disktrans.com.br.', 'erro');
    return;
  }

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

    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password: senha,
      options: { data: { nome } },
    });

    if (error) throw error;

    if (data.session) {
      exibirMensagem('Cadastro concluído. Redirecionando...', 'sucesso');
      setTimeout(() => {
        window.location.href = PAGINA_APOS_CADASTRO;
      }, 800);
      return;
    }

    // Sem sessão retornada: a confirmação de e-mail ainda está habilitada no
    // Supabase (Authentication > Providers > Email > "Confirm email").
    exibirMensagem(
      'Cadastro criado, mas o login automático não foi possível. Peça ao administrador para desabilitar a confirmação de e-mail nas configurações do Supabase, ou verifique seu e-mail para confirmar a conta.',
      'erro'
    );
    botaoEnviar.disabled = false;
  } catch (erro) {
    console.error('Falha ao criar conta:', erro);
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
