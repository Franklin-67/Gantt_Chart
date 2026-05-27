/**
 * Excel export service — writes Gantt data to .xlsx via SheetJS.
 * Saves via Neutralinojs native save dialog.
 */

import { useGanttStore } from '@/store';
import * as XLSX from 'xlsx';

export interface ExportResult {
  success: boolean;
  error?: string;
}

export async function exportToExcel(
  store: ReturnType<typeof useGanttStore.getState>,
): Promise<ExportResult> {
  const wb = XLSX.utils.book_new();

  const swimlaneNames = new Map<string, string>();
  for (const sl of store.swimlanes) {
    swimlaneNames.set(sl.id, sl.name);
  }

  const itemNames = new Map<string, string>();
  for (const t of store.tasks.values()) itemNames.set(t.id, t.name);
  for (const m of store.milestones.values()) itemNames.set(m.id, m.name);

  // Tasks sheet
  if (store.tasks.size > 0) {
    const rows: any[][] = [
      ['任务名称', '开始日期', '结束日期', '泳道', '进度', '颜色', '备注'],
    ];
    for (const t of store.tasks.values()) {
      rows.push([
        t.name, t.startDate, t.endDate,
        swimlaneNames.get(t.swimlaneId) || '',
        t.progress, t.color, t.label || '',
      ]);
    }
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, '任务 Tasks');
  }

  // Milestones sheet
  if (store.milestones.size > 0) {
    const rows: any[][] = [
      ['里程碑名称', '日期', '泳道', '颜色', '备注'],
    ];
    for (const m of store.milestones.values()) {
      rows.push([
        m.name, m.date,
        swimlaneNames.get(m.swimlaneId) || '',
        m.color, m.label || '',
      ]);
    }
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, '里程碑 Milestones');
  }

  // Dependencies sheet
  if (store.dependencies.length > 0) {
    const rows: any[][] = [
      ['源任务', '目标任务', '关系类型', '滞后天数'],
    ];
    for (const d of store.dependencies) {
      rows.push([
        itemNames.get(d.fromItemId) || d.fromItemId,
        itemNames.get(d.toItemId) || d.toItemId,
        d.type, d.lagDays,
      ]);
    }
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, '依赖 Dependencies');
  }

  // Swimlanes sheet
  if (store.swimlanes.length > 0) {
    const rows: any[][] = [
      ['泳道名称', '父泳道', '排序'],
    ];
    for (const s of store.swimlanes) {
      rows.push([s.name, s.parentId || '', s.order]);
    }
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, '泳道 Swimlanes');
  }

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  // Save via Neutralino native dialog
  const savePath = await Neutralino.os.showSaveDialog('Export Excel', {
    defaultPath: 'gantt-export.xlsx',
    filters: [{ name: 'Excel Workbook', extensions: ['xlsx'] }],
  });

  if (!savePath) return { success: false, error: 'Cancelled' };

  await Neutralino.filesystem.writeBinaryFile(savePath, buf);
  return { success: true };
}

export async function exportExcelViaDialog(): Promise<ExportResult> {
  const store = useGanttStore.getState();
  if (store.tasks.size === 0 && store.milestones.size === 0) {
    return { success: false, error: 'No data to export.' };
  }
  return exportToExcel(store);
}
