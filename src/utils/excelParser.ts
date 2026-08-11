import * as XLSX from 'xlsx';
import { ExcelRow, UploadedDataset } from '../types';

/**
 * Normalizes percentage values into 0 - 100 range.
 * Examples: 0.8 -> 80, "85%" -> 85, 1 -> 100, 75 -> 75
 */
export function parsePercentage(val: any): number {
  if (val === null || val === undefined || val === '') return 0;
  
  if (typeof val === 'number') {
    if (val <= 1 && val > 0) {
      return Math.round(val * 100);
    }
    return Math.min(100, Math.max(0, Math.round(val)));
  }

  if (typeof val === 'string') {
    const cleaned = val.replace('%', '').replace(',', '.').trim();
    const parsed = parseFloat(cleaned);
    if (isNaN(parsed)) return 0;
    if (parsed <= 1 && parsed > 0 && val.includes('.')) {
      return Math.round(parsed * 100);
    }
    return Math.min(100, Math.max(0, Math.round(parsed)));
  }

  return 0;
}

/**
 * Formats Excel date values (Date object, string, or Excel serial number).
 */
export function parseExcelDate(val: any): string | null {
  if (!val) return null;

  if (val instanceof Date && !isNaN(val.getTime())) {
    return val.toISOString().split('T')[0];
  }

  if (typeof val === 'number') {
    // Excel serial date conversion
    const date = XLSX.SSF.parse_date_code(val);
    if (date) {
      const y = date.y;
      const m = String(date.m).padStart(2, '0');
      const d = String(date.d).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  if (typeof val === 'string') {
    const trimmed = val.trim();
    // Try DD/MM/YYYY or YYYY-MM-DD
    if (trimmed.includes('/')) {
      const parts = trimmed.split('/');
      if (parts.length === 3) {
        if (parts[2].length === 4) {
          // DD/MM/YYYY
          return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }
    }
    return trimmed;
  }

  return String(val);
}

/**
 * Parses WBS code, title, and level from item text.
 * Examples:
 * - "3. Login Híbrido" -> wbsCode: "3", cleanTitle: "Login Híbrido", level: 1
 * - "3.1 Enviar Front-end" -> wbsCode: "3.1", cleanTitle: "Enviar Front-end", level: 2
 * - "3.1.1 Analisar Tecnicamente" -> wbsCode: "3.1.1", cleanTitle: "Analisar Tecnicamente", level: 3
 */
export function parseWbsCode(text: string): {
  wbsCode: string | null;
  cleanTitle: string;
  level: number;
  macroCode: string | null;
  parentWbsCode: string | null;
} {
  const trimmed = text.trim();
  const match = trimmed.match(/^([0-9]+(?:\.[0-9]+)*)[\s\.\-\:]*(.*)$/);

  if (match) {
    let code = match[1];
    if (code.endsWith('.')) {
      code = code.slice(0, -1);
    }
    const cleanTitle = match[2]?.trim() || trimmed;
    const parts = code.split('.');
    const level = parts.length;
    const macroCode = parts[0];
    const parentWbsCode = parts.length > 1 ? parts.slice(0, -1).join('.') : null;

    return {
      wbsCode: code,
      cleanTitle,
      level,
      macroCode,
      parentWbsCode,
    };
  }

  return {
    wbsCode: null,
    cleanTitle: trimmed,
    level: 1,
    macroCode: null,
    parentWbsCode: null,
  };
}

/**
 * Builds parent-child hierarchy and computes % for parent items bottom-up from child subitems.
 */
export function processRowHierarchy(rows: ExcelRow[]): ExcelRow[] {
  if (!rows || rows.length === 0) return [];

  // Step 1: Assign initial WBS metadata
  rows.forEach((row) => {
    const meta = parseWbsCode(row.funcionalidade);
    row.wbsCode = meta.wbsCode;
    row.cleanTitle = meta.cleanTitle;
    row.level = meta.level;
    row.isMacroParent = false;
    row.isParent = false;
    row.childrenIds = [];
    row.parentId = null;
    row.macroParentId = null;
    row.calculatedPorcentagem = row.porcentagem;
  });

  // Step 2: Identify Macro Parents (level 1) and collect ALL subitems under them
  let currentMacroParent: ExcelRow | null = null;

  rows.forEach((row) => {
    const meta = parseWbsCode(row.funcionalidade);

    if (meta.level === 1) {
      currentMacroParent = row;
      row.isMacroParent = true;
      row.isParent = true;
      row.macroParentId = null;
      if (!row.childrenIds) row.childrenIds = [];
    } else if (currentMacroParent && row.id !== currentMacroParent.id) {
      // Subitems (level 2, 3, etc.)
      row.isMacroParent = false;
      row.isParent = false;

      const matchesMacroCode =
        Boolean(meta.macroCode) &&
        Boolean(currentMacroParent.wbsCode) &&
        meta.macroCode === currentMacroParent.wbsCode;
      const matchesOnda = row.onda === currentMacroParent.onda;

      if (matchesMacroCode || matchesOnda) {
        row.macroParentId = currentMacroParent.id;
        if (!currentMacroParent.childrenIds) currentMacroParent.childrenIds = [];
        if (!currentMacroParent.childrenIds.includes(row.id)) {
          currentMacroParent.childrenIds.push(row.id);
        }
      }
    }
  });

  // Also set direct parent ID for WBS hierarchy (e.g., 3.1 is parent of 3.1.1)
  const wbsMap = new Map<string, ExcelRow>();
  rows.forEach((row) => {
    if (row.wbsCode) {
      wbsMap.set(`${row.onda}__${row.wbsCode}`, row);
      wbsMap.set(row.wbsCode, row);
    }
  });

  rows.forEach((row) => {
    const meta = parseWbsCode(row.funcionalidade);
    if (meta.parentWbsCode) {
      const parentRow =
        wbsMap.get(`${row.onda}__${meta.parentWbsCode}`) || wbsMap.get(meta.parentWbsCode);
      if (parentRow && parentRow.id !== row.id) {
        row.parentId = parentRow.id;
      }
    }
  });

  // Step 3: Compute calculatedPorcentagem and subitem counts for Macro Parents
  const rowMap = new Map<string, ExcelRow>(rows.map((r) => [r.id, r]));

  rows.forEach((row) => {
    if (row.isMacroParent && row.childrenIds && row.childrenIds.length > 0) {
      const subitems = row.childrenIds
        .map((cid) => rowMap.get(cid))
        .filter((c): c is ExcelRow => Boolean(c));

      if (subitems.length > 0) {
        const sumPct = subitems.reduce((acc, s) => acc + s.porcentagem, 0);
        row.calculatedPorcentagem = Math.round(sumPct / subitems.length);
        row.subitemsCount = subitems.length;
        row.completedSubitemsCount = subitems.filter((s) => s.porcentagem === 100).length;
        row.inProgressSubitemsCount = subitems.filter((s) => s.porcentagem > 0 && s.porcentagem < 100).length;
        row.notStartedSubitemsCount = subitems.filter((s) => s.porcentagem === 0).length;
      }
    }
  });

  return rows;
}

/**
 * Main parser function to process uploaded Excel file and unmerge cells.
 */
export async function parseExcelFile(file: File): Promise<UploadedDataset> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { cellDates: true, cellStyles: true });

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('O arquivo Excel não contém nenhuma planilha.');
  }

  const cronogramaSheetName = workbook.SheetNames.find((name) =>
    name.trim().toUpperCase().includes('CRONOGRAMA')
  );
  const sheetName = cronogramaSheetName || workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Convert worksheet to 2D array matrix (header: 1)
  const rawMatrix: any[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    raw: true,
    defval: '',
  });

  if (!rawMatrix || rawMatrix.length === 0) {
    throw new Error('A planilha está vazia.');
  }

  // Handle SheetJS !merges to fill merged cells across matrix
  const merges = worksheet['!merges'] || [];
  const matrix: any[][] = rawMatrix.map((row) => [...row]);

  for (const merge of merges) {
    const startRow = merge.s.r;
    const startCol = merge.s.c;
    const endRow = merge.e.r;
    const endCol = merge.e.c;

    const topLeftValue = rawMatrix[startRow]?.[startCol];

    for (let r = startRow; r <= endRow; r++) {
      if (!matrix[r]) matrix[r] = [];
      for (let c = startCol; c <= endCol; c++) {
        matrix[r][c] = topLeftValue;
      }
    }
  }

  // Identify column indices by searching header row or defaulting to standard layout
  let headerRowIndex = -1;
  let ondaColIdx = 0; // Col A
  let funcColIdx = 2; // Col C
  let inicioColIdx = 3; // Col D
  let terminoColIdx = 4; // Col E
  let etapaColIdx = 5; // Col F
  let pctColIdx = 6; // Col G

  // Look for header keywords in first 10 rows
  for (let r = 0; r < Math.min(10, matrix.length); r++) {
    const row = matrix[r] || [];
    let foundMatches = 0;

    row.forEach((cellVal, cIdx) => {
      const strVal = String(cellVal || '')
        .toUpperCase()
        .trim();
      if (strVal.includes('ONDA') || strVal.includes('WAVE')) {
        ondaColIdx = cIdx;
        foundMatches++;
      }
      if (
        strVal.includes('FUNC') ||
        strVal.includes('ITEM') ||
        strVal.includes('TAREFA') ||
        strVal.includes('DESC')
      ) {
        funcColIdx = cIdx;
        foundMatches++;
      }
      if (strVal.includes('INICIO') || strVal.includes('START')) {
        inicioColIdx = cIdx;
        foundMatches++;
      }
      if (
        strVal.includes('TERMINO') ||
        strVal.includes('FIM') ||
        strVal.includes('END')
      ) {
        terminoColIdx = cIdx;
        foundMatches++;
      }
      if (
        strVal.includes('ETAPA') ||
        strVal.includes('FASE') ||
        strVal.includes('STATUS')
      ) {
        etapaColIdx = cIdx;
        foundMatches++;
      }
      if (
        strVal.includes('%') ||
        strVal.includes('PORC') ||
        strVal.includes('PROGRESSO') ||
        strVal.includes('CONCLU')
      ) {
        pctColIdx = cIdx;
        foundMatches++;
      }
    });

    if (foundMatches >= 2) {
      headerRowIndex = r;
      break;
    }
  }

  const startRowIndex = headerRowIndex >= 0 ? headerRowIndex + 1 : 0;
  const parsedRows: ExcelRow[] = [];

  let lastOnda = '';

  for (let r = startRowIndex; r < matrix.length; r++) {
    const row = matrix[r];
    if (!row) continue;

    const rawOnda = row[ondaColIdx];
    const rawFunc = row[funcColIdx];
    const rawInicio = row[inicioColIdx];
    const rawTermino = row[terminoColIdx];
    const rawEtapa = row[etapaColIdx];
    const rawPct = row[pctColIdx];

    const funcStr = String(rawFunc || '').trim();
    const funcUpper = funcStr.toUpperCase();

    // Check if row has any text in any of the relevant columns
    const hasPctValue = rawPct !== undefined && rawPct !== null && String(rawPct).trim() !== '';
    const hasAnyContent = Boolean(funcStr) || Boolean(rawOnda) || hasPctValue || Boolean(rawInicio) || Boolean(rawEtapa);

    if (!hasAnyContent) continue;

    // Skip row ONLY if it is a literal repeated column-header row (e.g. Col A="ONDA", Col C="FUNCIONALIDADE", Col G="%")
    const isHeaderOndaCell = String(rawOnda || '').trim().toUpperCase().includes('ONDA') || String(rawOnda || '').trim().toUpperCase().includes('WAVE');
    const isHeaderFuncCell = ['FUNCIONALIDADE', 'FUNCIONALIDADES', 'ITEM', 'ITENS', 'TAREFA', 'TAREFAS', 'DESCRIÇÃO', 'NOME DA TAREFA'].includes(funcUpper);
    const isHeaderPctCell = String(rawPct || '').trim().toUpperCase().includes('PORCENTAGEM') || String(rawPct || '').trim() === '%' || String(rawPct || '').trim().toUpperCase().includes('PROGRESSO');

    if (isHeaderOndaCell && isHeaderFuncCell && isHeaderPctCell) {
      continue;
    }

    // Resolve ONDA (carry forward if merged or blank)
    let currentOnda = String(rawOnda || '').trim();
    if (currentOnda) {
      if (/^\d+$/.test(currentOnda)) {
        currentOnda = `ONDA ${currentOnda}`;
      }
      if (currentOnda.toUpperCase().includes('ONDA')) {
        lastOnda = currentOnda;
      } else {
        lastOnda = ''; // Clear carry-forward so subsequent blank merged rows under non-Onda headers (e.g. N.A) are also discarded
      }
    } else {
      currentOnda = lastOnda;
    }

    if (/^\d+$/.test(currentOnda)) {
      currentOnda = `ONDA ${currentOnda}`;
    }

    // Disregard rows where Column A does not contain ONDA
    if (!currentOnda || !currentOnda.toUpperCase().includes('ONDA')) {
      continue;
    }

    const pctNumber = parsePercentage(rawPct);

    // Normalize Etapa (Column F) to avoid 'N.A' / 'N/A' stage bars
    let etapaStr = String(rawEtapa || '').trim();
    const etapaUpper = etapaStr.toUpperCase();
    if (
      !etapaStr ||
      ['N.A', 'N.A.', 'N/A', 'N/A.', 'NA', '-', 'N/D', 'N/E', 'NULL', 'NONE'].includes(etapaUpper)
    ) {
      etapaStr = 'Geral';
    }

    parsedRows.push({
      id: `row-${r}-${Math.random().toString(36).substr(2, 5)}`,
      onda: currentOnda,
      funcionalidade: funcStr || `Item ${parsedRows.length + 1}`,
      inicioEstimativa: parseExcelDate(rawInicio),
      terminoEstimativa: parseExcelDate(rawTermino),
      etapa: etapaStr,
      porcentagem: pctNumber,
      rawRowIndex: r + 1,
    });
  }

  if (parsedRows.length === 0) {
    throw new Error('Nenhum dado válido de funcionalidade foi encontrado na planilha.');
  }

  // Process Parent-Child Hierarchy & Bottom-Up Percentages
  const hierarchyRows = processRowHierarchy(parsedRows);

  const uniqueOndas = new Set(hierarchyRows.map((r) => r.onda));
  const topLevelItems = hierarchyRows.filter((r) => (r.level || 1) === 1);
  const macroCount = hierarchyRows.filter((r) => r.isParent || (r.level || 1) === 1).length;
  const subitemCount = hierarchyRows.filter((r) => (r.level || 1) > 1).length;

  const avgProgress = topLevelItems.length > 0
    ? Math.round(
        topLevelItems.reduce(
          (acc, r) => acc + (r.calculatedPorcentagem ?? r.porcentagem),
          0
        ) / topLevelItems.length
      )
    : Math.round(
        hierarchyRows.reduce(
          (acc, r) => acc + (r.calculatedPorcentagem ?? r.porcentagem),
          0
        ) / hierarchyRows.length
      );

  return {
    metadata: {
      id: `dataset-${Date.now()}`,
      fileName: file.name,
      uploadedAt: new Date().toISOString(),
      rowCount: hierarchyRows.length,
      macroCount,
      subitemCount,
      ondasCount: uniqueOndas.size,
      avgProgress,
    },
    rows: hierarchyRows,
  };
}

