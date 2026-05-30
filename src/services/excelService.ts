/**
 * Excel import service — reads .xlsx/.csv files via SheetJS
 * and maps columns to Gantt tasks/milestones.
 *
 * Uses Neutralino native API with browser fallback
 */

import { useGanttStore } from '@/store';
import * as XLSX from 'xlsx';
import { showOpenDialog, getBrowserTempFile, readBinaryFile, isNeutralinoFileSystemAvailable } from './storageManager';

const COLUMN_ALIASES: Record<string, string[]> = {
  name: ['任务名称', '名称', 'Task', 'Name', '任务', '活动', 'Activity', '标题', 'Title', 'tasks', 'task', 'name', 'TASK', 'NAME', '任务名'],
  startDate: ['开始日期', '开始时间', 'Start', 'start', 'StartDate', 'start_date'],
  endDate: ['结束日期', '结束时间', 'End', 'end', 'EndDate', 'end_date'],
  swimlane: ['泳道', '分类', '负责人', '类别', 'Category', 'Group', 'Swimlane', 'swimlane', 'group', 'category', '部门', '团队'],
  progress: ['进度', 'Progress', 'progress', '完成进度', '完成率'],
  color: ['颜色', 'Color', 'color', '色彩'],
  label: ['标签', '备注', 'Label', 'Note', 'label', 'note', '说明', '描述'],
};

/**
 * Clean a header string: trim whitespace, remove BOM/zero-width chars,
 * collapse internal whitespace to single spaces, lowercase.
 */
function cleanHeader(header: string): string {
  return String(header || '')
    .trim()
    .replace(/[﻿​‌‍⁠]/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

/**
 * Check whether a cleaned header matches a cleaned alias.
 */
function aliasMatch(header: string, alias: string): boolean {
  const h = cleanHeader(header);
  const a = cleanHeader(alias);
  return h.length > 0 && (h === a || h.includes(a) || a.includes(h));
}

function mapColumns(headers: string[]): Record<string, number> {
  const mapping: Record<string, number> = {};

  for (let i = 0; i < headers.length; i++) {
    const h = cleanHeader(String(headers[i] || ''));

    for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
      if (field in mapping) continue;

      if (aliases.some((a) => aliasMatch(h, a))) {
        mapping[field] = i;
        console.log('[import] Column', i, `"${headers[i]}"`, '->', field);
        break;
      }
    }
  }

  console.log('[import] Mapping:', JSON.stringify(mapping));
  console.log('[import] Columns found:', Object.keys(mapping).join(', '));
  return mapping;
}

function excelDateToISO(val: unknown): string {
  if (typeof val === 'number') {
    // Excel serial date (days since 1900-01-01 with the 1900 leap-year bug)
    const d = new Date((val - 25569) * 86400 * 1000);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  if (typeof val === 'string') {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  return '';
}

export interface ImportResult {
  tasks: number;
  milestones: number;
  swimlanes: number;
  errors: string[];
}

export function importFromExcel(
  data: ArrayBuffer,
  store: ReturnType<typeof useGanttStore.getState>,
): ImportResult {
  const errors: string[] = [];
  const workbook = XLSX.read(data, { type: 'array' });

  // Prefer the Tasks sheet (exported by this app), otherwise use first sheet
  let sheetName = workbook.SheetNames.find(
    (n) => n.includes('Tasks') || n.includes('任务')
  ) || workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  console.log('[import] Available sheets:', workbook.SheetNames.join(', '));
  console.log('[import] Selected sheet:', sheetName);

  // defval: '' ensures empty cells are '' instead of undefined
  const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: '' });

  console.log('[import] Total rows (including header):', rows.length);

  if (rows.length < 2) {
    return { tasks: 0, milestones: 0, swimlanes: 0, errors: ['Empty or invalid file'] };
  }

  const headers = rows[0] as string[];
  console.log('[import] Headers:', headers.map((h, i) => `[${i}] "${h}"`).join(', '));
  const mapping = mapColumns(headers);

  if (mapping['name'] === undefined) {
    const headerList = headers.map((h, i) => `列${i + 1}: "${h || '(空)'}"`).join(', ');
    return {
      tasks: 0, milestones: 0, swimlanes: 0,
      errors: [`找不到任务名称列。检测到的表头: ${headerList}\n支持的名称列: ${COLUMN_ALIASES.name.join(', ')}`],
    };
  }

  // ---- Clear existing content before import ----
  store.reset();
  console.log('[import] Cleared existing content');

  // Log first 10 raw rows for diagnostics
  const sampleCount = Math.min(10, rows.length);
  for (let i = 0; i < sampleCount; i++) {
    console.log(`[import] Raw row[${i}]:`, JSON.stringify(rows[i]));
  }

  // ---- First pass: collect swimlane names ----
  const swimlaneNames = new Set<string>();
  const swimlaneMap = new Map<string, string>();
  let skippedRows = 0;
  const skippedReasons: string[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const nameVal = row[mapping['name']];
    const nameStr = typeof nameVal === 'string' ? nameVal.trim() : String(nameVal || '').trim();

    if (!nameStr) {
      skippedRows++;
      if (skippedReasons.length < 10) {
        skippedReasons.push(`Row ${i + 1}: empty name (nameVal=${JSON.stringify(nameVal)}, rowLen=${row ? row.length : 'null'}, rowFirst3=${JSON.stringify(row ? row.slice(0, 3) : [])})`);
      }
      continue;
    }

    const slNameRaw = mapping['swimlane'] !== undefined ? row[mapping['swimlane']] : '';
    const slName = (typeof slNameRaw === 'string' ? slNameRaw.trim() : String(slNameRaw || '').trim()) || 'Default';
    swimlaneNames.add(slName);
  }

  console.log('[import] Swimlane names found:', [...swimlaneNames]);
  console.log('[import] Rows skipped (no name):', skippedRows, 'of', rows.length - 1, 'data rows');
  if (skippedReasons.length > 0) {
    console.log('[import] Skip reasons:', skippedReasons);
  }

  // ---- Create swimlanes ----
  // Use fresh getState() every iteration — the `store` snapshot captured
  // before reset() holds stale swimlanes[] references.
  for (const name of swimlaneNames) {
    const live = useGanttStore.getState();
    const existing = live.swimlanes.find((s) => s.name === name);
    if (existing) {
      swimlaneMap.set(name, existing.id);
    } else {
      const id = live.addSwimlane(name);
      swimlaneMap.set(name, id);
      console.log('[import] Created swimlane:', name);
    }
  }

  // ---- Second pass: create tasks/milestones ----
  let taskCount = 0;
  let milestoneCount = 0;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const nameVal = row[mapping['name']];
    const name = (typeof nameVal === 'string' ? nameVal : String(nameVal || '')).trim();
    if (!name) continue;

    const slNameRaw = mapping['swimlane'] !== undefined ? row[mapping['swimlane']] : '';
    const slName = (typeof slNameRaw === 'string' ? slNameRaw.trim() : String(slNameRaw || '').trim()) || 'Default';
    const swimlaneId = swimlaneMap.get(slName) || '';
    const color = mapping['color'] !== undefined ? String(row[mapping['color']] || '#4A90D9') : '#4A90D9';
    const progress = mapping['progress'] !== undefined ? Number(row[mapping['progress']]) || 0 : 0;

    const startDate = mapping['startDate'] !== undefined ? excelDateToISO(row[mapping['startDate']]) : '';
    const endDate = mapping['endDate'] !== undefined ? excelDateToISO(row[mapping['endDate']]) : '';

    if (startDate && endDate) {
      store.addTask({
        name, swimlaneId, startDate, endDate,
        color, progress: Math.min(100, Math.max(0, progress)),
      });
      taskCount++;
    } else if (startDate) {
      store.addMilestone({ name, swimlaneId, date: startDate, color });
      milestoneCount++;
    } else {
      errors.push(`Row ${i + 1}: "${name}" — missing start date`);
    }
  }

  console.log('[import] Done: tasks=', taskCount, 'milestones=', milestoneCount, 'swimlanes=', swimlaneNames.size);
  if (errors.length > 0) console.log('[import] Errors:', errors);

  // Auto-fit view to show all imported content
  store.updateProjectRangeToFitItems();
  store.fitViewToContent();

  return { tasks: taskCount, milestones: milestoneCount, swimlanes: swimlaneNames.size, errors };
}

