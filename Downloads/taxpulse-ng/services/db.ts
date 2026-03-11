/**
 * TaxPulse NG — Supabase Database Layer
 * Replaces mockDb.ts with real persistent storage.
 * Drop this file at: services/db.ts
 */

import { supabase } from './supabaseClient';
import { Company, TaxObligation, LedgerEntry, EvidenceFile } from '../types';

// ─── Type helpers ─────────────────────────────────────────────────────────────
// Supabase uses snake_case columns; these helpers convert to/from our camelCase types.

const toCompany = (r: any): Company => ({
  id:              r.id,
  name:            r.name,
  entityType:      r.entity_type,
  industry:        r.industry,
  state:           r.state,
  address:         r.address,
  cacStatus:       r.cac_status,
  rcNumber:        r.rc_number,
  tin:             r.tin,
  vatNumber:       r.vat_number,
  yearEnd:         r.year_end,
  hasEmployees:    r.has_employees,
  employeeCount:   r.employee_count,
  paysVendors:     r.pays_vendors,
  collectsVat:     r.collects_vat,
  complianceScore: r.compliance_score,
});

const fromCompany = (c: Company) => ({
  name:             c.name,
  entity_type:      c.entityType,
  industry:         c.industry,
  state:            c.state,
  address:          c.address,
  cac_status:       c.cacStatus,
  rc_number:        c.rcNumber,
  tin:              c.tin,
  vat_number:       c.vatNumber,
  year_end:         c.yearEnd,
  has_employees:    c.hasEmployees,
  employee_count:   c.employeeCount,
  pays_vendors:     c.paysVendors,
  collects_vat:     c.collectsVat,
  compliance_score: c.complianceScore,
  user_id: (window as any).__taxpulse_uid || undefined,
});

const toObligation = (r: any): TaxObligation => ({
  id:               r.id,
  companyId:        r.company_id,
  type:             r.type as any,
  period:           r.period,
  dueDate:          r.due_date,
  status:           r.status as any,
  estimatedAmount:  r.estimated_amount,
  actualAmount:     r.actual_amount,
  paymentDate:      r.payment_date,
  proofUrl:         r.proof_url,
  checklist:        r.checklist || [],
});

const fromObligation = (o: TaxObligation) => ({
  company_id:        o.companyId,
  type:              o.type,
  period:            o.period,
  due_date:          o.dueDate,
  status:            o.status,
  estimated_amount:  o.estimatedAmount,
  actual_amount:     o.actualAmount,
  payment_date:      o.paymentDate,
  proof_url:         o.proofUrl,
  checklist:         o.checklist,
  user_id: (window as any).__taxpulse_uid || undefined,
});

const toLedger = (r: any): LedgerEntry => ({
  id:           r.id,
  companyId:    r.company_id,
  date:         r.date,
  type:         r.type,
  description:  r.description,
  amount:       r.amount,
  taxAmount:    r.tax_amount,
  evidenceUrl:  r.evidence_url,
});

const fromLedger = (l: LedgerEntry) => ({
  company_id:   l.companyId,
  date:         l.date,
  type:         l.type,
  description:  l.description,
  amount:       l.amount,
  tax_amount:   l.taxAmount,
  evidence_url: l.evidenceUrl,
  user_id: (window as any).__taxpulse_uid || undefined,
});

const toEvidence = (r: any): EvidenceFile => ({
  id:             r.id,
  companyId:      r.company_id,
  obligationId:   r.obligation_id,
  ledgerEntryId:  r.ledger_entry_id,
  name:           r.name,
  mimeType:       r.mime_type,
  sizeBytes:      r.size_bytes,
  data:           '',  // not stored in DB — fetched from Storage on demand
  uploadDate:     r.upload_date,
  category:       r.category,
  notes:          r.notes,
  storagePath:    r.storage_path,
});

// ─── Companies ────────────────────────────────────────────────────────────────
export async function getCompanies(): Promise<Company[]> {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(toCompany);
}

export async function getCompany(id: string): Promise<Company | null> {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return null;
  return data ? toCompany(data) : null;
}

export async function addCompany(company: Company): Promise<Company> {
  const { data, error } = await supabase
    .from('companies')
    .insert(fromCompany(company))
    .select()
    .single();
  if (error) throw error;
  return toCompany(data);
}

