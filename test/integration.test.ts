import { describe, expect, it } from 'vitest';

import { createClient } from '../src/client.js';
import { buildProgram } from '../src/program.js';

/**
 * Integration roundtrip against a real CamelMailer instance.
 *
 * Skipped unless CAMELMAILER_API_KEY is set (never active in CI):
 *
 *   CAMELMAILER_API_KEY=cm_xxx CAMELMAILER_BASE_URL=https://mail.example.com npm test
 */
const apiKey = process.env.CAMELMAILER_API_KEY;

describe.skipIf(!apiKey)('integration (real instance)', () => {
  it('pings the instance through the CLI command path', async () => {
    const out: string[] = [];
    let exitCode = 0;
    const program = buildProgram({
      io: {
        out: (text) => out.push(text),
        err: (text) => out.push(text),
        setExitCode: (code) => {
          exitCode = code;
        },
      },
      createClient,
    });
    await program.parseAsync(['ping'], { from: 'user' });

    expect(exitCode).toBe(0);
    expect(out.join('\n')).toContain('pong');
  });

  it('lists messages and streams', async () => {
    const client = createClient();
    const emails = await client.emails.list({ per_page: 1 });
    expect(emails.error).toBeNull();
    expect(emails.data?.pagination).toBeDefined();

    const streams = await client.streams.list();
    expect(streams.error).toBeNull();
    expect(Array.isArray(streams.data?.streams)).toBe(true);
  });
});
