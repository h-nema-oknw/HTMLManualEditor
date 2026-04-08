import React, { useEffect, useState, useCallback } from 'react';
import { Palette, Type, Layout, Square, Image, Link as LinkIcon, Tag } from 'lucide-react';
import { iframeManager } from '../../utils/iframeManager';
import { ColorInputField } from '../ColorInputField';
import { FONT_OPTIONS } from './shared';

interface StyleState {
  // Layout
  width: string;
  height: string;
  marginTop: string;
  marginRight: string;
  marginBottom: string;
  marginLeft: string;
  paddingTop: string;
  paddingRight: string;
  paddingBottom: string;
  paddingLeft: string;
  display: string;
  position: string;
  // Flex properties
  flexDirection: string;
  justifyContent: string;
  alignItems: string;
  gap: string;
  flex: string;
  // Typography
  fontSize: string;
  fontWeight: string;
  fontFamily: string;
  color: string;
  textAlign: string;
  lineHeight: string;
  letterSpacing: string;
  textDecoration: string;
  // Background & Border
  backgroundColor: string;
  borderWidth: string;
  borderColor: string;
  borderStyle: string;
  borderRadius: string;
  // Attributes
  id: string;
  className: string;
  src: string;
  href: string;
  alt: string;
}

const defaultStyleState: StyleState = {
  width: '', height: '',
  marginTop: '', marginRight: '', marginBottom: '', marginLeft: '',
  paddingTop: '', paddingRight: '', paddingBottom: '', paddingLeft: '',
  display: '', position: '',
  flexDirection: '', justifyContent: '', alignItems: '', gap: '', flex: '',
  fontSize: '', fontWeight: '', fontFamily: '', color: '', textAlign: '', lineHeight: '', letterSpacing: '', textDecoration: '',
  backgroundColor: '', borderWidth: '', borderColor: '', borderStyle: '', borderRadius: '',
  id: '', className: '', src: '', href: '', alt: '',
};

interface ElementPropertiesProps {
  selectedElementPath: string;
  selectedElementTag: string;
}

