import {
  escapeHtml,
  escapeAttr,
  formatDatetime,
  validateProjectName,
  fetchProjects,
  createProject,
  updateProject,
  deleteProject,
} from '../ts/projects';

describe('escapeHtml', () => {
  test('特殊文字をエスケープする', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
  });

  test('& をエスケープする', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b');
  });

  test('エスケープ不要な文字列はそのまま返す', () => {
    expect(escapeHtml('hello world')).toBe('hello world');
  });
});

describe('escapeAttr', () => {
  test('" をエスケープする', () => {
    expect(escapeAttr('say "hello"')).toBe('say &quot;hello&quot;');
  });

  test('ダブルクォート以外はそのまま返す', () => {
    expect(escapeAttr('hello world')).toBe('hello world');
  });
});

describe('formatDatetime', () => {
  test('SQLite形式の日付を整形する', () => {
    expect(formatDatetime('2024-03-15 09:05:00')).toBe('2024/03/15 09:05');
  });

  test('空文字列のとき空文字列を返す', () => {
    expect(formatDatetime('')).toBe('');
  });

  test('ゼロパディングが正しく行われる', () => {
    expect(formatDatetime('2024-01-05 01:03:00')).toBe('2024/01/05 01:03');
  });
});

describe('validateProjectName', () => {
  test('有効な名前はnullを返す', () => {
    expect(validateProjectName('テストプロジェクト')).toBeNull();
  });

  test('空文字はエラーを返す', () => {
    expect(validateProjectName('')).toBe('プロジェクト名は必須です');
  });

  test('スペースのみはエラーを返す', () => {
    expect(validateProjectName('   ')).toBe('プロジェクト名は必須です');
  });

  test('255文字はOK', () => {
    expect(validateProjectName('a'.repeat(255))).toBeNull();
  });

  test('256文字はエラーを返す', () => {
    expect(validateProjectName('a'.repeat(256))).toBe('プロジェクト名は255文字以内で入力してください');
  });
});

describe('fetchProjects', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('正常レスポンスでプロジェクト一覧を返す', async () => {
    const projects = [{ id: 1, name: 'テスト', created_at: '2024-01-01 00:00:00', updated_at: '2024-01-01 00:00:00' }];
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ projects }),
    });

    const result = await fetchProjects();
    expect(result).toEqual(projects);
  });

  test('レスポンスがokでない場合エラーをスローする', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false });

    await expect(fetchProjects()).rejects.toThrow('プロジェクト一覧の取得に失敗しました');
  });
});

describe('createProject', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('POSTリクエストを送信する', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

    await createProject('新プロジェクト');

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/projects',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: '新プロジェクト' }),
      })
    );
  });
});

describe('updateProject', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('PUTリクエストを送信する', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

    await updateProject('1', '更新名');

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/projects/1',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ name: '更新名' }),
      })
    );
  });
});

describe('deleteProject', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('DELETEリクエストを送信する', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

    await deleteProject('1');

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/projects/1',
      expect.objectContaining({ method: 'DELETE' })
    );
  });
});