export async function updateCompany(company: Company): Promise<void> {
  const { error } = await supabase
    .from('companies')
    .update(fromCompany(company))
    .eq('id', company.id);
  if (error) throw error;
}

// ─── Tax Obligations ──────────────────────────────────────────────────────────
export async function getObligations(companyId: string): Promise<TaxObligation[]> {
  const { data, error } = await supabase
    .from('tax_obligations')
    .select('*')
    .eq('company_id', companyId)
    .order('due_date', { ascending: true });
  if (error) throw error;
  return (data || []).map(toObligation);
}

export async function addObligation(obligation: TaxObligation): Promise<TaxObligation> {
  const { data, error } = await supabase
    .from('tax_obligations')
    .insert(fromObligation(obligation))
    .select()
    .single();
  if (error) throw error;
  return toObligation(data);
}

export async function updateObligation(id: string, updates: Partial<TaxObligation>): Promise<void> {
  const mapped: any = {};
  if (updates.status !== undefined)          mapped.status           = updates.status;
  if (updates.actualAmount !== undefined)    mapped.actual_amount    = updates.actualAmount;
  if (updates.paymentDate !== undefined)     mapped.payment_date     = updates.paymentDate;
  if (updates.proofUrl !== undefined)        mapped.proof_url        = updates.proofUrl;
  if (updates.checklist !== undefined)       mapped.checklist        = updates.checklist;
  if (updates.estimatedAmount !== undefined) mapped.estimated_amount = updates.estimatedAmount;

  const { error } = await supabase
    .from('tax_obligations')
    .update(mapped)
    .eq('id', id);
  if (error) throw error;
}

// ─── Ledger ───────────────────────────────────────────────────────────────────
export async function getLedgers(companyId: string): Promise<LedgerEntry[]> {
  const { data, error } = await supabase
    .from('ledger_entries')
    .select('*')
    .eq('company_id', companyId)
    .order('date', { ascending: false });
  if (error) throw error;
  return (data || []).map(toLedger);
}

export async function addLedgerEntry(entry: LedgerEntry): Promise<LedgerEntry> {
  const { data, error } = await supabase
    .from('ledger_entries')
    .insert(fromLedger(entry))
    .select()
    .single();
  if (error) throw error;
  return toLedger(data);
}

// ─── Evidence Files ───────────────────────────────────────────────────────────
export async function getEvidence(companyId: string): Promise<EvidenceFile[]> {
  const { data, error } = await supabase
    .from('evidence_files')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(toEvidence);
}

export async function addEvidence(file: EvidenceFile): Promise<EvidenceFile> {
  // 1. Upload file data to Supabase Storage
  const storagePath = `${file.companyId}/${file.id}_${file.name}`;
  const byteArray = Uint8Array.from(atob(file.data), c => c.charCodeAt(0));
  const blob = new Blob([byteArray], { type: file.mimeType });

  const { error: storageError } = await supabase.storage
    .from('evidence')
    .upload(storagePath, blob, { contentType: file.mimeType, upsert: false });

  if (storageError) throw storageError;

  // 2. Save metadata to DB
  const { data, error } = await supabase
    .from('evidence_files')
    .insert({
      id:               file.id,
      company_id:       file.companyId,
      obligation_id:    file.obligationId || null,
      ledger_entry_id:  file.ledgerEntryId || null,
      name:             file.name,
      mime_type:        file.mimeType,
      size_bytes:       file.sizeBytes,
      storage_path:     storagePath,
      upload_date:      file.uploadDate,
      category:         file.category,
      notes:            file.notes || null,
    })
    .select()
    .single();

  if (error) throw error;
  return toEvidence(data);
}

export async function downloadEvidence(file: EvidenceFile & { storagePath?: string }): Promise<string> {
  const path = (file as any).storagePath;
  if (!path) throw new Error('No storage path');
  const { data, error } = await supabase.storage.from('evidence').download(path);
  if (error) throw error;
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(data);
  });
}

export async function deleteEvidence(id: string, storagePath: string): Promise<void> {
  await supabase.storage.from('evidence').remove([storagePath]);
  const { error } = await supabase.from('evidence_files').delete().eq('id', id);
  if (error) throw error;
}
