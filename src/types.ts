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
 * Configures the `List-Unsubscribe` (RFC 2369) and `List-Unsubscribe-Post`
 * (RFC 8058) headers for a send. `list_id` and `url` are mutually exclusive.
 */
export interface Unsubscribe {
  /**
   * Reference an existing Posta-managed UnsubscribeList by id. Posta mints the
   * signed one-click URL and a click suppresses the recipient on this list
   * only. Mutually exclusive with `url`.
   */
  list_id?: number;
  /**
   * Caller-managed unsubscribe endpoint. Posta only emits the
   * `List-Unsubscribe` header; you own the endpoint. Also the RFC 8058 POST
   * target when `one_click` is true (which requires https). Mutually exclusive
   * with `list_id`.
   */
  url?: string;
  /**
   * Optional `mailto:` URI emitted alongside the URL in `List-Unsubscribe`
   * (RFC 2369). A bare address is accepted; Posta prepends `mailto:` if
   * missing.
   */
  mailto?: string;
  /**
   * Emit `List-Unsubscribe-Post: List-Unsubscribe=One-Click` (RFC 8058).
   * Applies to the https URL target only; the caller-managed path requires an
   * https URL. Implied true on the Posta-managed (`list_id`) path.
   */
  one_click?: boolean;
}

/** Request body for sending a single email. */
export interface SendEmailRequest {
  from: string;
  to: string[];
  subject: string;
  html?: string;
  text?: string;
  attachments?: Attachment[];
  headers?: Record<string, string>;
  /**
   * Configures the `List-Unsubscribe` / `List-Unsubscribe-Post` headers.
   * Supersedes the deprecated `list_unsubscribe_url` / `list_unsubscribe_post`
   * fields.
   */
  unsubscribe?: Unsubscribe;
  /** @deprecated Use {@link Unsubscribe.url} on `unsubscribe`. */
  list_unsubscribe_url?: string;
  /** @deprecated Use {@link Unsubscribe.one_click} on `unsubscribe`. */
  list_unsubscribe_post?: boolean;
  send_at?: string;
}

/**
 * Request body for sending a template email.
 * Provide either template_id or template (name). template_id is preferred (primary key lookup);
 * template is a fallback when the ID is not known.
 */
export interface SendTemplateEmailRequest {
  /** Template numeric ID (preferred). */
  template_id?: number;
  /** Template name (fallback when template_id is not provided). */
  template?: string;
  language?: string;
  from?: string;
  to: string[];
  template_data?: Record<string, unknown>;
  attachments?: Attachment[];
  /** Configures the `List-Unsubscribe` / `List-Unsubscribe-Post` headers. */
  unsubscribe?: Unsubscribe;
}

/**
 * Request body for sending batch emails.
 * Provide either template_id or template (name). template_id is preferred (primary key lookup);
 * template is a fallback when the ID is not known.
 */
export interface BatchRequest {
  /** Template numeric ID (preferred). */
  template_id?: number;
  /** Template name (fallback when template_id is not provided). */
  template?: string;
  language?: string;
  from?: string;
  recipients: BatchRecipient[];
  /**
   * Configures the `List-Unsubscribe` headers for every recipient in the batch
   * (per-recipient unsubscribe is intentionally not supported).
   */
  unsubscribe?: Unsubscribe;
}

/** A single recipient in a batch send. */
export interface BatchRecipient {
  email: string;
  language?: string;
  template_data?: Record<string, unknown>;
}

/** An email attachment (content must be base64-encoded). */
export interface Attachment {
  filename: string;
  content: string;
  content_type: string;
}

/** Response after sending an email. */
export interface SendResponse {
  id: string;
  status: string;
}

/** Body for list-scoped unsubscribe / resubscribe. */
export interface ListUnsubscribeRequest {
  email: string;
  reason?: string;
}

/**
 * Body for the explicit list subscribe endpoint. The list is identified by
 * name (created on first use); any prior list-scoped opt-out for this
 * (list, email) is cleared.
 */
export interface ListSubscribeRequest {
  email: string;
  name?: string;
  list: string;
}

/**
 * Result of a subscribe / unsubscribe / resubscribe call. `action` is one
 * of "subscribed", "unsubscribed", "resubscribed".
 */
export interface ListSubscribeResponse {
  list_id: number;
  subscriber_id: number;
  email: string;
  action: "subscribed" | "unsubscribed" | "resubscribed";
  list_created?: boolean;
  subscriber_created?: boolean;
  member_added?: boolean;
}

/** Response after a batch send. */
export interface BatchResponse {
  total: number;
  sent: number;
  failed: number;
  skipped: number;
  results: BatchResult[];
}

/** Result for a single recipient in a batch. */
export interface BatchResult {
  email: string;
  id?: string;
  status: string;
  error?: string;
}

/** Lightweight view of an email's delivery status. */
export interface EmailStatusResponse {
  id: string;
  status: string;
  error_message?: string;
  retry_count: number;
  created_at: string;
  sent_at?: string;
}

/** Request body for previewing a template. */
export interface PreviewRequest {
  template_id?: number;
  template?: string;
  language?: string;
  template_data?: Record<string, unknown>;
}

/** Response from a template preview. */
export interface PreviewResponse {
  subject: string;
  html: string;
  text: string;
}

/** Request body for verifying an email address. */
export interface VerifyEmailRequest {
  email: string;
}

/** Verification verdict for an address. */
export type VerificationStatus =
  | "valid"
  | "invalid"
  | "risky"
  | "disposable"
  | "unknown";

/** Which individual verification checks passed. */
export interface VerificationChecks {
  syntax: boolean;
  mx: boolean;
  disposable: boolean;
  role_account: boolean;
  /** Always "skipped"; no SMTP probe is performed. */
  smtp: string;
}

/** Verification outcome for an address. */
export interface VerificationResult {
  email: string;
  status: VerificationStatus;
  score: number;
  checks: VerificationChecks;
  reason?: string;
  mailbox_verified: boolean;
  suppressed: boolean;
  previously_bounced: boolean;
  cached: boolean;
  checked_at: string;
}

/**
 * Dry-run result for send / send-template / batch requests. The exact shape
 * is decided server-side; treat as an opaque verification payload.
 */
export type DryRunResponse = Record<string, unknown>;

/**
 * A sent or received email record. JSON keys are snake_case, matching the
 * Posta API. Optional fields may be absent or empty depending on the email.
 */
export interface Email {
  id: number;
  /** Public UUID used by status / retry endpoints. */
  uuid: string;
  user_id: number;
  workspace_id?: number;
  api_key_id?: number;
  sender: string;
  recipients: string[];
  subject: string;
  template_name?: string;
  html_body: string;
  text_body: string;
  status: string;
  error_message: string;
  retry_count: number;
  created_at: string;
  sent_at?: string;
  scheduled_at?: string;
  provider?: string;
  smtp_hostname?: string;
}

/** A recorded bounce or complaint for a delivered email. */
export interface Bounce {
  id: number;
  user_id: number;
  workspace_id?: number;
  email_id: number;
  recipient: string;
  /** One of "hard", "soft", "complaint". */
  type: string;
  reason: string;
  created_at: string;
}

/** A registered webhook endpoint. */
export interface Webhook {
  id: number;
  user_id: number;
  workspace_id?: number;
  url: string;
  events: string[];
  filters: string[];
  /** Signing secret; only returned in some responses. */
  secret?: string;
  created_at: string;
}

