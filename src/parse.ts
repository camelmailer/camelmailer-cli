import { CliError } from './errors.js';

/** Parse a `--model`-style JSON object flag; throws `InvalidJson` otherwise. */
export function parseJsonObject(raw: string, flag: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new CliError('InvalidJson', `${flag} must be valid JSON.`);
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new CliError('InvalidJson', `${flag} must be a JSON object.`);
  }
  return parsed as Record<string, unknown>;
}

/** Parse a positive integer id; throws `InvalidArgument` otherwise. */
export function parseId(raw: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    throw new CliError('InvalidArgument', `"${raw}" is not a valid numeric id.`);
  }
  return id;
}

/** Parse an optional positive-integer flag such as `--page`. */
export function parsePositiveInt(raw: string | undefined, flag: string): number | undefined {
  if (raw === undefined) return undefined;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new CliError('InvalidOption', `${flag} must be a positive integer.`);
  }
  return value;
}
