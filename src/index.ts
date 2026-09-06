/*
 * Copyright 2026 Jonas Kaninda
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Official Node.js client for the Posta email platform.
 *
 * It covers the whole Posta API: transactional and templated sending, batch
 * sends, address verification, templates with versions and localizations,
 * campaigns, subscribers and lists, suppressions and bounces, domains, SMTP
 * servers and relay credentials, webhooks, web forms and the messages they
 * collect, inbound email, workspace administration, and the platform admin
 * surface.
 *
 * Built on the runtime's own `fetch` (Node.js 18+), with no dependencies.
 *
 * @example
 * ```ts
 * import { PostaClient } from '@goposta/posta';
 *
 * const posta = new PostaClient('https://posta.example.com', 'psk_your_api_key');
 *
 * const resp = await posta.emails.send({
 *   from: 'Acme <hello@example.com>',
 *   to: ['user@example.com'],
 *   subject: 'Hello from Posta',
 *   html: '<h1>Hello!</h1>',
 * });
 * console.log(`sent: id=${resp.id} status=${resp.status}`);
 * ```
 *
 * @packageDocumentation
 */

export * from './types.js';
export {
  PostaError,
  WORKSPACE_HEADER,
  SIGNATURE_HEADER,
  VERSION,
} from './http.js';
export type { PostaClientOptions } from './http.js';
export { WebhookEvents, verifySignature } from './resources/webhooks.js';
export type { SendOptions, VerifyOptions } from './resources/emails.js';
export type { AdminUserListOptions } from './resources/admin.js';

import { HttpClient, type PostaClientOptions } from './http.js';
import { EmailsClient, BouncesClient, SuppressionsClient } from './resources/emails.js';
import { TemplatesClient, LanguagesClient, StylesheetsClient } from './resources/templates.js';
import {
  DomainsClient, SmtpServersClient, SmtpCredentialsClient, ApiKeysClient,
} from './resources/infra.js';
import {
  SubscribersClient, SubscriberListsClient, UnsubscribeListsClient, ContactsClient,
} from './resources/subscribers.js';
import { CampaignsClient, AnalyticsClient } from './resources/campaigns.js';
import {
  FormsClient, MessagesClient, MessageFiltersClient, InboundClient,
} from './resources/messages.js';
import { WebhooksClient } from './resources/webhooks.js';
import { WorkspacesClient } from './resources/workspaces.js';
import { UsersClient, AuthClient, SystemClient } from './resources/users.js';
import { AdminClient } from './resources/admin.js';
import type { SendOptions, VerifyOptions } from './resources/emails.js';
import type {
  SendEmailRequest, SendTemplateEmailRequest, BatchRequest, SendResponse,
  BatchResponse, EmailStatusResponse, PreviewRequest, PreviewResponse,
  VerifyEmailRequest, VerificationResult, ListSubscribeRequest,
  ListUnsubscribeRequest, ListSubscribeResponse, Email, Bounce, Webhook,
  WebhookDelivery, CreateWebhookInput, PageableResponse,
} from './types.js';

/**
 * The Posta API client.
 *
 * Its properties group the API by resource. Every method returns a promise that
 * resolves on success and rejects with a {@link PostaError} when the API
 * answers a non-2xx status.
 *
 * ## Credentials
 *
 * Most machine-facing endpoints take an API key. Account-level endpoints
 * (`/users/me/*`) and the platform admin surface accept only a user session
 * token, which {@link PostaClient.withToken} supplies.
 *
 * ## Workspaces
 *
 * Workspace-scoped endpoints resolve the active workspace from the
 * `X-Posta-Workspace-Id` header. A workspace-bound API key carries its
 * workspace already; an account-wide key or a user session must name one with
 * the `workspaceId` option.
 */
export class PostaClient {
  private readonly http: HttpClient;