/** A single attempt to deliver a webhook notification. */
export interface WebhookDelivery {
  id: number;
  webhook_id: number;
  user_id: number;
  workspace_id?: number;
  event: string;
  /** One of "success", "failed". */
  status: string;
  http_status_code: number;
  error_message?: string;
  attempt: number;
  created_at: string;
}

/** Event types that a webhook may subscribe to. */
export type WebhookEvent =
  | "email.sent"
  | "email.failed"
  | "email.inbound"
  | "email.unsubscribed"
  | "email.complained"
  | "campaign.started"
  | "campaign.completed"
  | "message.received"
  | "message.spam";

/** Request body for creating a webhook. */
export interface CreateWebhookInput {
  /** Destination URL that receives webhook deliveries. */
  url: string;
  /** Event types to subscribe to (at least one required). */
  events: WebhookEvent[] | string[];
  /** Optional list of filter expressions. */
  filters?: string[];
}

/** Pagination metadata returned alongside a paginated list. */
export interface Pageable {
  current_page: number;
  size: number;
  total_pages: number;
  total_elements: number;
  empty: boolean;
}

/** Error details from the API. */
export interface ErrorInfo {
  code: string;
  message: string;
  error: string;
}

/** Standard Posta API response envelope. */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

/** Paginated Posta API response envelope. */
export interface PageableResponse<T> {
  success: boolean;
  data: T[];
  pageable: Pageable;
}

/** Error envelope returned by Posta. */
export interface ApiErrorResponse {
  success: boolean;
  error?: ErrorInfo;
}

// ─────────────────────────────────────────────────────────────────────────
// Pagination and filtering
// ─────────────────────────────────────────────────────────────────────────

/** Pagination shared by every list endpoint. `page` is zero-based. */
export interface ListOptions {
  page?: number;
  size?: number;
}

/** Filters a list of emails. */
export interface EmailListOptions extends ListOptions {
  /** Free-text search over recipient and subject. */
  q?: string;
  /** Column to sort by, with a leading `-` for descending order. */
  sort?: string;
}

/** Filters lists that accept a single free-text `search` parameter. */
export interface SearchListOptions extends ListOptions {
  search?: string;
}

/** Filters lists that accept a free-text `q` parameter and an optional sort. */
export interface QueryListOptions extends ListOptions {
  q?: string;
  sort?: string;
}

/** Filters a list of subscribers. */
export interface SubscriberListOptions extends ListOptions {
  search?: string;
  status?: string;
}

/** Filters a list of campaigns. */
export interface CampaignListOptions extends ListOptions {
  status?: string;
}

/** Filters suppressions to a single unsubscribe list. */
export interface SuppressionListOptions extends ListOptions {
  list_id?: string | number;
}

/** Filters web form submissions. */
export interface MessageListOptions extends ListOptions {
  /** Restrict the result to one form. */
  form_id?: number;
  /** Spam verdict: `received`, `flagged`, `spam`, `rejected`. */
  status?: string;
  /** Triage state: `new`, `open`, `replied`, `closed`, `spam`. */
  state?: string;
  /** Keep only read or only unread messages. */
  unread?: boolean;
  /** Free-text search over sender, subject, and body. */
  q?: string;
  /** ISO-8601 bounds on submission time. */
  after?: string;
  before?: string;
}

/** Filters received inbound email. */
export interface InboundListOptions extends ListOptions {
  status?: string;
  /** How the message arrived: `smtp` or `webhook`. */
  source?: string;
  sender?: string;
  q?: string;
}

/** Bounds an analytics query by date. */
export interface AnalyticsOptions {
  /** ISO-8601 start of the window. */
  from?: string;
  /** ISO-8601 end of the window. */
  to?: string;
  /** Narrows delivery analytics to one email status. */
  status?: string;
}

// ─────────────────────────────────────────────────────────────────────────
// Templates
// ─────────────────────────────────────────────────────────────────────────

/** Reusable CSS shared by template versions. */
export interface Stylesheet {
  id: number;
  user_id: number;
  workspace_id?: number | null;
  name: string;
  css: string;
  created_at: string;
  updated_at?: string | null;
}

/** One language's subject and body within a template version. */
export interface TemplateLocalization {
  id: number;
  version_id: number;
  language: string;
  subject_template: string;
  html_template?: string;
  text_template?: string;
  /** The visual editor's document for this localization. */
  builder_json?: string;
  created_at: string;
  updated_at?: string | null;
}

/** One immutable revision of a template. */
export interface TemplateVersion {
  id: number;
  template_id: number;
  version: number;
  sample_data?: string;
  stylesheet_id?: number | null;
  stylesheet?: Stylesheet | null;
  localizations?: TemplateLocalization[];
  created_at: string;
}

/**
 * A named, versioned email template. Its content lives on versions; the
 * template itself holds metadata and points at the version that sends.
 */
export interface Template {
  id: number;
  user_id: number;
  workspace_id?: number | null;
  name: string;
  description?: string;
  default_language?: string;
  /** JSON used to render previews of this template. */
  sample_data?: string;
  active_version_id?: number | null;
  active_version?: TemplateVersion | null;
  last_edited_by_id?: number | null;
  created_at: string;
  updated_at?: string | null;
}

/** A template as returned when listing: metadata plus the active version. */
export interface TemplateListItem extends Template {
  /** Language codes the active version is localized into. */
  languages?: string[];
}

/** Creates a template. Content is added afterwards as a version. */
export interface CreateTemplateInput {
  name: string;
  description?: string;
  default_language?: string;
  sample_data?: string;
}

/** Changes a template's metadata. Omitted fields are left unchanged. */
export interface UpdateTemplateInput {
  name?: string;
  description?: string | null;
  default_language?: string;
  sample_data?: string | null;
}

/** Renders template source directly, without saving it. */
export interface PreviewTemplateInput {
  subject_template: string;
  html_template?: string;
  text_template?: string;
  stylesheet_id?: number | null;
  template_data?: Record<string, unknown>;
}

/** Rendered template output. */
export interface PreviewResult {
  subject: string;
  html: string;
  text: string;
}

/** Sends a template to a few addresses so an editor can check it. */
export interface SendTestInput {
  to: string[];
  from?: string;
  language?: string;
  template_data?: Record<string, unknown>;
}

/** One version inside an exported template. */
export interface TemplateExportVersion {
  version: number;
  sample_data?: string;
  active?: boolean;
  localizations?: TemplateLocalization[];
}

/**
 * A template and all its versions in portable form: what export returns and
 * import accepts, so a template can move between workspaces or live in version
 * control.
 */
export interface TemplateExport {
  name: string;
  description?: string;
  default_language?: string;
  sample_data?: string;
  versions?: TemplateExportVersion[];
  posta_version?: string;
  exported_at?: string;
}

/** Creates a template from a raw HTML document. */
export interface ImportHtmlInput {
  name: string;
  description?: string;
  subject_template?: string;
  html: string;
  language?: string;
}

/** Opens a new version, copying the active one's localizations. */
export interface CreateVersionInput {
  sample_data?: string;
  stylesheet_id?: number | null;
}

/** Changes the stylesheet attached to a version. */
export interface UpdateVersionInput {
  stylesheet_id?: number | null;
}

/** Adds one language's content to a version. */
export interface CreateLocalizationInput {
  language: string;
  subject_template: string;
  html_template?: string;
  text_template?: string;
  builder_json?: string;
}

