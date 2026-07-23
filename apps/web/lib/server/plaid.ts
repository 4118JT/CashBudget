import crypto from 'crypto';
import { Configuration, PlaidApi, PlaidEnvironments, type TransactionsSyncRequest } from 'plaid';

const clientId = process.env.PLAID_CLIENT_ID;
const secret = process.env.PLAID_SECRET;
const env = process.env.PLAID_ENV ?? 'sandbox';

if (!clientId || !secret) {
  throw new Error('Missing PLAID_CLIENT_ID or PLAID_SECRET');
}

const host = PlaidEnvironments[env as keyof typeof PlaidEnvironments];
if (!host) {
  throw new Error(`Unsupported PLAID_ENV "${env}"`);
}

const config = new Configuration({
  basePath: host,
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': clientId,
      'PLAID-SECRET': secret,
      'Plaid-Version': '2020-09-14',
    },
  },
});

export const plaidClient = new PlaidApi(config);

function base64UrlToBuffer(input: string) {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  return Buffer.from(padded, 'base64');
}

function compareHex(expected: string, actual: string) {
  const left = Buffer.from(expected.toLowerCase(), 'utf8');
  const right = Buffer.from(actual.toLowerCase(), 'utf8');
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export async function verifyPlaidWebhook(rawBody: string, signedJwt: string) {
  const parts = signedJwt.split('.');
  if (parts.length !== 3) throw new Error('Malformed Plaid webhook signature');

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = JSON.parse(base64UrlToBuffer(encodedHeader).toString('utf8')) as {
    alg?: string;
    kid?: string;
  };
  if (header.alg !== 'ES256' || !header.kid) {
    throw new Error('Unsupported Plaid webhook signature header');
  }

  const { data } = await plaidClient.webhookVerificationKeyGet({ key_id: header.kid });
  const key = crypto.createPublicKey({
    key: { ...data.key } as unknown as crypto.JsonWebKey,
    format: 'jwk',
  });

  const verified = crypto.verify(
    'sha256',
    Buffer.from(`${encodedHeader}.${encodedPayload}`, 'utf8'),
    { key, dsaEncoding: 'ieee-p1363' },
    base64UrlToBuffer(encodedSignature)
  );
  if (!verified) throw new Error('Invalid Plaid webhook signature');

  const payload = JSON.parse(base64UrlToBuffer(encodedPayload).toString('utf8')) as {
    iat?: number;
    request_body_sha256?: string;
  };
  if (!payload.iat || Math.abs(Math.floor(Date.now() / 1000) - payload.iat) > 300) {
    throw new Error('Stale Plaid webhook signature');
  }

  const bodyHash = crypto.createHash('sha256').update(Buffer.from(rawBody, 'utf8')).digest('hex');
  if (!payload.request_body_sha256 || !compareHex(payload.request_body_sha256, bodyHash)) {
    throw new Error('Plaid webhook body hash mismatch');
  }
}

export async function syncTransactions(
  accessToken: string,
  cursor: string | null,
  count = 200
) {
  let nextCursor = cursor;
  let hasMore = true;
  const added: Awaited<ReturnType<PlaidApi['transactionsSync']>>['data']['added'] = [];
  const modified: Awaited<ReturnType<PlaidApi['transactionsSync']>>['data']['modified'] = [];
  const removed: Awaited<ReturnType<PlaidApi['transactionsSync']>>['data']['removed'] = [];

  while (hasMore) {
    const request: TransactionsSyncRequest = {
      access_token: accessToken,
      cursor: nextCursor ?? undefined,
      count,
    };
    const response = await plaidClient.transactionsSync(request);
    added.push(...response.data.added);
    modified.push(...response.data.modified);
    removed.push(...response.data.removed);
    hasMore = response.data.has_more;
    nextCursor = response.data.next_cursor;
  }

  return { added, modified, removed, nextCursor };
}
