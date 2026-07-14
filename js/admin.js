// Página Administração: convite de usuários, gestão de perfis (papel e
// ativo/inativo) e histórico de aprovações (auditoria).
//
// Só usuários com papel `admin` conseguem ler todos os perfis e o
// histórico completo — isso é garantido pelas políticas de RLS; esta
// página apenas evita renderizar a tela para quem não é admin.
//
// O convite de usuário chama uma Edge Function (`convidar-usuario`) que
// roda no servidor do Supabase: a service role key necessária para criar o
// convite nunca é exposta aqui, só existe no ambiente da função.

import { inicializarPortal } from './portal.js';
import { supabaseClient } from './supabaseClient.js';
import { SUPABASE_URL } from './config.js';

const PAPEIS_VALIDOS = ['solicitante', 'aprovador', 'admin'];
const TAMANHO_PAGINA_HISTORICO = 15;

const ROTULOS_ACAO = { aprovado: 'Aprovado', reprovado: 'Reprovado' };

const formatadorDataHora = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

const secoesPerfis = document.querySelectorAll('[data-secao-perfis]');
const corpoTabela = document.querySelector('[data-corpo-tabela]');
const corpoHistorico = document.querySelector('[data-corpo-historico]');
const paginacaoHistoricoInfoEl = document.querySelector('[data-paginacao-historico-info]');
const mensagemRestritoEl = document.getElementById('mensagem-restrito');
const mensagemErroEl = document.getElementById('mensagem-erro');
const mensagemSucessoEl = document.getElementById('mensagem-sucesso');
const formConvite = document.querySelector('[data-form="convite"]');

let paginaHistorico = 1;
let totalHistorico = 0;

inicializar();

async function inicializar() {
  const contexto = await inicializarPortal();
  if (!contexto) return;

  if (contexto.papel !== 'admin') {
    mensagemRestritoEl.hidden = false;
    return;
  }

  secoesPerfis.forEach((secao) => { secao.hidden = false; });
  corpoTabela?.addEventListener('click', tratarCliqueNaTabela);
  formConvite?.addEventListener('submit', tratarSubmitConvite);
  document.querySelector('[data-acao="historico-pagina-anterior"]')?.addEventListener('click', () => mudarPaginaHistorico(-1));
  document.querySelector('[data-acao="historico-proxima-pagina"]')?.addEventListener('click', () => mudarPaginaHistorico(1));

  await carregarPerfis();
  await carregarHistorico();
}

async function tratarSubmitConvite(evento) {
  evento.preventDefault();
  ocultarMensagens();

  const email = formConvite.email.value.trim();
  const botaoEnviar = formConvite.querySelector('button[type="submit"]');

  if (!email) {
    exibirErro('Informe um e-mail válido.');
    return;
  }

  try {
    botaoEnviar.disabled = true;

    const { data: sessaoData } = await supabaseClient.auth.getSession();
    const token = sessaoData?.session?.access_token;
    if (!token) throw new Error('Sessão não encontrada');

    const resposta = await fetch(`${SUPABASE_URL}/functions/v1/convidar-usuario`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ email }),
    });

    const corpo = await resposta.json().catch(() => ({}));

    if (!resposta.ok || corpo.error) {
      throw new Error(corpo.error || `Erro HTTP ${resposta.status}`);
    }

    exibirSucesso('Convite enviado com sucesso.');
    formConvite.reset();
    await carregarPerfis();
  } catch (erro) {
    console.error('Falha ao enviar convite:', erro);
    exibirErro('Não foi possível enviar o convite. Tente novamente.');
  } finally {
    botaoEnviar.disabled = false;
  }
}

async function carregarPerfis() {
  try {
    const { data, error } = await supabaseClient
      .from('perfis')
      .select('id, nome, email, papel, ativo')
      .order('nome', { ascending: true });

    if (error) throw error;

    renderizarPerfis(data ?? []);
  } catch (erro) {
    console.error('Falha ao carregar perfis:', erro);
    exibirErro('Não foi possível carregar os perfis. Tente novamente mais tarde.');
  }
}

