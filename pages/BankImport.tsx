import React, { useState, useRef, useEffect } from 'react';
import { Company, LedgerEntry } from '../types';
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

interface BankStatement {
  id: string;
  name: string;
  monthYear: string;      // "2026-02"
  uploadDate: string;
  notes: string;
  sizeBytes: number;
  storagePath?: string;
  transactionCount: number;
}

type Step = 'upload' | 'processing' | 'review' | 'done';
type Tab  = 'import' | 'statements';

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

// Extract month/year from a bank statement file name or let user pick
// Returns "YYYY-MM"
function detectMonthYear(filename: string): string {
  // Try to find patterns like Feb2026, February2026, 2026-02, 02-2026 in filename
  const months: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
    january: '01', february: '02', march: '03', april: '04', june: '06',
    july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
  };
  const lower = filename.toLowerCase();

  // Try YYYY-MM or MM-YYYY
  const isoMatch = lower.match(/(\d{4})[_\-](\d{2})/);
  if (isoMatch) return isoMatch[1] + '-' + isoMatch[2];
  const isoMatch2 = lower.match(/(\d{2})[_\-](\d{4})/);
  if (isoMatch2) return isoMatch2[2] + '-' + isoMatch2[1];

  // Try month name + year
  for (const [name, num] of Object.entries(months)) {
    const re = new RegExp(name + '[_\\-\\s]*(\\d{4})', 'i');
    const m = lower.match(re);
    if (m) return m[1] + '-' + num;
    const re2 = new RegExp('(\\d{4})[_\\-\\s]*' + name, 'i');
    const m2 = lower.match(re2);
    if (m2) return m2[1] + '-' + num;
  }

  // Default to current month
  return new Date().toISOString().slice(0, 7);
}

function monthYearLabel(my: string): string {
  const [y, m] = my.split('-');
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  return (months[parseInt(m) - 1] || m) + ' ' + y;
}

const MONTH_OPTIONS = (() => {
  const opts = [];
  const now = new Date();
  const startYear = now.getFullYear() - 2;
  const endYear   = now.getFullYear() + 1;
  for (let y = startYear; y <= endYear; y++) {
    for (let m = 1; m <= 12; m++) {
      const val = y + '-' + String(m).padStart(2, '0');
      opts.push({ value: val, label: monthYearLabel(val) });
    }
  }
  return opts;
})();

