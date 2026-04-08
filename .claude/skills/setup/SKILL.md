---
name: setup
description: 開発環境のセットアップ（npm install + ビルド + IISデプロイ）
disable-model-invocation: true
allowed-tools: Bash(*)
---

# 開発環境セットアップ

新規PCまたは初回セットアップ時に実行する。

## 手順

### 1. Node.js の確認

```bash
node --version && npm --version
```

バージョンが表示されない場合は Node.js がインストールされていない。
ユーザーに https://nodejs.org/ から LTS版をインストールするよう案内し、処理を停止する。

### 2. 依存パッケージのインストール

```bash
cd editor-app && npm install
```

### 3. プロジェクトのビルド

```bash
BUILD_PATH=./output npx react-scripts build
```

### 4. IIS デプロイ先ディレクトリの確認・作成

```bash
ls /c/inetpub/wwwroot/HTMLManualEditor 2>/dev/null || mkdir -p /c/inetpub/wwwroot/HTMLManualEditor
```

### 5. ビルド成果物のコピー

```bash
cp -r editor-app/output/* /c/inetpub/wwwroot/HTMLManualEditor/
```

### 6. デプロイ確認

```bash
ls /c/inetpub/wwwroot/HTMLManualEditor/index.html && ls /c/inetpub/wwwroot/HTMLManualEditor/static/
```

ファイルが存在すればセットアップ完了。ユーザーに以下を報告する:
- アクセスURL: http://localhost/HTMLManualEditor/
- IIS マネージャーで仮想アプリケーションが未設定の場合は手動設定が必要

## IIS 仮想アプリケーション設定（未設定の場合）

IIS マネージャーで以下を設定する:
- サイト: Default Web Site
- エイリアス: HTMLManualEditor
- 物理パス: C:\inetpub\wwwroot\HTMLManualEditor

または appcmd で設定:

```bash
/c/Windows/system32/inetsrv/appcmd.exe add app /site.name:"Default Web Site" /path:/HTMLManualEditor /physicalPath:"C:\\inetpub\\wwwroot\\HTMLManualEditor"
```

## 注意事項

- `package.json` の `"homepage": "/HTMLManualEditor/"` は変更しないこと
- デプロイパスを変更する場合は `homepage` の更新とリビルドが必要