  /** Sends mail and reads the resulting delivery records. */
  readonly emails: EmailsClient;
  /** Reads recorded bounces and complaints. */
  readonly bounces: BouncesClient;
  /** Manages the workspace suppression list. */
  readonly suppressions: SuppressionsClient;
  /** Registers webhook endpoints and reads delivery attempts. */
  readonly webhooks: WebhooksClient;
  /** Manages templates, versions, and localizations. */
  readonly templates: TemplatesClient;
  /** Manages the workspace's template languages. */
  readonly languages: LanguagesClient;
  /** Manages reusable CSS for templates. */
  readonly stylesheets: StylesheetsClient;
  /** Manages sending domains and their DNS verification. */
  readonly domains: DomainsClient;
  /** Manages the SMTP servers Posta delivers through. */
  readonly smtpServers: SmtpServersClient;
  /** Manages credentials for the SMTP relay listener. */
  readonly smtpCredentials: SmtpCredentialsClient;
  /** Manages subscriber records and bulk imports. */
  readonly subscribers: SubscribersClient;
  /** Manages lists, their members, and opt-outs. */
  readonly subscriberLists: SubscriberListsClient;
  /** Manages the lists behind `List-Unsubscribe` headers. */
  readonly unsubscribeLists: UnsubscribeListsClient;
  /** Reads the derived contact view of everyone mailed. */
  readonly contacts: ContactsClient;
  /** Manages bulk campaigns and their lifecycle. */
  readonly campaigns: CampaignsClient;
  /** Reads delivery and engagement analytics. */
  readonly analytics: AnalyticsClient;
  /** Manages web form endpoints and their embed snippets. */
  readonly forms: FormsClient;
  /** Reads and triages web form submissions. */
  readonly messages: MessagesClient;
  /** Manages the spam filters applied to submissions. */
  readonly messageFilters: MessageFiltersClient;
  /** Reads inbound email received by Posta. */
  readonly inbound: InboundClient;
  /** Manages the workspace's API keys. */
  readonly apiKeys: ApiKeysClient;
  /** Manages workspaces, members, invitations, and settings. */
  readonly workspaces: WorkspacesClient;
  /** Manages the signed-in account (session credential only). */
  readonly users: UsersClient;
  /** Login, registration, and password recovery. */
  readonly auth: AuthClient;
  /** Platform administration (admin session only). */
  readonly admin: AdminClient;
  /** Build and health information. */
  readonly system: SystemClient;

  /**
   * Creates a client authenticated with an API key.
   *
   * @param baseUrl - Base URL of the Posta instance, e.g. `https://posta.example.com`
   * @param credential - An API key (`psk_…`), or a session token via {@link withToken}
   * @param options - Timeout, active workspace, extra headers
   */
  constructor(baseUrl: string, credential: string, options?: PostaClientOptions) {
    this.http = new HttpClient(baseUrl, credential, options);

    this.emails = new EmailsClient(this.http);
    this.bounces = new BouncesClient(this.http);
    this.suppressions = new SuppressionsClient(this.http);
    this.webhooks = new WebhooksClient(this.http);
    this.templates = new TemplatesClient(this.http);
    this.languages = new LanguagesClient(this.http);
    this.stylesheets = new StylesheetsClient(this.http);
    this.domains = new DomainsClient(this.http);
    this.smtpServers = new SmtpServersClient(this.http);
    this.smtpCredentials = new SmtpCredentialsClient(this.http);
    this.subscribers = new SubscribersClient(this.http);
    this.subscriberLists = new SubscriberListsClient(this.http);
    this.unsubscribeLists = new UnsubscribeListsClient(this.http);
    this.contacts = new ContactsClient(this.http);
    this.campaigns = new CampaignsClient(this.http);
    this.analytics = new AnalyticsClient(this.http);
    this.forms = new FormsClient(this.http);
    this.messages = new MessagesClient(this.http);
    this.messageFilters = new MessageFiltersClient(this.http);
    this.inbound = new InboundClient(this.http);
    this.apiKeys = new ApiKeysClient(this.http);
    this.workspaces = new WorkspacesClient(this.http);
    this.users = new UsersClient(this.http);
    this.auth = new AuthClient(this.http);
    this.admin = new AdminClient(this.http);
    this.system = new SystemClient(this.http);
  }

