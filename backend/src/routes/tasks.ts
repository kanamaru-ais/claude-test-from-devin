import { Router, Request, Response } from 'express';
import Database from 'better-sqlite3';

const VALID_STATUSES = ['todo', 'in_progress', 'done'] as const;
type Status = typeof VALID_STATUSES[number];

interface Task {
  id: number;
  title: string;
  description: string | null;
  status: Status;
  due_date: string | null;
  project_id: number | null;
  created_at: string;
  updated_at: string;
}

interface Comment {
  id: number;
  task_id: number;
  body: string;
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

function validateTitle(title: unknown): FieldError[] {
  const errors: FieldError[] = [];
  if (!title || String(title).trim().length === 0) {
    errors.push({ field: 'title', message: 'タイトルは必須です' });
  } else if (String(title).trim().length > 255) {
    errors.push({ field: 'title', message: 'タイトルは255文字以内で入力してください' });
  }
  return errors;
}

function validateDueDate(dueDate: unknown): FieldError[] {
  if (!dueDate) return [];
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(String(dueDate))) {
    return [{ field: 'due_date', message: '期限の形式が正しくありません (YYYY-MM-DD)' }];
  }
  const today = new Date().toISOString().split('T')[0];
  if (String(dueDate) < today) {
    return [{ field: 'due_date', message: '期限は今日以降の日付を指定してください' }];
  }
  return [];
}

