import { create } from 'zustand';
import { v4 as uuid } from 'uuid';
import {
  GanttTask,
  Milestone,
  Swimlane,
  Dependency,
  Holiday,
  WeekendRule,
  TimeConfig,
  TimeUnit,
  ViewState,
  SelectionState,
  InteractionState,
  DragMode,
  DependencyType,
} from '@/model/types';
import { createDefaultTimeConfig, DEFAULT_WEEKEND_RULE, SWIMLANE_HEADER_WIDTH } from '@/model/defaults';
import { daysBetween } from '@/utils/dateUtils';

export interface GanttState {
  // Data
  tasks: Map<string, GanttTask>;
  milestones: Map<string, Milestone>;
  swimlanes: Swimlane[];
  dependencies: Dependency[];
  holidays: Holiday[];
  weekendRule: WeekendRule;

  // Config
  timeConfig: TimeConfig;
  headerFontSizes: number[];

  // UI
  view: ViewState;
  selection: SelectionState;
  interaction: InteractionState;
	  selectedSwimlaneId: string | null;

  // Actions
  addTask: (data: Omit<GanttTask, 'id'> & { id?: string }) => string;
  updateTask: (id: string, patch: Partial<GanttTask>) => void;
  deleteTasks: (ids: string[]) => void;
  moveTaskToSwimlane: (taskId: string, swimlaneId: string) => void;

  addMilestone: (data: Omit<Milestone, 'id'> & { id?: string }) => string;
  updateMilestone: (id: string, patch: Partial<Milestone>) => void;
  deleteMilestones: (ids: string[]) => void;

  addSwimlane: (name: string, parentId?: string, id?: string) => string;
  updateSwimlane: (id: string, patch: Partial<Swimlane>) => void;
  deleteSwimlane: (id: string) => void;
  reorderSwimlanes: (orderedIds: string[]) => void;

  addDependency: (fromId: string, toId: string, type?: DependencyType) => string;
  removeDependency: (id: string) => void;

  addHoliday: (holiday: Omit<Holiday, 'id'>) => void;
  removeHoliday: (date: string) => void;

  setTimeConfig: (patch: Partial<TimeConfig>) => void;
  setViewRange: (startDate: string, endDate: string) => void;
  setView: (patch: Partial<ViewState>) => void;
  setSelection: (ids: string[]) => void;
  clearSelection: () => void;
  selectSwimlane: (id: string | null) => void;
  setInteraction: (patch: Partial<InteractionState>) => void;
  setDragMode: (mode: DragMode) => void;
  setHeaderFontSizes: (index: number, size: number) => void;

  getItemById: (id: string) => GanttTask | Milestone | undefined;
  getItemsForSwimlane: (swimlaneId: string) => (GanttTask | Milestone)[];
  getAllItems: () => (GanttTask | Milestone)[];

  reset: () => void;
}