/** Changes one language's content. Omitted fields are left unchanged. */
export interface UpdateLocalizationInput {
  subject_template?: string;
  html_template?: string;
  text_template?: string;
  builder_json?: string;
}

/** A language code available to template localizations. */
export interface Language {
  id: number;
  user_id: number;
  workspace_id?: number | null;
  code: string;
  name: string;
  is_default: boolean;
  created_at: string;
}

/** Adds a language. `code` is a BCP 47 tag such as `en` or `pt-BR`. */
export interface CreateLanguageInput {
  code: string;
  name: string;
  is_default?: boolean;
}

/** Renames a language or makes it the default. */
export interface UpdateLanguageInput {
  code?: string;
  name?: string;
  is_default?: boolean;
}

/** Creates or replaces a stylesheet. */
export interface StylesheetInput {
  name: string;
  css: string;
}

// ─────────────────────────────────────────────────────────────────────────
// Domains and SMTP
// ─────────────────────────────────────────────────────────────────────────

/** A sending domain and the state of its DNS verification. */
export interface Domain {
  id: number;
  user_id: number;
  workspace_id?: number | null;
  domain: string;
  verification_token?: string;
  ownership_verified: boolean;
  spf_verified: boolean;
  dkim_verified: boolean;
  dmarc_verified: boolean;
  created_at: string;
}

/** One DNS record a domain needs published. */
export interface DnsRecord {
  type: string;
  host: string;
  value: string;
}

/**
 * The four records a sending domain needs: a TXT proving ownership, and the
 * SPF, DKIM, and DMARC records that make its mail deliverable.
 */
export interface DnsRecords {
  verification: DnsRecord;
  spf: DnsRecord;
  dkim: DnsRecord;
  dmarc: DnsRecord;
}

/** A domain together with the DNS records to publish for it. */
export interface DomainWithRecords extends Domain {
  dns_records: DnsRecords;
}

/**
 * The outcome of one round of DNS checks. The record fields carry what was
 * actually found, which is what makes a failed check diagnosable.
 */
export interface DomainVerification {
  ownership_verified: boolean;
  spf_verified: boolean;
  dkim_verified: boolean;
  dmarc_verified: boolean;
  spf_record?: string;
  dkim_record?: string;
  dmarc_record?: string;
}

/** What a verification run returns. */
export interface DomainVerificationResult {
  domain: Domain;
  fully_verified: boolean;
  verification: DomainVerification;
}

/** An SMTP relay Posta delivers through. Passwords are never returned. */
export interface SmtpServer {
  id: number;
  user_id: number;
  workspace_id?: number | null;
  name: string;
  host: string;
  port: number;
  username?: string;
  encryption?: string;
  /** Restricts which From addresses may use this server. */
  allowed_emails?: string[];
  max_retries: number;
  status?: string;
  is_system: boolean;
  validated_at?: string | null;
  validation_error?: string;
  created_at: string;
}

/** Registers an SMTP relay. `encryption` is `none`, `tls`, or `starttls`. */
export interface CreateSmtpServerInput {
  name?: string;
  host: string;
  port: number;
  username?: string;
  password?: string;
  encryption?: string;
  allowed_emails?: string[];
  max_retries?: number;
}

/** Changes an SMTP relay. Omit `password` to keep the stored one. */
export interface UpdateSmtpServerInput {
  name?: string;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  encryption?: string;
  status?: string;
  allowed_emails?: string[];
  max_retries?: number;
}

/** A credential for Posta's own SMTP relay listener. */
export interface SmtpCredential {
  id: number;
  user_id: number;
  workspace_id: number;
  name: string;
  username: string;
  allowed_ips?: string[];
  revoked: boolean;
  last_used_at?: string | null;
  created_at: string;
}

/** Mints a relay credential. `allowed_ips` restricts who may authenticate. */
export interface CreateSmtpCredentialInput {
  name: string;
  allowed_ips?: string[];
}

/**
 * The one-time result of creating a relay credential. `password` is shown only
 * here; `host` and `port` point at Posta's relay listener.
 */
export interface SmtpCredentialCreated {
  id: number;
  name: string;
  username: string;
  password: string;
  host?: string;
  port?: number;
  message?: string;
  created_at: string;
}

// ─────────────────────────────────────────────────────────────────────────
// Suppressions, subscribers, lists, contacts
// ─────────────────────────────────────────────────────────────────────────

/**
 * An address Posta refuses to deliver to. `kind` is `bounce`, `complaint`,
 * `unsubscribe`, or `manual`.
 */
export interface Suppression {
  id: number;
  user_id: number;
  workspace_id?: number | null;
  email: string;
  kind: string;
  reason?: string;
  list_id?: number | null;
  created_at: string;
}

/**
 * Suppresses one address. `list_id` scopes it to a single unsubscribe list;
 * without it the address is suppressed workspace wide.
 */
export interface AddSuppressionInput {
  email: string;
  reason?: string;
  list_id?: number;
}

/** Reports a bounce observed elsewhere. `type` is `hard` or `soft`. */
export interface RecordBounceInput {
  /** UUID of the email that bounced. */
  email_id: string;
  /** The address that rejected it. */
  recipient: string;
  type: string;
  reason?: string;
}

/**
 * A mailing-list recipient. `status` is `subscribed`, `unsubscribed`,
 * `bounced`, or `complained`.
 */
export interface Subscriber {
  id: number;
  user_id: number;
  workspace_id?: number | null;
  email: string;
  name?: string;
  status: string;
  language?: string;
  timezone?: string;
  custom_fields?: Record<string, unknown>;
  subscribed_at?: string | null;
  unsubscribed_at?: string | null;
  created_at: string;
  updated_at?: string | null;
}

/** Adds a subscriber. `status` defaults to `subscribed`. */
export interface CreateSubscriberInput {
  email: string;
  name?: string;
  status?: string;
  language?: string;
  timezone?: string;
  custom_fields?: Record<string, unknown>;
}

/** Changes a subscriber. The email address itself cannot be changed. */
export interface UpdateSubscriberInput {
  name?: string;
  status?: string;
  language?: string;
  timezone?: string;
  custom_fields?: Record<string, unknown>;
}

/** What a bulk import did. `errors` names the rows that were rejected. */
export interface BulkImportResult {
  total: number;
  imported: number;
  updated: number;
  skipped: number;
  failed: number;
  errors?: string[];
}

/** One clause of a segment list's membership query. */
export interface FilterRule {
  field: string;
  operator: string;
  value?: unknown;
}

/**
 * A group of subscribers. A `static` list has explicit members; a `segment`
 * list derives them from `filter_rules` at send time.
 */
export interface SubscriberList {
  id: number;
  user_id: number;
  workspace_id?: number | null;
  name: string;
  description?: string;
  type: string;
  filter_rules?: FilterRule[];
  created_at: string;
  updated_at?: string | null;
}

/** A subscriber list together with its current member count. */
export interface SubscriberListWithCount extends SubscriberList {
  subscriber_count: number;
}

/** Creates a list. `type` is `static` (the default) or `segment`. */
export interface CreateSubscriberListInput {
  name: string;
  description?: string;
  type?: string;
  filter_rules?: FilterRule[];
}

/** Changes a list. The type cannot be changed after creation. */
export interface UpdateSubscriberListInput {
  name?: string;
  description?: string;
  filter_rules?: FilterRule[];
}