/**
 * Helper to generate a pre-formatted Excel binary file (.xlsx) with merged cells
 * and WBS item hierarchy.
 */
export function generateSampleExcelBlob(): Uint8Array {
  const data = [
    ['ONDA', '', 'Funcionalidades', 'Inicio estimativa', 'Termino Estimativa', 'Etapa', '%'],
    ['ONDA 1', '', '1. Preparação de Ambiente', '2026-03-01', '2026-03-10', 'Infraestrutura', '90%'],
    ['ONDA 1', '', '1.1 Repo/App Setup', '2026-03-05', '2026-03-15', 'Desenvolvimento', '100%'],
    ['ONDA 1', '', '1.2 Autenticação e Permissões', '2026-03-12', '2026-03-25', 'Desenvolvimento', '80%'],
    ['ONDA 1', '', '1.3 Banco de Dados & Schemas', '2026-03-20', '2026-04-05', 'Arquitetura', '90%'],
    ['ONDA 2', '', '4. Home I', '2026-04-01', '2026-04-30', 'Desenvolvimento', '0%'],
    ['ONDA 2', '', '4.1 Elaborar a Especificação do Item (Marista)', '2026-04-01', '2026-04-05', 'Planejamento', '100%'],
    ['ONDA 2', '', '4.2 Enviar Front-end (Sioux)', '2026-04-05', '2026-04-15', 'Desenvolvimento', '0%'],
    ['ONDA 2', '', '4.2.1 Analisar Tecnicamente Front-end (Techne e Sioux)', '2026-04-05', '2026-04-10', 'Análise', '100%'],
    ['ONDA 2', '', '4.2.2 Ajustar/Revisar Front-end (Techne)', '2026-04-10', '2026-04-15', 'Desenvolvimento', '50%'],
    ['ONDA 2', '', '4.3 Aprovar/Consolidar Regras de Negócio (Techne e Marista)', '2026-04-12', '2026-04-18', 'Aprovação', '100%'],
    ['ONDA 2', '', '4.4 Desenvolver (Techne)', '2026-04-15', '2026-04-25', 'Desenvolvimento', '50%'],
    ['ONDA 2', '', '4.5 Homologar (Techne e Marista)', '2026-04-20', '2026-04-28', 'Homologação', '0%'],
    ['ONDA 2', '', '4.5.1 Ajustar Itens Após Homologação (Techne)', '2026-04-25', '2026-04-29', 'Desenvolvimento', '0%'],
    ['ONDA 2', '', '4.6 Enviar Termo de Aceite (Techne)', '2026-04-28', '2026-04-30', 'Conclusão', '0%'],
    ['ONDA 3', '', '5. Módulo de Pagamentos', '2026-05-01', '2026-05-20', 'Desenvolvimento', '0%'],
    ['ONDA 3', '', '5.1 Integração de Gateway', '2026-05-01', '2026-05-10', 'Backend', '40%'],
    ['ONDA 3', '', '5.2 Interface de Checkout', '2026-05-10', '2026-05-20', 'Frontend', '20%'],
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);

  ws['!merges'] = [
    { s: { r: 1, c: 0 }, e: { r: 4, c: 0 } }, // ONDA 1
    { s: { r: 5, c: 0 }, e: { r: 14, c: 0 } }, // ONDA 2
    { s: { r: 15, c: 0 }, e: { r: 17, c: 0 } }, // ONDA 3
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Cronograma Ondas');

  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Uint8Array(excelBuffer);
}
