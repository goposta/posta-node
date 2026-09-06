import { HttpClient, WS, query, seg } from '../http.js';
import type {
  Campaign, CampaignWithStats, CampaignMessage, CreateCampaignInput,
  UpdateCampaignInput, CampaignAnalyticsResponse, AnalyticsResponse,
  DashboardAnalyticsResponse, ProviderBreakdownResponse, DashboardStats,
  AnalyticsOptions, CampaignListOptions, ListOptions, PageableResponse,
} from '../types.js';

/**
 * Manages bulk sends to a subscriber list, and the lifecycle that carries one
 * from draft through sending to completion.
 */
export class CampaignsClient {
  constructor(private readonly http: HttpClient) {}

  /** Adds a campaign. */
  create(input: CreateCampaignInput): Promise<Campaign> {
    return this.http.post<Campaign>(`${WS}/campaigns`, input);
  }

  /** Returns a page of campaigns with their delivery counters. */
  list(options?: CampaignListOptions): Promise<PageableResponse<CampaignWithStats>> {
    return this.http.getPage<CampaignWithStats>(`${WS}/campaigns${query({ ...options })}`);
  }

  /** Returns one campaign with its delivery counters. */
  get(id: number): Promise<CampaignWithStats> {
    return this.http.get<CampaignWithStats>(`${WS}/campaigns/${seg(id)}`);
  }

  /** Changes a campaign that has not started sending. */
  update(id: number, input: UpdateCampaignInput): Promise<Campaign> {
    return this.http.put<Campaign>(`${WS}/campaigns/${seg(id)}`, input);
  }

  /** Removes a campaign. */
  async delete(id: number): Promise<void> {
    await this.http.delete(`${WS}/campaigns/${seg(id)}`);
  }

  /** Starts a campaign immediately, ignoring any schedule on it. */
  send(id: number): Promise<Campaign> {
    return this.http.post<Campaign>(`${WS}/campaigns/${seg(id)}/send`);
  }

  /** Halts a sending campaign. Recipients already sent to are not resent. */
  pause(id: number): Promise<Campaign> {
    return this.http.post<Campaign>(`${WS}/campaigns/${seg(id)}/pause`);
  }

  /** Continues a paused campaign from where it stopped. */
  resume(id: number): Promise<Campaign> {
    return this.http.post<Campaign>(`${WS}/campaigns/${seg(id)}/resume`);
  }

  /** Stops a campaign for good. It cannot be resumed afterwards. */
  cancel(id: number): Promise<Campaign> {
    return this.http.post<Campaign>(`${WS}/campaigns/${seg(id)}/cancel`);
  }

  /**
   * Copies a campaign into a fresh draft, so a recurring send can be repeated
   * without rebuilding it.
   */
  duplicate(id: number): Promise<Campaign> {
    return this.http.post<Campaign>(`${WS}/campaigns/${seg(id)}/duplicate`);
  }

  /**
   * Returns a page of per-subscriber sends, with the engagement timestamps
   * recorded against each.
   */
  listMessages(id: number, options?: ListOptions): Promise<PageableResponse<CampaignMessage>> {
    return this.http.getPage<CampaignMessage>(`${WS}/campaigns/${seg(id)}/messages${query({ ...options })}`);
  }

  /** Returns the engagement analytics for a campaign. */
  analytics(id: number): Promise<CampaignAnalyticsResponse> {
    return this.http.get<CampaignAnalyticsResponse>(`${WS}/campaigns/${seg(id)}/analytics`);
  }
}

/** Reads delivery and engagement analytics for the workspace. */
export class AnalyticsClient {
  constructor(private readonly http: HttpClient) {}

  /** Returns email volume and status analytics over the requested window. */
  emails(options?: AnalyticsOptions): Promise<AnalyticsResponse> {
    return this.http.get<AnalyticsResponse>(`${WS}/analytics${query({ ...options })}`);
  }

  /** Returns delivery and bounce trends plus send-latency percentiles. */
  dashboard(options?: AnalyticsOptions): Promise<DashboardAnalyticsResponse> {
    return this.http.get<DashboardAnalyticsResponse>(`${WS}/analytics/dashboard${query({ ...options })}`);
  }

  /** Returns deliverability broken down by recipient mailbox provider. */
  providers(options?: AnalyticsOptions): Promise<ProviderBreakdownResponse> {
    return this.http.get<ProviderBreakdownResponse>(`${WS}/analytics/providers${query({ ...options })}`);
  }

  /** Returns the workspace's headline counters. */
  dashboardStats(): Promise<DashboardStats> {
    return this.http.get<DashboardStats>(`${WS}/dashboard/stats`);
  }
}