/** How many subscribers a candidate segment would select. */
export interface SegmentPreview {
  count: number;
}

/**
 * A named opt-out list referenced by `List-Unsubscribe` headers. A recipient
 * who unsubscribes is suppressed on this list alone.
 */
export interface UnsubscribeList {
  id: number;
  uuid: string;
  user_id: number;
  workspace_id?: number | null;
  name: string;
  /** What a recipient sees on the opt-out page. */
  public_name?: string;
  description?: string;
  active: boolean;
  created_at: string;
  updated_at?: string | null;
}

/** Creates or changes an unsubscribe list. */
export interface UnsubscribeListInput {
  name: string;
  public_name?: string;
  description?: string;
  active?: boolean;
}

/** The derived record of an address Posta has mailed, with its counters. */
export interface Contact {
  id: number;
  user_id: number;
  workspace_id?: number | null;
  email: string;
  name?: string;
  sent_count: number;
  fail_count: number;
  last_sent_at?: string | null;
  created_at: string;
}

// ─────────────────────────────────────────────────────────────────────────
// Campaigns
// ─────────────────────────────────────────────────────────────────────────

/** One arm of a campaign A/B test. */
export interface AbTestVariant {
  name: string;
  subject?: string;
  template_id?: number | null;
  split_percentage?: number;
}

/**
 * A bulk send to a subscriber list. `status` is `draft`, `scheduled`,
 * `sending`, `paused`, `completed`, `cancelled`, or `failed`.
 */
export interface Campaign {
  id: number;
  user_id: number;
  workspace_id?: number | null;
  name: string;
  subject?: string;
  from_email?: string;
  from_name?: string;
  list_id: number;
  template_id: number;
  template_version_id?: number | null;
  template_data?: Record<string, unknown>;
  language?: string;
  status: string;
  send_rate?: number;
  send_at_local_time?: boolean;
  ab_test_enabled?: boolean;
  ab_test_variants?: AbTestVariant[];
  ab_test_winner?: string;
  scheduled_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at?: string | null;
}

/** A campaign together with its delivery counters. */
export interface CampaignWithStats extends Campaign {
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  opened_count: number;
  clicked_count: number;
  bounced_count: number;
  unsubscribed_count: number;
}

/** One campaign send to one subscriber, with its engagement timestamps. */
export interface CampaignMessage {
  id: number;
  campaign_id: number;
  subscriber_id: number;
  email_id?: number | null;
  status: string;
  variant?: string;
  error_message?: string;
  sent_at?: string | null;
  opened_at?: string | null;
  clicked_at?: string | null;
  bounced_at?: string | null;
  unsubscribed_at?: string | null;
  created_at: string;
}

/**
 * Schedules a bulk send. Set `scheduled_at` to send later; leave it out and
 * the campaign stays a draft until it is sent explicitly.
 */
export interface CreateCampaignInput {
  name: string;
  subject: string;
  from_email: string;
  from_name?: string;
  /** The subscriber list to send to. */
  list_id: number;
  /** The template to render. */
  template_id: number;
  /** Pins a specific version; omit to use the active one. */
  template_version_id?: number | null;
  template_data?: Record<string, unknown>;
  language?: string;
  scheduled_at?: string | null;
  /** Caps deliveries per hour, to stay within a provider's limits. */
  send_rate?: number;
  /**
   * Staggers delivery so each subscriber receives the campaign at the
   * scheduled hour in their own timezone.
   */
  send_at_local_time?: boolean;
  ab_test_enabled?: boolean;
  ab_test_variants?: AbTestVariant[];
}

/** Changes a draft or scheduled campaign. One that has started cannot be edited. */
export interface UpdateCampaignInput {
  name?: string;
  subject?: string;
  from_email?: string;
  from_name?: string;
  list_id?: number;
  template_id?: number;
  template_version_id?: number | null;
  template_data?: Record<string, unknown>;
  language?: string;
  scheduled_at?: string | null;
  send_rate?: number;
  send_at_local_time?: boolean;
  ab_test_enabled?: boolean;
  ab_test_variants?: AbTestVariant[];
}

/** Headline rates and counts for a campaign. */
export interface CampaignAnalytics {
  total_messages: number;
  sent_messages: number;
  failed_messages: number;
  opened_messages: number;
  clicked_messages: number;
  bounced_messages: number;
  unsubscribed: number;
  delivery_rate: number;
  open_rate: number;
  click_rate: number;
  bounce_rate: number;
  unsubscribe_rate: number;
}

/** One bucket of a time series. */
export interface TimeSeriesPoint {
  time: string;
  count: number;
}

/** A tracked link in a campaign and how often it was clicked. */
export interface CampaignLink {
  id: number;
  campaign_id: number;
  hash: string;
  original_url: string;
  click_count: number;
  created_at: string;
}

/**
 * The full analytics view of a campaign: headline rates, open and click series
 * over time, per-link click counts, and — for an A/B test — the same per variant.
 */
export interface CampaignAnalyticsResponse {
  analytics?: CampaignAnalytics | null;
  open_series?: TimeSeriesPoint[];
  click_series?: TimeSeriesPoint[];
  links?: CampaignLink[];
  variant_analytics?: Record<string, CampaignAnalytics>;
}

// ─────────────────────────────────────────────────────────────────────────
// Analytics
// ─────────────────────────────────────────────────────────────────────────

/** One day's total in a volume series. */
export interface DailyCount {
  date: string;
  count: number;
}

/** The number of emails in one delivery status. */
export interface StatusCount {
  status: string;
  count: number;
}

/** Email volume: a daily series plus the breakdown by delivery status. */
export interface AnalyticsResponse {
  daily_counts: DailyCount[];
  status_breakdown: StatusCount[];
}

/** One day's delivery outcome. */
export interface DeliveryRatePoint {
  date: string;
  total: number;
  sent: number;
  failed: number;
  delivery_rate: number;
}

/** One day's bounces, split by kind. */
export interface BounceRatePoint {
  date: string;
  total: number;
  hard: number;
  soft: number;
  complaint: number;
}

/** The trend view behind the dashboard charts. */
export interface DashboardAnalyticsResponse {
  delivery_rate_trends: DeliveryRatePoint[];
  bounce_rate_trends: BounceRatePoint[];
  latency_percentiles?: Record<string, number> | null;
}

/** One receiving provider's deliverability. */
export interface ProviderStats {
  provider: string;
  total: number;
  sent: number;
  failed: number;
  suppressed: number;
  delivery_rate: number;
}

/**
 * Deliverability grouped by recipient provider, which is how a reputation
 * problem at one mailbox provider shows up.
 */
export interface ProviderBreakdownResponse {
  providers: ProviderStats[];
}

/** One day of send volume. */
export interface DailyVolume {
  date: string;
  sent: number;
  failed: number;
}

/** Which optional subsystems this deployment has enabled. */
export interface WorkspaceFeatures {
  inbound: boolean;
  messages: boolean;
  relay: boolean;
}

