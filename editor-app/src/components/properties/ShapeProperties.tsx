import React, { useEffect, useState, useCallback } from 'react';
import { Palette, RotateCw, Layout } from 'lucide-react';
import { iframeManager } from '../../utils/iframeManager';
import { ColorInputField } from '../ColorInputField';

interface ShapePropertiesProps {
  selectedElementPath: string;
}

export const ShapeProperties: React.FC<ShapePropertiesProps> = ({ selectedElementPath }) => {
  const [shapeStyles, setShapeStyles] = useState({
    fill: '#3b82f6',
    stroke: '#1e40af',
    strokeWidth: '3',
    rotation: '0',
    top: '',
    left: '',
    width: '',
    height: '',
  });

  const refreshShapeStyles = useCallback(() => {
    const fill = iframeManager.getShapeSvgAttribute('fill') || '#3b82f6';
    const stroke = iframeManager.getShapeSvgAttribute('stroke') || '#1e40af';
    const strokeWidth = iframeManager.getShapeSvgAttribute('stroke-width') || '3';
    const transform = iframeManager.getSelectedInlineStyle('transform') || '';
    const rotateMatch = transform.match(/rotate\((\d+)deg\)/);
    const rotation = rotateMatch ? rotateMatch[1] : '0';
    const top = iframeManager.getSelectedInlineStyle('top') || '';
    const left = iframeManager.getSelectedInlineStyle('left') || '';
    const width = iframeManager.getSelectedInlineStyle('width') || '';
    const height = iframeManager.getSelectedInlineStyle('height') || '';
    setShapeStyles({ fill, stroke, strokeWidth, rotation, top, left, width, height });
  }, [selectedElementPath]);

  useEffect(() => {
    refreshShapeStyles();
  }, [selectedElementPath, refreshShapeStyles]);

  return (
    <div className="properties-content">
      <div className="prop-section">
        <h4 className="prop-section-title">
          <Palette size={12} /> 図形スタイル
        </h4>
        <div className="prop-field">
          <label>塗り色</label>
          <ColorInputField value={shapeStyles.fill} onChange={v => { iframeManager.setShapeFill(v); setShapeStyles(prev => ({ ...prev, fill: v })); }} />
        </div>
        <div className="prop-field">
          <label>線の色</label>
          <ColorInputField value={shapeStyles.stroke} onChange={v => { iframeManager.setShapeStroke(v); setShapeStyles(prev => ({ ...prev, stroke: v })); }} />
        </div>
        <div className="prop-field">
          <label>線の太さ</label>
          <input type="text" value={shapeStyles.strokeWidth} onChange={e => { iframeManager.setShapeStrokeWidth(e.target.value); setShapeStyles(prev => ({ ...prev, strokeWidth: e.target.value })); }} placeholder="3" />
        </div>
      </div>

      <div className="prop-section">
        <h4 className="prop-section-title">
          <RotateCw size={12} /> 向き・回転
        </h4>
        <div className="prop-field">
          <label>回転 {shapeStyles.rotation}°</label>
          <input type="range" min="0" max="359" step="1" value={shapeStyles.rotation} onChange={e => {
            const deg = e.target.value;
            const transformVal = deg === '0' ? '' : `rotate(${deg}deg)`;
            iframeManager.applyStyle('transform', transformVal);
            setShapeStyles(prev => ({ ...prev, rotation: deg }));
          }} />
        </div>
      </div>

      <div className="prop-section">
        <h4 className="prop-section-title">
          <Layout size={12} /> 位置・サイズ
        </h4>
        <div className="prop-grid">
          <div className="prop-field">
            <label>上 (top)</label>
            <input type="text" value={shapeStyles.top} onChange={e => { iframeManager.applyStyle('top', e.target.value); setShapeStyles(prev => ({ ...prev, top: e.target.value })); }} placeholder="50px" />
          </div>
          <div className="prop-field">
            <label>左 (left)</label>
            <input type="text" value={shapeStyles.left} onChange={e => { iframeManager.applyStyle('left', e.target.value); setShapeStyles(prev => ({ ...prev, left: e.target.value })); }} placeholder="50px" />
          </div>
        </div>
        <div className="prop-grid">
          <div className="prop-field">
            <label>幅</label>
            <input type="text" value={shapeStyles.width} onChange={e => { iframeManager.applyStyle('width', e.target.value); setShapeStyles(prev => ({ ...prev, width: e.target.value })); }} placeholder="60px" />
          </div>
          <div className="prop-field">
            <label>高さ</label>
            <input type="text" value={shapeStyles.height} onChange={e => { iframeManager.applyStyle('height', e.target.value); setShapeStyles(prev => ({ ...prev, height: e.target.value })); }} placeholder="60px" />
          </div>
        </div>
      </div>
    </div>
  );
};