  /**
   * Creates a client authenticated with a user session token (JWT), as returned
   * by {@link AuthClient.login}. Account-level endpoints under `/users/me` and
   * the platform admin surface accept only this credential.
   */
  static withToken(baseUrl: string, token: string, options?: PostaClientOptions): PostaClient {
    return new PostaClient(baseUrl, token, options);
  }

  // ── Compatibility ────────────────────────────────────────────────────
  //
  // Methods kept for source compatibility with earlier releases, which exposed
  // the send surface directly on the client. New code should use the resource
  // properties, which cover the whole API rather than this subset.

  /** @deprecated Use `client.emails.send`. */
  sendEmail(req: SendEmailRequest, options?: SendOptions): Promise<SendResponse> {
    return this.emails.send(req, options);
  }

  /** @deprecated Use `client.emails.sendTemplate`. */
  sendTemplateEmail(req: SendTemplateEmailRequest, options?: SendOptions): Promise<SendResponse> {
    return this.emails.sendTemplate(req, options);
  }

  /** @deprecated Use `client.emails.sendBatch`. */
  sendBatch(req: BatchRequest, options?: SendOptions): Promise<BatchResponse> {
    return this.emails.sendBatch(req, options);
  }

  /** @deprecated Use `client.emails.preview`. */
  previewTemplate(req: PreviewRequest): Promise<PreviewResponse> {
    return this.emails.preview(req);
  }

  /** @deprecated Use `client.emails.verify`. */
  verifyEmail(req: VerifyEmailRequest, options?: VerifyOptions): Promise<VerificationResult> {
    return this.emails.verify(req, options);
  }

  /** @deprecated Use `client.emails.status`. */
  getEmailStatus(emailId: string): Promise<EmailStatusResponse> {
    return this.emails.status(emailId);
  }

  /** @deprecated Use `client.emails.retry`. */
  retryEmail(emailId: string): Promise<SendResponse> {
    return this.emails.retry(emailId);
  }

  /** @deprecated Use `client.emails.list`, which can also filter and sort. */
  listEmails(page = 0, size = 20): Promise<PageableResponse<Email>> {
    return this.emails.list({ page, size });
  }

  /** @deprecated Use `client.emails.get`. */
  getEmail(id: string): Promise<Email> {
    return this.emails.get(id);
  }

  /** @deprecated Use `client.bounces.list`. */
  listBounces(page = 0, size = 20): Promise<PageableResponse<Bounce>> {
    return this.bounces.list({ page, size });
  }

  /** @deprecated Use `client.webhooks.list`. */
  listWebhooks(page = 0, size = 20): Promise<PageableResponse<Webhook>> {
    return this.webhooks.list({ page, size });
  }

  /** @deprecated Use `client.webhooks.create`. */
  createWebhook(input: CreateWebhookInput): Promise<Webhook> {
    return this.webhooks.create(input);
  }

  /** @deprecated Use `client.webhooks.delete`. */
  deleteWebhook(id: number): Promise<void> {
    return this.webhooks.delete(id);
  }

  /** @deprecated Use `client.webhooks.listDeliveries`. */
  listWebhookDeliveries(page = 0, size = 20): Promise<PageableResponse<WebhookDelivery>> {
    return this.webhooks.listDeliveries({ page, size });
  }

  /** @deprecated Use `client.subscriberLists.subscribe`. */
  subscribeToList(req: ListSubscribeRequest): Promise<ListSubscribeResponse> {
    return this.subscriberLists.subscribe(req);
  }

  /** @deprecated Use `client.subscriberLists.unsubscribe`. */
  unsubscribeFromList(listId: number, req: ListUnsubscribeRequest): Promise<ListSubscribeResponse> {
    return this.subscriberLists.unsubscribe(listId, req);
  }

  /** @deprecated Use `client.subscriberLists.resubscribe`. */
  resubscribeToList(listId: number, email: string): Promise<ListSubscribeResponse> {
    return this.subscriberLists.resubscribe(listId, email);
  }
}
