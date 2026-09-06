import { HttpClient, WS, query, seg } from '../http.js';
import type {
  Template, TemplateListItem, TemplateVersion, TemplateLocalization,
  CreateTemplateInput, UpdateTemplateInput, PreviewTemplateInput, PreviewResult,
  SendTestInput, TemplateExport, ImportHtmlInput, CreateVersionInput,
  UpdateVersionInput, CreateLocalizationInput, UpdateLocalizationInput,
  Language, CreateLanguageInput, UpdateLanguageInput, Stylesheet,
  StylesheetInput, SendResponse, SearchListOptions, ListOptions,
  PageableResponse,
} from '../types.js';

/**
 * Manages templates and the versions and localizations beneath them.
 *
 * A template is a named container. Its content lives on immutable versions, and
 * each version carries one localization per language. Sending resolves the
 * template's active version unless a caller names another.
 */
export class TemplatesClient {
  constructor(private readonly http: HttpClient) {}

  /** Adds a template. Content is added afterwards as a version. */
  create(input: CreateTemplateInput): Promise<Template> {
    return this.http.post<Template>(`${WS}/templates`, input);
  }

  /** Returns a page of templates, without the non-active version bodies. */
  list(options?: SearchListOptions): Promise<PageableResponse<TemplateListItem>> {
    return this.http.getPage<TemplateListItem>(`${WS}/templates${query({ ...options })}`);
  }

  /** Returns one template with its active version. */
  get(id: number): Promise<Template> {
    return this.http.get<Template>(`${WS}/templates/${seg(id)}`);
  }

  /** Changes a template's metadata. */
  update(id: number, input: UpdateTemplateInput): Promise<Template> {
    return this.http.put<Template>(`${WS}/templates/${seg(id)}`, input);
  }

  /** Removes a template and every version under it. */
  async delete(id: number): Promise<void> {
    await this.http.delete(`${WS}/templates/${seg(id)}`);
  }

  /** Renders unsaved template source with the given variables. */
  preview(input: PreviewTemplateInput): Promise<PreviewResult> {
    return this.http.post<PreviewResult>(`${WS}/templates/preview`, input);
  }

  /** Sends a test rendering of a template to real inboxes. */
  sendTest(id: number, input: SendTestInput): Promise<SendResponse> {
    return this.http.post<SendResponse>(`${WS}/templates/${seg(id)}/send-test`, input);
  }

  /** Returns a template and all its versions in portable form. */
  export(id: number): Promise<TemplateExport> {
    return this.http.get<TemplateExport>(`${WS}/templates/${seg(id)}/export`);
  }

  /** Recreates a template from an exported payload. */
  import(payload: TemplateExport): Promise<Template> {
    return this.http.post<Template>(`${WS}/templates/import`, payload);
  }

  /** Creates a template from a raw HTML document. */
  importHtml(input: ImportHtmlInput): Promise<Template> {
    return this.http.post<Template>(`${WS}/templates/import-html`, input);
  }

  /** Returns every version of a template, newest first. */
  listVersions(templateId: number): Promise<TemplateVersion[]> {
    return this.http.get<TemplateVersion[]>(`${WS}/templates/${seg(templateId)}/versions`);
  }

  /** Opens a new draft version, copying the active one's localizations. */
  createVersion(templateId: number, input?: CreateVersionInput): Promise<TemplateVersion> {
    return this.http.post<TemplateVersion>(`${WS}/templates/${seg(templateId)}/versions`, input ?? {});
  }

  /** Changes a version's stylesheet. */
  updateVersion(templateId: number, versionId: number, input: UpdateVersionInput): Promise<TemplateVersion> {
    return this.http.put<TemplateVersion>(
      `${WS}/templates/${seg(templateId)}/versions/${seg(versionId)}`, input);
  }

  /** Removes a version. The active version cannot be deleted. */
  async deleteVersion(templateId: number, versionId: number): Promise<void> {
    await this.http.delete(`${WS}/templates/${seg(templateId)}/versions/${seg(versionId)}`);
  }

  /** Makes a version the one that sends. */
  activateVersion(templateId: number, versionId: number): Promise<Template> {
    return this.http.post<Template>(`${WS}/templates/${seg(templateId)}/activate/${seg(versionId)}`);
  }

  /** Returns every language defined on a version. */
  listLocalizations(templateId: number, versionId: number): Promise<TemplateLocalization[]> {
    return this.http.get<TemplateLocalization[]>(
      `${WS}/templates/${seg(templateId)}/versions/${seg(versionId)}/localizations`);
  }

  /** Adds a language to a version. */
  createLocalization(templateId: number, versionId: number, input: CreateLocalizationInput): Promise<TemplateLocalization> {
    return this.http.post<TemplateLocalization>(
      `${WS}/templates/${seg(templateId)}/versions/${seg(versionId)}/localizations`, input);
  }

  /**
   * Changes a language's content. Localizations are addressed by their own id,
   * not by template and version.
   */
  updateLocalization(localizationId: number, input: UpdateLocalizationInput): Promise<TemplateLocalization> {
    return this.http.put<TemplateLocalization>(`${WS}/localizations/${seg(localizationId)}`, input);
  }

  /** Removes a language from its version. */
  async deleteLocalization(localizationId: number): Promise<void> {
    await this.http.delete(`${WS}/localizations/${seg(localizationId)}`);
  }

  /** Renders a saved version in one language. */
  previewLocalization(
    templateId: number,
    versionId: number,
    language: string,
    templateData?: Record<string, unknown>,
  ): Promise<PreviewResult> {
    return this.http.post<PreviewResult>(
      `${WS}/templates/${seg(templateId)}/versions/${seg(versionId)}/preview`,
      { language, template_data: templateData });
  }
}

/** Manages the languages a workspace's templates can be localized into. */
export class LanguagesClient {
  constructor(private readonly http: HttpClient) {}

  /** Adds a language. */
  create(input: CreateLanguageInput): Promise<Language> {
    return this.http.post<Language>(`${WS}/languages`, input);
  }

  /** Returns a page of languages. */
  list(options?: ListOptions): Promise<PageableResponse<Language>> {
    return this.http.getPage<Language>(`${WS}/languages${query({ ...options })}`);
  }

  /** Changes a language. */
  update(id: number, input: UpdateLanguageInput): Promise<Language> {
    return this.http.put<Language>(`${WS}/languages/${seg(id)}`, input);
  }

  /** Removes a language. Localizations already written in it are kept. */
  async delete(id: number): Promise<void> {
    await this.http.delete(`${WS}/languages/${seg(id)}`);
  }
}

/**
 * Manages reusable CSS that template versions share, so a house style can be
 * changed in one place.
 */
export class StylesheetsClient {
  constructor(private readonly http: HttpClient) {}

  /** Adds a stylesheet. */
  create(input: StylesheetInput): Promise<Stylesheet> {
    return this.http.post<Stylesheet>(`${WS}/stylesheets`, input);
  }

  /** Returns a page of stylesheets. */
  list(options?: ListOptions): Promise<PageableResponse<Stylesheet>> {
    return this.http.getPage<Stylesheet>(`${WS}/stylesheets${query({ ...options })}`);
  }

  /** Replaces a stylesheet's name and CSS. */
  update(id: number, input: StylesheetInput): Promise<Stylesheet> {
    return this.http.put<Stylesheet>(`${WS}/stylesheets/${seg(id)}`, input);
  }

  /** Removes a stylesheet. Versions referencing it fall back to none. */
  async delete(id: number): Promise<void> {
    await this.http.delete(`${WS}/stylesheets/${seg(id)}`);
  }
}
