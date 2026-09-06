# Posta Node.js Client

Official Node.js client for the [Posta](https://github.com/goposta/posta) email
platform.

It covers the whole Posta API: transactional and templated sending, batch
sends, address verification, templates with versions and localizations,
campaigns, subscribers and lists, suppressions and bounces, domains, SMTP
servers and relay credentials, webhooks, web forms and the messages they
collect, inbound email, workspace administration, and the platform admin
surface.

Built on the runtime's own `fetch`, with no dependencies.

## Installation

```bash
npm install @goposta/posta
```

**Requires:** Node.js 18+

## Quick start

```ts
import { PostaClient } from '@goposta/posta';

const posta = new PostaClient('https://posta.example.com', 'psk_your_api_key');

const resp = await posta.emails.send({
  from: 'Acme <hello@example.com>',
  to: ['user@example.com'],
  subject: 'Hello from Posta',
  html: '<h1>Hello!</h1>',
});

console.log(`sent: id=${resp.id} status=${resp.status}`);
```

## Credentials

Most machine-facing endpoints take an API key:

```ts
const posta = new PostaClient('https://posta.example.com', 'psk_...');
```

Account-level endpoints (`/users/me/*`) and the platform admin surface accept
only a user session token — an API key is never a valid credential there:

```ts
const { token } = await new PostaClient(baseUrl, '').auth.login('admin@example.com', 'password');
const admin = PostaClient.withToken(baseUrl, token);
```

### Workspaces

Workspace-scoped endpoints resolve the active workspace from the
`X-Posta-Workspace-Id` header. A workspace-bound API key already carries its
workspace; an account-wide key or a user session must name one:

```ts
const posta = new PostaClient(baseUrl, apiKey, { workspaceId: 42 });
```

### API key scopes

A key reaches only what its scopes allow. `send` covers the public send API;
`read` and `write` cover reading and mutating workspace resources; `webhooks`
covers webhook management; `admin` covers tenant administration (keys, members,
settings); `*` grants everything.

A 403 from an endpoint you expect to work usually means a missing scope —
`err.isForbidden` distinguishes it.

## Client options

```ts
const posta = new PostaClient(baseUrl, apiKey, {
  timeout: 15_000,                          // ms, default 30000
  workspaceId: 42,
  userAgent: 'my-app/1.0',
  headers: { 'X-Request-Source': 'batch-job' },
  fetch: myFetch,                           // custom fetch, for tests or proxies
});
```

## Resources

| Property | Covers |
|---|---|
| `emails` | send, sendTemplate, sendBatch, preview, verify, status, retry, list, get |
| `bounces` | list, record |
| `suppressions` | list, add, remove |
| `webhooks` | list, create, delete, deliveries |
| `templates` | CRUD, versions, localizations, preview, sendTest, import/export |
| `languages`, `stylesheets` | CRUD |
| `domains` | add, list, get, verify, delete |
| `smtpServers`, `smtpCredentials` | CRUD, test, revoke |
| `subscribers` | CRUD, JSON and CSV bulk import |
| `subscriberLists` | CRUD, members, segments, subscribe/unsubscribe/resubscribe |
| `unsubscribeLists`, `contacts` | CRUD / read |
| `campaigns` | CRUD, send, pause, resume, cancel, duplicate, messages, analytics |
| `analytics` | emails, dashboard, providers, dashboardStats |
| `forms` | CRUD, rotateKey, snippet, nonce, public submit |
| `messages`, `messageFilters` | list, triage, reply, attachments; filter CRUD and dry-run |
| `inbound` | list, get, retry, raw `.eml`, attachments |
| `apiKeys` | create, list, get, revoke, delete |
| `workspaces` | CRUD, members, invitations, settings, SSO, audit log, export/import, GDPR |
| `users` | profile, password, 2FA, sessions, settings, notifications (session credential) |
| `auth` | login, register, password reset, email verification, SSO discovery |
| `admin` | users, plans, shared servers, domains, settings, announcements, events, metrics |
| `system` | info, healthz, readyz |

## Examples

### Templated and batch sends

```ts
await posta.emails.sendTemplate({
  template: 'welcome',
  to: ['user@example.com'],
  template_data: { name: 'Ada' },
});

const batch = await posta.emails.sendBatch({
  template: 'welcome',
  recipients: [
    { email: 'a@example.com', template_data: { name: 'Ada' } },
    { email: 'b@example.com', template_data: { name: 'Grace' } },
  ],
});
console.log(`${batch.sent} sent, ${batch.failed} failed`);
```

Validate without sending:

```ts
const report = await posta.emails.sendDryRun(req);
```

### One-click unsubscribe

Reference a Posta-managed unsubscribe list and Posta mints the signed one-click
URL, recording opt-outs against that list alone:

```ts
await posta.emails.send({
  from: 'news@example.com',
  to: ['user@example.com'],
  subject: 'This week',
  html: '<p>…</p>',
  unsubscribe: { list_id: 7 },
});
```

### Templates, versions, localizations

```ts
const tpl = await posta.templates.create({ name: 'welcome', default_language: 'en' });
const ver = await posta.templates.createVersion(tpl.id);
await posta.templates.createLocalization(tpl.id, ver.id, {
  language: 'en',
  subject_template: 'Welcome, {{.name}}',
  html_template: '<h1>Welcome, {{.name}}</h1>',
});
await posta.templates.activateVersion(tpl.id, ver.id);
```

### Campaigns

```ts
const camp = await posta.campaigns.create({
  name: 'Launch',
  subject: "We're live",
  from_email: 'news@example.com',
  list_id: listId,
  template_id: tpl.id,
});
await posta.campaigns.send(camp.id);

const stats = await posta.campaigns.analytics(camp.id);
console.log(`open rate ${stats.analytics?.open_rate}%`);
```

### Paging

`page` is zero-based; omitting `size` lets the server apply its default.

```ts
const page = await posta.emails.list({ page: 0, size: 50, q: 'user@example.com', sort: '-created_at' });
console.log(page.pageable.total_elements);
```

### Verifying webhooks

Posta signs each delivery with HMAC-SHA256 over the raw body, in the
`X-Posta-Signature` header as `sha256=<hex>`. Verify against the exact bytes
received — re-serializing the JSON changes them:

```ts
import express from 'express';
import { verifySignature, WebhookEvents, type EmailEventPayload } from '@goposta/posta';

const app = express();

app.post('/hooks/posta', express.raw({ type: 'application/json' }), (req, res) => {
  if (!verifySignature(req.body, req.header('X-Posta-Signature'), process.env.POSTA_WEBHOOK_SECRET!)) {
    return res.status(401).send('bad signature');
  }

  const event = JSON.parse(req.body.toString()) as EmailEventPayload;
  switch (event.event) {
    case WebhookEvents.EmailSent:
      console.log('delivered', event.email_id);
      break;
    case WebhookEvents.EmailFailed:
      console.log('failed', event.email_id);
      break;
  }
  res.sendStatus(200);
});
```

Payload types: `EmailEventPayload`, `CampaignEventPayload`,
`ComplaintEventPayload`, `UnsubscribeEventPayload`, `InboundEventPayload`,
`MessageEventPayload` — or `WebhookPayload` to narrow on `event`.

### Web forms

```ts
const form = await posta.forms.create({
  name: 'Contact',
  allowed_origins: ['https://example.com'],
  strict_origin: true,
  notify_emails: ['team@example.com'],
});

const snippet = await posta.forms.snippet(form.id);
console.log(snippet.html);

const inbox = await posta.messages.list({ state: 'new' });
```

## Errors

Non-2xx responses reject with a `PostaError` carrying the status and the
decoded error envelope:

```ts
import { PostaError } from '@goposta/posta';

try {
  await posta.emails.send(req);
} catch (err) {
  if (err instanceof PostaError) {
    console.error(`posta ${err.statusCode}: ${err.info?.message}`);
    if (err.isRateLimited) await retryLater();
  }
}
```

Getters cover the common cases: `isNotFound`, `isUnauthorized`, `isForbidden`,
`isRateLimited`.

## License

Apache-2.0
