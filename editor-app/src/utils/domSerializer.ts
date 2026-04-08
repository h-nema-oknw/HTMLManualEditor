/**
 * DOM Serializer - Extracts clean HTML from iframe document
 * Removes editor-injected scripts, styles, and attributes
 */

import { PAGE_SIZES, PageWidth } from '../constants';

const PAGE_WIDTHS: Record<PageWidth, number> = {
  'a4-portrait': PAGE_SIZES['a4-portrait'].width,
  'a4-landscape': PAGE_SIZES['a4-landscape'].width,
};

export interface ExportOptions {
  pageWidth?: 'a4-portrait' | 'a4-landscape';
}

function cleanClone(iframeDoc: Document): HTMLElement {
  // Clone the document to avoid modifying the live DOM
  const clone = iframeDoc.documentElement.cloneNode(true) as HTMLElement;

  // Unwrap table wrappers (editor-table-wrapper) before removing injected elements
  const tableWrappers = clone.querySelectorAll('.editor-table-wrapper');
  tableWrappers.forEach(wrapper => {
    const parent = wrapper.parentNode;
    if (parent) {
      while (wrapper.firstChild) {
        parent.insertBefore(wrapper.firstChild, wrapper);
      }
      wrapper.remove();
    }
  });

  // Remove editor-injected elements
  const editorElements = clone.querySelectorAll(
    '[data-editor-injected], .editor-hover-highlight, .editor-select-outline, .editor-resize-handle'
  );
  editorElements.forEach(el => el.remove());

  // Remove editor-specific attributes from all elements
  const allElements = clone.querySelectorAll('*');
  allElements.forEach(el => {
    el.removeAttribute('data-editor-path');
    el.removeAttribute('data-editor-selected');
    el.removeAttribute('data-editor-hover');
    el.removeAttribute('contenteditable');
    el.classList.remove('editor-drop-inside', 'editor-dragging');
    if (el.classList.length === 0) el.removeAttribute('class');
    // Remove inline styles added by editor
    const style = el.getAttribute('style');
    if (style) {
      let cleaned = style
        .replace(/outline:[^;]*;?/gi, '')
        .replace(/outline-offset:[^;]*;?/gi, '')
        .replace(/cursor:[^;]*;?/gi, '')
        .trim();
      // Remove overflow:hidden that was injected on html/body by the editor
      const tag = el.tagName.toLowerCase();
      if (tag === 'html' || tag === 'body') {
        cleaned = cleaned.replace(/overflow:\s*hidden;?/gi, '').trim();
      }
      if (cleaned) {
        el.setAttribute('style', cleaned);
      } else {
        el.removeAttribute('style');
      }
    }
  });

  // Remove the injected editor style tag
  const editorStyles = clone.querySelectorAll('style[data-editor-style]');
  editorStyles.forEach(el => el.remove());

  // Remove the injected editor script tag
  const editorScripts = clone.querySelectorAll('script[data-editor-script]');
  editorScripts.forEach(el => el.remove());

  // Clean the <html> element itself (querySelectorAll('*') does not include it)
  const htmlStyle = clone.getAttribute('style');
  if (htmlStyle) {
    const cleaned = htmlStyle.replace(/overflow:\s*hidden;?/gi, '').trim();
    if (cleaned) {
      clone.setAttribute('style', cleaned);
    } else {
      clone.removeAttribute('style');
    }
  }

  return clone;
}

export function serializeIframeToHtml(iframeDoc: Document): string {
  const clone = cleanClone(iframeDoc);
  const doctype = '<!DOCTYPE html>';
  return `${doctype}\n${clone.outerHTML}`;
}

/**
 * Serialize iframe for file export.
 * Wraps body content in <div id="html-manual-area"> centered on the page,
 * with the A4 width matching the editor's page layout setting.
 */
