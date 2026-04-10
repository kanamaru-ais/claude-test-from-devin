import { Router, Request, Response } from 'express';
import Database from 'better-sqlite3';

interface Project {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

interface FieldError {
  field: string;
  message: string;
}

function validateId(id: string | string[]): number | null {
  const num = Number(Array.isArray(id) ? id[0] : id);
  return Number.isInteger(num) && num > 0 ? num : null;
}

function validateName(name: unknown): FieldError[] {
  const errors: FieldError[] = [];
  if (!name || String(name).trim().length === 0) {
    errors.push({ field: 'name', message: 'プロジェクト名は必須です' });
  } else if (String(name).trim().length > 255) {
    errors.push({ field: 'name', message: 'プロジェクト名は255文字以内で入力してください' });
  }
  return errors;
}

export function makeProjectsRouter(db: Database.Database): Router {
  const router = Router();

  // GET /api/projects - 一覧取得
  router.get('/', (_req: Request, res: Response) => {
    const projects = db.prepare('SELECT * FROM projects ORDER BY id').all() as Project[];
    res.json({ projects });
  });

  // GET /api/projects/:id - 詳細取得
  router.get('/:id', (req: Request, res: Response) => {
    const id = validateId(req.params.id);
    if (!id) {
      return res.status(400).json({
        errors: [{ field: 'id', message: 'プロジェクトIDは正の整数で指定してください' }],
      });
    }

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as Project | undefined;
    if (!project) {
      return res.status(404).json({ error: 'プロジェクトが見つかりません' });
    }

    return res.json(project);
  });

  // POST /api/projects - 作成
  router.post('/', (req: Request, res: Response) => {
    const errors = validateName(req.body.name);
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const name = String(req.body.name).trim();
    const result = db.prepare('INSERT INTO projects (name) VALUES (?)').run(name);
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid) as Project;
    return res.status(201).json(project);
  });

  // PUT /api/projects/:id - 更新
  router.put('/:id', (req: Request, res: Response) => {
    const id = validateId(req.params.id);
    if (!id) {
      return res.status(400).json({
        errors: [{ field: 'id', message: 'プロジェクトIDは正の整数で指定してください' }],
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
    db.prepare("UPDATE projects SET name = ?, updated_at = datetime('now', 'localtime') WHERE id = ?").run(name, id);

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as Project;
    return res.json(project);
  });

  // DELETE /api/projects/:id - 削除
  router.delete('/:id', (req: Request, res: Response) => {
    const id = validateId(req.params.id);
    if (!id) {
      return res.status(400).json({
        errors: [{ field: 'id', message: 'プロジェクトIDは正の整数で指定してください' }],
      });
    }

    const existing = db.prepare('SELECT id FROM projects WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'プロジェクトが見つかりません' });
    }

    db.prepare('DELETE FROM projects WHERE id = ?').run(id);
    return res.status(204).send();
  });

  return router;
}