function renderizarPerfis(perfis) {
  limparCorpo(corpoTabela);

  if (perfis.length === 0) {
    corpoTabela.appendChild(criarLinhaVazia(5, 'Nenhum perfil cadastrado.'));
    return;
  }

  const fragmento = document.createDocumentFragment();
  perfis.forEach((perfil) => fragmento.appendChild(criarLinhaPerfil(perfil)));
  corpoTabela.appendChild(fragmento);
}

function criarLinhaPerfil(perfil) {
  const linha = document.createElement('tr');
  linha.dataset.perfilId = perfil.id;

  const celulaNome = document.createElement('td');
  celulaNome.textContent = perfil.nome ?? '—';

  const celulaEmail = document.createElement('td');
  celulaEmail.textContent = perfil.email ?? '—';

  const celulaPapel = document.createElement('td');
  const seletorPapel = document.createElement('select');
  seletorPapel.setAttribute('aria-label', `Papel de ${perfil.nome ?? perfil.email}`);
  seletorPapel.dataset.campoPapel = '';
  PAPEIS_VALIDOS.forEach((papel) => {
    const opcao = document.createElement('option');
    opcao.value = papel;
    opcao.textContent = formatarPapel(papel);
    if (papel === perfil.papel) opcao.selected = true;
    seletorPapel.appendChild(opcao);
  });
  celulaPapel.appendChild(seletorPapel);

  const celulaAtivo = document.createElement('td');
  const rotuloAtivo = document.createElement('label');
  const checkboxAtivo = document.createElement('input');
  checkboxAtivo.type = 'checkbox';
  checkboxAtivo.dataset.campoAtivo = '';
  checkboxAtivo.checked = Boolean(perfil.ativo);
  checkboxAtivo.setAttribute('aria-label', `Ativo (${perfil.nome ?? perfil.email})`);
  rotuloAtivo.appendChild(checkboxAtivo);
  celulaAtivo.appendChild(rotuloAtivo);

  const celulaAcoes = document.createElement('td');
  const botaoSalvar = document.createElement('button');
  botaoSalvar.type = 'button';
  botaoSalvar.className = 'botao botao--pequeno';
  botaoSalvar.textContent = 'Salvar';
  botaoSalvar.dataset.acaoPerfil = 'salvar';
  celulaAcoes.appendChild(botaoSalvar);

  linha.appendChild(celulaNome);
  linha.appendChild(celulaEmail);
  linha.appendChild(celulaPapel);
  linha.appendChild(celulaAtivo);
  linha.appendChild(celulaAcoes);

  return linha;
}

function formatarPapel(papel) {
  const nomes = { solicitante: 'Solicitante', aprovador: 'Aprovador', admin: 'Administrador' };
  return nomes[papel] ?? papel;
}

async function tratarCliqueNaTabela(evento) {
  const botao = evento.target.closest('[data-acao-perfil="salvar"]');
  if (!botao) return;

  const linha = botao.closest('tr[data-perfil-id]');
  if (!linha) return;

  const perfilId = linha.dataset.perfilId;
  const papel = linha.querySelector('[data-campo-papel]').value;
  const ativo = linha.querySelector('[data-campo-ativo]').checked;

  await salvarPerfil(perfilId, papel, ativo, botao);
}

async function salvarPerfil(perfilId, papel, ativo, botao) {
  ocultarMensagens();

  try {
    botao.disabled = true;

    const { error } = await supabaseClient
      .from('perfis')
      .update({ papel, ativo })
      .eq('id', perfilId);

    if (error) throw error;

    exibirSucesso('Perfil atualizado com sucesso.');
  } catch (erro) {
    console.error('Falha ao atualizar perfil:', erro);
    exibirErro('Não foi possível salvar as alterações. Tente novamente.');
  } finally {
    botao.disabled = false;
  }
}

function mudarPaginaHistorico(delta) {
  const novaPagina = paginaHistorico + delta;
  if (novaPagina < 1) return;
  if ((novaPagina - 1) * TAMANHO_PAGINA_HISTORICO >= totalHistorico && delta > 0) return;

  paginaHistorico = novaPagina;
  carregarHistorico();
}

