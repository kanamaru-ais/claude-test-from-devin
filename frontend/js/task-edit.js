const pathParts = window.location.pathname.split('/');
const taskId = pathParts[pathParts.length - 2];
const taskForm = document.getElementById('taskForm');
const taskTitle = document.getElementById('taskTitle');
const taskDesc = document.getElementById('taskDescription');
const titleError = document.getElementById('titleError');
const errorBanner = document.getElementById('errorBanner');
const btnSubmit = document.getElementById('btnSubmit');
// --- 既存タスクを読み込む ---
async function loadTask() {
    try {
        const res = await fetch(`/api/tasks/${taskId}`);
        if (res.status === 404) {
            errorBanner.textContent = 'タスクが見つかりません';
            errorBanner.classList.remove('hidden');
            taskForm.classList.add('hidden');
            return;
        }
        if (!res.ok)
            throw new Error('タスクの取得に失敗しました');
        const task = await res.json();
        taskTitle.value = task.title;
        taskDesc.value = task.description ?? '';
    }
    catch (e) {
        errorBanner.textContent = e.message;
        errorBanner.classList.remove('hidden');
    }
}
// --- バリデーション ---
function validateForm() {
    const title = taskTitle.value.trim();
    if (title.length === 0) {
        titleError.textContent = 'タイトルは必須です';
        titleError.classList.remove('hidden');
        taskTitle.classList.add('is-invalid');
        return false;
    }
    if (title.length > 255) {
        titleError.textContent = 'タイトルは255文字以内で入力してください';
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
    if (!validateForm())
        return;
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
            const data = await res.json();
            if (data.errors) {
                const titleErr = data.errors.find((err) => err.field === 'title');
                if (titleErr) {
                    titleError.textContent = titleErr.message;
                    titleError.classList.remove('hidden');
                    taskTitle.classList.add('is-invalid');
                }
            }
            else {
                errorBanner.textContent = data.error ?? 'エラーが発生しました';
                errorBanner.classList.remove('hidden');
            }
            return;
        }
        window.location.href = `/tasks/${taskId}`;
    }
    catch (_) {
        errorBanner.textContent = '通信エラーが発生しました';
        errorBanner.classList.remove('hidden');
    }
    finally {
        btnSubmit.disabled = false;
    }
});
// --- キャンセル ---
document.getElementById('btnCancel').addEventListener('click', () => {
    window.location.href = `/tasks/${taskId}`;
});
loadTask();
export {};
