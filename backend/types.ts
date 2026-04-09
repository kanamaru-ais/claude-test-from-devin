export interface Project {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: number;
  title: string;
  description: string | null;
  status: string;
  due_date: string | null;
  project_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: number;
  task_id: number;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface ValidationError {
  field: string;
  message: string;
}
