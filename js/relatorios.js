// Página Relatórios: resumos agregados (mensal, anual, fornecedor,
// departamento, status), filtros por período/fornecedor/status, exportação
// em CSV e PDF (identidade visual Disktrans) e relatório de auditoria
// (somente admin).
//
// Princípio de minimização (LGPD): todos os números vêm de funções
// agregadas no banco (RPC `relatorio_*_filtrado`), nunca de trazer a
// tabela `pedidos` inteira para o navegador. Cada função já respeita o RLS
// de `pedidos` (security invoker) — um solicitante só agregaria os
// próprios pedidos, se acessasse esta tela.

import { inicializarPortal } from './portal.js';
import { supabaseClient } from './supabaseClient.js';

const ROTULOS_STATUS = {
  concluido: 'Concluído',
  aguardando_aprovacao: 'Aguardando aprovação',
  reprovado: 'Reprovado',
};

const ROTULOS_ACAO = { aprovado: 'Aprovado', reprovado: 'Reprovado' };

const NOMES_MES = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

const CORES_PDF = {
  azulPrimaria: [0, 76, 150],
  laranja: [244, 148, 29],
  texto: [31, 41, 51],
};

const formatadorMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const formatadorPercentual = new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 1 });
const formatadorDataHora = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

const mensagemErroEl = document.getElementById('mensagem-erro');
const formFiltros = document.querySelector('[data-form="filtros"]');
const secaoAuditoria = document.querySelector('[data-secao-auditoria]');

let ehAdmin = false;
let ultimosDados = {
  mensal: [],
  anual: [],
  fornecedor: [],
  departamento: [],
  status: [],
  auditoria: [],
};

inicializar();

async function inicializar() {
  const contexto = await inicializarPortal();
  if (!contexto) return;

  ehAdmin = contexto.papel === 'admin';
  if (secaoAuditoria) secaoAuditoria.hidden = !ehAdmin;

  await popularFiltrosDinamicos();

  formFiltros?.addEventListener('input', () => carregarRelatorios());
  document.querySelector('[data-acao="exportar-csv"]')?.addEventListener('click', exportarCsv);
  document.querySelector('[data-acao="exportar-pdf"]')?.addEventListener('click', exportarPdf);

  await carregarRelatorios();
  if (ehAdmin) await carregarAuditoria();
}

async function popularFiltrosDinamicos() {
  try {
    const [{ data: anos }, { data: fornecedores }] = await Promise.all([
      supabaseClient.rpc('relatorio_anual_filtrado', {
        p_ano: null, p_mes_inicio: null, p_mes_fim: null, p_fornecedor: null, p_status: null,
      }),
      supabaseClient.rpc('relatorio_fornecedor_filtrado', {
        p_ano: null, p_mes_inicio: null, p_mes_fim: null, p_fornecedor: null, p_status: null,
      }),
    ]);

    const seletorAno = document.getElementById('filtro-ano');
    (anos ?? []).forEach((linha) => {
      const opcao = document.createElement('option');
      opcao.value = String(linha.ano);
      opcao.textContent = String(linha.ano);
      seletorAno.appendChild(opcao);
    });

    const seletorFornecedor = document.getElementById('filtro-fornecedor');
    (fornecedores ?? []).forEach((linha) => {
      const opcao = document.createElement('option');
      opcao.value = linha.fornecedor;
      opcao.textContent = linha.fornecedor;
      seletorFornecedor.appendChild(opcao);
    });
  } catch (erro) {
    console.error('Falha ao popular filtros de relatório:', erro);
  }
}

function obterFiltrosAtuais() {
  return {
    p_ano: formFiltros.ano.value ? Number(formFiltros.ano.value) : null,
    p_mes_inicio: formFiltros.mesInicio.value ? Number(formFiltros.mesInicio.value) : null,
    p_mes_fim: formFiltros.mesFim.value ? Number(formFiltros.mesFim.value) : null,
    p_fornecedor: formFiltros.fornecedor.value || null,
    p_status: formFiltros.status.value || null,
  };
}

