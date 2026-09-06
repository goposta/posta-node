import { HttpClient, WS, query, seg } from '../http.js';
import type {
  Workspace, CreateWorkspaceInput, UpdateWorkspaceInput, WorkspaceMember,
  Invitation, WorkspaceSettings, UpdateWorkspaceSettingsInput, WorkspaceSso,
  WorkspaceDataExport, GdprDeleteResult, Plan, Event, MessageData,
  ListOptions, PageableResponse,
} from '../types.js';

/**
 * Manages workspaces and everything that governs one: membership, invitations,
 * settings, SSO, the audit log, and the data export and GDPR erasure tools.
 *
 * Endpoints on "current" act on the workspace the credential resolves to — the
 * one a workspace-bound API key names, or the one given as `workspaceId`.
 */
export class WorkspacesClient {
  constructor(private readonly http: HttpClient) {}

  /** Adds a workspace, owned by the caller. */
  create(input: CreateWorkspaceInput): Promise<Workspace> {
    return this.http.post<Workspace>('/workspaces', input);
  }

  /** Returns every workspace the caller belongs to, with their role in each. */
  list(): Promise<Workspace[]> {
    return this.http.get<Workspace[]>('/workspaces');
  }

  /** Returns the active workspace. */
  get(): Promise<Workspace> {
    return this.http.get<Workspace>(WS);
  }

  /** Changes the active workspace. */
  update(input: UpdateWorkspaceInput): Promise<Workspace> {
    return this.http.put<Workspace>(WS, input);
  }

  /**
   * Removes the active workspace and everything in it. This cannot be undone;
   * export first with {@link exportData}.
   */
  async delete(): Promise<void> {
    await this.http.delete(WS);
  }

  /** Returns the workspace's members and their roles. */
  listMembers(): Promise<WorkspaceMember[]> {
    return this.http.get<WorkspaceMember[]>(`${WS}/members`);
  }

  /** Changes a member's role: `owner`, `admin`, `editor`, or `viewer`. */
  updateMemberRole(memberId: number, role: string): Promise<WorkspaceMember> {
    return this.http.put<WorkspaceMember>(`${WS}/members/${seg(memberId)}`, { role });
  }

  /** Removes a member from the workspace. */
  async removeMember(memberId: number): Promise<void> {
    await this.http.delete(`${WS}/members/${seg(memberId)}`);
  }

  /** Offers workspace membership to an email address, at the given role. */
  invite(email: string, role: string): Promise<Invitation> {
    return this.http.post<Invitation>(`${WS}/invitations`, { email, role });
  }

  /** Returns the workspace's pending invitations. */
  listInvitations(): Promise<Invitation[]> {
    return this.http.get<Invitation[]>(`${WS}/invitations`);
  }

  /** Withdraws a pending invitation. */
  async cancelInvitation(invitationId: number): Promise<void> {
    await this.http.delete(`${WS}/invitations/${seg(invitationId)}`);
  }

  /** Returns the invitations addressed to the signed-in user. */
  listMyInvitations(): Promise<Invitation[]> {
    return this.http.get<Invitation[]>('/invitations');
  }

  /** Joins a workspace using the token from an invitation email. */
  async acceptInvitation(token: string): Promise<void> {
    await this.http.post('/invitations/accept', { token });
  }

  /** Refuses an invitation using its token. */
  async declineInvitation(token: string): Promise<void> {
    await this.http.post('/invitations/decline', { token });
  }

  /** Joins a workspace using an invitation id, which needs no token. */
  async acceptInvitationById(id: number): Promise<void> {
    await this.http.post(`/invitations/${seg(id)}/accept`);
  }

  /** Refuses an invitation by its id. */
  async declineInvitationById(id: number): Promise<void> {
    await this.http.post(`/invitations/${seg(id)}/decline`);
  }

  /** Returns the workspace's settings. */
  settings(): Promise<WorkspaceSettings> {
    return this.http.get<WorkspaceSettings>(`${WS}/settings`);
  }

  /** Changes the workspace's settings. */
  updateSettings(input: UpdateWorkspaceSettingsInput): Promise<WorkspaceSettings> {
    return this.http.put<WorkspaceSettings>(`${WS}/settings`, input);
  }

  /** Returns the quota and feature set applied to the workspace. */
  plan(): Promise<Plan> {
    return this.http.get<Plan>(`${WS}/plan`);
  }

  /** Returns a page of the workspace's audit events. */
  listAuditLog(options?: ListOptions): Promise<PageableResponse<Event>> {
    return this.http.getPage<Event>(`${WS}/audit-log${query({ ...options })}`);
  }

  /** Returns one audit event with its full metadata. */
  getAuditEvent(id: number): Promise<Event> {
    return this.http.get<Event>(`${WS}/audit-log/${seg(id)}`);
  }

  /**
   * Returns a portable snapshot of the workspace, for backup or for moving it
   * to another Posta deployment.
   */
  exportData(): Promise<WorkspaceDataExport> {
    return this.http.get<WorkspaceDataExport>(`${WS}/data/export`);
  }

  /** Restores a snapshot into the active workspace. */
  importData(data: WorkspaceDataExport): Promise<MessageData> {
    return this.http.post<MessageData>(`${WS}/data/import`, data);
  }

  /**
   * Erases a data subject's contact, subscriber, and suppression records.
   * Passing an empty email erases every contact in the workspace, so pass the
   * address you mean.
   */
  deleteContactData(email: string): Promise<GdprDeleteResult> {
    return this.http.post<GdprDeleteResult>(`${WS}/gdpr/delete-contacts`, { email });
  }

  /**
   * Erases stored email records older than `olderThanDays`, for meeting a
   * retention policy.
   */
  deleteEmailLogs(olderThanDays: number): Promise<GdprDeleteResult> {
    return this.http.post<GdprDeleteResult>(`${WS}/gdpr/delete-email-logs`, {
      older_than_days: olderThanDays,
    });
  }

  /** Returns the workspace's single sign-on configuration. */
  sso(): Promise<WorkspaceSso> {
    return this.http.get<WorkspaceSso>(`${WS}/sso`);
  }

  /** Configures single sign-on for the workspace. */
  setSso(input: WorkspaceSso): Promise<WorkspaceSso> {
    return this.http.put<WorkspaceSso>(`${WS}/sso`, input);
  }

  /** Removes the workspace's single sign-on configuration. */
  async deleteSso(): Promise<void> {
    await this.http.delete(`${WS}/sso`);
  }
}
