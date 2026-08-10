import React, { useState, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  ArrowRight,
  HelpCircle,
  Grid,
  FileCheck,
  ShieldCheck
} from 'lucide-react';
import { UploadedDataset } from '../types';
import { parseExcelFile, generateSampleExcelBlob } from '../utils/excelParser';
import { DEFAULT_DEMO_DATASET } from '../utils/sampleData';

interface ExcelUploaderProps {
  onDatasetUploaded: (dataset: UploadedDataset) => void;
  savedDatasets: UploadedDataset[];
  activeDatasetId: string;
  onSelectDataset: (id: string) => void;
  onDeleteDataset: (id: string) => void;
  onGoToDashboard: () => void;
}

export const ExcelUploader: React.FC<ExcelUploaderProps> = ({
  onDatasetUploaded,
  savedDatasets,
  activeDatasetId,
  onSelectDataset,
  onDeleteDataset,
  onGoToDashboard,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (file: File) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsUploading(true);

    try {
      const dataset = await parseExcelFile(file);
      onDatasetUploaded(dataset);
      setSuccessMessage(
        `Planilha "${file.name}" processada com sucesso! ${dataset.metadata.rowCount} linhas em ${dataset.metadata.ondasCount} Ondas.`
      );
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Erro ao processar o arquivo Excel.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleDownloadSample = () => {
    try {
      const sampleBlob = generateSampleExcelBlob();
      const blob = new Blob([sampleBlob], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Modelo_Ondas_Excel_Mesclado.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error generating sample Excel:', err);
    }
  };

  const handleLoadDemoData = () => {
    onDatasetUploaded(DEFAULT_DEMO_DATASET);
    setSuccessMessage('Dados de exemplo carregados com sucesso!');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Processamento da Aba CRONOGRAMA</span>
            </div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-500/30 text-teal-300 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>100% Privado (Processado Apenas no Seu Navegador)</span>
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Faça Upload da sua Planilha Excel
          </h1>
          <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              Transformamos o cronograma do <strong>SuperApp</strong> em uma visão simples e intuitiva.
              A plataforma organiza automaticamente as funcionalidades por <strong>Onda</strong> e
              <strong> Etapa</strong>, consolidando os dados da planilha e apresentando o
              <strong> progresso do projeto</strong> de forma clara e visual.
          </p>
        </div>
      </div>

      {/* Main Upload Drop Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-4 shadow-sm ${
              isDragging
                ? 'border-emerald-500 bg-emerald-500/10 scale-[1.01]'
                : 'border-slate-700 bg-slate-900/60 hover:bg-slate-900 hover:border-emerald-500/60'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              accept=".xlsx, .xls, .csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
            />

            <div className="p-4 rounded-full bg-slate-800 text-emerald-400 border border-slate-700 shadow-inner">
              <Upload className="w-8 h-8 animate-bounce" />
            </div>

            <div className="space-y-1">
              <p className="text-base font-semibold text-white">
                Arraste e solte seu arquivo Excel aqui, ou{' '}
                <span className="text-emerald-400 underline decoration-emerald-500/40">clique para selecionar</span>
              </p>
              <p className="text-xs text-slate-400">
                Suporta arquivos .xlsx, .xls ou .csv contendo colunas A (ONDA), C (Funcionalidades) e G (%)
              </p>
            </div>

            {isUploading && (
              <div className="flex items-center space-x-2 text-emerald-400 text-sm font-medium animate-pulse pt-2">
                <Clock className="w-4 h-4 animate-spin" />
                <span>Processando matriz de dados e células mescladas...</span>
              </div>
            )}
          </div>

          {/* Feedback Alerts */}
          {errorMessage && (
            <div className="flex items-start space-x-3 p-4 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-sm">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">Erro na leitura do arquivo</span>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-sm">
              <div className="flex items-center space-x-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>{successMessage}</span>
              </div>
              <button
                onClick={onGoToDashboard}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-colors shadow-md"
              >
                <span>Ver Gráficos</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Helper Section */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center space-x-2">
              <HelpCircle className="w-4 h-4 text-emerald-400" />
              <span>Como a planilha é lida automaticamente:</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300">
              <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                <strong className="text-emerald-300 block mb-1">Coluna A (ONDA)</strong>
                Mesclagens como "ONDA 1" cobrindo várias linhas são propagadas para todos os itens das linhas correspondentes.
              </div>
              <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                <strong className="text-emerald-300 block mb-1">Coluna C (Funcionalidades)</strong>
                Lê cada funcionalidade (ex: 1. Preparação, 1.1 Repo/App) individualmente.
              </div>
              <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                <strong className="text-emerald-300 block mb-1">Colunas D & E (Datas)</strong>
                Inicio e Término estimado são mapeados para cronogramas.
              </div>
              <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                <strong className="text-emerald-300 block mb-1">Coluna G (%) & Coluna F (Etapa)</strong>
                Porcentagem (ex: 80%, 100%) é convertida para métricas numéricas por Etapa.
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Actions & History */}
        <div className="space-y-6">
          {/* Action Card: Download Template */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-md">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-teal-500/20 text-teal-300">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Baixar Modelo Excel</h3>
                <p className="text-xs text-slate-400">Com mesclagens de exemplo pré-configuradas</p>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Precisa de um modelo já estruturado com colunas A, C, D, E, F e G? Baixe nossa planilha de teste e faça upload em seguida.
            </p>
            <button
              onClick={handleDownloadSample}
              className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Baixar Modelo (.xlsx)</span>
            </button>
          </div>

          {/* Quick Demo Dataset Loader */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-md">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-300">
                <Grid className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Dados de Demonstração</h3>
                <p className="text-xs text-slate-400">Carregue dados instantâneos</p>
              </div>
            </div>
            <button
              onClick={handleLoadDemoData}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-xs font-semibold text-emerald-300 transition-colors text-center"
            >
              Carregar Projeto Exemplo
            </button>
          </div>

          {/* Saved Datasets History */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-md">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span>Planilhas Salvas ({savedDatasets.length})</span>
              <FileCheck className="w-4 h-4 text-slate-400" />
            </h3>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {savedDatasets.map((ds) => {
                const isActive = ds.metadata.id === activeDatasetId;
                return (
                  <div
                    key={ds.metadata.id}
                    className={`p-3 rounded-xl border text-xs flex items-center justify-between transition-all ${
                      isActive
                        ? 'bg-emerald-950/40 border-emerald-500/60 text-white'
                        : 'bg-slate-800/40 border-slate-700/50 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div
                      className="cursor-pointer space-y-0.5 flex-1 min-w-0 pr-2"
                      onClick={() => onSelectDataset(ds.metadata.id)}
                    >
                      <div className="font-semibold truncate text-slate-200">{ds.metadata.fileName}</div>
                      <div className="text-[11px] text-slate-400 flex items-center space-x-2">
                        <span>{ds.metadata.rowCount} linhas</span>
                        <span>•</span>
                        <span>{ds.metadata.ondasCount} Ondas</span>
                        <span>•</span>
                        <span className="text-emerald-400 font-medium">{ds.metadata.avgProgress}%</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 shrink-0">
                      {savedDatasets.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteDataset(ds.metadata.id);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-slate-700/60"
                          title="Remover planilha"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
