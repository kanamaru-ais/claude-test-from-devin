import request from 'supertest';
import express from 'express';
import { createDb } from '../db';
import { makeTasksRouter } from '../routes/tasks';
import Database from 'better-sqlite3';

let app: express.Express;
let db: Database.Database;
let taskId: number;

beforeEach(() => {
  db = createDb(':memory:');
  app = express();
  app.use(express.json());
  app.use('/api/tasks', makeTasksRouter(db));

  const result = db.prepare('INSERT INTO tasks (title) VALUES (?)').run('テストタスク');
  taskId = result.lastInsertRowid as number;
});

afterEach(() => {
  db.close();
});

describe('GET /api/tasks/:id/comments', () => {
  test('空のとき空配列を返す', async () => {
    const res = await request(app).get(`/api/tasks/${taskId}/comments`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ comments: [] });
  });

  test('コメントを返す', async () => {
    db.prepare('INSERT INTO comments (task_id, body) VALUES (?, ?)').run(taskId, 'テストコメント');
    const res = await request(app).get(`/api/tasks/${taskId}/comments`);
    expect(res.status).toBe(200);
    expect(res.body.comments).toHaveLength(1);
    expect(res.body.comments[0].body).toBe('テストコメント');
  });

  test('存在しないタスクIDで404を返す', async () => {
    const res = await request(app).get('/api/tasks/999/comments');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('タスクが見つかりません');
  });

  test('不正なIDで400を返す', async () => {
    const res = await request(app).get('/api/tasks/abc/comments');
    expect(res.status).toBe(400);
  });
});

describe('POST /api/tasks/:id/comments', () => {
  test('正常作成で201を返す', async () => {
    const res = await request(app)
      .post(`/api/tasks/${taskId}/comments`)
      .send({ body: '新コメント' });
    expect(res.status).toBe(201);
    expect(res.body.body).toBe('新コメント');
    expect(res.body.task_id).toBe(taskId);
    expect(res.body.id).toBeDefined();
  });

  test('body未指定で400を返す', async () => {
    const res = await request(app).post(`/api/tasks/${taskId}/comments`).send({});
    expect(res.status).toBe(400);
    expect(res.body.errors[0].field).toBe('body');
  });

  test('空文字bodyで400を返す', async () => {
    const res = await request(app).post(`/api/tasks/${taskId}/comments`).send({ body: '   ' });
    expect(res.status).toBe(400);
  });

  test('存在しないタスクIDで404を返す', async () => {
    const res = await request(app).post('/api/tasks/999/comments').send({ body: 'コメント' });
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/tasks/:id/comments/:commentId', () => {
  test('正常編集で200を返す', async () => {
    const result = db.prepare('INSERT INTO comments (task_id, body) VALUES (?, ?)').run(taskId, '元コメント');
    const commentId = result.lastInsertRowid;

    const res = await request(app)
      .put(`/api/tasks/${taskId}/comments/${commentId}`)
      .send({ body: '編集後コメント' });
    expect(res.status).toBe(200);
    expect(res.body.body).toBe('編集後コメント');
  });

  test('存在しないコメントIDで404を返す', async () => {
    const res = await request(app).put(`/api/tasks/${taskId}/comments/999`).send({ body: '編集' });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('コメントが見つかりません');
  });

  test('別タスクのコメントIDで404を返す', async () => {
    const other = db.prepare('INSERT INTO tasks (title) VALUES (?)').run('別タスク');
    const result = db.prepare('INSERT INTO comments (task_id, body) VALUES (?, ?)').run(other.lastInsertRowid, '別コメント');

    const res = await request(app)
      .put(`/api/tasks/${taskId}/comments/${result.lastInsertRowid}`)
      .send({ body: '編集' });
    expect(res.status).toBe(404);
  });

  test('body未指定で400を返す', async () => {
    const result = db.prepare('INSERT INTO comments (task_id, body) VALUES (?, ?)').run(taskId, 'コメント');
    const res = await request(app)
      .put(`/api/tasks/${taskId}/comments/${result.lastInsertRowid}`)
      .send({});
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/tasks/:id/comments/:commentId', () => {
  test('正常削除で204を返す', async () => {
    const result = db.prepare('INSERT INTO comments (task_id, body) VALUES (?, ?)').run(taskId, '削除対象');
    const res = await request(app).delete(`/api/tasks/${taskId}/comments/${result.lastInsertRowid}`);
    expect(res.status).toBe(204);
  });

  test('削除後にGETで取得できない', async () => {
    const result = db.prepare('INSERT INTO comments (task_id, body) VALUES (?, ?)').run(taskId, '消えるコメント');
    const commentId = result.lastInsertRowid;
    await request(app).delete(`/api/tasks/${taskId}/comments/${commentId}`);

    const res = await request(app).get(`/api/tasks/${taskId}/comments`);
    expect(res.body.comments).toHaveLength(0);
  });

  test('存在しないコメントIDで404を返す', async () => {
    const res = await request(app).delete(`/api/tasks/${taskId}/comments/999`);
    expect(res.status).toBe(404);
  });

  test('タスク削除でコメントもカスケード削除される', async () => {
    db.prepare('INSERT INTO comments (task_id, body) VALUES (?, ?)').run(taskId, 'カスケードテスト');
    db.prepare('DELETE FROM tasks WHERE id = ?').run(taskId);
    const comments = db.prepare('SELECT * FROM comments WHERE task_id = ?').all(taskId);
    expect(comments).toHaveLength(0);
  });
});
