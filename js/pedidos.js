// Página Pedidos: criação (solicitante/admin), listagem paginada e ordenável,
// filtros aplicados no servidor, e aprovação/reprovação real (aprovador/admin).
//
// Princípio de minimização (LGPD): nunca buscamos a tabela inteira. A
// listagem usa paginação (`range`) e filtros aplicados na consulta; o total
// filtrado vem de uma função agregada no banco (`resumo_pedidos_filtrados`),
// não de somar tudo no navegador. Ações em massa buscam apenas a coluna
// `id` das linhas alvo, nunca a linha inteira.
//
// A aprovação/reprovação sempre passa por `registrar_decisao_pedido` — ela
// grava o histórico e define o autor da decisão no servidor (auth.uid()),
// nunca a partir de um valor vindo do cliente. O RLS garante que só
// aprovador/admin conseguem executar essa função com sucesso.

import { inicializarPortal } from './portal.js';
import { supabaseClient } from './supabaseClient.js';

const TAMANHO_PAGINA = 20;

const ROTULOS_STATUS = {
  concluido: { texto: 'Concluído', classe: 'badge--concluido' },
  aguardando_aprovacao: { texto: 'Aguardando aprovação', classe: 'badge--aguardando' },
  reprovado: { texto: 'Reprovado', classe: 'badge--reprovado' },
};

const NOMES_MES = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

const formatadorMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

const tituloPagina = document.querySelector('[data-titulo-pagina]');
const secaoNovoPedido = document.querySelector('[data-secao-novo-pedido]');
const formNovoPedido = document.querySelector('[data-form="novo-pedido"]');
const corpoTabela = document.querySelector('[data-corpo-tabela]');
const colunaAcoesHeader = document.querySelector('[data-coluna-acoes]');
const colunaSolicitanteHeader = document.querySelector('[data-coluna-solicitante]');
const blocoAcoesMassa = document.querySelector('[data-acoes-massa]');
const formFiltros = document.querySelector('[data-form="filtros"]');
const valorFiltradoEl = document.querySelector('[data-valor-filtrado]');
const quantidadeFiltradaEl = document.querySelector('[data-quantidade-filtrada]');
const paginacaoInfoEl = document.querySelector('[data-paginacao-info]');
const mensagemErroEl = document.getElementById('mensagem-erro');
const mensagemSucessoEl = document.getElementById('mensagem-sucesso');
const dialogoReprovar = document.querySelector('[data-dialogo="reprovar"]');
const formReprovar = document.querySelector('[data-form="reprovar"]');

let podeAprovar = false;
let podeCriarPedido = false;
let nomeSolicitanteAtual = '';
let paginaAtual = 1;
let totalRegistros = 0;
let colunaOrdenacao = 'mes';
let ordemAscendente = true;
let pedidoEmReprovacao = null;

inicializar();

async function inicializar() {
  const contexto = await inicializarPortal();
  if (!contexto) return;

  podeAprovar = contexto.papel === 'aprovador' || contexto.papel === 'admin';
  podeCriarPedido = contexto.papel === 'solicitante' || contexto.papel === 'admin';

  if (contexto.papel === 'solicitante') {
    tituloPagina.textContent = 'Meus Pedidos';
    colunaSolicitanteHeader.hidden = true;
  }

  if (colunaAcoesHeader) colunaAcoesHeader.hidden = !podeAprovar;
  if (blocoAcoesMassa) blocoAcoesMassa.hidden = !podeAprovar;
  if (secaoNovoPedido) secaoNovoPedido.hidden = !podeCriarPedido;

  if (podeCriarPedido) {
    await carregarNomeSolicitante();
    formNovoPedido?.addEventListener('submit', tratarSubmitNovoPedido);
  }

  formFiltros?.addEventListener('input', () => {
    paginaAtual = 1;
    carregarPagina();
  });

  document.querySelectorAll('.th-ordenavel').forEach((th) => {
    th.addEventListener('click', () => alternarOrdenacao(th.dataset.ordenarPor));
  });

  corpoTabela?.addEventListener('click', tratarCliqueNaTabela);
  document.querySelector('[data-acao="aprovar-todos"]')?.addEventListener('click', () => aplicarAcaoEmMassa('aprovado'));
  document.querySelector('[data-acao="reprovar-todos"]')?.addEventListener('click', () => aplicarAcaoEmMassa('reprovado'));
  document.querySelector('[data-acao="pagina-anterior"]')?.addEventListener('click', () => mudarPagina(-1));
  document.querySelector('[data-acao="proxima-pagina"]')?.addEventListener('click', () => mudarPagina(1));
  document.querySelector('[data-acao="cancelar-dialogo"]')?.addEventListener('click', () => dialogoReprovar.close());
  formReprovar?.addEventListener('submit', tratarSubmitReprovar);

  atualizarIndicadoresOrdenacao();
  await carregarPagina();
}

