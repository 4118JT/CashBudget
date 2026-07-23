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
