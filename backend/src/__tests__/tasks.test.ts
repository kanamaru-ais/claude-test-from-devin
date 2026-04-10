import request from 'supertest';
import { createTestApp } from './helpers';

describe('Tasks API', () => {
  let app: ReturnType<typeof createTestApp>['app'];
  let db: ReturnType<typeof createTestApp>['db'];
  let projectId: number;

  beforeEach(() => {
    const testApp = createTestApp();
    app = testApp.app;
    db = testApp.db;

    // テスト用プロジェクトを事前作成
    const result = db
      .prepare('INSERT INTO projects (name) VALUES (?)')
      .run('テストプロジェクト');
    projectId = Number(result.lastInsertRowid);
  });

  afterEach(() => {
    db.close();
  });

  // --- Tasks ---

  // BE-T-001: タスク一覧取得
  test('BE-T-001: GET /api/tasks - 空の一覧を返す', async () => {
    const res = await request(app).get('/api/tasks');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ tasks: [] });
  });

  // BE-T-002: ステータスフィルタ
  test('BE-T-002: GET /api/tasks?status=todo - ステータスフィルタ', async () => {
    db.prepare(
      'INSERT INTO tasks (title, project_id) VALUES (?, ?)'
    ).run('todoタスク', projectId);
    db.prepare(
      "INSERT INTO tasks (title, status, project_id) VALUES (?, 'done', ?)"
    ).run('doneタスク', projectId);

    const res = await request(app).get('/api/tasks?status=todo');
    expect(res.status).toBe(200);
    expect(res.body.tasks).toHaveLength(1);
    expect(res.body.tasks[0].title).toBe('todoタスク');
  });

  // BE-T-003: プロジェクトフィルタ
  test('BE-T-003: GET /api/tasks?project_id - プロジェクトフィルタ', async () => {
    const proj2 = db
      .prepare('INSERT INTO projects (name) VALUES (?)')
      .run('別プロジェクト');

    db.prepare(
      'INSERT INTO tasks (title, project_id) VALUES (?, ?)'
    ).run('タスクA', projectId);
    db.prepare(
      'INSERT INTO tasks (title, project_id) VALUES (?, ?)'
    ).run('タスクB', Number(proj2.lastInsertRowid));

    const res = await request(app).get(
      `/api/tasks?project_id=${projectId}`
    );
    expect(res.status).toBe(200);
    expect(res.body.tasks).toHaveLength(1);
    expect(res.body.tasks[0].title).toBe('タスクA');
  });

  // BE-T-004: 存在するタスク取得
  test('BE-T-004: GET /api/tasks/:id - 存在するタスクを返す', async () => {
    const result = db
      .prepare('INSERT INTO tasks (title, project_id) VALUES (?, ?)')
      .run('詳細タスク', projectId);

    const res = await request(app).get(
      `/api/tasks/${result.lastInsertRowid}`
    );
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('詳細タスク');
  });

  // BE-T-005: 存在しないID
  test('BE-T-005: GET /api/tasks/:id - 存在しないIDは404', async () => {
    const res = await request(app).get('/api/tasks/9999');
    expect(res.status).toBe(404);
  });

  // BE-T-006: 正常作成（必須項目のみ）
  test('BE-T-006: POST /api/tasks - 必須項目のみで作成', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .send({ title: '新規タスク' });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('新規タスク');
    expect(res.body.status).toBe('todo');
    expect(res.body.id).toBeDefined();
  });

  // BE-T-007: 正常作成（全項目）
  test('BE-T-007: POST /api/tasks - 全項目指定で作成', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const dueDateStr = futureDate.toISOString().split('T')[0];

    const res = await request(app)
      .post('/api/tasks')
      .send({
        title: '全項目タスク',
        description: '説明文',
        due_date: dueDateStr,
        project_id: projectId,
      });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('全項目タスク');
    expect(res.body.description).toBe('説明文');
    expect(res.body.due_date).toBe(dueDateStr);
    expect(res.body.project_id).toBe(projectId);
  });

  // BE-T-008: title未指定
  test('BE-T-008: POST /api/tasks - title未指定は400', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors[0].field).toBe('title');
  });

  // BE-T-009: 正常更新
  test('BE-T-009: PUT /api/tasks/:id - 正常に更新される', async () => {
    const result = db
      .prepare('INSERT INTO tasks (title, project_id) VALUES (?, ?)')
      .run('更新前', projectId);

    const res = await request(app)
      .put(`/api/tasks/${result.lastInsertRowid}`)
      .send({ title: '更新後', description: '更新説明' });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('更新後');
    expect(res.body.description).toBe('更新説明');
  });

  // BE-T-010: ステータス更新
  test('BE-T-010: PATCH /api/tasks/:id/status - ステータスを更新', async () => {
    const result = db
      .prepare('INSERT INTO tasks (title, project_id) VALUES (?, ?)')
      .run('ステータステスト', projectId);

    const res = await request(app)
      .patch(`/api/tasks/${result.lastInsertRowid}/status`)
      .send({ status: 'in_progress' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('in_progress');
  });

  // BE-T-011: 不正なステータス値
  test('BE-T-011: PATCH /api/tasks/:id/status - 不正なステータスは400', async () => {
    const result = db
      .prepare('INSERT INTO tasks (title, project_id) VALUES (?, ?)')
      .run('ステータステスト', projectId);

    const res = await request(app)
      .patch(`/api/tasks/${result.lastInsertRowid}/status`)
      .send({ status: 'invalid' });

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors[0].field).toBe('status');
  });

  // --- Comments ---

  // BE-C-001: コメント一覧取得
  test('BE-C-001: GET /api/tasks/:id/comments - コメント一覧を返す', async () => {
    const task = db
      .prepare('INSERT INTO tasks (title, project_id) VALUES (?, ?)')
      .run('コメントテスト', projectId);

    const res = await request(app).get(
      `/api/tasks/${task.lastInsertRowid}/comments`
    );
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ comments: [] });
  });

  // BE-C-002: コメント投稿
  test('BE-C-002: POST /api/tasks/:id/comments - コメントを投稿', async () => {
    const task = db
      .prepare('INSERT INTO tasks (title, project_id) VALUES (?, ?)')
      .run('コメントテスト', projectId);

    const res = await request(app)
      .post(`/api/tasks/${task.lastInsertRowid}/comments`)
      .send({ body: 'テストコメント' });

    expect(res.status).toBe(201);
    expect(res.body.body).toBe('テストコメント');
    expect(res.body.task_id).toBe(Number(task.lastInsertRowid));
  });

  // BE-C-003: body未指定
  test('BE-C-003: POST /api/tasks/:id/comments - body未指定は400', async () => {
    const task = db
      .prepare('INSERT INTO tasks (title, project_id) VALUES (?, ?)')
      .run('コメントテスト', projectId);

    const res = await request(app)
      .post(`/api/tasks/${task.lastInsertRowid}/comments`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors[0].field).toBe('body');
  });

  // BE-C-004: コメント更新
  test('BE-C-004: PUT /api/tasks/:id/comments/:cid - コメントを更新', async () => {
    const task = db
      .prepare('INSERT INTO tasks (title, project_id) VALUES (?, ?)')
      .run('コメントテスト', projectId);

    const comment = db
      .prepare('INSERT INTO comments (task_id, body) VALUES (?, ?)')
      .run(Number(task.lastInsertRowid), '更新前コメント');

    const res = await request(app)
      .put(
        `/api/tasks/${task.lastInsertRowid}/comments/${comment.lastInsertRowid}`
      )
      .send({ body: '更新後コメント' });

    expect(res.status).toBe(200);
    expect(res.body.body).toBe('更新後コメント');
  });

  // BE-C-005: コメント削除
  test('BE-C-005: DELETE /api/tasks/:id/comments/:cid - コメントを削除', async () => {
    const task = db
      .prepare('INSERT INTO tasks (title, project_id) VALUES (?, ?)')
      .run('コメントテスト', projectId);

    const comment = db
      .prepare('INSERT INTO comments (task_id, body) VALUES (?, ?)')
      .run(Number(task.lastInsertRowid), '削除対象コメント');

    const res = await request(app).delete(
      `/api/tasks/${task.lastInsertRowid}/comments/${comment.lastInsertRowid}`
    );
    expect(res.status).toBe(204);

    // 削除後確認
    const listRes = await request(app).get(
      `/api/tasks/${task.lastInsertRowid}/comments`
    );
    expect(listRes.body.comments).toHaveLength(0);
  });
});
