# HTMLManualEditor

HTML形式のマニュアルやドキュメントをWYSIWYG（見たまま編集）で作成・編集できるWebアプリケーションです。
HTML/CSSの知識がなくても、直感的な操作でレイアウトの構築、テキスト編集、画像挿入、テーブル操作などが行えます。

## 主な機能

- 要素のクリック選択 & ダブルクリックでテキスト編集
- ツールバーからの要素挿入（クリック / ドラッグ＆ドロップ）
- ドラッグ＆ドロップによる要素の並べ替え
- テーブル操作（行列追加/削除、行列の入れ替え、全体移動）
- 2カラム・3カラムのレイアウト構築（入れ子2階層まで）
- 画像の挿入（ファイル選択 / プレースホルダー配置 / OSファイルドロップ）
- プロパティパネルでスタイル・属性の編集
- Undo/Redo（最大50回、Ctrl+Z / Ctrl+Y対応）
- ズーム（25%〜200%）
- HTMLファイルの読込 / 保存 / PDF出力

## 動作環境

| 項目 | 内容 |
|------|------|
| サーバー | IIS（静的ファイル配信のみ） |
| ランタイム | 不要（ビルド済み静的ファイル） |
| 対応ブラウザ | Chrome（推奨）、Edge、Firefox |

## フォルダ・ファイル構成

```
HTMLManualEditor/
├── README.md                        ... 本ファイル（プロジェクト概要）
├── CLAUDE.md                        ... Claude Code用プロジェクト指示
├── setup.bat                        ... 新規PC環境構築バッチ（IIS-only PC向け）
├── .claude/                         ... Claude Code設定・スキル
│   └── skills/                      ... カスタムスキル定義
│       ├── setup/SKILL.md           ... /setup（環境構築: npm install + ビルド + IISデプロイ）
│       ├── deploy/SKILL.md          ... /deploy（IISデプロイ）
│       └── commit/SKILL.md          ... /commit（変更コミット）
├── docs/                            ... 仕様書・設計ドキュメント
│   ├── specification.md             ... 機能仕様書
│   └── architecture.md              ... アーキテクチャ設計書
├── sample/                          ... サンプルHTMLファイル
│   └── manual.html                  ... 操作マニュアル（初期表示用）
├── editor-app/                      ... Reactアプリケーション
│   ├── package.json                 ... 依存関係・ビルド設定
│   ├── tsconfig.json                ... TypeScript設定
│   ├── tailwind.config.js           ... Tailwind CSS設定
│   ├── postcss.config.js            ... PostCSS設定
│   ├── public/                      ... 静的アセット
│   │   ├── index.html               ... HTMLテンプレート
│   │   ├── favicon.svg              ... ファビコン（SVG）
│   │   ├── favicon.ico              ... ファビコン（ICO）
│   │   └── manifest.json            ... PWAマニフェスト
│   ├── src/                         ... ソースコード
│   │   ├── index.tsx                ... エントリーポイント
│   │   ├── App.tsx                  ... ルートコンポーネント（4パネルレイアウト）
│   │   ├── App.css                  ... グローバルスタイル
│   │   ├── store.ts                 ... Zustand状態管理（デフォルトHTML含む）
│   │   ├── types.ts                 ... 型定義
│   │   ├── components/
│   │   │   ├── Toolbar.tsx          ... ツールバー（ファイル操作、書式、要素挿入）
│   │   │   ├── HtmlPreview.tsx      ... プレビューパネル（iframe管理）
│   │   │   ├── ElementTree.tsx      ... 要素ツリーパネル（DOM構造表示）
│   │   │   └── PropertiesPanel.tsx  ... プロパティパネル（スタイル/属性編集）
│   │   └── utils/
│   │       ├── iframeManager.ts     ... iframe内DOM操作・イベント管理（中核）
│   │       ├── domSerializer.ts     ... HTML出力用シリアライザ
│   │       └── historyManager.ts    ... Undo/Redo履歴管理
│   └── output/                      ... ビルド成果物 ← デプロイ対象
│       ├── index.html
│       ├── favicon.svg
│       ├── static/
│       │   ├── js/                  ... バンドルJS
│       │   └── css/                 ... バンドルCSS
│       └── ...
```

### 主要ファイルの役割

| ファイル | 役割 |
|---------|------|
| `store.ts` | アプリケーション状態管理。デフォルトHTML（操作マニュアル）と新規ドキュメントテンプレートを保持 |
| `iframeManager.ts` | 最も中核となるファイル。iframe内の全操作（選択、編集、DnD、テーブル、画像、ネスト制御）を管理 |
| `domSerializer.ts` | iframe DOMからエディタ固有の要素・属性を除去してクリーンなHTMLを生成 |
| `historyManager.ts` | スタックベースのUndo/Redo管理（最大50エントリ） |
| `Toolbar.tsx` | 要素挿入のHTMLテンプレート定義、DnDのdragStart処理、ファイルI/O |
| `HtmlPreview.tsx` | iframeへのHTML読み込み、MutationObserverによる変更検知、外側クリックでbody選択 |
| `PropertiesPanel.tsx` | 選択要素のCSS/属性をリアルタイム編集。ページ全体選択時は専用UI |
| `ElementTree.tsx` | DOMツリーの可視化。タグ種別ごとに色分け表示 |

