import React, { useState, useEffect, useCallback } from 'react';
import Toolbar from './Toolbar';
import PropertyPanel from './PropertyPanel';
import GanttCanvas from '@/components/canvas/GanttCanvas';
import ExportDialog from '@/components/dialogs/ExportDialog';
import DateRangeDialog from '@/components/dialogs/DateRangeDialog';
import { importExcelViaDialog } from '@/services/excelService';
import { exportExcelViaDialog } from '@/services/excelExportService';

const TaskPaneShell: React.FC = () => {
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showDateRangeDialog, setShowDateRangeDialog] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const showStatus = useCallback((msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(null), 3000);
  }, []);

  const handleImportExcel = useCallback(async () => {
    try {
      const result = await importExcelViaDialog();
      if (!result) return; // cancelled
      const parts: string[] = [];
      if (result.tasks > 0) parts.push(`${result.tasks} tasks`);
      if (result.milestones > 0) parts.push(`${result.milestones} milestones`);
      if (result.swimlanes > 0) parts.push(`${result.swimlanes} swimlanes`);
      if (parts.length > 0) {
        showStatus(`Imported: ${parts.join(', ')}`);
      }
      if (result.errors.length > 0) {
        showStatus(`Warnings: ${result.errors.slice(0, 3).join('; ')}`);
      }
    } catch (err) {
      showStatus('Import failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  }, [showStatus]);

  const handleExportExcel = useCallback(async () => {
    try {
      const result = await exportExcelViaDialog();
      if (result.success) {
        showStatus('Exported to Excel successfully');
      } else if (result.error) {
        showStatus(result.error);
      }
    } catch (err) {
      showStatus('Export failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  }, [showStatus]);

  // Listen to Electron menu events
  useEffect(() => {
    const api = (window as any).electronAPI;
    if (!api) return;

    if (api.onMenuImport) {
      api.onMenuImport(() => handleImportExcel());
    }
    if (api.onMenuExport) {
      api.onMenuExport(() => setShowExportDialog(true));
    }
  }, [handleImportExcel]);

  return (
    <div className="taskpane-shell">
      <Toolbar
        onImportExcel={handleImportExcel}
        onExportExcel={handleExportExcel}
        onExportImage={() => setShowExportDialog(true)}
        onDateRange={() => setShowDateRangeDialog(true)}
      />
      <div className="taskpane-body">
        <div className="canvas-container" id="gantt-canvas-container">
          <GanttCanvas onTimelineDoubleClick={() => setShowDateRangeDialog(true)} />
        </div>
        <PropertyPanel />
      </div>

      {statusMsg && (
        <div className="status-toast">{statusMsg}</div>
      )}

      {showExportDialog && (
        <ExportDialog onClose={() => setShowExportDialog(false)} />
      )}

      {showDateRangeDialog && (
        <DateRangeDialog onClose={() => setShowDateRangeDialog(false)} />
      )}
    </div>
  );
};

export default TaskPaneShell;
