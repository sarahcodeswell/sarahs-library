import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

export const config = {
  runtime: 'nodejs',
};

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export default async function handler(req) {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    const body = await req.json();

    const type = String(body?.type || '').trim();
    const message = String(body?.message || '').trim();
    const pageUrl = String(body?.pageUrl || '').trim();
    const honeypot = String(body?.company || '').trim();

    if (honeypot) {
      return json({ ok: true });
    }

    if (!type || (type !== 'thanks' && type !== 'feature_request')) {
      return json({ error: 'Invalid type' }, 400);
    }

    if (!message) {
      return json({ error: 'Message required' }, 400);
    }

    if (message.length > 2000) {
      return json({ error: 'Message too long' }, 400);
    }

    const region = globalThis?.process?.env?.AWS_REGION;
    const accessKeyId = globalThis?.process?.env?.AWS_ACCESS_KEY_ID;
    const secretAccessKey = globalThis?.process?.env?.AWS_SECRET_ACCESS_KEY;
    const fromEmail = globalThis?.process?.env?.SES_FROM_EMAIL;
    const toEmail = globalThis?.process?.env?.FEEDBACK_TO_EMAIL || 'hello@sarahsbooks.com';

    if (!region || !accessKeyId || !secretAccessKey || !fromEmail) {
      return json({ error: 'Server not configured' }, 500);
    }

    const subject = type === 'thanks' ? 'Thanks <3' : 'Sarahs Books Feature Request';
    const contentLines = [
      message,
      '',
      pageUrl ? `Page: ${pageUrl}` : null,
      req?.headers?.get?.('user-agent') ? `User-Agent: ${req.headers.get('user-agent')}` : null,
      req?.headers?.get?.('x-forwarded-for') ? `IP: ${req.headers.get('x-forwarded-for')}` : null,
    ].filter(Boolean);

    const client = new SESClient({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    const cmd = new SendEmailCommand({
      Source: fromEmail,
      Destination: {
        ToAddresses: [toEmail],
      },
      Message: {
        Subject: { Data: subject, Charset: 'UTF-8' },
        Body: {
          Text: { Data: contentLines.join('\n'), Charset: 'UTF-8' },
        },
      },
    });

    await client.send(cmd);

    return json({ ok: true });
  } catch (e) {
    void e;
    return json({ error: 'Failed to process request' }, 500);
  }
}
