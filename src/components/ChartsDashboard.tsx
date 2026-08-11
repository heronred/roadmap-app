import React, { useState, useRef } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
} from 'recharts';
import {
  Layers,
  CheckCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  ListCheck,
  Calendar,
  Filter,
  Download,
  PieChart as PieIcon,
  BarChart2,
  Sparkles,
  ChevronRight,
  Presentation,
  FileDown,
  FileSpreadsheet,
  FileText,
  Loader2,
  Info,
} from 'lucide-react';
import { UploadedDataset, OndaSummary } from '../types';
import { computeAnalytics } from '../utils/analytics';
import { exportToPowerPoint, exportDashboardToPDF } from '../utils/exportReport';

interface ChartsDashboardProps {
  dataset: UploadedDataset;
  onGoToUpload: () => void;
}

export const ChartsDashboard: React.FC<ChartsDashboardProps> = ({ dataset, onGoToUpload }) => {
  const [customRefDate, setCustomRefDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [activeDeadlineTab, setActiveDeadlineTab] = useState<'ALL' | 'OVERDUE' | 'DUE_SOON' | 'ON_TRACK' | 'NO_START_DATE'>('ALL');
  const [superAppFilter, setSuperAppFilter] = useState<'PENDING' | 'ALL' | 'COMPLETED'>('PENDING');
  const [selectedSuperAppOnda, setSelectedSuperAppOnda] = useState<string>('ALL');

  const analytics = computeAnalytics(dataset.rows, customRefDate);
  const deadlines = analytics.deadlineAnalytics;

  // SuperApp Homologation Items calculation
  const superAppItems = React.useMemo(() => {
    return dataset.rows
      .filter(
        (r) =>
          r.funcionalidade.toLowerCase().includes('homolog') ||
          r.etapa.toLowerCase().includes('homolog')
      )
      .sort((a, b) => a.rawRowIndex - b.rawRowIndex);
  }, [dataset.rows]);

  const availableSuperAppOndas = React.useMemo(() => {
    const ondaSet = new Set<string>();
    superAppItems.forEach((r) => {
      if (r.onda) ondaSet.add(r.onda);
    });
    return Array.from(ondaSet).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [superAppItems]);

  const superAppItemsByOnda = React.useMemo(() => {
    if (selectedSuperAppOnda === 'ALL') return superAppItems;
    return superAppItems.filter((r) => r.onda === selectedSuperAppOnda);
  }, [superAppItems, selectedSuperAppOnda]);

  const superAppPendingCount = React.useMemo(() => {
    return superAppItemsByOnda.filter((r) => (r.calculatedPorcentagem ?? r.porcentagem) < 100).length;
  }, [superAppItemsByOnda]);

  const superAppCompletedCount = React.useMemo(() => {
    return superAppItemsByOnda.filter((r) => (r.calculatedPorcentagem ?? r.porcentagem) === 100).length;
  }, [superAppItemsByOnda]);

  const displayedSuperAppItems = React.useMemo(() => {
    if (superAppFilter === 'PENDING') {
      return superAppItemsByOnda.filter((r) => (r.calculatedPorcentagem ?? r.porcentagem) < 100);
    }
    if (superAppFilter === 'COMPLETED') {
      return superAppItemsByOnda.filter((r) => (r.calculatedPorcentagem ?? r.porcentagem) === 100);
    }
    return superAppItemsByOnda;
  }, [superAppItemsByOnda, superAppFilter]);

  const dashboardRef = useRef<HTMLDivElement>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);
  const [pdfStatusText, setPdfStatusText] = useState('Iniciando exportação...');
  const [isExportingPptx, setIsExportingPptx] = useState(false);

  const [selectedOndaName, setSelectedOndaName] = useState<string>(
    analytics.ondaSummaries[0]?.onda || 'ONDA 1'
  );

  const selectedOndaSummary =
    analytics.ondaSummaries.find((o) => o.onda === selectedOndaName) ||
    analytics.ondaSummaries[0];

  // Colors palette
  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

  const getStatusBadge = (pct: number) => {
    if (pct === 100) return <span className="text-emerald-400 font-semibold">Concluído (100%)</span>;
    if (pct >= 50) return <span className="text-blue-400 font-semibold">Em Andamento ({pct}%)</span>;
    if (pct > 0) return <span className="text-amber-400 font-semibold font-medium">Inicial ({pct}%)</span>;
    return <span className="text-slate-400">Pendente (0%)</span>;
  };

  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Onda;Funcionalidade;Inicio Estimativa;Termino Estimativa;Etapa;Porcentagem\n';

    dataset.rows.forEach((r) => {
      csvContent += `"${r.onda}";"${r.funcionalidade}";"${r.inicioEstimativa || ''}";"${r.terminoEstimativa || ''}";"${r.etapa}";${r.porcentagem}%\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `relatorio_ondas_${dataset.metadata.fileName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPPTX = async () => {
    setIsExportingPptx(true);
    await exportToPowerPoint(dataset);
    setIsExportingPptx(false);
  };

  const handleExportPDF = async () => {
    setIsExportingPdf(true);
    setPdfProgress(0);
    setPdfStatusText('Montando relatório...');

    await exportDashboardToPDF(
      dataset,
      dataset.metadata.fileName,
      (progress, text) => {
        setPdfProgress(progress);
        if (text) setPdfStatusText(text);
      }
    );

    setTimeout(() => {
      setIsExportingPdf(false);
    }, 600);
  };

  return (
    <div ref={dashboardRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30">
              Análise Automática
            </span>
            <span className="text-xs text-slate-400">
              {dataset.metadata.fileName} ({dataset.metadata.rowCount} itens)
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Dashboard Processado de Ondas
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Gráficos dinâmicos divididos por Onda e percentual de progresso da Coluna G
          </p>
        </div>

        {/* Action Buttons: PPTX, PDF, CSV & Upload */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={handleExportPPTX}
            disabled={isExportingPptx}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-colors disabled:opacity-50"
            title="Exportar apresentação de slides (.pptx)"
          >
            <Presentation className="w-4 h-4 text-amber-400" />
            <span>{isExportingPptx ? 'Gerando PPTX...' : 'Exportar PPTX'}</span>
          </button>

          <button
            onClick={handleExportPDF}
            disabled={isExportingPdf}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-red-300 border border-red-500/30 text-xs font-semibold transition-colors disabled:opacity-50"
            title="Exportar relatório em PDF (.pdf)"
          >
            <FileDown className="w-4 h-4 text-red-400" />
            <span>{isExportingPdf ? 'Gerando PDF...' : 'Exportar PDF'}</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors"
            title="Exportar dados processados (.csv)"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>CSV</span>
          </button>

          <button
            onClick={onGoToUpload}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors shadow-md shadow-emerald-950"
          >
            <Sparkles className="w-4 h-4" />
            <span>Subir Nova Planilha</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Ondas & Macro-Itens */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Macro-Itens (Pai)</span>
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-white">{analytics.totalMacroItems || analytics.totalRows}</span>
            <span className="text-xs text-slate-400">itens principais</span>
          </div>
          <p className="text-[11px] text-slate-400">
            {analytics.totalOndas} ondas • {analytics.totalSubitems} sub-tarefas
          </p>
        </div>

        {/* KPI 2: Progresso Médio Ponderado */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Avanço Geral</span>
            <div className="p-2.5 rounded-xl bg-teal-500/20 text-teal-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-teal-400">{analytics.overallAvgProgress}%</span>
            <span className="text-xs text-slate-400">calculado dos subitens</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-teal-500 to-emerald-400 h-full transition-all duration-500"
              style={{ width: `${analytics.overallAvgProgress}%` }}
            />
          </div>
        </div>

        {/* KPI 3: Macro-Itens Concluídos */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Concluídos (100%)</span>
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-emerald-400">{analytics.completedMacroCount || analytics.completedItems}</span>
            <span className="text-xs text-slate-400">
              de {analytics.totalMacroItems || analytics.totalRows} macro-itens
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            {analytics.completedItems} subtarefas finalizadas
          </p>
        </div>

        {/* KPI 4: Em Andamento / Pendentes */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Em Andamento / Pendente</span>
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline space-x-3">
            <div>
              <span className="text-2xl font-black text-amber-400">{analytics.inProgressMacroCount || analytics.inProgressItems}</span>
              <span className="text-[10px] text-slate-400 ml-1">em andamento</span>
            </div>
            <div>
              <span className="text-2xl font-black text-slate-400">{analytics.notStartedMacroCount || analytics.notStartedItems}</span>
              <span className="text-[10px] text-slate-400 ml-1">pendentes</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400">Evolução monitorada por subitem</p>
        </div>
      </div>

      {/* SEÇÃO DE ANÁLISE DE PRAZOS & TAREFAS ATRASADAS / PRÓXIMAS AO VENCIMENTO (COLUNAS D & E) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        {/* Header & Date Controller */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 text-xs font-semibold border border-red-500/30 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                <span>Análise de Prazos (Colunas D & E vs Coluna G)</span>
              </span>
              <span className="text-xs text-slate-400">
                Acompanhamento temporal de entregas
              </span>
            </div>
            <h2 className="text-xl font-black text-white flex items-center space-x-2">
              <span>Tarefas Atrasadas & Próximas ao Vencimento</span>
            </h2>
            <p className="text-xs text-slate-400">
              Identificação de prazos extrapolados e alertas de tarefas com término previsto nos próximos 15 dias.
            </p>
          </div>

          {/* Reference Date Selector */}
          <div className="flex items-center space-x-3 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 shrink-0">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold text-slate-300">Data de Referência:</span>
            </div>
            <input
              type="date"
              value={customRefDate}
              onChange={(e) => e.target.value && setCustomRefDate(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
            />
            <button
              onClick={() => setCustomRefDate(new Date().toISOString().split('T')[0])}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 border border-slate-700 transition-colors"
              title="Resetar para Hoje"
            >
              Hoje
            </button>
          </div>
        </div>

        {/* Deadline Alert Badges Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            onClick={() => setActiveDeadlineTab('OVERDUE')}
            className={`p-4 rounded-xl border text-left transition-all ${
              activeDeadlineTab === 'OVERDUE'
                ? 'bg-red-950/50 border-red-500/60 ring-2 ring-red-500/20'
                : 'bg-slate-950/60 border-slate-800 hover:border-red-500/40'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-semibold text-red-400">
              <span>Atrasadas (Vencidas)</span>
              <AlertTriangle className="w-4 h-4 text-red-400" />
            </div>
            <div className="text-2xl font-black text-red-400 mt-1">
              {deadlines.overdueCount}
            </div>
            <span className="text-[11px] text-slate-400">Término previsto expirado</span>
          </button>

          <button
            onClick={() => setActiveDeadlineTab('DUE_SOON')}
            className={`p-4 rounded-xl border text-left transition-all ${
              activeDeadlineTab === 'DUE_SOON'
                ? 'bg-amber-950/50 border-amber-500/60 ring-2 ring-amber-500/20'
                : 'bg-slate-950/60 border-slate-800 hover:border-amber-500/40'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-semibold text-amber-400">
              <span>Próximas (≤ 15 Dias)</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-amber-400 mt-1">
              {deadlines.dueSoonCount}
            </div>
            <span className="text-[11px] text-slate-400">Vencimento nos próximos dias</span>
          </button>

          <button
            onClick={() => setActiveDeadlineTab('NO_START_DATE')}
            className={`p-4 rounded-xl border text-left transition-all ${
              activeDeadlineTab === 'NO_START_DATE'
                ? 'bg-slate-800/80 border-slate-500/60 ring-2 ring-slate-500/20'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-600'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <span>Sem Data de Início</span>
              <Calendar className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-black text-slate-200 mt-1">
              {deadlines.noStartDateCount}
            </div>
            <span className="text-[11px] text-slate-400">Prazos não definidos</span>
          </button>

          <button
            onClick={() => setActiveDeadlineTab('ALL')}
            className={`p-4 rounded-xl border text-left transition-all ${
              activeDeadlineTab === 'ALL'
                ? 'bg-emerald-950/50 border-emerald-500/60 ring-2 ring-emerald-500/20'
                : 'bg-slate-950/60 border-slate-800 hover:border-emerald-500/40'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-semibold text-emerald-400">
              <span>No Prazo / Concluídas</span>
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-emerald-400 mt-1">
              {deadlines.onTrackCount + deadlines.completedCount}
            </div>
            <span className="text-[11px] text-slate-400">Dentro do cronograma</span>
          </button>
        </div>

        {/* Charts Row for Deadlines: BarChart por Onda & PieChart Risco */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* BarChart: Atrasos & Próximos Vencimentos por Onda */}
          <div className="lg:col-span-2 bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <BarChart2 className="w-4 h-4 text-red-400" />
                  <span>Gráfico de Prazos por Onda (Coluna E vs Data Atual)</span>
                </h3>
                <p className="text-xs text-slate-400">Comparativo de tarefas Atrasadas, Próximas ao Vencimento, Sem Data e No Prazo</p>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deadlines.ondaDeadlineSummaries} margin={{ top: 15, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                  <XAxis dataKey="onda" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-slate-950 border border-slate-700 p-3 rounded-xl text-xs space-y-1 shadow-xl">
                            <p className="font-bold text-white">{label}</p>
                            {payload.map((entry, idx) => (
                              <p key={idx} style={{ color: entry.color }}>
                                {entry.name}: <strong>{entry.value}</strong>
                              </p>
                            ))}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  <Bar dataKey="overdueCount" name="Atrasadas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="dueSoonCount" name="Próximas (≤15d)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="noStartDateCount" name="Sem Data de Início" fill="#64748b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="onTrackCount" name="No Prazo" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="completedCount" name="Concluídas" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Legenda Explicativa de Status e Prazo Padrão */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 text-xs text-slate-300 space-y-2 mt-2">
              <div className="flex items-center gap-1.5 font-bold text-sky-400">
                <Info className="w-4 h-4 text-sky-400 shrink-0" />
                <span>Legenda e Regra de Prazos (Coluna E & Data Atual)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-[11px] text-slate-400">
                <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                  <div className="font-bold text-blue-300 flex items-center gap-1.5 mb-0.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                    <span>No Prazo (31/12/2026 Padrão)</span>
                  </div>
                  <p className="leading-tight">
                    Tarefas em andamento com prazo futuro. Tarefas sem data final na Coluna E consideram <strong>31/12/2026</strong> como prazo padrão.
                  </p>
                </div>

                <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                  <div className="font-bold text-red-300 flex items-center gap-1.5 mb-0.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
                    <span>Atrasadas (Prazo Estourado)</span>
                  </div>
                  <p className="leading-tight">
                    Tarefas em andamento cuja data final de término (Coluna E) é menor que a data atual de referência.
                  </p>
                </div>

                <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                  <div className="font-bold text-amber-300 flex items-center gap-1.5 mb-0.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                    <span>Próximas ao Vencimento</span>
                  </div>
                  <p className="leading-tight">
                    Tarefas em andamento com vencimento nos próximos 15 dias em relação à data atual.
                  </p>
                </div>

                <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                  <div className="font-bold text-emerald-300 flex items-center gap-1.5 mb-0.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                    <span>Concluídas</span>
                  </div>
                  <p className="leading-tight">
                    Tarefas finalizadas (progresso igual a 100%).
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* PieChart: Proporção de Saúde do Cronograma */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-3 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <PieIcon className="w-4 h-4 text-amber-400" />
                <span>Proporção de Saúde do Cronograma</span>
              </h3>
              <p className="text-xs text-slate-400">Distribuição por status de prazo</p>
            </div>

            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Atrasadas', value: deadlines.overdueCount, fill: '#ef4444' },
                      { name: 'Próximas ao Vencimento', value: deadlines.dueSoonCount, fill: '#f59e0b' },
                      { name: 'Sem Data de Início', value: deadlines.noStartDateCount, fill: '#64748b' },
                      { name: 'No Prazo / Concluídas', value: deadlines.onTrackCount + deadlines.completedCount, fill: '#10b981' },
                    ].filter((d) => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {[
                      { name: 'Atrasadas', value: deadlines.overdueCount, fill: '#ef4444' },
                      { name: 'Próximas ao Vencimento', value: deadlines.dueSoonCount, fill: '#f59e0b' },
                      { name: 'Sem Data de Início', value: deadlines.noStartDateCount, fill: '#64748b' },
                      { name: 'No Prazo / Concluídas', value: deadlines.onTrackCount + deadlines.completedCount, fill: '#10b981' },
                    ]
                      .filter((d) => d.value > 0)
                      .map((entry, index) => (
                        <Cell key={`cell-pie-${index}`} fill={entry.fill} />
                      ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0];
                        return (
                          <div className="bg-slate-900 border border-slate-700 p-2 rounded-lg text-xs shadow-xl">
                            <span style={{ color: data.payload.fill }} className="font-bold">
                              {data.name}: {data.value} tarefas
                            </span>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-1.5 text-xs pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"/> Atrasadas</span>
                <span className="font-bold text-red-400">{deadlines.overdueCount}</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"/> Próximas ao Vencimento</span>
                <span className="font-bold text-amber-400">{deadlines.dueSoonCount}</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-500 inline-block"/> Sem Data de Início</span>
                <span className="font-bold text-slate-400">{deadlines.noStartDateCount}</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"/> No Prazo / Concluídas</span>
                <span className="font-bold text-emerald-400">{deadlines.onTrackCount + deadlines.completedCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Risk List Table */}
        <div className="space-y-3 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
              <span>Lista de Alertas e Prazos do Projeto</span>
              <span className="text-slate-500 font-mono">
                ({
                  activeDeadlineTab === 'OVERDUE'
                    ? deadlines.overdueItems.length
                    : activeDeadlineTab === 'DUE_SOON'
                    ? deadlines.dueSoonItems.length
                    : activeDeadlineTab === 'ON_TRACK'
                    ? deadlines.onTrackItems.length
                    : activeDeadlineTab === 'NO_START_DATE'
                    ? deadlines.noStartDateItems.length
                    : deadlines.overdueItems.length + deadlines.dueSoonItems.length + deadlines.noStartDateItems.length + deadlines.onTrackItems.length
                } itens)
              </span>
            </h3>

            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 self-start sm:self-auto">
              <button
                onClick={() => setActiveDeadlineTab('ALL')}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                  activeDeadlineTab === 'ALL' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Todos Alertas
              </button>
              <button
                onClick={() => setActiveDeadlineTab('OVERDUE')}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                  activeDeadlineTab === 'OVERDUE' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Atrasadas ({deadlines.overdueCount})
              </button>
              <button
                onClick={() => setActiveDeadlineTab('DUE_SOON')}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                  activeDeadlineTab === 'DUE_SOON' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Próximas ({deadlines.dueSoonCount})
              </button>
              <button
                onClick={() => setActiveDeadlineTab('ON_TRACK')}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                  activeDeadlineTab === 'ON_TRACK' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                No Prazo ({deadlines.onTrackCount})
              </button>
              <button
                onClick={() => setActiveDeadlineTab('NO_START_DATE')}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                  activeDeadlineTab === 'NO_START_DATE' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Sem Data ({deadlines.noStartDateCount})
              </button>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[360px] overflow-y-auto border border-slate-800 rounded-xl bg-slate-950/60">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-900 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-800 z-10">
                <tr>
                  <th className="py-2.5 px-3">Status de Risco</th>
                  <th className="py-2.5 px-3">Funcionalidade / Tarefa</th>
                  <th className="py-2.5 px-3">Onda / Etapa</th>
                  <th className="py-2.5 px-3">Início (Col D)</th>
                  <th className="py-2.5 px-3">Término Previsto (Col E)</th>
                  <th className="py-2.5 px-3 text-right">Progresso (Col G)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {(
                  activeDeadlineTab === 'OVERDUE'
                    ? deadlines.overdueItems
                    : activeDeadlineTab === 'DUE_SOON'
                    ? deadlines.dueSoonItems
                    : activeDeadlineTab === 'ON_TRACK'
                    ? deadlines.onTrackItems
                    : activeDeadlineTab === 'NO_START_DATE'
                    ? deadlines.noStartDateItems
                    : [...deadlines.overdueItems, ...deadlines.dueSoonItems, ...deadlines.noStartDateItems, ...deadlines.onTrackItems]
                ).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-500">
                      Nenhuma tarefa encontrada para a categoria selecionada.
                    </td>
                  </tr>
                ) : (
                  (
                    activeDeadlineTab === 'OVERDUE'
                      ? deadlines.overdueItems
                      : activeDeadlineTab === 'DUE_SOON'
                      ? deadlines.dueSoonItems
                      : activeDeadlineTab === 'ON_TRACK'
                      ? deadlines.onTrackItems
                      : activeDeadlineTab === 'NO_START_DATE'
                      ? deadlines.noStartDateItems
                      : [...deadlines.overdueItems, ...deadlines.dueSoonItems, ...deadlines.noStartDateItems, ...deadlines.onTrackItems]
                  ).map(({ row, status, statusLabel, isDefaultTermino }) => (
                    <tr key={row.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {status === 'OVERDUE' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30 text-[11px] font-bold">
                            <AlertTriangle className="w-3 h-3 mr-1 text-red-400" />
                            {statusLabel}
                          </span>
                        )}
                        {status === 'DUE_SOON' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-bold">
                            <Clock className="w-3 h-3 mr-1 text-amber-400" />
                            {statusLabel}
                          </span>
                        )}
                        {status === 'NO_START_DATE' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-500/20 text-slate-300 border border-slate-500/30 text-[11px] font-medium">
                            <Calendar className="w-3 h-3 mr-1 text-slate-400" />
                            {statusLabel}
                          </span>
                        )}
                        {status === 'ON_TRACK' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[11px] font-medium">
                            <CheckCircle className="w-3 h-3 mr-1 text-blue-400" />
                            {statusLabel}
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 font-semibold text-slate-100">
                        {row.funcionalidade}
                      </td>

                      <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                        <span className="text-slate-300 font-medium">{row.onda}</span>
                        <span className="mx-1 text-slate-600">•</span>
                        <span>{row.etapa}</span>
                      </td>

                      <td className="py-2.5 px-3 font-mono text-slate-400 whitespace-nowrap">
                        {row.inicioEstimativa || '—'}
                      </td>

                      <td className="py-2.5 px-3 font-mono whitespace-nowrap">
                        {row.terminoEstimativa ? (
                          <span className="text-slate-200 font-semibold">{row.terminoEstimativa}</span>
                        ) : (
                          <span className="text-blue-300 font-sans text-[11px] bg-blue-950/60 border border-blue-500/30 px-1.5 py-0.5 rounded">
                            31/12/2026 (Padrão)
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-right font-bold whitespace-nowrap">
                        <span className={row.porcentagem > 0 ? 'text-amber-400' : 'text-red-400'}>
                          {row.porcentagem}%
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Visão Executiva de Macro-Entregáveis (Visão de Gestão) */}
      {analytics.macroSummaries.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Status dos Macro-Entregáveis (Visão de Gestão)</span>
              </h2>
              <p className="text-xs text-slate-400">
                Progresso ponderado por item pai e contagem detalhada de subitens (Concluídos, Em Andamento, A Iniciar)
              </p>
            </div>
            <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-lg text-xs font-semibold self-start sm:self-auto">
              {analytics.macroSummaries.length} Entregáveis Mapeados
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px] bg-slate-950/50">
                  <th className="py-2.5 px-3">Macro-Entregável (Item Pai)</th>
                  <th className="py-2.5 px-3">Onda / Etapa</th>
                  <th className="py-2.5 px-3 text-center">Detalhamento de Subitens</th>
                  <th className="py-2.5 px-3 text-right">Avanço Calculado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {analytics.macroSummaries.map((macro) => (
                  <tr key={macro.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3 font-semibold text-white">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-bold">
                          {macro.wbsCode ? `${macro.wbsCode}.` : 'Pai'}
                        </span>
                        <span className="text-sm font-bold text-slate-100">{macro.title}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                      <div className="flex items-center space-x-1.5">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium text-[10px] border border-slate-700">
                          {macro.onda}
                        </span>
                        <span className="text-slate-500">•</span>
                        <span className="text-slate-400 text-[11px]">{macro.etapa}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="inline-flex flex-wrap items-center justify-center gap-1.5">
                        <span
                          className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold"
                          title="Subitens concluídos (100%)"
                        >
                          {macro.completedSubitemsCount} concluídos
                        </span>
                        {macro.inProgressSubitemsCount > 0 && (
                          <span
                            className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[11px] font-bold"
                            title="Subitens em andamento (1% a 99%)"
                          >
                            {macro.inProgressSubitemsCount} em andamento
                          </span>
                        )}
                        {macro.notStartedSubitemsCount > 0 && (
                          <span
                            className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 text-[11px] font-medium"
                            title="Subitens a iniciar (0%)"
                          >
                            {macro.notStartedSubitemsCount} a iniciar
                          </span>
                        )}
                        <span className="text-[10px] text-slate-500 font-mono ml-1">
                          ({macro.subitemsCount} subitens)
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end space-x-3">
                        <div className="w-24 bg-slate-950 border border-slate-800 h-2 rounded-full overflow-hidden shrink-0">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              macro.calculatedPorcentagem === 100
                                ? 'bg-emerald-500'
                                : macro.calculatedPorcentagem >= 50
                                ? 'bg-blue-500'
                                : macro.calculatedPorcentagem > 0
                                ? 'bg-amber-500'
                                : 'bg-slate-700'
                            }`}
                            style={{ width: `${macro.calculatedPorcentagem}%` }}
                          />
                        </div>
                        <span className="text-sm font-black text-emerald-400 w-10 text-right">
                          {macro.calculatedPorcentagem}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SEÇÃO SUPERAPP - CONTROLE DE HOMOLOGAÇÃO (COLUNA C) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        {/* Header & Controls */}
        <div className="flex flex-col gap-4 border-b border-slate-800 pb-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-xs font-semibold border border-purple-500/30 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span>SuperApp</span>
                </span>
                <span className="text-xs text-slate-400">
                  Mapeamento automático da Coluna C (Homologação / Homologar)
                </span>
              </div>
              <h2 className="text-xl font-black text-white flex items-center space-x-2">
                <span>SuperApp - Itens para Homologação</span>
              </h2>
              <p className="text-xs text-slate-400">
                Destaque em cards ordenados por item para acompanhamento do que precisa ser homologado.
              </p>
            </div>

            {/* Filter Buttons */}
            <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800 self-start sm:self-auto shrink-0">
              <button
                onClick={() => setSuperAppFilter('PENDING')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  superAppFilter === 'PENDING'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                A Homologar ({superAppPendingCount})
              </button>
              <button
                onClick={() => setSuperAppFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  superAppFilter === 'ALL'
                    ? 'bg-slate-700 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Todos ({superAppItemsByOnda.length})
              </button>
              <button
                onClick={() => setSuperAppFilter('COMPLETED')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  superAppFilter === 'COMPLETED'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Homologados ({superAppCompletedCount})
              </button>
            </div>
          </div>

          {/* Onda Filter Bar */}
          {availableSuperAppOndas.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-800/60">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-purple-400" />
                <span>Selecionar Onda:</span>
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setSelectedSuperAppOnda('ALL')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    selectedSuperAppOnda === 'ALL'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  Todas as Ondas ({superAppItems.length})
                </button>
                {availableSuperAppOndas.map((ondaName) => {
                  const count = superAppItems.filter((r) => r.onda === ondaName).length;
                  return (
                    <button
                      key={ondaName}
                      onClick={() => setSelectedSuperAppOnda(ondaName)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                        selectedSuperAppOnda === ondaName
                          ? 'bg-purple-600 text-white shadow-sm'
                          : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      {ondaName} ({count})
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Summary Stats Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total em Homologação</div>
              <div className="text-2xl font-black text-white mt-1">{superAppItems.length} <span className="text-xs text-slate-500 font-normal">itens</span></div>
            </div>
            <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-400">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-purple-950/30 border border-purple-500/30 rounded-xl p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-purple-300 uppercase tracking-wider">Precisa Homologar Ainda</div>
              <div className="text-2xl font-black text-purple-300 mt-1">{superAppPendingCount} <span className="text-xs text-purple-400/80 font-normal">pendentes</span></div>
            </div>
            <div className="p-3 bg-purple-500/20 border border-purple-500/40 rounded-xl text-purple-300">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
          </div>

          <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-emerald-300 uppercase tracking-wider">Homologação Concluída</div>
              <div className="text-2xl font-black text-emerald-300 mt-1">{superAppCompletedCount} <span className="text-xs text-emerald-400/80 font-normal">finalizados</span></div>
            </div>
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Cards Grid */}
        {displayedSuperAppItems.length === 0 ? (
          <div className="text-center py-10 bg-slate-950/40 border border-slate-800 rounded-xl">
            <Sparkles className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-300">
              Nenhum item de homologação encontrado neste filtro.
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {superAppFilter === 'PENDING' && superAppPendingCount === 0 && superAppCompletedCount > 0
                ? 'Todos os itens de homologação foram concluídos (100%)!'
                : 'Insira "Homologação" ou "Homologar" nos itens da Coluna C da planilha.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedSuperAppItems.map((item, idx) => {
              const pct = item.calculatedPorcentagem ?? item.porcentagem;
              const isDone = pct === 100;
              const isInProgress = pct > 0 && pct < 100;

              return (
                <div
                  key={item.id}
                  className={`bg-slate-950/70 border rounded-xl p-4 flex flex-col justify-between space-y-4 relative overflow-hidden transition-all hover:border-purple-500/50 hover:shadow-xl ${
                    isDone
                      ? 'border-emerald-500/30 bg-emerald-950/10'
                      : isInProgress
                      ? 'border-amber-500/30 bg-amber-950/10'
                      : 'border-purple-500/40 bg-purple-950/10 ring-1 ring-purple-500/20'
                  }`}
                >
                  {/* Top Color Line */}
                  <div
                    className={`absolute top-0 left-0 right-0 h-1 ${
                      isDone ? 'bg-emerald-500' : isInProgress ? 'bg-amber-500' : 'bg-purple-500'
                    }`}
                  />

                  <div className="space-y-3">
                    {/* Header Row */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[11px] font-semibold border border-slate-700">
                        Item #{idx + 1} • Linha {item.rawRowIndex}
                      </span>

                      {isDone ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold border border-emerald-500/30">
                          <CheckCircle className="w-3 h-3 mr-1 text-emerald-400" />
                          Homologado (100%)
                        </span>
                      ) : isInProgress ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-bold border border-amber-500/30">
                          <Clock className="w-3 h-3 mr-1 text-amber-400" />
                          Em Homologação ({pct}%)
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[11px] font-bold border border-purple-500/30">
                          <Clock className="w-3 h-3 mr-1 text-purple-400" />
                          A Homologar (0%)
                        </span>
                      )}
                    </div>

                    {/* Title (Coluna C) */}
                    <div>
                      <h3 className="text-sm font-bold text-white line-clamp-2 leading-snug">
                        {item.funcionalidade}
                      </h3>
                    </div>

                    {/* Onda & Etapa */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <span className="px-2 py-0.5 rounded bg-slate-900 text-purple-300 border border-slate-800 font-medium">
                        {item.onda}
                      </span>
                      <span>•</span>
                      <span className="text-slate-300">{item.etapa}</span>
                    </div>

                    {/* Estimativas */}
                    <div className="text-[11px] text-slate-400 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 space-y-1">
                      <div className="flex justify-between">
                        <span>Início Estimado:</span>
                        <span className="font-mono text-slate-200">{item.inicioEstimativa || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Término Estimado:</span>
                        <span className="font-mono text-slate-200">{item.terminoEstimativa || '—'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1 pt-2 border-t border-slate-800/80">
                    <div className="flex items-center justify-between text-[11px] font-semibold">
                      <span className="text-slate-400">Progresso</span>
                      <span className={isDone ? 'text-emerald-400 font-bold' : isInProgress ? 'text-amber-400 font-bold' : 'text-purple-400 font-bold'}>
                        {pct}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isDone ? 'bg-emerald-500' : isInProgress ? 'bg-amber-500' : 'bg-purple-500'
                        }`}
                        style={{ width: `${Math.max(4, pct)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: BarChart % Médio por Onda */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <BarChart2 className="w-5 h-5 text-emerald-400" />
                <span>Progresso Médio por Onda (Coluna G)</span>
              </h2>
              <p className="text-xs text-slate-400">Média percentual de conclusão por ciclo de Onda</p>
            </div>
            <span className="text-xs font-mono px-2.5 py-1 rounded bg-slate-800 text-emerald-400 border border-slate-700">
              Coluna A vs Coluna G
            </span>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.ondaSummaries} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis dataKey="onda" stroke="#94a3b8" tick={{ fontSize: 12, fill: '#cbd5e1' }} />
                <YAxis stroke="#94a3b8" domain={[0, 100]} unit="%" tick={{ fontSize: 12, fill: '#cbd5e1' }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as OndaSummary;
                      return (
                        <div className="bg-slate-950 border border-slate-700 p-3 rounded-xl shadow-xl text-xs space-y-1 text-slate-200">
                          <p className="font-bold text-emerald-400 text-sm">{data.onda}</p>
                          <p>Progresso Médio: <strong className="text-white">{data.avgPorcentagem}%</strong></p>
                          <p>Total de Itens: <strong className="text-white">{data.totalFuncionalidades}</strong></p>
                          <p>Concluídos (100%): <strong className="text-emerald-400">{data.completedCount}</strong></p>
                          <p>Em Andamento: <strong className="text-amber-400">{data.inProgressCount}</strong></p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="avgPorcentagem" name="Progresso Médio (%)" radius={[8, 8, 0, 0]}>
                  {analytics.ondaSummaries.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.avgPorcentagem >= 80 ? '#10b981' : entry.avgPorcentagem >= 40 ? '#3b82f6' : '#f59e0b'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Stacked Distribution per Onda */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md space-y-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <PieIcon className="w-5 h-5 text-teal-400" />
              <span>Status dos Itens por Onda</span>
            </h2>
            <p className="text-xs text-slate-400">Itens concluídos, em andamento e pendentes</p>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.ondaSummaries} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis dataKey="onda" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-slate-950 border border-slate-700 p-3 rounded-xl text-xs space-y-1">
                          <p className="font-bold text-white">{label}</p>
                          {payload.map((entry, idx) => (
                            <p key={idx} style={{ color: entry.color }}>
                              {entry.name}: <strong>{entry.value}</strong>
                            </p>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                <Bar dataKey="completedCount" name="Concluídos" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                <Bar dataKey="inProgressCount" name="Em Andamento" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                <Bar dataKey="notStartedCount" name="Pendentes" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 2: DRILLDOWN DE UMA ONDA ESPECÍFICA */}
      {selectedOndaSummary && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  Detalhamento do Ciclo
                </span>
                {selectedOndaSummary.minDate && (
                  <span className="text-xs text-slate-400 flex items-center space-x-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      {selectedOndaSummary.minDate} até {selectedOndaSummary.maxDate || 'N/A'}
                    </span>
                  </span>
                )}
              </div>
              <h2 className="text-xl font-black text-white">Análise Detalhada: {selectedOndaSummary.onda}</h2>
            </div>

            {/* Onda Selector Tabs */}
            <div className="flex items-center space-x-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 overflow-x-auto">
              {analytics.ondaSummaries.map((o) => (
                <button
                  key={o.onda}
                  onClick={() => setSelectedOndaName(o.onda)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    selectedOndaName === o.onda
                      ? 'bg-emerald-600 text-white shadow'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  {o.onda}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* List of Funcionalidades (Coluna C) with individual Coluna G % */}
            <div className="lg:col-span-2 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Funcionalidades em {selectedOndaSummary.onda} ({selectedOndaSummary.rows.length})</span>
                <span>Coluna C vs Coluna G (%)</span>
              </h3>

              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-2">
                {selectedOndaSummary.rows.map((row) => (
                  <div
                    key={row.id}
                    className="bg-slate-800/50 border border-slate-700/50 p-3.5 rounded-xl space-y-2 hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <span className="text-sm font-semibold text-slate-100 block">{row.funcionalidade}</span>
                        <div className="flex items-center space-x-2 text-xs text-slate-400">
                          <span className="px-2 py-0.5 rounded bg-slate-700/60 text-slate-300 font-medium text-[11px]">
                            {row.etapa}
                          </span>
                          {row.inicioEstimativa && (
                            <span>
                              {row.inicioEstimativa} → {row.terminoEstimativa || 'N/A'}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        {getStatusBadge(row.porcentagem)}
                      </div>
                    </div>

                    {/* Progress Bar for Coluna G */}
                    <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          row.porcentagem === 100
                            ? 'bg-emerald-500'
                            : row.porcentagem >= 50
                            ? 'bg-blue-500'
                            : row.porcentagem > 0
                            ? 'bg-amber-500'
                            : 'bg-slate-700'
                        }`}
                        style={{ width: `${row.porcentagem}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Onda Radial Summary Gauge & Etapas Breakdown */}
            <div className="space-y-4 bg-slate-950/60 border border-slate-800 p-5 rounded-2xl">
              <div className="text-center space-y-1">
                <span className="text-xs text-slate-400">Média da {selectedOndaSummary.onda}</span>
                <div className="text-4xl font-black text-emerald-400">
                  {selectedOndaSummary.avgPorcentagem}%
                </div>
                <p className="text-xs text-slate-400">
                  {selectedOndaSummary.completedCount} de {selectedOndaSummary.totalFuncionalidades} entregues
                </p>
              </div>

              {/* Etapas inside this Onda */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Etapas em {selectedOndaSummary.onda}
                </h4>

                <div className="space-y-2 text-xs">
                  {Object.entries(selectedOndaSummary.etapas).map(([etapaName, info]) => (
                    <div key={etapaName} className="flex items-center justify-between bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                      <div>
                        <span className="font-semibold text-slate-200 block">{etapaName}</span>
                        <span className="text-[11px] text-slate-400">{info.count} itens</span>
                      </div>
                      <span className="font-bold text-emerald-400">{info.avgPorcentagem}% méd.</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Row 3 Charts: Etapas Summary & Percentage Distribution Histogram */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 3: Progresso por Etapa (Coluna F) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md space-y-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <ListCheck className="w-5 h-5 text-emerald-400" />
              <span>Progresso por Etapa do Projeto (Coluna F)</span>
            </h2>
            <p className="text-xs text-slate-400">Média percentual agrupada por fase/etapa</p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={analytics.etapaSummaries}
                margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis type="number" domain={[0, 100]} unit="%" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis dataKey="etapa" type="category" stroke="#94a3b8" tick={{ fontSize: 11 }} width={100} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-950 border border-slate-700 p-2.5 rounded-lg text-xs space-y-1">
                          <p className="font-bold text-emerald-400">{data.etapa}</p>
                          <p>Total Itens: <strong>{data.count}</strong></p>
                          <p>Progresso Médio: <strong>{data.avgPorcentagem}%</strong></p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="avgPorcentagem" name="Média %" fill="#10b981" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Histograma de Faixas de Porcentagem (Coluna G) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md space-y-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-blue-400" />
              <span>Distribuição da Coluna G (%)</span>
            </h2>
            <p className="text-xs text-slate-400">Frequência de itens por faixa percentual de avanço</p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.progressDistribution} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis dataKey="range" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-950 border border-slate-700 p-2.5 rounded-lg text-xs space-y-1">
                          <p className="font-bold text-white">{data.name} ({data.range})</p>
                          <p>Quantidade: <strong>{data.count} funcionalidades</strong></p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="count" name="Quantidade de Funcionalidades" radius={[6, 6, 0, 0]}>
                  {analytics.progressDistribution.map((entry, index) => (
                    <Cell key={`cell-dist-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* PDF Export Progress Modal Overlay */}
      {isExportingPdf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-6 relative overflow-hidden">
            {/* Top Accent Line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-blue-500" />

            <div className="flex justify-center">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 shadow-inner">
                <FileText className="w-8 h-8 animate-pulse" />
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white tracking-tight">
                Gerando Relatório PDF
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Renderizando gráficos e tabelas por onda em alta resolução. Aguarde enquanto preparamos seu documento.
              </p>
            </div>

            {/* Percentage Display & Bar */}
            <div className="space-y-2.5 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between text-xs font-semibold px-0.5">
                <span className="text-emerald-400 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span className="truncate max-w-[220px]">{pdfStatusText}</span>
                </span>
                <span className="text-lg font-black text-white font-mono">{pdfProgress}%</span>
              </div>

              {/* Progress Bar Container */}
              <div className="w-full bg-slate-800 rounded-full h-3 p-0.5 border border-slate-700 overflow-hidden shadow-inner">
                <div
                  className="bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 h-full rounded-full transition-all duration-300 ease-out shadow-sm"
                  style={{ width: `${Math.max(4, pdfProgress)}%` }}
                />
              </div>
            </div>

            <div className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
              <span>SUPERAPP Analytics</span>
              <span>•</span>
              <span>Exportação em Alta Definição</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
