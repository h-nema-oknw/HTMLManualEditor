# HTMLManualEditor アーキテクチャ

## 1. 全体構成

```
HTMLManualEditor
├── editor-app/          ... Reactアプリケーション本体
│   ├── src/             ... ソースコード
│   ├── public/          ... 静的ファイル（favicon等）
│   ├── output/          ... ビルド成果物（デプロイ対象）
│   └── package.json     ... 依存関係・ビルド設定
├── sample/              ... サンプルHTMLファイル
├── docs/                ... 仕様書・設計ドキュメント
└── README.md            ... プロジェクト概要
```

## 2. コンポーネント構成

```
App
├── Toolbar              ... ファイル操作、書式、要素挿入、要素操作
├── ElementTree          ... DOM構造のツリー表示
├── HtmlPreview          ... iframe + WYSIWYG編集
└── PropertiesPanel      ... スタイル・属性エディタ
```

### コンポーネント間の通信

コンポーネント間のデータ共有はZustand Storeを介して行います。

```
Toolbar ──→ Store ←── PropertiesPanel
              ↕
         HtmlPreview ←→ iframeManager
              ↕
         ElementTree
```

## 3. 主要モジュール

### 3.1 store.ts（Zustand Store）

アプリケーションの中央状態管理。

**状態:**
| フィールド | 型 | 説明 |
|-----------|------|------|
| `htmlContent` | string | 現在のHTML文字列 |
| `originalHtml` | string | 読込時のHTML（変更検知用） |
| `selectedElementPath` | string \| null | 選択中要素のCSSパス |
| `selectedElementTag` | string \| null | 選択中要素のタグ名 |
| `isEditing` | boolean | テキスト編集モード中か |
| `zoom` | number | ズーム倍率（25〜200） |
| `fileName` | string | ファイル名 |
| `isDirty` | boolean | 未保存の変更があるか |

**アクション:**
- `resetEditor()` - 新規ドキュメントにリセット
- `loadHtml(html, fileName)` - HTMLを読み込み
- `triggerUpdate()` - 要素ツリーの再描画をトリガー
- `triggerLoad()` - iframeの再読込をトリガー

### 3.2 iframeManager.ts（IframeManager クラス）

iframe内のDOM操作・イベント処理を一元管理するシングルトン。

**主な責務:**
- iframeのアタッチ/デタッチ
- エディタ用CSS・イベントハンドラの注入
- 要素の選択、編集、移動、複製、削除
- マウスベースのドラッグ＆ドロップ（iframe内）
- HTML5 DnD（ツールバー → iframe間）
- テーブル操作（行/列の追加・削除・入れ替え）
- テーブルオーバーレイUI（ハンドル、+ボタン）
- 画像挿入（Base64変換、プレースホルダー管理）
- スタイル・属性の取得/設定
- MutationObserverによるコンテンツ変更検知

**イベントハンドラ:**
- `click` - 要素選択、テーブルハンドル、画像プレースホルダー
- `dblclick` - テキスト編集モード
- `mouseover`/`mouseout` - ホバーハイライト、テーブルオーバーレイ表示
- `mousedown`/`mousemove`/`mouseup` - マウスドラッグ（要素移動、テーブル行列入替）
- `dragover`/`dragleave`/`drop` - ツールバーDnD、OSファイルドロップ
- `keydown` - Ctrl+Z/Y、Delete/Backspace
- `paste` - 画像ペースト処理

### 3.3 domSerializer.ts

iframe内のDOMをクリーンなHTMLに変換するユーティリティ。

**関数:**
- `serializeIframeToHtml(doc)` - エディタ注入要素を除去してHTMLを出力
- `generateElementPath(element, root)` - 要素のCSSセレクタパスを生成
- `buildElementTree(element, root)` - ツリーパネル用のオブジェクト構造を構築

### 3.4 historyManager.ts

Undo/Redo機能の履歴管理。

- スタックベースの履歴管理（最大50エントリ）
- `push(html, description)` - 新しい状態を記録
- `undo()` / `redo()` - 履歴の移動
- 新しい操作でredoスタックをクリア

## 4. ドラッグ＆ドロップの実装

### 4.1 iframe内のドラッグ（要素並べ替え）

HTML5 DnD APIはiframe内で信頼性が低いため、mouseイベントベースで実装。

```
mousedown（5pxしきい値）
    ↓
mousemove（body直下の子要素を走査、最近接を判定）
    ↓
インジケーター表示（挿入位置の上/下）
    ↓
mouseup（insertBefore/insertAfterでDOM移動）
```

### 4.2 ツールバー → iframe間のドラッグ

HTML5 DnD APIを使用（クロスドキュメント通信）。

```
dragstart（カスタムMIME: application/x-editor-element）
    ↓
dragover（ドロップ位置判定 + インジケーター表示）
    ↓
drop（HTML文字列をDOMに挿入）
```

### 4.3 テーブル内ドラッグ（行/列入れ替え）

td/th/tr選択時のドラッグはテーブル内専用モードで処理。

```
mousedown（td/th/tr を検出）
    ↓
5px超過後、ドラッグ方向を判定
  ├── 縦方向 → 行モード（rowの入れ替え）
  └── 横方向 → 列モード（全行の対応セルを入れ替え）
    ↓
ピンク色のインジケーター表示
    ↓
mouseup（DOM操作で行/列を入れ替え）
```

## 5. テーブルオーバーレイUI

テーブルにマウスオーバーすると、以下のオーバーレイ要素がエディタ内部的に追加されます。

```
.editor-table-wrapper（テーブルをラップ）
├── table（元のテーブル）
├── .editor-table-select-handle（左上：全体選択 & 移動ハンドル）
├── .editor-table-add-col（右端：列追加ボタン）
└── .editor-table-add-row（下端：行追加ボタン）
```

これらはHTML出力時に `domSerializer` によって除去されます。

## 6. 入れ子（ネスト）制御

```
isContainerElement(el)  → 入れ物として許可されるタグか判定
canNestInside(container) → 深さ制限チェック（body からの深さ ≤ 2）

ドロップゾーン判定:
  上25% → before（前に挿入）
  中50% → inside（中に挿入）※入れ物要素かつ深さOKの場合
  下25% → after（後に挿入）
```
