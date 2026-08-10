import React from 'react';
import { Upload, BarChart3, Table, Layers, FileSpreadsheet, Sparkles } from 'lucide-react';
import { UploadedDataset } from '../types';

interface NavbarProps {
  activeTab: 'upload' | 'dashboard' | 'table';
  setActiveTab: (tab: 'upload' | 'dashboard' | 'table') => void;
  activeDataset: UploadedDataset;
  savedDatasets: UploadedDataset[];
  onSelectDataset: (id: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  activeDataset,
  savedDatasets,
  onSelectDataset,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 sticky top-0 z-50 backdrop-blur-md bg-opacity-95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3">

            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-xl text-white tracking-wider">SuperApp</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30">
                  Flow
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Transformando informações técnicas em uma visão simples e acessível.
              </p>
            </div>
          </div>

          {/* Tab Navigation */}
          <nav className="flex items-center space-x-1 sm:space-x-2">
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'upload'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Subir Excel</span>
            </button>

            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Resultados & Gráficos</span>
            </button>

            <button
              onClick={() => setActiveTab('table')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'table'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Table className="w-4 h-4" />
              <span className="hidden md:inline">Tabela Detalhada</span>
              <span className="md:hidden">Dados</span>
            </button>
          </nav>

          {/* Dataset Selector Dropdown */}
          <div className="hidden lg:flex items-center space-x-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
            <select
              value={activeDataset.metadata.id}
              onChange={(e) => onSelectDataset(e.target.value)}
              className="bg-transparent text-xs text-slate-200 font-medium focus:outline-none cursor-pointer max-w-[200px] truncate"
            >
              {savedDatasets.map((ds) => (
                <option key={ds.metadata.id} value={ds.metadata.id} className="bg-slate-900 text-slate-200">
                  {ds.metadata.fileName} ({ds.metadata.rowCount} itens)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </header>
  );
};
