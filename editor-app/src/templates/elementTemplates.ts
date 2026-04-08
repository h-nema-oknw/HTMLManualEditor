/**
 * 挿入可能な要素のHTMLテンプレート
 */

// テキスト要素
export const HTML_H1 = '<h1>見出し1</h1>';
export const HTML_H2 = '<h2>見出し2</h2>';
export const HTML_H3 = '<h3>見出し3</h3>';
export const HTML_P = '<p>テキストを入力してください。</p>';

// テーブル
export const HTML_TABLE = '<table style="width:100%;border-collapse:collapse;margin:15px 0;"><thead><tr><th style="border:1px solid #ddd;padding:8px 12px;background:#f0f0f0;">ヘッダー1</th><th style="border:1px solid #ddd;padding:8px 12px;background:#f0f0f0;">ヘッダー2</th><th style="border:1px solid #ddd;padding:8px 12px;background:#f0f0f0;">ヘッダー3</th></tr></thead><tbody><tr><td style="border:1px solid #ddd;padding:8px 12px;">データ1</td><td style="border:1px solid #ddd;padding:8px 12px;">データ2</td><td style="border:1px solid #ddd;padding:8px 12px;">データ3</td></tr><tr><td style="border:1px solid #ddd;padding:8px 12px;">データ4</td><td style="border:1px solid #ddd;padding:8px 12px;">データ5</td><td style="border:1px solid #ddd;padding:8px 12px;">データ6</td></tr></tbody></table>';

// ブロック要素
export const HTML_BLOCK = '<div style="padding:15px;margin:15px 0;background:#e3f2fd;border-left:4px solid #2196F3;border-radius:0 4px 4px 0;">ここにコンテンツを追加</div>';
export const HTML_LINK = '<a href="#" style="color:#3B5998;">リンクテキスト</a>';
export const HTML_HR = '<hr style="border:none;border-top:2px solid #ddd;margin:20px 0;" />';
export const HTML_IMAGE_PLACEHOLDER = '<div data-image-placeholder="true" style="text-align:center;margin:15px 0;padding:30px 15px;background:#f0f4ff;border:2px dashed #93b4f6;border-radius:8px;cursor:pointer;color:#5b7fc7;font-size:14px;min-height:80px;display:flex;align-items:center;justify-content:center;gap:8px;">&#128247; クリックして画像を選択</div>';

// カラムレイアウト
export const HTML_COL2 = '<div style="display:flex;gap:20px;margin:15px 0;"><div style="flex:1;padding:15px;background:#f8f9fa;border:1px solid #e0e0e0;border-radius:4px;min-height:60px;">左カラム</div><div style="flex:1;padding:15px;background:#f8f9fa;border:1px solid #e0e0e0;border-radius:4px;min-height:60px;">右カラム</div></div>';
export const HTML_COL3 = '<div style="display:flex;gap:20px;margin:15px 0;"><div style="flex:1;padding:15px;background:#f8f9fa;border:1px solid #e0e0e0;border-radius:4px;min-height:60px;">左カラム</div><div style="flex:1;padding:15px;background:#f8f9fa;border:1px solid #e0e0e0;border-radius:4px;min-height:60px;">中カラム</div><div style="flex:1;padding:15px;background:#f8f9fa;border:1px solid #e0e0e0;border-radius:4px;min-height:60px;">右カラム</div></div>';

// 図形テンプレート (absolute positioned)
export const HTML_SHAPE_CIRCLE = '<div data-editor-shape="circle" style="position:absolute;top:50px;left:50px;width:60px;height:60px;z-index:100;"><svg viewBox="0 0 100 100" width="100%" height="100%"><circle cx="50" cy="50" r="45" fill="#3b82f6" stroke="#1e40af" stroke-width="3"/></svg></div>';
export const HTML_SHAPE_TRIANGLE = '<div data-editor-shape="triangle" style="position:absolute;top:50px;left:50px;width:60px;height:60px;z-index:100;"><svg viewBox="0 0 100 100" width="100%" height="100%"><polygon points="50,5 95,95 5,95" fill="#3b82f6" stroke="#1e40af" stroke-width="3"/></svg></div>';
export const HTML_SHAPE_RECT = '<div data-editor-shape="rect" style="position:absolute;top:50px;left:50px;width:80px;height:60px;z-index:100;"><svg viewBox="0 0 100 75" width="100%" height="100%"><rect x="2" y="2" width="96" height="71" fill="#3b82f6" stroke="#1e40af" stroke-width="3" rx="4"/></svg></div>';
export const HTML_SHAPE_ARROW = '<div data-editor-shape="arrow" style="position:absolute;top:50px;left:50px;width:80px;height:40px;z-index:100;"><svg viewBox="0 0 120 60" width="100%" height="100%"><polygon points="0,15 80,15 80,0 120,30 80,60 80,45 0,45" fill="#3b82f6" stroke="#1e40af" stroke-width="3"/></svg></div>';
export const HTML_SHAPE_NUM = (n: number) => `<div data-editor-shape="number" data-shape-number="${n}" style="position:absolute;top:50px;left:50px;width:36px;height:36px;z-index:100;"><svg viewBox="0 0 100 100" width="100%" height="100%"><circle cx="50" cy="50" r="45" fill="#3b82f6" stroke="#1e40af" stroke-width="3"/><text x="50" y="50" text-anchor="middle" dominant-baseline="central" fill="white" font-size="48" font-weight="bold" font-family="Arial,sans-serif">${n}</text></svg></div>`;
