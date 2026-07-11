/**
 * A CLI-level error with a stable machine-readable code.
 *
 * Codes are either produced locally (`MissingApiKey`, `MissingBody`,
 * `InvalidJson`, `InvalidArgument`, `InvalidOption`) or passed through
 * verbatim from the CamelMailer API (`Unauthorized`, `ValidationError`, …).
 */
export class CliError extends Error {
  override name = 'CliError';

  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}