async function carregarNomeSolicitante() {
  try {
    const { data: sessaoData } = await supabaseClient.auth.getSession();
    const usuarioId = sessaoData?.session?.user?.id;
    if (!usuarioId) return;

    const { data, error } = await supabaseClient
      .from('perfis')
      .select('nome')
      .eq('id', usuarioId)
      .maybeSingle();

    if (error) throw error;
    nomeSolicitanteAtual = data?.nome ?? '';
  } catch (erro) {
    console.error('Falha ao carregar nome do solicitante:', erro);
  }
}

function obterFiltrosAtuais() {
  return {
    mes: formFiltros.mes.value ? Number(formFiltros.mes.value) : null,
    status: formFiltros.status.value || null,
    busca: formFiltros.busca.value.trim() || null,
  };
}

function alternarOrdenacao(coluna) {
  if (!coluna) return;

  if (colunaOrdenacao === coluna) {
    ordemAscendente = !ordemAscendente;
  } else {
    colunaOrdenacao = coluna;
    ordemAscendente = true;
  }

  atualizarIndicadoresOrdenacao();
  paginaAtual = 1;
  carregarPagina();
}

function atualizarIndicadoresOrdenacao() {
  document.querySelectorAll('[data-indicador]').forEach((indicador) => {
    const coluna = indicador.dataset.indicador;
    indicador.textContent = coluna === colunaOrdenacao ? (ordemAscendente ? '▲' : '▼') : '';
  });
}

function mudarPagina(delta) {
  const novaPagina = paginaAtual + delta;
  if (novaPagina < 1) return;
  if ((novaPagina - 1) * TAMANHO_PAGINA >= totalRegistros && delta > 0) return;

  paginaAtual = novaPagina;
  carregarPagina();
}

async function carregarPagina() {
  ocultarMensagens();
  const filtros = obterFiltrosAtuais();

  try {
    const de = (paginaAtual - 1) * TAMANHO_PAGINA;
    const ate = de + TAMANHO_PAGINA - 1;

    let consulta = supabaseClient
      .from('pedidos')
      .select('id, mes, descricao_item, fornecedor, departamento, solicitante, valor, status, link_compra', { count: 'exact' });

    consulta = aplicarFiltros(consulta, filtros);
    consulta = consulta.order(colunaOrdenacao, { ascending: ordemAscendente }).range(de, ate);

    const { data, error, count } = await consulta;
    if (error) throw error;

    totalRegistros = count ?? 0;
    renderizarTabela(data ?? []);
    atualizarPaginacao();
    await atualizarResumoFiltrado(filtros);
  } catch (erro) {
    console.error('Falha ao carregar pedidos:', erro);
    exibirErro('Não foi possível carregar os pedidos. Tente novamente mais tarde.');
  }
}

