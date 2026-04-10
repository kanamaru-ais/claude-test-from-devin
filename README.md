# タスク管理アプリ

タスクとプロジェクトを管理する Web アプリケーションです。

## 技術スタック

- **Frontend**: HTML / CSS / TypeScript
- **Backend**: Node.js / Express / better-sqlite3 / TypeScript

## CI（GitHub Actions）

main ブランチへの push または Pull Request で自動的に CI が実行されます。

CI では以下を検証します：
- Backend: ビルド（TypeScript コンパイル）＆ Jest テスト
- Frontend: ビルド（TypeScript コンパイル）＆ Jest テスト
- HTML 検証: `html-validate` による HTML ファイルの構文チェック

### 手動実行の手順

1. GitHub リポジトリの **「Actions」** タブを開く
2. 左サイドバーから **「CI」** ワークフローを選択
3. 右側の **「Run workflow」** ボタンをクリック
4. ブランチを選択し、**「Run workflow」** を実行

### 失敗時のログ確認

1. **「Actions」** タブを開く
2. 失敗したワークフロー実行（赤い × マーク）をクリック
3. 失敗したジョブ（例: `Backend Build & Test`）をクリック
4. 各ステップを展開すると、エラーメッセージやテスト失敗の詳細がログに表示される
