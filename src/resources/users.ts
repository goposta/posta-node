import { HttpClient, query, seg } from '../http.js';
import type {
  UserProfile, Plan, Enable2faResponse, Session, UserSettings,
  UpdateUserSettingsInput, Notification, NotificationOptions,
  NotificationCounts, LinkedOAuthAccount, AuditLogOptions, Event,
  AuthResponse, SsoProvider, AppInfo, HealthStatus, PageableResponse,
} from '../types.js';

/**
 * Manages the signed-in account: profile, password, two-factor authentication,
 * sessions, settings, and notifications.
 *
 * These endpoints accept only a user session token — an API key is never a
 * valid credential here.
 */
export class UsersClient {
  constructor(private readonly http: HttpClient) {}

  /** Returns the signed-in account's profile. */
  me(): Promise<UserProfile> {
    return this.http.get<UserProfile>('/users/me');
  }

  /**
   * Changes the account's display name, and whether its sends require a
   * verified domain.
   */
  updateProfile(name: string, requireVerifiedDomain?: boolean): Promise<UserProfile> {
    return this.http.put<UserProfile>('/users/me', {
      name,
      require_verified_domain: requireVerifiedDomain,
    });
  }

  /** Sets a new password, confirming the current one. */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await this.http.put('/users/me/password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
  }

  /** Sends the address confirmation email again. */
  async resendVerificationEmail(): Promise<void> {
    await this.http.post('/users/me/verify-email/resend');
  }

  /** Returns the quota and feature set applied to the account. */
  plan(): Promise<Plan> {
    return this.http.get<Plan>('/users/me/plan');
  }

  /**
   * Begins two-factor enrolment and returns the TOTP secret. Two-factor is not
   * active until {@link verify2fa} confirms a code from it.
   */
  setup2fa(): Promise<Enable2faResponse> {
    return this.http.post<Enable2faResponse>('/users/me/2fa/setup');
  }

  /** Confirms a code from the authenticator and switches two-factor on. */
  async verify2fa(code: string): Promise<void> {
    await this.http.post('/users/me/2fa/verify', { code });
  }

  /** Switches two-factor off, confirming a current code. */
  async disable2fa(code: string): Promise<void> {
    await this.http.post('/users/me/2fa/disable', { code });
  }

  /**
   * Schedules the account for deletion after a grace period.
   * {@link cancelDeletion} reverses it while the grace period lasts.
   */
  async requestDeletion(): Promise<void> {
    await this.http.post('/users/me/delete');
  }

  /** Calls off a scheduled account deletion. */
  async cancelDeletion(): Promise<void> {
    await this.http.post('/users/me/cancel-deletion');
  }

  /** Returns the account's active sessions. */
  listSessions(): Promise<Session[]> {
    return this.http.get<Session[]>('/users/me/sessions');
  }

  /** Signs one session out. */
  async revokeSession(id: number): Promise<void> {
    await this.http.delete(`/users/me/sessions/${seg(id)}`);
  }

  /**
   * Signs out every session but this one — what to call after a password change
   * on a possibly compromised account.
   */
  async revokeOtherSessions(): Promise<void> {
    await this.http.post('/users/me/sessions/revoke-others');
  }

  /** Signs out the session making the request. */
  async logout(): Promise<void> {
    await this.http.post('/users/me/sessions/logout');
  }

  /** Chooses the workspace a request lands in when it names none. */
  async setDefaultWorkspace(workspaceId: number): Promise<void> {
    await this.http.put('/users/me/default-workspace', { workspace_id: workspaceId });
  }

  /** Returns a page of the account's own audit events. */
  auditLog(options?: AuditLogOptions): Promise<PageableResponse<Event>> {
    return this.http.getPage<Event>(`/users/me/audit-log${query({ ...options })}`);
  }

  /** Returns the account's settings. */
  settings(): Promise<UserSettings> {
    return this.http.get<UserSettings>('/users/me/settings');
  }

  /** Changes the account's settings. */
  updateSettings(input: UpdateUserSettingsInput): Promise<UserSettings> {
    return this.http.put<UserSettings>('/users/me/settings', input);
  }

  /** Returns the account's notifications. */
  listNotifications(options?: NotificationOptions): Promise<Notification[]> {
    return this.http.get<Notification[]>(`/users/me/notifications${query({ ...options })}`);
  }

