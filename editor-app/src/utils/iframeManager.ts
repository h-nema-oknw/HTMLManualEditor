/**
 * IframeManager - Manages interactions with the WYSIWYG iframe
 * Handles event injection, element selection, hover highlighting,
 * style application, and element insertion/removal.
 */

import { generateElementPath } from './domSerializer';
import { EDITOR_STYLES } from './editorStyles';
import { DRAG_THRESHOLD_PX, SHAPE_DRAG_THRESHOLD_PX, DROP_ZONE_BEFORE, DROP_ZONE_AFTER } from '../constants';

export type SelectionCallback = (path: string, tagName: string) => void;
export type ContentChangeCallback = () => void;

export class IframeManager {
  private iframe: HTMLIFrameElement | null = null;
  private onSelect: SelectionCallback | null = null;
  private onContentChange: ContentChangeCallback | null = null;
  private selectedPath: string | null = null;
  private hoveredElement: Element | null = null;
  private mutationObserver: MutationObserver | null = null;
  // Mouse-based drag reordering state
  private dragState: {
    source: HTMLElement;
    startY: number;
    started: boolean;
    indicator: HTMLElement | null;
    dropTarget: HTMLElement | null;
    dropBefore: boolean;
  } | null = null;
  // Table-internal drag reordering state (row/column)
  private tableDragState: {
    table: HTMLTableElement;
    mode: 'row' | 'col';
    sourceIndex: number;
    startX: number;
    startY: number;
    started: boolean;
    indicator: HTMLElement | null;
    dropIndex: number;
  } | null = null;
  // Toolbar DnD drop state
  private dropIndicatorEl: HTMLElement | null = null;
  private dropInsideEl: HTMLElement | null = null;
  // Table overlay state
  private tableOverlayTarget: HTMLTableElement | null = null;
  private tableOverlayEls: HTMLElement[] = [];
  // Shape free-move drag state
  private shapeDragState: {
    element: HTMLElement;
    startX: number;
    startY: number;
    startLeft: number;
    startTop: number;
    started: boolean;
  } | null = null;

  attach(iframe: HTMLIFrameElement, onSelect: SelectionCallback, onContentChange: ContentChangeCallback) {
    this.iframe = iframe;
    this.onSelect = onSelect;
    this.onContentChange = onContentChange;
  }

