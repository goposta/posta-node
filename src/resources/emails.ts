import { HttpClient, WS, query, seg } from '../http.js';
import type {
  SendEmailRequest, SendTemplateEmailRequest, BatchRequest, SendResponse,
  BatchResponse, EmailStatusResponse, PreviewRequest, PreviewResponse,
  VerifyEmailRequest, VerificationResult, DryRunResponse, Email, Bounce,
  Suppression, AddSuppressionInput, RecordBounceInput, ListOptions,
  EmailListOptions, SuppressionListOptions, PageableResponse,
} from '../types.js';

/** Flags accepted by send, send-template, and batch. */
export interface SendOptions {
  /** Validate the request without sending. */
  dryRun?: boolean;
}

/** Flags accepted by the verify endpoint. */
export interface VerifyOptions {
  /** Bypass the verifier cache and re-check the address. */
  fresh?: boolean;
}

const dryRun = (options?: SendOptions) => query({ dry_run: options?.dryRun || undefined });

/**
 * Sends mail and reads the resulting delivery records.
 *
 * Sending needs an API key with the `send` scope; `list` and `get` need `read`.
 */
export class EmailsClient {
  constructor(private readonly http: HttpClient) {}

  /** Sends a single email. */
  send(req: SendEmailRequest, options?: SendOptions): Promise<SendResponse> {
    return this.http.post<SendResponse>(`/emails/send${dryRun(options)}`, req);
  }

  /**
   * Validates a send without delivering it. The payload reports what would have
   * happened: which recipients are suppressed, whether the sending domain is
   * verified, and how the template renders.
   */
  sendDryRun(req: SendEmailRequest): Promise<DryRunResponse> {
    return this.http.post<DryRunResponse>('/emails/send?dry_run=true', req);
  }

  /**
   * Sends an email rendered from a stored template. Identify the template by
   * `template_id` (preferred) or `template` (name).
   */
  sendTemplate(req: SendTemplateEmailRequest, options?: SendOptions): Promise<SendResponse> {
    return this.http.post<SendResponse>(`/emails/send-template${dryRun(options)}`, req);
  }

  /** Validates a template send without delivering it. */
  sendTemplateDryRun(req: SendTemplateEmailRequest): Promise<DryRunResponse> {
    return this.http.post<DryRunResponse>('/emails/send-template?dry_run=true', req);
  }

  /**
   * Sends one template to many recipients with per-recipient variables. The
   * response reports each recipient's outcome individually.
   */
  sendBatch(req: BatchRequest, options?: SendOptions): Promise<BatchResponse> {
    return this.http.post<BatchResponse>(`/emails/batch${dryRun(options)}`, req);
  }

  /** Validates a batch send without delivering it. */
  sendBatchDryRun(req: BatchRequest): Promise<DryRunResponse> {
    return this.http.post<DryRunResponse>('/emails/batch?dry_run=true', req);
  }

  /** Renders a template with variables and returns it without sending. */
  preview(req: PreviewRequest): Promise<PreviewResponse> {
    return this.http.post<PreviewResponse>('/emails/preview', req);
  }

  /**
   * Checks whether an address is worth sending to: syntax, MX records,
   * disposable and role-account detection, and the caller's own suppression and
   * bounce history. Results are cached; pass `{ fresh: true }` to re-check.
   */
  verify(req: VerifyEmailRequest, options?: VerifyOptions): Promise<VerificationResult> {
    return this.http.post<VerificationResult>(
      `/emails/verify${query({ fresh: options?.fresh || undefined })}`,
      req,
    );
  }

  /** Returns a lightweight delivery status, suitable for polling. */
  status(uuid: string): Promise<EmailStatusResponse> {
    return this.http.get<EmailStatusResponse>(`/emails/${seg(uuid)}/status`);
  }

  /**
   * Re-enqueues a failed email. Only emails in the `failed` state can be
   * retried, and only up to the SMTP server's retry limit.
   */
  retry(uuid: string): Promise<SendResponse> {
    return this.http.post<SendResponse>(`/emails/${seg(uuid)}/retry`);
  }

  /** Returns a page of emails. Needs an API key with the `read` scope. */
  list(options?: EmailListOptions): Promise<PageableResponse<Email>> {
    return this.http.getPage<Email>(`/emails${query({ ...options })}`);
  }

  /** Returns one email by UUID, including its rendered bodies. */
  get(uuid: string): Promise<Email> {
    return this.http.get<Email>(`/emails/${seg(uuid)}`);
  }

  /**
   * Returns a page of emails through the workspace-scoped endpoint, which a
   * session credential can also reach.
   */
  listInWorkspace(options?: EmailListOptions): Promise<PageableResponse<Email>> {
    return this.http.getPage<Email>(`${WS}/emails${query({ ...options })}`);
  }

  /** Returns one email through the workspace-scoped endpoint. */
  getInWorkspace(uuid: string): Promise<Email> {
    return this.http.get<Email>(`${WS}/emails/${seg(uuid)}`);
  }
}

/** Reads recorded bounces and complaints, and records them for a provider. */
export class BouncesClient {
  constructor(private readonly http: HttpClient) {}

  /** Returns a page of bounces. Needs an API key with the `read` scope. */
  list(options?: ListOptions): Promise<PageableResponse<Bounce>> {
    return this.http.getPage<Bounce>(`/bounces${query({ ...options })}`);
  }

  /** Returns a page of bounces through the workspace-scoped endpoint. */
  listInWorkspace(options?: ListOptions): Promise<PageableResponse<Bounce>> {
    return this.http.getPage<Bounce>(`${WS}/bounces${query({ ...options })}`);
  }

  /**
   * Files a bounce or complaint against a recipient, for callers relaying
   * notifications from a provider Posta does not poll itself.
   */
  record(input: RecordBounceInput): Promise<Bounce> {
    return this.http.post<Bounce>(`${WS}/bounces`, input);
  }
}

/** Manages the addresses Posta refuses to deliver to. */
export class SuppressionsClient {
  constructor(private readonly http: HttpClient) {}

  /**
   * Returns a page of suppressed addresses. Set `list_id` to see the opt-outs
   * recorded against a single unsubscribe list.
   */
  list(options?: SuppressionListOptions): Promise<PageableResponse<Suppression>> {
    return this.http.getPage<Suppression>(`${WS}/suppressions${query({ ...options })}`);
  }

  /** Suppresses an address. */
  add(input: AddSuppressionInput): Promise<Suppression> {
    return this.http.post<Suppression>(`${WS}/suppressions`, input);
  }

  /**
   * Lifts a suppression, letting Posta deliver to the address again. Pass
   * `listId` to lift a list-scoped opt-out, or omit it for the workspace-wide
   * entry.
   */
  async remove(email: string, listId?: number): Promise<void> {
    await this.http.delete(`${WS}/suppressions`, { email, list_id: listId });
  }
}
