interface FieldError {
  field: string;
  message: string;
}

interface ApiErrorResponse {
  errors?: FieldError[];
  error?: string;
}

const params = new URLSearchParams(window.location.search);
const projectId = params.get('project_id');

const taskForm        = document.getElementById('taskForm') as HTMLFormElement;
const taskTitle       = document.getElementById('taskTitle') as HTMLInputElement;
const taskDescription = document.getElementById('taskDescription') as HTMLTextAreaElement;
const taskDueDate     = document.getElementById('taskDueDate') as HTMLInputElement;
const titleError      = document.getElementById('titleError') as HTMLParagraphElement;
const dueDateError    = document.getElementById('dueDateError') as HTMLParagraphElement;
const errorBanner     = document.getElementById('errorBanner') as HTMLDivElement;
const btnSubmit       = document.getElementById('btnSubmit') as HTMLButtonElement;

// --- バリデーション ---
function validateForm(): boolean {
  let valid = true;

  const title = taskTitle.value.trim();
  if (title.length === 0) {
    showFieldError(titleError, taskTitle, 'タイトルは必須です');
    valid = false;
  } else if (title.length > 255) {
    showFieldError(titleError, taskTitle, 'タイトルは255文字以内で入力してください');
    valid = false;
  } else {
    clearFieldError(titleError, taskTitle);
  }

  const dueDate = taskDueDate.value;
  if (dueDate) {
    const today = new Date().toISOString().split('T')[0];
    if (dueDate < today) {
      showFieldError(dueDateError, taskDueDate, '期限は今日以降の日付を指定してください');
      valid = false;
    } else {
      clearFieldError(dueDateError, taskDueDate);
    }
  } else {
    clearFieldError(dueDateError, taskDueDate);
  }

  return valid;
}

function showFieldError(errorEl: HTMLElement, inputEl: HTMLElement, message: string): void {
  errorEl.textContent = message;
  errorEl.classList.remove('hidden');
  inputEl.classList.add('is-invalid');
}

function clearFieldError(errorEl: HTMLElement, inputEl: HTMLElement): void {
  errorEl.textContent = '';
  errorEl.classList.add('hidden');
  inputEl.classList.remove('is-invalid');
}

// --- 送信 ---
taskForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorBanner.classList.add('hidden');

  if (!validateForm()) return;

  const body: Record<string, unknown> = {
    title: taskTitle.value.trim(),
    description: taskDescription.value || null,
    due_date: taskDueDate.value || null,
  };
  if (projectId) body.project_id = Number(projectId);

  btnSubmit.disabled = true;
  try {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json() as ApiErrorResponse;
      if (data.errors) {
        data.errors.forEach((err) => {
          if (err.field === 'title') showFieldError(titleError, taskTitle, err.message);
          if (err.field === 'due_date') showFieldError(dueDateError, taskDueDate, err.message);
        });
      } else {
        errorBanner.textContent = data.error ?? 'エラーが発生しました';
        errorBanner.classList.remove('hidden');
      }
      return;
    }

    const backUrl = projectId ? `/tasks?project_id=${projectId}` : '/tasks';
    window.location.href = backUrl;
  } catch (_) {
    errorBanner.textContent = '通信エラーが発生しました';
    errorBanner.classList.remove('hidden');
  } finally {
    btnSubmit.disabled = false;
  }
});

// --- キャンセル ---
(document.getElementById('btnCancel') as HTMLButtonElement).addEventListener('click', () => {
  const backUrl = projectId ? `/tasks?project_id=${projectId}` : '/tasks';
  window.location.href = backUrl;
});

export {};
