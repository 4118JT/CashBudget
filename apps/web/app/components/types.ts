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
