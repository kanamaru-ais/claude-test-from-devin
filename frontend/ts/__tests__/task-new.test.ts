import { validateTaskTitle, validateDueDate } from '../utils';

describe('task-new バリデーション', () => {
  // FE-T-001: タイトル空
  test('FE-T-001: タイトル空でエラーメッセージを返す', () => {
    expect(validateTaskTitle('')).toBe('タイトルは必須です');
  });

  test('FE-T-001: スペースのみでエラーメッセージを返す', () => {
    expect(validateTaskTitle('   ')).toBe('タイトルは必須です');
  });

  // FE-T-002: タイトル255文字超
  test('FE-T-002: タイトル255文字超でエラーメッセージを返す', () => {
    const longTitle = 'a'.repeat(256);
    expect(validateTaskTitle(longTitle)).toBe(
      'タイトルは255文字以内で入力してください'
    );
  });

  // FE-T-003: 過去日付の期限
  test('FE-T-003: 過去日付でエラーメッセージを返す', () => {
    expect(validateDueDate('2020-01-01')).toBe(
      '期限は今日以降の日付を指定してください'
    );
  });

  // FE-T-004: 正常値
  test('FE-T-004: 正常なタイトルでnullを返す', () => {
    expect(validateTaskTitle('正常なタスク')).toBeNull();
  });

  test('FE-T-004: 正常な期限（未来日付）でnullを返す', () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const dateStr = futureDate.toISOString().split('T')[0];
    expect(validateDueDate(dateStr)).toBeNull();
  });

  test('FE-T-004: 期限未指定でnullを返す', () => {
    expect(validateDueDate('')).toBeNull();
  });
});
