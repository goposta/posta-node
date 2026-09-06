import { HttpClient, WS, query, seg } from '../http.js';
import type {
  Form, CreateFormInput, UpdateFormInput, FormSnippet, FormNonce, Message,
  MessageReply, MessageStats, MessageAnalytics, ReplyMessageInput,
  MarkSpamInput, MessageFilter, CreateMessageFilterInput,
  UpdateMessageFilterInput, TestMessageFilterInput, FilterTestResult,
  InboundEmail, MessageListOptions, InboundListOptions, ListOptions,
  PageableResponse,
} from '../types.js';

/**
 * Manages web form endpoints: public URLs a website posts to, whose submissions
 * land in the workspace as messages.
 */
export class FormsClient {
  constructor(private readonly http: HttpClient) {}

  /** Adds a form and returns it with its public key. */
  create(input: CreateFormInput): Promise<Form> {
    return this.http.post<Form>(`${WS}/forms`, input);
  }

  /** Returns a page of forms. */
  list(options?: ListOptions): Promise<PageableResponse<Form>> {
    return this.http.getPage<Form>(`${WS}/forms${query({ ...options })}`);
  }

  /** Returns one form. */
  get(id: number): Promise<Form> {
    return this.http.get<Form>(`${WS}/forms/${seg(id)}`);
  }

  /** Changes a form. */
  update(id: number, input: UpdateFormInput): Promise<Form> {
    return this.http.put<Form>(`${WS}/forms/${seg(id)}`, input);
  }

  /** Removes a form and the messages collected through it. */
  async delete(id: number): Promise<void> {
    await this.http.delete(`${WS}/forms/${seg(id)}`);
  }

  /**
   * Issues a new public key. Existing embeds stop working the moment this
   * returns, so update them together.
   */
  rotateKey(id: number): Promise<Form> {
    return this.http.post<Form>(`${WS}/forms/${seg(id)}/rotate-key`);
  }

  /** Returns paste-ready HTML and `fetch()` code wired to a form. */
  snippet(id: number): Promise<FormSnippet> {
    return this.http.get<FormSnippet>(`${WS}/forms/${seg(id)}/snippet`);
  }

  /**
   * Issues a submission nonce for a form whose `require_nonce` is set. A public
   * endpoint keyed by the form's public key; it needs no credential.
   */
  nonce(publicKey: string): Promise<FormNonce> {
    return this.http.get<FormNonce>(`/f/${seg(publicKey)}/nonce`);
  }

  /**
   * Posts a submission to a form's public ingest endpoint, as a website would.
   * It needs no credential, and always answers success for a stored or silently
   * rejected submission so a spam client learns nothing.
   */
  async submit(publicKey: string, fields: Record<string, unknown>): Promise<void> {
    await this.http.post(`/f/${seg(publicKey)}`, fields);
  }
}

/** Reads and triages the submissions collected by web forms. */
export class MessagesClient {
  constructor(private readonly http: HttpClient) {}

  /** Returns a page of messages. */
  list(options?: MessageListOptions): Promise<PageableResponse<Message>> {
    return this.http.getPage<Message>(`${WS}/messages${query({ ...options })}`);
  }

  /**
   * Returns one message with its fields, attachments, and reply thread. Reading
   * a message marks it read.
   */
  get(uuid: string): Promise<Message> {
    return this.http.get<Message>(`${WS}/messages/${seg(uuid)}`);
  }

  /** Removes a message. */
  async delete(uuid: string): Promise<void> {
    await this.http.delete(`${WS}/messages/${seg(uuid)}`);
  }

  /**
   * Returns total, unread, and spam message counts plus the number of forms in
   * the workspace.
   */
  stats(): Promise<MessageStats> {
    return this.http.get<MessageStats>(`${WS}/messages/stats`);
  }

  /** Returns submission volume for the last `days` days (default 30). */
  analytics(days?: number): Promise<MessageAnalytics> {
    return this.http.get<MessageAnalytics>(`${WS}/messages/analytics${query({ days })}`);
  }

  /** Answers a message's sender and records the reply on the thread. */
  reply(uuid: string, input: ReplyMessageInput): Promise<MessageReply> {
    return this.http.post<MessageReply>(`${WS}/messages/${seg(uuid)}/reply`, input);
  }

