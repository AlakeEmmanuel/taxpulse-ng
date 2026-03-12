import React, { useState, useRef, useEffect } from 'react';
import { Company, EvidenceFile, EvidenceCategory, TaxObligation } from '../types';
import { Card, Button } from '../components/Shared';
import * as db from '../services/db';

const CATEGORY_LABELS: Record<EvidenceCategory, { label: string; icon: string; color: string }> = {
  receipt:       { label: 'Receipt',        icon: '🧾', color: 'bg-green-50 text-green-700 border-green-200' },
  invoice:       { label: 'Invoice',         icon: '📄', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  payment_proof: { label: 'Payment Proof',   icon: '✅', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  bank_statement:{ label: 'Bank Statement',  icon: '🏦', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  other:         { label: 'Other',           icon: '📎', color: 'bg-slate-50 text-slate-700 border-slate-200' },
};

const fmtSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// ─── Upload Modal ─────────────────────────────────────────────────────────────
const UploadModal: React.FC<{
  company: Company;
  obligations: TaxObligation[];
  onClose: () => void;
  onUploaded: () => void;
}> = ({ company, obligations, onClose, onUploaded }) => {
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState<EvidenceCategory>('receipt');
  const [obligationId, setObligationId] = useState('');
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
  };

  const handleUpload = () => {
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = (ev.target?.result as string).split(',')[1];
      const evidence: EvidenceFile = {
        id: Date.now().toString(),
        companyId: company.id,
        obligationId: obligationId || undefined,
        name: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        data: base64,
        uploadDate: new Date().toISOString().split('T')[0],
        category,
        notes: notes || undefined,
      };
      await db.addEvidence(evidence);
      setUploading(false);
      setDone(true);
      setTimeout(() => { onUploaded(); onClose(); }, 1000);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="font-bold text-slate-900">Upload Evidence</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
        </div>
        <div className="p-5 space-y-4">
          {done ? (
            <div className="text-center py-8">
              <p className="text-4xl mb-3">✅</p>
              <p className="font-bold text-cac-green">File uploaded to vault!</p>
            </div>
          ) : (
            <>
              {/* Drop zone */}
              <div
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => inputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${file ? 'border-cac-green bg-green-50' : 'border-slate-200 hover:border-cac-green hover:bg-slate-50'}`}
              >
                <input ref={inputRef} type="file" className="hidden" onChange={handleFile}
                  accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.csv,.xlsx,.xls,.doc,.docx" />
                {file ? (
                  <div>
                    <p className="text-2xl mb-1">📎</p>
                    <p className="font-bold text-cac-green text-sm">{file.name}</p>
                    <p className="text-xs text-slate-400">{fmtSize(file.size)}</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-3xl mb-2">☁️</p>
                    <p className="font-bold text-slate-700 text-sm">Drop file here or click to browse</p>
                    <p className="text-xs text-slate-400 mt-1">PDF, JPG, PNG, Excel, Word supported</p>
                  </div>
                )}
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Document Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(CATEGORY_LABELS) as EvidenceCategory[]).map(cat => {
                    const { label, icon, color } = CATEGORY_LABELS[cat];
                    return (
                      <button
                        key={cat}
                        onClick={() => setCategory(cat)}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-xs font-semibold transition-all ${category === cat ? color + ' ring-2 ring-cac-green' : 'border-slate-100 hover:bg-slate-50 text-slate-600'}`}
                      >
                        <span>{icon}</span>
                        <span>{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Link to obligation */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Link to Obligation (optional)</label>
                <select
                  value={obligationId}
                  onChange={e => setObligationId(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cac-green bg-white"
                >
                  <option value="">— Not linked —</option>
                  {obligations.map(o => (
                    <option key={o.id} value={o.id}>{o.type} — {o.period}</option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="e.g., FIRS receipt for Feb 2026 PAYE payment"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cac-green resize-none"
                  rows={2}
                />
              </div>

              <div className="flex gap-3 pt-1">
                <Button variant="ghost" onClick={onClose} className="flex-1">Cancel</Button>
                <Button onClick={handleUpload} disabled={!file || uploading} className="flex-1">
                  {uploading ? 'Uploading...' : 'Upload to Vault'}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── File Card ────────────────────────────────────────────────────────────────
const FileCard: React.FC<{ file: EvidenceFile; obligations: TaxObligation[]; onDelete: () => void }> = ({ file, obligations, onDelete }) => {
  const { label, icon, color } = CATEGORY_LABELS[file.category];
  const linkedOb = obligations.find(o => o.id === file.obligationId);

  const handleView = () => {
    const url = `data:${file.mimeType};base64,${file.data}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
  };

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 border ${color}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-900 text-sm truncate">{file.name}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${color}`}>{label}</span>
            <span className="text-[10px] text-slate-400">{fmtSize(file.sizeBytes)}</span>
            <span className="text-[10px] text-slate-400">{file.uploadDate}</span>
          </div>
          {linkedOb && (
            <p className="text-[10px] text-cac-green font-semibold mt-1">🔗 {linkedOb.type} — {linkedOb.period}</p>
          )}
          {file.notes && (
            <p className="text-xs text-slate-500 mt-1 italic">{file.notes}</p>
          )}
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={handleView}
          className="flex-1 text-xs font-bold text-cac-green bg-green-50 hover:bg-green-100 py-1.5 rounded-lg transition-colors"
        >
          ⬇️ Download
        </button>
        <button
          onClick={onDelete}
          className="text-xs font-bold text-red-400 hover:text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"
        >
          🗑️
        </button>
      </div>
    </div>
  );
};

// ─── Evidence Vault Page ──────────────────────────────────────────────────────
interface EvidenceVaultProps { company: Company; }

export const EvidenceVault: React.FC<EvidenceVaultProps> = ({ company }) => {
  const [files, setFiles] = useState<EvidenceFile[]>([]);
  const [obligations, setObligations] = useState<any[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [filterCat, setFilterCat] = useState<EvidenceCategory | 'all'>('all');
  const [search, setSearch] = useState('');
  const [loadingFiles, setLoadingFiles] = useState(true);

  const refresh = () => {
    db.getEvidence(company.id).then(setFiles).catch(() => setFiles([]));
  };

  useEffect(() => {
    setLoadingFiles(true);
    Promise.all([
      db.getEvidence(company.id),
      db.getObligations(company.id),
    ]).then(([ev, ob]) => {
      setFiles(ev);
      setObligations(ob);
    }).catch(() => {}).finally(() => setLoadingFiles(false));
  }, [company.id]);

  const handleDelete = async (id: string, storagePath?: string) => {
    try {
      if (storagePath) await db.deleteEvidence(id, storagePath);
      else await db.deleteEvidence(id, id);
      refresh();
    } catch (e) { console.error('Delete failed:', e); }
  };

  const filtered = files.filter(f => {
    const matchCat = filterCat === 'all' || f.category === filterCat;
    const matchSearch = !search || f.name.toLowerCase().includes(search.toLowerCase()) || f.notes?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const byCategory = (cat: EvidenceCategory) => files.filter(f => f.category === cat).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-slate-900">Evidence Vault</h1>
            <span className="bg-cac-green text-white text-xs font-black px-2.5 py-1 rounded-full">NTA 2025</span>
          </div>
          <p className="text-slate-500 text-sm">Store receipts, invoices, and payment proofs. Essential for NRS audits.</p>
        </div>
        <Button onClick={() => setShowUpload(true)} className="shrink-0">+ Upload</Button>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {(Object.keys(CATEGORY_LABELS) as EvidenceCategory[]).map(cat => {
          const { label, icon, color } = CATEGORY_LABELS[cat];
          const count = byCategory(cat);
          return (
            <button
              key={cat}
              onClick={() => setFilterCat(filterCat === cat ? 'all' : cat)}
              className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-semibold transition-all ${filterCat === cat ? color + ' ring-2 ring-cac-green' : 'bg-white border-slate-100 text-slate-600 hover:border-slate-200'}`}
            >
              <span className="text-lg">{icon}</span>
              <div className="text-left">
                <p className="text-xs font-bold">{count}</p>
                <p className="text-[10px] text-slate-500">{label}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* NTA 2025 audit tip */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
        <span className="text-xl shrink-0">💡</span>
        <div className="text-xs text-amber-800 space-y-1">
          <p className="font-bold">NTA 2025 — Document Retention Requirements</p>
          <p>The Nigeria Tax Administration Act 2025 requires businesses to keep records for a minimum of <strong>6 years</strong>. NRS (formerly FIRS) can request documents during audit. Failure to produce records is a criminal offence under Section 83 of the NTAA 2025.</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by filename or notes..."
          className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cac-green bg-white"
        />
      </div>

      {/* File Grid */}
      {filtered.length === 0 ? (
        <Card className="text-center py-16">
          <p className="text-5xl mb-4">🗄️</p>
          <p className="font-bold text-slate-700 text-lg mb-1">
            {files.length === 0 ? 'Your vault is empty' : 'No files match your filter'}
          </p>
          <p className="text-sm text-slate-400 mb-6">
            {files.length === 0
              ? 'Upload receipts, invoices, and payment proofs to keep audit-ready.'
              : 'Try changing your category filter or search term.'}
          </p>
          {files.length === 0 && (
            <Button onClick={() => setShowUpload(true)}>Upload First Document</Button>
          )}
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500 font-semibold">{filtered.length} document{filtered.length !== 1 ? 's' : ''}</p>
            {filterCat !== 'all' && (
              <button onClick={() => setFilterCat('all')} className="text-xs text-cac-green font-bold hover:underline">Clear filter</button>
            )}
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(f => (
              <FileCard
                key={f.id}
                file={f}
                obligations={obligations}
                onDelete={() => handleDelete(f.id)}
              />
            ))}
          </div>
        </>
      )}

      {showUpload && (
        <UploadModal
          company={company}
          obligations={obligations}
          onClose={() => setShowUpload(false)}
          onUploaded={refresh}
        />
      )}
    </div>
  );
};