async function carregarRelatorios() {
  ocultarErro();
  const filtros = obterFiltrosAtuais();

  try {
    const [mensal, anual, fornecedor, departamento, status] = await Promise.all([
      supabaseClient.rpc('relatorio_mensal_filtrado', filtros),
      supabaseClient.rpc('relatorio_anual_filtrado', filtros),
      supabaseClient.rpc('relatorio_fornecedor_filtrado', filtros),
      supabaseClient.rpc('relatorio_departamento_filtrado', filtros),
      supabaseClient.rpc('relatorio_status_filtrado', filtros),
    ]);

    for (const resultado of [mensal, anual, fornecedor, departamento, status]) {
      if (resultado.error) throw resultado.error;
    }

    ultimosDados.mensal = mensal.data ?? [];
    ultimosDados.anual = anual.data ?? [];
    ultimosDados.fornecedor = fornecedor.data ?? [];
    ultimosDados.departamento = departamento.data ?? [];
    ultimosDados.status = status.data ?? [];

    renderizarMensal(ultimosDados.mensal);
    renderizarAnual(ultimosDados.anual);
    renderizarSimples('por-fornecedor', ultimosDados.fornecedor, (linha) => linha.fornecedor);
    renderizarSimples('por-departamento', ultimosDados.departamento, (linha) => linha.departamento);
    renderizarSimples('por-status', ultimosDados.status, (linha) => ROTULOS_STATUS[linha.status] ?? linha.status);
  } catch (erro) {
    console.error('Falha ao carregar relatórios:', erro);
    exibirErro('Não foi possível carregar os relatórios. Tente novamente mais tarde.');
  }
}

async function carregarAuditoria() {
  try {
    const { data, error } = await supabaseClient
      .from('vw_historico_auditoria')
      .select('descricao_item, acao, usuario_nome, usuario_email, data_hora, observacao')
      .order('data_hora', { ascending: false })
      .limit(100);

    if (error) throw error;

    ultimosDados.auditoria = data ?? [];
    renderizarAuditoria(ultimosDados.auditoria);
  } catch (erro) {
    console.error('Falha ao carregar auditoria:', erro);
    exibirErro('Não foi possível carregar o relatório de auditoria.');
  }
}

function renderizarMensal(linhas) {
  const corpo = document.querySelector('[data-tabela="por-mes"]');
  if (!corpo) return;
  limparCorpo(corpo);

  linhas.forEach((linha, indice) => {
    const tr = document.createElement('tr');

    const variacao = calcularVariacao(linha, linhas[indice - 1]);

    tr.appendChild(criarCelula(`${NOMES_MES[Number(linha.mes) - 1] ?? '?'}/${linha.ano}`));
    tr.appendChild(criarCelula(String(linha.total_pedidos)));
    tr.appendChild(criarCelula(formatadorMoeda.format(Number(linha.valor_total ?? 0)), 'u-texto-direita'));
    tr.appendChild(criarCelula(formatadorMoeda.format(Number(linha.ticket_medio ?? 0)), 'u-texto-direita'));
    tr.appendChild(criarCelula(variacao, 'u-texto-direita'));

    corpo.appendChild(tr);
  });

  if (linhas.length === 0) corpo.appendChild(criarLinhaVazia(5));
}

export function calcularVariacao(linhaAtual, linhaAnterior) {
  if (!linhaAnterior || Number(linhaAnterior.valor_total) === 0) return '—';
  const atual = Number(linhaAtual.valor_total ?? 0);
  const anterior = Number(linhaAnterior.valor_total ?? 0);
  const variacao = (atual - anterior) / anterior;
  return formatadorPercentual.format(variacao);
}

