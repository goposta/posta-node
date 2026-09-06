import { createHmac, timingSafeEqual } from 'node:crypto';
import { HttpClient, WS, query, seg } from '../http.js';
import type {
  Webhook, WebhookDelivery, CreateWebhookInput, ListOptions, PageableResponse,
} from '../types.js';

/**
 * Webhook event names. Register a subset on a webhook to choose what Posta
 * notifies you about.
 */
export const WebhookEvents = {
  /** A message was accepted by the destination MTA. */
  EmailSent: 'email.sent',
  /** A message permanently failed after retries. */
  EmailFailed: 'email.failed',
  /** An inbound email was received and parsed. */
  EmailInbound: 'email.inbound',
  /** A recipient opted out via one-click unsubscribe. */
  EmailUnsubscribed: 'email.unsubscribed',
  /** A recipient marked a message as spam. */
  EmailComplained: 'email.complained',
  /** A campaign began sending. */
  CampaignStarted: 'campaign.started',
  /** A campaign finished sending. */
  CampaignCompleted: 'campaign.completed',
  /** A web form submission passed scanning. */
  MessageReceived: 'message.received',
  /** A web form submission was quarantined or rejected. */
  MessageSpam: 'message.spam',
} as const;

/**
 * Reports whether `signature` authenticates `body` under `secret`.
 *
 * Posta signs each delivery with HMAC-SHA256 over the raw request body and
 * sends it as `sha256=<hex>` in the `X-Posta-Signature` header. Pass the header
 * value verbatim, along with the exact bytes received — re-serializing the JSON
 * changes them and the check will fail.
 *
 * @example
 * ```ts
 * if (!verifySignature(rawBody, req.headers['x-posta-signature'], secret)) {
 *   return res.status(401).send('bad signature');
 * }
 * ```
 */
export function verifySignature(
  body: string | Buffer,
  signature: string | undefined,
  secret: string,
): boolean {
  if (!signature || !secret) return false;
  const provided = signature.startsWith('sha256=') ? signature.slice(7) : signature;
  const expected = createHmac('sha256', secret)
    .update(typeof body === 'string' ? Buffer.from(body, 'utf8') : body)
    .digest('hex');

  const a = Buffer.from(provided, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  // timingSafeEqual throws on a length mismatch, which is itself a mismatch.
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Registers endpoints Posta notifies, and reads the delivery attempts it made.
 */
export class WebhooksClient {
  constructor(private readonly http: HttpClient) {}

  /** Returns a page of webhooks. Needs an API key with the `webhooks` scope. */
  list(options?: ListOptions): Promise<PageableResponse<Webhook>> {
    return this.http.getPage<Webhook>(`/webhooks${query({ ...options })}`);
  }

  /**
   * Registers a webhook endpoint. The response carries the signing secret,
   * which is shown only here — store it to verify deliveries.
   */
  create(input: CreateWebhookInput): Promise<Webhook> {
    return this.http.post<Webhook>('/webhooks', input);
  }

  /** Removes a webhook. */
  async delete(id: number): Promise<void> {
    await this.http.delete(`/webhooks/${seg(id)}`);
  }

  /**
   * Returns a page of delivery attempts, with the HTTP status and error of
   * each. Needs an API key with the `read` scope.
   */
  listDeliveries(options?: ListOptions): Promise<PageableResponse<WebhookDelivery>> {
    return this.http.getPage<WebhookDelivery>(`/webhook-deliveries${query({ ...options })}`);
  }

  /** Returns a page of webhooks through the workspace-scoped endpoint. */
  listInWorkspace(options?: ListOptions): Promise<PageableResponse<Webhook>> {
    return this.http.getPage<Webhook>(`${WS}/webhooks${query({ ...options })}`);
  }

  /** Registers a webhook through the workspace-scoped endpoint. */
  createInWorkspace(input: CreateWebhookInput): Promise<Webhook> {
    return this.http.post<Webhook>(`${WS}/webhooks`, input);
  }

  /** Removes a webhook through the workspace-scoped endpoint. */
  async deleteInWorkspace(id: number): Promise<void> {
    await this.http.delete(`${WS}/webhooks/${seg(id)}`);
  }

  /** Returns delivery attempts through the workspace-scoped endpoint. */
  listDeliveriesInWorkspace(options?: ListOptions): Promise<PageableResponse<WebhookDelivery>> {
    return this.http.getPage<WebhookDelivery>(`${WS}/webhook-deliveries${query({ ...options })}`);
  }
}
