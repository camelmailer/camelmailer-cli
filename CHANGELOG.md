# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-07-12

### Added

- `camelmailer` binary built on the CamelMailer Node.js SDK.
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

[Unreleased]: https://github.com/camelmailer/camelmailer-cli/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/camelmailer/camelmailer-cli/releases/tag/v0.1.0
