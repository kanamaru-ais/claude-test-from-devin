/**
 * 共通ユーティリティ関数
 * projects.ts, tasks.ts, task-detail.ts で重複していた関数を共通化
 */

export function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function escapeAttr(str: string): string {
  return String(str).replace(/"/g, '&quot;');
}

export function formatDatetime(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr.replace(' ', 'T'));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function validateProjectName(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) return 'プロジェクト名は必須です';
  if (trimmed.length > 255) return 'プロジェクト名は255文字以内で入力してください';
  return null;
}

export function validateTaskTitle(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) return 'タイトルは必須です';
  if (trimmed.length > 255) return 'タイトルは255文字以内で入力してください';
  return null;
}

export function validateDueDate(dueDate: string): string | null {
  if (!dueDate) return null;
  const today = new Date().toISOString().split('T')[0];
  if (dueDate < today) return '期限は今日以降の日付を指定してください';
  return null;
}
