const API_BASE = '/api/projects';

// --- DOM参照 ---
const projectTbody  = document.getElementById('projectTbody');
const rowEmpty      = document.getElementById('rowEmpty');
const errorBanner   = document.getElementById('errorBanner');

const formModal     = document.getElementById('formModal');
const formModalTitle = document.getElementById('formModalTitle');
const projectForm   = document.getElementById('projectForm');
const editProjectId = document.getElementById('editProjectId');
const projectName   = document.getElementById('projectName');
const projectNameError = document.getElementById('projectNameError');
const btnFormSubmit = document.getElementById('btnFormSubmit');

const deleteModal   = document.getElementById('deleteModal');
const deleteProjectName = document.getElementById('deleteProjectName');

let deleteTargetId = null;

// --- API ---
async function apiFetch(path, options = {}) {
  const res = await fetch(API_BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  return res;
}

async function fetchProjects() {
  const res = await apiFetch('');
  if (!res.ok) throw new Error('プロジェクト一覧の取得に失敗しました');
  const data = await res.json();
  return data.projects;
}

async function createProject(name) {
  const res = await apiFetch('', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
  return res;
}

async function updateProject(id, name) {
  const res = await apiFetch(`/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ name }),
  });
  return res;
}

async function deleteProject(id) {
  const res = await apiFetch(`/${id}`, { method: 'DELETE' });
  return res;
}

// --- 表示 ---
function formatDatetime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr.replace(' ', 'T'));
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function renderProjects(projects) {
  // 既存の動的行を削除
  projectTbody.querySelectorAll('tr.project-row').forEach((r) => r.remove());

  if (projects.length === 0) {
    rowEmpty.classList.remove('hidden');
    return;
  }

  rowEmpty.classList.add('hidden');
  projects.forEach((project, index) => {
    const tr = document.createElement('tr');
    tr.className = 'project-row';
    tr.dataset.id = project.id;

    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${escapeHtml(project.name)}</td>
      <td>${formatDatetime(project.created_at)}</td>
      <td>
        <div class="action-cell">
          <button class="btn btn-sm btn-secondary btn-edit" data-id="${project.id}" data-name="${escapeAttr(project.name)}">編集</button>
          <button class="btn btn-sm btn-danger btn-delete" data-id="${project.id}" data-name="${escapeAttr(project.name)}">削除</button>
        </div>
      </td>
    `;
    projectTbody.appendChild(tr);
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(str) {
  return String(str).replace(/"/g, '&quot;');
}

function showErrorBanner(message) {
  errorBanner.textContent = message;
  errorBanner.classList.remove('hidden');
}

function hideErrorBanner() {
  errorBanner.classList.add('hidden');
}

// --- プロジェクト一覧の再読み込み ---
async function reloadProjects() {
  try {
    const projects = await fetchProjects();
    renderProjects(projects);
  } catch (e) {
    showErrorBanner(e.message);
  }
}

// --- フォームモーダル ---
function openCreateModal() {
  formModalTitle.textContent = 'プロジェクト作成';
  btnFormSubmit.textContent = '作成';
  editProjectId.value = '';
  projectName.value = '';
  clearFieldError();
  formModal.classList.remove('hidden');
  projectName.focus();
}

function openEditModal(id, name) {
  formModalTitle.textContent = 'プロジェクト編集';
  btnFormSubmit.textContent = '更新';
  editProjectId.value = id;
  projectName.value = name;
  clearFieldError();
  formModal.classList.remove('hidden');
  projectName.focus();
}

function closeFormModal() {
  formModal.classList.add('hidden');
}

function showFieldError(message) {
  projectNameError.textContent = message;
  projectNameError.classList.remove('hidden');
  projectName.classList.add('is-invalid');
}

function clearFieldError() {
  projectNameError.textContent = '';
  projectNameError.classList.add('hidden');
  projectName.classList.remove('is-invalid');
}

function validateProjectName(value) {
  const trimmed = value.trim();
  if (trimmed.length === 0) return 'プロジェクト名は必須です';
  if (trimmed.length > 255) return 'プロジェクト名は255文字以内で入力してください';
  return null;
}

// --- 削除モーダル ---
function openDeleteModal(id, name) {
  deleteTargetId = id;
  deleteProjectName.textContent = name;
  deleteModal.classList.remove('hidden');
}

function closeDeleteModal() {
  deleteModal.classList.add('hidden');
  deleteTargetId = null;
}

// --- イベント ---
document.getElementById('btnCreate').addEventListener('click', () => {
  hideErrorBanner();
  openCreateModal();
});

document.getElementById('btnFormCancel').addEventListener('click', closeFormModal);
document.getElementById('btnDeleteCancel').addEventListener('click', closeDeleteModal);

// モーダル外クリックで閉じる
formModal.addEventListener('click', (e) => {
  if (e.target === formModal) closeFormModal();
});
deleteModal.addEventListener('click', (e) => {
  if (e.target === deleteModal) closeDeleteModal();
});

// フォーム送信
projectForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearFieldError();

  const nameValue = projectName.value;
  const clientError = validateProjectName(nameValue);
  if (clientError) {
    showFieldError(clientError);
    return;
  }

  const id = editProjectId.value;
  btnFormSubmit.disabled = true;

  try {
    const res = id
      ? await updateProject(id, nameValue.trim())
      : await createProject(nameValue.trim());

    if (!res.ok) {
      const data = await res.json();
      if (data.errors) {
        showFieldError(data.errors[0].message);
      } else {
        showErrorBanner(data.error || 'エラーが発生しました');
        closeFormModal();
      }
      return;
    }

    closeFormModal();
    hideErrorBanner();
    await reloadProjects();
  } catch (err) {
    showErrorBanner('通信エラーが発生しました');
    closeFormModal();
  } finally {
    btnFormSubmit.disabled = false;
  }
});

// 編集・削除ボタン（イベント委譲）
projectTbody.addEventListener('click', (e) => {
  const editBtn  = e.target.closest('.btn-edit');
  const deleteBtn = e.target.closest('.btn-delete');

  if (editBtn) {
    hideErrorBanner();
    openEditModal(editBtn.dataset.id, editBtn.dataset.name);
  }

  if (deleteBtn) {
    hideErrorBanner();
    openDeleteModal(deleteBtn.dataset.id, deleteBtn.dataset.name);
  }
});

// 削除確認
document.getElementById('btnDeleteConfirm').addEventListener('click', async () => {
  if (!deleteTargetId) return;
  const id = deleteTargetId;
  closeDeleteModal();

  try {
    const res = await deleteProject(id);
    if (!res.ok) {
      const data = await res.json();
      showErrorBanner(data.error || '削除に失敗しました');
      return;
    }
    await reloadProjects();
  } catch (err) {
    showErrorBanner('通信エラーが発生しました');
  }
});

// 初期読み込み
reloadProjects();
