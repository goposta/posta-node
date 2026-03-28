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
 * Official Node.js client for the Posta email delivery platform.
 *
 * Supports sending emails, template emails, batch emails, previewing
 * templates, checking delivery status, and retrying failed emails
 * using API key authentication.
 *
 * Uses the built-in `fetch` API (Node.js 18+), so no external
 * dependencies are required.
 *
 * @example
 * ```ts
 * import { PostaClient } from '@goposta/posta';
 *
 * const client = new PostaClient('https://posta.example.com', 'your-api-key');
 *
 * const resp = await client.sendEmail({
 *   from: 'sender@example.com',
 *   to: ['recipient@example.com'],
 *   subject: 'Hello from Posta',
 *   html: '<h1>Hello!</h1>',
 * });
 * console.log(`Email sent: id=${resp.id} status=${resp.status}`);
 * ```
 *
 * @packageDocumentation
 */

export * from './types.js';

import type {
  SendEmailRequest,
  SendTemplateEmailRequest,
  BatchRequest,
  SendResponse,
  BatchResponse,
  EmailStatusResponse,
  PreviewRequest,
  PreviewResponse,
  ApiResponse,
  ApiErrorResponse,
  ErrorInfo,
} from './types.js';

/** Error thrown when the Posta API returns a non-2xx status code. */
export class PostaError extends Error {
  /** HTTP status code from the API response. */
  readonly statusCode: number;
  /** Structured error details from the API, if available. */
  readonly info?: ErrorInfo;

  constructor(statusCode: number, message: string, info?: ErrorInfo) {
    super(`posta: ${statusCode} ${message}`);
    this.name = 'PostaError';
    this.statusCode = statusCode;
    this.info = info;
  }
}

/** Options for creating a {@link PostaClient}. */
export interface PostaClientOptions {
  /** Request timeout in milliseconds (default: 30000). */
  timeout?: number;
}

/**
 * Posta API client.
 *
 * All methods return promises that resolve on success and reject with
 * a {@link PostaError} when the API returns a non-2xx status code.
 */
export class PostaClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeout: number;

  /**
   * Creates a new Posta client authenticated with an API key (Bearer token).
   *
   * @param baseUrl - Base URL of the Posta instance (e.g. `https://posta.example.com`)
   * @param apiKey  - API key for authentication
   * @param options - Optional client configuration
   */
  constructor(baseUrl: string, apiKey: string, options?: PostaClientOptions) {
    this.baseUrl = baseUrl.replace(/\/+$/, '') + '/api/v1';
    this.apiKey = apiKey;
    this.timeout = options?.timeout ?? 30_000;
  }

  /** Sends a single email. */
  async sendEmail(req: SendEmailRequest): Promise<SendResponse> {
    return this.post<SendResponse>('/emails/send', req);
  }

  /** Sends an email using a template. */
  async sendTemplateEmail(req: SendTemplateEmailRequest): Promise<SendResponse> {
    return this.post<SendResponse>('/emails/send-template', req);
  }

  /** Sends a batch of emails using a template. */
  async sendBatch(req: BatchRequest): Promise<BatchResponse> {
    return this.post<BatchResponse>('/emails/batch', req);
  }

  /** Previews a rendered template without sending. */
  async previewTemplate(req: PreviewRequest): Promise<PreviewResponse> {
    return this.post<PreviewResponse>('/emails/preview', req);
  }

  /** Returns the delivery status of an email by UUID. */
  async getEmailStatus(emailId: string): Promise<EmailStatusResponse> {
    return this.get<EmailStatusResponse>(`/emails/${encodeURIComponent(emailId)}/status`);
  }

  /**
   * Retries a failed email delivery.
   *
   * Only emails with status `"failed"` can be retried, subject to the
   * retry limit configured on the SMTP server.
   */
  async retryEmail(emailId: string): Promise<SendResponse> {
    return this.post<SendResponse>(`/emails/${encodeURIComponent(emailId)}/retry`);
  }

  // ── internal helpers ─────────────────────────────────────────────

  private async get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  private async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = this.baseUrl + path;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const resp = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (!resp.ok) {
        let info: ErrorInfo | undefined;
        try {
          const errBody = (await resp.json()) as ApiErrorResponse;
          info = errBody.error ?? undefined;
        } catch {
          // ignore parse errors on error responses
        }
        throw new PostaError(
          resp.status,
          info?.message ?? `unexpected status ${resp.status}`,
          info,
        );
      }

      const envelope = (await resp.json()) as ApiResponse<T>;
      return envelope.data;
    } finally {
      clearTimeout(timer);
    }
  }
}
