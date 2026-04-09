import express from 'express';
import cors from 'cors';
import path from 'path';
import { db } from './db';
import makeProjectsRouter from './routes/projects';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// フロントエンド静的ファイル配信
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// API ルート
app.use('/api/projects', makeProjectsRouter(db));

// フロントエンドルート
app.get('/', (req, res) => {
  res.redirect('/projects.html');
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`サーバー起動: http://localhost:${PORT}`);
  });
}

export default app;
