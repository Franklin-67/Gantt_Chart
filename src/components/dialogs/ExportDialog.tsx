import React, { useState } from 'react';
import { useGanttStore } from '@/store';
import { ExportFormat } from '@/model/types';
import { exportGanttImage } from '@/engine/export/ImageExporter';

interface ExportDialogProps {
  onClose: () => void;
}

const ExportDialog: React.FC<ExportDialogProps> = ({ onClose }) => {
  const [scale, setScale] = useState(2);
  const [scope, setScope] = useState<'full' | 'visible'>('full');
  const [format, setFormat] = useState<'png' | 'jpeg'>('png');
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const state = useGanttStore.getState();
      const { blob } = await exportGanttImage(state, {
        format: format === 'jpeg' ? ExportFormat.Jpeg : ExportFormat.Png,
        scale,
        scope,
      });

      // Save via Electron IPC
      const api = (window as any).electronAPI;
      if (api?.saveFile) {
        const arrayBuffer = await blob.arrayBuffer();
        const bytes = Array.from(new Uint8Array(arrayBuffer));
        const ext = format === 'jpeg' ? 'jpg' : 'png';
        await api.saveFile({
          defaultName: `gantt-chart.${ext}`,
          filters: [{
            name: format === 'jpeg' ? 'JPEG Image' : 'PNG Image',
            extensions: [ext],
          }],
          data: bytes,
        });
      } else {
        // Fallback: browser download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gantt-chart.${format === 'jpeg' ? 'jpg' : 'png'}`;
        a.click();
        URL.revokeObjectURL(url);
      }
      onClose();
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog__title">Export Image</div>

        <div className="property-group">
          <label className="property-group__label">Format</label>
          <select
            className="property-group__input"
            value={format}
            onChange={(e) => setFormat(e.target.value as 'png' | 'jpeg')}
          >
            <option value="png">PNG</option>
            <option value="jpeg">JPEG</option>
          </select>
        </div>

        <div className="property-group">
          <label className="property-group__label">Resolution</label>
          <select
            className="property-group__input"
            value={scale}
            onChange={(e) => setScale(Number(e.target.value))}
          >
            <option value={1}>1x (Standard)</option>
            <option value={2}>2x (HD)</option>
            <option value={3}>3x (Ultra HD)</option>
          </select>
        </div>

        <div className="property-group">
          <label className="property-group__label">Scope</label>
          <select
            className="property-group__input"
            value={scope}
            onChange={(e) => setScope(e.target.value as 'full' | 'visible')}
          >
            <option value="full">Full Chart</option>
            <option value="visible">Visible Area</option>
          </select>
        </div>

        <div className="dialog__actions">
          <button className="dialog__btn" onClick={onClose} disabled={exporting}>
            Cancel
          </button>
          <button
            className="dialog__btn dialog__btn--primary"
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportDialog;
