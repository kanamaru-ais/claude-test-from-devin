import request from 'supertest';
import express from 'express';
import { createDb } from '../db';
import { makeTasksRouter } from '../routes/tasks';
import Database from 'better-sqlite3';

let app: express.Express;
let db: Database.Database;

beforeEach(() => {
  db = createDb(':memory:');
  app = express();
  app.use(express.json());
  app.use('/api/tasks', makeTasksRouter(db));
});

afterEach(() => {
  db.close();
});

describe('GET /api/tasks', () => {
  test('空のとき空配列を返す', async () => {
    const res = await request(app).get('/api/tasks');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ tasks: [] });
  });

  test('作成済みタスクを返す', async () => {
    db.prepare('INSERT INTO tasks (title) VALUES (?)').run('テストタスク');
    const res = await request(app).get('/api/tasks');
    expect(res.status).toBe(200);
    expect(res.body.tasks).toHaveLength(1);
    expect(res.body.tasks[0].title).toBe('テストタスク');
  });

  test('statusフィルタで絞り込める', async () => {
    db.prepare('INSERT INTO tasks (title, status) VALUES (?, ?)').run('タスクA', 'todo');
    db.prepare('INSERT INTO tasks (title, status) VALUES (?, ?)').run('タスクB', 'done');
    const res = await request(app).get('/api/tasks?status=todo');
    expect(res.status).toBe(200);
    expect(res.body.tasks).toHaveLength(1);
    expect(res.body.tasks[0].title).toBe('タスクA');
  });

  test('project_idフィルタで絞り込める', async () => {
    const proj = db.prepare('INSERT INTO projects (name) VALUES (?)').run('プロジェクト');
    db.prepare('INSERT INTO tasks (title, project_id) VALUES (?, ?)').run('プロジェクトタスク', proj.lastInsertRowid);
    db.prepare('INSERT INTO tasks (title) VALUES (?)').run('独立タスク');
    const res = await request(app).get(`/api/tasks?project_id=${proj.lastInsertRowid}`);
    expect(res.status).toBe(200);
    expect(res.body.tasks).toHaveLength(1);
    expect(res.body.tasks[0].title).toBe('プロジェクトタスク');
  });
});

describe('POST /api/tasks', () => {
  test('正常作成で201を返す', async () => {
    const res = await request(app).post('/api/tasks').send({ title: '新タスク' });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('新タスク');
    expect(res.body.status).toBe('todo');
    expect(res.body.id).toBeDefined();
  });

  test('title未指定で400を返す', async () => {
    const res = await request(app).post('/api/tasks').send({});
    expect(res.status).toBe(400);
    expect(res.body.errors[0].field).toBe('title');
  });

  test('空文字titleで400を返す', async () => {
    const res = await request(app).post('/api/tasks').send({ title: '   ' });
    expect(res.status).toBe(400);
  });

  test('256文字超えのtitleで400を返す', async () => {
    const res = await request(app).post('/api/tasks').send({ title: 'a'.repeat(256) });
    expect(res.status).toBe(400);
  });

  test('due_dateつきで作成できる', async () => {
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const res = await request(app).post('/api/tasks').send({ title: '期限タスク', due_date: tomorrow });
    expect(res.status).toBe(201);
    expect(res.body.due_date).toBe(tomorrow);
  });

  test('過去のdue_dateで400を返す', async () => {
    const res = await request(app).post('/api/tasks').send({ title: '過去タスク', due_date: '2020-01-01' });
    expect(res.status).toBe(400);
    expect(res.body.errors[0].field).toBe('due_date');
  });

  test('project_idを紐付けて作成できる', async () => {
    const proj = db.prepare('INSERT INTO projects (name) VALUES (?)').run('PJ');
    const res = await request(app)
      .post('/api/tasks')
      .send({ title: 'PJタスク', project_id: proj.lastInsertRowid });
    expect(res.status).toBe(201);
    expect(res.body.project_id).toBe(proj.lastInsertRowid);
  });
});

describe('GET /api/tasks/:id', () => {
  test('存在するIDで200を返す', async () => {
    const result = db.prepare('INSERT INTO tasks (title) VALUES (?)').run('詳細タスク');
    const res = await request(app).get(`/api/tasks/${result.lastInsertRowid}`);
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('詳細タスク');
  });

  test('存在しないIDで404を返す', async () => {
    const res = await request(app).get('/api/tasks/999');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('タスクが見つかりません');
  });

  test('不正なIDで400を返す', async () => {
    const res = await request(app).get('/api/tasks/abc');
    expect(res.status).toBe(400);
  });
});

describe('PUT /api/tasks/:id', () => {
  test('正常更新で200を返す', async () => {
    const result = db.prepare('INSERT INTO tasks (title) VALUES (?)').run('旧タイトル');
    const res = await request(app)
      .put(`/api/tasks/${result.lastInsertRowid}`)
      .send({ title: '新タイトル' });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('新タイトル');
  });

  test('存在しないIDで404を返す', async () => {
    const res = await request(app).put('/api/tasks/999').send({ title: '更新' });
    expect(res.status).toBe(404);
  });

  test('title未指定で400を返す', async () => {
    const result = db.prepare('INSERT INTO tasks (title) VALUES (?)').run('タスク');
    const res = await request(app).put(`/api/tasks/${result.lastInsertRowid}`).send({});
    expect(res.status).toBe(400);
  });

  test('descriptionを更新できる', async () => {
    const result = db.prepare('INSERT INTO tasks (title) VALUES (?)').run('タスク');
    const res = await request(app)
      .put(`/api/tasks/${result.lastInsertRowid}`)
      .send({ title: 'タスク', description: '新しい説明' });
    expect(res.status).toBe(200);
    expect(res.body.description).toBe('新しい説明');
  });
});

describe('PATCH /api/tasks/:id/status', () => {
  test('正常なステータス変更で200を返す', async () => {
    const result = db.prepare('INSERT INTO tasks (title) VALUES (?)').run('タスク');
    const res = await request(app)
      .patch(`/api/tasks/${result.lastInsertRowid}/status`)
      .send({ status: 'in_progress' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('in_progress');
  });

  test('無効なstatusで400を返す', async () => {
    const result = db.prepare('INSERT INTO tasks (title) VALUES (?)').run('タスク');
    const res = await request(app)
      .patch(`/api/tasks/${result.lastInsertRowid}/status`)
      .send({ status: 'invalid' });
    expect(res.status).toBe(400);
    expect(res.body.errors[0].field).toBe('status');
  });

  test('存在しないIDで404を返す', async () => {
    const res = await request(app).patch('/api/tasks/999/status').send({ status: 'done' });
    expect(res.status).toBe(404);
  });

  test('todoからdoneに変更できる', async () => {
    const result = db.prepare('INSERT INTO tasks (title) VALUES (?)').run('タスク');
    const res = await request(app)
      .patch(`/api/tasks/${result.lastInsertRowid}/status`)
      .send({ status: 'done' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('done');
  });
});
