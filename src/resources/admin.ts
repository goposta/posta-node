import { HttpClient, query, seg } from '../http.js';
import type {
  User, CreateUserInput, UpdateUserInput, UserMetrics, AdminWorkspace, Plan,
  CreatePlanInput, UpdatePlanInput, Server, CreateServerInput,
  UpdateServerInput, AdminDomain, AdminDomainListOptions, DomainWithRecords,
  Domain, PlatformMetrics, AnalyticsResponse, DashboardAnalyticsResponse,
  ProviderBreakdownResponse, AnalyticsOptions, Event, EventListOptions,
  Setting, Announcement, CreateAnnouncementInput, UpdateInfo, OAuthProvider,
  CreateOAuthProviderInput, UpdateOAuthProviderInput, MessageData,
  ListOptions, SearchListOptions, PageableResponse,
} from '../types.js';

/** Filters the platform user list. */
export interface AdminUserListOptions extends ListOptions {
  search?: string;
}

/**
 * Platform administration: users, plans, shared SMTP servers, domains across
 * every workspace, platform settings, announcements, the event log, and the
 * update check.
 *
 * These endpoints accept only an administrator's session token — an API key is
 * never a valid credential here, whatever scopes it carries.
 */
export class AdminClient {
  constructor(private readonly http: HttpClient) {}

  /** Adds an account, bypassing self-registration. */
  createUser(input: CreateUserInput): Promise<User> {
    return this.http.post<User>('/admin/users', input);
  }

  /** Returns a page of platform accounts. */
  listUsers(options?: AdminUserListOptions): Promise<PageableResponse<User>> {
    return this.http.getPage<User>(`/admin/users${query({ ...options })}`);
  }

  /** Changes an account's role or standing. */
  updateUser(id: number, input: UpdateUserInput): Promise<User> {
    return this.http.put<User>(`/admin/users/${seg(id)}`, input);
  }

  /** Schedules an account for deletion after the usual grace period. */
  async deleteUser(id: number): Promise<void> {
    await this.http.delete(`/admin/users/${seg(id)}`);
  }

  /**
   * Removes an account and its data immediately, skipping the grace period.
   * This cannot be undone.
   */
  async forceDeleteUser(id: number): Promise<void> {
    await this.http.delete(`/admin/users/${seg(id)}/force`);
  }

  /** Calls off a scheduled account deletion. */
  async cancelUserDeletion(id: number): Promise<void> {
    await this.http.post(`/admin/users/${seg(id)}/cancel-deletion`);
  }

  /**
   * Turns off an account's two-factor authentication, for recovering a user who
   * has lost their authenticator.
   */
  async disableUser2fa(id: number): Promise<void> {
    await this.http.delete(`/admin/users/${seg(id)}/2fa`);
  }

  /** Signs an account out everywhere. */
  async revokeUserSessions(id: number): Promise<void> {
    await this.http.post(`/admin/users/${seg(id)}/revoke-sessions`);
  }

  /** Returns one account's usage figures. */
  userMetrics(id: number): Promise<UserMetrics> {
    return this.http.get<UserMetrics>(`/admin/users/${seg(id)}/metrics`);
  }

  /** Returns the workspaces an account belongs to. */
  listUserWorkspaces(id: number): Promise<AdminWorkspace[]> {
    return this.http.get<AdminWorkspace[]>(`/admin/users/${seg(id)}/workspaces`);
  }

  /** Returns the plan assigned to an account. */
  userPlan(id: number): Promise<Plan> {
    return this.http.get<Plan>(`/admin/users/${seg(id)}/plan`);
  }

  /** Puts an account on a plan. */
  assignUserPlan(userId: number, planId: number): Promise<Plan> {
    return this.http.post<Plan>(`/admin/users/${seg(userId)}/plan`, { plan_id: planId });
  }

  /** Returns the plan assigned to a workspace. */
  workspacePlan(workspaceId: number): Promise<Plan> {
    return this.http.get<Plan>(`/admin/workspaces/${seg(workspaceId)}/plan`);
  }

