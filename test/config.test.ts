import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { configPath, readConfig, writeConfig } from '../src/config.js';
import { runCli } from './helpers/run.js';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'camelmailer-cli-test-'));
  vi.stubEnv('XDG_CONFIG_HOME', dir);
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('config file', () => {
  it('lives under $XDG_CONFIG_HOME/camelmailer/config.json', () => {
    expect(configPath()).toBe(join(dir, '@camelmailer/sdk', 'config.json'));
  });

  it('round-trips and is created with mode 600', () => {
    writeConfig({ api_key: 'cm_secret', base_url: 'https://mail.example.com' });

    expect(readConfig()).toEqual({ api_key: 'cm_secret', base_url: 'https://mail.example.com' });
    expect(statSync(configPath()).mode & 0o777).toBe(0o600);
  });

  it('returns {} when the file is missing or invalid', () => {
    expect(readConfig()).toEqual({});
    writeConfig({ api_key: 'x' });
    expect(readConfig()).toEqual({ api_key: 'x' });
  });
});

describe('camelmailer login', () => {
  it('stores --api-key and --base-url in the config file', async () => {
    const result = await runCli([
      'login',
      '--api-key',
      'cm_secret',
      '--base-url',
      'https://mail.example.com',
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Credentials saved to');
    const stored = JSON.parse(readFileSync(configPath(), 'utf8'));
    expect(stored).toEqual({ api_key: 'cm_secret', base_url: 'https://mail.example.com' });
    expect(statSync(configPath()).mode & 0o777).toBe(0o600);
  });

  it('keeps an existing base_url when only the key is given', async () => {
    writeConfig({ api_key: 'old', base_url: 'https://mail.example.com' });
    await runCli(['login', '--api-key', 'cm_new']);
    expect(readConfig()).toEqual({ api_key: 'cm_new', base_url: 'https://mail.example.com' });
  });

  it('fails cleanly when there is no TTY and no --api-key', async () => {
    const original = process.stdin.isTTY;
    Object.defineProperty(process.stdin, 'isTTY', { value: false, configurable: true });
    try {
      const result = await runCli(['login']);
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Error [MissingApiKey]');
    } finally {
      Object.defineProperty(process.stdin, 'isTTY', { value: original, configurable: true });
    }
  });
});

describe('camelmailer logout', () => {
  it('removes the stored key but keeps the base_url', async () => {
    writeConfig({ api_key: 'cm_secret', base_url: 'https://mail.example.com' });
    const result = await runCli(['logout']);

    expect(result.exitCode).toBe(0);
    expect(readConfig()).toEqual({ base_url: 'https://mail.example.com' });
  });
});