export function makeTasksRouter(db: Database.Database): Router {
  const router = Router();

  // GET /api/tasks - 一覧取得
  router.get('/', (req: Request, res: Response) => {
    let query = 'SELECT * FROM tasks';
    const params: (string | number)[] = [];
    const conditions: string[] = [];

    if (req.query.status && VALID_STATUSES.includes(req.query.status as Status)) {
      conditions.push('status = ?');
      params.push(req.query.status as string);
    }
    if (req.query.project_id) {
      const projectId = validateId(req.query.project_id as string);
      if (projectId) {
        conditions.push('project_id = ?');
        params.push(projectId);
      }
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY id';

    const tasks = db.prepare(query).all(...params) as Task[];
    res.json({ tasks });
  });

  // POST /api/tasks - 作成
  router.post('/', (req: Request, res: Response) => {
    const errors: FieldError[] = [
      ...validateTitle(req.body.title),
      ...validateDueDate(req.body.due_date),
    ];
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const title = String(req.body.title).trim();
    const description: string | null = req.body.description ? String(req.body.description) : null;
    const dueDate: string | null = req.body.due_date ?? null;
    const projectId: number | null = req.body.project_id ? validateId(String(req.body.project_id)) : null;

    const result = db.prepare(
      'INSERT INTO tasks (title, description, due_date, project_id) VALUES (?, ?, ?, ?)'
    ).run(title, description, dueDate, projectId);

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid) as Task;
    return res.status(201).json(task);
  });

  // GET /api/tasks/:id - 詳細取得
  router.get('/:id', (req: Request, res: Response) => {
    const id = validateId(req.params.id);
    if (!id) {
      return res.status(400).json({
        errors: [{ field: 'id', message: 'タスクIDは正の整数で指定してください' }],
      });
    }

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Task | undefined;
    if (!task) {
      return res.status(404).json({ error: 'タスクが見つかりません' });
    }

    return res.json(task);
  });

  // PUT /api/tasks/:id - 更新
  router.put('/:id', (req: Request, res: Response) => {
    const id = validateId(req.params.id);
    if (!id) {
      return res.status(400).json({
        errors: [{ field: 'id', message: 'タスクIDは正の整数で指定してください' }],
      });
    }

    const existing = db.prepare('SELECT id FROM tasks WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'タスクが見つかりません' });
    }

    const errors = validateTitle(req.body.title);
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const title = String(req.body.title).trim();
    const description: string | null = req.body.description !== undefined
      ? (req.body.description ? String(req.body.description) : null)
      : null;

    db.prepare(
      "UPDATE tasks SET title = ?, description = ?, updated_at = datetime('now', 'localtime') WHERE id = ?"
    ).run(title, description, id);

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Task;
    return res.json(task);
  });

  // PATCH /api/tasks/:id/status - ステータス変更
  router.patch('/:id/status', (req: Request, res: Response) => {
    const id = validateId(req.params.id);
    if (!id) {
      return res.status(400).json({
        errors: [{ field: 'id', message: 'タスクIDは正の整数で指定してください' }],
      });
    }

    const existing = db.prepare('SELECT id FROM tasks WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'タスクが見つかりません' });
    }

    const { status } = req.body as { status: unknown };
    if (!status || !VALID_STATUSES.includes(status as Status)) {
      return res.status(400).json({
        errors: [{ field: 'status', message: 'ステータスは todo, in_progress, done のいずれかを指定してください' }],
      });
    }

    db.prepare(
      "UPDATE tasks SET status = ?, updated_at = datetime('now', 'localtime') WHERE id = ?"
    ).run(status as string, id);

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Task;
    return res.json(task);
  });

  // GET /api/tasks/:id/comments - コメント一覧取得
  router.get('/:id/comments', (req: Request, res: Response) => {
    const id = validateId(req.params.id);
    if (!id) {
      return res.status(400).json({
        errors: [{ field: 'id', message: 'タスクIDは正の整数で指定してください' }],
      });
    }

    const task = db.prepare('SELECT id FROM tasks WHERE id = ?').get(id);
    if (!task) {
      return res.status(404).json({ error: 'タスクが見つかりません' });
    }

    const comments = db.prepare('SELECT * FROM comments WHERE task_id = ? ORDER BY id').all(id) as Comment[];
    return res.json({ comments });
  });

  // POST /api/tasks/:id/comments - コメント投稿
  router.post('/:id/comments', (req: Request, res: Response) => {
    const id = validateId(req.params.id);
    if (!id) {
      return res.status(400).json({
        errors: [{ field: 'id', message: 'タスクIDは正の整数で指定してください' }],
      });
    }

    const task = db.prepare('SELECT id FROM tasks WHERE id = ?').get(id);
    if (!task) {
      return res.status(404).json({ error: 'タスクが見つかりません' });
    }

    const { body } = req.body as { body: unknown };
    if (!body || String(body).trim().length === 0) {
      return res.status(400).json({
        errors: [{ field: 'body', message: 'コメント本文は必須です' }],
      });
    }

    const result = db.prepare('INSERT INTO comments (task_id, body) VALUES (?, ?)').run(id, String(body).trim());
    const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(result.lastInsertRowid) as Comment;
    return res.status(201).json(comment);
  });

  // PUT /api/tasks/:id/comments/:commentId - コメント編集
  router.put('/:id/comments/:commentId', (req: Request, res: Response) => {
    const id = validateId(req.params.id);
    const commentId = validateId(req.params.commentId);

    if (!id || !commentId) {
      return res.status(400).json({
        errors: [{ field: 'id', message: 'IDは正の整数で指定してください' }],
      });
    }

    const comment = db.prepare('SELECT * FROM comments WHERE id = ? AND task_id = ?').get(commentId, id) as Comment | undefined;
    if (!comment) {
      return res.status(404).json({ error: 'コメントが見つかりません' });
    }

    const { body } = req.body as { body: unknown };
    if (!body || String(body).trim().length === 0) {
      return res.status(400).json({
        errors: [{ field: 'body', message: 'コメント本文は必須です' }],
      });
    }

    db.prepare(
      "UPDATE comments SET body = ?, updated_at = datetime('now', 'localtime') WHERE id = ?"
    ).run(String(body).trim(), commentId);

    const updated = db.prepare('SELECT * FROM comments WHERE id = ?').get(commentId) as Comment;
    return res.json(updated);
  });

  // DELETE /api/tasks/:id/comments/:commentId - コメント削除
  router.delete('/:id/comments/:commentId', (req: Request, res: Response) => {
    const id = validateId(req.params.id);
    const commentId = validateId(req.params.commentId);

    if (!id || !commentId) {
      return res.status(400).json({
        errors: [{ field: 'id', message: 'IDは正の整数で指定してください' }],
      });
    }

    const comment = db.prepare('SELECT * FROM comments WHERE id = ? AND task_id = ?').get(commentId, id);
    if (!comment) {
      return res.status(404).json({ error: 'コメントが見つかりません' });
    }

    db.prepare('DELETE FROM comments WHERE id = ?').run(commentId);
    return res.status(204).send();
  });

  return router;
}
