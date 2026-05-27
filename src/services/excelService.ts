/**
 * Excel import service — reads .xlsx/.csv files via SheetJS
 * and maps columns to Gantt tasks/milestones.
 *
 * Uses Neutralinojs native API for file dialog + file reading.
 */

import { useGanttStore } from '@/store';
import * as XLSX from 'xlsx';

const COLUMN_ALIASES: Record<string, string[]> = {
  name: ['任务名称', '名称', 'Task', 'Name', '任务', '活动', 'Activity'],
  startDate: ['开始日期', '开始', 'Start', '开始时间', '起始'],
  endDate: ['结束日期', '结束', 'End', '结束时间', '截止'],
  swimlane: ['分类', '泳道', '负责人', '类别', 'Category', 'Group', 'Swimlane', '分组'],
  progress: ['进度', 'Progress', '%'],
  color: ['颜色', 'Color'],
  label: ['标签', '备注', 'Label', 'Note'],
};

function mapColumns(headers: string[]): Record<string, number> {
  const mapping: Record<string, number> = {};
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].trim();
    for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
      if (aliases.some((a) => h.toLowerCase() === a.toLowerCase()) && !(field in mapping)) {
        mapping[field] = i;
        break;
      }
    }
  }
  return mapping;
}

function excelDateToISO(val: unknown): string {
  if (typeof val === 'number') {
    const d = new Date((val - 25569) * 86400 * 1000);
    return d.toISOString().slice(0, 10);
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
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });

  if (rows.length < 2) {
    return { tasks: 0, milestones: 0, swimlanes: 0, errors: ['Empty or invalid file'] };
  }

  const headers = rows[0] as string[];
  const mapping = mapColumns(headers);

  if (!mapping['name']) {
    return { tasks: 0, milestones: 0, swimlanes: 0, errors: ['Could not find a task name column. Expected headers: 任务名称, Task, Name, etc.'] };
  }

  const swimlaneNames = new Set<string>();
  const swimlaneMap = new Map<string, string>();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row[mapping['name']]) continue;
    const slName = (mapping['swimlane'] !== undefined ? String(row[mapping['swimlane']] || '') : '') || 'Default';
    swimlaneNames.add(slName);
  }

  for (const name of swimlaneNames) {
    const existing = store.swimlanes.find((s) => s.name === name);
    if (existing) {
      swimlaneMap.set(name, existing.id);
    } else {
      const id = store.addSwimlane(name);
      swimlaneMap.set(name, id);
    }
  }

  let taskCount = 0;
  let milestoneCount = 0;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row[mapping['name']]) continue;

    const name = String(row[mapping['name']]).trim();
    const slName = (mapping['swimlane'] !== undefined ? String(row[mapping['swimlane']] || '') : '') || 'Default';
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

  return { tasks: taskCount, milestones: milestoneCount, swimlanes: swimlaneNames.size, errors };
}

/**
 * Open file dialog via Neutralino native API and import Excel file.
 */
export async function importExcelViaDialog(): Promise<ImportResult | null> {
  const paths = await Neutralino.os.showOpenDialog('Import Excel', {
    filters: [{ name: 'Excel Files', extensions: ['xlsx', 'xls', 'csv'] }],
  });

  if (!paths || paths.length === 0) return null;

  const buffer = await Neutralino.filesystem.readBinaryFile(paths[0]);

  // Convert ArrayBuffer to Uint8Array for SheetJS
  const data = new Uint8Array(buffer);
  const store = useGanttStore.getState();
  return importFromExcel(data.buffer, store);
}
