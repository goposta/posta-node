import { PostaClient, PostaError } from '../src/index.js';

const client = new PostaClient('https://posta.example.com', 'your-api-key');

// Send a simple email
const resp = await client.sendEmail({
  from: 'sender@example.com',
  to: ['recipient@example.com'],
  subject: 'Hello from Posta',
  html: '<h1>Hello!</h1><p>This is a test email.</p>',
});
console.log(`Email sent: id=${resp.id} status=${resp.status}`);

// Check email status
const status = await client.getEmailStatus(resp.id);
console.log(`Email status: ${status.status}`);

// Send using a template (by ID — preferred)
const tmplResp = await client.sendTemplateEmail({
  template_id: 42,
  to: ['user@example.com'],
  from: 'noreply@example.com',
  template_data: { name: 'Alice' },
});
console.log(`Template email sent: id=${tmplResp.id}`);

// Send using a template (by name — fallback)
const tmplResp2 = await client.sendTemplateEmail({
  template: 'welcome',
  to: ['user@example.com'],
  from: 'noreply@example.com',
  language: 'en',
  template_data: { name: 'Bob' },
});
console.log(`Template email sent: id=${tmplResp2.id}`);

// Batch send
const batchResp = await client.sendBatch({
  template: 'newsletter',
  from: 'news@example.com',
  recipients: [
    { email: 'user1@example.com', template_data: { name: 'Bob' } },
    { email: 'user2@example.com', language: 'fr', template_data: { name: 'Carol' } },
  ],
});
console.log(`Batch sent: total=${batchResp.total} sent=${batchResp.sent} failed=${batchResp.failed}`);

// Preview a template
const preview = await client.previewTemplate({
  template: 'welcome',
  template_data: { name: 'Preview User' },
});
console.log(`Preview subject: ${preview.subject}`);

// Retry a failed email
try {
  const retryResp = await client.retryEmail(resp.id);
  console.log(`Retried: id=${retryResp.id} status=${retryResp.status}`);
} catch (err) {
  if (err instanceof PostaError) {
    console.log(`Retry failed: ${err.statusCode} ${err.info?.message}`);
  }
}

// Error handling
try {
  await client.getEmailStatus('invalid-uuid');
} catch (err) {
  if (err instanceof PostaError) {
    console.log(`API error: status=${err.statusCode} message=${err.info?.message}`);
  }
}
