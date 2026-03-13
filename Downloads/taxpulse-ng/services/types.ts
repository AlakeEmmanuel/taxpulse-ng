
export enum EntityType {
  SOLE_PROP = 'Sole Proprietorship',
  PARTNERSHIP = 'Partnership',
  LTD = 'Limited Liability Company (LTD)',
  PLC = 'Public Limited Company (PLC)',
  NGO = 'Incorporated Trustees / NGO',
  BUSINESS_NAME = 'Business Name',
  OTHER = 'Other'
}

export enum TaxStatus {
  UPCOMING = 'Upcoming',
  DUE = 'Due',
  FILED = 'Filed',
  OVERDUE = 'Overdue'
}

export enum TaxType {
  VAT = 'VAT',
  WHT = 'WHT',
  PAYE = 'PAYE',
  CIT = 'CIT'
}

export interface Company {
  id: string;
  name: string;
  entityType: EntityType;
  industry: string;
  state: string;
  address: string;
  cacStatus: 'Registered' | 'Not Registered' | 'In Progress';
  rcNumber?: string;
  tin?: string;
  vatNumber?: string;
  yearEnd: string;
  hasEmployees: boolean;
  employeeCount?: number;
  paysVendors: boolean;
  collectsVat: boolean;
  complianceScore: number;
}

export interface TaxObligation {
  id: string;
  companyId: string;
  type: TaxType;
  period: string;
  dueDate: string;
  status: TaxStatus;
  estimatedAmount: number;
  actualAmount?: number;
  paymentDate?: string;
  proofUrl?: string;
  checklist: { label: string; completed: boolean }[];
}

export interface LedgerEntry {
  id: string;
  companyId: string;
  date: string;
  type: 'sale' | 'expense';
  description: string;
  amount: number;
  taxAmount: number;
  evidenceUrl?: string;
  sourceId?: string;   // ID of the bank statement import this entry came from
}

// ─── Evidence Vault ───────────────────────────────────────────────────────────
export type EvidenceCategory = 'receipt' | 'invoice' | 'payment_proof' | 'bank_statement' | 'other';

export interface EvidenceFile {
  id: string;
  companyId: string;
  monthYear?: string;  // e.g. "2026-02" — for bank statements, used for dedup & ordering
  obligationId?: string;   // link to a tax obligation
  ledgerEntryId?: string;  // link to a ledger entry
  name: string;
  mimeType: string;
  sizeBytes: number;
  data: string;            // base64-encoded file content
  uploadDate: string;
  category: EvidenceCategory;
  notes?: string;
}