function renderizarAnual(linhas) {
  const corpo = document.querySelector('[data-tabela="por-ano"]');
  if (!corpo) return;
  limparCorpo(corpo);

  linhas.forEach((linha) => {
    const tr = document.createElement('tr');
    tr.appendChild(criarCelula(String(linha.ano)));
    tr.appendChild(criarCelula(String(linha.total_pedidos)));
    tr.appendChild(criarCelula(formatadorMoeda.format(Number(linha.valor_total ?? 0)), 'u-texto-direita'));
    tr.appendChild(criarCelula(formatadorMoeda.format(Number(linha.ticket_medio ?? 0)), 'u-texto-direita'));
    corpo.appendChild(tr);
  });

  if (linhas.length === 0) corpo.appendChild(criarLinhaVazia(4));
}

function renderizarSimples(chaveTabela, linhas, obterRotulo) {
  const corpo = document.querySelector(`[data-tabela="${chaveTabela}"]`);
  if (!corpo) return;
  limparCorpo(corpo);

  linhas.forEach((linha) => {
    const tr = document.createElement('tr');
    tr.appendChild(criarCelula(obterRotulo(linha)));
    tr.appendChild(criarCelula(String(linha.total_pedidos)));
    tr.appendChild(criarCelula(formatadorMoeda.format(Number(linha.valor_total ?? 0)), 'u-texto-direita'));
    corpo.appendChild(tr);
  });

  if (linhas.length === 0) corpo.appendChild(criarLinhaVazia(3));
}

function renderizarAuditoria(linhas) {
  const corpo = document.querySelector('[data-tabela="auditoria"]');
  if (!corpo) return;
  limparCorpo(corpo);

  linhas.forEach((registro) => {
    const tr = document.createElement('tr');
    tr.appendChild(criarCelula(registro.data_hora ? formatadorDataHora.format(new Date(registro.data_hora)) : '—'));
    tr.appendChild(criarCelula(registro.descricao_item ?? '—'));

    const celulaAcao = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = registro.acao === 'aprovado' ? 'badge badge--concluido' : 'badge badge--reprovado';
    badge.textContent = ROTULOS_ACAO[registro.acao] ?? registro.acao ?? '—';
    celulaAcao.appendChild(badge);
    tr.appendChild(celulaAcao);

    tr.appendChild(criarCelula(registro.usuario_nome ?? registro.usuario_email ?? '—'));
    tr.appendChild(criarCelula(registro.observacao ?? '—'));

    corpo.appendChild(tr);
  });

  if (linhas.length === 0) corpo.appendChild(criarLinhaVazia(5));
}

function criarCelula(texto, classe) {
  const td = document.createElement('td');
  td.textContent = texto;
  if (classe) td.className = classe;
  return td;
}

function criarLinhaVazia(colspan) {
  const tr = document.createElement('tr');
  const td = document.createElement('td');
  td.colSpan = colspan;
  td.className = 'estado-vazio';
  td.textContent = 'Nenhum dado encontrado para os filtros selecionados.';
  tr.appendChild(td);
  return tr;
}

function limparCorpo(corpo) {
  while (corpo.firstChild) corpo.removeChild(corpo.firstChild);
}

