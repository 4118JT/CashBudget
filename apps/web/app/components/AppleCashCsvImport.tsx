'use client';

import { useRef, useState } from 'react';
import type { ToastType } from './Toast';

type ParsedRow = { date: string; description: string; amount: number; kind: 'income' | 'expense'; externalRef: string };

interface AppleCashCsvImportProps {
  ready: boolean;
  onImport: (fileName: string, rows: ParsedRow[]) => Promise<{ inserted: number; duplicates: number }>;
  addToast: (message: string, type?: ToastType) => void;
}

function parseLine(line: string) {
  const fields: string[] = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') { field += '"'; index += 1; }
      else quoted = !quoted;
    } else if (character === ',' && !quoted) { fields.push(field.trim()); field = ''; }
    else field += character;
  }
  fields.push(field.trim());
  return fields;
}

function parseCsv(text: string): ParsedRow[] {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) throw new Error('Use a CSV with a header row and at least one transaction.');
  const header = parseLine(lines[0]).map((value) => value.toLowerCase());
  const dateIndex = header.findIndex((value) => ['date', 'transaction date'].includes(value));
  const descriptionIndex = header.findIndex((value) => ['description', 'merchant', 'name'].includes(value));
  const amountIndex = header.findIndex((value) => ['amount', 'transaction amount'].includes(value));
  if ([dateIndex, descriptionIndex, amountIndex].some((index) => index < 0)) throw new Error('CSV needs Date, Description, and Amount columns.');
  return lines.slice(1).map((line, index) => {
    const fields = parseLine(line);
    const date = new Date(fields[dateIndex]);
    const amount = Number(fields[amountIndex].replace(/[$,]/g, ''));
    const description = fields[descriptionIndex] || 'Apple Cash transaction';
    if (Number.isNaN(date.getTime()) || !Number.isFinite(amount) || amount === 0) throw new Error(`Row ${index + 2} has an invalid date or amount.`);
    const normalizedAmount = Math.abs(amount);
    return { date: date.toISOString(), description, amount: normalizedAmount, kind: amount < 0 ? 'expense' : 'income', externalRef: `apple-cash:${date.toISOString()}:${description}:${amount}` };
  });
}

export default function AppleCashCsvImport({ ready, onImport, addToast }: AppleCashCsvImportProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [saving, setSaving] = useState(false);

  async function chooseFile(file: File | undefined) {
    if (!file) return;
    try {
      const parsed = parseCsv(await file.text());
      setRows(parsed);
      setFileName(file.name);
    } catch (error: unknown) {
      setRows([]);
      addToast(error instanceof Error ? error.message : 'Unable to read CSV.', 'error');
    }
  }

  async function confirmImport() {
    if (!rows.length) return;
    setSaving(true);
    try {
      const result = await onImport(fileName, rows);
      addToast(`Imported ${result.inserted} Apple Cash transaction${result.inserted === 1 ? '' : 's'}${result.duplicates ? `; skipped ${result.duplicates} duplicates` : ''}.`, 'success');
      setRows([]); setFileName('');
      if (inputRef.current) inputRef.current.value = '';
    } catch (error: unknown) {
      addToast(error instanceof Error ? error.message : 'Unable to import CSV.', 'error');
    } finally { setSaving(false); }
  }

  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600">Apple Cash import</p><h2 className="mt-1 text-lg font-semibold text-slate-900">Import a transaction CSV</h2><p className="mt-1 text-sm text-slate-500">Use columns: Date, Description, Amount. Negative amounts become expenses.</p><input ref={inputRef} type="file" accept=".csv,text/csv" disabled={!ready} onChange={(event) => chooseFile(event.target.files?.[0])} className="mt-4 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100 disabled:opacity-50" />{rows.length > 0 && <div className="mt-4 rounded-xl bg-slate-50 p-3"><p className="text-sm font-semibold text-slate-900">{rows.length} rows ready from {fileName}</p><p className="mt-1 text-xs text-slate-500">Preview: {rows.slice(0, 2).map((row) => `${row.description} · ${row.kind === 'expense' ? '-' : '+'}$${row.amount.toFixed(2)}`).join(' · ')}</p><button type="button" onClick={confirmImport} disabled={saving || !ready} className="mt-3 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">{saving ? 'Importing…' : 'Confirm import'}</button></div>}</section>;
}
