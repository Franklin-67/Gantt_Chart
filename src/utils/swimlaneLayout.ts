/**
 * Shared swimlane Y-position utility.
 * SwimlaneRenderer renders hierarchically with collapse support,
 * so all other renderers and hit-testing must use the same layout
 * to avoid Y-position mismatches.
 */

import { Swimlane } from '@/model/types';
import { SWIMLANE_ROW_HEIGHT, TIMELINE_TOTAL_HEIGHT } from '@/model/defaults';

export interface SwimlaneRow {
  id: string;
  name: string;
  parentId?: string;
  collapsed: boolean;
  depth: number;
  y: number;
  height: number;
  order: number;
}

/**
 * Returns visible swimlane rows in render order, with correct Y positions.
 * Accounts for hierarchy and collapse state.
 */
export function getSwimlaneLayout(swimlanes: Swimlane[], rowHeight = SWIMLANE_ROW_HEIGHT): SwimlaneRow[] {
  const rows: SwimlaneRow[] = [];
  const topLevel = swimlanes.filter((s) => !s.parentId);

  let y = TIMELINE_TOTAL_HEIGHT;
  let rowOrder = 0;

  function walk(sl: Swimlane, depth: number) {
    rows.push({
      id: sl.id,
      name: sl.name,
      parentId: sl.parentId,
      collapsed: !!sl.collapsed,
      depth,
      y,
      height: rowHeight,
      order: rowOrder++,
    });
    y += rowHeight;

    if (!sl.collapsed) {
      const children = swimlanes.filter((s) => s.parentId === sl.id);
      for (const child of children) {
        walk(child, depth + 1);
      }
    }
  }

  for (const sl of topLevel) {
    walk(sl, 0);
  }

  return rows;
}

export function getSwimlaneYMap(swimlanes: Swimlane[], rowHeight?: number): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of getSwimlaneLayout(swimlanes, rowHeight)) {
    map.set(row.id, row.y);
  }
  return map;
}
