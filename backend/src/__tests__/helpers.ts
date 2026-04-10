import express from 'express';
import { createDb } from '../db';
import { makeProjectsRouter } from '../routes/projects';
import { makeTasksRouter } from '../routes/tasks';
import Database from 'better-sqlite3';

export function createTestApp(): { app: express.Express; db: Database.Database } {
  const db = createDb(':memory:');
  const app = express();
  app.use(express.json());
  app.use('/api/projects', makeProjectsRouter(db));
  app.use('/api/tasks', makeTasksRouter(db));
  return { app, db };
}