  /** Puts a workspace on a plan. */
  assignWorkspacePlan(workspaceId: number, planId: number): Promise<Plan> {
    return this.http.post<Plan>(`/admin/workspaces/${seg(workspaceId)}/plan`, { plan_id: planId });
  }

  /** Adds a plan. */
  createPlan(input: CreatePlanInput): Promise<Plan> {
    return this.http.post<Plan>('/admin/plans', input);
  }

  /** Returns a page of plans. */
  listPlans(options?: SearchListOptions): Promise<PageableResponse<Plan>> {
    return this.http.getPage<Plan>(`/admin/plans${query({ ...options })}`);
  }

  /** Returns one plan. */
  getPlan(id: number): Promise<Plan> {
    return this.http.get<Plan>(`/admin/plans/${seg(id)}`);
  }

  /** Changes a plan. */
  updatePlan(id: number, input: UpdatePlanInput): Promise<Plan> {
    return this.http.put<Plan>(`/admin/plans/${seg(id)}`, input);
  }

  /** Removes a plan. Accounts on it fall back to the default plan. */
  async deletePlan(id: number): Promise<void> {
    await this.http.delete(`/admin/plans/${seg(id)}`);
  }

  /** Makes a plan the one new accounts receive. */
  setDefaultPlan(id: number): Promise<Plan> {
    return this.http.patch<Plan>(`/admin/plans/${seg(id)}/default`);
  }

  /** Registers a shared SMTP server. */
  createServer(input: CreateServerInput): Promise<Server> {
    return this.http.post<Server>('/admin/servers', input);
  }

  /** Returns a page of shared SMTP servers. */
  listServers(options?: SearchListOptions): Promise<PageableResponse<Server>> {
    return this.http.getPage<Server>(`/admin/servers${query({ ...options })}`);
  }

  /** Returns one shared SMTP server. */
  getServer(id: number): Promise<Server> {
    return this.http.get<Server>(`/admin/servers/${seg(id)}`);
  }

  /** Changes a shared SMTP server. */
  updateServer(id: number, input: UpdateServerInput): Promise<Server> {
    return this.http.put<Server>(`/admin/servers/${seg(id)}`, input);
  }

  /** Removes a shared SMTP server. */
  async deleteServer(id: number): Promise<void> {
    await this.http.delete(`/admin/servers/${seg(id)}`);
  }

  /** Puts a shared SMTP server back into rotation. */
  enableServer(id: number): Promise<Server> {
    return this.http.post<Server>(`/admin/servers/${seg(id)}/enable`);
  }

  /** Takes a shared SMTP server out of rotation without deleting it. */
  disableServer(id: number): Promise<Server> {
    return this.http.post<Server>(`/admin/servers/${seg(id)}/disable`);
  }

  /** Opens a connection to a shared SMTP server, without sending anything. */
  testServer(id: number): Promise<MessageData> {
    return this.http.post<MessageData>(`/admin/servers/${seg(id)}/test`);
  }

  /** Returns a page of domains across every workspace. */
  listDomains(options?: AdminDomainListOptions): Promise<PageableResponse<AdminDomain>> {
    return this.http.getPage<AdminDomain>(`/admin/domains${query({ ...options })}`);
  }

  /** Returns one domain with the DNS records it needs. */
  getDomain(id: number): Promise<DomainWithRecords> {
    return this.http.get<DomainWithRecords>(`/admin/domains/${seg(id)}`);
  }

  /** Re-runs DNS verification for a domain in any workspace. */
  async verifyDomain(id: number): Promise<void> {
    await this.http.post(`/admin/domains/${seg(id)}/verify`);
  }

  /**
   * Marks a domain's ownership verified, or withdraws that, without a DNS
   * lookup — an override for a domain that cannot publish the record. `reason`
   * is recorded in the audit log.
   */
  setDomainVerification(id: number, verified: boolean, reason?: string): Promise<Domain> {
    return this.http.put<Domain>(`/admin/domains/${seg(id)}/verification`, {
      ownership_verified: verified,
      reason,
    });
  }

