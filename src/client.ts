import { CamelMailer } from '@camelmailer/sdk';
import type {
  AddSubscriberOptions,
  CamelMailerResult,
  CampaignResponse,
  CreateCampaignOptions,
  CreateDraftCampaignOptions,
  CreateLayoutOptions,
  CreateStreamOptions,
  DeleteLayoutResponse,
  DmarcFilterOptions,
  DmarcSummaryResponse,
  GetCampaignResponse,
  GetEmailResponse,
  GetInboundResponse,
  GetStatsOptions,
  GetStatsResponse,
  ImportSubscribersResponse,
  InboundRequeueResponse,
  LayoutLogoResponse,
  LayoutResponse,
  ListBouncesOptions,
  ListBouncesResponse,
  ListCampaignsResponse,
  ListEmailsOptions,
  ListEmailsResponse,
  ListInboundOptions,
  ListInboundResponse,
  ListLayoutsResponse,
  ListLogsOptions,
  ListLogsResponse,
  ListStreamsResponse,
  ListSubscribersResponse,
  ListTagsResponse,
  ListTemplatesResponse,
  PingResponse,
  RemoveSubscriberResponse,
  RenderTemplateResponse,
  SendEmailOptions,
  SendEmailResponse,
  SendEmailWithTemplateOptions,
  SendRequestOptions,
  SendToStreamOptions,
  SendToStreamResponse,
  StreamResponse,
  SubscriberResponse,
  TemplateResponse,
  UpdateCampaignOptions,
  UpdateLayoutOptions,
  UpdateStreamOptions,
} from '@camelmailer/sdk';

import { readConfig } from './config.js';
import { CliError } from './errors.js';
import { VERSION } from './version.js';

/**
 * The slice of the CamelMailer SDK the CLI uses. Commands are written
 * against this structural type so tests can substitute a plain object.
 */
export interface CliClient {
  emails: {
    send(
      options: SendEmailOptions,
      request?: SendRequestOptions,
    ): Promise<CamelMailerResult<SendEmailResponse>>;
    sendWithTemplate(
      options: SendEmailWithTemplateOptions,
      request?: SendRequestOptions,
    ): Promise<CamelMailerResult<SendEmailResponse>>;
    sendToStream(
      permalink: string,
      options: SendToStreamOptions,
    ): Promise<CamelMailerResult<SendToStreamResponse>>;
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
    create(options: CreateStreamOptions): Promise<CamelMailerResult<StreamResponse>>;
    get(permalink: string): Promise<CamelMailerResult<StreamResponse>>;
    update(
      permalink: string,
      options: UpdateStreamOptions,
    ): Promise<CamelMailerResult<StreamResponse>>;
    archive(permalink: string): Promise<CamelMailerResult<StreamResponse>>;
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
  campaigns: {
    list(): Promise<CamelMailerResult<ListCampaignsResponse>>;
    listForStream(permalink: string): Promise<CamelMailerResult<ListCampaignsResponse>>;
    get(id: number): Promise<CamelMailerResult<GetCampaignResponse>>;
    createDraft(
      options: CreateDraftCampaignOptions,
    ): Promise<CamelMailerResult<CampaignResponse>>;
    createAndSend(
      permalink: string,
      options: CreateCampaignOptions,
    ): Promise<CamelMailerResult<CampaignResponse>>;
    update(
      id: number,
      options: UpdateCampaignOptions,
    ): Promise<CamelMailerResult<CampaignResponse>>;
    send(id: number): Promise<CamelMailerResult<CampaignResponse>>;
    cancel(id: number): Promise<CamelMailerResult<CampaignResponse>>;
  };
  subscribers: {
    list(permalink: string): Promise<CamelMailerResult<ListSubscribersResponse>>;
    add(
      permalink: string,
      options: AddSubscriberOptions,
    ): Promise<CamelMailerResult<SubscriberResponse>>;
    import(
      permalink: string,
      addresses: string[],
    ): Promise<CamelMailerResult<ImportSubscribersResponse>>;
    complaint(
      permalink: string,
      address: string,
    ): Promise<CamelMailerResult<SubscriberResponse>>;
    remove(
      permalink: string,
      address: string,
    ): Promise<CamelMailerResult<RemoveSubscriberResponse>>;
  };
  layouts: {
    list(): Promise<CamelMailerResult<ListLayoutsResponse>>;
    create(options: CreateLayoutOptions): Promise<CamelMailerResult<LayoutResponse>>;
    get(permalink: string): Promise<CamelMailerResult<LayoutResponse>>;
    update(
      permalink: string,
      options: UpdateLayoutOptions,
    ): Promise<CamelMailerResult<LayoutResponse>>;
    delete(permalink: string): Promise<CamelMailerResult<DeleteLayoutResponse>>;
    uploadLogo(
      permalink: string,
      dataUrl: string,
    ): Promise<CamelMailerResult<LayoutLogoResponse>>;
  };
  inbound: {
    list(options?: ListInboundOptions): Promise<CamelMailerResult<ListInboundResponse>>;
    get(id: number): Promise<CamelMailerResult<GetInboundResponse>>;
    retry(id: number): Promise<CamelMailerResult<InboundRequeueResponse>>;
    bypass(id: number): Promise<CamelMailerResult<InboundRequeueResponse>>;
  };
  logs: {
    list(options?: ListLogsOptions): Promise<CamelMailerResult<ListLogsResponse>>;
    tags(): Promise<CamelMailerResult<ListTagsResponse>>;
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
