import { createDb } from '../db';

describe('DBレイヤー', () => {
  // BE-DB-001: createDb でテーブルが作成される
  test('BE-DB-001: projects, tasks, comments テーブルが作成される', () => {
    const db = createDb(':memory:');

    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('projects','tasks','comments') ORDER BY name"
      )
      .all() as { name: string }[];

    const tableNames = tables.map((t) => t.name);
    expect(tableNames).toContain('comments');
    expect(tableNames).toContain('projects');
    expect(tableNames).toContain('tasks');

    db.close();
  });

  // BE-DB-002: 外部キー制約が有効（カスケード削除）
  test('BE-DB-002: プロジェクト削除でタスク・コメントがカスケード削除される', () => {
    const db = createDb(':memory:');

    // プロジェクト作成
    const proj = db
      .prepare('INSERT INTO projects (name) VALUES (?)')
      .run('テストプロジェクト');

    // タスク作成
    const task = db
      .prepare('INSERT INTO tasks (title, project_id) VALUES (?, ?)')
      .run('テストタスク', proj.lastInsertRowid);

    // コメント作成
    db.prepare('INSERT INTO comments (task_id, body) VALUES (?, ?)')
      .run(task.lastInsertRowid, 'テストコメント');

    // 削除前確認
    expect(
      db.prepare('SELECT COUNT(*) as count FROM tasks').get()
    ).toEqual({ count: 1 });
    expect(
      db.prepare('SELECT COUNT(*) as count FROM comments').get()
    ).toEqual({ count: 1 });

    // プロジェクト削除
    db.prepare('DELETE FROM projects WHERE id = ?').run(proj.lastInsertRowid);

    // カスケード削除確認
    expect(
      db.prepare('SELECT COUNT(*) as count FROM tasks').get()
    ).toEqual({ count: 0 });
    expect(
      db.prepare('SELECT COUNT(*) as count FROM comments').get()
    ).toEqual({ count: 0 });

    db.close();
  });
});
