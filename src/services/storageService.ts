/**
 * Local persistence — saves/loads the full Gantt project state
 * via Electron IPC (main process writes to userData folder).
 */

import { useGanttStore } from '@/store';

const PROJECT_KEY = 'gantt-project';
const SAVE_INTERVAL = 30000; // 30 seconds auto-save

let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;

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
  const api = (window as any).electronAPI;
  if (!api?.saveData) return false;

  const state = useGanttStore.getState();

  // Serialize Maps to plain objects
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

  return api.saveData(PROJECT_KEY, JSON.stringify(data));
}

export async function loadProject(): Promise<boolean> {
  const api = (window as any).electronAPI;
  if (!api?.loadData) return false;

  const raw = await api.loadData(PROJECT_KEY);
  if (!raw) return false;

  try {
    const data = JSON.parse(raw);
    const store = useGanttStore.getState();

    // Clear existing data
    store.reset();

    // Restore time config
    if (data.timeConfig) {
      store.setTimeConfig(data.timeConfig);
    }

    // Restore swimlanes
    if (data.swimlanes) {
      for (const sl of data.swimlanes) {
        store.addSwimlane(sl.name, sl.parentId, sl.id);
      }
    }

    // Restore tasks
    if (data.tasks) {
      for (const task of Object.values(data.tasks) as any[]) {
        store.addTask({
          id: task.id,
          name: task.name,
          swimlaneId: task.swimlaneId,
          startDate: task.startDate,
          endDate: task.endDate,
          color: task.color,
          progress: task.progress,
        });
      }
    }

    // Restore milestones
    if (data.milestones) {
      for (const ms of Object.values(data.milestones) as any[]) {
        store.addMilestone({
          id: ms.id,
          name: ms.name,
          swimlaneId: ms.swimlaneId,
          date: ms.date,
          color: ms.color,
        });
      }
    }

    // Restore dependencies
    if (data.dependencies) {
      for (const dep of data.dependencies) {
        store.addDependency(dep.fromItemId, dep.toItemId, dep.type);
      }
    }

    // Restore holidays
    if (data.holidays) {
      for (const h of data.holidays) {
        store.addHoliday(h);
      }
    }

    return true;
  } catch (e) {
    console.error('Failed to load project:', e);
    return false;
  }
}
