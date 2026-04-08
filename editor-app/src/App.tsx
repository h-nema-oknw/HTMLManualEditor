import React from 'react';
import { Toolbar } from './components/Toolbar';
import { HtmlPreview } from './components/HtmlPreview';
import { ElementTree } from './components/ElementTree';
import { PropertiesPanel } from './components/PropertiesPanel';
import './App.css';

function App() {
  return (
    <div className="editor-app">
      <Toolbar />
      <div className="editor-main">
        <ElementTree />
        <HtmlPreview />
        <PropertiesPanel />
      </div>
      <footer className="editor-statusbar">
        <span>HTMLManualEditor Ver2</span>
        <span>クリックで選択 | ダブルクリックでテキスト編集 | 選択後ドラッグで並替 | ツールバーからドラッグで配置 | 余白クリックでページ編集</span>
      </footer>
    </div>
  );
}

export default App;