/**
 * Open file dialog and import Excel file.
 */
export async function importExcelViaDialog(): Promise<ImportResult | null> {
  try {
    console.log('[import] Starting Excel import...');

    const paths = await showOpenDialog('Import Excel', {
      filters: [{ name: 'Excel Files', extensions: ['xlsx', 'xls', 'csv'] }],
    });

    if (!paths || paths.length === 0) {
      console.log('[import] User cancelled');
      return null;
    }

    console.log('[import] Reading file:', paths[0]);

    let buffer: ArrayBuffer | null = null;

    if (paths[0].startsWith('__temp_file_')) {
      buffer = await getBrowserTempFile(paths[0]);
    } else if (isNeutralinoFileSystemAvailable()) {
      buffer = await readBinaryFile(paths[0]);
    } else {
      try {
        const response = await fetch(`file://${paths[0]}`);
        buffer = await response.arrayBuffer();
      } catch {
        console.error('[import] fetch file:// failed');
      }
    }

    if (!buffer) {
      console.error('[import] Failed to read file');
      return { tasks: 0, milestones: 0, swimlanes: 0, errors: ['Failed to read file'] };
    }

    console.log('[import] File read, size:', buffer.byteLength);

    const data = new Uint8Array(buffer);
    const store = useGanttStore.getState();

    const result = importFromExcel(data.buffer, store);
    console.log('[import] Result:', result);

    return result;
  } catch (err: any) {
    console.error('[import] Failed:', err);
    return { tasks: 0, milestones: 0, swimlanes: 0, errors: [err.message || 'Import failed'] };
  }
}