async function extractTextFromFile(file: File, password?: string): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase();

  if (ext === 'csv' || ext === 'txt') return await file.text();

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
        'pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url
      ).toString();
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer, ...(password ? { password } : {}) });
      const pdf = await loadingTask.promise;
      const lines: string[] = [];
      for (let i = 1; i <= Math.min(pdf.numPages, 20); i++) {
        const page = await pdf.getPage(i);
        const tc = await page.getTextContent();
        lines.push(tc.items.map((item: any) => item.str).join(' '));
      }
      const fullText = lines.join('\n');
      if (fullText.trim().length > 50) return fullText;
      throw new Error('No readable text found. Try exporting as CSV from your bank app.');
    } catch (err: any) {
      if (err?.name === 'PasswordException' || err?.message?.includes('password')) throw new Error('PDF_PASSWORD_REQUIRED');
      throw new Error('Could not read this PDF. Please export as CSV or Excel from your bank app.');
    }
  }

  if (file.type.startsWith('image/')) {
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve('[IMAGE_BASE64:' + file.type + ']:' + (reader.result as string).split(',')[1]);
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
- Collects VAT: ${company.collectsVat ? 'Yes' : 'No'}
- Pays Vendors (WHT): ${company.paysVendors ? 'Yes' : 'No'}
- Has Employees: ${company.hasEmployees ? 'Yes' : 'No'}

NIGERIAN TAX RULES (NTA 2025):
- VAT is 7.5% on taxable sales/services
- WHT: 5% goods, 10% services to vendors/contractors
- Bank charges, internal transfers, tax payments = NOT taxable
- Credits to account = "sale", Debits = 'expense"

Return ONLY a JSON array, no markdown, no explanation:
[{ "date" : "YYYY-MM-DD","description" : "string","amount':number,'type":"sale|expense",'category":"Sales Revenue|Service Income|Staff Salary|Rent|Utilities|Supplies|Professional Fees|Bank Charges|Tax Payment|Other Income|Other Expense','vatApplicable":bool,"whtApplicable":bool }]`;

  let userContent: any;
  if (isImage) {
    const mediaType = rawText.match(/\[IMAGE_BASE64:(.*?)\]/)?.[1] || 'image/jpeg';
    const base64 = rawText.split(']:')[1];
    userContent = [
      { type: 'text', text: 'Extract all bank transactions from this statement image.' },
      { type: 'image_url', image_url: { url: 'data:' + mediaType + ';base64,' + base64 } },
    ];
  } else {
    userContent = 'Extract all transactions:\n\n' + rawText.substring(0, 8000);
  }

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
    body: JSON.stringify({
      model: isImage ? 'llama-3.2-90b-vision-preview' : 'llama-3.3-70b-versatile',
      max_tokens: 4000,
      temperature: 0.1,
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userContent }],
    }),
  });

  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error((e as any)?.error?.message || 'AI request failed'); }
  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content || '[]';
  const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const parsed = JSON.parse(clean);

  return parsed.map((t: any, i: number) => ({
    id: 'import_' + Date.now() + '_' + i,
    date: t.date || new Date().toISOString().split('T')[0],
    description: t.description || 'Unknown',
    amount: Math.abs(Number(t.amount) || 0),
    type: t.type === 'sale' ? 'sale' : 'expense',
    taxAmount: t.vatApplicable
      ? Math.round(Math.abs(Number(t.amount)) * 0.075 * 100) / 100
      : t.whtApplicable ? Math.round(Math.abs(Number(t.amount)) * 0.05 * 100) / 100 : 0,
    vatApplicable: !!t.vatApplicable,
    whtApplicable: !!t.whtApplicable,
    category: t.category || 'Other Expense',
    selected: t.category !== 'Bank Charges' && t.category !== 'Tax Payment',
  }));
}