async function carregarHistorico() {
  try {
    const de = (paginaHistorico - 1) * TAMANHO_PAGINA_HISTORICO;
    const ate = de + TAMANHO_PAGINA_HISTORICO - 1;

    const { data, error, count } = await supabaseClient
      .from('vw_historico_auditoria')
      .select('id, descricao_item, acao, usuario_nome, usuario_email, data_hora, observacao', { count: 'exact' })
      .order('data_hora', { ascending: false })
      .range(de, ate);

    if (error) throw error;

    totalHistorico = count ?? 0;
    renderizarHistorico(data ?? []);
    atualizarPaginacaoHistorico();
  } catch (erro) {
    console.error('Falha ao carregar histórico de aprovações:', erro);
    exibirErro('Não foi possível carregar o histórico de aprovações.');
  }
}

function renderizarHistorico(linhas) {
  limparCorpo(corpoHistorico);

  if (linhas.length === 0) {
    corpoHistorico.appendChild(criarLinhaVazia(5, 'Nenhum registro de aprovação encontrado.'));
    return;
  }

  const fragmento = document.createDocumentFragment();
  linhas.forEach((linha) => fragmento.appendChild(criarLinhaHistorico(linha)));
  corpoHistorico.appendChild(fragmento);
}

function criarLinhaHistorico(registro) {
  const linha = document.createElement('tr');

  const celulaData = document.createElement('td');
  celulaData.textContent = registro.data_hora ? formatadorDataHora.format(new Date(registro.data_hora)) : '—';

  const celulaPedido = document.createElement('td');
  celulaPedido.textContent = registro.descricao_item ?? '—';

  const celulaAcao = document.createElement('td');
  const badge = document.createElement('span');
  badge.className = registro.acao === 'aprovado' ? 'badge badge--concluido' : 'badge badge--reprovado';
  badge.textContent = ROTULOS_ACAO[registro.acao] ?? registro.acao ?? '—';
  celulaAcao.appendChild(badge);

  const celulaResponsavel = document.createElement('td');
  celulaResponsavel.textContent = registro.usuario_nome ?? registro.usuario_email ?? '—';

  const celulaObservacao = document.createElement('td');
  celulaObservacao.textContent = registro.observacao ?? '—';

  linha.appendChild(celulaData);
  linha.appendChild(celulaPedido);
  linha.appendChild(celulaAcao);
  linha.appendChild(celulaResponsavel);
  linha.appendChild(celulaObservacao);

  return linha;
}

function atualizarPaginacaoHistorico() {
  if (!paginacaoHistoricoInfoEl) return;

  if (totalHistorico === 0) {
    paginacaoHistoricoInfoEl.textContent = 'Nenhum registro encontrado.';
    return;
  }

  const de = (paginaHistorico - 1) * TAMANHO_PAGINA_HISTORICO + 1;
  const ate = Math.min(paginaHistorico * TAMANHO_PAGINA_HISTORICO, totalHistorico);
  paginacaoHistoricoInfoEl.textContent = `Mostrando ${de}–${ate} de ${totalHistorico} registro(s)`;
}

function criarLinhaVazia(colspan, texto) {
  const linha = document.createElement('tr');
  const celula = document.createElement('td');
  celula.colSpan = colspan;
  celula.className = 'estado-vazio';
  celula.textContent = texto;
  linha.appendChild(celula);
  return linha;
}

function limparCorpo(corpo) {
  while (corpo.firstChild) corpo.removeChild(corpo.firstChild);
}

function exibirErro(texto) {
  if (!mensagemErroEl) return;
  mensagemSucessoEl.hidden = true;
  mensagemErroEl.textContent = texto;
  mensagemErroEl.hidden = false;
}

function exibirSucesso(texto) {
  if (!mensagemSucessoEl) return;
  mensagemErroEl.hidden = true;
  mensagemSucessoEl.textContent = texto;
  mensagemSucessoEl.hidden = false;
}

function ocultarMensagens() {
  if (mensagemErroEl) mensagemErroEl.hidden = true;
  if (mensagemSucessoEl) mensagemSucessoEl.hidden = true;
}