  detach() {
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }
    this.iframe = null;
    this.onSelect = null;
    this.onContentChange = null;
    this.selectedPath = null;
    this.hoveredElement = null;
  }

  getDocument(): Document | null {
    try {
      return this.iframe?.contentDocument || null;
    } catch {
      return null;
    }
  }

  getBody(): HTMLElement | null {
    return this.getDocument()?.body || null;
  }

  /**
   * Inject editor styles and event listeners into the iframe
   */
  injectEditorScripts() {
    const doc = this.getDocument();
    if (!doc) return;

    // Inject styles
    const existingStyle = doc.querySelector('style[data-editor-style]');
    if (!existingStyle) {
      const style = doc.createElement('style');
      style.setAttribute('data-editor-style', 'true');
      style.setAttribute('data-editor-injected', 'true');
      style.textContent = EDITOR_STYLES;
      doc.head.appendChild(style);
    }

    const body = doc.body;
    if (!body) return;

    // Ensure body has position:relative for absolute shape positioning
    if (!body.style.position || body.style.position === 'static') {
      body.style.position = 'relative';
    }

    // Click handler - select elements
    body.addEventListener('click', (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const target = e.target as HTMLElement;
      if (!target) {
        this.clearSelection();
        this.onSelect?.('', '');
        return;
      }

      // Table select handle click
      if (target.classList.contains('editor-table-select-handle')) {
        const wrapper = target.parentElement;
        const table = wrapper?.querySelector('table');
        if (table) {
          this.selectElement(table);
          return;
        }
      }

      // Image placeholder click — open file picker to replace with real image
      const placeholder = target.closest('[data-image-placeholder]') as HTMLElement | null;
      if (placeholder) {
        this.selectElement(placeholder);
        this.openImagePickerForPlaceholder(placeholder);
        return;
      }

      // Table add-col/add-row button clicks
      if (target.classList.contains('editor-table-add-col')) {
        const wrapper = target.parentElement;
        const table = wrapper?.querySelector('table');
        if (table) this.addTableColumnToTable(table);
        return;
      }
      if (target.classList.contains('editor-table-add-row')) {
        const wrapper = target.parentElement;
        const table = wrapper?.querySelector('table');
        if (table) this.addTableRowToTable(table);
        return;
      }

      // Clicking on body itself (or html) — check if below last element
      if (target === body || target === doc.documentElement) {
        const lastChild = this.getLastContentChild(body);
        if (lastChild && e.clientY > lastChild.getBoundingClientRect().bottom) {
          // Below all elements: select the last element (acts as "append after" position)
          this.selectElement(lastChild);
        } else {
          // No elements, or clicked above content: select page body
          this.clearSelection();
          body.setAttribute('data-editor-selected', 'true');
          this.selectedPath = 'body';
          this.onSelect?.('body', 'body');
        }
        return;
      }

      // Shape click — always select the wrapper div, not SVG internals
      const shapeWrapper = target.closest('[data-editor-shape]') as HTMLElement | null;
      if (shapeWrapper) {
        this.selectElement(shapeWrapper);
        return;
      }

      this.selectElement(target);
    }, true);

    // Mouseover handler - hover highlight + table overlay
    body.addEventListener('mouseover', (e: MouseEvent) => {
      let target = e.target as HTMLElement;
      if (!target || target === body) return;
      if (target.hasAttribute('data-editor-injected')) return;

      // For shape internals (SVG, circle, etc.), highlight the wrapper div
      const shapeWrap = target.closest('[data-editor-shape]') as HTMLElement | null;
      if (shapeWrap) target = shapeWrap;

      if (this.hoveredElement && this.hoveredElement !== target) {
        (this.hoveredElement as HTMLElement).removeAttribute('data-editor-hover');
      }

      if (!target.hasAttribute('data-editor-selected')) {
        target.setAttribute('data-editor-hover', 'true');
      }
      this.hoveredElement = target;

      // Table overlay: show +buttons when hovering over a table or its children
      const table = target.closest('table') as HTMLTableElement | null;
      if (table && table !== this.tableOverlayTarget) {
        this.showTableOverlay(table, doc);
      } else if (!table && this.tableOverlayTarget) {
        this.removeTableOverlay();
      }
    }, true);

    // Mouseout handler
    body.addEventListener('mouseout', (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target) {
        target.removeAttribute('data-editor-hover');
      }
      // Remove table overlay when leaving the wrapper area
      const related = e.relatedTarget as HTMLElement | null;
      if (this.tableOverlayTarget && related) {
        const wrapper = this.tableOverlayTarget.parentElement;
        if (wrapper?.classList.contains('editor-table-wrapper') && !wrapper.contains(related)) {
          this.removeTableOverlay();
        }
      }
    }, true);

    // Double-click handler - enable inline editing
    body.addEventListener('dblclick', (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      const target = e.target as HTMLElement;
      if (!target || target === body) return;

      // Only allow editing on text-containing elements
      const editableTags = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'a', 'li', 'td', 'th', 'div', 'label', 'strong', 'em', 'b', 'i', 'u', 'small', 'blockquote', 'figcaption', 'caption', 'dt', 'dd'];
      const tag = target.tagName.toLowerCase();
      
      if (editableTags.includes(tag)) {
        target.setAttribute('contenteditable', 'true');
        target.focus();
        
        // Add blur handler to end editing
        const blurHandler = () => {
          target.removeAttribute('contenteditable');
          target.removeEventListener('blur', blurHandler);
          this.onContentChange?.();
        };
        target.addEventListener('blur', blurHandler);
      }
    }, true);

    // Keyboard handler
    body.addEventListener('keydown', (e: KeyboardEvent) => {
      // Delete selected element
      if ((e.key === 'Delete' || e.key === 'Backspace') && this.selectedPath) {
        const activeEl = doc.activeElement;
        if (activeEl && activeEl.hasAttribute('contenteditable')) return;
        
        e.preventDefault();
        this.removeSelectedElement();
      }
    }, true);

    // Paste handler - catch images
    body.addEventListener('paste', (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          e.preventDefault();
          const file = items[i].getAsFile();
          if (file) {
            this.insertImageBase64(file);
          }
          break;
        }
      }
    }, true);

    // --- Mouse-based drag reordering ---
    // Uses mousedown/mousemove/mouseup instead of HTML5 DnD for reliability inside iframes.
    // Drag starts after 5px of vertical movement on a selected element.

    body.addEventListener('mousedown', (e: MouseEvent) => {
      if (e.button !== 0) return; // left click only
      const target = e.target as HTMLElement;
      if (!target || target === body) return;
      // Don't initiate drag on image placeholder (it needs click for file picker)
      if (target.closest('[data-image-placeholder]')) return;

      // --- Shape free-move drag ---
      const shapeEl = target.closest('[data-editor-shape]') as HTMLElement | null;
      if (shapeEl) {
        e.preventDefault();
        // Select the shape wrapper immediately so properties panel updates
        this.selectElement(shapeEl);
        this.initShapeDrag(shapeEl, e, doc);
        return;
      }

      let selected: HTMLElement | null = null;

      // Table select handle: start drag on the table wrapper immediately
      if (target.classList.contains('editor-table-select-handle')) {
        const wrapper = target.closest('.editor-table-wrapper') as HTMLElement | null;
        if (wrapper) {
          // Select the table first, then use the wrapper as the drag source
          const table = wrapper.querySelector('table');
          if (table) this.selectElement(table);
          selected = wrapper;
        }
      }

      // Normal case: find the selected element (target or ancestor with data-editor-selected)
      if (!selected) {
        let el: HTMLElement | null = target;
        while (el && el !== body) {
          if (el.hasAttribute('data-editor-selected') && !el.hasAttribute('contenteditable')) {
            break;
          }
          el = el.parentElement;
        }
        if (!el || el === body) return;
        selected = el;
      }

      // Check if selected is a table cell or row → table-internal drag
      const selectedTag = selected.tagName.toLowerCase();
      if (selectedTag === 'td' || selectedTag === 'th' || selectedTag === 'tr') {
        const table = selected.closest('table') as HTMLTableElement | null;
        if (table) {
          e.preventDefault();
          this.initTableDrag(selected, table, e, doc, body);
          return;
        }
      }

      // Prevent browser's native image/link drag from stealing mouse events
      e.preventDefault();

      // Prepare drag state (not started yet - wait for threshold)
      this.dragState = {
        source: selected,
        startY: e.clientY,
        started: false,
        indicator: null,
        dropTarget: null,
        dropBefore: true,
      };

      const onMouseMove = (ev: MouseEvent) => {
        if (!this.dragState) return;
        const dy = Math.abs(ev.clientY - this.dragState.startY);

        // Start drag after threshold
        if (!this.dragState.started) {
          if (dy < DRAG_THRESHOLD_PX) return;
          this.dragState.started = true;
          this.dragState.source.classList.add('editor-dragging');
          doc.body.style.cursor = 'grabbing';
          // Prevent text selection during drag
          ev.preventDefault();
        }

        ev.preventDefault();

        // Find which body-level child the cursor is over
        const children = Array.from(body.children).filter(c => {
          const el = c as HTMLElement;
          if (el === this.dragState!.source) return false;
          if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE') return false;
          // Include table wrappers (they contain user content), exclude other injected elements
          if (el.classList.contains('editor-table-wrapper')) return true;
          if (el.hasAttribute('data-editor-injected')) return false;
          return true;
        }) as HTMLElement[];

        let bestTarget: HTMLElement | null = null;
        let bestBefore = true;
        let bestDist = Infinity;

        for (const child of children) {
          const rect = child.getBoundingClientRect();
          const midY = rect.top + rect.height / 2;
          const dist = Math.abs(ev.clientY - midY);
          if (dist < bestDist) {
            bestDist = dist;
            bestTarget = child;
            bestBefore = ev.clientY < midY;
          }
        }

        this.dragState.dropTarget = bestTarget;
        this.dragState.dropBefore = bestBefore;

        // Show / update indicator
        if (bestTarget) {
          this.showDragIndicatorMouse(bestTarget, bestBefore, doc);
        } else {
          this.removeDragIndicatorMouse();
        }
      };

      const onMouseUp = (ev: MouseEvent) => {
        doc.removeEventListener('mousemove', onMouseMove, true);
        doc.removeEventListener('mouseup', onMouseUp, true);

        if (!this.dragState) return;
        const { source, started, dropTarget, dropBefore } = this.dragState;

        // Cleanup visuals
        source.classList.remove('editor-dragging');
        doc.body.style.cursor = '';
        this.removeDragIndicatorMouse();

        if (started && dropTarget && dropTarget !== source) {
          // Perform the move
          if (dropBefore) {
            dropTarget.parentNode?.insertBefore(source, dropTarget);
          } else {
            dropTarget.parentNode?.insertBefore(source, dropTarget.nextSibling);
          }
          this.selectElement(source);
          this.onContentChange?.();

          // Suppress the click that follows mouseup so it doesn't re-select a different element
          const suppressClick = (ce: MouseEvent) => {
            ce.stopPropagation();
            ce.preventDefault();
          };
          body.addEventListener('click', suppressClick, true);
          setTimeout(() => body.removeEventListener('click', suppressClick, true), 0);
        }

        this.dragState = null;
      };

      doc.addEventListener('mousemove', onMouseMove, true);
      doc.addEventListener('mouseup', onMouseUp, true);
    }, false); // NOTE: useCapture=false so click handler (capture) fires first for normal clicks

    // --- HTML5 DnD: toolbar element drops + OS image file drops ---
    body.addEventListener('dragover', (e: DragEvent) => {
      if (!e.dataTransfer) return;
      const isToolbarDrag = e.dataTransfer.types.includes('application/x-editor-element');
      const isShapeDrag = e.dataTransfer.types.includes('application/x-editor-shape');
      const isFileDrag = e.dataTransfer.types.includes('Files');

      if (isShapeDrag) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
      } else if (isToolbarDrag) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        this.updateToolbarDropIndicator(e, doc);
      } else if (isFileDrag) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
      }
    }, true);

    body.addEventListener('dragleave', (e: DragEvent) => {
      const related = e.relatedTarget as Node;
      if (!related || !body.contains(related)) {
        this.removeToolbarDropIndicator(doc);
      }
    }, true);

    body.addEventListener('drop', (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Shape drop - insert near the element closest to drop point
      const shapeHtml = e.dataTransfer?.getData('application/x-editor-shape');
      if (shapeHtml) {
        let dropX = 50, dropY = 50; // fallback
        try {
          const bodyRect = body.getBoundingClientRect();
          // 1. Try elementFromPoint to find element under cursor
          const hitEl = doc.elementFromPoint(e.clientX, e.clientY);
          if (hitEl && hitEl !== body) {
            // Use the hit element's position relative to body
            const rect = hitEl.getBoundingClientRect();
            dropX = rect.left - bodyRect.left;
            dropY = rect.top - bodyRect.top;
          } else {
            // 2. Fallback: scan body's direct children, find closest by Y
            const children = Array.from(body.children).filter(
              c => c instanceof HTMLElement && !c.hasAttribute('data-editor-shape')
            ) as HTMLElement[];
            let closest: HTMLElement | null = null;
            let minDist = Infinity;
            for (const child of children) {
              const r = child.getBoundingClientRect();
              const centerY = (r.top + r.bottom) / 2;
              const dist = Math.abs(e.clientY - centerY);
              if (dist < minDist) {
                minDist = dist;
                closest = child;
              }
            }
            if (closest) {
              const r = closest.getBoundingClientRect();
              dropX = r.left - bodyRect.left + 10;
              dropY = r.top - bodyRect.top;
            }
          }
        } catch {}
        this.insertFloatingShape(shapeHtml, Math.max(0, dropX), Math.max(0, dropY));
        return;
      }

      // Toolbar element drop
      const html = e.dataTransfer?.getData('application/x-editor-element');
      if (html) {
        const dropInfo = this.calculateDropTarget(e, doc);
        this.removeToolbarDropIndicator(doc);
        if (dropInfo) {
          this.insertAtPosition(html, dropInfo.target, dropInfo.position);
        } else {
          // Drop at end of body
          this.insertElement(html, 'after');
        }
        return;
      }

      // OS file drop
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          if (files[i].type.startsWith('image/')) {
            this.insertImageBase64(files[i]);
          }
        }
      }
    }, true);

    // Setup mutation observer for content changes
    this.setupMutationObserver(body);
  }

  private setupMutationObserver(body: HTMLElement) {
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
    }

    this.mutationObserver = new MutationObserver(() => {
      // Debounced content change callback
      this.onContentChange?.();
    });

    this.mutationObserver.observe(body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['style', 'class', 'src', 'href'],
    });
  }

  /**
   * Select an element by reference
   */
  selectElement(element: Element) {
    const doc = this.getDocument();
    const body = this.getBody();
    if (!doc || !body) return;

    // Clear previous selection
    this.clearSelection();

    // Set new selection
    element.setAttribute('data-editor-selected', 'true');
    element.removeAttribute('data-editor-hover');
    
    const path = generateElementPath(element, body);
    this.selectedPath = path;
    
    this.onSelect?.(path, element.tagName.toLowerCase());
  }

  /**
   * Select an element by CSS path
   */
  selectByPath(path: string) {
    const body = this.getBody();
    if (!body || !path) return;

    try {
      const element = body.querySelector(path);
      if (element) {
        this.selectElement(element);
        // Scroll into view
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } catch (e) {
      console.warn('Invalid selector path:', path, e);
    }
  }

  /**
   * Clear current selection
   */
  clearSelection() {
    const doc = this.getDocument();
    if (!doc) return;

    const selected = doc.querySelectorAll('[data-editor-selected]');
    selected.forEach(el => el.removeAttribute('data-editor-selected'));
    this.selectedPath = null;
  }

  /**
   * Get the currently selected element
   */
  getSelectedElement(): Element | null {
    const doc = this.getDocument();
    if (!doc) return null;
    return doc.querySelector('[data-editor-selected]') || null;
  }

  /**
   * Apply a CSS style to the selected element
   */
  applyStyle(property: string, value: string) {
    const element = this.getSelectedElement() as HTMLElement;
    if (!element) return;

    ((element.style as unknown) as Record<string, string>)[property] = value;
    this.onContentChange?.();
  }

  /**
   * Apply a style to the body element directly
   */
  applyBodyStyle(property: string, value: string) {
    const body = this.getBody();
    if (!body) return;
    ((body.style as unknown) as Record<string, string>)[property] = value;
    this.onContentChange?.();
  }

  /**
   * Get computed style of the body element
   */
  getBodyStyle(property: string): string {
    const body = this.getBody();
    if (!body) return '';
    const doc = this.getDocument();
    if (!doc) return '';
    const computed = doc.defaultView?.getComputedStyle(body);
    return computed?.getPropertyValue(property) || '';
  }

  /**
   * Get computed style of the selected element
   */
  getSelectedStyle(property: string): string {
    const element = this.getSelectedElement();
    if (!element) return '';

    const doc = this.getDocument();
    if (!doc) return '';

    const computed = doc.defaultView?.getComputedStyle(element);
    return computed?.getPropertyValue(property) || '';
  }

  /**
   * Get inline style of the selected element
   */
  getSelectedInlineStyle(property: string): string {
    const element = this.getSelectedElement() as HTMLElement;
    if (!element) return '';
    return ((element.style as unknown) as Record<string, string>)[property] || '';
  }

  /**
   * Get an attribute of the selected element
   */
  getSelectedAttribute(attr: string): string {
    const element = this.getSelectedElement();
    if (!element) return '';
    return element.getAttribute(attr) || '';
  }

  /**
   * Set an attribute on the selected element
   */
  setSelectedAttribute(attr: string, value: string) {
    const element = this.getSelectedElement();
    if (!element) return;
    
    if (value) {
      element.setAttribute(attr, value);
    } else {
      element.removeAttribute(attr);
    }
    this.onContentChange?.();
  }

  /**
   * Get the inner HTML of the selected element
   */
  getSelectedInnerHtml(): string {
    const element = this.getSelectedElement();
    if (!element) return '';
    return element.innerHTML;
  }

  /**
   * Get the text content of the selected element
   */
  getSelectedTextContent(): string {
    const element = this.getSelectedElement();
    if (!element) return '';
    return element.textContent || '';
  }

  /**
   * Insert an image as a Base64 Data URI
   */
  insertImageBase64(file: File) {
    if (!file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64Url = e.target?.result as string;
      const htmlString = `<div style="text-align:center;margin:15px 0;"><img src="${base64Url}" alt="${file.name}" style="max-width:100%;border-radius:8px;" /></div>`;
      this.insertElement(htmlString, 'after');
    };
    reader.readAsDataURL(file);
  }

  /**
   * Insert a new element into the DOM
   */
  insertElement(htmlString: string, position: 'before' | 'after' | 'inside' = 'after') {
    const selected = this.getSelectedElement() as HTMLElement | null;
    const body = this.getBody();
    if (!body) return;

    const template = this.getDocument()!.createElement('template');
    template.innerHTML = htmlString.trim();
    const newElement = template.content.firstElementChild;
    if (!newElement) return;

    // If body is selected (or no selection), append to end of body
    if (!selected || selected === body) {
      body.appendChild(newElement);
    } else if (position === 'before') {
      selected.parentNode?.insertBefore(newElement, selected);
    } else if (position === 'inside') {
      selected.appendChild(newElement);
    } else {
      selected.parentNode?.insertBefore(newElement, selected.nextSibling);
    }

    this.selectElement(newElement);
    this.onContentChange?.();
  }

  /**
   * Remove the selected element
   */
  removeSelectedElement() {
    const element = this.getSelectedElement();
    if (!element) return;

    const parent = element.parentElement;
    element.remove();
    this.selectedPath = null;
    this.onSelect?.('', '');
    this.onContentChange?.();
  }

  /**
   * Duplicate the selected element
   */
  duplicateSelectedElement() {
    const element = this.getSelectedElement();
    if (!element) return;

    const clone = element.cloneNode(true) as Element;
    clone.removeAttribute('data-editor-selected');
    clone.removeAttribute('data-editor-hover');

    // Offset shape position for visibility
    if (element.hasAttribute('data-editor-shape')) {
      const htmlClone = clone as HTMLElement;
      const left = parseInt(htmlClone.style.left) || 0;
      const top = parseInt(htmlClone.style.top) || 0;
      htmlClone.style.left = `${left + 20}px`;
      htmlClone.style.top = `${top + 20}px`;
    }

    element.parentNode?.insertBefore(clone, element.nextSibling);

    this.selectElement(clone);
    this.onContentChange?.();
  }

  /**
   * Move the selected element up (before previous sibling)
   */
  moveElementUp() {
    const element = this.getSelectedElement();
    if (!element || !element.previousElementSibling) return;

    element.parentNode?.insertBefore(element, element.previousElementSibling);
    this.onContentChange?.();
  }

  /**
   * Move the selected element down (after next sibling)
   */
  moveElementDown() {
    const element = this.getSelectedElement();
    if (!element || !element.nextElementSibling) return;

    element.parentNode?.insertBefore(element.nextElementSibling, element);
    this.onContentChange?.();
  }

  /**
   * Check if any element is currently selected
   */
  hasSelection(): boolean {
    return this.getSelectedElement() !== null;
  }

  /**
   * Toggle bold style on the selected element
   */
  toggleBold() {
    const element = this.getSelectedElement() as HTMLElement;
    if (!element) return;
    const current = element.style.fontWeight;
    element.style.fontWeight = (current === 'bold' || current === '700') ? 'normal' : 'bold';
    this.onContentChange?.();
  }

  /**
   * Toggle italic style on the selected element
   */
  toggleItalic() {
    const element = this.getSelectedElement() as HTMLElement;
    if (!element) return;
    const current = element.style.fontStyle;
    element.style.fontStyle = current === 'italic' ? 'normal' : 'italic';
    this.onContentChange?.();
  }

  /**
   * Toggle underline on the selected element
   */
  toggleUnderline() {
    const element = this.getSelectedElement() as HTMLElement;
    if (!element) return;
    const current = element.style.textDecoration;
    element.style.textDecoration = current.includes('underline') ? 'none' : 'underline';
    this.onContentChange?.();
  }

  /**
   * Toggle strikethrough on the selected element
   */
  toggleStrikethrough() {
    const element = this.getSelectedElement() as HTMLElement;
    if (!element) return;
    const current = element.style.textDecoration;
    element.style.textDecoration = current.includes('line-through') ? 'none' : 'line-through';
    this.onContentChange?.();
  }

  /**
   * Set text alignment on the selected element
   */
  setTextAlign(align: 'left' | 'center' | 'right' | 'justify') {
    const element = this.getSelectedElement() as HTMLElement;
    if (!element) return;
    element.style.textAlign = align;
    this.onContentChange?.();
  }

  /**
   * Toggle list: wrap selected element's content in a list or unwrap
   */
  insertList(ordered: boolean) {
    const selected = this.getSelectedElement() as HTMLElement;
    const body = this.getBody();
    const doc = this.getDocument();
    if (!body || !doc) return;

    const listTag = ordered ? 'ol' : 'ul';
    const list = doc.createElement(listTag);
    const li = doc.createElement('li');
    li.textContent = selected ? (selected.textContent || 'リスト項目') : 'リスト項目';
    list.appendChild(li);

    if (selected) {
      selected.parentNode?.insertBefore(list, selected.nextSibling);
    } else {
      body.appendChild(list);
    }

    this.selectElement(list);
    this.onContentChange?.();
  }

  // --- Shape methods ---

  /**
   * Insert a floating shape at the given coordinates (or default position)
   */
  insertFloatingShape(htmlString: string, x?: number, y?: number) {
    const body = this.getBody();
    const doc = this.getDocument();
    if (!body || !doc) return;

    const template = doc.createElement('template');
    template.innerHTML = htmlString.trim();
    const newElement = template.content.firstElementChild as HTMLElement;
    if (!newElement) return;

    // Set position
    if (x !== undefined && y !== undefined) {
      newElement.style.left = `${x}px`;
      newElement.style.top = `${y}px`;
    }

    body.appendChild(newElement);
    this.selectElement(newElement);
    this.onContentChange?.();
  }

  /**
   * Check if the currently selected element is a shape
   */
  isSelectedShape(): boolean {
    const el = this.getSelectedElement();
    return el?.hasAttribute('data-editor-shape') || false;
  }

  /** 選択中の図形からSVG要素を取得する共通ヘルパー */
  private getSelectedShapeSvg(): SVGElement | null {
    const el = this.getSelectedElement();
    if (!el?.hasAttribute('data-editor-shape')) return null;
    return el.querySelector('svg');
  }

  private static readonly SVG_SHAPE_SELECTOR = 'circle, rect, polygon, path, ellipse';

  getShapeSvgAttribute(attr: string): string {
    const svg = this.getSelectedShapeSvg();
    if (!svg) return '';
    const shape = svg.querySelector(IframeManager.SVG_SHAPE_SELECTOR);
    return shape?.getAttribute(attr) || '';
  }

  private setShapeSvgAttribute(attr: string, value: string) {
    const svg = this.getSelectedShapeSvg();
    if (!svg) return;
    svg.querySelectorAll(IframeManager.SVG_SHAPE_SELECTOR).forEach(shape => shape.setAttribute(attr, value));
    this.onContentChange?.();
  }

  setShapeFill(color: string) { this.setShapeSvgAttribute('fill', color); }
  setShapeStroke(color: string) { this.setShapeSvgAttribute('stroke', color); }
  setShapeStrokeWidth(width: string) { this.setShapeSvgAttribute('stroke-width', width); }

  setShapeTextFill(color: string) {
    const svg = this.getSelectedShapeSvg();
    if (!svg) return;
    const text = svg.querySelector('text');
    if (text) text.setAttribute('fill', color);
    this.onContentChange?.();
  }

  // --- Shape free-move drag ---

  private initShapeDrag(shapeEl: HTMLElement, e: MouseEvent, doc: Document) {
    const left = parseInt(shapeEl.style.left) || 0;
    const top = parseInt(shapeEl.style.top) || 0;

    this.shapeDragState = {
      element: shapeEl,
      startX: e.clientX,
      startY: e.clientY,
      startLeft: left,
      startTop: top,
      started: false,
    };

    const onMouseMove = (ev: MouseEvent) => {
      if (!this.shapeDragState) return;
      const dx = ev.clientX - this.shapeDragState.startX;
      const dy = ev.clientY - this.shapeDragState.startY;

      if (!this.shapeDragState.started) {
        if (Math.abs(dx) < SHAPE_DRAG_THRESHOLD_PX && Math.abs(dy) < SHAPE_DRAG_THRESHOLD_PX) return;
        this.shapeDragState.started = true;
        this.shapeDragState.element.classList.add('editor-shape-dragging');
        doc.body.style.cursor = 'move';
      }

      ev.preventDefault();
      const newLeft = this.shapeDragState.startLeft + dx;
      const newTop = this.shapeDragState.startTop + dy;
      this.shapeDragState.element.style.left = `${newLeft}px`;
      this.shapeDragState.element.style.top = `${newTop}px`;
    };

    const onMouseUp = (ev: MouseEvent) => {
      doc.removeEventListener('mousemove', onMouseMove, true);
      doc.removeEventListener('mouseup', onMouseUp, true);

      if (!this.shapeDragState) return;
      const { started, element } = this.shapeDragState;

      element.classList.remove('editor-shape-dragging');
      doc.body.style.cursor = '';

      if (started) {
        this.onContentChange?.();
        // Suppress click after drag
        const body = doc.body;
        const suppressClick = (ce: MouseEvent) => {
          ce.stopPropagation();
          ce.preventDefault();
        };
        body.addEventListener('click', suppressClick, true);
        setTimeout(() => body.removeEventListener('click', suppressClick, true), 0);
      }

      this.shapeDragState = null;
    };

    doc.addEventListener('mousemove', onMouseMove, true);
    doc.addEventListener('mouseup', onMouseUp, true);
  }

  // --- Mouse drag helper methods ---

  private showDragIndicatorMouse(target: HTMLElement, insertBefore: boolean, doc: Document) {
    // Reuse existing indicator if possible
    let indicator = this.dragState?.indicator || null;
    if (!indicator) {
      indicator = doc.createElement('div');
      indicator.className = 'editor-drag-indicator';
      indicator.setAttribute('data-editor-injected', 'true');
      doc.body.appendChild(indicator);
      if (this.dragState) this.dragState.indicator = indicator;
    }

    if (insertBefore) {
      indicator.style.top = `${target.offsetTop - 2}px`;
    } else {
      indicator.style.top = `${target.offsetTop + target.offsetHeight - 1}px`;
    }
  }

  private getLastContentChild(body: HTMLElement): HTMLElement | null {
    const children = Array.from(body.children).filter(c => {
      const el = c as HTMLElement;
      if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE') return false;
      if (el.hasAttribute('data-editor-injected') && !el.classList.contains('editor-table-wrapper')) return false;
      return true;
    }) as HTMLElement[];
    return children.length > 0 ? children[children.length - 1] : null;
  }

  private removeDragIndicatorMouse() {
    if (this.dragState?.indicator) {
      this.dragState.indicator.remove();
      this.dragState.indicator = null;
    }
  }

  // --- Table-internal drag (row/column reordering) ---

  private initTableDrag(selected: HTMLElement, table: HTMLTableElement, e: MouseEvent, doc: Document, body: HTMLElement) {
    const selectedTag = selected.tagName.toLowerCase();
    // Determine mode: vertical drag = row, horizontal drag = column
    // For tr, always row mode; for td/th, determine by drag direction
    const row = selectedTag === 'tr' ? selected : selected.closest('tr') as HTMLElement;
    if (!row) return;

    const allRows = this.getTableAllRows(table);
    const rowIndex = allRows.indexOf(row as HTMLTableRowElement);
    if (rowIndex < 0) return;

    let colIndex = -1;
    if (selectedTag === 'td' || selectedTag === 'th') {
      colIndex = Array.from(row.children).indexOf(selected);
    }

    this.tableDragState = {
      table,
      mode: selectedTag === 'tr' ? 'row' : 'row', // will be decided after threshold
      sourceIndex: rowIndex,
      startX: e.clientX,
      startY: e.clientY,
      started: false,
      indicator: null,
      dropIndex: rowIndex,
    };

    const onMouseMove = (ev: MouseEvent) => {
      if (!this.tableDragState) return;
      const dx = Math.abs(ev.clientX - this.tableDragState.startX);
      const dy = Math.abs(ev.clientY - this.tableDragState.startY);

      if (!this.tableDragState.started) {
        if (dx < 5 && dy < 5) return;
        this.tableDragState.started = true;

        // For td/th: decide mode based on drag direction
        if (selectedTag === 'td' || selectedTag === 'th') {
          if (dx > dy && colIndex >= 0) {
            this.tableDragState.mode = 'col';
            this.tableDragState.sourceIndex = colIndex;
          } else {
            this.tableDragState.mode = 'row';
            this.tableDragState.sourceIndex = rowIndex;
          }
        }

        // Visual feedback
        if (this.tableDragState.mode === 'row') {
          row.classList.add('editor-dragging');
        } else {
          // Highlight source column cells
          this.setColumnDragging(table, this.tableDragState.sourceIndex, true);
        }
        doc.body.style.cursor = 'grabbing';
        ev.preventDefault();
      }

      ev.preventDefault();

      if (this.tableDragState.mode === 'row') {
        this.updateTableRowIndicator(ev, table, doc);
      } else {
        this.updateTableColIndicator(ev, table, doc);
      }
    };

    const onMouseUp = (ev: MouseEvent) => {
      doc.removeEventListener('mousemove', onMouseMove, true);
      doc.removeEventListener('mouseup', onMouseUp, true);

      if (!this.tableDragState) return;
      const { started, mode, sourceIndex, dropIndex } = this.tableDragState;

      // Cleanup visuals
      if (mode === 'row') {
        row.classList.remove('editor-dragging');
      } else {
        this.setColumnDragging(table, sourceIndex, false);
      }
      doc.body.style.cursor = '';
      this.removeTableDragIndicator();

      if (started && sourceIndex !== dropIndex) {
        if (mode === 'row') {
          this.swapTableRows(table, sourceIndex, dropIndex);
        } else {
          this.swapTableColumns(table, sourceIndex, dropIndex);
        }
        this.onContentChange?.();
      }

      // Suppress click
      if (started) {
        const suppressClick = (ce: MouseEvent) => {
          ce.stopPropagation();
          ce.preventDefault();
        };
        body.addEventListener('click', suppressClick, true);
        setTimeout(() => body.removeEventListener('click', suppressClick, true), 0);
      }

      this.tableDragState = null;
    };

    doc.addEventListener('mousemove', onMouseMove, true);
    doc.addEventListener('mouseup', onMouseUp, true);
  }

  private getTableAllRows(table: HTMLTableElement): HTMLTableRowElement[] {
    // Get all rows from thead and tbody in order
    const rows: HTMLTableRowElement[] = [];
    const sections = table.querySelectorAll('thead, tbody');
    if (sections.length === 0) {
      // No sections, get direct tr children
      rows.push(...Array.from(table.querySelectorAll(':scope > tr')) as HTMLTableRowElement[]);
    } else {
      sections.forEach(section => {
        rows.push(...Array.from(section.querySelectorAll(':scope > tr')) as HTMLTableRowElement[]);
      });
    }
    return rows;
  }

  private updateTableRowIndicator(ev: MouseEvent, table: HTMLTableElement, doc: Document) {
    if (!this.tableDragState) return;
    const allRows = this.getTableAllRows(table);
    const wrapper = table.closest('.editor-table-wrapper') as HTMLElement || table;

    let bestIndex = 0;
    let bestDist = Infinity;

    for (let i = 0; i < allRows.length; i++) {
      if (i === this.tableDragState.sourceIndex) continue;
      const rect = allRows[i].getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const dist = Math.abs(ev.clientY - midY);
      if (dist < bestDist) {
        bestDist = dist;
        bestIndex = i;
        // Determine if before or after
        if (ev.clientY < midY) {
          bestIndex = i; // insert before i
        } else {
          bestIndex = i + 1; // insert after i
        }
      }
    }

    // Clamp
    if (bestIndex > allRows.length) bestIndex = allRows.length;
    this.tableDragState.dropIndex = bestIndex > this.tableDragState.sourceIndex ? bestIndex - 1 : bestIndex;

    // Show indicator
    let indicator = this.tableDragState.indicator;
    if (!indicator) {
      indicator = doc.createElement('div');
      indicator.className = 'editor-table-row-indicator';
      indicator.setAttribute('data-editor-injected', 'true');
      wrapper.appendChild(indicator);
      this.tableDragState.indicator = indicator;
    }

    // Position the indicator
    const tableRect = table.getBoundingClientRect();
    const wrapperRect = wrapper.getBoundingClientRect();
    if (bestIndex < allRows.length) {
      const targetRect = allRows[bestIndex > this.tableDragState.sourceIndex ? bestIndex : bestIndex].getBoundingClientRect();
      indicator.style.top = `${targetRect.top - wrapperRect.top - 1}px`;
    } else {
      const lastRect = allRows[allRows.length - 1].getBoundingClientRect();
      indicator.style.top = `${lastRect.bottom - wrapperRect.top - 1}px`;
    }
    indicator.style.left = `${tableRect.left - wrapperRect.left}px`;
    indicator.style.right = `${wrapperRect.right - tableRect.right}px`;
  }

  private updateTableColIndicator(ev: MouseEvent, table: HTMLTableElement, doc: Document) {
    if (!this.tableDragState) return;
    const firstRow = table.querySelector('tr');
    if (!firstRow) return;
    const cells = Array.from(firstRow.children) as HTMLElement[];
    const wrapper = table.closest('.editor-table-wrapper') as HTMLElement || table;

    let bestIndex = 0;
    let bestDist = Infinity;

    for (let i = 0; i < cells.length; i++) {
      if (i === this.tableDragState.sourceIndex) continue;
      const rect = cells[i].getBoundingClientRect();
      const midX = rect.left + rect.width / 2;
      const dist = Math.abs(ev.clientX - midX);
      if (dist < bestDist) {
        bestDist = dist;
        if (ev.clientX < midX) {
          bestIndex = i;
        } else {
          bestIndex = i + 1;
        }
      }
    }

    if (bestIndex > cells.length) bestIndex = cells.length;
    this.tableDragState.dropIndex = bestIndex > this.tableDragState.sourceIndex ? bestIndex - 1 : bestIndex;

    // Show indicator
    let indicator = this.tableDragState.indicator;
    if (!indicator) {
      indicator = doc.createElement('div');
      indicator.className = 'editor-table-col-indicator';
      indicator.setAttribute('data-editor-injected', 'true');
      wrapper.appendChild(indicator);
      this.tableDragState.indicator = indicator;
    }

    const tableRect = table.getBoundingClientRect();
    const wrapperRect = wrapper.getBoundingClientRect();
    if (bestIndex < cells.length) {
      const targetRect = cells[bestIndex > this.tableDragState.sourceIndex ? bestIndex : bestIndex].getBoundingClientRect();
      indicator.style.left = `${targetRect.left - wrapperRect.left - 1}px`;
    } else {
      const lastRect = cells[cells.length - 1].getBoundingClientRect();
      indicator.style.left = `${lastRect.right - wrapperRect.left - 1}px`;
    }
    indicator.style.top = `${tableRect.top - wrapperRect.top}px`;
    indicator.style.bottom = `${wrapperRect.bottom - tableRect.bottom}px`;
  }

  private removeTableDragIndicator() {
    if (this.tableDragState?.indicator) {
      this.tableDragState.indicator.remove();
      this.tableDragState.indicator = null;
    }
  }

  private setColumnDragging(table: HTMLTableElement, colIndex: number, add: boolean) {
    const rows = this.getTableAllRows(table);
    rows.forEach(row => {
      const cell = row.children[colIndex] as HTMLElement | undefined;
      if (cell) {
        if (add) cell.classList.add('editor-col-dragging');
        else cell.classList.remove('editor-col-dragging');
      }
    });
  }

  private swapTableRows(table: HTMLTableElement, fromIndex: number, toIndex: number) {
    const allRows = this.getTableAllRows(table);
    if (fromIndex < 0 || fromIndex >= allRows.length || toIndex < 0 || toIndex >= allRows.length) return;
    if (fromIndex === toIndex) return;

    const sourceRow = allRows[fromIndex];
    const targetRow = allRows[toIndex];

    // Both rows must be in the same section (thead or tbody) for simple swap
    // If in different sections, move source into target's section
    const sourceParent = sourceRow.parentElement!;
    const targetParent = targetRow.parentElement!;

    if (sourceParent === targetParent) {
      // Same section: simple reorder
      if (fromIndex < toIndex) {
        targetParent.insertBefore(sourceRow, targetRow.nextSibling);
      } else {
        targetParent.insertBefore(sourceRow, targetRow);
      }
    } else {
      // Cross-section: move into target section
      if (fromIndex < toIndex) {
        targetParent.insertBefore(sourceRow, targetRow.nextSibling);
      } else {
        targetParent.insertBefore(sourceRow, targetRow);
      }
    }

    this.selectElement(sourceRow);
  }

  private swapTableColumns(table: HTMLTableElement, fromIndex: number, toIndex: number) {
    const allRows = this.getTableAllRows(table);
    if (fromIndex === toIndex) return;

    allRows.forEach(row => {
      const cells = Array.from(row.children);
      if (fromIndex >= cells.length || toIndex >= cells.length) return;

      const sourceCell = cells[fromIndex];
      const targetCell = cells[toIndex];

      if (fromIndex < toIndex) {
        row.insertBefore(sourceCell, targetCell.nextSibling);
      } else {
        row.insertBefore(sourceCell, targetCell);
      }
    });

    // Select the moved cell in the first data row
    const firstRow = allRows[0];
    if (firstRow) {
      const movedCell = firstRow.children[toIndex];
      if (movedCell) this.selectElement(movedCell);
    }
  }

  // --- Toolbar DnD helper methods ---

  /**
   * Check if an element is a container that can accept children.
   * Public so Toolbar can use it for smart click-insertion.
   */
  isContainerElement(el: Element): boolean {
    const tag = el.tagName.toLowerCase();
    const containerTags = [
      'div', 'section', 'article', 'nav', 'main', 'aside',
      'header', 'footer', 'td', 'th', 'li', 'figure', 'blockquote',
    ];
    if (!containerTags.includes(tag)) return false;
    const htmlEl = el as HTMLElement;
    const display = htmlEl.style.display || '';
    if (display === 'flex' || display === 'grid') return true;
    if (el.children.length > 0) return true;
    return true; // block divs are containers
  }

  /**
   * Check if nesting is allowed (max 2 levels: body > parent > child).
   * Returns true if inserting a child inside `container` would NOT create a 3rd level.
   */
  canNestInside(container: Element): boolean {
    const body = this.getBody();
    if (!body) return false;
    // Count depth from body. Allow nesting if container is at depth 1 or 2 from body.
    // depth 1: body > container → child at depth 2 (OK)
    // depth 2: body > parent > container → child at depth 3 (OK, e.g. flex > column > content)
    // depth 3+: too deep, deny
    let depth = 0;
    let el: Element | null = container;
    while (el && el !== body) {
      // Skip editor-injected wrappers (e.g. table-wrapper) when counting depth
      if (!(el as HTMLElement).classList?.contains('editor-table-wrapper')) {
        depth++;
      }
      el = el.parentElement;
    }
    return depth <= 2;
  }

  private calculateDropTarget(e: DragEvent, doc: Document): { target: HTMLElement; position: 'before' | 'after' | 'inside' } | null {
    const body = doc.body;
    const x = e.clientX;
    const y = e.clientY;

    let el = doc.elementFromPoint(x, y) as HTMLElement | null;
    if (!el || el === body || el === doc.documentElement) {
      // Cursor is over empty body area — if below last child, append after it
      const children = Array.from(body.children).filter(c =>
        !c.hasAttribute('data-editor-injected') && c.tagName !== 'SCRIPT' && c.tagName !== 'STYLE'
      );
      if (children.length > 0) {
        const last = children[children.length - 1] as HTMLElement;
        if (y > last.getBoundingClientRect().bottom) {
          return { target: last, position: 'after' as const };
        }
      }
      return null;
    }

    // Skip editor-injected elements
    while (el && el.hasAttribute('data-editor-injected')) {
      el = el.parentElement;
    }
    if (!el || el === body) return null;

    const rect = el.getBoundingClientRect();
    const relY = (y - rect.top) / rect.height;

    if (this.isContainerElement(el) && this.canNestInside(el)) {
      // Container with nesting allowed: zone detection
      if (relY < DROP_ZONE_BEFORE) {
        return { target: el, position: 'before' };
      } else if (relY > DROP_ZONE_AFTER) {
        return { target: el, position: 'after' };
      } else {
        return { target: el, position: 'inside' };
      }
    } else {
      // Non-container or nesting not allowed: simple before/after
      return { target: el, position: relY < 0.5 ? 'before' : 'after' };
    }
  }

  private updateToolbarDropIndicator(e: DragEvent, doc: Document) {
    const dropInfo = this.calculateDropTarget(e, doc);

    // Clear previous inside-highlight
    if (this.dropInsideEl) {
      this.dropInsideEl.classList.remove('editor-drop-inside');
      this.dropInsideEl = null;
    }

    if (!dropInfo) {
      this.removeToolbarDropIndicator(doc);
      return;
    }

    if (dropInfo.position === 'inside') {
      // Show container highlight, remove line indicator
      if (this.dropIndicatorEl) {
        this.dropIndicatorEl.remove();
        this.dropIndicatorEl = null;
      }
      dropInfo.target.classList.add('editor-drop-inside');
      this.dropInsideEl = dropInfo.target;
    } else {
      // Show line indicator
      if (!this.dropIndicatorEl) {
        this.dropIndicatorEl = doc.createElement('div');
        this.dropIndicatorEl.className = 'editor-drag-indicator';
        this.dropIndicatorEl.setAttribute('data-editor-injected', 'true');
        doc.body.appendChild(this.dropIndicatorEl);
      }

      const target = dropInfo.target;
      if (dropInfo.position === 'before') {
        this.dropIndicatorEl.style.top = `${target.offsetTop - 2}px`;
      } else {
        this.dropIndicatorEl.style.top = `${target.offsetTop + target.offsetHeight - 1}px`;
      }
    }
  }

  private removeToolbarDropIndicator(doc?: Document) {
    if (this.dropIndicatorEl) {
      this.dropIndicatorEl.remove();
      this.dropIndicatorEl = null;
    }
    if (this.dropInsideEl) {
      this.dropInsideEl.classList.remove('editor-drop-inside');
      this.dropInsideEl = null;
    }
  }

  /**
   * Insert HTML at a specific target position (used by toolbar DnD)
   */
  private insertAtPosition(htmlString: string, target: HTMLElement, position: 'before' | 'after' | 'inside') {
    const doc = this.getDocument();
    if (!doc) return;

    const template = doc.createElement('template');
    template.innerHTML = htmlString.trim();
    const newElement = template.content.firstElementChild;
    if (!newElement) return;

    if (position === 'inside') {
      target.appendChild(newElement);
    } else if (position === 'before') {
      target.parentNode?.insertBefore(newElement, target);
    } else {
      target.parentNode?.insertBefore(newElement, target.nextSibling);
    }

    this.selectElement(newElement);
    this.onContentChange?.();
  }

  // --- Table overlay methods ---

  private showTableOverlay(table: HTMLTableElement, doc: Document) {
    this.removeTableOverlay();
    this.tableOverlayTarget = table;

    // Wrap table if not already wrapped
    let wrapper = table.parentElement;
    if (!wrapper || !wrapper.classList.contains('editor-table-wrapper')) {
      wrapper = doc.createElement('div');
      wrapper.className = 'editor-table-wrapper';
      wrapper.setAttribute('data-editor-injected', 'true');
      wrapper.style.position = 'relative';
      wrapper.style.display = 'inline-block';
      wrapper.style.width = '100%';
      table.parentNode?.insertBefore(wrapper, table);
      wrapper.appendChild(table);
    }

    // Select handle (top-left)
    const selectHandle = doc.createElement('div');
    selectHandle.className = 'editor-table-select-handle';
    selectHandle.setAttribute('data-editor-injected', 'true');
    selectHandle.title = 'テーブル全体を選択';
    wrapper.appendChild(selectHandle);
    this.tableOverlayEls.push(selectHandle);

    // Add column button (right side)
    const addCol = doc.createElement('div');
    addCol.className = 'editor-table-add-col';
    addCol.setAttribute('data-editor-injected', 'true');
    addCol.textContent = '+';
    addCol.title = '列を追加';
    wrapper.appendChild(addCol);
    this.tableOverlayEls.push(addCol);

    // Add row button (bottom)
    const addRow = doc.createElement('div');
    addRow.className = 'editor-table-add-row';
    addRow.setAttribute('data-editor-injected', 'true');
    addRow.textContent = '+';
    addRow.title = '行を追加';
    wrapper.appendChild(addRow);
    this.tableOverlayEls.push(addRow);
  }

  private removeTableOverlay() {
    for (const el of this.tableOverlayEls) {
      el.remove();
    }
    this.tableOverlayEls = [];
    this.tableOverlayTarget = null;
  }

  // --- Table row/column operations ---

  private getTableFromSelected(): HTMLTableElement | null {
    const selected = this.getSelectedElement() as HTMLElement | null;
    if (!selected) return null;
    if (selected.tagName.toLowerCase() === 'table') return selected as HTMLTableElement;
    return selected.closest('table') as HTMLTableElement | null;
  }

  private addTableRowToTable(table: HTMLTableElement) {
    const tbody = table.querySelector('tbody') || table;
    const lastRow = tbody.querySelector('tr:last-child');
    if (!lastRow) return;
    const colCount = lastRow.querySelectorAll('td, th').length;
    const newRow = table.ownerDocument.createElement('tr');
    for (let i = 0; i < colCount; i++) {
      const td = table.ownerDocument.createElement('td');
      td.style.cssText = 'border:1px solid #ddd;padding:8px 12px;';
      td.textContent = '';
      newRow.appendChild(td);
    }
    tbody.appendChild(newRow);
    this.onContentChange?.();
  }

  private addTableColumnToTable(table: HTMLTableElement) {
    const rows = table.querySelectorAll('tr');
    rows.forEach(row => {
      const cells = row.querySelectorAll('td, th');
      const lastCell = cells[cells.length - 1];
      const isHeader = lastCell?.tagName.toLowerCase() === 'th';
      const newCell = table.ownerDocument.createElement(isHeader ? 'th' : 'td');
      newCell.style.cssText = lastCell ? (lastCell as HTMLElement).style.cssText : 'border:1px solid #ddd;padding:8px 12px;';
      if (isHeader) newCell.textContent = 'ヘッダー';
      row.appendChild(newCell);
    });
    this.onContentChange?.();
  }

  addTableRow() {
    const table = this.getTableFromSelected();
    if (table) this.addTableRowToTable(table);
  }

  deleteTableRow() {
    const selected = this.getSelectedElement() as HTMLElement | null;
    if (!selected) return;
    const table = selected.closest('table');
    if (!table) return;
    const row = selected.closest('tr');
    if (!row) return;
    // Don't delete the last row
    const allRows = table.querySelectorAll('tbody tr, tr');
    if (allRows.length <= 1) return;
    row.remove();
    this.selectElement(table);
    this.onContentChange?.();
  }

  addTableColumn() {
    const table = this.getTableFromSelected();
    if (table) this.addTableColumnToTable(table);
  }

  deleteTableColumn() {
    const selected = this.getSelectedElement() as HTMLElement | null;
    if (!selected) return;
    const table = selected.closest('table');
    if (!table) return;
    const cell = selected.closest('td, th');
    if (!cell) return;
    const cellIndex = Array.from(cell.parentElement!.children).indexOf(cell);
    // Don't delete the last column
    const firstRow = table.querySelector('tr');
    if (!firstRow || firstRow.children.length <= 1) return;
    const rows = table.querySelectorAll('tr');
    rows.forEach(row => {
      const cells = row.children;
      if (cells[cellIndex]) cells[cellIndex].remove();
    });
    this.selectElement(table);
    this.onContentChange?.();
  }

  /**
   * Check if the selected element is table-related
   */
  getTableContext(): { isTable: boolean; isCell: boolean } {
    const selected = this.getSelectedElement() as HTMLElement | null;
    if (!selected) return { isTable: false, isCell: false };
    const tag = selected.tagName.toLowerCase();
    const isTable = tag === 'table' || !!selected.closest('table');
    const isCell = tag === 'td' || tag === 'th';
    return { isTable, isCell };
  }

  // --- Image placeholder methods ---

  private openImagePickerForPlaceholder(placeholder: HTMLElement) {
    // Create file input in the PARENT document (not iframe) to avoid sandbox restrictions
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    document.body.appendChild(input);

    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64Url = e.target?.result as string;
          this.replaceImagePlaceholder(placeholder, base64Url, file.name);
        };
        reader.readAsDataURL(file);
      }
      input.remove();
    });

    input.addEventListener('cancel', () => input.remove());
    input.click();
  }

  private replaceImagePlaceholder(placeholder: HTMLElement, src: string, alt: string) {
    const doc = this.getDocument();
    if (!doc) return;

    const imgContainer = doc.createElement('div');
    imgContainer.style.cssText = 'text-align:center;margin:15px 0;';
    const img = doc.createElement('img');
    img.src = src;
    img.alt = alt;
    img.style.cssText = 'max-width:100%;height:auto;border-radius:8px;display:block;margin:0 auto;';
    imgContainer.appendChild(img);

    placeholder.parentNode?.replaceChild(imgContainer, placeholder);
    this.selectElement(imgContainer);
    this.onContentChange?.();
  }
}

export const iframeManager = new IframeManager();