export const ElementProperties: React.FC<ElementPropertiesProps> = ({ selectedElementPath, selectedElementTag }) => {
  const [styles, setStyles] = useState<StyleState>(defaultStyleState);
  const [activeTab] = useState<'style'>('style');

  const refreshStyles = useCallback(() => {
    if (!selectedElementPath) {
      setStyles(defaultStyleState);
      return;
    }

    const newStyles: StyleState = { ...defaultStyleState };

    const computedProps = [
      'width', 'height',
      'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
      'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
      'display', 'position',
      'flexDirection', 'justifyContent', 'alignItems', 'gap', 'flex',
      'fontSize', 'fontWeight', 'fontFamily', 'color', 'textAlign',
      'lineHeight', 'letterSpacing', 'textDecoration',
      'backgroundColor', 'borderWidth', 'borderColor', 'borderStyle', 'borderRadius',
    ] as const;

    const camelToKebab = (str: string) => str.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`);

    computedProps.forEach(prop => {
      const value = iframeManager.getSelectedStyle(camelToKebab(prop));
      ((newStyles as unknown) as Record<string, string>)[prop] = value || '';
    });

    newStyles.id = iframeManager.getSelectedAttribute('id');
    newStyles.className = iframeManager.getSelectedAttribute('class');
    newStyles.src = iframeManager.getSelectedAttribute('src');
    newStyles.href = iframeManager.getSelectedAttribute('href');
    newStyles.alt = iframeManager.getSelectedAttribute('alt');

    setStyles(newStyles);
  }, [selectedElementPath]);

  useEffect(() => {
    refreshStyles();
  }, [selectedElementPath, refreshStyles]);

  const applyStyle = (property: string, value: string) => {
    iframeManager.applyStyle(property, value);
    setStyles(prev => ({ ...prev, [property]: value }));
  };

  const setAttribute = (attr: string, value: string) => {
    iframeManager.setSelectedAttribute(attr, value);
    setStyles(prev => ({ ...prev, [attr]: value }));
  };

  return (
    <>
      {/* Tab switcher */}
      <div className="prop-tabs">
        <button className={`prop-tab ${activeTab === 'style' ? 'active' : ''}`}>
          <Palette size={12} /> スタイル
        </button>
      </div>

      <div className="properties-content">
        {/* Layout */}
        <div className="prop-section">
          <h4 className="prop-section-title">
            <Layout size={12} /> レイアウト
          </h4>
          <div className="prop-grid">
            <div className="prop-field">
              <label>幅</label>
              <input type="text" value={styles.width} onChange={e => applyStyle('width', e.target.value)} placeholder="auto" />
            </div>
            <div className="prop-field">
              <label>高さ</label>
              <input type="text" value={styles.height} onChange={e => applyStyle('height', e.target.value)} placeholder="auto" />
            </div>
          </div>

          <label className="prop-sublabel">マージン (上/右/下/左)</label>
          <div className="prop-grid-4">
            <input type="text" value={styles.marginTop} onChange={e => applyStyle('marginTop', e.target.value)} placeholder="0" />
            <input type="text" value={styles.marginRight} onChange={e => applyStyle('marginRight', e.target.value)} placeholder="0" />
            <input type="text" value={styles.marginBottom} onChange={e => applyStyle('marginBottom', e.target.value)} placeholder="0" />
            <input type="text" value={styles.marginLeft} onChange={e => applyStyle('marginLeft', e.target.value)} placeholder="0" />
          </div>

          <label className="prop-sublabel">パディング (上/右/下/左)</label>
          <div className="prop-grid-4">
            <input type="text" value={styles.paddingTop} onChange={e => applyStyle('paddingTop', e.target.value)} placeholder="0" />
            <input type="text" value={styles.paddingRight} onChange={e => applyStyle('paddingRight', e.target.value)} placeholder="0" />
            <input type="text" value={styles.paddingBottom} onChange={e => applyStyle('paddingBottom', e.target.value)} placeholder="0" />
            <input type="text" value={styles.paddingLeft} onChange={e => applyStyle('paddingLeft', e.target.value)} placeholder="0" />
          </div>

          {/* Flex properties - shown when display is flex */}
          {styles.display === 'flex' && (
            <>
              <label className="prop-sublabel">Flex コンテナ設定</label>
              <div className="prop-grid">
                <div className="prop-field">
                  <label>方向</label>
                  <select value={styles.flexDirection} onChange={e => applyStyle('flexDirection', e.target.value)}>
                    <option value="row">横 (row)</option>
                    <option value="column">縦 (column)</option>
                    <option value="row-reverse">横逆 (row-reverse)</option>
                    <option value="column-reverse">縦逆 (column-reverse)</option>
                  </select>
                </div>
                <div className="prop-field">
                  <label>間隔 (gap)</label>
                  <input type="text" value={styles.gap} onChange={e => applyStyle('gap', e.target.value)} placeholder="20px" />
                </div>
              </div>
              <div className="prop-grid">
                <div className="prop-field">
                  <label>主軸揃え</label>
                  <select value={styles.justifyContent} onChange={e => applyStyle('justifyContent', e.target.value)}>
                    <option value="flex-start">先頭</option>
                    <option value="center">中央</option>
                    <option value="flex-end">末尾</option>
                    <option value="space-between">均等(両端)</option>
                    <option value="space-around">均等(余白)</option>
                    <option value="space-evenly">均等</option>
                  </select>
                </div>
                <div className="prop-field">
                  <label>交差軸揃え</label>
                  <select value={styles.alignItems} onChange={e => applyStyle('alignItems', e.target.value)}>
                    <option value="stretch">伸縮</option>
                    <option value="flex-start">先頭</option>
                    <option value="center">中央</option>
                    <option value="flex-end">末尾</option>
                    <option value="baseline">ベースライン</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {/* Flex item property */}
          <div className="prop-field">
            <label>Flex (子要素比率)</label>
            <input type="text" value={styles.flex} onChange={e => applyStyle('flex', e.target.value)} placeholder="例: 1, 2, none" />
          </div>
        </div>

        {/* Typography */}
        <div className="prop-section">
          <h4 className="prop-section-title">
            <Type size={12} /> テキスト
          </h4>
          <div className="prop-grid">
            <div className="prop-field">
              <label>フォントサイズ</label>
              <input type="text" value={styles.fontSize} onChange={e => applyStyle('fontSize', e.target.value)} placeholder="16px" />
            </div>
            <div className="prop-field">
              <label>太さ</label>
              <select value={styles.fontWeight} onChange={e => applyStyle('fontWeight', e.target.value)}>
                <option value="normal">normal</option>
                <option value="bold">bold</option>
                <option value="100">100</option>
                <option value="200">200</option>
                <option value="300">300</option>
                <option value="400">400</option>
                <option value="500">500</option>
                <option value="600">600</option>
                <option value="700">700</option>
                <option value="800">800</option>
                <option value="900">900</option>
              </select>
            </div>
          </div>

          <div className="prop-grid">
            <div className="prop-field">
              <label>文字色</label>
              <ColorInputField value={styles.color} onChange={v => applyStyle('color', v)} />
            </div>
            <div className="prop-field">
              <label>揃え</label>
              <select value={styles.textAlign} onChange={e => applyStyle('textAlign', e.target.value)}>
                <option value="left">左</option>
                <option value="center">中央</option>
                <option value="right">右</option>
                <option value="justify">両端</option>
              </select>
            </div>
          </div>

          <div className="prop-grid">
            <div className="prop-field">
              <label>行間</label>
              <input type="text" value={styles.lineHeight} onChange={e => applyStyle('lineHeight', e.target.value)} placeholder="1.5" />
            </div>
            <div className="prop-field">
              <label>字間</label>
              <input type="text" value={styles.letterSpacing} onChange={e => applyStyle('letterSpacing', e.target.value)} placeholder="normal" />
            </div>
          </div>

          <div className="prop-field">
            <label>フォント</label>
            <select value={styles.fontFamily.split(',')[0]?.trim().replace(/['"]/g, '') || ''} onChange={e => applyStyle('fontFamily', e.target.value)}>
              {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
        </div>

        {/* Background & Border */}
        <div className="prop-section">
          <h4 className="prop-section-title">
            <Square size={12} /> 背景・ボーダー
          </h4>

          <div className="prop-field">
            <label>背景色</label>
            <ColorInputField value={styles.backgroundColor} onChange={v => applyStyle('backgroundColor', v)} />
          </div>

          <div className="prop-grid">
            <div className="prop-field">
              <label>ボーダー幅</label>
              <input type="text" value={styles.borderWidth} onChange={e => applyStyle('borderWidth', e.target.value)} placeholder="0px" />
            </div>
            <div className="prop-field">
              <label>ボーダー色</label>
              <ColorInputField value={styles.borderColor} onChange={v => applyStyle('borderColor', v)} showTextInput={false} />
            </div>
          </div>

          <div className="prop-grid">
            <div className="prop-field">
              <label>ボーダー形</label>
              <select value={styles.borderStyle} onChange={e => applyStyle('borderStyle', e.target.value)}>
                <option value="none">なし</option>
                <option value="solid">実線</option>
                <option value="dashed">破線</option>
                <option value="dotted">点線</option>
                <option value="double">二重線</option>
              </select>
            </div>
            <div className="prop-field">
              <label>角丸</label>
              <input type="text" value={styles.borderRadius} onChange={e => applyStyle('borderRadius', e.target.value)} placeholder="0px" />
            </div>
          </div>
        </div>

        {/* HTML Attributes */}
        <div className="prop-section">
          <h4 className="prop-section-title">
            <Tag size={12} /> HTML属性
          </h4>

          {(selectedElementTag === 'img') && (
            <>
              <div className="prop-field">
                <label>
                  <Image size={12} /> 画像URL (src)
                </label>
                <input type="text" value={styles.src} onChange={e => setAttribute('src', e.target.value)} placeholder="https://example.com/image.png" />
              </div>
              <div className="prop-field">
                <label>代替テキスト (alt)</label>
                <input type="text" value={styles.alt} onChange={e => setAttribute('alt', e.target.value)} placeholder="画像の説明" />
              </div>
            </>
          )}

          {(selectedElementTag === 'a') && (
            <div className="prop-field">
              <label>
                <LinkIcon size={12} /> リンクURL (href)
              </label>
              <input type="text" value={styles.href} onChange={e => setAttribute('href', e.target.value)} placeholder="https://example.com" />
            </div>
          )}
        </div>

        {/* Table operations */}
        {(['table', 'td', 'th', 'tr', 'thead', 'tbody'].includes(selectedElementTag || '')) && (
          <div className="prop-section">
            <h4 className="prop-section-title">
              <Layout size={12} /> テーブル操作
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
              <button className="toolbar-btn" style={{ padding: '6px 8px', fontSize: '11px', width: '100%', justifyContent: 'center' }} onClick={() => iframeManager.addTableRow()} title="テーブルの末尾に行を追加">
                + 行追加
              </button>
              <button className="toolbar-btn" style={{ padding: '6px 8px', fontSize: '11px', width: '100%', justifyContent: 'center' }} onClick={() => iframeManager.deleteTableRow()} title="選択中のセルの行を削除">
                − 行削除
              </button>
              <button className="toolbar-btn" style={{ padding: '6px 8px', fontSize: '11px', width: '100%', justifyContent: 'center' }} onClick={() => iframeManager.addTableColumn()} title="テーブルの末尾に列を追加">
                + 列追加
              </button>
              <button className="toolbar-btn" style={{ padding: '6px 8px', fontSize: '11px', width: '100%', justifyContent: 'center' }} onClick={() => iframeManager.deleteTableColumn()} title="選択中のセルの列を削除">
                − 列削除
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
