/**
 * Local persistence — saves/loads the full Gantt project state
 * Uses Neutralinojs storage API with localStorage fallback
 */

import { useGanttStore } from '@/store';
import { getData, setData, getEnvironmentInfo } from './storageManager';

const PROJECT_KEY = 'gantt-project';
const TEMPLATES_KEY = 'gantt-templates';
const MAX_TEMPLATES = 10;
const SAVE_INTERVAL = 30000;

let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;

export interface Template {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  data: {
    tasks: Record<string, any>;
    milestones: Record<string, any>;
    swimlanes: any[];
    dependencies: any[];
    holidays: any[];
    weekendRule: any;
    timeConfig: any;
  };
}

export function setupAutoSave(): void {
  if (autoSaveTimer) clearInterval(autoSaveTimer);
  autoSaveTimer = setInterval(() => {
    saveProject();
  }, SAVE_INTERVAL);
}

export function stopAutoSave(): void {
  if (autoSaveTimer) {
    clearInterval(autoSaveTimer);
    autoSaveTimer = null;
  }
}

export async function saveProject(): Promise<boolean> {
  try {
    const state = useGanttStore.getState();

    const data: any = {
      tasks: {},
      milestones: {},
      swimlanes: state.swimlanes,
      dependencies: state.dependencies,
      holidays: state.holidays,
      weekendRule: state.weekendRule,
      timeConfig: state.timeConfig,
    };

    for (const [id, task] of state.tasks) {
      data.tasks[id] = task;
    }
    for (const [id, ms] of state.milestones) {
      data.milestones[id] = ms;
    }

    await setData(PROJECT_KEY, JSON.stringify(data));
    console.log('Project saved successfully');
    return true;
  } catch (e) {
    console.error('Failed to save project:', e);
    return false;
  }
}

export async function loadProject(): Promise<boolean> {
  try {
    const raw = await getData(PROJECT_KEY);
    if (!raw) {
      console.log('No saved project found');
      return false;
    }

    const data = JSON.parse(raw);
    const store = useGanttStore.getState();

    store.reset();

    if (data.timeConfig) {
      store.setTimeConfig(data.timeConfig);
    }
    if (data.swimlanes) {
      for (const sl of data.swimlanes) {
        store.addSwimlane(sl.name, sl.parentId, sl.id);
      }
    }
    if (data.tasks) {
      for (const task of Object.values(data.tasks) as any[]) {
        store.addTask({
          id: task.id, name: task.name, swimlaneId: task.swimlaneId,
          startDate: task.startDate, endDate: task.endDate,
          color: task.color, progress: task.progress,
        });
      }
    }
    if (data.milestones) {
      for (const ms of Object.values(data.milestones) as any[]) {
        store.addMilestone({
          id: ms.id, name: ms.name, swimlaneId: ms.swimlaneId,
          date: ms.date, color: ms.color,
        });
      }
    }
    if (data.dependencies) {
      for (const dep of data.dependencies) {
        store.addDependency(dep.fromItemId, dep.toItemId, dep.type);
      }
    }
    if (data.holidays) {
      for (const h of data.holidays) {
        store.addHoliday(h);
      }
    }

    console.log('Project loaded successfully');
    return true;
  } catch (e) {
    console.error('Failed to load project:', e);
    return false;
  }
}

