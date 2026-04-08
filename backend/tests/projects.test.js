const request = require('supertest');
const path = require('path');
const express = require('express');
const { createDb } = require('../db');
const makeProjectsRouter = require('../routes/projects');

let app;
let db;

beforeEach(() => {
  db = createDb(':memory:');
  app = express();
  app.use(express.json());
  app.use('/api/projects', makeProjectsRouter(db));
});

afterEach(() => {
  db.close();
});

describe('GET /api/projects', () => {
  test('空のとき空配列を返す', async () => {
    const res = await request(app).get('/api/projects');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ projects: [] });
  });

  test('作成済みプロジェクトを返す', async () => {
    db.prepare("INSERT INTO projects (name) VALUES (?)").run('テストプロジェクト');
    const res = await request(app).get('/api/projects');
    expect(res.status).toBe(200);
    expect(res.body.projects).toHaveLength(1);
    expect(res.body.projects[0].name).toBe('テストプロジェクト');
  });
});

describe('GET /api/projects/:id', () => {
  test('存在するIDで200を返す', async () => {
    const result = db.prepare("INSERT INTO projects (name) VALUES (?)").run('プロジェクトA');
    const res = await request(app).get(`/api/projects/${result.lastInsertRowid}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('プロジェクトA');
  });

  test('存在しないIDで404を返す', async () => {
    const res = await request(app).get('/api/projects/999');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('プロジェクトが見つかりません');
  });

  test('不正なIDで400を返す', async () => {
    const res = await request(app).get('/api/projects/abc');
    expect(res.status).toBe(400);
    expect(res.body.errors[0].field).toBe('id');
  });

  test('ゼロのIDで400を返す', async () => {
    const res = await request(app).get('/api/projects/0');
    expect(res.status).toBe(400);
  });
});

describe('POST /api/projects', () => {
  test('正常作成で201を返す', async () => {
    const res = await request(app)
      .post('/api/projects')
      .send({ name: '新プロジェクト' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('新プロジェクト');
    expect(res.body.id).toBeDefined();
  });

  test('name未指定で400を返す', async () => {
    const res = await request(app).post('/api/projects').send({});
    expect(res.status).toBe(400);
    expect(res.body.errors[0].field).toBe('name');
  });

  test('空文字nameで400を返す', async () => {
    const res = await request(app).post('/api/projects').send({ name: '   ' });
    expect(res.status).toBe(400);
  });

  test('256文字超えのnameで400を返す', async () => {
    const res = await request(app)
      .post('/api/projects')
      .send({ name: 'a'.repeat(256) });
    expect(res.status).toBe(400);
  });
});

describe('PUT /api/projects/:id', () => {
  test('正常更新で200を返す', async () => {
    const result = db.prepare("INSERT INTO projects (name) VALUES (?)").run('旧名前');
    const res = await request(app)
      .put(`/api/projects/${result.lastInsertRowid}`)
      .send({ name: '新名前' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('新名前');
  });

  test('存在しないIDで404を返す', async () => {
    const res = await request(app)
      .put('/api/projects/999')
      .send({ name: '更新名' });
    expect(res.status).toBe(404);
  });

  test('name未指定で400を返す', async () => {
    const result = db.prepare("INSERT INTO projects (name) VALUES (?)").run('プロジェクト');
    const res = await request(app)
      .put(`/api/projects/${result.lastInsertRowid}`)
      .send({});
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/projects/:id', () => {
  test('正常削除で204を返す', async () => {
    const result = db.prepare("INSERT INTO projects (name) VALUES (?)").run('削除対象');
    const res = await request(app).delete(`/api/projects/${result.lastInsertRowid}`);
    expect(res.status).toBe(204);
  });

  test('存在しないIDで404を返す', async () => {
    const res = await request(app).delete('/api/projects/999');
    expect(res.status).toBe(404);
  });

  test('削除後にGETで取得できない', async () => {
    const result = db.prepare("INSERT INTO projects (name) VALUES (?)").run('消えるプロジェクト');
    const id = result.lastInsertRowid;
    await request(app).delete(`/api/projects/${id}`);
    const res = await request(app).get(`/api/projects/${id}`);
    expect(res.status).toBe(404);
  });

  test('プロジェクト削除でタスクもカスケード削除される', async () => {
    const proj = db.prepare("INSERT INTO projects (name) VALUES (?)").run('カスケードテスト');
    db.prepare("INSERT INTO tasks (title, project_id) VALUES (?, ?)").run('タスク1', proj.lastInsertRowid);
    await request(app).delete(`/api/projects/${proj.lastInsertRowid}`);
    const tasks = db.prepare('SELECT * FROM tasks WHERE project_id = ?').all(proj.lastInsertRowid);
    expect(tasks).toHaveLength(0);
  });
});
