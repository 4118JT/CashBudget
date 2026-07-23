// Shared types used across components
export type Tx = {
  id: string;
  amount: number;
  kind: 'expense' | 'income';
  merchant: string | null;
  occurred_at: string;
  status: 'draft' | 'confirmed';
  category_id: string | null;
  note: string | null;
  categories: { name: string; kind: string } | null;
};

export type Category = {
  id: string;
  name: string;
  kind: 'expense' | 'income';
};

export type Goal = {
  id: string;
  title: string;
  amount: number;
  due_date: string;
  status: 'planned' | 'paid' | 'skipped';
};

export type Loan = {
  id: string;
  name: string;
  lender: string | null;
  original_amount: number;
  remaining_balance: number;
  interest_rate: number;
  monthly_payment: number;
  next_due_date: string | null;
  status: 'active' | 'paid_off';
};

export type RecurringPayment = {
  id: string;
  name: string;
  amount: number;
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'yearly';
  next_due_date: string;
  category_id: string | null;
  is_active: boolean;
};
