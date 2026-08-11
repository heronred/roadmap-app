import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { ExcelUploader } from './components/ExcelUploader';
import { ChartsDashboard } from './components/ChartsDashboard';
import { DataTable } from './components/DataTable';
import { UploadedDataset } from './types';
import {
  getSavedDatasets,
  getActiveDataset,
  saveDataset,
  setActiveDatasetId,
  deleteDataset,
} from './utils/storage';

export default function App() {
  const [savedDatasets, setSavedDatasets] = useState<UploadedDataset[]>([]);
  const [activeDataset, setActiveDataset] = useState<UploadedDataset | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'dashboard' | 'table'>('dashboard');

  useEffect(() => {
    const datasets = getSavedDatasets();
    const active = getActiveDataset();
    setSavedDatasets(datasets);
    setActiveDataset(active);
  }, []);

  const handleDatasetUploaded = (newDataset: UploadedDataset) => {
    saveDataset(newDataset);
    const updatedDatasets = getSavedDatasets();
    setSavedDatasets(updatedDatasets);
    setActiveDataset(newDataset);
  };

  const handleSelectDataset = (id: string) => {
    setActiveDatasetId(id);
    const datasets = getSavedDatasets();
    const found = datasets.find((d) => d.metadata.id === id);
    if (found) {
      setActiveDataset(found);
    }
  };

  const handleDeleteDataset = (id: string) => {
    const updated = deleteDataset(id);
    setSavedDatasets(updated);
    const active = getActiveDataset();
    setActiveDataset(active);
  };

  if (!activeDataset) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="animate-pulse text-sm text-slate-400">Carregando processador Excel...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeDataset={activeDataset}
        savedDatasets={savedDatasets}
        onSelectDataset={handleSelectDataset}
      />

      <main className="flex-1 pb-16">
        {activeTab === 'upload' && (
          <ExcelUploader
            onDatasetUploaded={handleDatasetUploaded}
            savedDatasets={savedDatasets}
            activeDatasetId={activeDataset.metadata.id}
            onSelectDataset={handleSelectDataset}
            onDeleteDataset={handleDeleteDataset}
            onGoToDashboard={() => setActiveTab('dashboard')}
          />
        )}

        {activeTab === 'dashboard' && (
          <ChartsDashboard
            dataset={activeDataset}
            onGoToUpload={() => setActiveTab('upload')}
          />
        )}

        {activeTab === 'table' && <DataTable dataset={activeDataset} />}
      </main>

      <footer className="border-t border-slate-800/80 bg-slate-900/60 py-6 text-center text-xs text-slate-500 space-y-1">
        <p>SUPERAPP • Analytics e Gestão de Planilhas Excel por Ondas</p>
        <p className="text-[11px] text-slate-600">
          Suporte automático a Coluna A (ONDA), Coluna C (Funcionalidades), Coluna D (Início), Coluna E (Término), Coluna F (Etapa) e Coluna G (%)
        </p>
      </footer>
    </div>
  );
}
