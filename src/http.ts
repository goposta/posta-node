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

import type { ApiResponse, ApiErrorResponse, ErrorInfo, PageableResponse } from './types.js';

/** Header that selects the active workspace for workspace-scoped endpoints. */
export const WORKSPACE_HEADER = 'X-Posta-Workspace-Id';

/** Header carrying a webhook delivery's HMAC signature. */
export const SIGNATURE_HEADER = 'X-Posta-Signature';

/** Path prefix shared by every workspace-scoped endpoint. */
export const WS = '/workspaces/current';

/** Client library version, reported in the User-Agent header. */
export const VERSION = '0.2.0';

/** Error thrown when the Posta API returns a non-2xx status code. */
export class PostaError extends Error {
  /** HTTP status code from the API response. */
  readonly statusCode: number;
  /** Structured error details from the API, when the response carried them. */
  readonly info?: ErrorInfo;

  constructor(statusCode: number, message: string, info?: ErrorInfo) {
    super(`posta: ${statusCode} ${message}`);
    this.name = 'PostaError';
    this.statusCode = statusCode;
    this.info = info;
  }

  /** True when the API answered 404: no such record. */
  get isNotFound(): boolean {
    return this.statusCode === 404;
  }

  /** True when the API answered 401: missing, malformed, or revoked credential. */
  get isUnauthorized(): boolean {
    return this.statusCode === 401;
  }

  /**
   * True when the API answered 403. For an API key this usually means the key
   * lacks the scope the endpoint requires.
   */
  get isForbidden(): boolean {
    return this.statusCode === 403;
  }

  /** True when the API answered 429: rate limited. */
  get isRateLimited(): boolean {
    return this.statusCode === 429;
  }
}

/** Options for creating a client. */
export interface PostaClientOptions {
  /** Request timeout in milliseconds (default: 30000). */
  timeout?: number;
  /**
   * Active workspace for workspace-scoped endpoints. A workspace-bound API key
   * already names its workspace; an account-wide key or a user session does not.
   */
  workspaceId?: number;
  /** Extra headers sent with every request. */
  headers?: Record<string, string>;
  /** Overrides the User-Agent header. */
  userAgent?: string;
  /** Supplies a custom fetch implementation, for testing or proxying. */
  fetch?: typeof fetch;
}

/** Query parameter values accepted by the request builders. */
export type QueryValue = string | number | boolean | undefined | null;

/** Builds a query string, omitting empty values. */
export function query(params: Record<string, QueryValue>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  const encoded = search.toString();
  return encoded ? `?${encoded}` : '';
}

/** URL-encodes a path segment. */
export function seg(value: string | number): string {
  return encodeURIComponent(String(value));
}

/**
 * The HTTP transport shared by every resource client. It unwraps Posta's
 * `{ success, data }` envelope and turns non-2xx responses into
 * {@link PostaError}.
 */
export class HttpClient {
  readonly baseUrl: string;
  /** Deployment root, without the /api/v1 prefix; the health probes live here. */
  readonly rootUrl: string;
  private readonly credential: string;
  private readonly timeout: number;
  private readonly extraHeaders: Record<string, string>;
  private readonly fetchImpl: typeof fetch;

  constructor(baseUrl: string, credential: string, options?: PostaClientOptions) {
    this.rootUrl = baseUrl.replace(/\/+$/, '');
    this.baseUrl = `${this.rootUrl}/api/v1`;
    this.credential = credential;
    this.timeout = options?.timeout ?? 30_000;
    this.fetchImpl = options?.fetch ?? fetch;

    const headers: Record<string, string> = { ...(options?.headers ?? {}) };
    headers['User-Agent'] = options?.userAgent ?? `posta-node/${VERSION}`;
    if (options?.workspaceId !== undefined) {
      headers[WORKSPACE_HEADER] = String(options.workspaceId);
    }
    this.extraHeaders = headers;
  }

  /** GET, returning the envelope's `data`. */
  get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  /** GET, returning the full paginated envelope (`data` plus `pageable`). */
  getPage<T>(path: string): Promise<PageableResponse<T>> {
    return this.raw<PageableResponse<T>>('GET', path);
  }

  /** POST, returning the envelope's `data`. */
  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  /** PUT, returning the envelope's `data`. */
  put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PUT', path, body);
  }

  /** PATCH, returning the envelope's `data`. */
  patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PATCH', path, body);
  }

  /** DELETE, returning the envelope's `data` (often nothing). */
  delete<T = void>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('DELETE', path, body);
  }

  /**
   * Fetches a URL outside the versioned API and returns the body as-is: the
   * health probes answer with a bare object, not the `{ success, data }`
   * envelope every /api/v1 endpoint uses.
   */
  async getRoot<T>(path: string): Promise<T> {
    const resp = await this.send('GET', this.rootUrl + path);
    return (await this.parse<T>(resp)) as T;
  }

  /**
   * Downloads a binary body, for endpoints that answer with a file rather than
   * JSON — message and inbound attachments, and raw `.eml` messages.
   */
  async download(path: string): Promise<{ data: ArrayBuffer; contentType: string }> {
    const resp = await this.send('GET', this.baseUrl + path);
    await this.throwIfError(resp);
    return {
      data: await resp.arrayBuffer(),
      contentType: resp.headers.get('Content-Type') ?? 'application/octet-stream',
    };
  }

  /** Uploads a multipart/form-data body, returning the envelope's `data`. */
  async upload<T>(path: string, form: FormData): Promise<T> {
    // Content-Type is deliberately unset: fetch derives it from the FormData,
    // including the boundary the server needs to parse the parts.
    const resp = await this.send('POST', this.baseUrl + path, undefined, form);
    await this.throwIfError(resp);
    const envelope = await this.parse<ApiResponse<T> | undefined>(resp);
    return envelope?.data as T;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const envelope = await this.raw<ApiResponse<T> | undefined>(method, path, body);
    return envelope?.data as T;
  }

  private async raw<T>(method: string, path: string, body?: unknown): Promise<T> {
    const resp = await this.send(method, this.baseUrl + path, body);
    await this.throwIfError(resp);
    return (await this.parse<T>(resp)) as T;
  }

  private async send(
    method: string,
    url: string,
    body?: unknown,
    form?: FormData,
  ): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);
    try {
      const headers: Record<string, string> = {
        Accept: 'application/json',
        ...this.extraHeaders,
      };
      if (this.credential) headers.Authorization = `Bearer ${this.credential}`;
      if (!form) headers['Content-Type'] = 'application/json';

      return await this.fetchImpl(url, {
        method,
        headers,
        body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  }

  private async throwIfError(resp: Response): Promise<void> {
    if (resp.ok) return;
    let info: ErrorInfo | undefined;
    try {
      const body = (await resp.json()) as ApiErrorResponse;
      info = body.error ?? undefined;
    } catch {
      // An error response without a JSON envelope still has its status.
    }
    throw new PostaError(
      resp.status,
      info?.message ?? `unexpected status ${resp.status}`,
      info,
    );
  }

  private async parse<T>(resp: Response): Promise<T | undefined> {
    await this.throwIfError(resp);
    if (resp.status === 204) return undefined;
    const text = await resp.text();
    if (text.length === 0) return undefined;
    return JSON.parse(text) as T;
  }
}
