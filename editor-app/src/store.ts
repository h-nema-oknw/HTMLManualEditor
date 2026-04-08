import { create } from 'zustand';
import { EditorState } from './types';

const DEFAULT_HTML = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HTMLManualEditor 操作マニュアル</title>
  <style>
    body {
      font-family: 'Meiryo', 'Hiragino Kaku Gothic ProN', sans-serif;
      font-size: 15px;
      line-height: 1.7;
      color: #333;
      margin: 0;
      padding: 30px 40px;
      background: #fff;
    }
    h1 { font-size: 28px; color: #3B5998; border-bottom: 2px solid #3B5998; padding-bottom: 8px; }
    h2 { font-size: 22px; color: #3B5998; margin-top: 35px; }
    h3 { font-size: 18px; color: #3B5998; border-left: 4px solid #3B5998; padding-left: 10px; }
    p { margin: 10px 0; }
    img { max-width: 100%; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
    th { background: #f0f0f0; font-weight: bold; }
    .tip-box { padding: 15px; margin: 15px 0; background: #e3f2fd; border-left: 4px solid #2196F3; border-radius: 0 4px 4px 0; }
    .warn-box { padding: 15px; margin: 15px 0; background: #fff3e0; border-left: 4px solid #ff9800; border-radius: 0 4px 4px 0; }
    kbd { background: #f5f5f5; border: 1px solid #ccc; border-radius: 3px; padding: 2px 6px; font-size: 13px; font-family: 'Consolas', monospace; }
    ul { margin: 8px 0; padding-left: 24px; }
    li { margin: 4px 0; }
  </style>
</head>
<body>
  <h1>HTMLManualEditor 操作マニュアル</h1>
  <p>このマニュアルでは、HTMLManualEditorの基本的な操作方法を説明します。<br>本エディタは、HTML形式のマニュアルやドキュメントを直感的に作成・編集できるツールです。</p>

  <div class="tip-box">このマニュアル自体がHTMLManualEditorで作成されています。編集を試すことで操作を体験できます。<br>元に戻したい場合は <kbd>Ctrl</kbd>+<kbd>Z</kbd> または「元に戻す」ボタンをご利用ください。</div>

  <h2>1. 画面構成</h2>
  <p>画面は以下の4つのエリアで構成されています。</p>
  <table>
    <thead>
      <tr>
        <th style="width:25%;">エリア</th>
        <th>説明</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>ツールバー（上部）</strong></td>
        <td>ファイル操作、書式設定、要素の挿入、要素の操作などのボタンが並んでいます。</td>
      </tr>
      <tr>
        <td><strong>要素ツリー（左側）</strong></td>
        <td>ページ内の要素をツリー形式で表示します。要素をクリックして選択できます。</td>
      </tr>
      <tr>
        <td><strong>プレビュー（中央）</strong></td>
        <td>編集中のHTMLをリアルタイムにプレビュー表示します。直接クリックして要素を選択・編集できます。</td>
      </tr>
      <tr>
        <td><strong>プロパティ（右側）</strong></td>
        <td>選択中の要素のスタイル（色、サイズ、余白など）を変更できます。</td>
      </tr>
    </tbody>
  </table>

  <h2>2. ファイル操作</h2>
  <h3>新規作成</h3>
  <p>ツールバーの「新規」ボタンをクリックすると、空の新規ドキュメントを作成します。未保存の変更がある場合は確認メッセージが表示されます。</p>

  <h3>HTMLファイルの読み込み</h3>
  <p>「読込」ボタンをクリックし、HTMLファイル（.html / .htm）を選択すると、エディタに読み込まれます。</p>

  <h3>HTMLファイルの保存</h3>
  <p>「保存」ボタンをクリックすると、現在の編集内容をHTMLファイルとしてダウンロードします。</p>

  <h3>PDF出力</h3>
  <p>「PDF」ボタンをクリックすると、ブラウザの印刷機能を使ってPDFとして出力できます。</p>

  <h2>3. 要素の選択と編集</h2>
  <h3>要素を選択する</h3>
  <p>プレビュー上の要素をクリックすると、その要素が選択されます。選択された要素は青い枠線で囲まれます。</p>
  <ul>
    <li>要素ツリーからも選択できます</li>
    <li>プレビューの外側（灰色の余白部分）をクリックすると、ページ全体を選択できます</li>
    <li>配置した要素より下の余白エリアをクリックすると、最後の要素が選択されます</li>
  </ul>

  <h3>テキストを編集する</h3>
  <p>要素をダブルクリックすると、テキスト編集モードになります。文字を直接入力・編集できます。</p>

  <h3>元に戻す／やり直し</h3>
  <p>ツールバーの矢印ボタン、または <kbd>Ctrl</kbd>+<kbd>Z</kbd>（元に戻す）、<kbd>Ctrl</kbd>+<kbd>Y</kbd>（やり直し）で操作を取り消し・復元できます。</p>

  <h2>4. 要素の挿入</h2>
  <p>ツールバーの右側に並ぶアイコンで、さまざまな要素をページに追加できます。</p>

  <h3>クリックで挿入</h3>
  <p>要素を選択した状態でツールバーのアイコンをクリックすると、新しい要素が追加されます。</p>
  <ul>
    <li>ブロックやカラムなどの<strong>入れ物要素</strong>を選択中 → その中に追加されます</li>
    <li>通常の要素を選択中 → 選択中の要素の下に追加されます</li>
    <li>何も選択していない場合 → ページの末尾に追加されます</li>
  </ul>

  <h3>ドラッグ＆ドロップで挿入</h3>
  <p>ツールバーのアイコンをドラッグしてプレビュー上の好きな位置にドロップすると、その位置に要素を挿入できます。</p>
  <ul>
    <li>要素の上半分にドロップ → その要素の<strong>前</strong>に挿入</li>
    <li>要素の下半分にドロップ → その要素の<strong>後</strong>に挿入</li>
    <li>入れ物要素の中央にドロップ → その<strong>中</strong>に挿入</li>
    <li>ページ下部の空白にドロップ → 末尾に追加</li>
  </ul>

  <h3>挿入できる要素一覧</h3>
  <table>
    <thead>
      <tr>
        <th style="width:20%;">アイコン</th>
        <th style="width:20%;">要素名</th>
        <th>説明</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>H1</td>
        <td>見出し1</td>
        <td>最も大きな見出し。ページタイトルなどに使用します。</td>
      </tr>
      <tr>
        <td>H2</td>
        <td>見出し2</td>
        <td>セクションの見出し。章立てに使用します。</td>
      </tr>
      <tr>
        <td>H3</td>
        <td>見出し3</td>
        <td>小見出し。小セクションの区切りに使用します。</td>
      </tr>
      <tr>
        <td>T</td>
        <td>段落</td>
        <td>本文テキストの段落を挿入します。</td>
      </tr>
      <tr>
        <td>画像</td>
        <td>画像</td>
        <td>クリック：ファイル選択で画像を挿入。ドラッグ：画像の配置枠を挿入（後からクリックで画像を選択）。</td>
      </tr>
      <tr>
        <td>表</td>
        <td>テーブル</td>
        <td>3列×2行の表を挿入します。行・列の追加はテーブル選択後に操作できます。</td>
      </tr>
      <tr>
        <td>□</td>
        <td>ブロック</td>
        <td>装飾付きのコンテンツ領域を挿入します。補足情報や注意書きに便利です。</td>
      </tr>
      <tr>
        <td>リンク</td>
        <td>リンク</td>
        <td>クリック可能なリンクテキストを挿入します。</td>
      </tr>
      <tr>
        <td>―</td>
        <td>水平線</td>
        <td>セクション間の区切り線を挿入します。</td>
      </tr>
      <tr>
        <td>2列</td>
        <td>2カラム</td>
        <td>左右2つに分かれたレイアウト。各カラム内に要素を配置できます。</td>
      </tr>
      <tr>
        <td>3列</td>
        <td>3カラム</td>
        <td>3つに分かれたレイアウト。各カラム内に要素を配置できます。</td>
      </tr>
    </tbody>
  </table>

  <h2>5. 要素の並べ替え・操作</h2>
  <h3>ドラッグで並べ替え</h3>
  <p>プレビュー上で要素をクリックして選択した後、そのままドラッグすると、要素の位置を入れ替えることができます。ドロップ先には青い目印ラインが表示されます。</p>

  <h3>ボタンで操作</h3>
  <p>要素を選択した状態で、ツールバーの以下のボタンが使えます。</p>
  <table>
    <thead>
      <tr>
        <th style="width:25%;">ボタン</th>
        <th>機能</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>コピー</td>
        <td>選択中の要素を複製します。</td>
      </tr>
      <tr>
        <td>↑（上移動）</td>
        <td>選択中の要素を1つ上に移動します。</td>
      </tr>
      <tr>
        <td>↓（下移動）</td>
        <td>選択中の要素を1つ下に移動します。</td>
      </tr>
      <tr>
        <td>削除</td>
        <td>選択中の要素を削除します。</td>
      </tr>
    </tbody>
  </table>

  <h2>6. 書式設定</h2>
  <p>要素を選択した状態で、以下の書式をツールバーから適用できます。</p>
  <table>
    <thead>
      <tr>
        <th style="width:25%;">ボタン</th>
        <th>機能</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>B</strong>（太字）</td>
        <td>選択中の要素のテキストを太字にします。</td>
      </tr>
      <tr>
        <td><em>I</em>（斜体）</td>
        <td>選択中の要素のテキストを斜体にします。</td>
      </tr>
      <tr>
        <td><u>U</u>（下線）</td>
        <td>選択中の要素のテキストに下線を付けます。</td>
      </tr>
      <tr>
        <td>左揃え／中央揃え／右揃え／両端揃え</td>
        <td>テキストの配置を変更します。</td>
      </tr>
      <tr>
        <td>箇条書き／番号付きリスト</td>
        <td>リスト形式のテキストを挿入します。</td>
      </tr>
    </tbody>
  </table>

  <h2>7. テーブルの操作</h2>
  <p>テーブルには専用の操作機能があります。</p>
  <h3>テーブル全体を選択する</h3>
  <p>テーブルの左上角付近に表示されるハンドル（つまみ）をクリックすると、テーブル全体を選択できます。このハンドルをドラッグすると、テーブルの位置を移動できます。</p>

  <h3>行・列の追加</h3>
  <p>テーブルにマウスを乗せると、右端と下端に「＋」ボタンが表示されます。</p>
  <ul>
    <li>右端の「＋」 → 列を追加</li>
    <li>下端の「＋」 → 行を追加</li>
  </ul>
  <p>テーブルまたはセルを選択した状態で、右側のプロパティパネルにも「行追加」「行削除」「列追加」「列削除」のボタンが表示されます。</p>

  <h3>セルの編集</h3>
  <p>セルをダブルクリックすると、テキストを直接編集できます。</p>

  <h2>8. 画像の挿入</h2>
  <h3>直接挿入（クリック）</h3>
  <p>ツールバーの「画像」アイコンをクリックすると、ファイル選択ダイアログが開きます。画像を選択すると、即座にプレビューに挿入されます。</p>

  <h3>配置枠を使った挿入（ドラッグ）</h3>
  <p>「画像」アイコンをドラッグ＆ドロップすると、配置枠（プレースホルダー）が挿入されます。配置枠をクリックすると、ファイル選択ダイアログが開き、画像を選択できます。</p>

  <div class="tip-box">画像はカラムレイアウト（2列・3列）の中にも配置できます。親要素の幅に合わせて自動的にサイズが調整されます。</div>

  <h2>9. カラムレイアウト（入れ子構造）</h2>
  <p>2列・3列のカラムレイアウトやブロック要素の中に、別の要素を配置できます。</p>
  <h3>配置方法</h3>
  <ul>
    <li><strong>クリック挿入：</strong>カラムの片側を選択した状態で、ツールバーのアイコンをクリック</li>
    <li><strong>ドラッグ挿入：</strong>ツールバーからアイコンをドラッグし、カラム内にドロップ</li>
  </ul>

  <div class="warn-box"><strong>制限事項：</strong>入れ子は2階層まで（親子関係）です。孫要素（入れ物の中の入れ物の中に要素）の配置はできません。</div>

  <h2>10. プロパティパネル</h2>
  <p>要素を選択すると、右側のプロパティパネルでスタイルを細かく調整できます。</p>
  <table>
    <thead>
      <tr>
        <th style="width:25%;">項目</th>
        <th>説明</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>テキスト色・背景色</td>
        <td>カラーピッカーで色を選択します。</td>
      </tr>
      <tr>
        <td>フォントサイズ</td>
        <td>文字の大きさを変更します（例：16px）。</td>
      </tr>
      <tr>
        <td>幅・高さ</td>
        <td>要素のサイズを指定します（例：100%、200px）。</td>
      </tr>
      <tr>
        <td>マージン・パディング</td>
        <td>要素の外側・内側の余白を調整します。</td>
      </tr>
      <tr>
        <td>表示</td>
        <td>要素の表示方法（ブロック、横並び、非表示など）を変更します。</td>
      </tr>
      <tr>
        <td>配置</td>
        <td>要素の配置方法（通常、自由配置、画面固定など）を変更します。</td>
      </tr>
      <tr>
        <td>ボーダー</td>
        <td>枠線の太さ、色、形（実線、破線、点線、二重線）を設定します。</td>
      </tr>
      <tr>
        <td>角丸</td>
        <td>角の丸みを設定します（例：8px）。</td>
      </tr>
    </tbody>
  </table>

  <h2>11. ズーム</h2>
  <p>画面右上の「−」「＋」ボタンでプレビューの表示倍率を変更できます（25%〜200%）。</p>

  <h2>12. キーボードショートカット</h2>
  <table>
    <thead>
      <tr>
        <th style="width:30%;">キー操作</th>
        <th>機能</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><kbd>Ctrl</kbd>+<kbd>Z</kbd></td>
        <td>元に戻す</td>
      </tr>
      <tr>
        <td><kbd>Ctrl</kbd>+<kbd>Y</kbd></td>
        <td>やり直し</td>
      </tr>
      <tr>
        <td><kbd>Delete</kbd> / <kbd>Backspace</kbd></td>
        <td>選択中の要素を削除（テキスト編集中は文字を削除）</td>
      </tr>
    </tbody>
  </table>

  <div class="tip-box"><strong>ヒント：</strong>このマニュアルを参考にしながら、実際に要素の追加・編集・並べ替えを試してみてください。操作に慣れると、さまざまなレイアウトのHTMLドキュメントをすばやく作成できるようになります。</div>
</body>
</html>`;

const NEW_DOCUMENT_HTML = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>新規ドキュメント</title>
  <style>
    body {
      font-family: 'Meiryo', 'Hiragino Kaku Gothic ProN', sans-serif;
      font-size: 15px;
      line-height: 1.7;
      color: #333;
      margin: 0;
      padding: 30px 40px;
      background: #fff;
    }
    h1 { font-size: 28px; color: #3B5998; border-bottom: 2px solid #3B5998; padding-bottom: 8px; }
    h2 { font-size: 22px; color: #3B5998; }
    h3 { font-size: 18px; color: #3B5998; border-left: 4px solid #3B5998; padding-left: 10px; }
    p { margin: 10px 0; }
    img { max-width: 100%; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
    th { background: #f0f0f0; }
  </style>
</head>
<body>
  <h1>新規ドキュメント</h1>
  <p>ここにコンテンツを追加してください。</p>
</body>
</html>`;

interface EditorStore extends EditorState {
  setHtmlContent: (html: string) => void;
  setOriginalHtml: (html: string) => void;
  setSelectedElement: (path: string | null, tag: string | null) => void;
  setIsEditing: (editing: boolean) => void;
  setZoom: (zoom: number) => void;
  setFileName: (name: string) => void;
  setIsDirty: (dirty: boolean) => void;
  setPageWidth: (pageWidth: 'a4-portrait' | 'a4-landscape') => void;
  resetEditor: () => void;
  loadHtml: (html: string, fileName: string) => void;
  updateTrigger: number;
  triggerUpdate: () => void;
  loadTrigger: number;
  triggerLoad: () => void;
}

export const useEditorStore = create<EditorStore>((set) => ({
  htmlContent: DEFAULT_HTML,
  originalHtml: DEFAULT_HTML,
  selectedElementPath: null,
  selectedElementTag: null,
  isEditing: false,
  zoom: 100,
  fileName: '操作マニュアル',
  isDirty: false,
  pageWidth: 'a4-portrait',
  updateTrigger: 0,
  loadTrigger: 0,

  setHtmlContent: (html) => set({ htmlContent: html, isDirty: true }),
  setOriginalHtml: (html) => set({ originalHtml: html }),
  setSelectedElement: (path, tag) => set({ selectedElementPath: path, selectedElementTag: tag }),
  setIsEditing: (editing) => set({ isEditing: editing }),
  setZoom: (zoom) => set({ zoom: Math.max(25, Math.min(200, zoom)) }),
  setFileName: (name) => set({ fileName: name }),
  setIsDirty: (dirty) => set({ isDirty: dirty }),
  setPageWidth: (pageWidth) => set({ pageWidth }),

  resetEditor: () => set((state) => ({
    htmlContent: NEW_DOCUMENT_HTML,
    originalHtml: NEW_DOCUMENT_HTML,
    selectedElementPath: null,
    selectedElementTag: null,
    isEditing: false,
    fileName: '新規ドキュメント',
    isDirty: false,
    pageWidth: 'a4-portrait',
    updateTrigger: state.updateTrigger + 1,
    loadTrigger: state.loadTrigger + 1
  })),

  loadHtml: (html, fileName) => set((state) => ({
    htmlContent: html,
    originalHtml: html,
    selectedElementPath: null,
    selectedElementTag: null,
    isEditing: false,
    fileName: fileName,
    isDirty: false,
    updateTrigger: state.updateTrigger + 1,
    loadTrigger: state.loadTrigger + 1
  })),
  triggerUpdate: () => set((state) => ({ updateTrigger: state.updateTrigger + 1 })),
  triggerLoad: () => set((state) => ({ loadTrigger: state.loadTrigger + 1 })),
}));
