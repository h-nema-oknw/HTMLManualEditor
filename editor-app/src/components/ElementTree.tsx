import React, { useEffect, useState, useCallback, useRef } from 'react';
import { ChevronRight, ChevronDown, ChevronLeft, Layers, RefreshCw } from 'lucide-react';
import { useEditorStore } from '../store';
import { iframeManager } from '../utils/iframeManager';
import { buildElementTree } from '../utils/domSerializer';
import { TREE_REBUILD_DEBOUNCE_MS } from '../constants';

interface TreeNode {
  tagName: string;
  id: string;
  className: string;
  path: string;
  children: TreeNode[];
  hasText: boolean;
  textPreview: string;
  isExpanded?: boolean;
}

const TreeItem: React.FC<{
  node: TreeNode;
  depth: number;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  expandedPaths: Set<string>;
  toggleExpand: (path: string) => void;
}> = ({ node, depth, selectedPath, onSelect, expandedPaths, toggleExpand }) => {
  const isSelected = selectedPath === node.path;
  const isExpanded = expandedPaths.has(node.path);
  const hasChildren = node.children.length > 0;

  const tagColors: Record<string, string> = {
    div: '#a78bfa',
    section: '#a78bfa',
    article: '#a78bfa',
    nav: '#a78bfa',
    header: '#a78bfa',
    footer: '#a78bfa',
    main: '#a78bfa',
    aside: '#a78bfa',
    h1: '#f97316',
    h2: '#f97316',
    h3: '#f97316',
    h4: '#f97316',
    h5: '#f97316',
    h6: '#f97316',
    p: '#22c55e',
    span: '#22c55e',
    a: '#3b82f6',
    img: '#ec4899',
    table: '#14b8a6',
    tr: '#14b8a6',
    td: '#14b8a6',
    th: '#14b8a6',
    thead: '#14b8a6',
    tbody: '#14b8a6',
    ul: '#eab308',
    ol: '#eab308',
    li: '#eab308',
    form: '#8b5cf6',
    input: '#8b5cf6',
    button: '#8b5cf6',
    select: '#8b5cf6',
    textarea: '#8b5cf6',
  };

  const tagColor = tagColors[node.tagName] || '#94a3b8';

  // Build label
  let label = node.tagName;
  if (node.id) label += `#${node.id}`;
  if (node.className) {
    const classes = node.className.split(' ').filter(c => c && !c.startsWith('editor-')).slice(0, 2);
    if (classes.length > 0) label += `.${classes.join('.')}`;
  }

  return (
    <>
      <div
        className={`tree-item ${isSelected ? 'tree-item-selected' : ''}`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        data-tree-path={node.path}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(node.path);
        }}
      >
        <span
          className="tree-expand-btn"
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) toggleExpand(node.path);
          }}
          style={{ visibility: hasChildren ? 'visible' : 'hidden' }}
        >
          {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </span>
        <span className="tree-tag" style={{ color: tagColor }}>
          &lt;{label}&gt;
        </span>
        {node.textPreview && (
          <span className="tree-text-preview" title={node.textPreview}>
            {node.textPreview}{node.textPreview.length >= 20 ? '…' : ''}
          </span>
        )}
      </div>
      {isExpanded && node.children.map((child, i) => (
        <TreeItem
          key={`${child.path}-${i}`}
          node={child}
          depth={depth + 1}
          selectedPath={selectedPath}
          onSelect={onSelect}
          expandedPaths={expandedPaths}
          toggleExpand={toggleExpand}
        />
      ))}
    </>
  );
};

export const ElementTree: React.FC = () => {
  const { selectedElementPath, htmlContent, updateTrigger } = useEditorStore();
  const [tree, setTree] = useState<TreeNode | null>(null);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState(false);
  const buildTimeoutRef = useRef<number | null>(null);

  const buildTree = useCallback(() => {
    const body = iframeManager.getBody();
    if (!body) return;

    const treeData = buildElementTree(body, body);
    if (treeData) {
      setTree(treeData);
      // Auto-expand root-level items
      const paths = new Set<string>();
      const collectPaths = (node: TreeNode, depth: number) => {
        if (depth < 3) {
          paths.add(node.path);
          node.children.forEach(child => collectPaths(child, depth + 1));
        }
      };
      collectPaths(treeData, 0);
      setExpandedPaths(prev => new Set([...Array.from(prev), ...Array.from(paths)]));
    }
  }, []);

  // rebuild tree when HTML content changes
  useEffect(() => {
    if (buildTimeoutRef.current) {
      window.clearTimeout(buildTimeoutRef.current);
    }
    buildTimeoutRef.current = window.setTimeout(() => {
      buildTree();
    }, TREE_REBUILD_DEBOUNCE_MS);

    return () => {
      if (buildTimeoutRef.current) {
        window.clearTimeout(buildTimeoutRef.current);
      }
    };
  }, [htmlContent, updateTrigger, buildTree]);

  // Auto-expand ancestors when an element is selected
  useEffect(() => {
    if (!selectedElementPath) return;

    const parts = selectedElementPath.split(' > ');
    const ancestorPaths: string[] = [];
    for (let i = 1; i < parts.length; i++) {
      ancestorPaths.push(parts.slice(0, i).join(' > '));
    }
    setExpandedPaths(prev => {
      const next = new Set(prev);
      ancestorPaths.forEach(p => next.add(p));
      return next;
    });

    // Scroll selected element into view
    setTimeout(() => {
      const el = document.querySelector('.tree-item-selected');
      el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, 50);
  }, [selectedElementPath]);

  const handleSelect = useCallback((path: string) => {
    iframeManager.selectByPath(path);
  }, []);

  const toggleExpand = useCallback((path: string) => {
    setExpandedPaths(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  return (
    <div className={`element-tree-panel ${collapsed ? 'element-tree-collapsed' : ''}`}>
      <div
        className="panel-header"
        onClick={collapsed ? () => setCollapsed(false) : undefined}
        style={collapsed ? { cursor: 'pointer' } : undefined}
      >
        {collapsed ? (
          <>
            <ChevronRight size={14} />
            <Layers size={14} />
          </>
        ) : (
          <>
            <Layers size={14} />
            <span>要素ツリー</span>
            <button
              className="panel-header-btn"
              onClick={buildTree}
              title="ツリーを更新"
            >
              <RefreshCw size={12} />
            </button>
            <button
              className="panel-header-btn"
              onClick={() => setCollapsed(true)}
              title="パネルを折りたたむ"
            >
              <ChevronLeft size={12} />
            </button>
          </>
        )}
      </div>
      {!collapsed && (
        <div className="element-tree-content">
          {tree ? (
            <TreeItem
              node={tree}
              depth={0}
              selectedPath={selectedElementPath}
              onSelect={handleSelect}
              expandedPaths={expandedPaths}
              toggleExpand={toggleExpand}
            />
          ) : (
            <div className="tree-empty">
              HTMLを読み込んでください
            </div>
          )}
        </div>
      )}
    </div>
  );
};
