import { NextRequest, NextResponse } from 'next/server';
import { syncByPlaidItemId } from '../../../../lib/server/plaidSync';
import { supabaseAdmin } from '../../../../lib/server/supabase';

type PlaidWebhookBody = {
  webhook_type?: string;
  webhook_code?: string;
  item_id?: string;
  error?: { error_code?: string; error_message?: string };
};

const TX_WEBHOOKS = new Set(['SYNC_UPDATES_AVAILABLE', 'DEFAULT_UPDATE', 'INITIAL_UPDATE', 'HISTORICAL_UPDATE']);

export async function POST(request: NextRequest) {
  try {
    const expectedSecret = process.env.PLAID_WEBHOOK_SECRET;
    if (expectedSecret) {
      const providedSecret = request.headers.get('x-plaid-webhook-secret');
      if (providedSecret !== expectedSecret) {
        return NextResponse.json({ error: 'Unauthorized webhook' }, { status: 401 });
      }
    }

    const body = (await request.json()) as PlaidWebhookBody;
    if (!body.item_id) return NextResponse.json({ ok: true });

    if (body.webhook_type === 'TRANSACTIONS' && body.webhook_code && TX_WEBHOOKS.has(body.webhook_code)) {
      await syncByPlaidItemId(body.item_id);
      return NextResponse.json({ ok: true });
    }

    if (body.webhook_type === 'ITEM' && body.webhook_code === 'ERROR') {
      await supabaseAdmin
        .from('plaid_items')
        .update({
          item_status: 'error',
          last_error_code: body.error?.error_code ?? 'ITEM_ERROR',
          last_error_message: body.error?.error_message ?? 'Plaid item error',
          updated_at: new Date().toISOString(),
        })
        .eq('plaid_item_id', body.item_id);
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Webhook handling failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
