import { describe, expect, it, vi } from 'vitest';

import type { Template } from '@camelmailer/sdk';

import { apiError, ok, runCli } from './helpers/run.js';

const template: Template = {
  id: 3,
  uuid: 'uuid-3',
  name: 'Welcome',
  permalink: 'welcome',
  subject: 'Hello {{ name }}',
  html_body: '<p>Hi {{ name }}</p>',
  text_body: 'Hi {{ name }}',
  archived: false,
};

describe('templates list', () => {
  it('lists templates as a table', async () => {
    const list = vi.fn(() => ok({ templates: [template] }));
    const result = await runCli(['templates', 'list'], { templates: { list } as never });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('welcome');
    expect(result.stdout).toContain('Hello {{ name }}');
  });

  it('prints raw JSON with --json', async () => {
    const list = vi.fn(() => ok({ templates: [template] }));
    const result = await runCli(['--json', 'templates', 'list'], {
      templates: { list } as never,
    });
    expect(JSON.parse(result.stdout)).toEqual({ templates: [template] });
  });
});

describe('templates get', () => {
  it('shows one template including its bodies', async () => {
    const get = vi.fn(() => ok({ template }));
    const result = await runCli(['templates', 'get', 'welcome'], {
      templates: { get } as never,
    });

    expect(get).toHaveBeenCalledWith('welcome');
    expect(result.stdout).toContain('Welcome');
    expect(result.stdout).toContain('--- html_body ---');
    expect(result.stdout).toContain('<p>Hi {{ name }}</p>');
  });

  it('surfaces NotFound with a non-zero exit', async () => {
    const get = vi.fn(() => apiError('NotFound', 'no such template', 404));
    const result = await runCli(['templates', 'get', 'nope'], { templates: { get } as never });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toBe('Error [NotFound]: no such template');
  });
});

describe('templates render', () => {
  it('renders a template against the --model', async () => {
    const render = vi.fn(() =>
      ok({ rendered: { subject: 'Hello Ada', html_body: '<p>Hi Ada</p>', text_body: 'Hi Ada' } }),
    );
    const result = await runCli(
      ['templates', 'render', 'welcome', '--model', '{"name":"Ada"}'],
      { templates: { render } as never },
    );

    expect(render).toHaveBeenCalledWith('welcome', { name: 'Ada' });
    expect(result.stdout).toContain('Hello Ada');
    expect(result.stdout).toContain('Hi Ada');
  });

  it('defaults to an empty model', async () => {
    const render = vi.fn(() =>
      ok({ rendered: { subject: 'Hello ', html_body: null, text_body: null } }),
    );
    await runCli(['templates', 'render', 'welcome'], { templates: { render } as never });
    expect(render).toHaveBeenCalledWith('welcome', {});
  });

  it('rejects an invalid --model', async () => {
    const result = await runCli(['templates', 'render', 'welcome', '--model', '[1]'], {});
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Error [InvalidJson]');
  });
});
