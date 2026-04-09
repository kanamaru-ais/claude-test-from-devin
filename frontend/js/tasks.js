const params = new URLSearchParams(window.location.search);
const projectId = params.get('project_id');
const taskTbody = document.getElementById('taskTbody');
const rowEmpty = document.getElementById('rowEmpty');
const errorBanner = document.getElementById('errorBanner');
const statusFilter = document.getElementById('statusFilter');
const pageTitle = document.getElementById('pageTitle');
const STATUS_LABELS = {
    todo: '起票',
    in_progress: '進行中',
    done: '完了',
};
// --- 初期化 ---
if (projectId) {
    fetchProjectName(projectId);
}
// --- API ---
async function fetchTasks(status) {
    const query = new URLSearchParams();
    if (status)
        query.set('status', status);
    if (projectId)
        query.set('project_id', projectId);
    const res = await fetch(`/api/tasks?${query}`);
    if (!res.ok)
        throw new Error('タスク一覧の取得に失敗しました');
    const data = await res.json();
    return data.tasks;
}
async function fetchProjectName(id) {
    try {
        const res = await fetch(`/api/projects/${id}`);
        if (res.ok) {
            const proj = await res.json();
            pageTitle.textContent = `タスク一覧 - ${proj.name}`;
        }
    }
    catch (_) {
        // プロジェクト名取得失敗は無視
    }
}
// --- 表示 ---
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
function renderTasks(tasks) {
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
function showErrorBanner(message) {
    errorBanner.textContent = message;
    errorBanner.classList.remove('hidden');
}
async function reloadTasks() {
    try {
        const tasks = await fetchTasks(statusFilter.value);
        renderTasks(tasks);
    }
    catch (e) {
        showErrorBanner(e.message);
    }
}
// --- イベント ---
statusFilter.addEventListener('change', reloadTasks);
document.getElementById('btnCreate').addEventListener('click', () => {
    const query = projectId ? `?project_id=${projectId}` : '';
    window.location.href = `/tasks/new${query}`;
});
reloadTasks();
export {};
