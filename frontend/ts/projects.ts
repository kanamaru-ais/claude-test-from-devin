const API_BASE = '/api/projects';

interface Project {
  id: number;
  name: string;
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

// --- DOM参照 ---
const projectTbody   = document.getElementById('projectTbody') as HTMLTableSectionElement;
const rowEmpty       = document.getElementById('rowEmpty') as HTMLTableRowElement;
const errorBanner    = document.getElementById('errorBanner') as HTMLDivElement;

const formModal      = document.getElementById('formModal') as HTMLDivElement;
const formModalTitle = document.getElementById('formModalTitle') as HTMLHeadingElement;
const projectForm    = document.getElementById('projectForm') as HTMLFormElement;
const editProjectId  = document.getElementById('editProjectId') as HTMLInputElement;
const projectName    = document.getElementById('projectName') as HTMLInputElement;
const projectNameError = document.getElementById('projectNameError') as HTMLParagraphElement;
const btnFormSubmit  = document.getElementById('btnFormSubmit') as HTMLButtonElement;

const deleteModal       = document.getElementById('deleteModal') as HTMLDivElement;
const deleteProjectName = document.getElementById('deleteProjectName') as HTMLSpanElement;

let deleteTargetId: string | null = null;

// --- API ---
async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  return fetch(API_BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
}

async function fetchProjects(): Promise<Project[]> {
  const res = await apiFetch('');
  if (!res.ok) throw new Error('プロジェクト一覧の取得に失敗しました');
  const data = await res.json() as { projects: Project[] };
  return data.projects;
}

async function createProject(name: string): Promise<Response> {
  return apiFetch('', { method: 'POST', body: JSON.stringify({ name }) });
}

async function updateProject(id: string, name: string): Promise<Response> {
  return apiFetch(`/${id}`, { method: 'PUT', body: JSON.stringify({ name }) });
}

async function deleteProject(id: string): Promise<Response> {
  return apiFetch(`/${id}`, { method: 'DELETE' });
}

// --- 表示 ---
function formatDatetime(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr.replace(' ', 'T'));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(str: string): string {
  return String(str).replace(/"/g, '&quot;');
}

function renderProjects(projects: Project[]): void {
  projectTbody.querySelectorAll('tr.project-row').forEach((r) => r.remove());

  if (projects.length === 0) {
    rowEmpty.classList.remove('hidden');
    return;
  }

  rowEmpty.classList.add('hidden');
  projects.forEach((project, index) => {
    const tr = document.createElement('tr');
    tr.className = 'project-row';
    tr.dataset.id = String(project.id);

    tr.innerHTML = `
      <td>${index + 1}</td>
      <td class="col-name-link"><a class="project-link" href="/tasks?project_id=${project.id}">${escapeHtml(project.name)}</a></td>
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

function showErrorBanner(message: string): void {
  errorBanner.textContent = message;
  errorBanner.classList.remove('hidden');
}

function hideErrorBanner(): void {
  errorBanner.classList.add('hidden');
}

async function reloadProjects(): Promise<void> {
  try {
    const projects = await fetchProjects();
    renderProjects(projects);
  } catch (e) {
    showErrorBanner((e as Error).message);
  }
}

// --- フォームモーダル ---
function openCreateModal(): void {
  formModalTitle.textContent = 'プロジェクト作成';
  btnFormSubmit.textContent = '作成';
  editProjectId.value = '';
  projectName.value = '';
  clearFieldError();
  formModal.classList.remove('hidden');
  projectName.focus();
}

function openEditModal(id: string, name: string): void {
  formModalTitle.textContent = 'プロジェクト編集';
  btnFormSubmit.textContent = '更新';
  editProjectId.value = id;
  projectName.value = name;
  clearFieldError();
  formModal.classList.remove('hidden');
  projectName.focus();
}

function closeFormModal(): void {
  formModal.classList.add('hidden');
}

function showFieldError(message: string): void {
  projectNameError.textContent = message;
  projectNameError.classList.remove('hidden');
  projectName.classList.add('is-invalid');
}

function clearFieldError(): void {
  projectNameError.textContent = '';
  projectNameError.classList.add('hidden');
  projectName.classList.remove('is-invalid');
}

function validateProjectName(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) return 'プロジェクト名は必須です';
  if (trimmed.length > 255) return 'プロジェクト名は255文字以内で入力してください';
  return null;
}

// --- 削除モーダル ---
function openDeleteModal(id: string, name: string): void {
  deleteTargetId = id;
  deleteProjectName.textContent = name;
  deleteModal.classList.remove('hidden');
}

function closeDeleteModal(): void {
  deleteModal.classList.add('hidden');
  deleteTargetId = null;
}

// --- イベント ---
(document.getElementById('btnCreate') as HTMLButtonElement).addEventListener('click', () => {
  hideErrorBanner();
  openCreateModal();
});

(document.getElementById('btnFormCancel') as HTMLButtonElement).addEventListener('click', closeFormModal);
(document.getElementById('btnDeleteCancel') as HTMLButtonElement).addEventListener('click', closeDeleteModal);

formModal.addEventListener('click', (e) => {
  if (e.target === formModal) closeFormModal();
});
deleteModal.addEventListener('click', (e) => {
  if (e.target === deleteModal) closeDeleteModal();
});

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
      const data = await res.json() as ApiErrorResponse;
      if (data.errors) {
        showFieldError(data.errors[0].message);
      } else {
        showErrorBanner(data.error ?? 'エラーが発生しました');
        closeFormModal();
      }
      return;
    }

    closeFormModal();
    hideErrorBanner();
    await reloadProjects();
  } catch (_) {
    showErrorBanner('通信エラーが発生しました');
    closeFormModal();
  } finally {
    btnFormSubmit.disabled = false;
  }
});

projectTbody.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  const editBtn  = target.closest('.btn-edit') as HTMLButtonElement | null;
  const deleteBtn = target.closest('.btn-delete') as HTMLButtonElement | null;

  if (editBtn) {
    hideErrorBanner();
    openEditModal(editBtn.dataset.id!, editBtn.dataset.name!);
  }

  if (deleteBtn) {
    hideErrorBanner();
    openDeleteModal(deleteBtn.dataset.id!, deleteBtn.dataset.name!);
  }
});

(document.getElementById('btnDeleteConfirm') as HTMLButtonElement).addEventListener('click', async () => {
  if (!deleteTargetId) return;
  const id = deleteTargetId;
  closeDeleteModal();

  try {
    const res = await deleteProject(id);
    if (!res.ok) {
      const data = await res.json() as ApiErrorResponse;
      showErrorBanner(data.error ?? '削除に失敗しました');
      return;
    }
    await reloadProjects();
  } catch (_) {
    showErrorBanner('通信エラーが発生しました');
  }
});

reloadProjects();

export {};