function aplicarFiltros(consulta, filtros) {
  let resultado = consulta;
  if (filtros.mes) resultado = resultado.eq('mes', filtros.mes);
  if (filtros.status) resultado = resultado.eq('status', filtros.status);
  if (filtros.busca) {
    const termo = sanitizarTermoBusca(filtros.busca);
    resultado = resultado.or(
      `descricao_item.ilike.%${termo}%,fornecedor.ilike.%${termo}%,departamento.ilike.%${termo}%`,
    );
  }
  return resultado;
}

// Remove caracteres que teriam significado especial na sintaxe .or()/ilike
// do PostgREST: `,` separa condições dentro de .or() (um valor com vírgula
// poderia injetar uma cláusula extra) e `%` é o coringa do ILIKE (deixaria
// o usuário ampliar o próprio padrão de busca além do prefixo/sufixo já
// aplicado). O RLS continua sendo a barreira real de acesso a linhas.
export function sanitizarTermoBusca(busca) {
  return busca.replace(/[%,]/g, '');
}

async function atualizarResumoFiltrado(filtros) {
  try {
    const { data, error } = await supabaseClient.rpc('resumo_pedidos_filtrados', {
      p_mes: filtros.mes,
      p_status: filtros.status,
      p_busca: filtros.busca,
    });

    if (error) throw error;

    const resumo = data?.[0] ?? { total_pedidos: 0, valor_total: 0 };
    if (valorFiltradoEl) valorFiltradoEl.textContent = formatadorMoeda.format(Number(resumo.valor_total ?? 0));
    if (quantidadeFiltradaEl) quantidadeFiltradaEl.textContent = String(resumo.total_pedidos ?? 0);
  } catch (erro) {
    console.error('Falha ao calcular resumo filtrado:', erro);
  }
}

function atualizarPaginacao() {
  if (!paginacaoInfoEl) return;

  if (totalRegistros === 0) {
    paginacaoInfoEl.textContent = 'Nenhum registro encontrado.';
    return;
  }

  const de = (paginaAtual - 1) * TAMANHO_PAGINA + 1;
  const ate = Math.min(paginaAtual * TAMANHO_PAGINA, totalRegistros);
  paginacaoInfoEl.textContent = `Mostrando ${de}–${ate} de ${totalRegistros} pedido(s)`;
}

function renderizarTabela(pedidos) {
  limparTabela();

  if (pedidos.length === 0) {
    const linha = document.createElement('tr');
    const celula = document.createElement('td');
    celula.colSpan = 9;
    celula.className = 'estado-vazio';
    celula.textContent = 'Nenhum pedido encontrado para os filtros selecionados.';
    linha.appendChild(celula);
    corpoTabela.appendChild(linha);
    return;
  }

  const fragmento = document.createDocumentFragment();
  pedidos.forEach((pedido) => fragmento.appendChild(criarLinhaPedido(pedido)));
  corpoTabela.appendChild(fragmento);
}

function criarLinhaPedido(pedido) {
  const linha = document.createElement('tr');
  linha.dataset.pedidoId = pedido.id;

  linha.appendChild(criarCelulaTexto(NOMES_MES[Number(pedido.mes) - 1] ?? '—'));
  linha.appendChild(criarCelulaTexto(pedido.descricao_item ?? '—'));
  linha.appendChild(criarCelulaTexto(pedido.fornecedor ?? '—'));
  linha.appendChild(criarCelulaTexto(pedido.departamento ?? '—'));

  if (!colunaSolicitanteHeader.hidden) {
    linha.appendChild(criarCelulaTexto(pedido.solicitante ?? '—'));
  }

  const celulaValor = criarCelulaTexto(formatadorMoeda.format(Number(pedido.valor ?? 0)));
  celulaValor.classList.add('u-texto-direita');
  linha.appendChild(celulaValor);

  linha.appendChild(criarCelulaStatus(pedido.status));
  linha.appendChild(criarCelulaLink(pedido.link_compra));

  if (podeAprovar) {
    linha.appendChild(criarCelulaAcoes(pedido));
  }

  return linha;
}

