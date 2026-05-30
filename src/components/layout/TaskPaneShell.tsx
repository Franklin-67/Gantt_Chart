import React, { useState, useCallback } from 'react';
import Toolbar from './Toolbar';
import PropertyPanel from './PropertyPanel';
import GanttCanvas from '@/components/canvas/GanttCanvas';
import ExportDialog from '@/components/dialogs/ExportDialog';
import DateRangeDialog from '@/components/dialogs/DateRangeDialog';
import TemplateDialog from '@/components/dialogs/TemplateDialog';
import { importExcelViaDialog } from '@/services/excelService';
import { exportExcelViaDialog } from '@/services/excelExportService';
import { saveAsTemplate, loadTemplate } from '@/services/storageService';

const TaskPaneShell: React.FC = () => {
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showDateRangeDialog, setShowDateRangeDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const showStatus = useCallback((msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(null), 3000);
  }, []);

  const handleImportExcel = useCallback(async () => {
    try {
      const result = await importExcelViaDialog();
      if (!result) return;
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

  const handleSaveTemplate = useCallback(async () => {
    const templateName = prompt('请输入模板名称：');
    if (!templateName) return;

    const result = await saveAsTemplate(templateName);
    if (result.success) {
      showStatus(`模板 "${templateName}" 保存成功`);
    } else {
      showStatus(result.error || '保存模板失败');
    }
  }, [showStatus]);

  const handleLoadTemplate = useCallback(async (templateId: string) => {
    try {
      const success = await loadTemplate(templateId);
      if (success) {
        showStatus('模板加载成功');
      } else {
        showStatus('加载模板失败');
      }
    } catch (err) {
      showStatus('加载模板失败: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  }, [showStatus]);

  const handleOpenTemplateManager = useCallback(() => {
    setShowTemplateDialog(true);
  }, []);

  return (
    <div className="taskpane-shell">
      <Toolbar
        onImportExcel={handleImportExcel}
        onExportExcel={handleExportExcel}
        onExportImage={() => setShowExportDialog(true)}
        onDateRange={() => setShowDateRangeDialog(true)}
        onSaveTemplate={handleSaveTemplate}
        onLoadTemplate={handleLoadTemplate}
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

      {showTemplateDialog && (
        <TemplateDialog
          onClose={() => setShowTemplateDialog(false)}
          onLoadTemplate={() => {
            showStatus('模板加载成功');
          }}
        />
      )}
    </div>
  );
};

export default TaskPaneShell;
