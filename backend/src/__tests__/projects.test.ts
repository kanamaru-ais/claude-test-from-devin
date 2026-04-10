import request from 'supertest';
import { createTestApp } from './helpers';

describe('Projects API', () => {
  let app: ReturnType<typeof createTestApp>['app'];
  let db: ReturnType<typeof createTestApp>['db'];

  beforeEach(() => {
    const testApp = createTestApp();
    app = testApp.app;
    db = testApp.db;
  });

  afterEach(() => {
    db.close();
  });

  // BE-P-001: プロジェクト一覧取得（0件）
  test('BE-P-001: GET /api/projects - 0件の場合は空配列を返す', async () => {
    const res = await request(app).get('/api/projects');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ projects: [] });
  });

  // BE-P-002: プロジェクト一覧取得（複数件）
  test('BE-P-002: GET /api/projects - 複数件返却', async () => {
    db.prepare('INSERT INTO projects (name) VALUES (?)').run('プロジェクトA');
    db.prepare('INSERT INTO projects (name) VALUES (?)').run('プロジェクトB');

    const res = await request(app).get('/api/projects');
    expect(res.status).toBe(200);
    expect(res.body.projects).toHaveLength(2);
    expect(res.body.projects[0].name).toBe('プロジェクトA');
    expect(res.body.projects[1].name).toBe('プロジェクトB');
  });

  // BE-P-003: 存在するプロジェクト取得
  test('BE-P-003: GET /api/projects/:id - 存在するプロジェクトを返す', async () => {
    const result = db
      .prepare('INSERT INTO projects (name) VALUES (?)')
      .run('テストプロジェクト');

    const res = await request(app).get(
      `/api/projects/${result.lastInsertRowid}`
    );
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('テストプロジェクト');
    expect(res.body.id).toBe(Number(result.lastInsertRowid));
  });

  // BE-P-004: 存在しないID
  test('BE-P-004: GET /api/projects/:id - 存在しないIDは404', async () => {
    const res = await request(app).get('/api/projects/9999');
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });

  // BE-P-005: 正常作成
  test('BE-P-005: POST /api/projects - 正常に作成される', async () => {
    const res = await request(app)
      .post('/api/projects')
      .send({ name: '新規プロジェクト' });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('新規プロジェクト');
    expect(res.body.id).toBeDefined();
    expect(res.body.created_at).toBeDefined();
  });

  // BE-P-006: name未指定
  test('BE-P-006: POST /api/projects - name未指定は400', async () => {
    const res = await request(app)
      .post('/api/projects')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors[0].field).toBe('name');
  });

  // BE-P-007: name空文字
  test('BE-P-007: POST /api/projects - name空文字は400', async () => {
    const res = await request(app)
      .post('/api/projects')
      .send({ name: '' });

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors[0].field).toBe('name');
  });

  // BE-P-008: name 255文字超
  test('BE-P-008: POST /api/projects - name255文字超は400', async () => {
    const longName = 'a'.repeat(256);
    const res = await request(app)
      .post('/api/projects')
      .send({ name: longName });

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors[0].field).toBe('name');
  });

  // BE-P-009: 正常更新
  test('BE-P-009: PUT /api/projects/:id - 正常に更新される', async () => {
    const result = db
      .prepare('INSERT INTO projects (name) VALUES (?)')
      .run('更新前');

    const res = await request(app)
      .put(`/api/projects/${result.lastInsertRowid}`)
      .send({ name: '更新後' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('更新後');
  });

  // BE-P-010: 存在しないIDの更新
  test('BE-P-010: PUT /api/projects/:id - 存在しないIDは404', async () => {
    const res = await request(app)
      .put('/api/projects/9999')
      .send({ name: '更新' });

    expect(res.status).toBe(404);
  });

  // BE-P-011: name未指定の更新
  test('BE-P-011: PUT /api/projects/:id - name未指定は400', async () => {
    const result = db
      .prepare('INSERT INTO projects (name) VALUES (?)')
      .run('テスト');

    const res = await request(app)
      .put(`/api/projects/${result.lastInsertRowid}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });

  // BE-P-012: 正常削除
  test('BE-P-012: DELETE /api/projects/:id - 正常に削除される', async () => {
    const result = db
      .prepare('INSERT INTO projects (name) VALUES (?)')
      .run('削除対象');

    const res = await request(app).delete(
      `/api/projects/${result.lastInsertRowid}`
    );
    expect(res.status).toBe(204);

    // 削除後に取得できないことを確認
    const getRes = await request(app).get(
      `/api/projects/${result.lastInsertRowid}`
    );
    expect(getRes.status).toBe(404);
  });

  // BE-P-013: 存在しないIDの削除
  test('BE-P-013: DELETE /api/projects/:id - 存在しないIDは404', async () => {
    const res = await request(app).delete('/api/projects/9999');
    expect(res.status).toBe(404);
  });

  // BE-P-014: カスケード削除
  test('BE-P-014: DELETE /api/projects/:id - 紐づくタスクもカスケード削除される', async () => {
    const proj = db
      .prepare('INSERT INTO projects (name) VALUES (?)')
      .run('削除テスト');

    db.prepare(
      'INSERT INTO tasks (title, project_id) VALUES (?, ?)'
    ).run('タスク1', proj.lastInsertRowid);

    db.prepare(
      'INSERT INTO tasks (title, project_id) VALUES (?, ?)'
    ).run('タスク2', proj.lastInsertRowid);

    // タスクが存在することを確認
    const beforeRes = await request(app).get(
      `/api/tasks?project_id=${proj.lastInsertRowid}`
    );
    expect(beforeRes.body.tasks).toHaveLength(2);

    // プロジェクト削除
    await request(app).delete(`/api/projects/${proj.lastInsertRowid}`);

    // タスクも削除されたことを確認
    const afterRes = await request(app).get(
      `/api/tasks?project_id=${proj.lastInsertRowid}`
    );
    expect(afterRes.body.tasks).toHaveLength(0);
  });
});
