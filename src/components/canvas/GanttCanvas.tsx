import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { useGanttStore } from '@/store';
import { LayerManager } from '@/engine/renderer/LayerManager';
import { RenderScheduler, LayerRenderer } from '@/engine/renderer/RenderScheduler';
import { createInteractionHandlers } from '@/engine/interaction/InteractionManager';
import { useKeyboard } from '@/hooks/useKeyboard';
import { SWIMLANE_HEADER_WIDTH, TIMELINE_TOTAL_HEIGHT, SWIMLANE_ROW_HEIGHT } from '@/model/defaults';
import { renderTimeline } from './TimelineHeader';
import { renderGridBackground } from './GridBackground';
import { renderSwimlanes } from './SwimlaneRenderer';
import { renderBars } from './BarRenderer';
import { renderDependencies } from './DependencyRenderer';
import { renderLabels } from './LabelRenderer';
import { renderDragOverlay } from './DragOverlay';
import { renderSelectionOverlay } from './SelectionOverlay';

interface GanttCanvasProps {
  onTimelineDoubleClick?: () => void;
}

const LAYER_RENDERERS: Record<string, LayerRenderer> = {
  timeline: (name, ctx, w, h, s) => renderTimeline(ctx, w, h, s),
  background: (name, ctx, w, h, s) => renderGridBackground(ctx, w, h, s),
  swimlane: (name, ctx, w, h, s) => renderSwimlanes(ctx, w, h, s),
  bars: (name, ctx, w, h, s) => renderBars(ctx, w, h, s),
  dependencies: (name, ctx, w, h, s) => renderDependencies(ctx, w, h, s),
  labels: (name, ctx, w, h, s) => renderLabels(ctx, w, h, s),
  selection: (name, ctx, w, h, s) => renderSelectionOverlay(ctx, w, h, s),
  drag: (name, ctx, w, h, s) => renderDragOverlay(ctx, w, h, s),
};

