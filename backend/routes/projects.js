const express = require('express');

function validateId(id) {
  const num = Number(id);
  return Number.isInteger(num) && num > 0 ? num : null;
}

function validateName(name) {
  const errors = [];
  if (!name || String(name).trim().length === 0) {
    errors.push({ field: 'name', message: 'プロジェクト名は必須です' });
  } else if (String(name).trim().length > 255) {
    errors.push({ field: 'name', message: 'プロジェクト名は255文字以内で入力してください' });
  }
  return errors;
}

function makeRouter(db) {
  const router = express.Router();

  // GET /api/projects - 一覧取得
  router.get('/', (req, res) => {
    const projects = db.prepare('SELECT * FROM projects ORDER BY id').all();
    res.json({ projects });
  });

  // GET /api/projects/:id - 詳細取得
  router.get('/:id', (req, res) => {
    const id = validateId(req.params.id);
    if (!id) {
      return res.status(400).json({
        errors: [{ field: 'id', message: 'プロジェクトIDは正の整数で指定してください' }]
      });
    }

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    if (!project) {
      return res.status(404).json({ error: 'プロジェクトが見つかりません' });
    }

    res.json(project);
  });

  // POST /api/projects - 作成
  router.post('/', (req, res) => {
    const errors = validateName(req.body.name);
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const name = String(req.body.name).trim();
    const result = db.prepare(
      'INSERT INTO projects (name) VALUES (?)'
    ).run(name);

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(project);
  });

  // PUT /api/projects/:id - 更新
  router.put('/:id', (req, res) => {
    const id = validateId(req.params.id);
    if (!id) {
      return res.status(400).json({
        errors: [{ field: 'id', message: 'プロジェクトIDは正の整数で指定してください' }]
      });
    }

    const existing = db.prepare('SELECT id FROM projects WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'プロジェクトが見つかりません' });
    }

    const errors = validateName(req.body.name);
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const name = String(req.body.name).trim();
    db.prepare(
      "UPDATE projects SET name = ?, updated_at = datetime('now', 'localtime') WHERE id = ?"
    ).run(name, id);

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    res.json(project);
  });

  // DELETE /api/projects/:id - 削除
  router.delete('/:id', (req, res) => {
    const id = validateId(req.params.id);
    if (!id) {
      return res.status(400).json({
        errors: [{ field: 'id', message: 'プロジェクトIDは正の整数で指定してください' }]
      });
    }

    const existing = db.prepare('SELECT id FROM projects WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'プロジェクトが見つかりません' });
    }

    db.prepare('DELETE FROM projects WHERE id = ?').run(id);
    res.status(204).send();
  });

  return router;
}

module.exports = makeRouter;
