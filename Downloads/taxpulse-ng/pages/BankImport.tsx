import React, { useState, useRef } from 'react';
import { Company, LedgerEntry, EvidenceFile } from '../types';
import * as db from '../services/db';
import { AppView } from '../App';

interface BankImportProps { company: Company; onNavigate: (view: AppView) => void; }

interface ParsedTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'sale' | 'expense';
  taxAmount: number;
  vatApplicable: boolean;
  whtApplicable: boolean;
  category: string;
  selected: boolean;
}

type Step = 'upload' | 'processing' | 'review' | 'done';

const categoryColors: Record<string, string> = {
  'Sales Revenue':     'bg-green-100 text-green-800',
  'Service Income':    'bg-emerald-100 text-emerald-800',
  'Staff Salary':      'bg-purple-100 text-purple-800',
  'Rent':              'bg-blue-100 text-blue-800',
  'Utilities':         'bg-cyan-100 text-cyan-800',
  'Supplies':          'bg-orange-100 text-orange-800',
  'Professional Fees': 'bg-yellow-100 text-yellow-800',
  'Bank Charges':      'bg-slate-100 text-slate-700',
  'Tax Payment':       'bg-red-100 text-red-800',
  'Other Income':      'bg-teal-100 text-teal-800',
  'Other Expense':     'bg-gray-100 text-gray-700',
};

async function extractTextFromFile(file: File, password?: string): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase();

  if (ext === 'csv' || ext === 'txt') {
    return await file.text();
  }

  if (ext === 'xlsx' || ext === 'xls') {
    const SheetJS = await import('xlsx');
    const buf = await file.arrayBuffer();
    const wb = SheetJS.read(buf, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    return SheetJS.utils.sheet_to_csv(ws);
  }

  if (ext === 'pdf') {
    try {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url
      ).toString();

      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
        ...(password ? { password } : {}),
      });

      const pdf = await loadingTask.promise;
      const lines: string[] = [];

      for (let i = 1; i <= Math.min(pdf.numPages, 20); i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        lines.push(pageText);
      }

      const fullText = lines.join('\n');
      if (fullText.trim().length > 50) return fullText;
      throw new Error('No readable text found in PDF. Please export as CSV from your bank app.');
    } catch (err: any) {
      if (err?.name === 'PasswordException' || err?.message?.includes('password')) {
        throw new Error('PDF_PASSWORD_REQUIRED');
      }
      throw new Error('Could not read this PDF. Please export your statement as CSV or Excel from your bank app instead.');
    }
  }

  if (file.type.startsWith('image/')) {
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve('[IMAGE_BASE64:' + file.type + ']:' + base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  throw new Error('Unsupported file type: .' + ext);
}

async function parseWithAI(rawText: string, company: Company): Promise<ParsedTransaction[]> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY as string;
  if (!apiKey) throw new Error('Groq API key not configured.');

  const isImage = rawText.startsWith('[IMAGE_BASE64');

  const systemPrompt = `You are a Nigerian bank statement parser and tax categoriser.
Extract all transactions from the bank statement data provided.

COMPANY CONTEXT:
- Name: ${company.name}
- Type: ${company.entityType}
- Industry: ${company.industry}
- Collects VAT: ${company.collectsVat ? 'Yes' : 'No'}
- Pays Vendors (WHT): ${company.paysVendors ? 'Yes' : 'No'}
- Has Employees: ${company.hasEmployees ? 'Yes' : 'No'}

NIGERIAN TAX RULES:
- VAT is 7.5% on taxable sales/services (NTA 2025)
- WHT applies to vendor/contractor payments: 5% (individuals), 10% (companies)
- Bank charges, transfers and tax payments are NOT taxable

Return a JSON array only. Each item must have:
{
  "date": "YYYY-MM-DD",
  "description": "cleaned description",
  "amount": number (always positive),
  "type": "sale" or "expense",
  "category": one of [Sales Revenue, Service Income, Staff Salary, Rent, Utilities, Supplies, Professional Fees, Bank Charges, Tax Payment, Other Income, Other Expense],
  "vatApplicable": true or false,
  "whtApplicable": true or false
}

Rules:
- Credits to account = "sale", Debits = "expense"
- Return ONLY the JSON array with no explanation or markdown.`;

  let userContent: any;

  if (isImage) {
    const mediaType = rawText.match(/\[IMAGE_BASE64:(.*?)\]/)?.[1] || 'image/jpeg';
    const base64 = rawText.split(']:')[1];
    userContent = [
      { type: 'text', text: 'Extract all bank transactions from this statement image.' },
      { type: 'image_url', image_url: { url: 'data:' + mediaType + ';base64,' + base64 } },
    ];
  } else {
    userContent = 'Extract all transactions from this bank statement:\n\n' + rawText.substring(0, 8000);
  }

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + apiKey,
    },
    body: JSON.stringify({
      model: isImage ? 'llama-3.2-90b-vision-preview' : 'llama-3.3-70b-versatile',
      max_tokens: 4000,
      temperature: 0.1,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any)?.error?.message || 'AI request failed: HTTP ' + res.status);
  }

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content || '[]';
  const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const parsed = JSON.parse(clean);

  return parsed.map((t: any, i: number) => ({
    id: 'import_' + Date.now() + '_' + i,
    date: t.date || new Date().toISOString().split('T')[0],
    description: t.description || 'Unknown transaction',
    amount: Math.abs(Number(t.amount) || 0),
    type: t.type === 'sale' ? 'sale' : 'expense',
    taxAmount: t.vatApplicable
      ? Math.round(Math.abs(Number(t.amount) || 0) * 0.075 * 100) / 100
      : t.whtApplicable
        ? Math.round(Math.abs(Number(t.amount) || 0) * 0.05 * 100) / 100
        : 0,
    vatApplicable: !!t.vatApplicable,
    whtApplicable: !!t.whtApplicable,
    category: t.category || 'Other Expense',
    selected: t.category !== 'Bank Charges' && t.category !== 'Tax Payment',
  }));
}

