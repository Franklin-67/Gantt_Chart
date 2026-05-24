import React, { useState } from 'react';
import { useGanttStore } from '@/store';

interface DateRangeDialogProps {
  onClose: () => void;
}

const DateRangeDialog: React.FC<DateRangeDialogProps> = ({ onClose }) => {
  const store = useGanttStore.getState();
  const tc = store.timeConfig;
  const projectStart = tc.projectStart;
  const projectEnd = tc.projectEnd;
  const setViewRange = useGanttStore((s) => s.setViewRange);

  const [start, setStart] = useState(tc.viewStartDate);
  const [end, setEnd] = useState(tc.viewEndDate);

  const handleApply = () => {
    setViewRange(start, end);
    onClose();
  };

  const handlePreset = (months: number | 'full') => {
    if (months === 'full') {
      setViewRange(projectStart, projectEnd);
    } else {
      const s = new Date(start + 'T00:00:00');
      const e = new Date(s);
      e.setMonth(e.getMonth() + months);
      setViewRange(start, e.toISOString().slice(0, 10));
    }
    onClose();
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog__title">选择显示范围</div>

        <div className="property-group">
          <label className="property-group__label">开始日期</label>
          <input
            className="property-group__input"
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </div>

        <div className="property-group">
          <label className="property-group__label">结束日期</label>
          <input
            className="property-group__input"
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </div>

        <div className="property-group">
          <label className="property-group__label">快速选择</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[1, 3, 6, 12].map((m) => (
              <button key={m} className="dialog__btn" style={{ fontSize: 11, padding: '4px 10px' }}
                onClick={() => handlePreset(m)}>
                {m}个月
              </button>
            ))}
            <button className="dialog__btn" style={{ fontSize: 11, padding: '4px 10px' }}
              onClick={() => handlePreset('full')}>
              全部项目
            </button>
          </div>
        </div>

        <div className="dialog__actions">
          <button className="dialog__btn" onClick={onClose}>取消</button>
          <button className="dialog__btn dialog__btn--primary"
            onClick={handleApply} disabled={!start || !end || start >= end}>
            确定
          </button>
        </div>
      </div>
    </div>
  );
};

export default DateRangeDialog;