/** The workspace's headline counters, as shown on the dashboard. */
export interface DashboardStats {
  total_emails: number;
  sent_emails: number;
  failed_emails: number;
  queued_emails: number;
  processing_emails: number;
  suppressed_emails: number;
  failure_rate: number;
  bounce_rate: number;
  total_bounces: number;
  total_suppressions: number;
  total_templates: number;
  total_domains: number;
  unverified_domains: number;
  total_smtp_servers: number;
  total_webhooks: number;
  total_api_keys: number;
  active_api_keys: number;
  expiring_api_keys: number;
  total_contacts: number;
  total_subscribers: number;
  total_campaigns: number;
  total_inbound: number;
  forwarded_inbound: number;
  failed_inbound: number;
  total_forms: number;
  total_messages: number;
  unread_messages: number;
  spam_messages: number;
  daily_volume?: DailyVolume[];
  webhook_deliveries?: Record<string, number> | null;
  features: WorkspaceFeatures;
}

// ─────────────────────────────────────────────────────────────────────────
// API keys
// ─────────────────────────────────────────────────────────────────────────

/**
 * A machine credential. The secret is returned only once, at creation;
 * afterwards only `key_prefix` identifies it.
 */
export interface ApiKey {
  id: number;
  user_id: number;
  workspace_id?: number | null;
  name: string;
  key_prefix: string;
  scopes?: string[];
  allowed_ips?: string[];
  revoked: boolean;
  last_used_at?: string | null;
  expires_at?: string | null;
  created_at: string;
}

/**
 * A scope an API key can carry. `send` grants none of the others: a send-only
 * key is confined to the public send API and cannot read or modify workspace
 * resources.
 */
export type ApiKeyScope = 'send' | 'read' | 'write' | 'webhooks' | 'admin' | '*';

/** Mints an API key. An empty `scopes` defaults to `send`. */
export interface CreateApiKeyInput {
  name: string;
  scopes?: ApiKeyScope[] | string[];
  allowed_ips?: string[];
  /** Leaves the key permanent when omitted. */
  expires_in_days?: number | null;
}

/** The one-time result of minting a key. `key` is shown only here. */
export interface ApiKeyCreated {
  id: number;
  name: string;
  key: string;
  /** The fragment that identifies the key afterwards. */
  prefix: string;
  scopes?: string[];
  message?: string;
}

/** The envelope returned by endpoints whose only result is a confirmation. */
export interface MessageData {
  message: string;
}

// ─────────────────────────────────────────────────────────────────────────
// Web forms and messages
// ─────────────────────────────────────────────────────────────────────────

/** A web form endpoint that turns public submissions into messages. */
export interface Form {
  id: number;
  uuid: string;
  workspace_id?: number | null;
  name: string;
  slug?: string;
  description?: string;
  public_key: string;
  /** `active`, `paused`, or `archived`. */
  status: string;
  allowed_origins?: string[];
  strict_origin: boolean;
  honeypot_field?: string;
  require_nonce: boolean;
  min_fill_seconds: number;
  max_fields: number;
  max_body_bytes: number;
  allow_attachments: boolean;
  redirect_url?: string;
  scan_enabled: boolean;
  flag_threshold: number;
  quarantine_threshold: number;
  reject_threshold: number;
  notify_enabled: boolean;
  notify_emails?: string[];
  /** `immediate`, `hourly`, `daily`, or `off`. */
  notify_mode?: string;
  notify_on_flagged: boolean;
  reply_from?: string;
  reply_from_name?: string;
  retention_days: number;
  message_count: number;
  spam_count: number;
  last_message_at?: string | null;
  created_at: string;
  updated_at?: string | null;
}

/** Creates a form endpoint. The anti-spam defaults are sensible. */
export interface CreateFormInput {
  name: string;
  slug?: string;
  description?: string;
  /**
   * Site origins permitted to submit. With `strict_origin` this is the main
   * defence against a copied endpoint.
   */
  allowed_origins?: string[];
  strict_origin?: boolean;
  /** Demands a short-lived signed nonce with each submission. */
  require_nonce?: boolean;
  /** Sends browser form posts back to a thank-you page. */
  redirect_url?: string;
  allow_attachments?: boolean;
  notify_emails?: string[];
  /** `immediate`, `hourly`, `daily`, or `off`. */
  notify_mode?: string;
  reply_from?: string;
  reply_from_name?: string;
}

/** Changes a form. Omitted fields are left unchanged. */
export interface UpdateFormInput {
  name?: string;
  slug?: string;
  description?: string;
  /** `active`, `paused`, or `archived`. */
  status?: string;
  allowed_origins?: string[] | null;
  strict_origin?: boolean;
  honeypot_field?: string | null;
  require_nonce?: boolean;
  min_fill_seconds?: number;
  max_fields?: number;
  max_body_bytes?: number;
  allow_attachments?: boolean;
  redirect_url?: string | null;
  scan_enabled?: boolean;
  flag_threshold?: number;
  quarantine_threshold?: number;
  reject_threshold?: number;
  notify_enabled?: boolean;
  notify_emails?: string[] | null;
  notify_mode?: string | null;
  notify_on_flagged?: boolean;
  reply_from?: string | null;
  reply_from_name?: string | null;
  retention_days?: number;
}

/** Paste-ready embed code for a form. */
export interface FormSnippet {
  public_key: string;
  endpoint: string;
  /** A plain `<form>` that posts directly to the endpoint. */
  html: string;
  /** A JavaScript `fetch()` call posting JSON to the endpoint. */
  fetch: string;
}

/** A short-lived, single-use token for a form that requires one. */
export interface FormNonce {
  nonce: string;
  issued_at?: number;
  expires_at?: number;
}

/** One submitted form field, preserved in submission order. */
export interface MessageField {
  key: string;
  value: string;
}

/**
 * A file submitted with a form. `content` is present only for small inline
 * attachments; otherwise download it by index.
 */
export interface MessageAttachment {
  filename: string;
  content_type?: string;
  size: number;
  storage_key?: string;
  content?: string;
}

/** An operator reply on a message thread, or an inbound message continuing it. */
export interface MessageReply {
  id: number;
  uuid: string;
  message_id: number;
  workspace_id?: number | null;
  author_id: number;
  kind: string;
  subject?: string;
  from_addr?: string;
  to_addr?: string;
  html_body?: string;
  text_body?: string;
  email_uuid?: string;
  inbound_email_id?: number | null;
  created_at: string;
}

/**
 * A web form submission. `state` tracks triage (`new`, `open`, `replied`,
 * `closed`, `spam`); `status` records the spam verdict (`received`, `flagged`,
 * `spam`, `rejected`).
 */
export interface Message {
  id: number;
  uuid: string;
  workspace_id?: number | null;
  form_id: number;
  form?: Form | null;
  subject?: string;
  body?: string;
  fields?: MessageField[];
  attachments?: MessageAttachment[];
  sender_name?: string;
  sender_email?: string;
  sender_phone?: string;
  state: string;
  status: string;
  spam_score: number;
  scan_reasons?: string[];
  assigned_to_id?: number | null;
  client_ip?: string;
  origin?: string;
  referer?: string;
  user_agent?: string;
  replies?: MessageReply[];
  reply_count: number;
  read_at?: string | null;
  replied_at?: string | null;
  notified_at?: string | null;
  created_at: string;
  updated_at?: string | null;
}

/** The workspace's message counters. */
export interface MessageStats {
  total: number;
  unread: number;
  spam: number;
  forms: number;
}

/** One day's submission volume. */
export interface MessageDailyCount {
  day: string;
  total: number;
  spam: number;
}

/** Submission volume over time, with the spam share. */
export interface MessageAnalytics {
  total: number;
  spam: number;
  daily: MessageDailyCount[];
}

