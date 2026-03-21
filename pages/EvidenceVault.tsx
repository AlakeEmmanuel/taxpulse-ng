import React, { useState, useRef, useEffect } from 'react';
import { Company, EvidenceFile, EvidenceCategory, TaxObligation } from '../types';
import { Card, Button } from '../components/Shared';
import * as db from '../services/db';

const CATEGORY_LABELS: Record<EvidenceCategory, { label: string; icon: string; color: string }> = {
  receipt:        { label: "Receipt",        icon: (<span style={{display:"inline-flex",alignItems:"center",verticalAlign:"middle"}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="16" x2="12" y2="16"/></svg></span>), color: 'bg-green-50 text-green-700 border-green-200' },
  invoice:        { label: "Invoice",         icon: (<span style={{display:"inline-flex",alignItems:"center",verticalAlign:"middle"}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg></span>), color: 'bg-blue-50 text-blue-700 border-blue-200' },
  payment_proof:  { label: "Payment Proof",   icon: (<span style={{display:"inline-flex",alignItems:"center",verticalAlign:"middle"}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></span>), color: 'bg-purple-50 text-purple-700 border-purple-200' },
  bank_statement: { label: "Bank Statement",  icon: (<span style={{display:"inline-flex",alignItems:"center",verticalAlign:"middle"}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg></span>), color: 'bg-amber-50 text-amber-700 border-amber-200' },
  other:          { label: "Other",           icon: (<span style={{display:"inline-flex",alignItems:"center",verticalAlign:"middle"}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg></span>), color: 'bg-slate-50 text-slate-700 border-slate-200' },
};

const fmtSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

// ─── Upload Modal ─────────────────────────────────────────────────────────────
const UploadModal: React.FC<{
  company: Company;
  obligations: TaxObligation[];
  onClose: () => void;
  onUploaded: () => void;
}> = ({ company, obligations, onClose, onUploaded }) => {
  const [file, setFile]               = useState<File | null>(null);
  const [category, setCategory]       = useState<EvidenceCategory>('receipt');
  const [obligationId, setObligationId] = useState('');
  const [notes, setNotes]             = useState('');
  const [uploading, setUploading]     = useState(false);
  const [done, setDone]               = useState(false);
  const [error, setError]             = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => setFile(f);

  // FIXED: async function -- previously used await inside non-async reader.onload callback
  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      await db.addEvidenceFile(file, {
        id: Date.now().toString(),
        companyId: company.id,
        obligationId: obligationId || undefined,
        uploadDate: new Date().toISOString().split('T')[0],
        category,
        notes: notes || undefined,
      });
      setDone(true);
      setTimeout(() => { onUploaded(); onClose(); }, 1200);
    } catch (e: any) {
      setError(e?.message || 'Upload failed. Check your connection and try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="font-bold text-slate-900">Upload Evidence</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl"><span style={{display:"inline-flex",alignItems:"center",verticalAlign:"middle"}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></span></button>
        </div>
        <div className="p-5 space-y-4">
          {done ? (
            <div className="text-center py-8 space-y-3">
              <p className="text-4xl"><span style={{display:"inline-flex",alignItems:"center",verticalAlign:"middle"}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></span></p>
              <p className="font-bold text-cac-green">File uploaded to vault!</p>
            </div>
          ) : (
            <>
              {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>}

              {/* Drop zone */}
              <div
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
                onDragOver={e => e.preventDefault()}
                onClick={() => inputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${file ? 'border-cac-green bg-green-50' : 'border-slate-200 hover:border-cac-green hover:bg-slate-50'}`}
              >
                <input
                  ref={inputRef} type="file" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                  accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.csv,.xlsx,.xls,.doc,.docx"
                />
                {file ? (
                  <div>
                    <p className="text-2xl mb-1"><span style={{display:"inline-flex",alignItems:"center",verticalAlign:"middle"}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg></span></p>
                    <p className="font-bold text-cac-green text-sm">{file.name}</p>
                    <p className="text-xs text-slate-400">{fmtSize(file.size)}</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-3xl mb-2"><span style={{display:"inline-flex",alignItems:"center",verticalAlign:"middle"}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></span></p>
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
              {obligations.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Link to Obligation (optional)</label>
                  <select
                    value={obligationId}
                    onChange={e => setObligationId(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cac-green bg-white"
                  >
                    <option value="">-- Not linked --</option>
                    {obligations.map(o => (
                      <option key={o.id} value={o.id}>{o.type} -- {o.period}</option>
                    ))}
                  </select>
                </div>
              )}

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
                  {uploading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Uploading...
                    </span>
                  ) : 'Upload to Vault'}
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
const FileCard: React.FC<{
  file: EvidenceFile & { storagePath?: string };
  obligations: TaxObligation[];
  onDelete: (id: string, storagePath: string) => void;
}> = ({ file, obligations, onDelete }) => {
  const { label, icon, color } = CATEGORY_LABELS[file.category] || CATEGORY_LABELS.other;
  const linkedOb = obligations.find(o => o.id === file.obligationId);
  const [downloading, setDownloading] = useState(false);

  // FIXED: fetch from Supabase Storage -- file.data is always '' in DB records
  const handleDownload = async () => {
    setDownloading(true);
    try {
      const base64 = await db.downloadEvidence(file as any);
      const byteArray = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      const blob = new Blob([byteArray], { type: file.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Could not download file. Please try again.');
    } finally {
      setDownloading(false);
    }
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
            <p className="text-[10px] text-cac-green font-semibold mt-1"><span style={{display:"inline-flex",alignItems:"center",verticalAlign:"middle"}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></span> {linkedOb.type} -- {linkedOb.period}</p>
          )}
          {file.notes && (
            <p className="text-xs text-slate-500 mt-1 italic">{file.notes}</p>
          )}
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex-1 text-xs font-bold text-cac-green bg-green-50 hover:bg-green-100 py-1.5 rounded-lg transition-colors disabled:opacity-50"
        >
          {downloading ? 'Downloading...' : '⬇️ Download'}
        </button>
        <button
          onClick={() => onDelete(file.id, (file as any).storagePath || '')}
          className="text-xs font-bold text-red-400 hover:text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"
        >
          <span style={{display:"inline-flex",alignItems:"center",verticalAlign:"middle"}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg></span>
        </button>
      </div>
    </div>
  );
};

// ─── Evidence Vault Page ──────────────────────────────────────────────────────
interface EvidenceVaultProps { company: Company; }

export const EvidenceVault: React.FC<EvidenceVaultProps> = ({ company }) => {
  const [files, setFiles]         = useState<EvidenceFile[]>([]);
  const [obligations, setObligations] = useState<TaxObligation[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [filterCat, setFilterCat] = useState<EvidenceCategory | 'all'>('all');
  const [search, setSearch]       = useState('');
  const [loading, setLoading]     = useState(true);

  const refresh = () => {
    db.getEvidence(company.id).then(setFiles).catch(() => setFiles([]));
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([
      db.getEvidence(company.id),
      db.getObligations(company.id),
    ]).then(([ev, ob]) => {
      setFiles(ev);
      setObligations(ob as TaxObligation[]);
    }).catch(e => console.error('Vault load error:', e))
      .finally(() => setLoading(false));
  }, [company.id]);

  // FIXED: pass correct storagePath to deleteEvidence
  const handleDelete = async (id: string, storagePath: string) => {
    if (!storagePath) { console.error('No storagePath for file', id); return; }
    if (!window.confirm('Delete this document? This cannot be undone.')) return;
    try {
      await db.deleteEvidence(id, storagePath);
      setFiles(prev => prev.filter(f => f.id !== id));
    } catch (e) { console.error('Delete failed:', e); alert('Could not delete file. Please try again.'); }
  };

  const filtered = files.filter(f => {
    const matchCat = filterCat === 'all' || f.category === filterCat;
    const matchSearch = !search || f.name.toLowerCase().includes(search.toLowerCase()) || f.notes?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const byCategory = (cat: EvidenceCategory) => files.filter(f => f.category === cat).length;

  if (loading) return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="text-4xl animate-pulse"><span style={{display:"inline-flex",alignItems:"center",verticalAlign:"middle"}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></span></div>
        <p className="text-slate-500 text-sm">Loading vault...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
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

      {/* Category stats / filter */}
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

      {/* NTA 2025 retention notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
        <span className="text-xl shrink-0"><span style={{display:"inline-flex",alignItems:"center",verticalAlign:"middle"}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="9" y1="18" x2="15" y2="18"/><line x1="10" y1="22" x2="14" y2="22"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg></span></span>
        <div className="text-xs text-amber-800 space-y-1">
          <p className="font-bold">NTA 2025 -- Document Retention Requirements</p>
          <p>The Nigeria Tax Administration Act 2025 requires businesses to keep records for a minimum of <strong>6 years</strong>. NRS (formerly FIRS) can request documents during audit. Failure to produce records is a criminal offence under Section 83 of the NTAA 2025.</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><span style={{display:"inline-flex",alignItems:"center",verticalAlign:"middle"}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span></span>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by filename or notes..."
          className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cac-green bg-white"
        />
      </div>

      {/* File grid */}
      {filtered.length === 0 ? (
        <Card className="text-center py-16">
          <p className="text-5xl mb-4"><span style={{display:"inline-flex",alignItems:"center",verticalAlign:"middle"}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></span></p>
          <p className="font-bold text-slate-700 text-lg mb-1">
            {files.length === 0 ? 'Your vault is empty' : 'No files match your filter'}
          </p>
          <p className="text-sm text-slate-400 mb-6">
            {files.length === 0
              ? 'Upload receipts, invoices, and payment proofs to keep audit-ready.'
              : 'Try changing your category filter or search term.'}
          </p>
          {files.length === 0 && <Button onClick={() => setShowUpload(true)}>Upload First Document</Button>}
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
                onDelete={handleDelete}
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
