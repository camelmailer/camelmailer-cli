import { CamelMailer } from 'camelmailer';
import type {
  CamelMailerResult,
  DmarcFilterOptions,
  DmarcSummaryResponse,
  GetEmailResponse,
  GetStatsOptions,
  GetStatsResponse,
  ListBouncesOptions,
  ListBouncesResponse,
  ListEmailsOptions,
  ListEmailsResponse,
  ListStreamsResponse,
  ListTemplatesResponse,
  PingResponse,
  RenderTemplateResponse,
  SendEmailOptions,
  SendEmailResponse,
  SendEmailWithTemplateOptions,
  TemplateResponse,
} from 'camelmailer';

import { readConfig } from './config.js';
import { CliError } from './errors.js';
import { VERSION } from './version.js';

/**
 * The slice of the CamelMailer SDK the CLI uses. Commands are written
 * against this structural type so tests can substitute a plain object.
 */
export interface CliClient {
  emails: {
    send(options: SendEmailOptions): Promise<CamelMailerResult<SendEmailResponse>>;
    sendWithTemplate(
      options: SendEmailWithTemplateOptions,
    ): Promise<CamelMailerResult<SendEmailResponse>>;
    get(id: number): Promise<CamelMailerResult<GetEmailResponse>>;
    list(options?: ListEmailsOptions): Promise<CamelMailerResult<ListEmailsResponse>>;
  };
  templates: {
    list(): Promise<CamelMailerResult<ListTemplatesResponse>>;
    get(permalink: string): Promise<CamelMailerResult<TemplateResponse>>;
    render(
      permalink: string,
      model?: Record<string, unknown>,
    ): Promise<CamelMailerResult<RenderTemplateResponse>>;
  };
  streams: {
    list(): Promise<CamelMailerResult<ListStreamsResponse>>;
  };
  stats: {
    get(options?: GetStatsOptions): Promise<CamelMailerResult<GetStatsResponse>>;
  };
  bounces: {
    list(options?: ListBouncesOptions): Promise<CamelMailerResult<ListBouncesResponse>>;
  };
  dmarc: {
    summary(options?: DmarcFilterOptions): Promise<CamelMailerResult<DmarcSummaryResponse>>;
  };
  ping(): Promise<CamelMailerResult<PingResponse>>;
}

/** Per-invocation overrides coming from `--api-key` / `--base-url`. */
export interface ClientOverrides {
  apiKey?: string;
  baseUrl?: string;
}

function env(name: string): string | undefined {
  const value = process.env[name];
  return value === undefined || value === '' ? undefined : value;
}

/**
 * Resolve credentials with the precedence
 * flag > environment variable > `camelmailer login` config file.
 */
export function resolveClientOptions(overrides: ClientOverrides = {}): {
  apiKey: string;
  baseUrl?: string;
} {
  const config = readConfig();
  const apiKey = overrides.apiKey ?? env('CAMELMAILER_API_KEY') ?? config.api_key;
  const baseUrl = overrides.baseUrl ?? env('CAMELMAILER_BASE_URL') ?? config.base_url;
  if (!apiKey) {
    throw new CliError(
      'MissingApiKey',
      'No API key found. Run `camelmailer login`, set CAMELMAILER_API_KEY, or pass --api-key.',
    );
  }
  return { apiKey, baseUrl };
}

/** Build a real SDK client from flags, environment and the config file. */
export function createClient(overrides: ClientOverrides = {}): CliClient {
  const { apiKey, baseUrl } = resolveClientOptions(overrides);
  return new CamelMailer(apiKey, { baseUrl, userAgent: `camelmailer-cli:${VERSION}` });
}
