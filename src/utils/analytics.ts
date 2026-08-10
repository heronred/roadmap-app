import {
  ExcelRow,
  OndaSummary,
  EtapaSummary,
  MacroItemSummary,
  DeadlineAnalytics,
  DeadlineItem,
  DeadlineStatus,
  OndaDeadlineSummary,
} from '../types';

/**
 * Computes deadline analytics for tasks based on Columns D (Início) and E (Término) relative to reference date.
 */
export function computeDeadlineAnalytics(rows: ExcelRow[], customRefDateStr?: string): DeadlineAnalytics {
  const refDate = customRefDateStr ? new Date(customRefDateStr) : new Date();
  refDate.setHours(0, 0, 0, 0);

  const refDateStr = refDate.toISOString().split('T')[0];

  const overdueItems: DeadlineItem[] = [];
  const dueSoonItems: DeadlineItem[] = [];
  const noStartDateItems: DeadlineItem[] = [];

  let totalWithDates = 0;
  let overdueCount = 0;
  let dueSoonCount = 0;
  let noStartDateCount = 0;
  let onTrackCount = 0;
  let completedCount = 0;

  const ondaMap = new Map<string, {
    overdue: number;
    dueSoon: number;
    noStartDate: number;
    onTrack: number;
    completed: number;
    total: number;
  }>();

  rows.forEach((row) => {
    const ondaKey = row.onda || 'ONDA 1';
    if (!ondaMap.has(ondaKey)) {
      ondaMap.set(ondaKey, { overdue: 0, dueSoon: 0, noStartDate: 0, onTrack: 0, completed: 0, total: 0 });
    }
    const ondaStats = ondaMap.get(ondaKey)!;

    const pct = row.calculatedPorcentagem ?? row.porcentagem;
    const isCompleted = getRowStatus(row) === 'COMPLETED' || pct === 100;

    const hasTermino = Boolean(row.terminoEstimativa);
    const hasInicio = Boolean(row.inicioEstimativa);

    if (hasTermino || hasInicio) {
      totalWithDates++;
      ondaStats.total++;
    }

    if (isCompleted) {
      completedCount++;
      ondaStats.completed++;
      return;
    }

    let status: DeadlineStatus = 'ON_TRACK';
    let daysDiff = 999;
    let statusLabel = 'No Prazo';

    if (!hasInicio) {
      status = 'NO_START_DATE';
      statusLabel = 'Sem Data de Início';
    } else if (hasTermino) {
      const terminoDate = new Date(row.terminoEstimativa!);
      terminoDate.setHours(0, 0, 0, 0);
      daysDiff = Math.round((terminoDate.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff < 0) {
        status = 'OVERDUE';
        const absDays = Math.abs(daysDiff);
        statusLabel = absDays === 1 ? 'Atrasado 1 dia' : `Atrasado ${absDays} dias`;
      } else if (daysDiff <= 15) {
        status = 'DUE_SOON';
        statusLabel = daysDiff === 0 ? 'Vence Hoje' : daysDiff === 1 ? 'Vence Amanhã' : `Vence em ${daysDiff} dias`;
      } else {
        status = 'ON_TRACK';
        statusLabel = 'No Prazo';
      }
    }

    const item: DeadlineItem = {
      row,
      status,
      daysDiff,
      statusLabel,
    };

    if (status === 'OVERDUE') {
      overdueCount++;
      ondaStats.overdue++;
      overdueItems.push(item);
    } else if (status === 'DUE_SOON') {
      dueSoonCount++;
      ondaStats.dueSoon++;
      dueSoonItems.push(item);
    } else if (status === 'NO_START_DATE') {
      noStartDateCount++;
      ondaStats.noStartDate++;
      noStartDateItems.push(item);
    } else {
      onTrackCount++;
      ondaStats.onTrack++;
    }
  });

  overdueItems.sort((a, b) => a.daysDiff - b.daysDiff);
  dueSoonItems.sort((a, b) => a.daysDiff - b.daysDiff);
  noStartDateItems.sort((a, b) => a.row.funcionalidade.localeCompare(b.row.funcionalidade));

  const ondaDeadlineSummaries: OndaDeadlineSummary[] = Array.from(ondaMap.entries()).map(([onda, stats]) => ({
    onda,
    overdueCount: stats.overdue,
    dueSoonCount: stats.dueSoon,
    noStartDateCount: stats.noStartDate,
    onTrackCount: stats.onTrack,
    completedCount: stats.completed,
    totalWithDates: stats.total,
  }));

  ondaDeadlineSummaries.sort((a, b) => a.onda.localeCompare(b.onda, undefined, { numeric: true }));

  return {
    referenceDateStr: refDateStr,
    totalWithDates,
    overdueCount,
    dueSoonCount,
    noStartDateCount,
    onTrackCount,
    completedCount,
    overdueItems,
    dueSoonItems,
    noStartDateItems,
    ondaDeadlineSummaries,
  };
}

/**
 * Helper to determine row status based on percentage (Column G) AND stage/status text (Column F).
 */
export function getRowStatus(row: ExcelRow): 'COMPLETED' | 'IN_PROGRESS' | 'NOT_STARTED' {
  const pct = row.porcentagem;
  const etapaUpper = (row.etapa || '').toUpperCase().trim();

  // Completed check (100% or explicit completed stage)
  if (
    pct === 100 ||
    etapaUpper.includes('CONCLU') ||
    etapaUpper.includes('FINALIZ') ||
    etapaUpper.includes('ACEITE ENVIADO') ||
    etapaUpper.includes('ENTREGUE') ||
    etapaUpper.includes('DONE') ||
    etapaUpper === 'OK'
  ) {
    return 'COMPLETED';
  }

  // Not Started check (0% and explicit pending / not started stage)
  if (
    pct === 0 && (
      etapaUpper.includes('NÃO INICIAD') ||
      etapaUpper.includes('NAO INICIAD') ||
      etapaUpper.includes('PENDENTE') ||
      etapaUpper.includes('A INICIAR') ||
      etapaUpper.includes('A FAZER') ||
      etapaUpper === 'BACKLOG' ||
      etapaUpper === ''
    )
  ) {
    return 'NOT_STARTED';
  }

  // In Progress check (Column G > 0 OR Column F has an active stage/progress description)
  if (
    (pct > 0 && pct < 100) ||
    etapaUpper.includes('ANDAMENTO') ||
    etapaUpper.includes('EXECUÇ') ||
    etapaUpper.includes('EXECUC') ||
    etapaUpper.includes('PROGRESSO') ||
    etapaUpper.includes('DESENVOLV') ||
    etapaUpper.includes('HOMOLOGA') ||
    etapaUpper.includes('ANÁLIS') ||
    etapaUpper.includes('ANALIS') ||
    etapaUpper.includes('AJUSTE') ||
    etapaUpper.includes('FRONT') ||
    etapaUpper.includes('TESTE') ||
    etapaUpper.includes('REVIS') ||
    etapaUpper.includes('ENVIAR') ||
    etapaUpper.includes('APROVAR') ||
    etapaUpper.includes('CONSOLIDAR') ||
    etapaUpper.includes('IMPLEMENT') ||
    etapaUpper.includes('ELABORAR') ||
    etapaUpper.includes('ESPECIFI') ||
    etapaUpper.includes('REPO') ||
    etapaUpper.includes('SSO')
  ) {
    return 'IN_PROGRESS';
  }

  return pct === 0 ? 'NOT_STARTED' : 'IN_PROGRESS';
}

export interface DashboardAnalytics {
  totalRows: number;
  totalOndas: number;
  totalMacroItems: number;
  totalSubitems: number;
  overallAvgProgress: number;
  completedMacroCount: number;
  inProgressMacroCount: number;
  notStartedMacroCount: number;
  completedItems: number;
  inProgressItems: number;
  notStartedItems: number;
  macroSummaries: MacroItemSummary[];
  ondaSummaries: OndaSummary[];
  etapaSummaries: EtapaSummary[];
  progressDistribution: Array<{ name: string; range: string; count: number; fill: string }>;
  deadlineAnalytics: DeadlineAnalytics;
}

export function computeAnalytics(rows: ExcelRow[], customRefDateStr?: string): DashboardAnalytics {
  const deadlineAnalytics = computeDeadlineAnalytics(rows, customRefDateStr);

  if (!rows || rows.length === 0) {
    return {
      totalRows: 0,
      totalOndas: 0,
      totalMacroItems: 0,
      totalSubitems: 0,
      overallAvgProgress: 0,
      completedMacroCount: 0,
      inProgressMacroCount: 0,
      notStartedMacroCount: 0,
      completedItems: 0,
      inProgressItems: 0,
      notStartedItems: 0,
      macroSummaries: [],
      ondaSummaries: [],
      etapaSummaries: [],
      progressDistribution: [],
      deadlineAnalytics,
    };
  }

  const rowMap = new Map<string, ExcelRow>(rows.map((r) => [r.id, r]));

  // Identify Level 1 / Parent Macro Items vs Subitems
  const topLevelRows = rows.filter((r) => r.isMacroParent || (r.level || 1) === 1);
  const subitemRows = rows.filter((r) => !topLevelRows.some((t) => t.id === r.id));

  // Build MacroItemSummary list
  const macroSummaries: MacroItemSummary[] = topLevelRows.map((r) => {
    // Collect all child subitems under this macro parent
    const children = rows.filter((sub) => {
      if (sub.id === r.id) return false;
      if (sub.macroParentId === r.id) return true;
      if (r.wbsCode && sub.wbsCode) {
        return sub.wbsCode.startsWith(`${r.wbsCode}.`);
      }
      if (r.childrenIds && r.childrenIds.includes(sub.id)) return true;
      if (sub.onda === r.onda && (sub.level || 1) > 1) return true;
      return false;
    });

    const calculatedPorcentagem =
      children.length > 0
        ? Math.round(children.reduce((acc, c) => acc + c.porcentagem, 0) / children.length)
        : r.calculatedPorcentagem ?? r.porcentagem;

    const completedSub = children.filter((c) => getRowStatus(c) === 'COMPLETED').length;
    const inProgSub = children.filter((c) => getRowStatus(c) === 'IN_PROGRESS').length;
    const notStSub = children.filter((c) => getRowStatus(c) === 'NOT_STARTED').length;

    return {
      id: r.id,
      wbsCode: r.wbsCode || null,
      title: r.cleanTitle || r.funcionalidade,
      onda: r.onda,
      etapa: r.etapa,
      calculatedPorcentagem,
      subitemsCount: children.length,
      completedSubitemsCount: completedSub,
      inProgressSubitemsCount: inProgSub,
      notStartedSubitemsCount: notStSub,
      children,
    };
  });

  // Calculate Macro Stats
  let completedMacroCount = 0;
  let inProgressMacroCount = 0;
  let notStartedMacroCount = 0;

  macroSummaries.forEach((m) => {
    if (m.calculatedPorcentagem === 100) completedMacroCount++;
    else if (m.calculatedPorcentagem === 0) notStartedMacroCount++;
    else inProgressMacroCount++;
  });

  // Calculate Overall Avg Progress (Average of top-level macro items if available, or all rows)
  const macroSumPct = macroSummaries.reduce((acc, m) => acc + m.calculatedPorcentagem, 0);
  const overallAvgProgress = macroSummaries.length > 0
    ? Math.round(macroSumPct / macroSummaries.length)
    : Math.round(rows.reduce((acc, r) => acc + (r.calculatedPorcentagem ?? r.porcentagem), 0) / rows.length);

  // General item counts (all rows)
  let completedItems = 0;
  let inProgressItems = 0;
  let notStartedItems = 0;

  let dist0 = 0;
  let dist1_25 = 0;
  let dist26_50 = 0;
  let dist51_75 = 0;
  let dist76_99 = 0;
  let dist100 = 0;

  rows.forEach((row) => {
    const pct = row.calculatedPorcentagem ?? row.porcentagem;
    const status = getRowStatus(row);

    if (status === 'COMPLETED') {
      completedItems++;
      dist100++;
    } else if (status === 'NOT_STARTED') {
      notStartedItems++;
      dist0++;
    } else {
      inProgressItems++;
      if (pct <= 25) dist1_25++;
      else if (pct <= 50) dist26_50++;
      else if (pct <= 75) dist51_75++;
      else dist76_99++;
    }
  });

  // Group by Onda
  const ondaMap = new Map<string, ExcelRow[]>();
  const etapaMap = new Map<string, ExcelRow[]>();

  rows.forEach((row) => {
    const ondaKey = row.onda || 'ONDA 1';
    if (!ondaMap.has(ondaKey)) ondaMap.set(ondaKey, []);
    ondaMap.get(ondaKey)!.push(row);

    const etapaKey = row.etapa || 'Geral';
    if (!etapaMap.has(etapaKey)) etapaMap.set(etapaKey, []);
    etapaMap.get(etapaKey)!.push(row);
  });

  // Compute Onda Summaries
  const ondaSummaries: OndaSummary[] = Array.from(ondaMap.entries()).map(([onda, ondaRows]) => {
    const ondaMacroItems = macroSummaries.filter((m) => m.onda === onda);
    
    // Compute Onda Summaries using direct Column G percentages across all rows in each Onda
    const directSumPct = ondaRows.reduce((acc, r) => acc + r.porcentagem, 0);
    const avgPorcentagem = ondaRows.length > 0 ? Math.round(directSumPct / ondaRows.length) : 0;

    const comp = ondaRows.filter((r) => getRowStatus(r) === 'COMPLETED').length;
    const inProg = ondaRows.filter((r) => getRowStatus(r) === 'IN_PROGRESS').length;
    const notSt = ondaRows.filter((r) => getRowStatus(r) === 'NOT_STARTED').length;

    // Etapas breakdown inside this Onda
    const ondaEtapas: Record<string, { count: number; avgPorcentagem: number }> = {};
    ondaRows.forEach((r) => {
      const e = r.etapa || 'Geral';
      if (!ondaEtapas[e]) {
        ondaEtapas[e] = { count: 0, avgPorcentagem: 0 };
      }
      ondaEtapas[e].count++;
    });

    Object.keys(ondaEtapas).forEach((e) => {
      const eRows = ondaRows.filter((r) => r.etapa === e);
      const eSum = eRows.reduce((acc, r) => acc + (r.calculatedPorcentagem ?? r.porcentagem), 0);
      ondaEtapas[e].avgPorcentagem = Math.round(eSum / eRows.length);
    });

    const dates = ondaRows
      .map((r) => r.inicioEstimativa)
      .filter((d): d is string => Boolean(d))
      .sort();

    const minDate = dates.length > 0 ? dates[0] : null;
    const maxDate = ondaRows
      .map((r) => r.terminoEstimativa)
      .filter((d): d is string => Boolean(d))
      .sort()
      .pop() || null;

    return {
      onda,
      totalFuncionalidades: ondaRows.length,
      avgPorcentagem,
      completedCount: comp,
      inProgressCount: inProg,
      notStartedCount: notSt,
      etapas: ondaEtapas,
      minDate,
      maxDate,
      rows: ondaRows,
      macroItems: ondaMacroItems,
    };
  });

  ondaSummaries.sort((a, b) => a.onda.localeCompare(b.onda, undefined, { numeric: true }));

  // Compute Etapa Summaries
  const etapaSummaries: EtapaSummary[] = Array.from(etapaMap.entries()).map(([etapa, eRows]) => {
    const sumPct = eRows.reduce((acc, r) => acc + (r.calculatedPorcentagem ?? r.porcentagem), 0);
    const avgPorcentagem = Math.round(sumPct / eRows.length);
    const completedCount = eRows.filter((r) => getRowStatus(r) === 'COMPLETED').length;
    const inProgressCount = eRows.filter((r) => getRowStatus(r) === 'IN_PROGRESS').length;
    const notStartedCount = eRows.filter((r) => getRowStatus(r) === 'NOT_STARTED').length;

    return {
      etapa,
      count: eRows.length,
      avgPorcentagem,
      completedCount,
      inProgressCount,
      notStartedCount,
    };
  });

  etapaSummaries.sort((a, b) => b.count - a.count);

  const progressDistribution = [
    { name: 'Não Iniciado', range: '0%', count: dist0, fill: '#ef4444' },
    { name: 'Inicial', range: '1% - 25%', count: dist1_25, fill: '#f97316' },
    { name: 'Em Andamento', range: '26% - 50%', count: dist26_50, fill: '#eab308' },
    { name: 'Avançado', range: '51% - 75%', count: dist51_75, fill: '#3b82f6' },
    { name: 'Quase Concluído', range: '76% - 99%', count: dist76_99, fill: '#8b5cf6' },
    { name: 'Concluído', range: '100%', count: dist100, fill: '#10b981' },
  ];

  return {
    totalRows: rows.length,
    totalOndas: ondaSummaries.length,
    totalMacroItems: topLevelRows.length,
    totalSubitems: subitemRows.length,
    overallAvgProgress,
    completedMacroCount,
    inProgressMacroCount,
    notStartedMacroCount,
    completedItems,
    inProgressItems,
    notStartedItems,
    macroSummaries,
    ondaSummaries,
    etapaSummaries,
    progressDistribution,
    deadlineAnalytics,
  };
}
