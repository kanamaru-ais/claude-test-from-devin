# テスト仕様書

## 概要

タスク管理アプリのバックエンド・フロントエンド両方のテスト仕様を定義する。

---

## バックエンドテスト仕様

### Projects API (`/api/projects`)

| テストID | カテゴリ | テスト内容 | 期待結果 |
|---|---|---|---|
| BE-P-001 | GET /api/projects | プロジェクト一覧取得（0件） | 200, `{ projects: [] }` |
| BE-P-002 | GET /api/projects | プロジェクト一覧取得（複数件） | 200, 全件返却 |
| BE-P-003 | GET /api/projects/:id | 存在するプロジェクト取得 | 200, プロジェクト情報 |
| BE-P-004 | GET /api/projects/:id | 存在しないID | 404, `{ error: 'プロジェクトが見つかりません' }` |
| BE-P-005 | POST /api/projects | 正常作成 | 201, 作成されたプロジェクト |
| BE-P-006 | POST /api/projects | name未指定 | 400, バリデーションエラー |
| BE-P-007 | POST /api/projects | name空文字 | 400, バリデーションエラー |
| BE-P-008 | POST /api/projects | name 255文字超 | 400, バリデーションエラー |
| BE-P-009 | PUT /api/projects/:id | 正常更新 | 200, 更新後のプロジェクト |
| BE-P-010 | PUT /api/projects/:id | 存在しないID | 404 |
| BE-P-011 | PUT /api/projects/:id | name未指定 | 400 |
| BE-P-012 | DELETE /api/projects/:id | 正常削除 | 204 |
| BE-P-013 | DELETE /api/projects/:id | 存在しないID | 404 |
| BE-P-014 | DELETE /api/projects/:id | 紐づくタスクもカスケード削除される | タスクも削除確認 |

### Tasks API (`/api/tasks`)

| テストID | カテゴリ | テスト内容 | 期待結果 |
|---|---|---|---|
| BE-T-001 | GET /api/tasks | タスク一覧取得 | 200, `{ tasks: [] }` |
| BE-T-002 | GET /api/tasks?status=todo | ステータスフィルタ | 該当タスクのみ返却 |
| BE-T-003 | GET /api/tasks?project_id=1 | プロジェクトフィルタ | 該当タスクのみ返却 |
| BE-T-004 | GET /api/tasks/:id | 存在するタスク取得 | 200, タスク情報 |
| BE-T-005 | GET /api/tasks/:id | 存在しないID | 404 |
| BE-T-006 | POST /api/tasks | 正常作成（必須項目のみ） | 201, 作成されたタスク |
| BE-T-007 | POST /api/tasks | 正常作成（全項目指定） | 201, 全項目が保存される |
| BE-T-008 | POST /api/tasks | title未指定 | 400, バリデーションエラー |
| BE-T-009 | PUT /api/tasks/:id | 正常更新 | 200, 更新後のタスク |
| BE-T-010 | PATCH /api/tasks/:id/status | ステータス更新 | 200, 更新後のタスク |
| BE-T-011 | PATCH /api/tasks/:id/status | 不正なステータス値 | 400, バリデーションエラー |

### Comments API (`/api/tasks/:id/comments`)

| テストID | カテゴリ | テスト内容 | 期待結果 |
|---|---|---|---|
| BE-C-001 | GET /api/tasks/:id/comments | コメント一覧取得 | 200, `{ comments: [] }` |
| BE-C-002 | POST /api/tasks/:id/comments | コメント投稿 | 201, 作成されたコメント |
| BE-C-003 | POST /api/tasks/:id/comments | body未指定 | 400, バリデーションエラー |
| BE-C-004 | PUT /api/tasks/:id/comments/:cid | コメント更新 | 200, 更新後のコメント |
| BE-C-005 | DELETE /api/tasks/:id/comments/:cid | コメント削除 | 204 |

### DBレイヤー

| テストID | テスト内容 | 期待結果 |
|---|---|---|
| BE-DB-001 | createDb でテーブルが作成される | projects, tasks, comments テーブルが存在する |
| BE-DB-002 | 外部キー制約が有効 | カスケード削除が正しく動作する |

---

## フロントエンドテスト仕様

### utils.ts（共通ユーティリティ）

| テストID | テスト内容 | 期待結果 |
|---|---|---|
| FE-P-001 | validateProjectName: 空文字 | エラーメッセージ `'プロジェクト名は必須です'` を返却 |
| FE-P-002 | validateProjectName: 255文字超 | エラーメッセージ `'プロジェクト名は255文字以内で入力してください'` を返却 |
| FE-P-003 | validateProjectName: 正常値 | `null` を返却 |
| FE-P-004 | escapeHtml: 特殊文字エスケープ | `&`, `<`, `>`, `"` がそれぞれエスケープされる |
| FE-P-005 | formatDatetime: 日時フォーマット | `YYYY/MM/DD HH:mm` 形式で返却 |
| FE-P-006 | escapeAttr: ダブルクォートエスケープ | `"` が `&quot;` にエスケープされる |

### projects.ts（プロジェクト一覧画面）

| テストID | テスト内容 | 期待結果 |
|---|---|---|
| FE-P-007 | renderProjects: 0件表示 | 空メッセージ行が表示される |
| FE-P-008 | renderProjects: 複数件表示 | テーブル行が件数分生成される |

### task-new.ts / task-edit.ts（タスクフォーム）

| テストID | テスト内容 | 期待結果 |
|---|---|---|
| FE-T-001 | validateTaskTitle: タイトル空 | エラーメッセージを返却 |
| FE-T-002 | validateTaskTitle: タイトル255文字超 | エラーメッセージを返却 |
| FE-T-003 | validateDueDate: 過去日付の期限 | エラーメッセージを返却 |
| FE-T-004 | validateTaskTitle + validateDueDate: 正常値 | `null` を返却 |

### tasks.ts（タスク一覧画面）

| テストID | テスト内容 | 期待結果 |
|---|---|---|
| FE-TL-001 | renderTasks: 0件 | 空メッセージ行が表示される |
| FE-TL-002 | renderTasks: 複数件 | テーブル行が生成され、ステータスバッジが表示される |
