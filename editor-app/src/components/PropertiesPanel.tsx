import React, { useState } from 'react';
import { Settings, Shapes, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEditorStore } from '../store';
import { iframeManager } from '../utils/iframeManager';
import { BodyProperties } from './properties/BodyProperties';
import { ShapeProperties } from './properties/ShapeProperties';
import { ElementProperties } from './properties/ElementProperties';

export const PropertiesPanel: React.FC = () => {
  const { selectedElementPath, selectedElementTag } = useEditorStore();
  const [collapsed, setCollapsed] = useState(false);

  const isBodySelected = selectedElementPath === 'body';
  const isShape = iframeManager.isSelectedShape();

  if (collapsed) {
    return (
      <div className="properties-panel properties-panel-collapsed">
        <div
          className="panel-header"
          onClick={() => setCollapsed(false)}
          style={{ cursor: 'pointer' }}
        >
          <ChevronLeft size={14} />
          <Settings size={14} />
        </div>
      </div>
    );
  }

  const panelHeaderBtn = (
    <button
      className="panel-header-btn"
      onClick={() => setCollapsed(true)}
      title="パネルを折りたたむ"
    >
      <ChevronRight size={12} />
    </button>
  );

  // Body (ページ全体) 選択時
  if (isBodySelected) {
    return (
      <div className="properties-panel">
        <div className="panel-header">
          <Settings size={14} />
          <span>プロパティ</span>
          <span className="selected-tag">&lt;ページ全体&gt;</span>
          {panelHeaderBtn}
        </div>
        <BodyProperties />
      </div>
    );
  }

  // 図形選択時
  if (isShape && selectedElementPath) {
    const shapeType = iframeManager.getSelectedAttribute('data-editor-shape');
    const shapeLabel = { circle: '丸', triangle: '三角', rect: '四角', arrow: '矢印', number: '番号' }[shapeType] || '図形';
    return (
      <div className="properties-panel">
        <div className="panel-header">
          <Settings size={14} />
          <span>プロパティ</span>
          <span className="selected-tag"><Shapes size={12} /> {shapeLabel}</span>
          {panelHeaderBtn}
        </div>
        <ShapeProperties selectedElementPath={selectedElementPath} />
      </div>
    );
  }

  // 未選択時
  if (!selectedElementPath) {
    return (
      <div className="properties-panel">
        <div className="panel-header">
          <Settings size={14} />
          <span>プロパティ</span>
          {panelHeaderBtn}
        </div>
        <div className="properties-empty">
          <p>要素を選択してください</p>
          <p className="hint">HTMLプレビュー内の要素をクリックすると、ここでスタイルや属性を編集できます。</p>
          <p className="hint" style={{ marginTop: '8px' }}>プレビュー内の余白部分をクリックすると、ページ全体のスタイルを編集できます。</p>
        </div>
      </div>
    );
  }

  // 通常の要素選択時
  return (
    <div className="properties-panel">
      <div className="panel-header">
        <Settings size={14} />
        <span>プロパティ</span>
        <span className="selected-tag">&lt;{selectedElementTag}&gt;</span>
        {panelHeaderBtn}
      </div>
      <ElementProperties
        selectedElementPath={selectedElementPath}
        selectedElementTag={selectedElementTag || ''}
      />
    </div>
  );
};
