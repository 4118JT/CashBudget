import { NextResponse } from 'next/server';
import { adminSupabase, authenticatedUser, decryptToken, plaid } from '../../../../lib/plaid-server';

type PlaidTransaction = { transaction_id: string; account_id: string; amount: number; name: string; date: string; pending: boolean };

export async function POST(request: Request) {
  try {
    const user = await authenticatedUser(request);
    const db = adminSupabase();
    const { data: items, error } = await db.from('plaid_items').select('id,item_id,access_token_encrypted,sync_cursor').eq('user_id', user.id);
    if (error) throw error;
    let imported = 0;
    for (const item of items ?? []) {
      let cursor = item.sync_cursor ?? undefined;
      let hasMore = true;
      while (hasMore) {
        const result = await plaid('/transactions/sync', { access_token: decryptToken(item.access_token_encrypted), cursor, count: 500 });
        const added = (result.added ?? []) as PlaidTransaction[];
        for (const transaction of added) {
          const { data: account } = await db.from('accounts').upsert({ user_id: user.id, name: `Linked account ${transaction.account_id.slice(-4)}`, type: 'linked_card' }, { onConflict: 'user_id,name' }).select('id').single();
          if (!account) continue;
          const { error: insertError } = await db.from('transactions').upsert({ user_id: user.id, account_id: account.id, amount: Math.abs(transaction.amount), kind: transaction.amount >= 0 ? 'expense' : 'income', merchant: transaction.name, occurred_at: new Date(`${transaction.date}T12:00:00Z`).toISOString(), status: transaction.pending ? 'draft' : 'confirmed', source: 'import', external_ref: `plaid:${transaction.transaction_id}` }, { onConflict: 'user_id,external_ref' });
          if (!insertError) imported += 1;
        }
        cursor = result.next_cursor;
        hasMore = result.has_more;
      }
      await db.from('plaid_items').update({ sync_cursor: cursor, updated_at: new Date().toISOString() }).eq('id', item.id);
    }
    return NextResponse.json({ imported });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to sync transactions' }, { status: 400 });
  }
}
