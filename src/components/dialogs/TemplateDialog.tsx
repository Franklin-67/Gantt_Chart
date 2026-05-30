import React, { useState, useEffect } from 'react';
import { 
  loadTemplates, 
  saveAsTemplate, 
  loadTemplate, 
  deleteTemplate, 
  renameTemplate,
  Template 
} from '@/services/storageService';

interface TemplateDialogProps {
  onClose: () => void;
  onLoadTemplate: () => void;
}

const TemplateDialog: React.FC<TemplateDialogProps> = ({ onClose, onLoadTemplate }) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTemplatesList();
  }, []);

  const loadTemplatesList = async () => {
    setLoading(true);
    try {
      const list = await loadTemplates();
      setTemplates(list);
    } catch (err) {
      console.error('Failed to load templates:', err);
      setError('加载模板失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      setError('请输入模板名称');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const result = await saveAsTemplate(templateName);
      if (result.success) {
        await loadTemplatesList();
        setTemplateName('');
      } else {
        setError(result.error || '保存失败');
      }
    } catch (err) {
      setError('保存模板失败');
    } finally {
      setSaving(false);
    }
  };

  const handleLoadTemplate = async (templateId: string) => {
    try {
      const success = await loadTemplate(templateId);
      if (success) {
        onLoadTemplate();
        onClose();
      } else {
        setError('加载模板失败');
      }
    } catch (err) {
      setError('加载模板失败');
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('确定要删除这个模板吗？')) return;
    
    try {
      await deleteTemplate(templateId);
      await loadTemplatesList();
    } catch (err) {
      setError('删除模板失败');
    }
  };

  const handleStartRename = (template: Template) => {
    setEditingId(template.id);
    setEditingName(template.name);
  };

  const handleSaveRename = async (templateId: string) => {
    if (!editingName.trim()) {
      setEditingId(null);
      return;
    }

    try {
      await renameTemplate(templateId, editingName);
      await loadTemplatesList();
      setEditingId(null);
    } catch (err) {
      setError('重命名失败');
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()} style={{ minWidth: '600px' }}>
        <div className="dialog__title">模板管理</div>
        
        {error && (
          <div style={{ 
            padding: '10px', 
            marginBottom: '10px', 
            backgroundColor: '#fee', 
            color: '#c33',
            borderRadius: '4px',
            fontSize: '13px'
          }}>
            {error}
            <button 
              onClick={() => setError(null)}
              style={{ 
                float: 'right', 
                background: 'none', 
                border: 'none', 
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              ×
            </button>
          </div>
        )}

        <div style={{ marginBottom: '20px' }}>
          <div className="property-group" style={{ marginBottom: '10px' }}>
            <label className="property-group__label">保存当前为模板</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                className="property-group__input"
                placeholder="输入模板名称"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                style={{ flex: 1 }}
              />
              <button
                className="dialog__btn dialog__btn--primary"
                onClick={handleSaveTemplate}
                disabled={saving || templates.length >= 10}
                style={{ minWidth: '100px' }}
              >
                {saving ? '保存中...' : '保存模板'}
              </button>
            </div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
              最多保存 {templates.length}/10 个模板
            </div>
          </div>
        </div>

        <div style={{ 
          borderTop: '1px solid #e4e7ed',
          paddingTop: '15px',
          maxHeight: '400px',
          overflowY: 'auto'
        }}>
          <div style={{ marginBottom: '10px', fontWeight: '600' }}>
            已保存的模板 ({templates.length})
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
              加载中...
            </div>
          ) : templates.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '40px 20px', 
              color: '#999',
              backgroundColor: '#fafafa',
              borderRadius: '4px'
            }}>
              <div style={{ fontSize: '32px', marginBottom: '10px' }}>📋</div>
              <div>暂无保存的模板</div>
              <div style={{ fontSize: '12px', marginTop: '5px' }}>
                编辑完成后，可以将当前内容保存为模板
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {templates.map((template) => (
                <div
                  key={template.id}
                  style={{
                    padding: '12px',
                    backgroundColor: '#fff',
                    border: '1px solid #e4e7ed',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    {editingId === template.id ? (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveRename(template.id);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          style={{
                            flex: 1,
                            padding: '4px 8px',
                            border: '1px solid #3b82f6',
                            borderRadius: '4px',
                            fontSize: '14px'
                          }}
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveRename(template.id)}
                          style={{
                            padding: '4px 12px',
                            backgroundColor: '#3b82f6',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          保存
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          style={{
                            padding: '4px 12px',
                            backgroundColor: '#f5f5f5',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          取消
                        </button>
                      </div>
                    ) : (
                      <>
                        <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                          {template.name}
                        </div>
                        <div style={{ fontSize: '12px', color: '#999' }}>
                          创建于: {formatDate(template.createdAt)}
                          {template.updatedAt !== template.createdAt && (
                            <span> · 更新于: {formatDate(template.updatedAt)}</span>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {editingId !== template.id && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className="dialog__btn"
                        onClick={() => handleLoadTemplate(template.id)}
                        style={{ minWidth: '80px' }}
                      >
                        加载
                      </button>
                      <button
                        className="dialog__btn"
                        onClick={() => handleStartRename(template)}
                        style={{ minWidth: '60px' }}
                      >
                        重命名
                      </button>
                      <button
                        className="dialog__btn"
                        onClick={() => handleDeleteTemplate(template.id)}
                        style={{ 
                          minWidth: '60px',
                          backgroundColor: '#fee',
                          color: '#c33',
                          borderColor: '#fcc'
                        }}
                      >
                        删除
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="dialog__actions" style={{ marginTop: '20px' }}>
          <button className="dialog__btn" onClick={onClose}>
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};

export default TemplateDialog;