/** An operator reply, sent through the workspace's normal email pipeline. */
export interface ReplyMessageInput {
  subject?: string;
  text?: string;
  html?: string;
}

/**
 * Quarantines a message. Set `create_filter` to also derive a reusable filter
 * from it, so later submissions like it are caught on arrival.
 */
export interface MarkSpamInput {
  create_filter?: boolean;
  /** `keyword`, `phrase`, `email`, `domain`, or `ip`. */
  kind?: string;
  pattern?: string;
}

/**
 * A spam rule applied to incoming submissions. `kind` selects what the pattern
 * matches (`keyword`, `phrase`, `regex`, `email`, `domain`, `ip`); `action` is
 * `score`, `flag`, `quarantine`, `reject`, or `allowlist`.
 */
export interface MessageFilter {
  id: number;
  workspace_id?: number | null;
  form_id?: number | null;
  kind: string;
  pattern: string;
  fields?: string[];
  action: string;
  score: number;
  case_sensitive: boolean;
  enabled: boolean;
  note?: string;
  hit_count: number;
  last_hit_at?: string | null;
  created_at: string;
  updated_at?: string | null;
}

/** Adds a spam rule. `form_id` limits it to one form. */
export interface CreateMessageFilterInput {
  /** `keyword`, `phrase`, `regex`, `email`, `domain`, or `ip`. */
  kind: string;
  pattern: string;
  /** Submission fields to test; empty tests them all. */
  fields?: string[];
  /** `score`, `flag`, `quarantine`, `reject`, or `allowlist`. */
  action?: string;
  score?: number;
  case_sensitive?: boolean;
  form_id?: number | null;
  note?: string;
}

/** Changes a spam rule. Omitted fields are left unchanged. */
export interface UpdateMessageFilterInput {
  pattern?: string;
  fields?: string[] | null;
  action?: string;
  score?: number;
  case_sensitive?: boolean;
  enabled?: boolean;
  note?: string | null;
}

/** Dry-runs a candidate pattern over recent messages. */
export interface TestMessageFilterInput {
  kind: string;
  pattern: string;
  case_sensitive?: boolean;
  /** Caps how many recent messages are scanned. */
  limit?: number;
}

/** One message a candidate filter would have matched. */
export interface FilterTestSample {
  message_uuid: string;
  subject?: string;
  sender_email?: string;
  excerpt?: string;
}

/** What a candidate filter would have caught. */
export interface FilterTestResult {
  scanned: number;
  matched: number;
  samples?: FilterTestSample[];
}

// ─────────────────────────────────────────────────────────────────────────
// Inbound email
// ─────────────────────────────────────────────────────────────────────────

/**
 * A message Posta received, over its inbound SMTP listener or relayed in by an
 * external provider's webhook.
 */
export interface InboundEmail {
  id: number;
  uuid: string;
  user_id: number;
  workspace_id?: number | null;
  domain_id: number;
  message_id?: string;
  sender: string;
  recipients: string[];
  subject?: string;
  html_body?: string;
  text_body?: string;
  headers_json?: string;
  attachments_json?: string;
  raw_storage_key?: string;
  size: number;
  source?: string;
  spam_score?: number | null;
  status: string;
  error_message?: string;
  retry_count: number;
  forwarded_at?: string | null;
  received_at: string;
  created_at: string;
}

// ─────────────────────────────────────────────────────────────────────────
// Workspaces, users, plans
// ─────────────────────────────────────────────────────────────────────────

/**
 * A tenant: the boundary that owns templates, domains, keys, and every other
 * resource in this API. `role` is the caller's own role in it.
 */
export interface Workspace {
  id: number;
  name: string;
  slug?: string;
  description?: string;
  owner_id?: number;
  role?: string;
  is_personal?: boolean;
  /** The workspace Posta itself sends from (verification, password resets). */
  system?: boolean;
  created_at: string;
}

/** Creates a workspace. `seed_defaults` fills it with starter content. */
export interface CreateWorkspaceInput {
  name: string;
  slug?: string;
  description?: string;
  default_language?: string;
  seed_defaults?: boolean;
}

/** Renames or re-describes a workspace. */
export interface UpdateWorkspaceInput {
  name?: string;
  description?: string;
  default_language?: string;
}

/**
 * A user's membership of a workspace. `role` is `owner`, `admin`, `editor`,
 * or `viewer`.
 */
export interface WorkspaceMember {
  id: number;
  user_id: number;
  email?: string;
  name?: string;
  role: string;
  created_at: string;
}

/** A pending offer of workspace membership. */
export interface Invitation {
  id: number;
  workspace_id: number;
  /** The workspace's name, for showing an invitee what they may join. */
  workspace?: string;
  email: string;
  role: string;
  status?: string;
  expires_at: string;
  created_at: string;
}

/** The workspace's sending defaults and policy. */
export interface WorkspaceSettings {
  workspace_id: number;
  /** Fill in a send's From when it omits one. */
  default_sender_email?: string;
  default_sender_name?: string;
  /** Refuses sends from a domain that has not passed DNS verification. */
  require_verified_domain: boolean;
  /** Adds a hard-bounced address to the suppression list automatically. */
  bounce_auto_suppress: boolean;
  webhook_retry_count: number;
  api_key_expiry_days: number;
  timezone?: string;
  created_at: string;
  updated_at: string;
}

/** Changes workspace settings. Omitted fields are left unchanged. */
export interface UpdateWorkspaceSettingsInput {
  default_sender_email?: string | null;
  default_sender_name?: string | null;
  require_verified_domain?: boolean;
  bounce_auto_suppress?: boolean;
  webhook_retry_count?: number;
  api_key_expiry_days?: number;
  timezone?: string | null;
}

/** Binds a workspace to an OAuth provider for single sign-on. */
export interface WorkspaceSso {
  provider_id: number;
  provider_name?: string;
  /** Restricts SSO to these email domains, comma separated. */
  allowed_domains?: string;
  /** Creates a workspace membership on first SSO login. */
  auto_provision: boolean;
  /** Refuses password logins for members of this workspace. */
  enforce_sso: boolean;
}

/** How many records a GDPR erasure removed. */
export interface GdprDeleteResult {
  deleted: number;
  message?: string;
}

/** An audit or system event. `metadata` is JSON whose shape depends on `type`. */
export interface Event {
  id: number;
  type: string;
  category: string;
  message?: string;
  actor_id?: number | null;
  actor_name?: string;
  workspace_id?: number | null;
  client_ip?: string;
  metadata?: string;
  created_at: string;
}

/**
 * A portable snapshot of a workspace's configuration and content, as produced
 * by export and consumed by import.
 */
export interface WorkspaceDataExport {
  templates?: TemplateExport[];
  languages?: Language[];
  stylesheets?: Stylesheet[];
  domains?: Domain[];
  smtp_servers?: SmtpServer[];
  webhooks?: Webhook[];
  subscribers?: Subscriber[];
  subscriber_lists?: SubscriberList[];
  contact_lists?: SubscriberList[];
  contacts?: Contact[];
  suppressions?: Suppression[];
  unsubscribe_lists?: UnsubscribeList[];
  campaigns?: Campaign[];
  forms?: Form[];
  message_filters?: MessageFilter[];
  posta_version?: string;
  exported_at?: string;
}

