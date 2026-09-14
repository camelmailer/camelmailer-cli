# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-09-14

### Added

- `campaigns`: `create`, `send-now`, `list`, `get`, `update`, `send`,
  `cancel`. The two create commands hit different routes: `create` writes
  the campaign and waits, while `send-now` expands it to the stream's
  subscribers before the command returns.
- `subscribers`: `list`, `add`, `import`, `complaint`, `remove`.
- `layouts`: `list`, `get`, `create`, `update`, `delete`, `upload-logo`.
  `upload-logo` reads the image file and encodes it, so no data URL has to
  be built by hand.
- `inbound`: `list`, `get`, `retry`, `bypass`.
- `logs`: `list`, `tags`.
- `emails send-to-stream` for broadcasting to a stream's subscribers.
- `emails send --idempotency-key`, which makes a send replayable.
- `streams`: `get`, `create`, `update` and `archive`. Only `list` existed,
  so a stream could be read but never created from the CLI.

### Changed

- Requires `@camelmailer/sdk` 0.2.2.

## [0.1.0] - 2026-07-12

### Added

- `camelmailer` binary built on the Camelmailer Node.js SDK.
- `login` / `logout`: store credentials in `~/.config/camelmailer/config.json`
  (created with mode 600), with `CAMELMAILER_API_KEY` / `CAMELMAILER_BASE_URL`
  environment variables and `--api-key` / `--base-url` flags taking precedence.
- `emails send` (direct `--html`/`--text` bodies or `--template` + `--model`),
  `emails list` (scope/status/tag/query/stream filters, pagination),
  `emails get`.
- `templates list`, `templates get`, `templates render`.
- `streams list`, `stats`, `bounces list`, `dmarc summary`, `ping`.
- Compact table output by default, raw API JSON via `--json`.
- Errors printed as `Error [Code]: message` with exit code 1.

[Unreleased]: https://github.com/camelmailer/camelmailer-cli/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/camelmailer/camelmailer-cli/releases/tag/v0.2.0
[0.1.0]: https://github.com/camelmailer/camelmailer-cli/releases/tag/v0.1.0