  /** Returns the deployment's overall usage and runtime health. */
  metrics(): Promise<PlatformMetrics> {
    return this.http.get<PlatformMetrics>('/admin/metrics');
  }

  /** Returns platform-wide email volume and status analytics. */
  analytics(options?: AnalyticsOptions): Promise<AnalyticsResponse> {
    return this.http.get<AnalyticsResponse>(`/admin/analytics${query({ ...options })}`);
  }

  /** Returns platform-wide delivery and bounce trends. */
  dashboardAnalytics(options?: AnalyticsOptions): Promise<DashboardAnalyticsResponse> {
    return this.http.get<DashboardAnalyticsResponse>(`/admin/analytics/dashboard${query({ ...options })}`);
  }

  /** Returns platform-wide deliverability by recipient provider. */
  providerAnalytics(options?: AnalyticsOptions): Promise<ProviderBreakdownResponse> {
    return this.http.get<ProviderBreakdownResponse>(`/admin/analytics/providers${query({ ...options })}`);
  }

  /** Returns a page of platform events. */
  listEvents(options?: EventListOptions): Promise<PageableResponse<Event>> {
    return this.http.getPage<Event>(`/admin/events${query({ ...options })}`);
  }

  /** Returns one platform event with its full metadata. */
  getEvent(id: number): Promise<Event> {
    return this.http.get<Event>(`/admin/events/${seg(id)}`);
  }

  /** Returns the platform's configuration entries. */
  settings(): Promise<Setting[]> {
    return this.http.get<Setting[]>('/admin/settings');
  }

  /** Changes platform configuration entries. Only the keys supplied are touched. */
  updateSettings(settings: Setting[]): Promise<Setting[]> {
    return this.http.put<Setting[]>('/admin/settings', { settings });
  }

  /** Broadcasts a notice to every user. */
  createAnnouncement(input: CreateAnnouncementInput): Promise<Announcement> {
    return this.http.post<Announcement>('/admin/announcements', input);
  }

  /** Returns a page of announcements. */
  listAnnouncements(options?: ListOptions): Promise<PageableResponse<Announcement>> {
    return this.http.getPage<Announcement>(`/admin/announcements${query({ ...options })}`);
  }

  /**
   * Retracts an announcement, removing it from every user's notifications.
   */
  async deleteAnnouncement(id: number): Promise<void> {
    await this.http.delete(`/admin/announcements/${seg(id)}`);
  }

  /** Reports whether a newer Posta release is available. */
  updateStatus(): Promise<UpdateInfo> {
    return this.http.get<UpdateInfo>('/admin/update');
  }

  /** Hides the update notice for one version, until a later one appears. */
  dismissUpdate(version: string): Promise<UpdateInfo> {
    return this.http.post<UpdateInfo>('/admin/update/dismiss', { version });
  }

  /** Returns every configured SSO provider, including hidden and disabled ones. */
  listOAuthProviders(): Promise<OAuthProvider[]> {
    return this.http.get<OAuthProvider[]>('/admin/oauth/providers');
  }

  /** Configures an SSO provider. */
  createOAuthProvider(input: CreateOAuthProviderInput): Promise<OAuthProvider> {
    return this.http.post<OAuthProvider>('/admin/oauth/providers', input);
  }

  /** Changes an SSO provider. */
  updateOAuthProvider(id: number, input: UpdateOAuthProviderInput): Promise<OAuthProvider> {
    return this.http.put<OAuthProvider>(`/admin/oauth/providers/${seg(id)}`, input);
  }

  /**
   * Removes an SSO provider. Accounts linked to it fall back to password
   * sign-in.
   */
  async deleteOAuthProvider(id: number): Promise<void> {
    await this.http.delete(`/admin/oauth/providers/${seg(id)}`);
  }
}
