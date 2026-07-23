import { CountryCode, type AccountBase, type RemovedTransaction, type Transaction } from 'plaid';
import { plaidClient, syncTransactions } from './plaid';
import { decryptToken, encryptToken } from './tokenCrypto';
import { supabaseAdmin } from './supabase';

type PlaidItemRow = {
  id: string;
  user_id: string;
  plaid_item_id: string;
  access_token_ciphertext: string;
  access_token_iv: string;
  access_token_tag: string;
  encryption_key_version: string;
  sync_cursor: string | null;
};

type PlaidAccountRow = {
  plaid_account_id: string;
  app_account_id: string;
};

function asIsoDate(input: string | null | undefined): string {
  if (!input) return new Date().toISOString();
  if (input.includes('T')) return input;
  return new Date(`${input}T00:00:00.000Z`).toISOString();
}

export async function upsertPlaidItem(input: {
  userId: string;
  itemId: string;
  accessToken: string;
  institutionId: string | null;
  institutionName: string | null;
}) {
  const encrypted = encryptToken(input.accessToken);
  const { error } = await supabaseAdmin.from('plaid_items').upsert(
    {
      user_id: input.userId,
      plaid_item_id: input.itemId,
      institution_id: input.institutionId,
      institution_name: input.institutionName,
      access_token_ciphertext: encrypted.ciphertext,
      access_token_iv: encrypted.iv,
      access_token_tag: encrypted.tag,
      encryption_key_version: encrypted.keyVersion,
      item_status: 'active',
      last_error_code: null,
      last_error_message: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,plaid_item_id' }
  );
  if (error) throw new Error(error.message);
}

async function ensureMappedAccounts(input: {
  userId: string;
  itemId: string;
  accounts: AccountBase[];
}) {
  const accountIds = input.accounts.map((a) => a.account_id);
  const { data: existingMappings, error: mappingError } = await supabaseAdmin
    .from('plaid_accounts')
    .select('plaid_account_id, app_account_id')
    .eq('user_id', input.userId)
    .in('plaid_account_id', accountIds);
  if (mappingError) throw new Error(mappingError.message);

  const existingMap = new Map(
    (existingMappings as PlaidAccountRow[] | null)?.map((m) => [m.plaid_account_id, m.app_account_id]) ?? []
  );
  const missing = input.accounts.filter((a) => !existingMap.has(a.account_id));

  if (missing.length > 0) {
    const { data: insertedAccounts, error: accountInsertError } = await supabaseAdmin
      .from('accounts')
      .insert(
        missing.map((a) => ({
          user_id: input.userId,
          name: [a.name, a.mask ? `••${a.mask}` : null].filter(Boolean).join(' '),
          type: 'bank',
          starting_balance: 0,
        }))
      )
      .select('id');
    if (accountInsertError) throw new Error(accountInsertError.message);

    insertedAccounts?.forEach((row, index) => {
      existingMap.set(missing[index].account_id, row.id as string);
    });
  }

  const { error: upsertError } = await supabaseAdmin.from('plaid_accounts').upsert(
    input.accounts.map((a) => ({
      user_id: input.userId,
      plaid_item_id: input.itemId,
      plaid_account_id: a.account_id,
      app_account_id: existingMap.get(a.account_id),
      name: a.name,
      official_name: a.official_name,
      mask: a.mask,
      account_type: a.type,
      account_subtype: a.subtype,
      is_active: true,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: 'user_id,plaid_account_id' }
  );
  if (upsertError) throw new Error(upsertError.message);
}

function normalizeTransaction(userId: string, mapping: Map<string, string>, tx: Transaction) {
  const appAccountId = mapping.get(tx.account_id);
  if (!appAccountId) return null;
  const kind = tx.amount < 0 ? 'income' : 'expense';
  const amount = Math.abs(tx.amount);
  return {
    user_id: userId,
    account_id: appAccountId,
    amount,
    kind,
    merchant: tx.merchant_name ?? tx.name ?? null,
    occurred_at: asIsoDate(tx.authorized_date ?? tx.date),
    note: tx.pending ? 'Pending Plaid transaction' : null,
    status: 'confirmed',
    source: 'plaid',
    external_ref: tx.transaction_id,
  };
}

async function removeDeletedTransactions(userId: string, removed: RemovedTransaction[]) {
  if (removed.length === 0) return;
  const refs = removed.map((t) => t.transaction_id);
  const { error } = await supabaseAdmin
    .from('transactions')
    .delete()
    .eq('user_id', userId)
    .eq('source', 'plaid')
    .in('external_ref', refs);
  if (error) throw new Error(error.message);
}

async function getPlaidItemOrThrow(userId: string, plaidItemId: string) {
  const { data, error } = await supabaseAdmin
    .from('plaid_items')
    .select('*')
    .eq('user_id', userId)
    .eq('plaid_item_id', plaidItemId)
    .single();
  if (error || !data) throw new Error('Connected Plaid item not found');
  return data as PlaidItemRow;
}

export async function syncPlaidItemForUser(userId: string, plaidItemId: string) {
  const item = await getPlaidItemOrThrow(userId, plaidItemId);
  const decrypted = decryptToken({
    ciphertext: item.access_token_ciphertext,
    iv: item.access_token_iv,
    tag: item.access_token_tag,
    keyVersion: item.encryption_key_version,
  });

  if (decrypted.requiresRotation) {
    const rotated = encryptToken(decrypted.plaintext);
    await supabaseAdmin
      .from('plaid_items')
      .update({
        access_token_ciphertext: rotated.ciphertext,
        access_token_iv: rotated.iv,
        access_token_tag: rotated.tag,
        encryption_key_version: rotated.keyVersion,
        updated_at: new Date().toISOString(),
      })
      .eq('id', item.id);
  }

  const { data: mappedAccounts, error: mappedError } = await supabaseAdmin
    .from('plaid_accounts')
    .select('plaid_account_id, app_account_id')
    .eq('user_id', userId)
    .eq('plaid_item_id', plaidItemId)
    .eq('is_active', true);
  if (mappedError) throw new Error(mappedError.message);

  const accountMap = new Map(
    (mappedAccounts as PlaidAccountRow[] | null)?.map((row) => [row.plaid_account_id, row.app_account_id]) ?? []
  );
  if (accountMap.size === 0) return { added: 0, modified: 0, removed: 0 };

  try {
    const synced = await syncTransactions(decrypted.plaintext, item.sync_cursor);
    const upserts = [...synced.added, ...synced.modified]
      .map((tx) => normalizeTransaction(userId, accountMap, tx))
      .filter((row): row is NonNullable<typeof row> => !!row);

    if (upserts.length > 0) {
      const { error: upsertError } = await supabaseAdmin.from('transactions').upsert(upserts, {
        onConflict: 'user_id,external_ref',
      });
      if (upsertError) throw new Error(upsertError.message);
    }

    await removeDeletedTransactions(userId, synced.removed);

    const { error: cursorError } = await supabaseAdmin
      .from('plaid_items')
      .update({
        sync_cursor: synced.nextCursor,
        item_status: 'active',
        last_error_code: null,
        last_error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', item.id);
    if (cursorError) throw new Error(cursorError.message);

    return { added: synced.added.length, modified: synced.modified.length, removed: synced.removed.length };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Plaid sync failed';
    const status = message.includes('ITEM_LOGIN_REQUIRED') ? 'revoked' : 'error';
    await supabaseAdmin
      .from('plaid_items')
      .update({
        item_status: status,
        last_error_code: status === 'revoked' ? 'ITEM_LOGIN_REQUIRED' : 'SYNC_ERROR',
        last_error_message: message,
        updated_at: new Date().toISOString(),
      })
      .eq('id', item.id);
    throw err;
  }
}

export async function exchangeAndPersistItem(input: {
  userId: string;
  publicToken: string;
  selectedAccountIds: string[];
}) {
  const exchange = await plaidClient.itemPublicTokenExchange({ public_token: input.publicToken });
  const accessToken = exchange.data.access_token;
  const itemId = exchange.data.item_id;

  const accountsRes = await plaidClient.accountsGet({ access_token: accessToken });
  const institutionId = accountsRes.data.item?.institution_id ?? null;

  let institutionName: string | null = null;
  if (institutionId) {
    try {
      const institution = await plaidClient.institutionsGetById({
        institution_id: institutionId,
        country_codes: [CountryCode.Us],
      });
      institutionName = institution.data.institution.name ?? null;
    } catch {
      institutionName = null;
    }
  }

  await upsertPlaidItem({
    userId: input.userId,
    itemId,
    accessToken,
    institutionId,
    institutionName,
  });

  const selectedSet = new Set(input.selectedAccountIds);
  const selectedAccounts = accountsRes.data.accounts.filter(
    (a) => selectedSet.size === 0 || selectedSet.has(a.account_id)
  );
  await ensureMappedAccounts({ userId: input.userId, itemId, accounts: selectedAccounts });
  return { itemId, accountsLinked: selectedAccounts.length };
}

export async function syncAllPlaidItemsForUser(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('plaid_items')
    .select('plaid_item_id')
    .eq('user_id', userId)
    .neq('item_status', 'revoked');
  if (error) throw new Error(error.message);
  const itemIds = (data ?? []).map((row) => row.plaid_item_id as string);
  const results = await Promise.all(itemIds.map((itemId) => syncPlaidItemForUser(userId, itemId)));
  return {
    items: itemIds.length,
    added: results.reduce((acc, row) => acc + row.added, 0),
    modified: results.reduce((acc, row) => acc + row.modified, 0),
    removed: results.reduce((acc, row) => acc + row.removed, 0),
  };
}

export async function syncByPlaidItemId(plaidItemId: string) {
  const { data, error } = await supabaseAdmin
    .from('plaid_items')
    .select('user_id, plaid_item_id')
    .eq('plaid_item_id', plaidItemId);
  if (error) throw new Error(error.message);
  await Promise.all(
    (data ?? []).map((row) => syncPlaidItemForUser(row.user_id as string, row.plaid_item_id as string))
  );
}
