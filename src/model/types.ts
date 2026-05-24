// ============================================
// Core type definitions for the Gantt add-in
// ============================================

// --- Enums ---

export enum TaskType {
  Bar = 'bar',
  Milestone = 'milestone',
}

export enum DragMode {
  Idle = 'idle',
  Create = 'create',
  Move = 'move',
  ResizeLeft = 'resizeLeft',
  ResizeRight = 'resizeRight',
  Link = 'link',
  Pan = 'pan',
  ReorderSwimlane = 'reorderSwimlane',
}

export enum TimeUnit {
  Year = 'year',
  Quarter = 'quarter',
  Month = 'month',
  Week = 'week',
  Day = 'day',
}

export enum DependencyType {
  FS = 'FS', // Finish-to-Start
  SS = 'SS', // Start-to-Start
  FF = 'FF', // Finish-to-Finish
  SF = 'SF', // Start-to-Finish
}

export enum ExportFormat {
  Png = 'png',
  Jpeg = 'jpeg',
}

// --- Core Entities ---

export interface GanttTask {
  id: string;
  name: string;
  swimlaneId: string;
  startDate: string; // ISO 8601 date string
  endDate: string;
  color: string;
  progress: number; // 0-100
  label?: string;
}

export interface Milestone {
  id: string;
  name: string;
  swimlaneId: string;
  date: string; // ISO 8601
  color: string;
  label?: string;
}

export type GanttItem = GanttTask | Milestone;

export interface Swimlane {
  id: string;
  name: string;
  parentId?: string;
  collapsed?: boolean;
  color?: string;
  order: number;
}

export interface Dependency {
  id: string;
  fromItemId: string;
  toItemId: string;
  type: DependencyType;
  lagDays: number;
}

export interface Holiday {
  date: string;
  label?: string;
  recurring?: boolean;
}

export interface WeekendRule {
  days: number[]; // 0=Sun, 6=Sat
}

// --- Time Scale ---

export interface TimeScaleLevel {
  unit: TimeUnit;
  step: number;
  format: string;
  height: number;
  visible: boolean;
}

export interface TimeConfig {
  scales: TimeScaleLevel[];
  projectStart: string;
  projectEnd: string;
  viewStartDate: string;
  viewEndDate: string;
  pixelsPerDay: number;
  minPixelsPerDay: number;
  maxPixelsPerDay: number;
}

// --- Header Cell ---

export interface HeaderCell {
  startDate: string;
  endDate: string;
  label: string;
  x: number;
  width: number;
}

export interface HeaderLevel {
  unit: TimeUnit;
  height: number;
  cells: HeaderCell[];
}

// --- UI State ---

export interface ViewState {
  scrollLeft: number;
  scrollTop: number;
  viewportWidth: number;
  viewportHeight: number;
}

export interface SelectionState {
  selectedIds: string[];
}

export interface InteractionState {
  dragMode: DragMode;
  dragOrigin: { x: number; y: number };
  dragCurrent: { x: number; y: number };
  ghostStartDate?: string;
  ghostEndDate?: string;
  ghostSwimlaneId?: string;
  linkSourceId?: string;
  reorderSwimlaneId?: string;
}

// --- Export ---

export interface ExportOptions {
  format: ExportFormat;
  scale: number; // 1x, 2x, 3x
  scope: 'full' | 'visible';
}

// --- Hit Testing ---

export interface HitTestResult {
  type: 'bar-body' | 'bar-left-edge' | 'bar-right-edge' | 'milestone'
    | 'swimlane-header' | 'dependency-endpoint' | 'empty';
  itemId?: string;
  swimlaneId?: string;
  canvasX: number;
  canvasY: number;
}

// --- Label ---

export interface LabelPlacement {
  itemId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  hasConnector: boolean;
  connectorX?: number;
  connectorY?: number;
}

// --- Layer ---

export interface GanttLayer {
  name: string;
  index: number;
  visible: boolean;
  render: (ctx: CanvasRenderingContext2D, state: unknown) => void;
}