const GanttCanvas: React.FC<GanttCanvasProps> = ({ onTimelineDoubleClick }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const lmRef = useRef<LayerManager | null>(null);
  const schedulerRef = useRef<RenderScheduler | null>(null);

  // Initial setup
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const lm = new LayerManager(container);
    lmRef.current = lm;

    const rect = container.getBoundingClientRect();
    lm.resize(rect.width, rect.height, window.devicePixelRatio || 1);

    const scheduler = new RenderScheduler(
      lm,
      (name, ctx, w, h, state) => {
        const renderFn = LAYER_RENDERERS[name];
        if (renderFn) {
          ctx.save();
          renderFn(name, ctx, w, h, state);
          ctx.restore();
        }
      },
      () => useGanttStore.getState(),
    );
    scheduler.setSize(rect.width, rect.height);
    schedulerRef.current = scheduler;

    scheduler.markAllDirty();

    useGanttStore.getState().setView({
      viewportWidth: rect.width,
      viewportHeight: rect.height,
    });

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const dpr = window.devicePixelRatio || 1;
        lm.resize(width, height, dpr);
        scheduler.setSize(width, height);
        scheduler.markAllDirty();
        useGanttStore.getState().setView({ viewportWidth: width, viewportHeight: height });
      }
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
      scheduler.destroy();
      lm.destroy();
    };
  }, []);

  // Wire up interaction handlers
  const interactionHandlers = useMemo(() => {
    const scheduleRender = () => {
      if (schedulerRef.current) {
        schedulerRef.current.markDirty('bars');
        schedulerRef.current.markDirty('drag');
        schedulerRef.current.markDirty('selection');
        schedulerRef.current.markDirty('labels');
        schedulerRef.current.markDirty('dependencies');
      }
    };
    return createInteractionHandlers(
      () => useGanttStore.getState(),
      scheduleRender,
    );
  }, []);

  useKeyboard({
    onKeyDown: interactionHandlers.handleKeyDown,
    onKeyUp: interactionHandlers.handleKeyUp,
  });

  // Subscribe to store changes
  useEffect(() => {
    const unsub = useGanttStore.subscribe((state, prevState) => {
      const scheduler = schedulerRef.current;
      if (!scheduler) return;

      if (state.tasks !== prevState.tasks || state.milestones !== prevState.milestones) {
        scheduler.markDirty('bars');
        scheduler.markDirty('labels');
        scheduler.markDirty('dependencies');
      }
      if (state.swimlanes !== prevState.swimlanes) {
        scheduler.markDirty('swimlane');
        scheduler.markDirty('bars');
        scheduler.markDirty('labels');
      }
      if (state.dependencies !== prevState.dependencies) {
        scheduler.markDirty('dependencies');
      }
      if (state.timeConfig !== prevState.timeConfig) {
        scheduler.markAllDirty();
      }
      if (state.selection !== prevState.selection) {
        scheduler.markDirty('selection');
      }
      if (state.interaction !== prevState.interaction) {
        scheduler.markDirty('drag');
        if (state.interaction.dragMode !== prevState.interaction.dragMode) {
          scheduler.markDirty('bars');
        }
      }
    });

    return unsub;
  }, []);

  // Double-click detection for timeline header
  const lastClickRef = useRef(0);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (containerRef.current) {
      // Detect double-click on timeline header area
      const rect = containerRef.current.getBoundingClientRect();
      const y = e.clientY - rect.top;
      if (y < TIMELINE_TOTAL_HEIGHT && onTimelineDoubleClick) {
        const now = Date.now();
        if (now - lastClickRef.current < 400) {
          onTimelineDoubleClick();
          lastClickRef.current = 0;
          return;
        }
        lastClickRef.current = now;
      }
      interactionHandlers.handlePointerDown(e.nativeEvent, containerRef.current);
    }
  }, [interactionHandlers, onTimelineDoubleClick]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (containerRef.current) {
      interactionHandlers.handlePointerMove(e.nativeEvent, containerRef.current);
    }
  }, [interactionHandlers]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (containerRef.current) {
      interactionHandlers.handlePointerUp(e.nativeEvent, containerRef.current);
    }
  }, [interactionHandlers]);

  const handlePointerCancel = useCallback((e: React.PointerEvent) => {
    if (containerRef.current) {
      interactionHandlers.handlePointerCancel(e.nativeEvent, containerRef.current);
    }
  }, [interactionHandlers]);

  // Vertical scroll handling — canvas height grows with swimlanes
  const totalRows = useGanttStore((s) => {
    // Count visible rows including expanded children
    let count = 0;
    const topLevel = s.swimlanes.filter((sl) => !sl.parentId);
    function walk(sl: typeof s.swimlanes[0]) {
      count++;
      if (!sl.collapsed) {
        s.swimlanes.filter((c) => c.parentId === sl.id).forEach(walk);
      }
    }
    topLevel.forEach(walk);
    return count;
  });

  const canvasHeight = TIMELINE_TOTAL_HEIGHT + totalRows * SWIMLANE_ROW_HEIGHT + 100;

  const handleScroll = useCallback(() => {
    const parent = containerRef.current?.parentElement;
    if (parent && schedulerRef.current) {
      useGanttStore.getState().setView({ scrollTop: parent.scrollTop });
      schedulerRef.current.markAllDirty();
    }
  }, []);

  // Sync canvas height + attach scroll listener
  useEffect(() => {
    const el = containerRef.current;
    const parent = el?.parentElement;
    if (el) {
      el.style.height = `${canvasHeight}px`;
    }
    if (parent) {
      parent.addEventListener('scroll', handleScroll, { passive: true });
      handleScroll();
      return () => parent.removeEventListener('scroll', handleScroll);
    }
  }, [canvasHeight, handleScroll]);

  // Wheel is disabled — zoom controlled via toolbar buttons + date range dialog

  // Prevent default touch behavior
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: canvasHeight,
        position: 'relative',
        overflow: 'hidden',
        touchAction: 'none',
        cursor: 'default',
        minHeight: '100%',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onTouchStart={handleTouchStart}
      onContextMenu={(e) => e.preventDefault()}
    />
  );
};

export default GanttCanvas;