/** The quota and feature set applied to a workspace or user. */
export interface Plan {
  id: number;
  name: string;
  description?: string;
  is_default: boolean;
  is_active: boolean;
  daily_rate_limit: number;
  hourly_rate_limit: number;
  max_batch_size: number;
  max_attachment_size_mb: number;
  max_api_keys: number;
  max_domains: number;
  max_smtp_servers: number;
  max_workspaces: number;
  email_log_retention_days: number;
  created_at: string;
  updated_at: string;
}

/** An account on the platform. */
export interface User {
  id: number;
  email: string;
  name?: string;
  role: string;
  active: boolean;
  avatar_url?: string;
  auth_method?: string;
  two_factor_enabled: boolean;
  require_verified_domain: boolean;
  email_verified_at?: string | null;
  last_login_at?: string | null;
  scheduled_deletion_at?: string | null;
  default_workspace_id?: number | null;
  plan_id?: number | null;
  created_at: string;
}

/** The signed-in account. */
export interface UserProfile {
  id: number;
  email: string;
  name?: string;
  role: string;
  two_factor_enabled: boolean;
  email_verified_at?: string | null;
  email_verification_required: boolean;
  require_verified_domain: boolean;
  default_workspace_id?: number | null;
  personal_workspace_id?: number | null;
  /** Set once deletion has been requested, and cleared by cancelling it. */
  scheduled_deletion_at?: string | null;
  created_at: string;
}

/** The account summary returned alongside a session token. */
export interface AuthUser {
  id: number;
  email: string;
  name?: string;
  role: string;
}

/** A successful sign-in: the session token and who it belongs to. */
export interface AuthResponse {
  token: string;
  user: AuthUser;
}

/** The single sign-on provider an address should use. */
export interface SsoProvider {
  name: string;
  slug: string;
  type: string;
}

/** The TOTP secret to enrol an authenticator app. `url` is an otpauth:// URI. */
export interface Enable2faResponse {
  secret: string;
  url: string;
}

/** One signed-in browser or client. */
export interface Session {
  id: number;
  label?: string;
  device?: string;
  browser?: string;
  os?: string;
  ip_address?: string;
  user_agent?: string;
  /** Marks the session making this request. */
  current: boolean;
  created_at?: string;
  expires_at?: string;
}

/** The account's personal defaults and notification preferences. */
export interface UserSettings {
  user_id: number;
  default_sender_email?: string;
  default_sender_name?: string;
  default_language?: string;
  default_template_id?: number | null;
  notification_email?: string;
  email_notifications: boolean;
  daily_report: boolean;
  notify_bounce_alerts: boolean;
  notify_api_key_expiry: boolean;
  notify_new_message: boolean;
  notify_workspace_activity: boolean;
  bounce_auto_suppress: boolean;
  webhook_retry_count: number;
  api_key_expiry_days: number;
  timezone?: string;
  created_at: string;
  updated_at: string;
}

/** Changes account settings. Omitted fields are left unchanged. */
export interface UpdateUserSettingsInput {
  default_sender_email?: string | null;
  default_sender_name?: string | null;
  default_language?: string | null;
  default_template_id?: number | null;
  notification_email?: string | null;
  email_notifications?: boolean;
  daily_report?: boolean;
  notify_bounce_alerts?: boolean;
  notify_api_key_expiry?: boolean;
  notify_new_message?: boolean;
  notify_workspace_activity?: boolean;
  bounce_auto_suppress?: boolean;
  webhook_retry_count?: number;
  api_key_expiry_days?: number;
  timezone?: string | null;
}

/** A dashboard message addressed to the signed-in user. */
export interface Notification {
  id: number;
  user_id: number;
  workspace_id?: number | null;
  kind?: string;
  category?: string;
  severity?: string;
  title: string;
  body?: string;
  link?: string;
  action_text?: string;
  /** Collapses repeats of the same condition into one notification. */
  dedup_key?: string;
  read_at?: string | null;
  dismissed_at?: string | null;
  resolved_at?: string | null;
  created_at: string;
  updated_at: string;
}

/** Filters the account's notifications. */
export interface NotificationOptions {
  unread?: boolean;
  /** Keep only notifications that have not been dismissed. */
  open?: boolean;
  category?: string;
  /** Pages backwards from a notification id. */
  before?: number;
  limit?: number;
  /** Restricts the result to the active workspace. */
  scoped?: boolean;
}

/** The unread and open notification totals, for a badge. */
export interface NotificationCounts {
  unread: number;
  open: number;
}

/** An external identity linked to the account. */
export interface LinkedOAuthAccount {
  id: number;
  provider_id: number;
  provider_name: string;
  provider_type?: string;
  email?: string;
  created_at?: string;
}

/** Filters the account's audit log. */
export interface AuditLogOptions extends ListOptions {
  category?: string;
  search?: string;
}

// ─────────────────────────────────────────────────────────────────────────
// Platform administration
// ─────────────────────────────────────────────────────────────────────────

/** Creates an account directly. `role` is `admin` or `user`. */
export interface CreateUserInput {
  email: string;
  name?: string;
  password: string;
  role: string;
}

/** Changes an account's role or standing. */
export interface UpdateUserInput {
  role?: string;
  active?: boolean;
  email_verified?: boolean;
}

/** One account's usage across the platform. */
export interface UserMetrics {
  user?: User | null;
  total_emails: number;
  sent_emails: number;
  failed_emails: number;
  suppressed_emails: number;
  failure_rate: number;
  total_bounces: number;
  total_suppressions: number;
  total_contacts: number;
  total_domains: number;
  total_smtp_servers: number;
  total_api_keys: number;
  active_api_keys: number;
  total_inbound: number;
  forwarded_inbound: number;
  failed_inbound: number;
  webhook_deliveries?: Record<string, number> | null;
}

/** A workspace as seen from platform administration, with its plan. */
export interface AdminWorkspace {
  id: number;
  name: string;
  slug?: string;
  owner_id: number;
  plan_id?: number | null;
  plan_name?: string;
  created_at: string;
  updated_at: string;
}

/** Defines a plan's quotas. */
export interface CreatePlanInput {
  name: string;
  description?: string;
  is_default?: boolean;
  daily_rate_limit?: number;
  hourly_rate_limit?: number;
  max_batch_size?: number;
  max_attachment_size_mb?: number;
  max_api_keys?: number;
  max_domains?: number;
  max_smtp_servers?: number;
  max_workspaces?: number;
  email_log_retention_days?: number;
}

/** Changes a plan's quotas. Omitted fields are left unchanged. */
export interface UpdatePlanInput {
  name?: string | null;
  description?: string | null;
  is_default?: boolean;
  is_active?: boolean;
  daily_rate_limit?: number;
  hourly_rate_limit?: number;
  max_batch_size?: number;
  max_attachment_size_mb?: number;
  max_api_keys?: number;
  max_domains?: number;
  max_smtp_servers?: number;
  max_workspaces?: number;
  email_log_retention_days?: number;
}

/** A shared SMTP server offered to workspaces that have none of their own. */
export interface Server {
  id: number;
  name: string;
  host: string;
  port: number;
  username?: string;
  encryption?: string;
  security_mode?: string;
  allowed_domains?: string[];
  max_retries: number;
  status?: string;
  sent_count: number;
  failed_count: number;
  validated_at?: string | null;
  validation_error?: string;
  created_at: string;
  updated_at: string;
}

