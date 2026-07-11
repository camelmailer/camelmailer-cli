import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const constructorSpy = vi.fn();

vi.mock('camelmailer', () => ({
  CamelMailer: class {
    constructor(key?: string, options?: { baseUrl?: string; userAgent?: string }) {
      constructorSpy(key, options);
    }
  },
}));

import { createClient, resolveClientOptions } from '../src/client.js';
import { writeConfig } from '../src/config.js';
import { CliError } from '../src/errors.js';

let dir: string;

beforeEach(() => {
  constructorSpy.mockClear();
  dir = mkdtempSync(join(tmpdir(), 'camelmailer-cli-test-'));
  vi.stubEnv('XDG_CONFIG_HOME', dir);
  vi.stubEnv('CAMELMAILER_API_KEY', '');
  vi.stubEnv('CAMELMAILER_BASE_URL', '');
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('resolveClientOptions', () => {
  it('throws MissingApiKey when no key is available anywhere', () => {
    expect(() => resolveClientOptions()).toThrowError(CliError);
    try {
      resolveClientOptions();
    } catch (error) {
      expect((error as CliError).code).toBe('MissingApiKey');
    }
  });

  it('reads the key and base URL from the config file', () => {
    writeConfig({ api_key: 'cm_file', base_url: 'https://file.example.com' });
    expect(resolveClientOptions()).toEqual({
      apiKey: 'cm_file',
      baseUrl: 'https://file.example.com',
    });
  });

  it('prefers environment variables over the config file', () => {
    writeConfig({ api_key: 'cm_file', base_url: 'https://file.example.com' });
    vi.stubEnv('CAMELMAILER_API_KEY', 'cm_env');
    vi.stubEnv('CAMELMAILER_BASE_URL', 'https://env.example.com');
    expect(resolveClientOptions()).toEqual({
      apiKey: 'cm_env',
      baseUrl: 'https://env.example.com',
    });
  });

  it('prefers explicit flags over everything', () => {
    writeConfig({ api_key: 'cm_file' });
    vi.stubEnv('CAMELMAILER_API_KEY', 'cm_env');
    expect(
      resolveClientOptions({ apiKey: 'cm_flag', baseUrl: 'https://flag.example.com' }),
    ).toEqual({ apiKey: 'cm_flag', baseUrl: 'https://flag.example.com' });
  });
});

describe('createClient', () => {
  it('constructs the SDK client with the resolved key, base URL and CLI user agent', () => {
    vi.stubEnv('CAMELMAILER_API_KEY', 'cm_env');
    vi.stubEnv('CAMELMAILER_BASE_URL', 'https://env.example.com');
    createClient();
    expect(constructorSpy).toHaveBeenCalledWith('cm_env', {
      baseUrl: 'https://env.example.com',
      userAgent: expect.stringMatching(/^camelmailer-cli:/),
    });
  });
});
