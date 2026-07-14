// Página Dashboard: KPIs e gráficos agregados.
//
// Princípio de minimização (LGPD): nunca buscamos a tabela `pedidos`
// inteira no navegador. Os números vêm de uma função agregada
// (`estatisticas_kpis`) e de views que já retornam os dados prontos para
// os gráficos (`vw_relatorio_mensal`, `vw_status_pedidos`,
// `vw_relatorio_fornecedor`, `vw_relatorio_departamento`). O RLS de
// `pedidos` continua valendo dentro dessas views/função (security invoker),
// então cada usuário só agrega o que já teria permissão de ver.

import { inicializarPortal } from './portal.js';
import { supabaseClient } from './supabaseClient.js';

const NOMES_MES = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

const CORES = {
  azulPrimaria: '#004C96',
  laranja: '#F4941D',
  azulMedio: '#0A7AC9',
  statusConcluido: '#2F855A',
  statusAguardando: '#B45309',
  statusReprovado: '#C53030',
};

const ROTULOS_STATUS = {
  concluido: 'Concluído',
  aguardando_aprovacao: 'Aguardando aprovação',
  reprovado: 'Reprovado',
};

const formatadorMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

inicializar();

async function inicializar() {
  const contexto = await inicializarPortal();
  if (!contexto) return;

  await carregarDashboard();
}

async function carregarDashboard() {
  try {
    const [kpis, mensal, status, departamento, fornecedores] = await Promise.all([
      buscarKpis(),
      buscarRelatorioMensal(),
      buscarStatusPedidos(),
      buscarRelatorioDepartamento(),
      buscarTopFornecedores(),
    ]);

    renderizarKpis(kpis);
    renderizarGraficoMensal(mensal);
    renderizarGraficoStatus(status);
    renderizarGraficoDepartamento(departamento);
    renderizarGraficoFornecedores(fornecedores);
  } catch (erro) {
    console.error('Falha ao carregar dados do dashboard:', erro);
    exibirErro('Não foi possível carregar os dados do dashboard. Tente novamente mais tarde.');
  }
}

async function buscarKpis() {
  const { data, error } = await supabaseClient.rpc('estatisticas_kpis');
  if (error) throw error;
  return data?.[0] ?? { valor_total: 0, total_pedidos: 0, aguardando: 0, reprovados: 0 };
}

async function buscarRelatorioMensal() {
  const { data, error } = await supabaseClient
    .from('vw_relatorio_mensal')
    .select('ano, mes, valor_total')
    .order('ano', { ascending: true })
    .order('mes', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

async function buscarStatusPedidos() {
  const { data, error } = await supabaseClient.from('vw_status_pedidos').select('status, total_pedidos');
  if (error) throw error;
  return data ?? [];
}

async function buscarRelatorioDepartamento() {
  const { data, error } = await supabaseClient
    .from('vw_relatorio_departamento')
    .select('departamento, valor_total')
    .limit(10);

  if (error) throw error;
  return data ?? [];
}

async function buscarTopFornecedores() {
  const { data, error } = await supabaseClient
    .from('vw_relatorio_fornecedor')
    .select('fornecedor, valor_total')
    .limit(8);

  if (error) throw error;
  return data ?? [];
}

function renderizarKpis(kpis) {
  definirTextoKpi('valor-total', formatadorMoeda.format(Number(kpis.valor_total ?? 0)));
  definirTextoKpi('total-pedidos', String(kpis.total_pedidos ?? 0));
  definirTextoKpi('aguardando', String(kpis.aguardando ?? 0));
  definirTextoKpi('reprovados', String(kpis.reprovados ?? 0));
}

function definirTextoKpi(chave, texto) {
  const elemento = document.querySelector(`[data-kpi="${chave}"]`);
  if (elemento) elemento.textContent = texto;
}

function renderizarGraficoMensal(linhasMensal) {
  const canvas = document.getElementById('grafico-mensal');
  if (!canvas || typeof window.Chart === 'undefined') return;

  const rotulos = linhasMensal.map((linha) => `${NOMES_MES[Number(linha.mes) - 1] ?? '?'}/${linha.ano}`);
  const valores = linhasMensal.map((linha) => Number(linha.valor_total ?? 0));

  new window.Chart(canvas, {
    type: 'bar',
    data: {
      labels: rotulos,
      datasets: [{
        label: 'Valor comprado (R$)',
        data: valores,
        backgroundColor: CORES.azulPrimaria,
        borderRadius: 4,
      }],
    },
    options: opcoesGraficoBase(),
  });
}

function renderizarGraficoStatus(linhasStatus) {
  const canvas = document.getElementById('grafico-status');
  if (!canvas || typeof window.Chart === 'undefined') return;

  const mapa = new Map(linhasStatus.map((linha) => [linha.status, linha.total_pedidos]));

  new window.Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: Object.values(ROTULOS_STATUS),
      datasets: [{
        data: Object.keys(ROTULOS_STATUS).map((chave) => mapa.get(chave) ?? 0),
        backgroundColor: [CORES.statusConcluido, CORES.statusAguardando, CORES.statusReprovado],
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' } },
    },
  });
}

function renderizarGraficoDepartamento(linhasDepartamento) {
  const canvas = document.getElementById('grafico-departamento');
  if (!canvas || typeof window.Chart === 'undefined') return;

  new window.Chart(canvas, {
    type: 'bar',
    data: {
      labels: linhasDepartamento.map((linha) => linha.departamento),
      datasets: [{
        label: 'Valor comprado (R$)',
        data: linhasDepartamento.map((linha) => Number(linha.valor_total ?? 0)),
        backgroundColor: CORES.azulMedio,
        borderRadius: 4,
      }],
    },
    options: { ...opcoesGraficoBase(), indexAxis: 'y' },
  });
}

function renderizarGraficoFornecedores(linhasFornecedores) {
  const canvas = document.getElementById('grafico-fornecedores');
  if (!canvas || typeof window.Chart === 'undefined') return;

  new window.Chart(canvas, {
    type: 'bar',
    data: {
      labels: linhasFornecedores.map((linha) => linha.fornecedor),
      datasets: [{
        label: 'Valor comprado (R$)',
        data: linhasFornecedores.map((linha) => Number(linha.valor_total ?? 0)),
        backgroundColor: CORES.laranja,
        borderRadius: 4,
      }],
    },
    options: { ...opcoesGraficoBase(), indexAxis: 'y' },
  });
}

function opcoesGraficoBase() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true } },
  };
}

function exibirErro(texto) {
  const elemento = document.getElementById('mensagem-erro');
  if (!elemento) return;
  elemento.textContent = texto;
  elemento.hidden = false;
}
