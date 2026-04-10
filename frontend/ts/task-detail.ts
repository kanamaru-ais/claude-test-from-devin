interface Task {
  id: number;
  title: string;
  description: string | null;
  status: string;
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

interface ApiErrorResponse {
  errors?: FieldError[];
  error?: string;
}

const taskId = window.location.pathname.split('/').at(-1) as string;

const errorBanner   = document.getElementById('errorBanner') as HTMLDivElement;
const loadingMsg    = document.getElementById('loadingMsg') as HTMLDivElement;
const taskContent   = document.getElementById('taskContent') as HTMLDivElement;
const taskTitleEl   = document.getElementById('taskTitle') as HTMLElement;
const taskDescEl    = document.getElementById('taskDescription') as HTMLElement;
const taskDueDateEl = document.getElementById('taskDueDate') as HTMLElement;
const taskCreatedAt = document.getElementById('taskCreatedAt') as HTMLElement;
const statusSelect  = document.getElementById('statusSelect') as HTMLSelectElement;
const statusError   = document.getElementById('statusError') as HTMLSpanElement;
const commentList   = document.getElementById('commentList') as HTMLDivElement;
const noComment     = document.getElementById('noComment') as HTMLDivElement;
const commentBody   = document.getElementById('commentBody') as HTMLTextAreaElement;
const commentError  = document.getElementById('commentError') as HTMLParagraphElement;

let taskProjectId: number | null = null;

// --- ユーティリティ ---
function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDatetime(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr.replace(' ', 'T'));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function showError(message: string): void {
  errorBanner.textContent = message;
  errorBanner.classList.remove('hidden');
  loadingMsg.classList.add('hidden');
}

// --- タスク取得・表示 ---
async function loadTask(): Promise<void> {
  try {
    const res = await fetch(`/api/tasks/${taskId}`);
    if (res.status === 404) {
      showError('タスクが見つかりません');
      return;
    }
    if (!res.ok) throw new Error('タスクの取得に失敗しました');

    const task = await res.json() as Task;
    taskProjectId = task.project_id;

    taskTitleEl.textContent = task.title;
    taskDescEl.textContent = task.description ?? '（なし）';
    taskDueDateEl.textContent = task.due_date ?? '（なし）';
    taskCreatedAt.textContent = formatDatetime(task.created_at);
    statusSelect.value = task.status;

    loadingMsg.classList.add('hidden');
    taskContent.classList.remove('hidden');

    await loadComments();
  } catch (e) {
    showError((e as Error).message);
  }
}

// --- コメント取得・表示 ---
async function loadComments(): Promise<void> {
  try {
    const res = await fetch(`/api/tasks/${taskId}/comments`);
    if (!res.ok) throw new Error('コメントの取得に失敗しました');
    const data = await res.json() as { comments: Comment[] };
    renderComments(data.comments);
  } catch (e) {
    showError((e as Error).message);
  }
}

function renderComments(comments: Comment[]): void {
  commentList.innerHTML = '';

  if (comments.length === 0) {
    noComment.classList.remove('hidden');
    return;
  }
  noComment.classList.add('hidden');

  comments.forEach((comment) => {
    commentList.appendChild(buildCommentEl(comment));
  });
}

function buildCommentEl(comment: Comment): HTMLDivElement {
  const div = document.createElement('div');
  div.className = 'comment-item';
  div.dataset.id = String(comment.id);

  div.innerHTML = `
    <div class="comment-meta">${formatDatetime(comment.created_at)}</div>
    <div class="comment-body">${escapeHtml(comment.body)}</div>
    <div class="comment-footer">
      <button class="btn btn-sm btn-secondary btn-comment-edit">編集</button>
      <button class="btn btn-sm btn-danger btn-comment-delete">削除</button>
    </div>
  `;

  (div.querySelector('.btn-comment-edit') as HTMLButtonElement).addEventListener('click', () => startEditComment(div, comment));
  (div.querySelector('.btn-comment-delete') as HTMLButtonElement).addEventListener('click', () => deleteComment(comment.id));

  return div;
}

function startEditComment(div: HTMLDivElement, comment: Comment): void {
  div.querySelector('.comment-edit-area')?.remove();

  const area = document.createElement('div');
  area.className = 'comment-edit-area';
  area.innerHTML = `
    <textarea class="edit-textarea" rows="3">${escapeHtml(comment.body)}</textarea>
    <p class="edit-error hidden"></p>
    <div class="edit-actions">
      <button class="btn btn-sm btn-secondary btn-edit-cancel">キャンセル</button>
      <button class="btn btn-sm btn-primary btn-edit-save">保存</button>
    </div>
  `;

  (div.querySelector('.comment-footer') as HTMLElement).classList.add('hidden');
  div.appendChild(area);

  const textarea = area.querySelector('.edit-textarea') as HTMLTextAreaElement;
  const editError = area.querySelector('.edit-error') as HTMLParagraphElement;
  textarea.focus();

  (area.querySelector('.btn-edit-cancel') as HTMLButtonElement).addEventListener('click', () => {
    area.remove();
    (div.querySelector('.comment-footer') as HTMLElement).classList.remove('hidden');
  });

  (area.querySelector('.btn-edit-save') as HTMLButtonElement).addEventListener('click', async () => {
    const body = textarea.value.trim();
    if (!body) {
      editError.textContent = 'コメント本文は必須です';
      editError.classList.remove('hidden');
      return;
    }

    try {
      const res = await fetch(`/api/tasks/${taskId}/comments/${comment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      });
      if (!res.ok) throw new Error('コメントの更新に失敗しました');
      await loadComments();
    } catch (e) {
      editError.textContent = (e as Error).message;
      editError.classList.remove('hidden');
    }
  });
}

async function deleteComment(commentId: number): Promise<void> {
  try {
    const res = await fetch(`/api/tasks/${taskId}/comments/${commentId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('コメントの削除に失敗しました');
    await loadComments();
  } catch (e) {
    showError((e as Error).message);
  }
}

// --- ステータス更新 ---
(document.getElementById('btnUpdateStatus') as HTMLButtonElement).addEventListener('click', async () => {
  statusError.classList.add('hidden');
  const status = statusSelect.value;

  try {
    const res = await fetch(`/api/tasks/${taskId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const data = await res.json() as ApiErrorResponse;
      statusError.textContent = data.errors?.[0]?.message ?? 'ステータスの更新に失敗しました';
      statusError.classList.remove('hidden');
    }
  } catch (_) {
    statusError.textContent = '通信エラーが発生しました';
    statusError.classList.remove('hidden');
  }
});

// --- コメント投稿 ---
(document.getElementById('btnPostComment') as HTMLButtonElement).addEventListener('click', async () => {
  commentError.classList.add('hidden');
  const body = commentBody.value.trim();

  if (!body) {
    commentError.textContent = 'コメント本文は必須です';
    commentError.classList.remove('hidden');
    return;
  }

  try {
    const res = await fetch(`/api/tasks/${taskId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body }),
    });
    if (!res.ok) {
      const data = await res.json() as ApiErrorResponse;
      commentError.textContent = data.errors?.[0]?.message ?? 'コメントの投稿に失敗しました';
      commentError.classList.remove('hidden');
      return;
    }
    commentBody.value = '';
    await loadComments();
  } catch (_) {
    commentError.textContent = '通信エラーが発生しました';
    commentError.classList.remove('hidden');
  }
});

// --- ナビゲーション ---
(document.getElementById('btnEdit') as HTMLButtonElement).addEventListener('click', () => {
  window.location.href = `/tasks/${taskId}/edit`;
});

(document.getElementById('btnBack') as HTMLButtonElement).addEventListener('click', () => {
  const backUrl = taskProjectId ? `/tasks?project_id=${taskProjectId}` : '/tasks';
  window.location.href = backUrl;
});

loadTask();

export {};
