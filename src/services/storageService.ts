/**
 * Local persistence — saves/loads the full Gantt project state
 * via Neutralinojs storage API.
 */

import { useGanttStore } from '@/store';

const PROJECT_KEY = 'gantt-project';
const SAVE_INTERVAL = 30000;

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

    await Neutralino.storage.setData(PROJECT_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error('Failed to save project:', e);
    return false;
  }
}

export async function loadProject(): Promise<boolean> {
  try {
    const raw = await Neutralino.storage.getData(PROJECT_KEY);
    if (!raw) return false;

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

    return true;
  } catch (e) {
    console.error('Failed to load project:', e);
    return false;
  }
}
