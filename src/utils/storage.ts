import { UploadedDataset } from '../types';
import { DEFAULT_DEMO_DATASET } from './sampleData';
import { processRowHierarchy } from './excelParser';

const STORAGE_KEY_DATASETS = 'excel_ondas_datasets_v1';
const STORAGE_KEY_ACTIVE = 'excel_ondas_active_id_v1';

export function getSavedDatasets(): UploadedDataset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DATASETS);
    if (!raw) {
      saveDataset(DEFAULT_DEMO_DATASET);
      return [DEFAULT_DEMO_DATASET];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((d: UploadedDataset) => ({
        ...d,
        rows: processRowHierarchy(d.rows || []),
      }));
    }
    return [DEFAULT_DEMO_DATASET];
  } catch (e) {
    console.error('Error reading saved datasets:', e);
    return [DEFAULT_DEMO_DATASET];
  }
}

export function saveDataset(dataset: UploadedDataset): void {
  try {
    const current = getSavedDatasets();
    const existingIdx = current.findIndex(d => d.metadata.id === dataset.metadata.id);
    let updated: UploadedDataset[];

    if (existingIdx >= 0) {
      updated = [...current];
      updated[existingIdx] = dataset;
    } else {
      updated = [dataset, ...current];
    }

    localStorage.setItem(STORAGE_KEY_DATASETS, JSON.stringify(updated));
    localStorage.setItem(STORAGE_KEY_ACTIVE, dataset.metadata.id);
  } catch (e) {
    console.error('Error saving dataset:', e);
  }
}

export function getActiveDataset(): UploadedDataset {
  const datasets = getSavedDatasets();
  const activeId = localStorage.getItem(STORAGE_KEY_ACTIVE);
  const found = datasets.find(d => d.metadata.id === activeId);
  return found || datasets[0] || DEFAULT_DEMO_DATASET;
}

export function setActiveDatasetId(id: string): void {
  localStorage.setItem(STORAGE_KEY_ACTIVE, id);
}

export function deleteDataset(id: string): UploadedDataset[] {
  try {
    const current = getSavedDatasets();
    const filtered = current.filter(d => d.metadata.id !== id);
    if (filtered.length === 0) {
      filtered.push(DEFAULT_DEMO_DATASET);
    }
    localStorage.setItem(STORAGE_KEY_DATASETS, JSON.stringify(filtered));
    localStorage.setItem(STORAGE_KEY_ACTIVE, filtered[0].metadata.id);

    return filtered;
  } catch (e) {
    console.error('Error deleting dataset:', e);
    return [DEFAULT_DEMO_DATASET];
  }
}

