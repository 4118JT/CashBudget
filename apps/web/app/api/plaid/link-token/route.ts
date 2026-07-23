import { NextRequest, NextResponse } from 'next/server';
import { CountryCode, Products, type LinkTokenCreateRequest } from 'plaid';
import { plaidClient } from '../../../../lib/server/plaid';
import { requireUser } from '../../../../lib/server/supabase';

const LINK_PRODUCTS: Products[] = [Products.Transactions];
const LINK_COUNTRY_CODES: CountryCode[] = [CountryCode.Us];

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const webhookUrl = process.env.PLAID_WEBHOOK_URL;
    const redirectUri = process.env.PLAID_REDIRECT_URI;
    const linkTokenRequest: LinkTokenCreateRequest = {
      user: { client_user_id: user.id },
      client_name: 'CashBudget',
      products: LINK_PRODUCTS,
      country_codes: LINK_COUNTRY_CODES,
      language: 'en',
      webhook: webhookUrl || undefined,
      redirect_uri: redirectUri || undefined,
    };
    const response = await plaidClient.linkTokenCreate(linkTokenRequest);

    return NextResponse.json({
      link_token: response.data.link_token,
      expiration: response.data.expiration,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create link token';
    return NextResponse.json({ error: message }, { status: message === 'Unauthorized' ? 401 : 400 });
  }
}