## 新規PCでのセットアップ〜デプロイ手順

IISのみ設定済みの新規PCで初めて動かす場合の手順です。

### 自動セットアップ（推奨）

`setup.bat` を **管理者権限** で実行すると、以下の手順を自動で行います。

```
setup.bat を右クリック → [管理者として実行]
```

- Node.js のインストール確認（未インストールの場合は案内）
- `npm install`（依存パッケージのインストール）
- プロダクションビルド
- `C:\inetpub\wwwroot\HTMLManualEditor\` へのファイルコピー
- IIS 仮想アプリケーションの設定（appcmd 使用）

---

### 手動セットアップ手順

自動セットアップが使えない場合の手動手順です。

### 1. Node.js のインストール

[https://nodejs.org](https://nodejs.org) から **LTS版（v18以上）** をダウンロードしてインストールします。

インストール後、コマンドプロンプトで確認:

```
node -v
npm -v
```

### 2. リポジトリの取得

Gitを使う場合:

```bash
git clone <リポジトリURL>
cd HTMLManualEditor
```

Gitを使わない場合はZIPをダウンロードして展開してください。

### 3. 依存パッケージのインストール

```bash
cd editor-app
npm install
```

> `node_modules/` フォルダが作成されます。初回は数分かかります。

### 4. ビルド

```bash
BUILD_PATH=./output npx react-scripts build
```

> `editor-app/output/` にビルド済み静的ファイルが生成されます。

### 5. IISへのデプロイ

`editor-app/output/` 内の全ファイルを、IISの配置先フォルダにコピーします。

```bash
xcopy /E /Y /I editor-app\output\* C:\inetpub\wwwroot\HTMLManualEditor\
```

IIS マネージャーで仮想アプリケーションを設定:
- サイト: Default Web Site
- エイリアス: HTMLManualEditor
- 物理パス: `C:\inetpub\wwwroot\HTMLManualEditor`

### 6. 動作確認

ブラウザで以下にアクセス:

```
http://localhost/HTMLManualEditor/
```

---

## ビルド & デプロイ（2回目以降）

ソースを修正した後の再ビルド・再デプロイ手順です。

### ビルド

```bash
cd editor-app
BUILD_PATH=./output npx react-scripts build
```

### デプロイ

```bash
cp -r output/* C:/inetpub/wwwroot/HTMLManualEditor/
```

### アクセス

```
http://<サーバー名>/HTMLManualEditor/
```

## 技術スタック

- **React 19** + **TypeScript** - UIフレームワーク
- **Zustand** - 状態管理
- **Lucide React** - アイコン
- **Tailwind CSS** - ユーティリティCSS（一部使用）
- **Create React App** - ビルドツール

## Claude Code スキル（カスタムコマンド）

本プロジェクトでは、Claude Code で使えるカスタムスキルを `.claude/skills/` に定義しています。
セッション開始時に自動で読み込まれ、`/` に続けてスキル名を入力すると実行できます。

| コマンド | 説明 |
|----------|------|
| `/setup` | 初回セットアップ: `npm install` → ビルド → IIS デプロイまで一括実行 |
| `/deploy` | プロダクションビルドを実行し、IIS（`C:/inetpub/wwwroot/HTMLManualEditor/`）にデプロイ |
| `/commit` | 変更内容を分析して日本語コミットメッセージを生成し、コミット |
| `/simplify` | 変更したコードの品質・効率をレビューし、改善提案（組み込みスキル） |

### 初回セットアップ時のワークフロー

```
1. Claude Code でこのディレクトリを開く
2. /setup      ← 環境構築（初回のみ）
```

### 通常の開発ワークフロー

```
1. コードを修正
2. /simplify   ← 品質チェック
3. /commit     ← コミット
4. /deploy     ← IISにデプロイ
```

> **注意:** スキル追加後は Claude Code のセッションを再起動する必要があります。

## 注意事項

- `homepage` フィールド（package.json）が `/HTMLManualEditor/` に設定されているため、配置パスは `/HTMLManualEditor/` でなければなりません。パスを変更する場合は `homepage` を変更して再ビルドしてください。
- 画像はBase64エンコードでHTMLに埋め込まれます。大量の高解像度画像を挿入するとファイルサイズが大きくなります。
- サーバー側にNode.jsやnpmは不要です。ビルド済みの静的ファイルのみで動作します。
