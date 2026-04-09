const taskId = window.location.pathname.split('/').at(-1);
const errorBanner = document.getElementById('errorBanner');
const loadingMsg = document.getElementById('loadingMsg');
const taskContent = document.getElementById('taskContent');
const taskTitleEl = document.getElementById('taskTitle');
const taskDescEl = document.getElementById('taskDescription');
const taskDueDateEl = document.getElementById('taskDueDate');
const taskCreatedAt = document.getElementById('taskCreatedAt');
const statusSelect = document.getElementById('statusSelect');
const statusError = document.getElementById('statusError');
const commentList = document.getElementById('commentList');
const noComment = document.getElementById('noComment');
const commentBody = document.getElementById('commentBody');
const commentError = document.getElementById('commentError');
let taskProjectId = null;
// --- ユーティリティ ---
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
function formatDatetime(dateStr) {
    if (!dateStr)
        return '';
    const d = new Date(dateStr.replace(' ', 'T'));
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function showError(message) {
    errorBanner.textContent = message;
    errorBanner.classList.remove('hidden');
    loadingMsg.classList.add('hidden');
}
// --- タスク取得・表示 ---
async function loadTask() {
    try {
        const res = await fetch(`/api/tasks/${taskId}`);
        if (res.status === 404) {
            showError('タスクが見つかりません');
            return;
        }
        if (!res.ok)
            throw new Error('タスクの取得に失敗しました');
        const task = await res.json();
        taskProjectId = task.project_id;
        taskTitleEl.textContent = task.title;
        taskDescEl.textContent = task.description ?? '（なし）';
        taskDueDateEl.textContent = task.due_date ?? '（なし）';
        taskCreatedAt.textContent = formatDatetime(task.created_at);
        statusSelect.value = task.status;
        loadingMsg.classList.add('hidden');
        taskContent.classList.remove('hidden');
        await loadComments();
    }
    catch (e) {
        showError(e.message);
    }
}
// --- コメント取得・表示 ---
async function loadComments() {
    try {
        const res = await fetch(`/api/tasks/${taskId}/comments`);
        if (!res.ok)
            throw new Error('コメントの取得に失敗しました');
        const data = await res.json();
        renderComments(data.comments);
    }
    catch (e) {
        showError(e.message);
    }
}
function renderComments(comments) {
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
function buildCommentEl(comment) {
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
    div.querySelector('.btn-comment-edit').addEventListener('click', () => startEditComment(div, comment));
    div.querySelector('.btn-comment-delete').addEventListener('click', () => deleteComment(comment.id));
    return div;
}
function startEditComment(div, comment) {
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
    div.querySelector('.comment-footer').classList.add('hidden');
    div.appendChild(area);
    const textarea = area.querySelector('.edit-textarea');
    const editError = area.querySelector('.edit-error');
    textarea.focus();
    area.querySelector('.btn-edit-cancel').addEventListener('click', () => {
        area.remove();
        div.querySelector('.comment-footer').classList.remove('hidden');
    });
    area.querySelector('.btn-edit-save').addEventListener('click', async () => {
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
            if (!res.ok)
                throw new Error('コメントの更新に失敗しました');
            await loadComments();
        }
        catch (e) {
            editError.textContent = e.message;
            editError.classList.remove('hidden');
        }
    });
}
async function deleteComment(commentId) {
    try {
        const res = await fetch(`/api/tasks/${taskId}/comments/${commentId}`, { method: 'DELETE' });
        if (!res.ok)
            throw new Error('コメントの削除に失敗しました');
        await loadComments();
    }
    catch (e) {
        showError(e.message);
    }
}
// --- ステータス更新 ---
document.getElementById('btnUpdateStatus').addEventListener('click', async () => {
    statusError.classList.add('hidden');
    const status = statusSelect.value;
    try {
        const res = await fetch(`/api/tasks/${taskId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status }),
        });
        if (!res.ok) {
            const data = await res.json();
            statusError.textContent = data.errors?.[0]?.message ?? 'ステータスの更新に失敗しました';
            statusError.classList.remove('hidden');
        }
    }
    catch (_) {
        statusError.textContent = '通信エラーが発生しました';
        statusError.classList.remove('hidden');
    }
});
// --- コメント投稿 ---
document.getElementById('btnPostComment').addEventListener('click', async () => {
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
            const data = await res.json();
            commentError.textContent = data.errors?.[0]?.message ?? 'コメントの投稿に失敗しました';
            commentError.classList.remove('hidden');
            return;
        }
        commentBody.value = '';
        await loadComments();
    }
    catch (_) {
        commentError.textContent = '通信エラーが発生しました';
        commentError.classList.remove('hidden');
    }
});
// --- ナビゲーション ---
document.getElementById('btnEdit').addEventListener('click', () => {
    window.location.href = `/tasks/${taskId}/edit`;
});
document.getElementById('btnBack').addEventListener('click', () => {
    const backUrl = taskProjectId ? `/tasks?project_id=${taskProjectId}` : '/tasks';
    window.location.href = backUrl;
});
loadTask();
export {};
