export enum EntityType {
  INDIVIDUAL    = 'Individual (Personal Income Tax)',
  SOLE_PROP     = 'Sole Proprietorship',
  PARTNERSHIP   = 'Partnership',
  LTD           = 'Limited Liability Company (LTD)',
  PLC           = 'Public Limited Company (PLC)',
  NGO           = 'Incorporated Trustees / NGO',
  BUSINESS_NAME = 'Business Name',
  OTHER         = 'Other',
}

export enum TaxStatus {
  UPCOMING = 'Upcoming',
  DUE      = 'Due',
  FILED    = 'Filed',
  OVERDUE  = 'Overdue',
}

export enum TaxType {
  VAT     = 'VAT',
  WHT     = 'WHT',
  PAYE    = 'PAYE',
  CIT     = 'CIT',
  PIT     = 'PIT',
  NSITF   = 'NSITF',       // 1% payroll -- National Social Insurance Trust Fund
  PENSION = 'Pension',     // 18% total (8% employee + 10% employer) -- Pension Fund Admin
  ITF     = 'ITF',         // 1% payroll -- Industrial Training Fund
  NHF     = 'NHF',         // 2.5% employee salary -- National Housing Fund
  CAC     = 'CAC',         // Annual returns -- Corporate Affairs Commission
}

export interface Company {
  id:               string;
  name:             string;
  entityType:       EntityType;
  industry:         string;
  state:            string;
  address:          string;
  cacStatus:        'Registered' | 'Not Registered' | 'In Progress';
  rcNumber?:        string;
  tin?:             string;
  vatNumber?:       string;
  yearEnd:          string;
  hasEmployees:     boolean;
  employeeCount?:   number;
  paysVendors:      boolean;
  collectsVat:      boolean;
  complianceScore:  number;

  // ── Payroll statutory contributions ─────────────────
  hasNSITF?:    boolean;  // NSITF: 1% payroll, employers with 3+ staff
  hasPension?:  boolean;  // Pension: 18% (8% emp + 10% employer), 3+ staff
  hasITF?:      boolean;  // ITF: 1% payroll, 5+ staff OR ₦50M+ turnover
  hasNHF?:      boolean;  // NHF: 2.5% of employee basic, all employers

  // ── CAC ─────────────────────────────────────────────
  cacAnnualReturns?: boolean;  // CAC-registered entities must file annually

  // ── WhatsApp / contact ──────────────────────────────
  phone?:          string;  // WhatsApp number for deadline reminders
  whatsappOptin?:  boolean; // User opted in to WhatsApp reminders

  // ── Individual-specific ─────────────────────────────
  employmentType?:  'employed' | 'self-employed' | 'both';
  annualIncome?:    number;
}

export interface TaxObligation {
  id:               string;
  companyId:        string;
  type:             TaxType;
  period:           string;
  dueDate:          string;
  status:           TaxStatus;
  estimatedAmount:  number;
  actualAmount?:    number;
  paymentDate?:     string;
  proofUrl?:        string;
  checklist:        { label: string; completed: boolean }[];
}

export interface LedgerEntry {
  id:           string;
  companyId:    string;
  date:         string;
  type:         'sale' | 'expense';
  description:  string;
  amount:       number;
  taxAmount:    number;
  evidenceUrl?: string;
}

// ── Payslip ────────────────────────────────────────────────────
export interface PayslipEmployee {
  name:          string;
  tin?:          string;
  department?:   string;
  grossSalary:   number;
  basicSalary:   number;    // usually 50-70% of gross
  housing?:      number;    // typically 20%
  transport?:    number;    // typically 10%
  // Deductions
  pension:       number;    // 8% of gross
  nhis:          number;    // 1.5% of gross
  nhf:           number;    // 2.5% of basic
  paye:          number;    // NTA 2025 bands
  otherDeductions?: number;
  // Employer contributions (not deducted from pay, but shown)
  employerPension:  number; // 10% of gross
  nsitf:            number; // 1% of gross
}

// ── Evidence Vault ─────────────────────────────────────────────────────────────
export type EvidenceCategory =
  | 'receipt'
  | 'invoice'
  | 'payment_proof'
  | 'bank_statement'
  | 'other';

export interface EvidenceFile {
  id:             string;
  companyId:      string;
  obligationId?:  string;
  ledgerEntryId?: string;
  name:           string;
  mimeType:       string;
  sizeBytes:      number;
  data:           string;       // base64 or empty -- fetched from Storage on demand
  uploadDate:     string;
  category:       EvidenceCategory;
  notes?:         string;
  storagePath?:   string;       // Supabase Storage path
  monthYear?:     string;       // e.g. "March 2026" -- for bank statements
}
