import { HttpClient, WS, query, seg } from '../http.js';
import type {
  Subscriber, CreateSubscriberInput, UpdateSubscriberInput, BulkImportResult,
  SubscriberList, SubscriberListWithCount, CreateSubscriberListInput,
  UpdateSubscriberListInput, FilterRule, SegmentPreview, UnsubscribeList,
  UnsubscribeListInput, Contact, ListSubscribeRequest, ListUnsubscribeRequest,
  ListSubscribeResponse, ListOptions, SubscriberListOptions, QueryListOptions,
  SearchListOptions, PageableResponse,
} from '../types.js';

/** Manages the people a workspace sends campaigns to. */
export class SubscribersClient {
  constructor(private readonly http: HttpClient) {}

  /** Adds a subscriber. */
  create(input: CreateSubscriberInput): Promise<Subscriber> {
    return this.http.post<Subscriber>(`${WS}/subscribers`, input);
  }

  /** Returns a page of subscribers. */
  list(options?: SubscriberListOptions): Promise<PageableResponse<Subscriber>> {
    return this.http.getPage<Subscriber>(`${WS}/subscribers${query({ ...options })}`);
  }

  /** Returns one subscriber. */
  get(id: number): Promise<Subscriber> {
    return this.http.get<Subscriber>(`${WS}/subscribers/${seg(id)}`);
  }

  /** Changes a subscriber. */
  update(id: number, input: UpdateSubscriberInput): Promise<Subscriber> {
    return this.http.put<Subscriber>(`${WS}/subscribers/${seg(id)}`, input);
  }

  /** Removes a subscriber and its list memberships. */
  async delete(id: number): Promise<void> {
    await this.http.delete(`${WS}/subscribers/${seg(id)}`);
  }

  /**
   * Adds or updates many subscribers at once. Existing addresses are updated
   * rather than duplicated.
   */
  importJson(subscribers: CreateSubscriberInput[]): Promise<BulkImportResult> {
    return this.http.post<BulkImportResult>(`${WS}/subscribers/import/json`, { subscribers });
  }

  /**
   * Adds or updates many subscribers from a CSV document, uploaded as
   * multipart/form-data.
   *
   * `columnMapping` maps zero-based column indexes to subscriber fields and
   * defaults to `{ 0: 'email', 1: 'name' }`. A `custom_fields.` prefix routes a
   * column into the subscriber's custom fields, as in
   * `{ 0: 'email', 1: 'name', 2: 'custom_fields.company' }`. The header row is
   * always skipped.
   */
  importCsv(
    filename: string,
    csv: string | Blob,
    columnMapping?: Record<number, string>,
  ): Promise<BulkImportResult> {
    const form = new FormData();
    const blob = typeof csv === 'string' ? new Blob([csv], { type: 'text/csv' }) : csv;
    form.append('file', blob, filename);
    if (columnMapping && Object.keys(columnMapping).length > 0) {
      form.append('column_mapping', JSON.stringify(columnMapping));
    }
    return this.http.upload<BulkImportResult>(`${WS}/subscribers/import/csv`, form);
  }
}

/**
 * Manages lists and who belongs to them.
 *
 * A `static` list has explicit members. A `segment` list derives its members
 * from filter rules evaluated at send time.
 */
export class SubscriberListsClient {
  constructor(private readonly http: HttpClient) {}

  /** Adds a list. */
  create(input: CreateSubscriberListInput): Promise<SubscriberList> {
    return this.http.post<SubscriberList>(`${WS}/subscriber-lists`, input);
  }

  /** Returns a page of lists with their member counts. */
  list(options?: QueryListOptions): Promise<PageableResponse<SubscriberListWithCount>> {
    return this.http.getPage<SubscriberListWithCount>(`${WS}/subscriber-lists${query({ ...options })}`);
  }

  /** Returns one list with its member count. */
  get(id: number): Promise<SubscriberListWithCount> {
    return this.http.get<SubscriberListWithCount>(`${WS}/subscriber-lists/${seg(id)}`);
  }

  /** Changes a list. */
  update(id: number, input: UpdateSubscriberListInput): Promise<SubscriberList> {
    return this.http.put<SubscriberList>(`${WS}/subscriber-lists/${seg(id)}`, input);
  }

  /** Removes a list. The subscribers themselves are not deleted. */
  async delete(id: number): Promise<void> {
    await this.http.delete(`${WS}/subscriber-lists/${seg(id)}`);
  }

  /**
   * Returns a page of the subscribers on a list. For a segment list this
   * evaluates the filter rules.
   */
  listMembers(id: number, options?: ListOptions): Promise<PageableResponse<Subscriber>> {
    return this.http.getPage<Subscriber>(`${WS}/subscriber-lists/${seg(id)}/members${query({ ...options })}`);
  }

