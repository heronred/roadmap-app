export interface ExcelRow {
  id: string;
  onda: string;
  funcionalidade: string;
  inicioEstimativa: string | null;
  terminoEstimativa: string | null;
  etapa: string;
  porcentagem: number; // original 0 to 100 from sheet
  rawRowIndex: number;

  // WBS / Hierarchy metadata
  wbsCode?: string | null; // e.g., "4", "4.1", "4.2.1"
  cleanTitle?: string; // e.g., "Home I", "Elaborar a Especificação..."
  level?: number; // 1 = Parent / Macro, 2 = Subitem, 3 = Sub-subitem
  isMacroParent?: boolean;
  isParent?: boolean;
  parentId?: string | null;
  macroParentId?: string | null;
  childrenIds?: string[];
  calculatedPorcentagem?: number; // % dynamically computed from child subitems if parent
  subitemsCount?: number;
  completedSubitemsCount?: number;
  inProgressSubitemsCount?: number;
  notStartedSubitemsCount?: number;
  leafCount?: number; // total leaf subitems under this parent
}

export interface MacroItemSummary {
  id: string;
  wbsCode: string | null;
  title: string;
  onda: string;
  etapa: string;
  calculatedPorcentagem: number;
  subitemsCount: number;
  completedSubitemsCount: number;
  inProgressSubitemsCount: number;
  notStartedSubitemsCount: number;
  children: ExcelRow[];
}

export interface DatasetMetadata {
  id: string;
  fileName: string;
  uploadedAt: string;
  rowCount: number;
  macroCount: number;
  subitemCount: number;
  ondasCount: number;
  avgProgress: number;
}

export interface UploadedDataset {
  metadata: DatasetMetadata;
  rows: ExcelRow[];
}

export interface EtapaSummary {
  etapa: string;
  count: number;
  avgPorcentagem: number;
  completedCount: number;
  inProgressCount: number;
  notStartedCount: number;
}

export interface OndaSummary {
  onda: string;
  totalFuncionalidades: number;
  avgPorcentagem: number;
  completedCount: number;
  inProgressCount: number;
  notStartedCount: number;
  etapas: Record<string, { count: number; avgPorcentagem: number }>;
  minDate: string | null;
  maxDate: string | null;
  rows: ExcelRow[];
  macroItems: MacroItemSummary[];
}

export type DeadlineStatus = 'OVERDUE' | 'DUE_SOON' | 'NO_START_DATE' | 'ON_TRACK' | 'COMPLETED';

export interface DeadlineItem {
  row: ExcelRow;
  status: DeadlineStatus;
  daysDiff: number; // days until deadline (negative if overdue)
  statusLabel: string;
}

export interface OndaDeadlineSummary {
  onda: string;
  overdueCount: number;
  dueSoonCount: number;
  noStartDateCount: number;
  onTrackCount: number;
  completedCount: number;
  totalWithDates: number;
}

export interface DeadlineAnalytics {
  referenceDateStr: string;
  totalWithDates: number;
  overdueCount: number;
  dueSoonCount: number;
  noStartDateCount: number;
  onTrackCount: number;
  completedCount: number;
  overdueItems: DeadlineItem[];
  dueSoonItems: DeadlineItem[];
  noStartDateItems: DeadlineItem[];
  ondaDeadlineSummaries: OndaDeadlineSummary[];
}
