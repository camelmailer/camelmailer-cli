import type { Pagination } from '@camelmailer/sdk';

/** Render a value for table/key-value output. */
export function toCell(value: unknown): string {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  return String(value);
}

/** Render a plain, dependency-free, space-aligned table. */
export function renderTable(headers: string[], rows: unknown[][]): string {
  const cells = rows.map((row) => row.map(toCell));
  const widths = headers.map((header, i) =>
    Math.max(header.length, ...cells.map((row) => (row[i] ?? '').length)),
  );
  const line = (columns: string[]): string =>
    columns
      .map((column, i) => (i === columns.length - 1 ? column : column.padEnd(widths[i] ?? 0)))
      .join('  ')
      .trimEnd();
  return [line(headers), ...cells.map(line)].join('\n');
}

/** Render aligned `key  value` lines. */
export function renderKeyValues(pairs: Array<[string, unknown]>): string {
  const width = Math.max(...pairs.map(([key]) => key.length));
  return pairs.map(([key, value]) => `${key.padEnd(width)}  ${toCell(value)}`).join('\n');
}

export function renderJson(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

export function paginationLine(pagination: Pagination): string {
  return `Page ${pagination.page} of ${pagination.total_pages} · ${pagination.total} total`;
}
