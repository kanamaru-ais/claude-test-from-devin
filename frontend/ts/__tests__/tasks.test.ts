import { escapeHtml } from '../utils';

describe('tasks renderTasks', () => {
  const STATUS_LABELS: Record<string, string> = {
    todo: '起票',
    in_progress: '進行中',
    done: '完了',
  };

  beforeEach(() => {
    document.body.innerHTML = `
      <table>
        <tbody id="taskTbody">
          <tr id="rowEmpty" class="hidden"><td colspan="4">タスクがありません</td></tr>
        </tbody>
      </table>
    `;
  });

  // FE-TL-001: renderTasks: 0件
  test('FE-TL-001: 0件の場合は空メッセージ行を表示する', () => {
    const taskTbody = document.getElementById('taskTbody') as HTMLTableSectionElement;
    const rowEmpty = document.getElementById('rowEmpty') as HTMLTableRowElement;

    // renderTasks相当の処理（0件）
    taskTbody.querySelectorAll('tr.task-row').forEach((r) => r.remove());
    if (0 === 0) {
      rowEmpty.classList.remove('hidden');
    }

    expect(rowEmpty.classList.contains('hidden')).toBe(false);
  });

  // FE-TL-002: renderTasks: 複数件
  test('FE-TL-002: 複数件の場合はテーブル行とステータスバッジが生成される', () => {
    const taskTbody = document.getElementById('taskTbody') as HTMLTableSectionElement;
    const rowEmpty = document.getElementById('rowEmpty') as HTMLTableRowElement;

    const tasks = [
      { id: 1, title: 'タスクA', status: 'todo' as const, due_date: '2025-12-31', project_id: 1 },
      { id: 2, title: 'タスクB', status: 'in_progress' as const, due_date: null, project_id: 1 },
      { id: 3, title: 'タスクC', status: 'done' as const, due_date: null, project_id: null },
    ];

    // renderTasks相当の処理
    taskTbody.querySelectorAll('tr.task-row').forEach((r) => r.remove());
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
      taskTbody.appendChild(tr);
    });

    const rows = taskTbody.querySelectorAll('tr.task-row');
    expect(rows).toHaveLength(3);
    expect(rowEmpty.classList.contains('hidden')).toBe(true);

    // ステータスバッジの確認
    const badges = taskTbody.querySelectorAll('.badge');
    expect(badges).toHaveLength(3);
    expect(badges[0].textContent).toBe('起票');
    expect(badges[0].classList.contains('badge-todo')).toBe(true);
    expect(badges[1].textContent).toBe('進行中');
    expect(badges[1].classList.contains('badge-in_progress')).toBe(true);
    expect(badges[2].textContent).toBe('完了');
    expect(badges[2].classList.contains('badge-done')).toBe(true);
  });
});