  /** Puts an existing subscriber on a static list. */
  async addMember(listId: number, subscriberId: number): Promise<void> {
    await this.http.post(`${WS}/subscriber-lists/${seg(listId)}/members`, { subscriber_id: subscriberId });
  }

  /**
   * Takes a subscriber off a static list. This is not an opt-out: use
   * {@link unsubscribe} to record one.
   */
  async removeMember(listId: number, subscriberId: number): Promise<void> {
    await this.http.delete(`${WS}/subscriber-lists/${seg(listId)}/members`, { subscriber_id: subscriberId });
  }

  /** Counts the subscribers a candidate segment would match. */
  previewSegment(filterRules: FilterRule[]): Promise<SegmentPreview> {
    return this.http.post<SegmentPreview>(`${WS}/subscriber-lists/preview-segment`, { filter_rules: filterRules });
  }

  /**
   * Adds an address to a list by name, creating the list on first use and
   * clearing any prior opt-out for it. Idempotent, and reachable with a
   * `send`-scoped API key, so a signup form can call it directly.
   */
  subscribe(input: ListSubscribeRequest): Promise<ListSubscribeResponse> {
    return this.http.post<ListSubscribeResponse>('/subscriber-lists/subscribe', input);
  }

  /**
   * Opts an address out of one list. The subscriber's global status is
   * untouched. Idempotent.
   */
  unsubscribe(listId: number, input: ListUnsubscribeRequest): Promise<ListSubscribeResponse> {
    return this.http.post<ListSubscribeResponse>(`/subscriber-lists/${seg(listId)}/unsubscribe`, input);
  }

  /**
   * Reverses a list-scoped opt-out and, for a static list, puts the subscriber
   * back on it. Idempotent.
   */
  resubscribe(listId: number, email: string): Promise<ListSubscribeResponse> {
    return this.http.post<ListSubscribeResponse>(`/subscriber-lists/${seg(listId)}/resubscribe`, { email });
  }

  /** Opts an address out through the workspace-scoped endpoint. */
  unsubscribeInWorkspace(listId: number, input: ListUnsubscribeRequest): Promise<ListSubscribeResponse> {
    return this.http.post<ListSubscribeResponse>(`${WS}/subscriber-lists/${seg(listId)}/unsubscribe`, input);
  }

  /** Reverses an opt-out through the workspace-scoped endpoint. */
  resubscribeInWorkspace(listId: number, email: string): Promise<ListSubscribeResponse> {
    return this.http.post<ListSubscribeResponse>(`${WS}/subscriber-lists/${seg(listId)}/resubscribe`, { email });
  }
}

/**
 * Manages the named opt-out lists that `List-Unsubscribe` headers point at.
 * Referencing one from a send lets Posta mint the signed one-click URL and
 * record the opt-out against that list alone.
 */
export class UnsubscribeListsClient {
  constructor(private readonly http: HttpClient) {}

  /** Adds an unsubscribe list. */
  create(input: UnsubscribeListInput): Promise<UnsubscribeList> {
    return this.http.post<UnsubscribeList>(`${WS}/unsubscribe-lists`, input);
  }

  /** Returns a page of unsubscribe lists. */
  list(options?: QueryListOptions): Promise<PageableResponse<UnsubscribeList>> {
    return this.http.getPage<UnsubscribeList>(`${WS}/unsubscribe-lists${query({ ...options })}`);
  }

  /** Returns one unsubscribe list. */
  get(id: number): Promise<UnsubscribeList> {
    return this.http.get<UnsubscribeList>(`${WS}/unsubscribe-lists/${seg(id)}`);
  }

  /** Changes an unsubscribe list. */
  update(id: number, input: UnsubscribeListInput): Promise<UnsubscribeList> {
    return this.http.put<UnsubscribeList>(`${WS}/unsubscribe-lists/${seg(id)}`, input);
  }

  /** Removes an unsubscribe list. */
  async delete(id: number): Promise<void> {
    await this.http.delete(`${WS}/unsubscribe-lists/${seg(id)}`);
  }
}

/**
 * Reads the derived record of every address the workspace has mailed, with
 * delivery counters. Contacts are created by sending; they are not managed
 * directly.
 */
export class ContactsClient {
  constructor(private readonly http: HttpClient) {}

  /** Returns a page of contacts. */
  list(options?: SearchListOptions): Promise<PageableResponse<Contact>> {
    return this.http.getPage<Contact>(`${WS}/contacts${query({ ...options })}`);
  }

  /** Returns one contact. */
  get(id: number): Promise<Contact> {
    return this.http.get<Contact>(`${WS}/contacts/${seg(id)}`);
  }
}