  /**
   * Returns the notifications meant for the dashboard banner: platform
   * announcements and anything needing attention now.
   */
  listBannerNotifications(): Promise<Notification[]> {
    return this.http.get<Notification[]>('/users/me/notifications/banner');
  }

  /** Returns the unread and open notification totals. */
  notificationCounts(): Promise<NotificationCounts> {
    return this.http.get<NotificationCounts>('/users/me/notifications/counts');
  }

  /** Marks the given notifications read. */
  async markNotificationsRead(ids: number[]): Promise<void> {
    await this.http.post('/users/me/notifications/read', { ids });
  }

  /** Marks every notification read. */
  async markAllNotificationsRead(): Promise<void> {
    await this.http.post('/users/me/notifications/read-all');
  }

  /** Removes the given notifications from the list. */
  async dismissNotifications(ids: number[]): Promise<void> {
    await this.http.post('/users/me/notifications/dismiss', { ids });
  }

  /** Removes every notification from the list. */
  async dismissAllNotifications(): Promise<void> {
    await this.http.post('/users/me/notifications/dismiss-all');
  }

  /** Returns the external identities linked to the account. */
  listLinkedOAuthAccounts(): Promise<LinkedOAuthAccount[]> {
    return this.http.get<LinkedOAuthAccount[]>('/users/me/oauth');
  }

  /** Detaches an external identity from the account. */
  async unlinkOAuthAccount(providerId: number): Promise<void> {
    await this.http.delete(`/users/me/oauth/${seg(providerId)}`);
  }
}

/**
 * The public endpoints: signing in, registering, and recovering a password.
 * They need no credential, so a client built for them can be created with an
 * empty key.
 */
export class AuthClient {
  constructor(private readonly http: HttpClient) {}

  /**
   * Exchanges an email and password for a session token. Supply
   * `twoFactorCode` when the account has 2FA enabled.
   */
  login(email: string, password: string, twoFactorCode?: string): Promise<AuthResponse> {
    return this.http.post<AuthResponse>('/auth/login', {
      email,
      password,
      two_factor_code: twoFactorCode,
    });
  }

  /**
   * Creates an account, when the deployment allows self-registration. Check
   * first with {@link registrationStatus}.
   */
  register(name: string, email: string, password: string): Promise<AuthResponse> {
    return this.http.post<AuthResponse>('/auth/register', { name, email, password });
  }

  /** Reports whether self-registration is enabled. */
  registrationStatus(): Promise<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>('/auth/registration-status');
  }

  /**
   * Emails a reset link. It always succeeds, whether or not the address has an
   * account, so it cannot be used to enumerate users.
   */
  async forgotPassword(email: string): Promise<void> {
    await this.http.post('/auth/forgot-password', { email });
  }

  /** Redeems a reset token and sets a new password. */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    await this.http.post('/auth/reset-password', { token, new_password: newPassword });
  }

  /** Redeems the token from a verification email. */
  async verifyEmail(token: string): Promise<void> {
    await this.http.get(`/auth/verify-email${query({ token })}`);
  }

  /**
   * Reports which SSO provider, if any, an email domain is bound to, so a login
   * page can send the user straight to it.
   */
  discoverSso(email: string): Promise<SsoProvider> {
    return this.http.post<SsoProvider>('/auth/oauth/discover', { email });
  }

  /** Returns the SSO providers offered on the sign-in page. */
  listOAuthProviders(): Promise<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>('/auth/oauth/providers');
  }

  /**
   * Returns the URL that begins an OAuth sign-in with `provider`. Redirect the
   * browser here; Posta handles the callback itself.
   */
  authorizeUrl(provider: string): string {
    return `${this.http.baseUrl}/auth/oauth/${seg(provider)}/authorize`;
  }
}

/** Reads build and health information. */
export class SystemClient {
  constructor(private readonly http: HttpClient) {}

  /**
   * Returns the running build's name, version, and commit. Authenticated: the
   * exact build is what an attacker needs to match a deployment against known
   * CVEs.
   */
  info(): Promise<AppInfo> {
    return this.http.get<AppInfo>('/info');
  }

  /** Reports process liveness. Public: it needs no credential. */
  healthz(): Promise<HealthStatus> {
    return this.http.getRoot<HealthStatus>('/healthz');
  }

  /**
   * Reports whether dependencies (database, Redis) are reachable, which is what
   * a load balancer should gate traffic on. Public.
   */
  readyz(): Promise<HealthStatus> {
    return this.http.getRoot<HealthStatus>('/readyz');
  }
}
