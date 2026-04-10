import { escapeHtml } from './utils';

interface Task {
  id: number;
  title: string;
  status: 'todo' | 'in_progress' | 'done';
  due_date: string | null;
  project_id: number | null;
}

const params = new URLSearchParams(window.location.search);
const projectId = params.get('project_id');

const taskTbody    = document.getElementById('taskTbody') as HTMLTableSectionElement;
const rowEmpty     = document.getElementById('rowEmpty') as HTMLTableRowElement;
const errorBanner  = document.getElementById('errorBanner') as HTMLDivElement;
const statusFilter = document.getElementById('statusFilter') as HTMLSelectElement;
const pageTitle    = document.getElementById('pageTitle') as HTMLHeadingElement;

const STATUS_LABELS: Record<string, string> = {
  todo: '起票',
  in_progress: '進行中',
  done: '完了',
};

// --- 初期化 ---
if (projectId) {
  fetchProjectName(projectId);
}

// --- API ---
async function fetchTasks(status: string): Promise<Task[]> {
  const query = new URLSearchParams();
  if (status) query.set('status', status);
  if (projectId) query.set('project_id', projectId);

  const res = await fetch(`/api/tasks?${query}`);
  if (!res.ok) throw new Error('タスク一覧の取得に失敗しました');
  const data = await res.json() as { tasks: Task[] };
  return data.tasks;
}

async function fetchProjectName(id: string): Promise<void> {
  try {
    const res = await fetch(`/api/projects/${id}`);
    if (res.ok) {
      const proj = await res.json() as { name: string };
      pageTitle.textContent = `タスク一覧 - ${proj.name}`;
    }
  } catch (_) {
    // プロジェクト名取得失敗は無視
  }
}

// --- 表示 ---
function renderTasks(tasks: Task[]): void {
  taskTbody.querySelectorAll('tr.task-row').forEach((r) => r.remove());

  if (tasks.length === 0) {
    rowEmpty.classList.remove('hidden');
    return;
  }

  rowEmpty.classList.add('hidden');
  tasks.forEach((task, index) => {
    const tr = document.createElement('tr');
    tr.className = 'task-row';
    tr.dataset.id = String(task.id);

    const label = STATUS_LABELS[task.status] ?? task.status;
    const badgeClass = `badge-${task.status}`;

    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${escapeHtml(task.title)}</td>
      <td><span class="badge ${badgeClass}">${label}</span></td>
      <td>${task.due_date ?? ''}</td>
    `;

    tr.addEventListener('click', () => {
      window.location.href = `/tasks/${task.id}`;
    });

    taskTbody.appendChild(tr);
  });
}

function showErrorBanner(message: string): void {
  errorBanner.textContent = message;
  errorBanner.classList.remove('hidden');
}

async function reloadTasks(): Promise<void> {
  try {
    const tasks = await fetchTasks(statusFilter.value);
    renderTasks(tasks);
  } catch (e) {
    showErrorBanner((e as Error).message);
  }
}

// --- イベント ---
statusFilter.addEventListener('change', reloadTasks);

(document.getElementById('btnCreate') as HTMLButtonElement).addEventListener('click', () => {
  const query = projectId ? `?project_id=${projectId}` : '';
  window.location.href = `/tasks/new${query}`;
});

reloadTasks();

export {};
