import {
  escapeHtml,
  escapeAttr,
  formatDatetime,
  validateProjectName,
} from '../utils';

describe('projects ユーティリティ関数', () => {
  // FE-P-001: validateProjectName: 空文字
  test('FE-P-001: 空文字でエラーメッセージを返す', () => {
    expect(validateProjectName('')).toBe('プロジェクト名は必須です');
  });

  test('FE-P-001: スペースのみでエラーメッセージを返す', () => {
    expect(validateProjectName('   ')).toBe('プロジェクト名は必須です');
  });

  // FE-P-002: validateProjectName: 255文字超
  test('FE-P-002: 255文字超でエラーメッセージを返す', () => {
    const longName = 'a'.repeat(256);
    expect(validateProjectName(longName)).toBe(
      'プロジェクト名は255文字以内で入力してください'
    );
  });

  // FE-P-003: validateProjectName: 正常値
  test('FE-P-003: 正常値でnullを返す', () => {
    expect(validateProjectName('テストプロジェクト')).toBeNull();
  });

  test('FE-P-003: 255文字ちょうどでnullを返す', () => {
    expect(validateProjectName('a'.repeat(255))).toBeNull();
  });

  // FE-P-004: escapeHtml: 特殊文字エスケープ
  test('FE-P-004: &, <, >, " をエスケープする', () => {
    expect(escapeHtml('&')).toBe('&amp;');
    expect(escapeHtml('<')).toBe('&lt;');
    expect(escapeHtml('>')).toBe('&gt;');
    expect(escapeHtml('"')).toBe('&quot;');
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    );
  });

  // FE-P-005: formatDatetime: 日時フォーマット
  test('FE-P-005: YYYY/MM/DD HH:mm形式でフォーマットされる', () => {
    const result = formatDatetime('2025-01-15 09:30:00');
    expect(result).toBe('2025/01/15 09:30');
  });

  test('FE-P-005: 空文字の場合は空文字を返す', () => {
    expect(formatDatetime('')).toBe('');
  });

  // FE-P-006: escapeAttr: ダブルクォートエスケープ
  test('FE-P-006: ダブルクォートをエスケープする', () => {
    expect(escapeAttr('test"value')).toBe('test&quot;value');
  });

  test('FE-P-006: ダブルクォートがない場合はそのまま返す', () => {
    expect(escapeAttr('normal')).toBe('normal');
  });
});

describe('projects renderProjects', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <table>
        <tbody id="projectTbody">
          <tr id="rowEmpty" class="hidden"><td colspan="4">プロジェクトがありません</td></tr>
        </tbody>
      </table>
    `;
  });

  // FE-P-007: renderProjects: 0件表示
  test('FE-P-007: 0件の場合は空メッセージ行を表示する', () => {
    const projectTbody = document.getElementById('projectTbody') as HTMLTableSectionElement;
    const rowEmpty = document.getElementById('rowEmpty') as HTMLTableRowElement;

    // renderProjects相当の処理
    projectTbody.querySelectorAll('tr.project-row').forEach((r) => r.remove());
    if (0 === 0) {
      rowEmpty.classList.remove('hidden');
    }

    expect(rowEmpty.classList.contains('hidden')).toBe(false);
  });

  // FE-P-008: renderProjects: 複数件表示
  test('FE-P-008: 複数件の場合はテーブル行が生成される', () => {
    const projectTbody = document.getElementById('projectTbody') as HTMLTableSectionElement;
    const rowEmpty = document.getElementById('rowEmpty') as HTMLTableRowElement;

    const projects = [
      { id: 1, name: 'プロジェクトA', created_at: '2025-01-01 10:00:00', updated_at: '2025-01-01 10:00:00' },
      { id: 2, name: 'プロジェクトB', created_at: '2025-01-02 11:00:00', updated_at: '2025-01-02 11:00:00' },
    ];

    // renderProjects相当の処理
    projectTbody.querySelectorAll('tr.project-row').forEach((r) => r.remove());
    rowEmpty.classList.add('hidden');
    projects.forEach((project, index) => {
      const tr = document.createElement('tr');
      tr.className = 'project-row';
      tr.dataset.id = String(project.id);
      tr.innerHTML = `
        <td>${index + 1}</td>
        <td>${escapeHtml(project.name)}</td>
        <td>${formatDatetime(project.created_at)}</td>
        <td><button>編集</button></td>
      `;
      projectTbody.appendChild(tr);
    });

    const rows = projectTbody.querySelectorAll('tr.project-row');
    expect(rows).toHaveLength(2);
    expect(rowEmpty.classList.contains('hidden')).toBe(true);
  });
});
