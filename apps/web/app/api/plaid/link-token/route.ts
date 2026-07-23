import { NextResponse } from 'next/server';
import { authenticatedUser, plaid } from '../../../../lib/plaid-server';

export async function POST(request: Request) {
  try {
    const user = await authenticatedUser(request);
    const result = await plaid('/link/token/create', { user: { client_user_id: user.id }, client_name: 'CashBudget', products: ['transactions'], country_codes: ['US'], language: 'en' });
    return NextResponse.json({ link_token: result.link_token });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to create Plaid Link token' }, { status: 401 });
  }
}
