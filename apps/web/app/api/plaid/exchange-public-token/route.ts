import { NextRequest, NextResponse } from 'next/server';
import { exchangeAndPersistItem, syncPlaidItemForUser } from '../../../../lib/server/plaidSync';
import { requireUser } from '../../../../lib/server/supabase';

type ExchangeBody = {
  public_token?: string;
  account_ids?: string[];
};

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const body = (await request.json()) as ExchangeBody;
    if (!body.public_token) {
      return NextResponse.json({ error: 'public_token is required' }, { status: 400 });
    }

    const selected = Array.isArray(body.account_ids) ? body.account_ids.filter(Boolean) : [];
    const persisted = await exchangeAndPersistItem({
      userId: user.id,
      publicToken: body.public_token,
      selectedAccountIds: selected,
    });
    const syncResult = await syncPlaidItemForUser(user.id, persisted.itemId);

    return NextResponse.json({
      item_id: persisted.itemId,
      linked_accounts: persisted.accountsLinked,
      synced: syncResult,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to exchange public token';
    return NextResponse.json({ error: message }, { status: message === 'Unauthorized' ? 401 : 400 });
  }
}
