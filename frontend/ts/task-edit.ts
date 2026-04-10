import { validateTaskTitle } from './utils';

interface Task {
  id: number;
  title: string;
  description: string | null;
}

interface FieldError {
  field: string;
  message: string;
}

interface ApiErrorResponse {
  errors?: FieldError[];
  error?: string;
}

const pathParts = window.location.pathname.split('/');
const taskId = pathParts[pathParts.length - 2];

const taskForm  = document.getElementById('taskForm') as HTMLFormElement;
const taskTitle = document.getElementById('taskTitle') as HTMLInputElement;
const taskDesc  = document.getElementById('taskDescription') as HTMLTextAreaElement;
const titleError  = document.getElementById('titleError') as HTMLParagraphElement;
const errorBanner = document.getElementById('errorBanner') as HTMLDivElement;
const btnSubmit   = document.getElementById('btnSubmit') as HTMLButtonElement;

// --- 既存タスクを読み込む ---
async function loadTask(): Promise<void> {
  try {
    const res = await fetch(`/api/tasks/${taskId}`);
    if (res.status === 404) {
      errorBanner.textContent = 'タスクが見つかりません';
      errorBanner.classList.remove('hidden');
      taskForm.classList.add('hidden');
      return;
    }
    if (!res.ok) throw new Error('タスクの取得に失敗しました');

    const task = await res.json() as Task;
    taskTitle.value = task.title;
    taskDesc.value = task.description ?? '';
  } catch (e) {
    errorBanner.textContent = (e as Error).message;
    errorBanner.classList.remove('hidden');
  }
}

// --- バリデーション ---
function validateForm(): boolean {
  const titleErr = validateTaskTitle(taskTitle.value);
  if (titleErr) {
    titleError.textContent = titleErr;
    titleError.classList.remove('hidden');
    taskTitle.classList.add('is-invalid');
    return false;
  }
  titleError.classList.add('hidden');
  taskTitle.classList.remove('is-invalid');
  return true;
}

// --- 送信 ---
taskForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorBanner.classList.add('hidden');

  if (!validateForm()) return;

  const body = {
    title: taskTitle.value.trim(),
    description: taskDesc.value || null,
  };

  btnSubmit.disabled = true;
  try {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json() as ApiErrorResponse;
      if (data.errors) {
        const titleErr = data.errors.find((err) => err.field === 'title');
        if (titleErr) {
          titleError.textContent = titleErr.message;
          titleError.classList.remove('hidden');
          taskTitle.classList.add('is-invalid');
        }
      } else {
        errorBanner.textContent = data.error ?? 'エラーが発生しました';
        errorBanner.classList.remove('hidden');
      }
      return;
    }

    window.location.href = `/tasks/${taskId}`;
  } catch (_) {
    errorBanner.textContent = '通信エラーが発生しました';
    errorBanner.classList.remove('hidden');
  } finally {
    btnSubmit.disabled = false;
  }
});

// --- キャンセル ---
(document.getElementById('btnCancel') as HTMLButtonElement).addEventListener('click', () => {
  window.location.href = `/tasks/${taskId}`;
});

loadTask();

export {};
