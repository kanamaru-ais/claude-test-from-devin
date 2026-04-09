import express from 'express';
import cors from 'cors';
import path from 'path';
import { db } from './db';
import { makeProjectsRouter } from './routes/projects';
import { makeTasksRouter } from './routes/tasks';

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const FRONTEND = path.join(__dirname, '..', '..', 'frontend');

app.use(cors());
app.use(express.json());

// フロントエンド静的ファイル配信
app.use(express.static(FRONTEND));

// API ルート
app.use('/api/projects', makeProjectsRouter(db));
app.use('/api/tasks', makeTasksRouter(db));

// フロントエンドルート
app.get('/', (_req, res) => res.redirect('/projects'));
app.get('/projects', (_req, res) => res.sendFile('projects.html', { root: FRONTEND }));
app.get('/tasks', (_req, res) => res.sendFile('tasks.html', { root: FRONTEND }));
app.get('/tasks/new', (_req, res) => res.sendFile('task-new.html', { root: FRONTEND }));
app.get('/tasks/:id/edit', (_req, res) => res.sendFile('task-edit.html', { root: FRONTEND }));
app.get('/tasks/:id', (_req, res) => res.sendFile('task-detail.html', { root: FRONTEND }));

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`サーバー起動: http://localhost:${PORT}`);
  });
}

export default app;
