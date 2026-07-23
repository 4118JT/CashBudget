import { NextResponse } from 'next/server';
import { adminSupabase, authenticatedUser, encryptToken, plaid } from '../../../../lib/plaid-server';

export async function POST(request: Request) {
  try {
    const user = await authenticatedUser(request);
    const { public_token, institution } = await request.json();
    if (!public_token || typeof public_token !== 'string') return NextResponse.json({ error: 'Missing public token' }, { status: 400 });
    const exchange = await plaid('/item/public_token/exchange', { public_token });
    const db = adminSupabase();
    const { error } = await db.from('plaid_items').upsert({ user_id: user.id, item_id: exchange.item_id, access_token_encrypted: encryptToken(exchange.access_token), institution_name: institution?.name ?? null, institution_id: institution?.institution_id ?? null, sync_cursor: null, updated_at: new Date().toISOString() }, { onConflict: 'user_id,item_id' });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to connect account' }, { status: 400 });
  }
}
