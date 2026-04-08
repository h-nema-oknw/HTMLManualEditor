// HTMLManualEditor Ver2 - Types

export interface EditorState {
  htmlContent: string;
  originalHtml: string;
  selectedElementPath: string | null;
  selectedElementTag: string | null;
  isEditing: boolean;
  zoom: number;
  fileName: string;
  isDirty: boolean;
  pageWidth: 'a4-portrait' | 'a4-landscape';
}

export interface ElementInfo {
  tagName: string;
  id: string;
  className: string;
  path: string;
  children: ElementInfo[];
  hasText: boolean;
  isExpanded?: boolean;
}

export interface CSSPropertyGroup {
  label: string;
  properties: CSSPropertyDef[];
}

export interface CSSPropertyDef {
  key: string;
  label: string;
  type: 'text' | 'number' | 'color' | 'select' | 'unit';
  options?: string[];
  unit?: string;
}

export interface HistoryEntry {
  html: string;
  timestamp: number;
  description: string;
}

export type InsertType = 'text' | 'heading' | 'image' | 'table' | 'div' | 'link' | 'list' | 'hr';

export interface InsertConfig {
  type: InsertType;
  label: string;
  icon: string;
}
