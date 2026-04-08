import React, { useEffect, useState, useCallback } from 'react';
import { Palette, Layout } from 'lucide-react';
import { iframeManager } from '../../utils/iframeManager';
import { ColorInputField } from '../ColorInputField';
import { FONT_OPTIONS } from './shared';

export const BodyProperties: React.FC = () => {
  const [bodyStyles, setBodyStyles] = useState({
    backgroundColor: '',
    color: '',
    fontFamily: '',
    fontSize: '',
    lineHeight: '',
    paddingTop: '',
    paddingRight: '',
    paddingBottom: '',
    paddingLeft: '',
    marginTop: '',
    marginRight: '',
    marginBottom: '',
    marginLeft: '',
  });

  const refreshBodyStyles = useCallback(() => {
    const camelToKebab = (str: string) => str.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`);
    const props = ['backgroundColor', 'color', 'fontFamily', 'fontSize', 'lineHeight',
      'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
      'marginTop', 'marginRight', 'marginBottom', 'marginLeft'] as const;
    const newState: Record<string, string> = {};
    props.forEach(p => {
      newState[p] = iframeManager.getBodyStyle(camelToKebab(p));
    });
    setBodyStyles(newState as typeof bodyStyles);
  }, []);

  useEffect(() => {
    refreshBodyStyles();
  }, [refreshBodyStyles]);

  const applyBodyStyle = (property: string, value: string) => {
    iframeManager.applyBodyStyle(property, value);
    setBodyStyles(prev => ({ ...prev, [property]: value }));
  };

  return (
    <div className="properties-content">
      <div className="prop-section">
        <h4 className="prop-section-title">
          <Palette size={12} /> ページ背景・テキスト
        </h4>
        <div className="prop-field">
          <label>背景色</label>
          <ColorInputField value={bodyStyles.backgroundColor} onChange={v => applyBodyStyle('backgroundColor', v)} />
        </div>
        <div className="prop-field">
          <label>文字色</label>
          <ColorInputField value={bodyStyles.color} onChange={v => applyBodyStyle('color', v)} />
        </div>
        <div className="prop-grid">
          <div className="prop-field">
            <label>フォントサイズ</label>
            <input type="text" value={bodyStyles.fontSize} onChange={e => applyBodyStyle('fontSize', e.target.value)} placeholder="15px" />
          </div>
          <div className="prop-field">
            <label>行間</label>
            <input type="text" value={bodyStyles.lineHeight} onChange={e => applyBodyStyle('lineHeight', e.target.value)} placeholder="1.7" />
          </div>
        </div>
        <div className="prop-field">
          <label>フォント</label>
          <select value={bodyStyles.fontFamily.split(',')[0]?.trim().replace(/['"]/g, '') || ''} onChange={e => applyBodyStyle('fontFamily', e.target.value)}>
            {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>
      </div>

      <div className="prop-section">
        <h4 className="prop-section-title">
          <Layout size={12} /> ページ余白
        </h4>
        <label className="prop-sublabel">パディング (上/右/下/左)</label>
        <div className="prop-grid-4">
          <input type="text" value={bodyStyles.paddingTop} onChange={e => applyBodyStyle('paddingTop', e.target.value)} placeholder="30px" />
          <input type="text" value={bodyStyles.paddingRight} onChange={e => applyBodyStyle('paddingRight', e.target.value)} placeholder="40px" />
          <input type="text" value={bodyStyles.paddingBottom} onChange={e => applyBodyStyle('paddingBottom', e.target.value)} placeholder="30px" />
          <input type="text" value={bodyStyles.paddingLeft} onChange={e => applyBodyStyle('paddingLeft', e.target.value)} placeholder="40px" />
        </div>
        <label className="prop-sublabel">マージン (上/右/下/左)</label>
        <div className="prop-grid-4">
          <input type="text" value={bodyStyles.marginTop} onChange={e => applyBodyStyle('marginTop', e.target.value)} placeholder="0" />
          <input type="text" value={bodyStyles.marginRight} onChange={e => applyBodyStyle('marginRight', e.target.value)} placeholder="0" />
          <input type="text" value={bodyStyles.marginBottom} onChange={e => applyBodyStyle('marginBottom', e.target.value)} placeholder="0" />
          <input type="text" value={bodyStyles.marginLeft} onChange={e => applyBodyStyle('marginLeft', e.target.value)} placeholder="0" />
        </div>
      </div>
    </div>
  );
};