function criarCelulaTexto(texto) {
  const celula = document.createElement('td');
  celula.textContent = texto;
  return celula;
}

function criarCelulaStatus(status) {
  const celula = document.createElement('td');
  const info = ROTULOS_STATUS[status] ?? { texto: status ?? '—', classe: '' };

  const badge = document.createElement('span');
  badge.className = `badge ${info.classe}`.trim();
  badge.textContent = info.texto;

  celula.appendChild(badge);
  return celula;
}

// Só aceita http(s) — bloqueia esquemas como javascript:, data: ou vbscript:
// que poderiam ser injetados no campo "Link de compra" e executar ao clicar.
export function normalizarUrlSegura(link) {
  try {
    const url = new URL(link);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return url.toString();
  } catch {
    return null;
  }
}

function criarCelulaLink(link) {
  const celula = document.createElement('td');

  if (!link) {
    celula.textContent = '—';
    return celula;
  }

  const urlSegura = normalizarUrlSegura(link);

  if (!urlSegura) {
    console.error('Link de compra inválido, ignorado:', link);
    celula.textContent = '—';
    return celula;
  }

  const ancora = document.createElement('a');
  ancora.href = urlSegura;
  ancora.target = '_blank';
  ancora.rel = 'noopener noreferrer';
  ancora.textContent = 'Abrir';
  celula.appendChild(ancora);

  return celula;
}

function criarCelulaAcoes(pedido) {
  const celula = document.createElement('td');

  if (pedido.status !== 'aguardando_aprovacao') {
    celula.textContent = '—';
    return celula;
  }

  const acoes = document.createElement('div');
  acoes.className = 'tabela__acoes';

  const botaoAprovar = document.createElement('button');
  botaoAprovar.type = 'button';
  botaoAprovar.className = 'botao botao--sucesso botao--pequeno';
  botaoAprovar.textContent = 'Aprovar';
  botaoAprovar.dataset.acaoPedido = 'aprovado';

  const botaoReprovar = document.createElement('button');
  botaoReprovar.type = 'button';
  botaoReprovar.className = 'botao botao--perigo botao--pequeno';
  botaoReprovar.textContent = 'Reprovar';
  botaoReprovar.dataset.acaoPedido = 'reprovado';

  acoes.appendChild(botaoAprovar);
  acoes.appendChild(botaoReprovar);
  celula.appendChild(acoes);
  return celula;
}

function limparTabela() {
  while (corpoTabela.firstChild) corpoTabela.removeChild(corpoTabela.firstChild);
}

async function tratarCliqueNaTabela(evento) {
  const botao = evento.target.closest('[data-acao-pedido]');
  if (!botao) return;

  const linha = botao.closest('tr[data-pedido-id]');
  if (!linha) return;

  const acao = botao.dataset.acaoPedido;
  const pedidoId = linha.dataset.pedidoId;

  if (acao === 'reprovado') {
    abrirDialogoReprovar(pedidoId);
    return;
  }

  await registrarDecisao(pedidoId, 'aprovado');
}

function abrirDialogoReprovar(pedidoId) {
  pedidoEmReprovacao = pedidoId;
  formReprovar.observacao.value = '';
  dialogoReprovar.showModal();
}

async function tratarSubmitReprovar(evento) {
  evento.preventDefault();
  if (!pedidoEmReprovacao) return;

  const observacao = formReprovar.observacao.value.trim() || null;
  const pedidoId = pedidoEmReprovacao;
  pedidoEmReprovacao = null;
  dialogoReprovar.close();

  await registrarDecisao(pedidoId, 'reprovado', observacao);
}

