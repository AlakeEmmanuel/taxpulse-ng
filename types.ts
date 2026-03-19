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
  VAT  = 'VAT',
  WHT  = 'WHT',
  PAYE = 'PAYE',
  CIT  = 'CIT',
  PIT  = 'PIT',  // Personal Income Tax — for individuals
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
  // ── Individual-specific ──────────────────────────────
  employmentType?:  'employed' | 'self-employed' | 'both';
  annualIncome?:    number;  // estimated gross annual income (₦)
}

export interface TaxObligation {
  id:               string;
  companyId:        string;
  type:             TaxType;
  period:           string;    // e.g. "Oct 2025" or "FY 2025"
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
