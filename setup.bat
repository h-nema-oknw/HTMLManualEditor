@echo off
chcp 65001 > nul
setlocal EnableDelayedExpansion

echo ======================================
echo  HTMLManualEditor 環境構築セットアップ
echo ======================================
echo.

:: ============================================================
:: [1/4] Node.js チェック
:: ============================================================
echo [1/4] Node.js の確認...
node --version > nul 2>&1
if errorlevel 1 (
    echo.
    echo [エラー] Node.js がインストールされていません。
    echo.
    echo 以下の手順でインストールしてください:
    echo   1. https://nodejs.org/ を開く
    echo   2. "LTS" ボタンからインストーラーをダウンロード
    echo   3. インストーラーを実行（すべてデフォルト設定でOK）
    echo   4. インストール完了後、このバッチを再実行
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VER=%%i
echo  -> Node.js %NODE_VER% を確認

npm --version > nul 2>&1
if errorlevel 1 (
    echo [エラー] npm が見つかりません。Node.js を再インストールしてください。
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('npm --version') do set NPM_VER=%%i
echo  -> npm v%NPM_VER% を確認
echo.

:: ============================================================
:: [2/4] 依存パッケージのインストール
:: ============================================================
echo [2/4] 依存パッケージのインストール...
echo  (初回は数分かかる場合があります)
echo.
cd /d "%~dp0editor-app"
call npm install
if errorlevel 1 (
    echo.
    echo [エラー] npm install に失敗しました。
    echo  ネットワーク接続を確認して再試行してください。
    pause
    exit /b 1
)
echo.
echo  -> インストール完了
echo.

:: ============================================================
:: [3/4] プロジェクトのビルド
:: ============================================================
echo [3/4] プロジェクトのビルド...
echo  (数分かかる場合があります)
echo.
set BUILD_PATH=./output
call npx react-scripts build
if errorlevel 1 (
    echo.
    echo [エラー] ビルドに失敗しました。
    echo  エラー内容を確認してください。
    pause
    exit /b 1
)
echo.
echo  -> ビルド完了 (editor-app\output\ に出力)
echo.

:: ============================================================
:: [4/4] IIS へのデプロイ
:: ============================================================
echo [4/4] IIS へのデプロイ...
set DEPLOY_DIR=C:\inetpub\wwwroot\HTMLManualEditor

:: デプロイ先ディレクトリの作成
if not exist "%DEPLOY_DIR%" (
    mkdir "%DEPLOY_DIR%"
    if errorlevel 1 (
        echo [エラー] デプロイ先ディレクトリの作成に失敗しました。
        echo  管理者権限でこのバッチを実行してください。
        pause
        exit /b 1
    )
    echo  -> デプロイ先ディレクトリを作成: %DEPLOY_DIR%
)

:: ビルド成果物をコピー
xcopy /E /Y /I "output\*" "%DEPLOY_DIR%\" > nul
if errorlevel 1 (
    echo [エラー] ファイルのコピーに失敗しました。
    echo  管理者権限でこのバッチを実行してください。
    pause
    exit /b 1
)
echo  -> ファイルコピー完了: %DEPLOY_DIR%

:: IIS 仮想アプリケーションの設定
echo.
echo  IIS 仮想アプリケーションを確認・設定します...
set APPCMD=%windir%\system32\inetsrv\appcmd.exe

if exist "%APPCMD%" (
    "%APPCMD%" list app /app.name:"Default Web Site/HTMLManualEditor" > nul 2>&1
    if errorlevel 1 (
        "%APPCMD%" add app /site.name:"Default Web Site" /path:/HTMLManualEditor /physicalPath:"%DEPLOY_DIR%" > nul 2>&1
        if errorlevel 1 (
            echo  [警告] IIS 仮想アプリケーションの自動設定に失敗しました。
            echo         IIS マネージャーで手動設定してください:
            echo           サイト      : Default Web Site
            echo           エイリアス  : HTMLManualEditor
            echo           物理パス    : %DEPLOY_DIR%
        ) else (
            echo  -> IIS 仮想アプリケーション設定完了
        )
    ) else (
        echo  -> IIS 仮想アプリケーションは既に設定済み
    )
) else (
    echo  [警告] appcmd.exe が見つかりません。IIS マネージャーで手動設定してください:
    echo         サイト      : Default Web Site
    echo         エイリアス  : HTMLManualEditor
    echo         物理パス    : %DEPLOY_DIR%
)

:: ============================================================
:: 完了
:: ============================================================
echo.
echo ======================================
echo  セットアップ完了！
echo.
echo  ブラウザで以下にアクセスしてください:
echo    http://localhost/HTMLManualEditor/
echo ======================================
echo.
pause