async function aplicarAcaoEmMassa(acao) {
  const filtros = obterFiltrosAtuais();

  try {
    let consulta = supabaseClient.from('pedidos').select('id').eq('status', 'aguardando_aprovacao');
    consulta = aplicarFiltros(consulta, { ...filtros, status: null });

    const { data, error } = await consulta;
    if (error) throw error;

    const ids = (data ?? []).map((pedido) => pedido.id);

    if (ids.length === 0) {
      exibirSucesso('Nenhum pedido aguardando aprovação nos filtros atuais.');
      return;
    }

    const confirmacao = window.confirm(
      `Confirma ${acao === 'aprovado' ? 'aprovar' : 'reprovar'} ${ids.length} pedido(s)?`,
    );
    if (!confirmacao) return;

    let falhas = 0;
    for (const id of ids) {
      const { error } = await supabaseClient.rpc('registrar_decisao_pedido', { p_pedido_id: id, p_acao: acao });
      if (error) {
        console.error(`Falha ao aplicar decisão no pedido ${id}:`, error);
        falhas += 1;
      }
    }

    if (falhas === 0) {
      exibirSucesso('Pedidos atualizados com sucesso.');
    } else {
      exibirErro(`${falhas} de ${ids.length} pedido(s) não puderam ser atualizados. Recarregue e tente novamente.`);
    }

    await carregarPagina();
  } catch (erro) {
    console.error('Falha ao aplicar ação em massa:', erro);
    exibirErro('Não foi possível concluir a ação em alguns pedidos. Recarregue a página e tente novamente.');
    await carregarPagina();
  }
}

async function registrarDecisao(pedidoId, acao, observacao) {
  ocultarMensagens();

  try {
    const { error } = await supabaseClient.rpc('registrar_decisao_pedido', {
      p_pedido_id: pedidoId,
      p_acao: acao,
      p_observacao: observacao ?? null,
    });

    if (error) throw error;

    exibirSucesso(acao === 'aprovado' ? 'Pedido aprovado com sucesso.' : 'Pedido reprovado com sucesso.');
    await carregarPagina();
  } catch (erro) {
    console.error('Falha ao registrar decisão do pedido:', erro);
    exibirErro('Não foi possível registrar a decisão. Tente novamente.');
  }
}

async function tratarSubmitNovoPedido(evento) {
  evento.preventDefault();
  ocultarMensagens();

  const botaoEnviar = formNovoPedido.querySelector('button[type="submit"]');
  const descricao = formNovoPedido.descricao.value.trim();
  const fornecedor = formNovoPedido.fornecedor.value.trim();
  const valor = Number(formNovoPedido.valor.value);
  const mesCompra = formNovoPedido.mesCompra.value;
  const departamento = formNovoPedido.departamento.value.trim();
  const link = formNovoPedido.link.value.trim();

  if (!descricao || !fornecedor || !mesCompra || !Number.isFinite(valor) || valor <= 0) {
    exibirErro('Preencha descrição, fornecedor, valor e mês corretamente.');
    return;
  }

  const [anoStr, mesStr] = mesCompra.split('-');
  const mes = Number(mesStr);
  const data = `${anoStr}-${mesStr}-01`;

  try {
    botaoEnviar.disabled = true;

    const { data: sessaoData } = await supabaseClient.auth.getSession();
    const usuarioId = sessaoData?.session?.user?.id;
    if (!usuarioId) throw new Error('Sessão não encontrada');

    const { error } = await supabaseClient.from('pedidos').insert({
      mes,
      data,
      descricao_item: descricao,
      fornecedor,
      valor,
      solicitante: nomeSolicitanteAtual || 'Não informado',
      departamento: departamento || null,
      link_compra: link || null,
      criado_por: usuarioId,
    });

    if (error) throw error;

    exibirSucesso('Pedido enviado para aprovação.');
    formNovoPedido.reset();
    paginaAtual = 1;
    await carregarPagina();
  } catch (erro) {
    console.error('Falha ao criar pedido:', erro);
    exibirErro('Não foi possível enviar o pedido. Tente novamente.');
  } finally {
    botaoEnviar.disabled = false;
  }
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
