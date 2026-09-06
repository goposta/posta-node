/**
 * Exercises a representative slice of the Posta Node client: sending,
 * templates, subscribers, campaigns, and webhook verification.
 */
import {
  PostaClient,
  PostaError,
  verifySignature,
  WebhookEvents,
  type EmailEventPayload,
} from '@goposta/posta';

const posta = new PostaClient('https://posta.example.com', 'psk_your_api_key', {
  workspaceId: 1,
});

async function main(): Promise<void> {
  // A plain transactional send.
  const resp = await posta.emails.send({
    from: 'Acme <hello@example.com>',
    to: ['user@example.com'],
    subject: 'Hello from Posta',
    html: '<h1>Hello!</h1><p>This is a test email.</p>',
    text: 'Hello! This is a test email.',
  });
  console.log(`sent: id=${resp.id} status=${resp.status}`);

  // Poll its delivery status.
  const status = await posta.emails.status(resp.id);
  console.log(`status: ${status.status} (retries: ${status.retry_count})`);

  // Send from a stored template.
  await posta.emails.sendTemplate({
    template: 'welcome',
    to: ['user@example.com'],
    from: 'noreply@example.com',
    template_data: { name: 'Alice' },
  });

  // Batch send with per-recipient variables.
  const batch = await posta.emails.sendBatch({
    template: 'welcome',
    from: 'noreply@example.com',
    recipients: [
      { email: 'a@example.com', template_data: { name: 'Ada' } },
      { email: 'b@example.com', template_data: { name: 'Grace' } },
    ],
  });
  console.log(`batch: ${batch.sent} sent, ${batch.failed} failed`);

  // Check an address before adding it to a list.
  const verdict = await posta.emails.verify({ email: 'user@example.com' });
  console.log(`verify: ${verdict.status} (score ${verdict.score})`);

  // Page through recent emails.
  const page = await posta.emails.list({ size: 10, sort: '-created_at' });
  console.log(`emails: ${page.data.length} of ${page.pageable.total_elements}`);

  // Register a webhook. The secret is returned only here.
  const hook = await posta.webhooks.create({
    url: 'https://example.com/hooks/posta',
    events: [WebhookEvents.EmailSent, WebhookEvents.EmailFailed],
  });
  console.log(`webhook ${hook.id} registered; store secret ${hook.secret}`);

  // Errors carry the API's status and message.
  try {
    await posta.emails.get('does-not-exist');
  } catch (err) {
    if (err instanceof PostaError && err.isNotFound) {
      console.log('no such email, as expected');
    } else {
      throw err;
    }
  }
}

/**
 * Authenticates an incoming Posta webhook. Verify the signature against the
 * exact bytes received: decoding and re-encoding the JSON changes them, and the
 * HMAC will not match. With Express, that means `express.raw()`, not
 * `express.json()`.
 */
export function handleWebhook(rawBody: Buffer, signature: string | undefined, secret: string): void {
  if (!verifySignature(rawBody, signature, secret)) {
    throw new Error('bad signature');
  }

  const event = JSON.parse(rawBody.toString()) as EmailEventPayload;
  switch (event.event) {
    case WebhookEvents.EmailSent:
      console.log(`delivered: ${event.email_id}`);
      break;
    case WebhookEvents.EmailFailed:
      console.log(`failed: ${event.email_id}`);
      break;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
