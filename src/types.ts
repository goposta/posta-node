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

/** Request body for sending a single email. */
export interface SendEmailRequest {
  from: string;
  to: string[];
  subject: string;
  html?: string;
  text?: string;
  attachments?: Attachment[];
  headers?: Record<string, string>;
  list_unsubscribe_url?: string;
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

/** Error envelope returned by Posta. */
export interface ApiErrorResponse {
  success: boolean;
  error?: ErrorInfo;
}