export const useGanttStore = create<GanttState>((set, get) => ({
  tasks: new Map(),
  milestones: new Map(),
  swimlanes: [],
  dependencies: [],
  holidays: [],
  weekendRule: { ...DEFAULT_WEEKEND_RULE },
  timeConfig: createDefaultTimeConfig(),
  headerFontSizes: [12, 11, 10, 10],
  view: { scrollLeft: 0, scrollTop: 0, viewportWidth: 800, viewportHeight: 600 },
  selection: { selectedIds: [] },
  interaction: {
    dragMode: DragMode.Idle,
    dragOrigin: { x: 0, y: 0 },
    dragCurrent: { x: 0, y: 0 },
  },
  selectedSwimlaneId: null,

  // --- Task actions ---
  addTask: (data) => {
    const id = data.id ?? uuid();
    set((state) => {
      const newTasks = new Map(state.tasks);
      newTasks.set(id, { ...data, id });
      return { tasks: newTasks };
    });
    return id;
  },

  updateTask: (id, patch) => {
    set((state) => {
      const task = state.tasks.get(id);
      if (!task) return state;
      const newTasks = new Map(state.tasks);
      newTasks.set(id, { ...task, ...patch });
      return { tasks: newTasks };
    });
  },

  deleteTasks: (ids) => {
    set((state) => {
      const newTasks = new Map(state.tasks);
      ids.forEach((id) => newTasks.delete(id));
      return { tasks: newTasks };
    });
  },

  moveTaskToSwimlane: (taskId, swimlaneId) => {
    set((state) => {
      const task = state.tasks.get(taskId);
      if (!task) return state;
      const newTasks = new Map(state.tasks);
      newTasks.set(taskId, { ...task, swimlaneId });
      return { tasks: newTasks };
    });
  },

  // --- Milestone actions ---
  addMilestone: (data) => {
    const id = data.id ?? uuid();
    set((state) => {
      const newMilestones = new Map(state.milestones);
      newMilestones.set(id, { ...data, id });
      return { milestones: newMilestones };
    });
    return id;
  },

  updateMilestone: (id, patch) => {
    set((state) => {
      const ms = state.milestones.get(id);
      if (!ms) return state;
      const newMilestones = new Map(state.milestones);
      newMilestones.set(id, { ...ms, ...patch });
      return { milestones: newMilestones };
    });
  },

  deleteMilestones: (ids) => {
    set((state) => {
      const newMilestones = new Map(state.milestones);
      ids.forEach((id) => newMilestones.delete(id));
      return { milestones: newMilestones };
    });
  },

  // --- Swimlane actions ---
  addSwimlane: (name, parentId, id) => {
    id = id ?? uuid();
    set((state) => ({
      swimlanes: [
        ...state.swimlanes,
        { id, name, parentId, order: state.swimlanes.length, collapsed: false },
      ],
    }));
    return id;
  },

  updateSwimlane: (id, patch) => {
    set((state) => ({
      swimlanes: state.swimlanes.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));
  },

  deleteSwimlane: (id) => {
    set((state) => ({
      swimlanes: state.swimlanes.filter((s) => s.id !== id),
    }));
  },

  reorderSwimlanes: (orderedIds) => {
    set((state) => ({
      swimlanes: orderedIds.map((id, i) => {
        const sl = state.swimlanes.find((s) => s.id === id)!;
        return { ...sl, order: i };
      }),
    }));
  },

  // --- Dependency actions ---
  addDependency: (fromId, toId, type = DependencyType.FS) => {
    const id = uuid();
    set((state) => ({
      dependencies: [...state.dependencies, { id, fromItemId: fromId, toItemId: toId, type, lagDays: 0 }],
    }));
    return id;
  },

  removeDependency: (id) => {
    set((state) => ({
      dependencies: state.dependencies.filter((d) => d.id !== id),
    }));
  },

  // --- Holiday actions ---
  addHoliday: (holiday) => {
    set((state) => ({
      holidays: [...state.holidays, holiday],
    }));
  },

  removeHoliday: (date) => {
    set((state) => ({
      holidays: state.holidays.filter((h) => h.date !== date),
    }));
  },

  // --- Config actions ---
  setTimeConfig: (patch) => {
    set((state) => ({
      timeConfig: { ...state.timeConfig, ...patch },
    }));
  },

  setViewRange: (startDate, endDate) => {
    set((state) => {
      const days = daysBetween(startDate, endDate);
      const chartW = Math.max(1, (state.view.viewportWidth || 1200) - SWIMLANE_HEADER_WIDTH);
      const rawPpd = chartW / Math.max(days, 1);
      const ppx = Math.max(state.timeConfig.minPixelsPerDay, Math.min(state.timeConfig.maxPixelsPerDay, rawPpd));

      // Auto-hide scales based on range duration
      // Year is ALWAYS visible — never hidden
      const scales = state.timeConfig.scales.map((s) => ({ ...s }));
      const weekIdx = scales.findIndex((s) => s.unit === TimeUnit.Week);
      const monthIdx = scales.findIndex((s) => s.unit === TimeUnit.Month);

      const dayIdx = scales.findIndex((s) => s.unit === TimeUnit.Day);
      if (weekIdx >= 0) scales[weekIdx].visible = days <= 730;
      if (monthIdx >= 0) scales[monthIdx].visible = days <= 1825;
      if (dayIdx >= 0) scales[dayIdx].visible = days <= 60;

      return {
        timeConfig: {
          ...state.timeConfig,
          scales,
          viewStartDate: startDate,
          viewEndDate: endDate,
          pixelsPerDay: ppx,
        },
        view: { ...state.view, scrollLeft: 0 },
      };
    });
  },

  setView: (patch) => {
    set((state) => ({
      view: { ...state.view, ...patch },
    }));
  },

  setSelection: (ids) => {
    set({ selection: { selectedIds: ids } });
  },

  clearSelection: () => {
    set({ selection: { selectedIds: [] }, selectedSwimlaneId: null });
  },

  selectSwimlane: (id) => {
    set({ selectedSwimlaneId: id, selection: { selectedIds: [] } });
  },

  setInteraction: (patch) => {
    set((state) => ({
      interaction: { ...state.interaction, ...patch },
    }));
  },

  setDragMode: (mode) => {
    set((state) => ({
      interaction: { ...state.interaction, dragMode: mode },
    }));
  },

  setHeaderFontSizes: (index, size) => set((state) => {
    const sizes = [...state.headerFontSizes];
    sizes[index] = size;
    return { headerFontSizes: sizes };
  }),

  // --- Queries ---
  getItemById: (id) => {
    const state = get();
    return state.tasks.get(id) ?? state.milestones.get(id);
  },

  getItemsForSwimlane: (swimlaneId) => {
    const state = get();
    const tasks = Array.from(state.tasks.values()).filter((t) => t.swimlaneId === swimlaneId);
    const milestones = Array.from(state.milestones.values()).filter((m) => m.swimlaneId === swimlaneId);
    return [...tasks, ...milestones];
  },

  getAllItems: () => {
    const state = get();
    return [
      ...Array.from(state.tasks.values()),
      ...Array.from(state.milestones.values()),
    ];
  },

  reset: () => {
    set({
      tasks: new Map(),
      milestones: new Map(),
      swimlanes: [],
      dependencies: [],
      holidays: [],
      weekendRule: { ...DEFAULT_WEEKEND_RULE },
      timeConfig: createDefaultTimeConfig(),
      headerFontSizes: [12, 11, 10, 10],
      view: { scrollLeft: 0, scrollTop: 0, viewportWidth: 800, viewportHeight: 600 },
      selection: { selectedIds: [] },
      interaction: {
        dragMode: DragMode.Idle,
        dragOrigin: { x: 0, y: 0 },
        dragCurrent: { x: 0, y: 0 },
      },
	  selectedSwimlaneId: null,
    });
  },
}));
