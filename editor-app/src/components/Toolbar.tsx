import React, { useRef } from 'react';
import {
  FileCode, Download, FileText, Upload, Undo2, Redo2,
  Type, Image, Table, SeparatorHorizontal, Link as LinkIcon,
  Bold, Italic, Underline, List, ListOrdered, Heading1, Heading2, Heading3,
  Square, Copy, Trash2, ArrowUp, ArrowDown, FilePlus, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Columns2, Columns3,
  Circle, Triangle, ArrowRight
} from 'lucide-react';
import { useEditorStore } from '../store';
import { iframeManager } from '../utils/iframeManager';
import { historyManager } from '../utils/historyManager';
import { serializeForExport, unwrapPageAreaIfPresent } from '../utils/domSerializer';
import {
  HTML_H1, HTML_H2, HTML_H3, HTML_P, HTML_TABLE, HTML_BLOCK,
  HTML_LINK, HTML_HR, HTML_IMAGE_PLACEHOLDER, HTML_COL2, HTML_COL3,
  HTML_SHAPE_CIRCLE, HTML_SHAPE_TRIANGLE, HTML_SHAPE_RECT, HTML_SHAPE_ARROW, HTML_SHAPE_NUM,
} from '../templates/elementTemplates';

export const Toolbar: React.FC = () => {
  const { fileName, isDirty, zoom, setZoom, loadHtml, setHtmlContent, setIsDirty, triggerLoad, pageWidth, setPageWidth } = useEditorStore();
  const htmlInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleImportImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    iframeManager.insertImageBase64(file);
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const handleImportHTML = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const html = unwrapPageAreaIfPresent(event.target?.result as string);
      loadHtml(html, file.name.replace('.html', '').replace('.htm', ''));
      historyManager.clear();
      historyManager.push(html, 'インポート');
    };
    reader.readAsText(file);
    if (htmlInputRef.current) htmlInputRef.current.value = '';
  };

  const handleExportHTML = () => {
    const doc = iframeManager.getDocument();
    if (!doc) return;
    const html = serializeForExport(doc, { pageWidth });
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.html`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setIsDirty(false);
  };

  const handleNewDocument = () => {
    if (!window.confirm('現在の内容が失われます。新規作成しますか？')) return;
    useEditorStore.getState().resetEditor();
    historyManager.clear();
  };

  const handleUndo = () => {
    const entry = historyManager.undo();
    if (entry) {
      setHtmlContent(entry.html);
      triggerLoad();
    }
  };

  const handleRedo = () => {
    const entry = historyManager.redo();
    if (entry) {
      setHtmlContent(entry.html);
      triggerLoad();
    }
  };

  const insertElement = (html: string) => {
    const selected = iframeManager.getSelectedElement() as HTMLElement | null;
    if (selected && selected.tagName.toLowerCase() !== 'body'
        && iframeManager.isContainerElement(selected)
        && iframeManager.canNestInside(selected)) {
      iframeManager.insertElement(html, 'inside');
    } else {
      iframeManager.insertElement(html, 'after');
    }
  };

  const handleDragStart = (e: React.DragEvent, html: string) => {
    e.dataTransfer.setData('application/x-editor-element', html);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const shapeDraggingRef = useRef(false);

  const handleShapeDragStart = (e: React.DragEvent, html: string) => {
    e.dataTransfer.setData('application/x-editor-shape', html);
    e.dataTransfer.effectAllowed = 'copy';
    shapeDraggingRef.current = true;
    // Close dropdown after a short delay so the drag data is captured but
    // the backdrop no longer blocks the iframe drop target
    requestAnimationFrame(() => {
      setShowShapesMenu(false);
      // Reset dragging flag on dragend (fires on the document since source element is unmounted)
      const onDragEnd = () => {
        shapeDraggingRef.current = false;
        document.removeEventListener('dragend', onDragEnd, true);
      };
      document.addEventListener('dragend', onDragEnd, true);
    });
  };

  const insertShape = (html: string) => {
    iframeManager.insertFloatingShape(html);
  };

  const [showShapesMenu, setShowShapesMenu] = React.useState(false);

  const canUndo = historyManager.canUndo();
  const canRedo = historyManager.canRedo();

  return (
    <header className="toolbar">
      {/* File operations */}
      <div className="toolbar-group">
        <button onClick={handleNewDocument} className="toolbar-btn" title="新規作成">
          <FilePlus size={16} />
          <span className="toolbar-label">新規</span>
        </button>
        
        <input type="file" accept=".html,.htm" ref={htmlInputRef} style={{ display: 'none' }} onChange={handleImportHTML} />
        <button onClick={() => htmlInputRef.current?.click()} className="toolbar-btn" title="HTML読込">
          <Upload size={16} />
          <span className="toolbar-label">読込</span>
        </button>
        
        <button onClick={handleExportHTML} className="toolbar-btn" title="HTML出力">
          <Download size={16} />
          <span className="toolbar-label">保存</span>
        </button>

        <button onClick={() => {
          const doc = iframeManager.getDocument();
          if (!doc) return;
          const html = serializeForExport(doc, { pageWidth });

          // BlobURLで新しいウィンドウを開き、印刷ダイアログ（PDF保存可能）を表示
          const blob = new Blob([html], { type: 'text/html; charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const printWin = window.open(url, '_blank');
          if (printWin) {
            printWin.onload = () => {
              printWin.print();
              // 印刷ダイアログが閉じたらBlobURLを解放
              URL.revokeObjectURL(url);
            };
          }
        }} className="toolbar-btn" title="PDF印刷">
          <FileText size={16} />
          <span className="toolbar-label">PDF</span>
        </button>
      </div>

      <div className="toolbar-divider" />

      {/* Undo/Redo */}
      <div className="toolbar-group">
        <button onClick={handleUndo} className="toolbar-btn" disabled={!canUndo} title="元に戻す (Ctrl+Z)">
          <Undo2 size={16} />
        </button>
        <button onClick={handleRedo} className="toolbar-btn" disabled={!canRedo} title="やり直し (Ctrl+Y)">
          <Redo2 size={16} />
        </button>
      </div>

      <div className="toolbar-divider" />

      {/* Text formatting - direct style manipulation on selected element */}
      <div className="toolbar-group">
        <button onClick={() => iframeManager.toggleBold()} className="toolbar-btn" title="太字 (選択要素に適用)">
          <Bold size={16} />
        </button>
        <button onClick={() => iframeManager.toggleItalic()} className="toolbar-btn" title="斜体 (選択要素に適用)">
          <Italic size={16} />
        </button>
        <button onClick={() => iframeManager.toggleUnderline()} className="toolbar-btn" title="下線 (選択要素に適用)">
          <Underline size={16} />
        </button>
      </div>

      <div className="toolbar-divider" />

      {/* Alignment - direct style on selected element */}
      <div className="toolbar-group">
        <button onClick={() => iframeManager.setTextAlign('left')} className="toolbar-btn" title="左揃え">
          <AlignLeft size={16} />
        </button>
        <button onClick={() => iframeManager.setTextAlign('center')} className="toolbar-btn" title="中央揃え">
          <AlignCenter size={16} />
        </button>
        <button onClick={() => iframeManager.setTextAlign('right')} className="toolbar-btn" title="右揃え">
          <AlignRight size={16} />
        </button>
        <button onClick={() => iframeManager.setTextAlign('justify')} className="toolbar-btn" title="両端揃え">
          <AlignJustify size={16} />
        </button>
      </div>

      <div className="toolbar-divider" />

      {/* Lists */}
      <div className="toolbar-group">
        <button onClick={() => iframeManager.insertList(false)} className="toolbar-btn" title="箇条書きリスト">
          <List size={16} />
        </button>
        <button onClick={() => iframeManager.insertList(true)} className="toolbar-btn" title="番号付きリスト">
          <ListOrdered size={16} />
        </button>
      </div>

      <div className="toolbar-divider" />

      {/* Insert elements - draggable to iframe */}
      <div className="toolbar-group">
        <button onClick={() => insertElement(HTML_H1)} draggable onDragStart={(e) => handleDragStart(e, HTML_H1)} className="toolbar-btn" title="見出し1 (ドラッグで配置可)">
          <Heading1 size={16} />
        </button>
        <button onClick={() => insertElement(HTML_H2)} draggable onDragStart={(e) => handleDragStart(e, HTML_H2)} className="toolbar-btn" title="見出し2 (ドラッグで配置可)">
          <Heading2 size={16} />
        </button>
        <button onClick={() => insertElement(HTML_H3)} draggable onDragStart={(e) => handleDragStart(e, HTML_H3)} className="toolbar-btn" title="見出し3 (ドラッグで配置可)">
          <Heading3 size={16} />
        </button>
        <button onClick={() => insertElement(HTML_P)} draggable onDragStart={(e) => handleDragStart(e, HTML_P)} className="toolbar-btn" title="段落 (ドラッグで配置可)">
          <Type size={16} />
        </button>
        <input type="file" accept="image/*" ref={imageInputRef} style={{ display: 'none' }} onChange={handleImportImage} />
        <button onClick={() => imageInputRef.current?.click()} draggable onDragStart={(e) => handleDragStart(e, HTML_IMAGE_PLACEHOLDER)} className="toolbar-btn" title="画像 (クリック:選択 / ドラッグ:配置枠)">
          <Image size={16} />
        </button>
        <button onClick={() => insertElement(HTML_TABLE)} draggable onDragStart={(e) => handleDragStart(e, HTML_TABLE)} className="toolbar-btn" title="テーブル (ドラッグで配置可)">
          <Table size={16} />
        </button>
        <button onClick={() => insertElement(HTML_BLOCK)} draggable onDragStart={(e) => handleDragStart(e, HTML_BLOCK)} className="toolbar-btn" title="ブロック (ドラッグで配置可)">
          <Square size={16} />
        </button>
        <button onClick={() => insertElement(HTML_LINK)} draggable onDragStart={(e) => handleDragStart(e, HTML_LINK)} className="toolbar-btn" title="リンク (ドラッグで配置可)">
          <LinkIcon size={16} />
        </button>
        <button onClick={() => insertElement(HTML_HR)} draggable onDragStart={(e) => handleDragStart(e, HTML_HR)} className="toolbar-btn" title="水平線 (ドラッグで配置可)">
          <SeparatorHorizontal size={16} />
        </button>
      </div>

      <div className="toolbar-divider" />

      {/* Column layouts - draggable */}
      <div className="toolbar-group">
        <button onClick={() => insertElement(HTML_COL2)} draggable onDragStart={(e) => handleDragStart(e, HTML_COL2)} className="toolbar-btn" title="2カラム (ドラッグで配置可)">
          <Columns2 size={16} />
          <span className="toolbar-label">2列</span>
        </button>
        <button onClick={() => insertElement(HTML_COL3)} draggable onDragStart={(e) => handleDragStart(e, HTML_COL3)} className="toolbar-btn" title="3カラム (ドラッグで配置可)">
          <Columns3 size={16} />
          <span className="toolbar-label">3列</span>
        </button>
      </div>

      <div className="toolbar-divider" />

      {/* Shapes - single button with dropdown */}
      <div className="toolbar-group" style={{ position: 'relative' }}>
        <button onClick={() => setShowShapesMenu(!showShapesMenu)} className="toolbar-btn" title="図形を挿入">
          <svg width="16" height="16" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <polygon points="36,3 43,17 29,17" />
            <rect x="3" y="29" width="18" height="18" rx="2" />
          </svg>
          <span className="toolbar-label">図形</span>
        </button>
        {showShapesMenu && (
          <>
            <div className="shapes-dropdown-backdrop" onClick={() => setShowShapesMenu(false)} />
            <div className="shapes-dropdown">
              <div className="shapes-dropdown-section">
                <span className="shapes-dropdown-label">基本図形</span>
                <div className="shapes-dropdown-grid">
                  <button onClick={() => { insertShape(HTML_SHAPE_CIRCLE); setShowShapesMenu(false); }} draggable onDragStart={(e) => handleShapeDragStart(e, HTML_SHAPE_CIRCLE)} className="shapes-dropdown-btn" title="丸">
                    <Circle size={20} />
                    <span>丸</span>
                  </button>
                  <button onClick={() => { insertShape(HTML_SHAPE_TRIANGLE); setShowShapesMenu(false); }} draggable onDragStart={(e) => handleShapeDragStart(e, HTML_SHAPE_TRIANGLE)} className="shapes-dropdown-btn" title="三角">
                    <Triangle size={20} />
                    <span>三角</span>
                  </button>
                  <button onClick={() => { insertShape(HTML_SHAPE_RECT); setShowShapesMenu(false); }} draggable onDragStart={(e) => handleShapeDragStart(e, HTML_SHAPE_RECT)} className="shapes-dropdown-btn" title="四角">
                    <Square size={20} />
                    <span>四角</span>
                  </button>
                  <button onClick={() => { insertShape(HTML_SHAPE_ARROW); setShowShapesMenu(false); }} draggable onDragStart={(e) => handleShapeDragStart(e, HTML_SHAPE_ARROW)} className="shapes-dropdown-btn" title="矢印">
                    <ArrowRight size={20} />
                    <span>矢印</span>
                  </button>
                </div>
              </div>
              <div className="shapes-dropdown-section">
                <span className="shapes-dropdown-label">番号</span>
                <div className="shapes-dropdown-numgrid">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                    <button
                      key={n}
                      onClick={() => { insertShape(HTML_SHAPE_NUM(n)); setShowShapesMenu(false); }}
                      draggable
                      onDragStart={(e) => handleShapeDragStart(e, HTML_SHAPE_NUM(n))}
                      className="shape-number-btn"
                      title={`番号 ${n}`}
                    >
                      {['①','②','③','④','⑤','⑥','⑦','⑧','⑨'][n - 1]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="toolbar-divider" />

      {/* Element operations - use iframeManager.hasSelection() for reliability */}
      <div className="toolbar-group">
        <button onClick={() => iframeManager.duplicateSelectedElement()} className="toolbar-btn" title="要素を複製">
          <Copy size={16} />
        </button>
        <button onClick={() => iframeManager.moveElementUp()} className="toolbar-btn" title="要素を上に移動">
          <ArrowUp size={16} />
        </button>
        <button onClick={() => iframeManager.moveElementDown()} className="toolbar-btn" title="要素を下に移動">
          <ArrowDown size={16} />
        </button>
        <button onClick={() => {
          if (iframeManager.hasSelection()) {
            iframeManager.removeSelectedElement();
          }
        }} className="toolbar-btn danger" title="要素を削除">
          <Trash2 size={16} />
        </button>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Page width toggle */}
      <div className="toolbar-group">
        <button
          onClick={() => setPageWidth(pageWidth === 'a4-portrait' ? 'a4-landscape' : 'a4-portrait')}
          className="toolbar-btn"
          title={pageWidth === 'a4-portrait' ? 'A4縦 → A4横に切替' : 'A4横 → A4縦に切替'}
        >
          <FileText size={16} style={pageWidth === 'a4-landscape' ? { transform: 'rotate(90deg)' } : undefined} />
          <span className="toolbar-label">{pageWidth === 'a4-portrait' ? 'A4縦' : 'A4横'}</span>
        </button>
      </div>

      <div className="toolbar-divider" />

      {/* Document info & Zoom */}
      <div className="toolbar-group">
        <span className="toolbar-filename">
          <FileCode size={14} />
          {fileName}{isDirty ? ' *' : ''}
        </span>
        <div className="zoom-control">
          <button onClick={() => setZoom(zoom - 10)} className="toolbar-btn zoom-btn" title="縮小">−</button>
          <span className="zoom-label">{zoom}%</span>
          <button onClick={() => setZoom(zoom + 10)} className="toolbar-btn zoom-btn" title="拡大">+</button>
        </div>
      </div>
    </header>
  );
};
