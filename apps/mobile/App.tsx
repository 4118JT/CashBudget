import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Button, SafeAreaView, ScrollView, Text, TextInput, View } from 'react-native';
import { supabase } from './supabase';

export default function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
        loadTx(data.user.id);
      }
    });
  }, []);

  async function signIn() {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return alert(error.message);
    setUserId(data.user.id);
    await ensureDefaultAccount(data.user.id);
    await loadTx(data.user.id);
  }

  async function signUp() {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) return alert(error.message);
    alert('Check your email for confirmation');
  }

  async function ensureDefaultAccount(uid: string) {
    const { data: accounts } = await supabase.from('accounts').select('id').eq('user_id', uid).limit(1);
    if (!accounts || accounts.length === 0) {
      await supabase.from('accounts').insert({ user_id: uid, name: 'Apple Cash', type: 'wallet', starting_balance: 0 });
    }
  }

  async function loadTx(uid: string) {
    const { data, error } = await supabase
      .from('transactions')
      .select('id, amount, kind, merchant, occurred_at')
      .eq('user_id', uid)
      .order('occurred_at', { ascending: false })
      .limit(20);
    if (error) return alert(error.message);
    setItems(data || []);
  }

  async function addExpense() {
    if (!userId) return;
    const amt = Number(amount);
    if (!amt || amt <= 0) return alert('Invalid amount');

    const { data: accounts } = await supabase.from('accounts').select('id').eq('user_id', userId).limit(1);
    const accountId = accounts?.[0]?.id;
    if (!accountId) return alert('No account found');

    const { error } = await supabase.from('transactions').insert({
      user_id: userId,
      account_id: accountId,
      amount: amt,
      kind: 'expense',
      merchant: merchant || null,
      source: 'manual',
      status: 'confirmed'
    });
    if (error) return alert(error.message);
    setAmount('');
    setMerchant('');
    await loadTx(userId);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f6f7fb' }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={{ fontSize: 28, fontWeight: '700', marginBottom: 8 }}>CashBudget</Text>

        {!userId ? (
          <View style={{ backgroundColor: 'white', padding: 12, borderRadius: 8 }}>
            <Text style={{ fontSize: 18, fontWeight: '600' }}>Login / Signup</Text>
            <TextInput placeholder="Email" value={email} onChangeText={setEmail} style={{ borderWidth: 1, marginTop: 8, padding: 8 }} />
            <TextInput placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry style={{ borderWidth: 1, marginTop: 8, padding: 8 }} />
            <View style={{ marginTop: 8 }}><Button title="Sign In" onPress={signIn} /></View>
            <View style={{ marginTop: 8 }}><Button title="Sign Up" onPress={signUp} /></View>
          </View>
        ) : (
          <>
            <View style={{ backgroundColor: 'white', padding: 12, borderRadius: 8, marginBottom: 12 }}>
              <Text style={{ fontSize: 18, fontWeight: '600' }}>Quick Add Expense</Text>
              <TextInput placeholder="Amount" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" style={{ borderWidth: 1, marginTop: 8, padding: 8 }} />
              <TextInput placeholder="Merchant" value={merchant} onChangeText={setMerchant} style={{ borderWidth: 1, marginTop: 8, padding: 8 }} />
              <View style={{ marginTop: 8 }}><Button title="Save" onPress={addExpense} /></View>
            </View>

            <View style={{ backgroundColor: 'white', padding: 12, borderRadius: 8 }}>
              <Text style={{ fontSize: 18, fontWeight: '600' }}>Recent Transactions</Text>
              {items.map((t) => (
                <Text key={t.id} style={{ marginTop: 6 }}>
                  {new Date(t.occurred_at).toLocaleDateString()} - ${Number(t.amount).toFixed(2)} {t.merchant ? `at ${t.merchant}` : ''}
                </Text>
              ))}
            </View>
          </>
        )}
      </ScrollView>
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}