function exportarCsv() {
  try {
    const secoes = [
      ['Resumo mensal', ['Mês', 'Pedidos', 'Valor total', 'Ticket médio'],
        ultimosDados.mensal.map((l) => [`${NOMES_MES[Number(l.mes) - 1]}/${l.ano}`, l.total_pedidos, formatarNumeroCsv(l.valor_total), formatarNumeroCsv(l.ticket_medio)])],
      ['Resumo anual', ['Ano', 'Pedidos', 'Valor total', 'Ticket médio'],
        ultimosDados.anual.map((l) => [l.ano, l.total_pedidos, formatarNumeroCsv(l.valor_total), formatarNumeroCsv(l.ticket_medio)])],
      ['Resumo por fornecedor', ['Fornecedor', 'Pedidos', 'Valor total'],
        ultimosDados.fornecedor.map((l) => [l.fornecedor, l.total_pedidos, formatarNumeroCsv(l.valor_total)])],
      ['Resumo por departamento', ['Departamento', 'Pedidos', 'Valor total'],
        ultimosDados.departamento.map((l) => [l.departamento, l.total_pedidos, formatarNumeroCsv(l.valor_total)])],
      ['Resumo por status', ['Status', 'Pedidos', 'Valor total'],
        ultimosDados.status.map((l) => [ROTULOS_STATUS[l.status] ?? l.status, l.total_pedidos, formatarNumeroCsv(l.valor_total)])],
    ];

    if (ehAdmin) {
      secoes.push(['Auditoria', ['Data/hora', 'Pedido', 'Ação', 'Responsável', 'Observação'],
        ultimosDados.auditoria.map((l) => [
          l.data_hora ? formatadorDataHora.format(new Date(l.data_hora)) : '',
          l.descricao_item ?? '',
          ROTULOS_ACAO[l.acao] ?? l.acao ?? '',
          l.usuario_nome ?? l.usuario_email ?? '',
          l.observacao ?? '',
        ])]);
    }

    const blocos = secoes.map(([titulo, cabecalho, linhas]) => {
      const partes = [titulo, cabecalho.map(escaparCampoCsv).join(';')];
      linhas.forEach((linha) => partes.push(linha.map(escaparCampoCsv).join(';')));
      return partes.join('\r\n');
    });

    const conteudoCsv = blocos.join('\r\n\r\n');
    const blob = new Blob([`﻿${conteudoCsv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorios-compras-ti-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (erro) {
    console.error('Falha ao exportar CSV:', erro);
    exibirErro('Não foi possível gerar o arquivo CSV.');
  }
}

export function formatarNumeroCsv(valor) {
  return String(Number(valor ?? 0).toFixed(2)).replace('.', ',');
}

// Neutraliza injeção de fórmula em CSV (ex.: `=cmd|'/C calc'!A0`): prefixa
// com aspas simples qualquer valor iniciado por =, +, - ou @, que o Excel/
// LibreOffice interpretariam como fórmula ao abrir o arquivo.
export function escaparCampoCsv(valor) {
  let texto = String(valor ?? '');
  if (/^[=+\-@]/.test(texto)) texto = `'${texto}`;
  const precisaAspas = /[";\r\n]/.test(texto);
  texto = texto.replace(/"/g, '""');
  return precisaAspas ? `"${texto}"` : texto;
}

function exportarPdf() {
  try {
    if (!window.jspdf?.jsPDF) {
      exibirErro('Biblioteca de PDF não carregou. Recarregue a página e tente novamente.');
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt' });
    const largura = doc.internal.pageSize.getWidth();

    desenharCabecalhoPdf(doc, largura);

    let posicaoY = 110;
    posicaoY = desenharTabelaPdf(doc, posicaoY, 'Resumo mensal', ['Mês', 'Pedidos', 'Valor total', 'Ticket médio'],
      ultimosDados.mensal.map((l) => [`${NOMES_MES[Number(l.mes) - 1]}/${l.ano}`, l.total_pedidos, formatadorMoeda.format(Number(l.valor_total)), formatadorMoeda.format(Number(l.ticket_medio))]));

    posicaoY = desenharTabelaPdf(doc, posicaoY, 'Resumo anual', ['Ano', 'Pedidos', 'Valor total', 'Ticket médio'],
      ultimosDados.anual.map((l) => [l.ano, l.total_pedidos, formatadorMoeda.format(Number(l.valor_total)), formatadorMoeda.format(Number(l.ticket_medio))]));

    posicaoY = desenharTabelaPdf(doc, posicaoY, 'Resumo por fornecedor', ['Fornecedor', 'Pedidos', 'Valor total'],
      ultimosDados.fornecedor.map((l) => [l.fornecedor, l.total_pedidos, formatadorMoeda.format(Number(l.valor_total))]));

    posicaoY = desenharTabelaPdf(doc, posicaoY, 'Resumo por departamento', ['Departamento', 'Pedidos', 'Valor total'],
      ultimosDados.departamento.map((l) => [l.departamento, l.total_pedidos, formatadorMoeda.format(Number(l.valor_total))]));

    posicaoY = desenharTabelaPdf(doc, posicaoY, 'Resumo por status', ['Status', 'Pedidos', 'Valor total'],
      ultimosDados.status.map((l) => [ROTULOS_STATUS[l.status] ?? l.status, l.total_pedidos, formatadorMoeda.format(Number(l.valor_total))]));

    if (ehAdmin && ultimosDados.auditoria.length > 0) {
      desenharTabelaPdf(doc, posicaoY, 'Auditoria (últimos 100 registros)', ['Data/hora', 'Pedido', 'Ação', 'Responsável', 'Observação'],
        ultimosDados.auditoria.map((l) => [
          l.data_hora ? formatadorDataHora.format(new Date(l.data_hora)) : '—',
          l.descricao_item ?? '—',
          ROTULOS_ACAO[l.acao] ?? l.acao ?? '—',
          l.usuario_nome ?? l.usuario_email ?? '—',
          l.observacao ?? '—',
        ]));
    }

    adicionarRodapePdf(doc);
    doc.save(`relatorios-compras-ti-${new Date().toISOString().slice(0, 10)}.pdf`);
  } catch (erro) {
    console.error('Falha ao exportar PDF:', erro);
    exibirErro('Não foi possível gerar o arquivo PDF.');
  }
}

function desenharCabecalhoPdf(doc, largura) {
  doc.setFillColor(...CORES_PDF.azulPrimaria);
  doc.rect(0, 0, largura, 70, 'F');

  doc.setFillColor(...CORES_PDF.laranja);
  doc.rect(0, 70, largura, 4, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text('Disktrans — Controle de Compras T.I.', 40, 35);

  doc.setFontSize(11);
  doc.text(`Relatório gerado em ${new Date().toLocaleString('pt-BR')}`, 40, 55);
}

function desenharTabelaPdf(doc, posicaoY, titulo, cabecalho, linhas) {
  const alturaPagina = doc.internal.pageSize.getHeight();
  let y = posicaoY;

  if (y > alturaPagina - 100) {
    doc.addPage();
    y = 40;
  }

  doc.setTextColor(...CORES_PDF.texto);
  doc.setFontSize(13);
  doc.text(titulo, 40, y);

  doc.autoTable({
    startY: y + 10,
    head: [cabecalho],
    body: linhas.length > 0 ? linhas : [['Sem dados', ...Array(cabecalho.length - 1).fill('—')]],
    styles: { fontSize: 9, textColor: CORES_PDF.texto },
    headStyles: { fillColor: CORES_PDF.azulPrimaria, textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [245, 246, 248] },
    margin: { left: 40, right: 40 },
  });

  return doc.lastAutoTable.finalY + 30;
}

function adicionarRodapePdf(doc) {
  const totalPaginas = doc.internal.getNumberOfPages();
  const largura = doc.internal.pageSize.getWidth();
  const altura = doc.internal.pageSize.getHeight();

  for (let pagina = 1; pagina <= totalPaginas; pagina += 1) {
    doc.setPage(pagina);
    doc.setFontSize(8);
    doc.setTextColor(...CORES_PDF.texto);
    doc.text(`Página ${pagina} de ${totalPaginas}`, largura - 90, altura - 20);
  }
}

function exibirErro(texto) {
  if (!mensagemErroEl) return;
  mensagemErroEl.textContent = texto;
  mensagemErroEl.hidden = false;
}

function ocultarErro() {
  if (mensagemErroEl) mensagemErroEl.hidden = true;
}