const fmt = (n: number) => '₦' + n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ─── Statements Tab ───────────────────────────────────────────────────────────
const StatementsTab: React.FC<{ company: Company; onNavigate: (v: AppView) => void }> = ({ company, onNavigate }) => {
  const [statements, setStatements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    db.getBankStatements(company.id)
      .then(setStatements)
      .catch(() => setStatements([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [company.id]);

  const handleDelete = async (stmt: any) => {
    if (!window.confirm(
      'Delete ' + monthYearLabel(stmt.monthYear) + ' statement?\n\nThis will permanently remove the statement AND all ' +
      (stmt.notes?.match(/\d+/)?.[0] || 'associated') + ' ledger entries imported from it. This cannot be undone.'
    )) return;

    setDeleting(stmt.id);
    try {
      // 1. Delete all ledger entries from this statement
      await db.deleteLedgerBySource(stmt.id);
      // 2. Delete file from storage + evidence_files row
      if (stmt.storagePath) await db.deleteEvidence(stmt.id, stmt.storagePath);
      setStatements(prev => prev.filter(s => s.id !== stmt.id));
    } catch (e: any) {
      alert('Delete failed: ' + (e?.message || 'Unknown error'));
    } finally {
      setDeleting(null);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center space-y-3">
        <div className="text-4xl animate-pulse"><span style={{display:"inline-flex",alignItems:"center",verticalAlign:"middle"}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg></span></div>
        <p className="text-slate-500 text-sm">Loading statements...</p>
      </div>
    </div>
  );

  if (statements.length === 0) return (
    <div className="text-center py-20 space-y-4">
      <div className="text-5xl"><span style={{display:"inline-flex",alignItems:"center",verticalAlign:"middle"}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg></span></div>
      <p className="font-bold text-slate-700">No bank statements imported yet</p>
      <p className="text-sm text-slate-400">Use the Import tab to upload your first statement</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 font-semibold">{statements.length} statement{statements.length !== 1 ? 's' : ''} · ordered chronologically</p>
        <button onClick={() => onNavigate('ledger')} className="text-xs text-cac-green font-bold hover:underline">View Ledger →</button>
      </div>

      {statements.map(stmt => {
        const txCount = stmt.notes?.match(/(\d+) transactions/)?.[1] || '?';
        return (
          <div key={stmt.id} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-center text-2xl shrink-0"><span style={{display:"inline-flex",alignItems:"center",verticalAlign:"middle"}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg></span></div>
                <div>
                  <p className="font-bold text-slate-900">{monthYearLabel(stmt.monthYear)}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{stmt.name}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">{txCount} transactions</span>
                    <span className="text-[10px] text-slate-400">Uploaded {stmt.uploadDate}</span>
                    <span className="text-[10px] text-slate-400">{stmt.sizeBytes ? (stmt.sizeBytes / 1024).toFixed(1) + ' KB' : ''}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleDelete(stmt)}
                disabled={deleting === stmt.id}
                className="shrink-0 text-xs font-bold text-red-400 hover:text-red-600 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-xl transition-colors disabled:opacity-50"
              >
                {deleting === stmt.id ? 'Deleting...' : '<span style={{display:"inline-flex",alignItems:"center",verticalAlign:"middle"}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg></span> Delete'}
              </button>
            </div>
          </div>
        );
      })}

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
        <strong><span style={{display:"inline-flex",alignItems:"center",verticalAlign:"middle"}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span> Note:</strong> Deleting a bank statement permanently removes it and all its imported transactions from your ledger. This action cannot be undone. Only delete if the statement was imported by mistake.
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export const BankImport: React.FC<BankImportProps> = ({ company, onNavigate }) => {
  const [tab, setTab]               = useState<Tab>('import');
  const [step, setStep]             = useState<Step>('upload');
  const [file, setFile]             = useState<File | null>(null);
  const [password, setPassword]     = useState('');
  const [needsPassword, setNeedsPassword] = useState(false);
  const [monthYear, setMonthYear]   = useState('');
  const [transactions, setTransactions] = useState<ParsedTransaction[]>([]);
  const [error, setError]           = useState('');
  const [saving, setSaving]         = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [vaultSaved, setVaultSaved] = useState(false);
  const [vaultError, setVaultError] = useState('');
  const [statementId, setStatementId] = useState('');
  const [dragOver, setDragOver]     = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    setFile(f);
    setError('');
    const ext = f.name.split('.').pop()?.toLowerCase();
    setNeedsPassword(ext === 'pdf');
    setPassword('');
    // Auto-detect month/year from filename
    const detected = detectMonthYear(f.name);
    setMonthYear(detected);
  };

  const processFile = async () => {
    if (!file || !monthYear) return;

    // Duplicate check
    const exists = await db.bankStatementExists(company.id, monthYear);
    if (exists) {
      setError(monthYearLabel(monthYear) + ' statement already imported. Delete it first from the Statements tab if you need to re-import.');
      return;
    }

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
        setError('This PDF is password protected. Enter the password and try again.');
        setNeedsPassword(true);
      } else {
        setError(e.message || 'Failed to process file.');
      }
      setStep('upload');
    }
  };

  const toggleAll = (val: boolean) => setTransactions(prev => prev.map(t => ({ ...t, selected: val })));
  const toggleRow = (id: string)    => setTransactions(prev => prev.map(t => t.id === id ? { ...t, selected: !t.selected } : t));
  const updateRow = (id: string, field: string, value: any) => setTransactions(prev => prev.map(t => {
    if (t.id !== id) return t;
    const u = { ...t, [field]: value };
    if (field === 'amount' || field === 'vatApplicable' || field === 'whtApplicable') {
      u.taxAmount = u.vatApplicable ? Math.round(u.amount * 0.075 * 100) / 100
        : u.whtApplicable ? Math.round(u.amount * 0.05 * 100) / 100 : 0;
    }
    return u;
  }));

  const importToLedger = async () => {
    const selected = transactions.filter(t => t.selected);
    if (selected.length === 0) { setError('Please select at least one transaction.'); return; }
    setSaving(true);
    setError('');

    // Use UUID so it matches evidence_files.id which is UUID type
    const stmtId = crypto.randomUUID();
    setStatementId(stmtId);
    let count = 0;

    // 1. Save ledger entries -- tag each with statementId for future deletion
    for (const t of selected) {
      try {
        const entry: LedgerEntry = {
          id: t.id,
          companyId: company.id,
          date: t.date,
          type: t.type,
          description: '[' + monthYearLabel(monthYear) + '] ' + t.description,
          amount: t.amount,
          taxAmount: t.taxAmount,
          sourceId: stmtId,
        };
        await db.addLedgerEntry(entry);
        count++;
      } catch (e) { console.error('Ledger entry failed:', e); }
    }

    // 2. Save statement file to Evidence Vault with monthYear tag
    if (file) {
      try {
        await db.addEvidenceFile(file, {
          id: stmtId,
          companyId: company.id,
          uploadDate: new Date().toISOString().split('T')[0],
          category: 'bank_statement',
          notes: count + ' transactions imported to ledger on ' + new Date().toLocaleDateString('en-NG'),
          monthYear,
        } as any);
        setVaultSaved(true);
      } catch (e: any) {
        console.error('Vault save failed:', e);
        setVaultError(e?.message || 'Unknown error');
      }
    }

    setSaving(false);
    setSavedCount(count);
    setStep('done');
  };

  const reset = () => {
    setStep('upload'); setFile(null); setTransactions([]);
    setError(''); setVaultSaved(false); setVaultError(''); setStatementId('');
  };

  const selected      = transactions.filter(t => t.selected);
  const totalIncome   = selected.filter(t => t.type === 'sale').reduce((s, t) => s + t.amount, 0);
  const totalExpenses = selected.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const totalVAT      = selected.filter(t => t.vatApplicable).reduce((s, t) => s + t.taxAmount, 0);
  const totalWHT      = selected.filter(t => t.whtApplicable).reduce((s, t) => s + t.taxAmount, 0);
  const netProfit     = totalIncome - totalExpenses;

  return (
    <div className="space-y-5">
      {/* Header */}
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Bank Statement Import</h1>
        <p className="text-slate-500 text-sm mt-1">Upload monthly statements -- AI extracts transactions and calculates tax obligations automatically.</p>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
          {([['import', '<span style={{display:"inline-flex",alignItems:"center",verticalAlign:"middle"}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></span> Import Statement'], ['statements', '<span style={{display:"inline-flex",alignItems:"center",verticalAlign:"middle"}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg></span> My Statements']] as [Tab, string][]).map(([t, label]) => (
          <button key={t} onClick={() => { setTab(t); if (t === 'import') reset(); }}
            className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${tab === t ? 'bg-white text-cac-green shadow' : 'text-slate-500 hover:text-slate-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── STATEMENTS TAB ── */}
      {tab === 'statements' && <StatementsTab company={company} onNavigate={onNavigate} />}

      {/* ── IMPORT TAB ── */}
      {tab === 'import' && (
        <>
          {/* UPLOAD STEP */}
          {step === 'upload' && (
            <div className="space-y-5 max-w-2xl">
              {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>}

              <div
                onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${dragOver ? 'border-cac-green bg-green-50' : 'border-slate-200 hover:border-cac-green hover:bg-green-50/50'}`}
              >
                <div className="text-5xl mb-4"><span style={{display:"inline-flex",alignItems:"center",verticalAlign:"middle"}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg></span></div>
                <p className="font-bold text-slate-900">Drop your bank statement here</p>
                <p className="text-sm text-slate-500 mt-1">or click to browse</p>
                <div className="flex items-center justify-center gap-2 mt-4">
                  {['PDF', 'Excel', 'CSV', 'Image'].map(f => (
                    <span key={f} className="bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1 rounded-full">{f}</span>
                  ))}
                </div>
                <input ref={fileRef} type="file" className="hidden"
                  accept=".pdf,.xlsx,.xls,.csv,.txt,.png,.jpg,.jpeg"
                  onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
              </div>

              {file && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl"><span style={{display:"inline-flex",alignItems:"center",verticalAlign:"middle"}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg></span></span>
                    <div>
                      <p className="font-bold text-sm text-slate-900">{file.name}</p>
                      <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>

                  {/* Month/Year selector - always shown, pre-filled from filename */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Statement Month</label>
                    <select
                      value={monthYear}
                      onChange={e => { setMonthYear(e.target.value); setError(''); }}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-cac-green bg-white"
                    >
                      {MONTH_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <p className="text-xs text-slate-400">Auto-detected from filename. Change if incorrect.</p>
                  </div>

                  {needsPassword && (
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                        PDF Password <span className="font-normal normal-case text-slate-400">(if password protected)</span>
                      </label>
                      <input
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="e.g. date of birth or account number"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-cac-green"
                      />
                      <p className="text-xs text-slate-400"><span style={{display:"inline-flex",alignItems:"center",verticalAlign:"middle"}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="9" y1="18" x2="15" y2="18"/><line x1="10" y1="22" x2="14" y2="22"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg></span> GTBank: date of birth (DDMMYYYY) · Access Bank: last 4 digits of phone · Zenith: date of birth</p>
                    </div>
                  )}

                  <button onClick={processFile} disabled={!monthYear}
                    className="w-full bg-cac-green text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-cac-dark transition-colors disabled:opacity-50">
                    Process with AI →
                  </button>
                </div>
              )}

              <div className="bg-blue-50 rounded-2xl p-5 space-y-3">
                <p className="font-bold text-blue-900 text-sm">How it works</p>
                <div className="grid grid-cols-4 gap-3">
                  {[[(<span style={{display:"inline-flex",alignItems:"center",verticalAlign:"middle"}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></span>),'Upload statement'],[(<span style={{display:"inline-flex",alignItems:"center",verticalAlign:"middle"}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg></span>),'AI extracts transactions'],[(<span style={{display:"inline-flex",alignItems:"center",verticalAlign:"middle"}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></span>),'Review & edit'],[(<span style={{display:"inline-flex",alignItems:"center",verticalAlign:"middle"}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg></span>),'Saves to Ledger']].map(([icon, label], i) => (
                    <div key={i} className="text-center">
                      <div className="text-2xl mb-1">{icon}</div>
                      <p className="text-xs text-blue-800 font-semibold">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* PROCESSING STEP */}
          {step === 'processing' && (
            <div className="min-h-[50vh] flex flex-col items-center justify-center text-center space-y-5">
              <div className="w-20 h-20 bg-green-50 rounded-2xl flex items-center justify-center text-4xl animate-pulse"><span style={{display:"inline-flex",alignItems:"center",verticalAlign:"middle"}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg></span></div>
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">AI is reading your statement</h2>
                <p className="text-slate-500 text-sm mt-1">Extracting transactions and calculating Nigerian tax obligations...</p>
              </div>
              <div className="w-48 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-cac-green rounded-full animate-pulse w-3/4" />
              </div>
              <p className="text-xs text-slate-400">This usually takes 5-15 seconds</p>
            </div>
          )}

          {/* REVIEW STEP */}
          {step === 'review' && (
            <div className="space-y-5">
              <header className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <h1 className="text-xl font-bold text-slate-900">Review -- {monthYearLabel(monthYear)}</h1>
                  <p className="text-slate-500 text-sm mt-1">{transactions.length} transactions found. Select which to import.</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setStep('upload')} className="text-sm text-slate-500 border border-slate-200 px-4 py-2 rounded-xl hover:bg-slate-50">← Re-upload</button>
                  <button onClick={importToLedger} disabled={saving || selected.length === 0}
                    className="bg-cac-green text-white px-5 py-2 rounded-xl font-bold text-sm hover:bg-cac-dark disabled:opacity-50">
                    {saving ? 'Importing...' : 'Import ' + selected.length + ' to Ledger'}
                  </button>
                </div>
              </header>

              {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Total Income",   value: fmt(totalIncome),   color: 'text-green-700',  bg: 'bg-green-50'  },
                  { label: "Total Expenses", value: fmt(totalExpenses), color: 'text-red-700',    bg: 'bg-red-50'    },
                  { label: "VAT to Remit",   value: fmt(totalVAT),      color: 'text-amber-700',  bg: 'bg-amber-50'  },
                  { label: "WHT to Deduct",  value: fmt(totalWHT),      color: 'text-purple-700', bg: 'bg-purple-50' },
                ].map(s => (
                  <div key={s.label} className={s.bg + ' rounded-2xl p-4'}>
                    <p className="text-xs text-slate-500 font-semibold">{s.label}</p>
                    <p className={`text-lg font-extrabold mt-1 ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>

              <div className={`rounded-xl px-4 py-3 flex items-center justify-between ${netProfit >= 0 ? 'bg-green-50 border border-green-100' : 'bg-red-50 border border-red-100'}`}>
                <p className="font-bold text-slate-700 text-sm">Net Profit</p>
                <p className={`font-extrabold text-lg ${netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>{fmt(netProfit)}</p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-50 flex items-center justify-between">
                  <p className="font-bold text-sm text-slate-900">Transactions</p>
                  <div className="flex gap-2 text-xs">
                    <button onClick={() => toggleAll(true)} className="text-cac-green font-bold hover:underline">Select all</button>
                    <span className="text-slate-300">|</span>
                    <button onClick={() => toggleAll(false)} className="text-slate-400 font-bold hover:underline">Deselect all</button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-xs text-slate-500 font-bold uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3 text-left w-8"><span style={{display:"inline-flex",alignItems:"center",verticalAlign:"middle"}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span></th>
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
                        <tr key={t.id} className={`transition-colors ${t.selected ? 'bg-white' : 'bg-slate-50 opacity-50'}`}>
                          <td className="px-4 py-3"><input type="checkbox" checked={t.selected} onChange={() => toggleRow(t.id)} className="w-4 h-4 accent-cac-green cursor-pointer" /></td>
                          <td className="px-4 py-3"><input type="date" value={t.date} onChange={e => updateRow(t.id, "date", e.target.value)} className="border-0 bg-transparent text-xs focus:outline-none focus:ring-1 focus:ring-cac-green rounded" /></td>
                          <td className="px-4 py-3 max-w-[200px]"><input value={t.description} onChange={e => updateRow(t.id, 'description', e.target.value)} className="w-full border-0 bg-transparent text-xs focus:outline-none focus:ring-1 focus:ring-cac-green rounded px-1 truncate" /></td>
                            <td className="px-4 py-3"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${categoryColors[t.category] || 'bg-gray-100 text-gray-700'}`}>{t.category}</span></td>
                          <td className="px-4 py-3 text-right font-bold text-slate-900 whitespace-nowrap">{fmt(t.amount)}</td>
                          <td className="px-4 py-3 text-center">
                            <select value={t.type} onChange={e => updateRow(t.id, 'type', e.target.value)} className={`text-[10px] font-bold px-2 py-0.5 rounded-full border-0 cursor-pointer ${t.type === 'sale' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              <option value="sale">Income</option>
                              <option value="expense">Expense</option>
                            </select>
                          </td>
                          <td className="px-4 py-3 text-right text-xs text-slate-500 whitespace-nowrap">{t.taxAmount > 0 ? fmt(t.taxAmount) : '--'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* DONE STEP */}
          {step === 'done' && (
            <div className="min-h-[50vh] flex flex-col items-center justify-center text-center space-y-5 max-w-md mx-auto">
              <div className="w-20 h-20 bg-green-50 border-2 border-green-200 rounded-2xl flex items-center justify-center text-4xl"><span style={{display:"inline-flex",alignItems:"center",verticalAlign:"middle"}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></span></div>
              <div className="space-y-2">
                <h2 className="text-xl font-extrabold text-slate-900">Import Complete!</h2>
                <p className="text-slate-500 text-sm">{savedCount} transactions from {monthYearLabel(monthYear)} added to your ledger.</p>
                {vaultSaved && <p className="text-xs text-cac-green font-bold"><span style={{display:"inline-flex",alignItems:"center",verticalAlign:"middle"}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></span> Statement saved to Evidence Vault</p>}
                {vaultError && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-left">
                    <p className="text-xs font-bold text-red-700"><span style={{display:"inline-flex",alignItems:"center",verticalAlign:"middle"}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span> Could not save to Evidence Vault:</p>
                    <p className="text-xs text-red-600 mt-0.5">{vaultError}</p>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 w-full">
                <button onClick={() => { reset(); setTab('statements'); }} className="border border-slate-200 text-slate-700 px-4 py-3 rounded-xl font-bold text-sm hover:bg-slate-50">
                  View Statements
                </button>
                <button onClick={() => onNavigate('ledger')} className="bg-cac-green text-white px-4 py-3 rounded-xl font-bold text-sm hover:bg-cac-dark">
                  View Ledger →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
