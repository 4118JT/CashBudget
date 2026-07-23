import { NextRequest, NextResponse } from 'next/server';
import { CountryCode, Products } from 'plaid';
import { plaidClient } from '../../../../lib/server/plaid';
import { requireUser } from '../../../../lib/server/supabase';

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const webhookUrl = process.env.PLAID_WEBHOOK_URL;
    const redirectUri = process.env.PLAID_REDIRECT_URI;
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: user.id },
      client_name: 'CashBudget',
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: 'en',
      webhook: webhookUrl || undefined,
      redirect_uri: redirectUri || undefined,
    });

    return NextResponse.json({
      link_token: response.data.link_token,
      expiration: response.data.expiration,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create link token';
    return NextResponse.json({ error: message }, { status: message === 'Unauthorized' ? 401 : 400 });
  }
}
