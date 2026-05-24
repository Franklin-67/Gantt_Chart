/**
 * DragStateMachine — state machine for all drag interactions.
 * Transitions: Idle ↔ Create | Move | ResizeLeft | ResizeRight | Link | Pan
 */

import { DragMode, HitTestResult } from '@/model/types';

export interface DragTransition {
  newMode: DragMode;
  itemId?: string;
  swimlaneId?: string;
}

/**
 * Determine the next drag mode based on current mode, the pointer event,
 * and what was hit.
 */
export function transitionDragMode(
  currentMode: DragMode,
  eventType: 'pointerdown' | 'pointerup' | 'pointermove',
  hit: HitTestResult,
  isSpaceHeld: boolean,
): DragMode {
  if (eventType === 'pointerup') {
    return DragMode.Idle;
  }

  if (eventType === 'pointermove') {
    // Mode stays the same during move; the InteractionManager
    // handles the actual position updates based on current mode.
    return currentMode;
  }

  // pointerdown — enter new mode based on hit test
  if (eventType === 'pointerdown') {
    if (isSpaceHeld) {
      return DragMode.Pan;
    }

    // If in Link mode and hit an endpoint
    if (currentMode === DragMode.Link) {
      if (hit.type === 'dependency-endpoint' || hit.type === 'bar-body' || hit.type === 'milestone') {
        return DragMode.Link;
      }
      // Stay in Link mode until canceled
      return DragMode.Link;
    }

    // If in Create mode and hit empty area
    if (currentMode === DragMode.Create) {
      if (hit.type === 'empty') {
        return DragMode.Create;
      }
      // Can also start move if clicking on existing item
      if (hit.type === 'bar-body') return DragMode.Move;
      if (hit.type === 'bar-left-edge') return DragMode.ResizeLeft;
      if (hit.type === 'bar-right-edge') return DragMode.ResizeRight;
      return DragMode.Create;
    }

    // Default Idle mode — determine from hit test
    switch (hit.type) {
      case 'bar-body':
        return DragMode.Move;
      case 'bar-left-edge':
        return DragMode.ResizeLeft;
      case 'bar-right-edge':
        return DragMode.ResizeRight;
      case 'milestone':
        return DragMode.Move;
      case 'empty':
        return DragMode.Create;
      default:
        return DragMode.Idle;
    }
  }

  return currentMode;
}