const fmt = (n: number) => '₦' + n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const BankImport: React.FC<BankImportProps> = ({ company, onNavigate }) => {
  const [step, setStep]               = useState<Step>('upload');
  const [file, setFile]               = useState<File | null>(null);
  const [password, setPassword]       = useState('');
  const [needsPassword, setNeedsPassword] = useState(false);
  const [transactions, setTransactions] = useState<ParsedTransaction[]>([]);
  const [error, setError]             = useState('');
  const [saving, setSaving]           = useState(false);
  const [savedCount, setSavedCount]   = useState(0);
  const [dragOver, setDragOver]       = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    setFile(f);
    setError('');
    const ext = f.name.split('.').pop()?.toLowerCase();
    setNeedsPassword(ext === 'pdf');
    setPassword('');
  };

  const processFile = async () => {
    if (!file) return;
    setStep('processing');
    setError('');
    try {
      const text = await extractTextFromFile(file, password || undefined);
      const parsed = await parseWithAI(text, company);
      if (parsed.length === 0) throw new Error('No transactions found. Try exporting as CSV from your bank app.');
      setTransactions(parsed);
      setStep('review');
    } catch (e: any) {
      if (e.message === 'PDF_PASSWORD_REQUIRED') {
        setError('This PDF is password protected. Enter the password below and try again.');
        setNeedsPassword(true);
      } else {
        setError(e.message || 'Failed to process file.');
      }
      setStep('upload');
    }
  };

  const toggleAll = (val: boolean) => setTransactions(prev => prev.map(t => ({ ...t, selected: val })));
  const toggleRow = (id: string) => setTransactions(prev => prev.map(t => t.id === id ? { ...t, selected: !t.selected } : t));
  const updateRow = (id: string, field: string, value: any) => setTransactions(prev => prev.map(t => {
    if (t.id !== id) return t;
    const updated = { ...t, [field]: value };
    if (field === 'amount' || field === 'vatApplicable' || field === 'whtApplicable') {
      updated.taxAmount = updated.vatApplicable
        ? Math.round(updated.amount * 0.075 * 100) / 100
        : updated.whtApplicable
          ? Math.round(updated.amount * 0.05 * 100) / 100
          : 0;
    }
    return updated;
  }));

  const importToLedger = async () => {
    const selected = transactions.filter(t => t.selected);
    if (selected.length === 0) { setError('Please select at least one transaction.'); return; }
    setSaving(true);
    let count = 0;

    // 1. Save transactions to ledger
    for (const t of selected) {
      try {
        const entry: LedgerEntry = {
          id: t.id,
          companyId: company.id,
          date: t.date,
          type: t.type,
          description: '[Bank Import] ' + t.description,
          amount: t.amount,
          taxAmount: t.taxAmount,
        };
        await db.addLedgerEntry(entry);
        count++;
      } catch (e) { console.error('Failed to save entry:', e); }
    }

    // 2. Save original bank statement to Evidence Vault
    if (file) {
      try {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const evidence: EvidenceFile = {
          id: 'stmt_' + Date.now(),
          companyId: company.id,
          name: file.name,
          mimeType: file.type || 'application/octet-stream',
          sizeBytes: file.size,
          data: base64,
          uploadDate: new Date().toISOString().split('T')[0],
          category: 'bank_statement',
          notes: count + ' transactions imported to ledger',
        };
        await db.addEvidence(evidence);
      } catch (e) { console.error('Failed to save statement to vault:', e); }
    }

    setSaving(false);
    setSavedCount(count);
    setStep('done');
  };

  const selected      = transactions.filter(t => t.selected);
  const totalIncome   = selected.filter(t => t.type === 'sale').reduce((s, t) => s + t.amount, 0);
  const totalExpenses = selected.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const totalVAT      = selected.filter(t => t.vatApplicable).reduce((s, t) => s + t.taxAmount, 0);
  const totalWHT      = selected.filter(t => t.whtApplicable).reduce((s, t) => s + t.taxAmount, 0);
  const netProfit     = totalIncome - totalExpenses;

  // ── UPLOAD ────────────────────────────────────────────────
  if (step === 'upload') return (
    <div className="space-y-6 max-w-2xl">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Bank Statement Import</h1>
        <p className="text-slate-500 text-sm mt-1">Upload your bank statement and AI will extract transactions, categorise them and calculate your tax obligations automatically.</p>
      </header>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>}

      <div
        onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => fileRef.current?.click()}
        className={'border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ' + (dragOver ? 'border-cac-green bg-green-50' : 'border-slate-200 hover:border-cac-green hover:bg-green-50/50')}
      >
        <div className="text-5xl mb-4">📄</div>
        <p className="font-bold text-slate-900">Drop your bank statement here</p>
        <p className="text-sm text-slate-500 mt-1">or click to browse</p>
        <div className="flex items-center justify-center gap-2 mt-4">
          {['PDF', 'Excel', 'CSV', 'Image'].map(f => (
            <span key={f} className="bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1 rounded-full">{f}</span>
          ))}
        </div>
        <input ref={fileRef} type="file" className="hidden" accept=".pdf,.xlsx,.xls,.csv,.txt,.png,.jpg,.jpeg" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
      </div>

      {file && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📎</span>
            <div>
              <p className="font-bold text-sm text-slate-900">{file.name}</p>
              <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
          </div>

          {needsPassword && (
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                PDF Password <span className="text-slate-400 font-normal normal-case">(if password protected)</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="e.g. your date of birth or account number"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-cac-green"
              />
              <p className="text-xs text-slate-400">💡 GTBank: date of birth (DDMMYYYY) · Access Bank: last 4 digits of phone · Zenith: date of birth</p>
            </div>
          )}

          <button onClick={processFile} className="w-full bg-cac-green text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-cac-dark transition-colors">
            Process with AI →
          </button>
        </div>
      )}

      <div className="bg-blue-50 rounded-2xl p-5 space-y-3">
        <p className="font-bold text-blue-900 text-sm">How it works</p>
        <div className="grid grid-cols-4 gap-3">
          {[
            { icon: '📤', label: 'Upload statement' },
            { icon: '🤖', label: 'AI extracts transactions' },
            { icon: '✅', label: 'Review & edit' },
            { icon: '📒', label: 'Saves to Ledger' },
          ].map((s, i) => (
            <div key={i} className="text-center">
              <div className="text-2xl mb-1">{s.icon}</div>
              <p className="text-xs text-blue-800 font-semibold">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ── PROCESSING ────────────────────────────────────────────
  if (step === 'processing') return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center space-y-5">
      <div className="w-20 h-20 bg-green-50 rounded-2xl flex items-center justify-center text-4xl animate-pulse">🤖</div>
      <div>
        <h2 className="text-xl font-extrabold text-slate-900">AI is reading your statement</h2>
        <p className="text-slate-500 text-sm mt-1">Extracting transactions and calculating Nigerian tax obligations...</p>
      </div>
      <div className="w-48 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-cac-green rounded-full animate-pulse w-3/4" />
      </div>
      <p className="text-xs text-slate-400">This usually takes 5–15 seconds</p>
    </div>
  );

  // ── REVIEW ────────────────────────────────────────────────
  if (step === 'review') return (
    <div className="space-y-5">
      <header className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Review Transactions</h1>
          <p className="text-slate-500 text-sm mt-1">{transactions.length} transactions found. Review, edit and select which to import.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setStep('upload')} className="text-sm text-slate-500 border border-slate-200 px-4 py-2 rounded-xl hover:bg-slate-50">← Re-upload</button>
          <button onClick={importToLedger} disabled={saving || selected.length === 0} className="bg-cac-green text-white px-5 py-2 rounded-xl font-bold text-sm hover:bg-cac-dark disabled:opacity-50 transition-colors">
            {saving ? 'Importing...' : 'Import ' + selected.length + ' to Ledger'}
          </button>
        </div>
      </header>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Income',   value: fmt(totalIncome),   color: 'text-green-700',  bg: 'bg-green-50'  },
          { label: 'Total Expenses', value: fmt(totalExpenses), color: 'text-red-700',    bg: 'bg-red-50'    },
          { label: 'VAT to Remit',   value: fmt(totalVAT),      color: 'text-amber-700',  bg: 'bg-amber-50'  },
          { label: 'WHT to Deduct',  value: fmt(totalWHT),      color: 'text-purple-700', bg: 'bg-purple-50' },
        ].map(s => (
          <div key={s.label} className={s.bg + ' rounded-2xl p-4'}>
            <p className="text-xs text-slate-500 font-semibold">{s.label}</p>
            <p className={'text-lg font-extrabold mt-1 ' + s.color}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className={'rounded-xl px-4 py-3 flex items-center justify-between ' + (netProfit >= 0 ? 'bg-green-50 border border-green-100' : 'bg-red-50 border border-red-100')}>
        <p className="font-bold text-slate-700 text-sm">Net Profit (Income − Expenses)</p>
        <p className={'font-extrabold text-lg ' + (netProfit >= 0 ? 'text-green-700' : 'text-red-700')}>{fmt(netProfit)}</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-50 flex items-center justify-between">
          <p className="font-bold text-sm text-slate-900">Transactions</p>
          <div className="flex gap-2 text-xs">
            <button onClick={() => toggleAll(true)}  className="text-cac-green font-bold hover:underline">Select all</button>
            <span className="text-slate-300">|</span>
            <button onClick={() => toggleAll(false)} className="text-slate-400 font-bold hover:underline">Deselect all</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left w-8">✓</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Description</th>
                <th className="px-4 py-3 text-left">Category</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-center">Type</th>
                <th className="px-4 py-3 text-right">Tax</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {transactions.map(t => (
                <tr key={t.id} className={'transition-colors ' + (t.selected ? 'bg-white' : 'bg-slate-50 opacity-50')}>
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={t.selected} onChange={() => toggleRow(t.id)} className="w-4 h-4 accent-cac-green cursor-pointer" />
                  </td>
                  <td className="px-4 py-3">
                    <input type="date" value={t.date} onChange={e => updateRow(t.id, 'date', e.target.value)} className="border-0 bg-transparent text-xs focus:outline-none focus:ring-1 focus:ring-cac-green rounded" />
                  </td>
                  <td className="px-4 py-3 max-w-[200px]">
                    <input value={t.description} onChange={e => updateRow(t.id, 'description', e.target.value)} className="w-full border-0 bg-transparent text-xs focus:outline-none focus:ring-1 focus:ring-cac-green rounded px-1 truncate" />
                  </td>
                  <td className="px-4 py-3">
                    <span className={'text-[10px] font-bold px-2 py-0.5 rounded-full ' + (categoryColors[t.category] || 'bg-gray-100 text-gray-700')}>
                      {t.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900 whitespace-nowrap">{fmt(t.amount)}</td>
                  <td className="px-4 py-3 text-center">
                    <select value={t.type} onChange={e => updateRow(t.id, 'type', e.target.value)} className={'text-[10px] font-bold px-2 py-0.5 rounded-full border-0 cursor-pointer ' + (t.type === 'sale' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800')}>
                      <option value="sale">Income</option>
                      <option value="expense">Expense</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-slate-500 whitespace-nowrap">{t.taxAmount > 0 ? fmt(t.taxAmount) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // ── DONE ──────────────────────────────────────────────────
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center space-y-5 max-w-md mx-auto">
      <div className="w-20 h-20 bg-green-50 border-2 border-green-200 rounded-2xl flex items-center justify-center text-4xl">✅</div>
      <div>
        <h2 className="text-xl font-extrabold text-slate-900">Import Complete!</h2>
        <p className="text-slate-500 text-sm mt-2">{savedCount} transactions added to your ledger. Your tax obligations have been updated automatically.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 w-full">
        <button onClick={() => { setStep('upload'); setFile(null); setTransactions([]); }} className="border border-slate-200 text-slate-700 px-4 py-3 rounded-xl font-bold text-sm hover:bg-slate-50">
          Import Another
        </button>
        <button onClick={() => onNavigate('ledger')} className="bg-cac-green text-white px-4 py-3 rounded-xl font-bold text-sm hover:bg-cac-dark">
          View Ledger →
        </button>
      </div>
    </div>
  );
};