export function serializeForExport(iframeDoc: Document, options: ExportOptions): string {
  const clone = cleanClone(iframeDoc);
  const pageMaxWidth = PAGE_WIDTHS[options.pageWidth || 'a4-portrait'];

  const body = clone.querySelector('body');
  const head = clone.querySelector('head');

  if (body) {
    // Collect all body's original inline style properties we need to transfer to wrapper
    const bodyInlineStyle = body.getAttribute('style') || '';

    // Move all body children into wrapper div
    const wrapper = iframeDoc.createElement('div');
    wrapper.id = 'html-manual-area';
    while (body.firstChild) {
      wrapper.appendChild(body.firstChild);
    }
    body.appendChild(wrapper);

    // Transfer body's inline padding/background to wrapper, keep other styles on body
    if (bodyInlineStyle) {
      const paddingMatch = bodyInlineStyle.match(/padding:[^;]+;?/i);
      const bgMatch = bodyInlineStyle.match(/background:[^;]+;?/i);
      const bgColorMatch = bodyInlineStyle.match(/background-color:[^;]+;?/i);

      const wrapperExtraStyles: string[] = [];
      if (paddingMatch) wrapperExtraStyles.push(paddingMatch[0].replace(/;$/, ''));
      if (bgMatch) wrapperExtraStyles.push(bgMatch[0].replace(/;$/, ''));
      if (bgColorMatch) wrapperExtraStyles.push(bgColorMatch[0].replace(/;$/, ''));

      if (wrapperExtraStyles.length > 0) {
        wrapper.setAttribute('style', wrapperExtraStyles.join('; '));
      }

      // Remove transferred properties from body inline style
      let cleanedBodyStyle = bodyInlineStyle
        .replace(/padding:[^;]+;?/gi, '')
        .replace(/background-color:[^;]+;?/gi, '')
        .replace(/background:[^;]+;?/gi, '')
        .trim();
      if (cleanedBodyStyle) {
        body.setAttribute('style', cleanedBodyStyle);
      } else {
        body.removeAttribute('style');
      }
    }
  }

  // Inject export layout CSS at the end of <head>
  if (head) {
    const exportStyle = iframeDoc.createElement('style');
    exportStyle.textContent = `
      /* === Export layout === */
      html { overflow: auto; }
      body {
        margin: 0; padding: 20px;
        background: #f5f5f5;
        overflow: auto;
      }
      #html-manual-area {
        max-width: ${pageMaxWidth}px;
        margin: 0 auto;
        background: #fff;
        padding: 30px 40px;
        min-height: 100vh;
        box-shadow: 0 0 10px rgba(0,0,0,0.1);
      }
      @page { margin: 0; }
      @media print {
        html, body { background: #fff; padding: 0; margin: 0; height: auto; overflow: visible; }
        #html-manual-area { max-width: 100%; box-shadow: none; margin: 0 auto; min-height: auto; }
      }
    `;
    head.appendChild(exportStyle);
  }

  const doctype = '<!DOCTYPE html>';
  return `${doctype}\n${clone.outerHTML}`;
}

/**
 * Detect and unwrap the export wrapper <div id="html-manual-area"> on import.
 * If present, moves its children back to body and removes the export CSS block.
 * If not present, returns the HTML unchanged.
 */
export function unwrapPageAreaIfPresent(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const wrapper = doc.body.querySelector(':scope > #html-manual-area');
  if (!wrapper) return html;

  // Transfer wrapper's inline style (padding/background) back to body
  const wrapperStyle = wrapper.getAttribute('style');
  if (wrapperStyle) {
    const bodyStyle = doc.body.getAttribute('style') || '';
    doc.body.setAttribute('style', (bodyStyle ? bodyStyle + '; ' : '') + wrapperStyle);
  }

  // Unwrap: move all children to body
  while (wrapper.firstChild) {
    doc.body.insertBefore(wrapper.firstChild, wrapper);
  }
  wrapper.remove();

  // Remove the export layout CSS block
  doc.querySelectorAll('style').forEach(s => {
    if (s.textContent?.includes('/* === Export layout === */')) s.remove();
  });

  return '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
}

/**
 * Generates a unique CSS path for an element within a document
 */
export function generateElementPath(element: Element, root: Element): string {
  const path: string[] = [];
  let current: Element | null = element;

  while (current && current !== root && current !== root.ownerDocument?.documentElement) {
    let selector = current.tagName.toLowerCase();

    if (current.id) {
      selector += `#${current.id}`;
      path.unshift(selector);
      break;
    }

    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        c => c.tagName === current!.tagName
      );
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-of-type(${index})`;
      }
    }

    path.unshift(selector);
    current = current.parentElement;
  }

  return path.join(' > ');
}

/**
 * Build a tree structure of the DOM for the element tree panel
 */
export function buildElementTree(element: Element, root: Element, maxDepth: number = 15, currentDepth: number = 0): any {
  if (currentDepth > maxDepth) return null;

  const tagName = element.tagName.toLowerCase();
  
  // Skip script, style, and editor-injected elements
  if (['script', 'style', 'link', 'meta'].includes(tagName)) return null;
  if (element.hasAttribute('data-editor-injected')) return null;

  const path = generateElementPath(element, root);
  const children: any[] = [];

  Array.from(element.children).forEach(child => {
    const childTree = buildElementTree(child, root, maxDepth, currentDepth + 1);
    if (childTree) children.push(childTree);
  });

  // Check if element has direct text content
  const hasText = Array.from(element.childNodes).some(
    n => n.nodeType === Node.TEXT_NODE && (n.textContent?.trim() || '').length > 0
  );

  // Extract text preview from first text node
  const firstTextNode = Array.from(element.childNodes).find(
    n => n.nodeType === Node.TEXT_NODE && (n.textContent?.trim() || '').length > 0
  );
  const textPreview = firstTextNode?.textContent?.trim().slice(0, 20) || '';

  return {
    tagName,
    id: element.id || '',
    className: element.className?.toString() || '',
    path,
    children,
    hasText,
    textPreview,
    isExpanded: currentDepth < 3,
  };
}