export async function saveAsTemplate(name: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('Saving template:', name);

    const templates = await loadTemplates();
    
    if (templates.length >= MAX_TEMPLATES) {
      return { 
        success: false, 
        error: `已达到最大模板数量限制（${MAX_TEMPLATES}个）。请先删除不需要的模板。` 
      };
    }

    const state = useGanttStore.getState();
    
    const templateData: Template = {
      id: crypto.randomUUID(),
      name: name.trim() || `模板${templates.length + 1}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      data: {
        tasks: {} as Record<string, any>,
        milestones: {} as Record<string, any>,
        swimlanes: state.swimlanes,
        dependencies: state.dependencies,
        holidays: state.holidays,
        weekendRule: state.weekendRule,
        timeConfig: state.timeConfig,
      },
    };

    for (const [id, task] of state.tasks) {
      templateData.data.tasks[id] = task;
    }
    for (const [id, ms] of state.milestones) {
      templateData.data.milestones[id] = ms;
    }

    templates.push(templateData);
    await setData(TEMPLATES_KEY, JSON.stringify(templates));
    
    console.log('Template saved successfully');
    return { success: true };
  } catch (e) {
    console.error('Failed to save template:', e);
    return { success: false, error: e instanceof Error ? e.message : '保存模板失败' };
  }
}

export async function loadTemplates(): Promise<Template[]> {
  try {
    console.log('Loading templates...');
    
    const raw = await getData(TEMPLATES_KEY);
    if (!raw) {
      console.log('No templates found');
      return [];
    }
    
    const templates = JSON.parse(raw);
    console.log('Loaded', templates.length, 'templates');
    return templates;
  } catch (e) {
    console.error('Failed to load templates:', e);
    return [];
  }
}

export async function loadTemplate(templateId: string): Promise<boolean> {
  try {
    console.log('Loading template:', templateId);

    const templates = await loadTemplates();
    const template = templates.find(t => t.id === templateId);
    
    if (!template) {
      console.error('Template not found:', templateId);
      return false;
    }

    const store = useGanttStore.getState();
    store.reset();

    if (template.data.timeConfig) {
      store.setTimeConfig(template.data.timeConfig);
    }
    if (template.data.swimlanes) {
      for (const sl of template.data.swimlanes) {
        store.addSwimlane(sl.name, sl.parentId, sl.id);
      }
    }
    if (template.data.tasks) {
      for (const task of Object.values(template.data.tasks) as any[]) {
        store.addTask({
          id: task.id, name: task.name, swimlaneId: task.swimlaneId,
          startDate: task.startDate, endDate: task.endDate,
          color: task.color, progress: task.progress,
        });
      }
    }
    if (template.data.milestones) {
      for (const ms of Object.values(template.data.milestones) as any[]) {
        store.addMilestone({
          id: ms.id, name: ms.name, swimlaneId: ms.swimlaneId,
          date: ms.date, color: ms.color,
        });
      }
    }
    if (template.data.dependencies) {
      for (const dep of template.data.dependencies) {
        store.addDependency(dep.fromItemId, dep.toItemId, dep.type);
      }
    }
    if (template.data.holidays) {
      for (const h of template.data.holidays) {
        store.addHoliday(h);
      }
    }

    console.log('Template loaded successfully');
    return true;
  } catch (e) {
    console.error('Failed to load template:', e);
    return false;
  }
}

export async function deleteTemplate(templateId: string): Promise<boolean> {
  try {
    console.log('Deleting template:', templateId);

    const templates = await loadTemplates();
    const filtered = templates.filter(t => t.id !== templateId);
    await setData(TEMPLATES_KEY, JSON.stringify(filtered));
    
    console.log('Template deleted successfully');
    return true;
  } catch (e) {
    console.error('Failed to delete template:', e);
    return false;
  }
}

export async function renameTemplate(templateId: string, newName: string): Promise<boolean> {
  try {
    console.log('Renaming template:', templateId, 'to', newName);

    const templates = await loadTemplates();
    const template = templates.find(t => t.id === templateId);
    
    if (!template) {
      console.error('Template not found for renaming');
      return false;
    }

    template.name = newName.trim() || template.name;
    template.updatedAt = new Date().toISOString();
    
    await setData(TEMPLATES_KEY, JSON.stringify(templates));
    
    console.log('Template renamed successfully');
    return true;
  } catch (e) {
    console.error('Failed to rename template:', e);
    return false;
  }
}

/**
 * 获取环境信息（用于调试）
 */
export { getEnvironmentInfo };
