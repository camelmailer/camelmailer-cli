import type { Email, Pagination } from 'camelmailer';

export function pagination(overrides: Partial<Pagination> = {}): Pagination {
  return { page: 1, per_page: 30, total: 1, total_pages: 1, ...overrides };
}

export function email(overrides: Partial<Email> = {}): Email {
  return {
    id: 42,
    token: 'tok42',
    scope: 'outgoing',
    rcpt_to: 'ada@example.com',
    mail_from: 'billing@acme.com',
    subject: 'Your receipt',
    message_id: '<msg@acme.com>',
    tag: 'receipt',
    status: 'Sent',
    bounce: false,
    spam_status: null,
    spam_score: null,
    held: false,
    threat: false,
    size: 1204,
    metadata: null,
    stream_id: 1,
    bypassed: false,
    created_at: '2026-07-11T10:00:00Z',
    ...overrides,
  };
}