  /**
   * Moves a message through triage. `state` is `new`, `open`, `replied`,
   * `closed`, or `spam`; `read`, when given, also marks it read or unread.
   */
  updateState(uuid: string, state: string, read?: boolean): Promise<Message> {
    return this.http.put<Message>(`${WS}/messages/${seg(uuid)}/state`, { state, read });
  }

  /**
   * Gives a message to a workspace member, or clears the assignment when
   * `userId` is null.
   */
  assign(uuid: string, userId: number | null): Promise<Message> {
    return this.http.put<Message>(`${WS}/messages/${seg(uuid)}/assign`, { user_id: userId });
  }

  /** Quarantines a message and optionally learns a filter from it. */
  markSpam(uuid: string, input?: MarkSpamInput): Promise<Message> {
    return this.http.post<Message>(`${WS}/messages/${seg(uuid)}/spam`, input ?? {});
  }

  /** Clears the spam verdict on a message. */
  markNotSpam(uuid: string): Promise<Message> {
    return this.http.post<Message>(`${WS}/messages/${seg(uuid)}/not-spam`);
  }

  /**
   * Downloads the file at index `idx` of a message. Indexes match the order of
   * `Message.attachments`.
   */
  downloadAttachment(uuid: string, idx: number): Promise<{ data: ArrayBuffer; contentType: string }> {
    return this.http.download(`${WS}/messages/${seg(uuid)}/attachments/${seg(idx)}`);
  }
}

/** Manages the spam rules applied to form submissions as they arrive. */
export class MessageFiltersClient {
  constructor(private readonly http: HttpClient) {}

  /** Adds a spam filter. */
  create(input: CreateMessageFilterInput): Promise<MessageFilter> {
    return this.http.post<MessageFilter>(`${WS}/message-filters`, input);
  }

  /** Returns a page of spam filters with their hit counts. */
  list(options?: ListOptions): Promise<PageableResponse<MessageFilter>> {
    return this.http.getPage<MessageFilter>(`${WS}/message-filters${query({ ...options })}`);
  }

  /** Changes a spam filter. */
  update(id: number, input: UpdateMessageFilterInput): Promise<MessageFilter> {
    return this.http.put<MessageFilter>(`${WS}/message-filters/${seg(id)}`, input);
  }

  /** Removes a spam filter. */
  async delete(id: number): Promise<void> {
    await this.http.delete(`${WS}/message-filters/${seg(id)}`);
  }

  /**
   * Reports how many recent messages a candidate filter would have matched,
   * without creating it.
   */
  test(input: TestMessageFilterInput): Promise<FilterTestResult> {
    return this.http.post<FilterTestResult>(`${WS}/message-filters/test`, input);
  }
}

/**
 * Reads the email Posta received, whether over its inbound SMTP listener or
 * relayed in by an external provider's webhook.
 */
export class InboundClient {
  constructor(private readonly http: HttpClient) {}

  /** Returns a page of inbound emails. */
  list(options?: InboundListOptions): Promise<PageableResponse<InboundEmail>> {
    return this.http.getPage<InboundEmail>(`${WS}/inbound-emails${query({ ...options })}`);
  }

  /** Returns one inbound email with its parsed bodies. */
  get(uuid: string): Promise<InboundEmail> {
    return this.http.get<InboundEmail>(`${WS}/inbound-emails/${seg(uuid)}`);
  }

  /** Removes an inbound email and its stored raw message. */
  async delete(uuid: string): Promise<void> {
    await this.http.delete(`${WS}/inbound-emails/${seg(uuid)}`);
  }

  /** Re-dispatches the webhook for an inbound email whose forwarding failed. */
  retry(uuid: string): Promise<InboundEmail> {
    return this.http.post<InboundEmail>(`${WS}/inbound-emails/${seg(uuid)}/retry`);
  }

  /**
   * Downloads the original RFC 5322 message (`.eml`), for callers that need
   * headers Posta did not parse out.
   */
  downloadRaw(uuid: string): Promise<{ data: ArrayBuffer; contentType: string }> {
    return this.http.download(`${WS}/inbound-emails/${seg(uuid)}/raw`);
  }

  /** Downloads the file at index `idx` of an inbound email. */
  downloadAttachment(uuid: string, idx: number): Promise<{ data: ArrayBuffer; contentType: string }> {
    return this.http.download(`${WS}/inbound-emails/${seg(uuid)}/attachments/${seg(idx)}`);
  }
}
