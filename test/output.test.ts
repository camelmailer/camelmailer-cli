import { describe, expect, it } from 'vitest';

import { paginationLine, renderKeyValues, renderTable, toCell } from '../src/output.js';

describe('toCell', () => {
  it('renders empty values as a dash and booleans as yes/no', () => {
    expect(toCell(null)).toBe('-');
    expect(toCell(undefined)).toBe('-');
    expect(toCell('')).toBe('-');
    expect(toCell(true)).toBe('yes');
    expect(toCell(false)).toBe('no');
    expect(toCell(42)).toBe('42');
  });
});

describe('renderTable', () => {
  it('aligns columns and never leaves trailing whitespace', () => {
    const table = renderTable(
      ['ID', 'NAME'],
      [
        [1, 'short'],
        [1000, 'a-much-longer-name'],
      ],
    );
    expect(table).toBe(
      ['ID    NAME', '1     short', '1000  a-much-longer-name'].join('\n'),
    );
    for (const line of table.split('\n')) {
      expect(line).toBe(line.trimEnd());
    }
  });
});

describe('renderKeyValues', () => {
  it('aligns the value column', () => {
    expect(renderKeyValues([['ID', 1], ['Subject', 'Hi']])).toBe(
      ['ID       1', 'Subject  Hi'].join('\n'),
    );
  });
});

describe('paginationLine', () => {
  it('summarises the pagination block', () => {
    expect(paginationLine({ page: 2, per_page: 30, total: 95, total_pages: 4 })).toBe(
      'Page 2 of 4 · 95 total',
    );
  });
});
