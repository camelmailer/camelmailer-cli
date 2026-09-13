import { chmodSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

/** Contents of `~/.config/camelmailer/config.json`. */
export interface CliConfig {
  api_key?: string;
  base_url?: string;
}

/** Directory holding the CLI config (respects `XDG_CONFIG_HOME`). */
export function configDir(): string {
  const xdg = process.env.XDG_CONFIG_HOME;
  const base = xdg && xdg !== '' ? xdg : join(homedir(), '.config');
  return join(base, '@camelmailer/sdk');
}

export function configPath(): string {
  return join(configDir(), 'config.json');
}

/** Read the stored config; returns `{}` when missing or unreadable. */
export function readConfig(): CliConfig {
  try {
    const parsed: unknown = JSON.parse(readFileSync(configPath(), 'utf8'));
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as CliConfig;
    }
    return {};
  } catch {
    return {};
  }
}

/** Write the config with owner-only permissions (0700 dir, 0600 file). */
export function writeConfig(config: CliConfig): void {
  mkdirSync(configDir(), { recursive: true, mode: 0o700 });
  writeFileSync(configPath(), `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
  chmodSync(configPath(), 0o600); // enforce the mode when overwriting an existing file
}
