/**
 * エディタがiframe内に注入するCSS
 * 選択、ホバー、ドラッグ、テーブルオーバーレイ、図形の各ビジュアル
 */
export const EDITOR_STYLES = `
  [data-editor-hover] {
    outline: 2px dashed #60a5fa !important;
    outline-offset: 2px !important;
    cursor: pointer !important;
  }
  [data-editor-selected] {
    outline: 2px solid #3b82f6 !important;
    outline-offset: 2px !important;
  }
  [contenteditable="true"] {
    background-color: rgba(255, 182, 193, 0.25) !important;
    outline: 2px solid #e91e63 !important;
    outline-offset: 2px !important;
  }
  .editor-resize-handle {
    position: absolute;
    width: 8px;
    height: 8px;
    background: #3b82f6;
    border: 1px solid #fff;
    border-radius: 1px;
    z-index: 99999;
    cursor: nwse-resize;
    pointer-events: auto;
  }
  .editor-dragging {
    opacity: 0.35 !important;
    outline: 2px dashed #93c5fd !important;
  }
  .editor-drag-indicator {
    position: absolute;
    left: 0;
    right: 0;
    height: 3px;
    background: #3b82f6;
    z-index: 99999;
    pointer-events: none;
    border-radius: 2px;
    box-shadow: 0 0 6px rgba(59,130,246,0.6);
  }
  .editor-drag-indicator::before,
  .editor-drag-indicator::after {
    content: '';
    position: absolute;
    top: -3px;
    width: 9px;
    height: 9px;
    background: #3b82f6;
    border-radius: 50%;
  }
  .editor-drag-indicator::before { left: -4px; }
  .editor-drag-indicator::after { right: -4px; }
  [data-image-placeholder]:hover {
    background: #dbe6ff !important;
    border-color: #5b7fc7 !important;
  }
  .editor-drop-inside {
    outline: 3px dashed #3b82f6 !important;
    outline-offset: -3px !important;
    background: rgba(59,130,246,0.06) !important;
  }
  .editor-table-wrapper {
    position: relative;
  }
  .editor-table-add-col,
  .editor-table-add-row {
    position: absolute;
    background: #e3f2fd;
    border: 1px dashed #3b82f6;
    color: #3b82f6;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    font-weight: bold;
    z-index: 99998;
    opacity: 0;
    transition: opacity 0.2s;
    user-select: none;
  }
  .editor-table-wrapper:hover .editor-table-add-col,
  .editor-table-wrapper:hover .editor-table-add-row {
    opacity: 0.7;
  }
  .editor-table-add-col:hover,
  .editor-table-add-row:hover {
    opacity: 1 !important;
    background: #bbdefb;
  }
  .editor-table-add-col {
    width: 22px;
    top: 0;
    bottom: 0;
    right: -26px;
    border-radius: 0 4px 4px 0;
  }
  .editor-table-add-row {
    height: 22px;
    left: 0;
    right: 0;
    bottom: -26px;
    border-radius: 0 0 4px 4px;
  }
  .editor-table-select-handle {
    position: absolute;
    top: -2px;
    left: -2px;
    width: 16px;
    height: 16px;
    background: #3b82f6;
    border-radius: 2px 0 4px 0;
    cursor: grab;
    z-index: 99998;
    opacity: 0;
    transition: opacity 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .editor-table-select-handle:active {
    cursor: grabbing;
  }
  .editor-table-select-handle::after {
    content: '⊞';
    color: white;
    font-size: 11px;
  }
  .editor-table-wrapper:hover .editor-table-select-handle {
    opacity: 0.7;
  }
  .editor-table-select-handle:hover {
    opacity: 1 !important;
  }
  .editor-table-row-indicator {
    position: absolute;
    left: 0;
    right: 0;
    height: 3px;
    background: #e91e63;
    z-index: 99999;
    pointer-events: none;
    border-radius: 2px;
    box-shadow: 0 0 6px rgba(233,30,99,0.6);
  }
  .editor-table-row-indicator::before,
  .editor-table-row-indicator::after {
    content: '';
    position: absolute;
    top: -3px;
    width: 9px;
    height: 9px;
    background: #e91e63;
    border-radius: 50%;
  }
  .editor-table-row-indicator::before { left: -4px; }
  .editor-table-row-indicator::after { right: -4px; }
  .editor-table-col-indicator {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 3px;
    background: #e91e63;
    z-index: 99999;
    pointer-events: none;
    border-radius: 2px;
    box-shadow: 0 0 6px rgba(233,30,99,0.6);
  }
  .editor-table-col-indicator::before,
  .editor-table-col-indicator::after {
    content: '';
    position: absolute;
    left: -3px;
    width: 9px;
    height: 9px;
    background: #e91e63;
    border-radius: 50%;
  }
  .editor-table-col-indicator::before { top: -4px; }
  .editor-table-col-indicator::after { bottom: -4px; }
  tr.editor-dragging {
    opacity: 0.35 !important;
    outline: none !important;
  }
  tr.editor-dragging td,
  tr.editor-dragging th {
    background: #e3f2fd !important;
  }
  .editor-col-dragging {
    background: #e3f2fd !important;
    opacity: 0.35 !important;
  }
  [data-editor-shape] {
    cursor: move;
    user-select: none;
    z-index: 100;
  }
  [data-editor-shape]:hover {
    outline: 2px dashed #60a5fa !important;
    outline-offset: 2px !important;
  }
  [data-editor-shape][data-editor-selected] {
    outline: 2px solid #3b82f6 !important;
    outline-offset: 2px !important;
  }
  [data-editor-shape].editor-shape-dragging {
    opacity: 0.6;
    outline: 2px dashed #93c5fd !important;
  }
  @media print {
    [data-editor-hover],
    [data-editor-selected] {
      outline: none !important;
    }
    .editor-resize-handle,
    .editor-drag-indicator,
    .editor-table-add-col,
    .editor-table-add-row,
    .editor-table-select-handle,
    .editor-table-row-indicator,
    .editor-table-col-indicator {
      display: none !important;
    }
    [contenteditable="true"] {
      background-color: transparent !important;
      outline: none !important;
    }
    html, body {
      overflow: visible !important;
      height: auto !important;
    }
  }
`;
