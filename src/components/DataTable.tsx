import React, { useState, useMemo } from 'react';
import { Search, Filter, Layers, CheckCircle2, Clock, Calendar, FileText, ChevronDown, ChevronRight, FolderTree, Subtitles } from 'lucide-react';
import { UploadedDataset, ExcelRow } from '../types';

interface DataTableProps {
  dataset: UploadedDataset;
}

export const DataTable: React.FC<DataTableProps> = ({ dataset }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOndaFilter, setSelectedOndaFilter] = useState('ALL');
  const [selectedEtapaFilter, setSelectedEtapaFilter] = useState('ALL');
  const [viewTypeFilter, setViewTypeFilter] = useState<'ALL' | 'PARENTS' | 'CHILDREN'>('ALL');

  // Track collapsed parent IDs
  const [collapsedParentIds, setCollapsedParentIds] = useState<Record<string, boolean>>({});

  const toggleParentCollapse = (id: string) => {
    setCollapsedParentIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const collapseAll = () => {
    const collapsed: Record<string, boolean> = {};
    dataset.rows.forEach((r) => {
      if (r.isParent) collapsed[r.id] = true;
    });
    setCollapsedParentIds(collapsed);
  };

  const expandAll = () => {
    setCollapsedParentIds({});
  };

  // Unique Ondas & Etapas for filter options
  const uniqueOndas = useMemo(() => {
    const set = new Set<string>(dataset.rows.map((r) => r.onda));
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [dataset]);

  const uniqueEtapas = useMemo(() => {
    const set = new Set<string>(dataset.rows.map((r) => r.etapa));
    return Array.from(set).sort();
  }, [dataset]);

  // Check if any ancestor of a row is collapsed
  const isRowVisible = (row: ExcelRow): boolean => {
    if (!row.parentId) return true;
    if (collapsedParentIds[row.parentId]) return false;
    
    // Check higher ancestor
    const parent = dataset.rows.find((r) => r.id === row.parentId);
    if (parent) return isRowVisible(parent);
    return true;
  };

  const filteredRows = useMemo(() => {
    return dataset.rows.filter((row) => {
      const matchesSearch =
        row.funcionalidade.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.etapa.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.onda.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (row.wbsCode && row.wbsCode.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesOnda = selectedOndaFilter === 'ALL' || row.onda === selectedOndaFilter;
      const matchesEtapa = selectedEtapaFilter === 'ALL' || row.etapa === selectedEtapaFilter;

      let matchesViewType = true;
      if (viewTypeFilter === 'PARENTS') {
        matchesViewType = Boolean(row.isMacroParent || (row.level || 1) === 1);
      } else if (viewTypeFilter === 'CHILDREN') {
        matchesViewType = !row.isMacroParent && (row.level || 1) > 1;
      }

      // In tree mode ('ALL' view type without search active), respect expand/collapse
      const visibleInTree = searchTerm ? true : isRowVisible(row);

      return matchesSearch && matchesOnda && matchesEtapa && matchesViewType && visibleInTree;
    });
  }, [dataset, searchTerm, selectedOndaFilter, selectedEtapaFilter, viewTypeFilter, collapsedParentIds]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center space-x-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            <span>Tabela de Estrutura de Itens & Subitens</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Visualização hierárquica completa com cálculo automático de progresso dos itens pai a partir de seus subitens.
          </p>
        </div>

        {/* Filters & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* View Type Toggle */}
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center space-x-1">
            <button
              onClick={() => setViewTypeFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                viewTypeFilter === 'ALL' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Hierarquia Completa
            </button>
            <button
              onClick={() => setViewTypeFilter('PARENTS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                viewTypeFilter === 'PARENTS' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Macro-Itens (Pai)
            </button>
            <button
              onClick={() => setViewTypeFilter('CHILDREN')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                viewTypeFilter === 'CHILDREN' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Subtarefas
            </button>
          </div>

          {/* Search Input */}
          <div className="relative min-w-[180px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por código, item..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700/80 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Onda Filter */}
          <select
            value={selectedOndaFilter}
            onChange={(e) => setSelectedOndaFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="ALL">Todas as Ondas</option>
            {uniqueOndas.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>

          {/* Expand/Collapse Quick Buttons */}
          <button
            onClick={expandAll}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium border border-slate-700 transition-colors"
            title="Expandir todos os itens pai"
          >
            Expandir Tudo
          </button>
          <button
            onClick={collapseAll}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium border border-slate-700 transition-colors"
            title="Recolher todos os subitens"
          >
            Recolher Tudo
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4 w-12 text-center">Linha</th>
                <th className="py-3.5 px-4 font-bold text-emerald-400 w-28">Onda</th>
                <th className="py-3.5 px-4 font-bold text-white min-w-[320px]">
                  Item / Subitem (Funcionalidades)
                </th>
                <th className="py-3.5 px-4 w-32">Início</th>
                <th className="py-3.5 px-4 w-32">Término</th>
                <th className="py-3.5 px-4 w-32">Etapa</th>
                <th className="py-3.5 px-4 font-bold text-emerald-400 min-w-[180px]">
                  Progresso (%)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500 text-sm">
                    Nenhum item encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const isParent = Boolean(row.isParent);
                  const isCollapsed = Boolean(collapsedParentIds[row.id]);
                  const level = row.level || 1;
                  const displayPct = row.calculatedPorcentagem ?? row.porcentagem;

                  return (
                    <tr
                      key={row.id}
                      className={`transition-colors ${
                        isParent
                          ? 'bg-slate-800/80 hover:bg-slate-800 font-semibold text-white'
                          : 'hover:bg-slate-800/40 text-slate-300'
                      }`}
                    >
                      {/* Linha Excel */}
                      <td className="py-3 px-4 text-center font-mono text-slate-500">
                        #{row.rawRowIndex}
                      </td>

                      {/* Onda */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold">
                          <Layers className="w-3 h-3" />
                          <span>{row.onda}</span>
                        </span>
                      </td>

                      {/* Funcionalidade com Indentação e Expand/Collapse */}
                      <td className="py-3 px-4">
                        <div
                          className="flex items-center space-x-2"
                          style={{ paddingLeft: `${(level - 1) * 1.5}rem` }}
                        >
                          {/* Expand/Collapse Toggle for Parent */}
                          {isParent ? (
                            <button
                              onClick={() => toggleParentCollapse(row.id)}
                              className="p-1 rounded bg-slate-700/80 hover:bg-slate-600 text-slate-200 transition-colors shrink-0"
                            >
                              {isCollapsed ? (
                                <ChevronRight className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 text-emerald-400" />
                              )}
                            </button>
                          ) : level > 1 ? (
                            <span className="w-4 h-0.5 bg-slate-700 inline-block shrink-0" />
                          ) : null}

                          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5">
                            <span
                              className={`text-xs ${
                                isParent
                                  ? 'font-bold text-white text-sm'
                                  : level === 2
                                  ? 'font-medium text-slate-200'
                                  : 'text-slate-300'
                              }`}
                            >
                              {row.funcionalidade}
                            </span>

                            {/* Parent Badge */}
                            {isParent && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 whitespace-nowrap">
                                Item Pai ({row.leafCount || row.childrenIds?.length || 0} subitens)
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Início */}
                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                        {row.inicioEstimativa || '—'}
                      </td>

                      {/* Término */}
                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                        {row.terminoEstimativa || '—'}
                      </td>

                      {/* Etapa */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                          {row.etapa}
                        </span>
                      </td>

                      {/* Progresso % */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span
                              className={
                                displayPct === 100
                                  ? 'text-emerald-400'
                                  : displayPct >= 50
                                  ? 'text-blue-400'
                                  : displayPct > 0
                                  ? 'text-amber-400'
                                  : 'text-slate-500'
                              }
                            >
                              {displayPct}%
                              {isParent && (
                                <span className="text-[10px] text-slate-400 font-normal ml-1">
                                  (Calculado)
                                </span>
                              )}
                            </span>
                          </div>
                          <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                displayPct === 100
                                  ? 'bg-emerald-500'
                                  : displayPct >= 50
                                  ? 'bg-blue-500'
                                  : displayPct > 0
                                  ? 'bg-amber-500'
                                  : 'bg-slate-800'
                              }`}
                              style={{ width: `${displayPct}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
