# Posta Node.js Client

Official Node.js/TypeScript client for the [Posta](https://github.com/goposta/posta) email delivery platform.

Zero dependencies — uses the built-in `fetch` API (Node.js 18+).

## Installation

```bash
npm install @goposta/posta
```

## Quick Start

```ts
import { PostaClient } from '@goposta/posta';

const client = new PostaClient('https://posta.example.com', 'your-api-key');

const resp = await client.sendEmail({
  from: 'sender@example.com',
  to: ['recipient@example.com'],
  subject: 'Hello from Posta',
  html: '<h1>Hello!</h1><p>This is a test email.</p>',
});
console.log(`Email sent: id=${resp.id} status=${resp.status}`);
```

## API Reference

### Send Email

```ts
await client.sendEmail({
  from: 'sender@example.com',
  to: ['recipient@example.com'],
  subject: 'Hello',
  html: '<h1>Hello!</h1>',
  text: 'Hello!',                                      // optional
  attachments: [{                                       // optional
    filename: 'doc.pdf',
    content: '<base64-encoded>',
    content_type: 'application/pdf',
  }],
  headers: { 'X-Custom': 'value' },                    // optional
  list_unsubscribe_url: 'https://example.com/unsub',   // optional
  send_at: '2026-03-25T10:00:00Z',                     // optional
});
```

### Send Template Email

```ts
// By template ID (preferred — uses primary key index)
await client.sendTemplateEmail({
  template_id: 42,
  to: ['user@example.com'],
  from: 'noreply@example.com',
  template_data: { name: 'Alice' },
});

// By template name (fallback)
await client.sendTemplateEmail({
  template: 'welcome',
  to: ['user@example.com'],
  language: 'en',
  template_data: { name: 'Alice' },
});
```

### Batch Send

```ts
await client.sendBatch({
  template: 'newsletter',
  from: 'news@example.com',
  recipients: [
    { email: 'user1@example.com', template_data: { name: 'Bob' } },
    { email: 'user2@example.com', language: 'fr', template_data: { name: 'Carol' } },
  ],
});
```

### Preview Template

```ts
const preview = await client.previewTemplate({
  template: 'welcome',
  template_data: { name: 'Preview User' },
});
console.log(preview.subject, preview.html);
```

### Check Delivery Status

```ts
const status = await client.getEmailStatus('email-uuid');
console.log(`Status: ${status.status}`);
```

### Retry Failed Email

```ts
const resp = await client.retryEmail('email-uuid');
console.log(`Retried: status=${resp.status}`);
```

## Error Handling

All methods throw `PostaError` when the API returns a non-2xx status:

```ts
import { PostaError } from '@goposta/posta';

try {
  await client.getEmailStatus('invalid-uuid');
} catch (err) {
  if (err instanceof PostaError) {
    console.log(`Status: ${err.statusCode}`);
    console.log(`Message: ${err.info?.message}`);
  }
}
```

## Configuration

```ts
const client = new PostaClient('https://posta.example.com', 'your-api-key', {
  timeout: 10_000, // request timeout in ms (default: 30000)
});
```

## Contributing

Contributions are welcome! Please open an issue to discuss proposed changes before submitting a pull request.

---
## License

This project is licensed under the Apache License 2.0. See [LICENSE](LICENSE) for details.

---

## Copyright

Copyright © 2026 Jonas Kaninda
