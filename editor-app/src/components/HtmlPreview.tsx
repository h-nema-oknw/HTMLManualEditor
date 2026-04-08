import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useEditorStore } from '../store';
import { iframeManager } from '../utils/iframeManager';
import { serializeIframeToHtml } from '../utils/domSerializer';
import { historyManager } from '../utils/historyManager';
import { PAGE_SIZES, CONTENT_CHANGE_DEBOUNCE_MS, IFRAME_HEIGHT_CHECK_MS } from '../constants';

export const HtmlPreview: React.FC = () => {
  const { htmlContent, zoom, setHtmlContent, setSelectedElement, setIsDirty, triggerUpdate, loadTrigger, pageWidth, updateTrigger } = useEditorStore();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const contentChangeTimeoutRef = useRef<number | null>(null);
  const isLoadingRef = useRef(false);
  const [iframeHeight, setIframeHeight] = useState(0);

  const pageSize = PAGE_SIZES[pageWidth];

  // Sync iframe height to its content so the outer container scrolls instead of the iframe
  const updateIframeHeight = useCallback(() => {
    const iframe = iframeRef.current;
    if (iframe?.contentDocument?.body) {
      const contentHeight = iframe.contentDocument.body.scrollHeight;
      const minHeight = window.innerHeight - 120;
      const height = Math.max(contentHeight, minHeight);
      iframe.style.height = `${height}px`;
      setIframeHeight(height);
    }
  }, []);

  // Periodically check iframe height and on content changes
  useEffect(() => {
    const interval = setInterval(updateIframeHeight, IFRAME_HEIGHT_CHECK_MS);
    return () => clearInterval(interval);
  }, [updateIframeHeight]);

  useEffect(() => {
    updateIframeHeight();
  }, [updateTrigger, loadTrigger, updateIframeHeight]);

  const handleSelection = useCallback((path: string, tagName: string) => {
    setSelectedElement(path || null, tagName || null);
  }, [setSelectedElement]);

  const handleContentChange = useCallback(() => {
    // Debounce content change to avoid excessive state updates
    if (contentChangeTimeoutRef.current) {
      window.clearTimeout(contentChangeTimeoutRef.current);
    }
    contentChangeTimeoutRef.current = window.setTimeout(() => {
      if (isLoadingRef.current) return;
      const doc = iframeManager.getDocument();
      if (doc) {
        const html = serializeIframeToHtml(doc);
        setIsDirty(true);
        triggerUpdate();
        // Push to history (debounced)
        historyManager.push(html, '編集');
      }
      updateIframeHeight();
    }, CONTENT_CHANGE_DEBOUNCE_MS);
  }, [setIsDirty, updateIframeHeight]);

  // Load HTML into iframe
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    isLoadingRef.current = true;

    const loadContent = () => {
      try {
        const doc = iframe.contentDocument;
        if (!doc) return;

        doc.open();
        doc.write(htmlContent);
        doc.close();

        // Disable iframe internal scrolling - let container handle it
        doc.documentElement.style.overflow = 'hidden';
        doc.body.style.overflow = 'hidden';

        // Inject editor scripts after content is loaded
        iframeManager.attach(iframe, handleSelection, handleContentChange);
        iframeManager.injectEditorScripts();

        // Push initial state to history if empty
        if (!historyManager.canUndo()) {
          historyManager.push(htmlContent, '初期状態');
        }

        isLoadingRef.current = false;

        // Update height after content loads
        setTimeout(updateIframeHeight, 100);
      } catch (e) {
        console.error('Error loading HTML into iframe:', e);
        isLoadingRef.current = false;
      }
    };

    // Small delay to ensure iframe is ready
    const timeout = setTimeout(loadContent, 50);

    return () => {
      clearTimeout(timeout);
      if (contentChangeTimeoutRef.current) {
        window.clearTimeout(contentChangeTimeoutRef.current);
      }
    };
  }, [htmlContent, loadTrigger, handleSelection, handleContentChange, updateIframeHeight]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      iframeManager.detach();
    };
  }, []);

  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    // Click on the outer container area (outside the iframe) = select page body
    if (e.target === e.currentTarget) {
      const body = iframeManager.getBody();
      const doc = iframeManager.getDocument();
      if (body && doc) {
        const selected = doc.querySelectorAll('[data-editor-selected]');
        selected.forEach(el => el.removeAttribute('data-editor-selected'));
        body.setAttribute('data-editor-selected', 'true');
        setSelectedElement('body', 'body');
      }
    }
  }, [setSelectedElement]);

  // DnD on the outer container: allow dropping toolbar elements to append at end
  const handleContainerDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('application/x-editor-element')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  }, []);

  const handleContainerDrop = useCallback((e: React.DragEvent) => {
    const html = e.dataTransfer.getData('application/x-editor-element');
    if (html) {
      e.preventDefault();
      e.stopPropagation();
      // Append at end of body
      const body = iframeManager.getBody();
      if (body) {
        const doc = iframeManager.getDocument();
        if (doc) {
          const template = doc.createElement('template');
          template.innerHTML = html.trim();
          const newEl = template.content.firstElementChild;
          if (newEl) {
            body.appendChild(newEl);
            iframeManager.selectElement(newEl);
          }
        }
      }
    }
  }, []);

  // Calculate page break positions
  const pageBreakCount = iframeHeight > 0 ? Math.floor(iframeHeight / pageSize.height) : 0;
  const pageBreaks = Array.from({ length: pageBreakCount }, (_, i) => (i + 1) * pageSize.height);

  return (
    <div
      className="html-preview-container"
      onClick={handleContainerClick}
      onDragOver={handleContainerDragOver}
      onDrop={handleContainerDrop}
    >
      <div
        className="html-preview-wrapper"
        style={{
          transform: `scale(${zoom / 100})`,
          transformOrigin: 'top center',
          width: `${10000 / zoom}%`,
          maxWidth: `${pageSize.width}px`,
        }}
      >
        <div className="html-preview-page-area">
          <iframe
            ref={iframeRef}
            className="html-preview-iframe"
            title="HTML Preview"
            sandbox="allow-same-origin allow-scripts"
          />
          {pageBreaks.map((top, i) => (
            <div
              key={i}
              className="page-break-indicator"
              style={{ top: `${top}px` }}
            >
              <span className="page-break-label page-break-label-left">P.{i + 2}▶</span>
              <span className="page-break-label page-break-label-right">◀P.{i + 2}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
