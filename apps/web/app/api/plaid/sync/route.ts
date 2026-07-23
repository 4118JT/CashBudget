import { NextRequest, NextResponse } from 'next/server';
import { syncAllPlaidItemsForUser, syncPlaidItemForUser } from '../../../../lib/server/plaidSync';
import { requireUser } from '../../../../lib/server/supabase';

type SyncBody = {
  plaid_item_id?: string;
};

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const body = (await request.json().catch(() => ({}))) as SyncBody;
    if (body.plaid_item_id) {
      const synced = await syncPlaidItemForUser(user.id, body.plaid_item_id);
      return NextResponse.json({ synced, item_id: body.plaid_item_id });
    }

    const synced = await syncAllPlaidItemsForUser(user.id);
    return NextResponse.json({ synced });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to sync Plaid transactions';
    return NextResponse.json({ error: message }, { status: message === 'Unauthorized' ? 401 : 400 });
  }
}
