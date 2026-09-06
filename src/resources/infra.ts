import { HttpClient, WS, query, seg } from '../http.js';
import type {
  Domain, DomainWithRecords, DomainVerificationResult, SmtpServer,
  CreateSmtpServerInput, UpdateSmtpServerInput, SmtpCredential,
  CreateSmtpCredentialInput, SmtpCredentialCreated, ApiKey, CreateApiKeyInput,
  ApiKeyCreated, MessageData, ListOptions, PageableResponse,
} from '../types.js';

/**
 * Manages sending domains and their DNS verification. A workspace that requires
 * verified domains refuses to send from an unverified one.
 */
export class DomainsClient {
  constructor(private readonly http: HttpClient) {}

  /** Registers a domain and returns the DNS records to publish for it. */
  add(domain: string): Promise<DomainWithRecords> {
    return this.http.post<DomainWithRecords>(`${WS}/domains`, { domain });
  }

  /** Returns a page of domains. */
  list(options?: ListOptions): Promise<PageableResponse<Domain>> {
    return this.http.getPage<Domain>(`${WS}/domains${query({ ...options })}`);
  }

  /** Returns one domain with its DNS records and their verification state. */
  get(id: number): Promise<DomainWithRecords> {
    return this.http.get<DomainWithRecords>(`${WS}/domains/${seg(id)}`);
  }

  /**
   * Re-runs the DNS lookups and reports each check's outcome. DNS propagates
   * slowly, so this is expected to be called repeatedly until `fully_verified`.
   */
  verify(id: number): Promise<DomainVerificationResult> {
    return this.http.post<DomainVerificationResult>(`${WS}/domains/${seg(id)}/verify`);
  }

  /** Removes a domain. */
  async delete(id: number): Promise<void> {
    await this.http.delete(`${WS}/domains/${seg(id)}`);
  }
}

/** Manages the SMTP relays Posta delivers outbound mail through. */
export class SmtpServersClient {
  constructor(private readonly http: HttpClient) {}

  /** Registers an SMTP server. */
  create(input: CreateSmtpServerInput): Promise<SmtpServer> {
    return this.http.post<SmtpServer>(`${WS}/smtp-servers`, input);
  }

  /**
   * Returns a page of SMTP servers, including any shared server the platform
   * offers the workspace.
   */
  list(options?: ListOptions): Promise<PageableResponse<SmtpServer>> {
    return this.http.getPage<SmtpServer>(`${WS}/smtp-servers${query({ ...options })}`);
  }

  /** Returns one SMTP server. */
  get(id: number): Promise<SmtpServer> {
    return this.http.get<SmtpServer>(`${WS}/smtp-servers/${seg(id)}`);
  }

  /** Changes an SMTP server's configuration. */
  update(id: number, input: UpdateSmtpServerInput): Promise<SmtpServer> {
    return this.http.put<SmtpServer>(`${WS}/smtp-servers/${seg(id)}`, input);
  }

  /** Removes an SMTP server. */
  async delete(id: number): Promise<void> {
    await this.http.delete(`${WS}/smtp-servers/${seg(id)}`);
  }

  /**
   * Opens a connection and authenticates, without sending anything. Use it to
   * check credentials before relying on them.
   */
  test(id: number): Promise<MessageData> {
    return this.http.post<MessageData>(`${WS}/smtp-servers/${seg(id)}/test`);
  }
}

/**
 * Manages credentials for Posta's own SMTP relay listener, which lets an
 * existing application send through Posta by pointing its SMTP client at it
 * instead of calling the HTTP API.
 */
export class SmtpCredentialsClient {
  constructor(private readonly http: HttpClient) {}

  /** Mints a relay credential. The password is returned once; store it now. */
  create(input: CreateSmtpCredentialInput): Promise<SmtpCredentialCreated> {
    return this.http.post<SmtpCredentialCreated>(`${WS}/smtp-credentials`, input);
  }

  /** Returns a page of relay credentials. */
  list(options?: ListOptions): Promise<PageableResponse<SmtpCredential>> {
    return this.http.getPage<SmtpCredential>(`${WS}/smtp-credentials${query({ ...options })}`);
  }

  /** Returns one relay credential. */
  get(id: number): Promise<SmtpCredential> {
    return this.http.get<SmtpCredential>(`${WS}/smtp-credentials/${seg(id)}`);
  }

  /** Disables a credential without deleting it, so past use stays auditable. */
  revoke(id: number): Promise<MessageData> {
    return this.http.post<MessageData>(`${WS}/smtp-credentials/${seg(id)}/revoke`);
  }

  /** Removes a relay credential entirely. */
  delete(id: number): Promise<MessageData> {
    return this.http.delete<MessageData>(`${WS}/smtp-credentials/${seg(id)}`);
  }
}

/** Manages the workspace's machine credentials. */
export class ApiKeysClient {
  constructor(private readonly http: HttpClient) {}

  /** Mints an API key. The secret is returned once; store it now. */
  create(input: CreateApiKeyInput): Promise<ApiKeyCreated> {
    return this.http.post<ApiKeyCreated>(`${WS}/api-keys`, input);
  }

  /** Returns a page of API keys. The secrets are not included. */
  list(options?: ListOptions): Promise<PageableResponse<ApiKey>> {
    return this.http.getPage<ApiKey>(`${WS}/api-keys${query({ ...options })}`);
  }

  /** Returns one API key's metadata. */
  get(id: number): Promise<ApiKey> {
    return this.http.get<ApiKey>(`${WS}/api-keys/${seg(id)}`);
  }

  /** Disables a key without deleting it, so its past use stays auditable. */
  revoke(id: number): Promise<MessageData> {
    return this.http.put<MessageData>(`${WS}/api-keys/${seg(id)}/revoke`);
  }

  /** Removes a key entirely. */
  delete(id: number): Promise<MessageData> {
    return this.http.delete<MessageData>(`${WS}/api-keys/${seg(id)}`);
  }
}