/** Registers a shared SMTP server. */
export interface CreateServerInput {
  name: string;
  host: string;
  port: number;
  username?: string;
  password?: string;
  encryption?: string;
  /** How strictly TLS is enforced: `permissive` or `strict`. */
  security_mode?: string;
  /** Restricts which sender domains may use this server. */
  allowed_domains?: string[];
  max_retries?: number;
}

/** Changes a shared SMTP server. Omit `password` to keep the stored one. */
export interface UpdateServerInput {
  name?: string;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  encryption?: string;
  security_mode?: string;
  status?: string;
  allowed_domains?: string[];
  max_retries?: number;
}

/** A domain as seen across every workspace, with its owner. */
export interface AdminDomain {
  id: number;
  domain: string;
  owner_id: number;
  owner_email?: string;
  workspace_id?: number | null;
  workspace_name?: string;
  ownership_verified: boolean;
  spf_verified: boolean;
  dkim_verified: boolean;
  dmarc_verified: boolean;
  fully_verified: boolean;
  created_at: string;
}

/** Filters the platform-wide domain list. */
export interface AdminDomainListOptions extends ListOptions {
  search?: string;
  /** Verification state, such as `verified` or `pending`. */
  status?: string;
  /** Restricts the result to one workspace. */
  workspace?: number;
}

/** Filters the platform event log. */
export interface EventListOptions extends ListOptions {
  category?: string;
  search?: string;
}

/** The deployment's overall usage and runtime health. */
export interface PlatformMetrics {
  total_users: number;
  total_workspaces: number;
  users_without_workspace: number;
  two_factor_users: number;
  two_factor_adoption_rate: number;
  active_sessions: number;
  failed_logins_last_24h: number;
  total_emails: number;
  sent_emails: number;
  failed_emails: number;
  queued_emails: number;
  processing_emails: number;
  suppressed_emails: number;
  failure_rate: number;
  total_bounces: number;
  total_suppressions: number;
  total_domains: number;
  total_api_keys: number;
  active_api_keys: number;
  shared_smtp_servers: number;
  total_inbound: number;
  received_inbound: number;
  forwarded_inbound: number;
  failed_inbound: number;
  rejected_inbound: number;
  active_workers: number;
  current_goroutines: number;
  current_memory_usage: number;
  server_uptime_seconds: number;
  webhook_deliveries?: Record<string, number> | null;
}

/** One platform or workspace configuration entry. */
export interface Setting {
  id: number;
  key: string;
  value: string;
}

/** A platform-wide notice. `recipients` counts the users it reached. */
export interface Announcement {
  id: number;
  title: string;
  message?: string;
  /** `info`, `warning`, or `critical`. */
  severity?: string;
  link?: string;
  created_by?: number;
  author_name?: string;
  recipients: number;
  sent_at?: string | null;
  created_at: string;
  updated_at: string;
}

/** Broadcasts a notice to every user. */
export interface CreateAnnouncementInput {
  title: string;
  message?: string;
  /** `info`, `warning`, or `critical`. */
  severity?: string;
  link?: string;
}

/** Whether a newer Posta release is available. */
export interface UpdateInfo {
  enabled: boolean;
  current_version: string;
  latest_version?: string;
  update_available: boolean;
  release_url?: string;
  published_at?: string | null;
  checked_at?: string | null;
  last_error?: string;
}

/** An SSO provider configured for the platform. */
export interface OAuthProvider {
  id: number;
  name: string;
  slug: string;
  /** The protocol family, such as `oidc`, `google`, or `github`. */
  type: string;
  issuer?: string;
  scopes?: string;
  /** Restricts sign-in to these email domains, comma separated. */
  allowed_domains?: string;
  /** Creates an account on first sign-in through this provider. */
  auto_register: boolean;
  enabled: boolean;
  /** Keeps the provider off the sign-in page. */
  hidden: boolean;
  created_at?: string;
}

/**
 * Configures an SSO provider. For a standards-compliant OIDC provider `issuer`
 * alone is enough — Posta discovers the endpoints. Set the explicit URLs only
 * for one that publishes no discovery document.
 */
export interface CreateOAuthProviderInput {
  name: string;
  slug: string;
  type: string;
  client_id: string;
  client_secret: string;
  issuer?: string;
  auth_url?: string;
  token_url?: string;
  userinfo_url?: string;
  scopes?: string;
  allowed_domains?: string;
  auto_register?: boolean;
  hidden?: boolean;
}

/** Changes an SSO provider. Omit `client_secret` to keep the stored one. */
export interface UpdateOAuthProviderInput {
  name?: string;
  client_id?: string;
  client_secret?: string;
  issuer?: string;
  auth_url?: string;
  token_url?: string;
  userinfo_url?: string;
  scopes?: string;
  allowed_domains?: string;
  auto_register?: boolean;
  enabled?: boolean;
  hidden?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────
// System
// ─────────────────────────────────────────────────────────────────────────

/** The running build. */
export interface AppInfo {
  name: string;
  version: string;
  commit_id: string;
  openapi_docs: boolean;
}

/**
 * A liveness or readiness answer. `database` and `redis` are filled in only by
 * the readiness probe.
 */
export interface HealthStatus {
  status: string;
  database?: string;
  redis?: string;
}

// ─────────────────────────────────────────────────────────────────────────
// Webhook event payloads
// ─────────────────────────────────────────────────────────────────────────

/** Payload of the `email.sent` and `email.failed` events. */
export interface EmailEventPayload {
  event: string;
  email_id: string;
  timestamp: string;
}

/** Payload of the `campaign.started` and `campaign.completed` events. */
export interface CampaignEventPayload {
  event: string;
  campaign_id: number;
  name: string;
  timestamp: string;
}

/** Payload of the `email.complained` event. */
export interface ComplaintEventPayload {
  event: string;
  email: string;
  email_uuid: string;
  timestamp: string;
}

/**
 * Payload of the `email.unsubscribed` event. `list_id` names the unsubscribe
 * list the recipient opted out of, if any.
 */
export interface UnsubscribeEventPayload {
  event: string;
  email: string;
  email_uuid: string;
  list_id?: number | null;
  timestamp: string;
}

/** A file on an inbound message. */
export interface InboundAttachment {
  filename: string;
  content_type?: string;
  size: number;
}

/** Payload of the `email.inbound` event: a received message, already parsed. */
export interface InboundEventPayload {
  event: string;
  inbound_id: string;
  message_id?: string;
  from: string;
  to: string[];
  subject?: string;
  html_body?: string;
  text_body?: string;
  headers?: Record<string, unknown>;
  attachments?: InboundAttachment[];
  size: number;
  source?: string;
  received_at: string;
  timestamp: string;
}

/**
 * Payload of the `message.received` and `message.spam` events: a web form
 * submission and the verdict scanning gave it.
 */
export interface MessageEventPayload {
  event: string;
  message_id: string;
  form_id: string;
  form_name?: string;
  subject?: string;
  body?: string;
  fields?: MessageField[];
  sender_name?: string;
  sender_email?: string;
  sender_phone?: string;
  status: string;
  spam_score: number;
  scan_reasons?: string[];
  client_ip?: string;
  received_at: string;
  timestamp: string;
}

/** Any Posta webhook payload. Narrow on the `event` field. */
export type WebhookPayload =
  | EmailEventPayload
  | CampaignEventPayload
  | ComplaintEventPayload
  | UnsubscribeEventPayload
  | InboundEventPayload
  | MessageEventPayload;
