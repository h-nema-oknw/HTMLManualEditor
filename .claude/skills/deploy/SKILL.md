---
name: deploy
description: HTMLManualEditorをビルドしてIISにデプロイ
disable-model-invocation: true
allowed-tools: Bash(*)
---

# HTMLManualEditor デプロイ

本番ビルドを作成し、IISにデプロイする。

## 前提条件

- IISが構築済みで `C:/inetpub/wwwroot/HTMLManualEditor/` が存在すること
- Node.js がインストール済みであること

## 手順

以下の手順を順番に実行してください。

### 1. ビルド

```bash
cd editor-app && BUILD_PATH=./output npx react-scripts build
```

### 2. IISへデプロイ

ビルド成果物をIISのデプロイ先にコピーする。

```bash
cp -r editor-app/output/* /c/inetpub/wwwroot/HTMLManualEditor/
```

### 3. デプロイ確認

以下を確認する：
- `C:/inetpub/wwwroot/HTMLManualEditor/index.html` が存在すること
- `static/js/` と `static/css/` 配下にファイルが存在すること

```bash
ls /c/inetpub/wwwroot/HTMLManualEditor/index.html && ls /c/inetpub/wwwroot/HTMLManualEditor/static/js/ && ls /c/inetpub/wwwroot/HTMLManualEditor/static/css/
```

確認が完了したら、デプロイ成功をユーザーに報告する。

## 注意事項

- `package.json` の `"homepage": "/HTMLManualEditor/"` を変更しないこと
- デプロイパスを変更する場合は `homepage` の更新とリビルドが必要
