/**
 * TaxPulse NG — Tax Engine
 * Based on Nigeria Tax Act (NTA) 2025, effective 1 January 2026
 * Signed by President Bola Tinubu, 26 June 2025
 */

import { Company, TaxObligation, TaxType, TaxStatus, EntityType, PayslipEmployee } from '../types';

// ─── VAT ─────────────────────────────────────────────────────────────────────
// VAT Act (consolidated under NTA 2025) — rate unchanged at 7.5%
export const VAT_RATE = 0.075;

export const ZERO_RATED_CATEGORIES = [
  'Basic food items (unprocessed)',
  'Medical & pharmaceutical products',
  'Educational books & materials',
  'Electricity generation & transmission',
  'Non-oil exports',
  'Medical equipment',
  'Baby products',
];

export const calcVAT = (net: number) => ({
  net,
  vat: net * VAT_RATE,
  total: net * (1 + VAT_RATE),
});

// ─── PAYE / PERSONAL INCOME TAX ───────────────────────────────────────────────
// NTA 2025 Fourth Schedule — new progressive bands effective 1 Jan 2026
// CRA (Consolidated Relief Allowance) is ABOLISHED
// Replaced by: Rent Relief (20% of annual rent, max ₦500,000)
export const NTA_2026_BANDS = [
  { limit: 800_000,    rate: 0.00, label: 'First ₦800,000 (tax-free)' },
  { limit: 2_200_000,  rate: 0.15, label: 'Next ₦2,200,000' },       // ₦800k – ₦3M
  { limit: 9_000_000,  rate: 0.18, label: 'Next ₦9,000,000' },       // ₦3M – ₦12M
  { limit: 13_000_000, rate: 0.21, label: 'Next ₦13,000,000' },      // ₦12M – ₦25M
  { limit: 25_000_000, rate: 0.23, label: 'Next ₦25,000,000' },      // ₦25M – ₦50M
  { limit: Infinity,   rate: 0.25, label: 'Above ₦50,000,000' },
];

export interface PAYEInputs {
  grossAnnual: number;
  annualRent?: number;       // For rent relief (20% of rent, max ₦500k) — replaces CRA
  nhf?: number;              // National Housing Fund contribution
  lifeAssurance?: number;    // Life assurance premium (up to ₦100,000)
}

export const calcPAYE = (inputs: PAYEInputs) => {
  const { grossAnnual, annualRent = 0, nhf = 0, lifeAssurance = 0 } = inputs;
  if (!grossAnnual) return { monthly: 0, annual: 0, taxable: 0, rentRelief: 0, pension: 0, breakdown: [] };

  // Statutory deductions (NTA 2025)
  const pension = grossAnnual * 0.08;           // 8% employee pension (mandatory)
  const nhis    = grossAnnual * 0.015;          // 1.5% NHIS
  const nhfAmt  = nhf || grossAnnual * 0.025;  // 2.5% NHF (default if not specified)
  const lifeAmt = Math.min(lifeAssurance, 100_000); // Life assurance capped at ₦100k

  // Rent relief replaces CRA: 20% of annual rent paid, max ₦500,000
  const rentRelief = Math.min(annualRent * 0.20, 500_000);

  const totalDeductions = pension + nhis + nhfAmt + lifeAmt + rentRelief;
  const taxable = Math.max(0, grossAnnual - totalDeductions);

  // Apply NTA 2026 bands
  let remaining = taxable;
  let totalTax = 0;
  const breakdown: { label: string; taxable: number; rate: number; tax: number }[] = [];

  for (const band of NTA_2026_BANDS) {
    if (remaining <= 0) break;
    const chunk = isFinite(band.limit) ? Math.min(remaining, band.limit) : remaining;
    const bandTax = chunk * band.rate;
    if (chunk > 0) {
      breakdown.push({ label: band.label, taxable: chunk, rate: band.rate, tax: bandTax });
    }
    totalTax += bandTax;
    remaining -= chunk;
  }

  return {
    monthly: totalTax / 12,
    annual: totalTax,
    taxable,
    rentRelief,
    pension,
    nhis,
    nhf: nhfAmt,
    totalDeductions,
    effectiveRate: grossAnnual > 0 ? (totalTax / grossAnnual) * 100 : 0,
    netAnnual: grossAnnual - totalTax - pension - nhis - nhfAmt,
    breakdown,
  };
};

// ─── COMPANY INCOME TAX (CIT) ─────────────────────────────────────────────────
// NTA 2025 — Medium company category REMOVED. Now: Small (exempt) or Standard (30%)
// Small company: turnover ≤ ₦50M AND fixed assets ≤ ₦250M (NTA definition for CIT)
// NOTE: Professional service companies cannot be classified as small companies
// VAT exemption threshold (NTAA 2025): turnover ≤ ₦100M
// Development Levy: 4% on profits for non-small companies (replaces TET, IT Levy, NASENI, Police Trust Fund)

export const calcCIT = (profit: number, turnover: number, isProService = false) => {
  const isSmall = !isProService && turnover <= 50_000_000;
  const isVatSmall = !isProService && turnover <= 100_000_000;

  if (isSmall) {
    return {
      rate: 0, tax: 0, devLevy: 0, total: 0,
      label: 'Small Company — CIT Exempt (≤₦50M turnover)',
      vatExempt: true,
      note: 'Also exempt from Capital Gains Tax and Development Levy under NTA 2025',
    };
  }

  const citRate = 0.30; // Standard rate (30%) — medium category removed under NTA 2025
  const tax = profit * citRate;
  const devLevy = profit * 0.04; // 4% development levy (replaces TET, NASENI, etc.)
  const total = tax + devLevy;

  return {
    rate: citRate, tax, devLevy, total,
    label: turnover <= 100_000_000 ? 'Standard Company (₦50M–₦100M turnover) — 30% CIT' : 'Standard Company (>₦100M turnover) — 30% CIT',
    vatExempt: isVatSmall,
    note: isVatSmall
      ? 'VAT exempt under NTAA 2025 (turnover ≤₦100M) but subject to 30% CIT + 4% Dev Levy'
      : 'Subject to 30% CIT + 4% Development Levy. If multinational with €750M+ global revenue, 15% minimum ETR applies.',
  };
};

// ─── WITHHOLDING TAX (WHT) ────────────────────────────────────────────────────
// NTA 2025: Small businesses with valid TIN exempt from WHT on transactions ≤₦2M/month
export const WHT_RATES: Record<string, { rate: number; note?: string }> = {
  'Supply of Goods':               { rate: 0.05 },
  'Construction / Building Works': { rate: 0.05 },
  'Consultancy / Professional Fees': { rate: 0.10 },
  'Management Fees':               { rate: 0.10 },
  'Technical Services':            { rate: 0.10 },
  'Commission / Brokerage':        { rate: 0.10 },
  'Rent / Lease of Property':      { rate: 0.10 },
  'Director Fees':                 { rate: 0.10 },
  'Dividends':                     { rate: 0.10 },
  'Interest':                      { rate: 0.10 },
  'Royalties':                     { rate: 0.10 },
  'Digital / Virtual Asset Gains': { rate: 0.10, note: 'New under NTA 2025' },
};

// Small business WHT exemption (NTA 2025): valid TIN + monthly transactions ≤ ₦2M
export const isWHTExempt = (monthlyTransactionValue: number, hasTIN: boolean) =>
  hasTIN && monthlyTransactionValue <= 2_000_000;

// ─── PENALTIES (NTA 2025 — STIFFENED) ────────────────────────────────────────
export const PENALTIES = {
  failureToDeduct:    { rate: 0.40, label: '40% of undeducted tax amount' },
  lateRemittance:     { rate: 0.10, label: '10% per annum + CBN MPR interest' },
  failureToFile:      { fixed: 50_000, label: '₦50,000 + ₦25,000 per day of default' },
  failureToRegister:  { fixed: 50_000, label: '₦50,000 penalty' },
  fossilFuelSurcharge: { rate: 0.05, label: '5% surcharge on fossil fuel products' },
};

// ─── KEY DATES & DEADLINES ────────────────────────────────────────────────────
export const FILING_DEADLINES = [
  { tax: 'VAT',  due: '21st of following month',             authority: 'NRS (formerly FIRS)' },
  { tax: 'PAYE', due: '10th of following month',             authority: 'State IRS' },
  { tax: 'WHT',  due: '21st of following month',             authority: 'NRS (formerly FIRS)' },
  { tax: 'CIT',  due: '6 months after financial year-end',   authority: 'NRS (formerly FIRS)' },
  { tax: 'PIT',  due: '31st March annually',                 authority: 'State IRS' },
  { tax: 'DEV LEVY', due: 'Same as CIT filing',             authority: 'NRS (formerly FIRS)' },
];

// ─── AUTO-GENERATE TAX OBLIGATIONS ───────────────────────────────────────────
// Called after onboarding — seeds a full 12-month schedule based on company profile


const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];

function pad(n: number) { return String(n).padStart(2, '0'); }

function makeId() {
  return 'ob_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
}

// Parse "December 31" → month index (0-based)

// ─── PAYSLIP COMPUTATION ──────────────────────────────────────────────────────
export function calcPayslip(grossSalary: number, annualRent = 0): PayslipEmployee & { netPay: number; totalDeductions: number } {
  const basicSalary  = grossSalary * 0.60; // 60% basic (standard split)
  const housing      = grossSalary * 0.20;
  const transport    = grossSalary * 0.10;
  const other        = grossSalary * 0.10;

  // Statutory deductions
  const pension      = grossSalary * 0.08;           // 8% employee pension
  const nhis         = grossSalary * 0.015;          // 1.5% NHIS
  const nhf          = basicSalary * 0.025;          // 2.5% of basic salary
  const rentRelief   = Math.min(annualRent * 0.20, 500_000); // 20% of rent, max ₦500k

  // PAYE on annual equivalent
  const annualGross  = grossSalary * 12;
  const annualPAYE   = calcPAYE({ grossAnnual: annualGross, annualRent }).annual;
  const paye         = annualPAYE / 12;

  // Employer contributions (informational)
  const employerPension = grossSalary * 0.10;
  const nsitf           = grossSalary * 0.01;

  const totalDeductions = pension + nhis + nhf + paye;
  const netPay = grossSalary - totalDeductions;

  return {
    name: '', tin: '', department: '',
    grossSalary, basicSalary, housing, transport,
    pension, nhis, nhf, paye,
    employerPension, nsitf,
    netPay, totalDeductions,
  };
}


// ─── CAPITAL GAINS TAX (CGT) — NTA 2025 ────────────────────────────────────
// Rate: 10% on chargeable gains. Small companies (≤₦50M turnover): 0% CGT.
// Applies to: property, shares, business assets, goodwill, debts, IP, foreign currency.

export const CGT_RATE = 0.10;

export interface CGTInputs {
  assetType:        string;
  saleProceeds:     number;
  costOfAcquisition: number;
  improvementCosts?: number;
  disposalCosts?:   number;
  isSmallCompany?:  boolean; // ≤₦50M turnover: exempt
  isIndividual?:    boolean;
  yearsHeld?:       number;  // informational
}

export const calcCGT = (inputs: CGTInputs) => {
  const {
    saleProceeds, costOfAcquisition,
    improvementCosts = 0, disposalCosts = 0,
    isSmallCompany = false,
  } = inputs;

  const totalCost     = costOfAcquisition + improvementCosts + disposalCosts;
  const chargeableGain = Math.max(0, saleProceeds - totalCost);
  const loss           = saleProceeds < totalCost ? totalCost - saleProceeds : 0;

  if (isSmallCompany) {
    return {
      chargeableGain, loss, tax: 0, effectiveRate: 0,
      exempt: true,
      exemptionReason: 'Small Company Exemption — CGT 0% (turnover ≤₦50M, NTA 2025)',
    };
  }

  const tax = chargeableGain * CGT_RATE;
  return {
    chargeableGain, loss, tax,
    effectiveRate: saleProceeds > 0 ? tax / saleProceeds : 0,
    exempt: false,
    exemptionReason: '',
  };
};

export const CGT_ASSET_TYPES = [
  'Real Estate / Land',
  'Shares / Securities',
  'Business Assets (plant, machinery)',
  'Goodwill / Intellectual Property',
  'Debt instruments',
  'Foreign currency gains',
  'Motor vehicles (used for business)',
  'Other chargeable assets',
];

// ─── STATE-SPECIFIC LEVIES ────────────────────────────────────────────────────
// Each Nigerian state imposes levies beyond federal taxes.
// Sources: State Revenue Laws, Lagos Finance Law 2019, Rivers Finance Law, etc.

export interface StateLevyItem {
  name:        string;
  rate:        string;
  basis:       string;
  frequency:   string;
  authority:   string;
  notes?:      string;
}

export const STATE_LEVIES: Record<string, StateLevyItem[]> = {
  'Lagos': [
    { name: 'Business Premises Levy', rate: '₦10,000–₦100,000/yr', basis: 'Business premises area and type', frequency: 'Annual', authority: 'LIRS', notes: 'Due 31 March annually' },
    { name: 'Development Levy (Individual)', rate: '₦1,000–₦5,000/yr', basis: 'Per adult employee', frequency: 'Annual', authority: 'LIRS' },
    { name: 'Tenement Rate', rate: '2–5% of rateable value', basis: 'Property annual value', frequency: 'Annual', authority: 'Lagos State Land Use Charge' },
    { name: 'Hotel Occupancy Tax', rate: '5% of room revenue', basis: 'Hotel/short-let income', frequency: 'Monthly', authority: 'LIRS', notes: 'Applies to hospitality businesses' },
    { name: 'Signage & Advertisement Levy', rate: 'Varies by size/location', basis: 'Physical advertising boards', frequency: 'Annual', authority: 'LASAA' },
  ],
  'FCT - Abuja': [
    { name: 'Business Premises Levy', rate: '₦5,000–₦50,000/yr', basis: 'Business type and size', frequency: 'Annual', authority: 'FCT-IRS' },
    { name: 'Development Levy', rate: '₦2,000/employee/yr', basis: 'Per employee', frequency: 'Annual', authority: 'FCT-IRS' },
    { name: 'Ground Rent', rate: 'Varies by plot size', basis: 'Land area', frequency: 'Annual', authority: 'AGIS (Abuja Geographic Information Service)' },
  ],
  'Rivers': [
    { name: 'Business Premises Levy', rate: '₦5,000–₦80,000/yr', basis: 'Business premises', frequency: 'Annual', authority: 'Rivers IRS' },
    { name: 'Development Levy', rate: '₦2,500/employee/yr', basis: 'Per employee', frequency: 'Annual', authority: 'Rivers IRS' },
    { name: 'Hotel/Tourism Levy', rate: '5% of turnover', basis: 'Tourism/hospitality revenue', frequency: 'Monthly', authority: 'Rivers IRS' },
  ],
  'Kano': [
    { name: 'Business Premises Levy', rate: '₦5,000–₦40,000/yr', basis: 'Business category', frequency: 'Annual', authority: 'Kano SIRS' },
    { name: 'Development Levy', rate: '₦1,500/employee/yr', basis: 'Per employee', frequency: 'Annual', authority: 'Kano SIRS' },
  ],
  'Ogun': [
    { name: 'Business Premises Levy', rate: '₦5,000–₦50,000/yr', basis: 'Business type', frequency: 'Annual', authority: 'Ogun SIRS' },
    { name: 'Development Levy', rate: '₦1,000/employee/yr', basis: 'Per employee', frequency: 'Annual', authority: 'Ogun SIRS' },
  ],
  'Delta': [
    { name: 'Business Premises Levy', rate: '₦5,000–₦60,000/yr', basis: 'Business type and size', frequency: 'Annual', authority: 'Delta SIRS' },
    { name: 'Development Levy', rate: '₦2,000/employee/yr', basis: 'Per employee', frequency: 'Annual', authority: 'Delta SIRS' },
  ],
  'Anambra': [
    { name: 'Business Premises Levy', rate: '₦5,000–₦40,000/yr', basis: 'Business premises', frequency: 'Annual', authority: 'Anambra SIRS' },
    { name: 'Development Levy', rate: '₦1,500/employee/yr', basis: 'Per employee', frequency: 'Annual', authority: 'Anambra SIRS' },
  ],
};

// Returns levies for a given state, falling back to a generic set
export const getStateLevies = (state: string): StateLevyItem[] => {
  return STATE_LEVIES[state] || [
    { name: 'Business Premises Levy', rate: 'Varies', basis: 'Business premises', frequency: 'Annual', authority: `${state} State IRS`, notes: 'Contact your State IRS for exact rates' },
    { name: 'Development Levy', rate: 'Varies', basis: 'Per employee', frequency: 'Annual', authority: `${state} State IRS` },
  ];
};

// ─── VAT INVOICE COMPUTATION ──────────────────────────────────────────────────
export interface InvoiceLineItem {
  description:  string;
  quantity:     number;
  unitPrice:    number;
  vatApplicable: boolean;  // false = zero-rated or exempt
}

export interface InvoiceComputed {
  subtotal:    number;
  vatAmount:   number;
  total:       number;
  lines:       Array<InvoiceLineItem & { lineTotal: number; vatAmount: number }>;
}

export const computeInvoice = (items: InvoiceLineItem[]): InvoiceComputed => {
  const lines = items.map(item => {
    const lineTotal = item.quantity * item.unitPrice;
    const vatAmount = item.vatApplicable ? lineTotal * VAT_RATE : 0;
    return { ...item, lineTotal, vatAmount };
  });
  const subtotal  = lines.reduce((s, l) => s + l.lineTotal, 0);
  const vatAmount = lines.reduce((s, l) => s + l.vatAmount, 0);
  return { subtotal, vatAmount, total: subtotal + vatAmount, lines };
};


// ─── STATE IRS PORTAL LINKS ───────────────────────────────────────────────────
export const STATE_IRS_PORTALS: Record<string, { name: string; url: string; paye_url?: string }> = {
  'Lagos':        { name: 'Lagos Internal Revenue Service', url: 'https://lagosirs.gov.ng', paye_url: 'https://lagosirs.gov.ng/e-tax' },
  'FCT - Abuja':  { name: 'FCT Inland Revenue Service', url: 'https://fcta-irs.gov.ng', paye_url: 'https://fcta-irs.gov.ng' },
  'Rivers':       { name: 'Rivers State Internal Revenue Service', url: 'https://rirs.gov.ng', paye_url: 'https://rirs.gov.ng' },
  'Kano':         { name: 'Kano State Internal Revenue Service', url: 'https://kirs.gov.ng' },
  'Ogun':         { name: 'Ogun State Internal Revenue Service', url: 'https://ogunirs.gov.ng' },
  'Delta':        { name: 'Delta State Internal Revenue Service', url: 'https://dsirs.gov.ng' },
  'Anambra':      { name: 'Anambra State Internal Revenue Service', url: 'https://airs.gov.ng' },
  'Kaduna':       { name: 'Kaduna State Internal Revenue Service', url: 'https://kadirs.gov.ng' },
  'Enugu':        { name: 'Enugu State Revenue Service', url: 'https://enrs.gov.ng' },
  'Imo':          { name: 'Imo State Internal Revenue Service', url: 'https://iirs.gov.ng' },
  'Edo':          { name: 'Edo State Internal Revenue Service', url: 'https://eirs.gov.ng' },
  'Kwara':        { name: 'Kwara State Internal Revenue Service', url: 'https://kwirs.gov.ng' },
  'Plateau':      { name: 'Plateau State Internal Revenue Service', url: 'https://plirs.gov.ng' },
  'Benue':        { name: 'Benue State Internal Revenue Service', url: 'https://birs.gov.ng' },
  'Cross River':  { name: 'Cross River State Internal Revenue Service', url: 'https://crirs.gov.ng' },
};

// NRS portal links for federal taxes
export const NRS_PORTALS = {
  main:          'https://www.nrs.gov.ng',
  eServices:     'https://eservices.nrs.gov.ng',
  taxProMax:     'https://taxpayerportal.nrs.gov.ng',
  tin:           'https://tin.nrs.gov.ng',
};

export const getStateIRS = (state: string) =>
  STATE_IRS_PORTALS[state] || { name: `${state} State Internal Revenue Service`, url: 'https://www.nrs.gov.ng' };

// ─── SALARY CHANGE SIMULATOR ────────────────────────────────────────────────
export interface SalaryScenario {
  label:      string;
  gross:      number;
  paye:       number;
  pension:    number; // employee 8%
  nhis:       number; // 1.5%
  nhf:        number; // 2.5% of basic (60%)
  netPay:     number;
  employerPension: number; // 10%
  nsitf:      number; // 1%
  totalEmployerCost: number;
}

export const calcSalaryScenario = (gross: number, annualRent = 0): SalaryScenario => {
  const paye        = calcPAYE({ grossAnnual: gross * 12, annualRent }).annual / 12;
  const pension     = gross * 0.08;
  const nhis        = gross * 0.015;
  const nhf         = (gross * 0.60) * 0.025; // 2.5% of basic (60%)
  const netPay      = gross - paye - pension - nhis - nhf;
  const ePension    = gross * 0.10;
  const nsitf       = gross * 0.01;
  return {
    label: '', gross, paye, pension, nhis, nhf, netPay,
    employerPension: ePension, nsitf,
    totalEmployerCost: gross + ePension + nsitf,
  };
};

// ─── ANNUAL TAX PLANNER ───────────────────────────────────────────────────────
export interface AnnualPlanMonth {
  month:       string;
  vatDue:      number;
  payeDue:     number;
  whtDue:      number;
  nsitfDue:    number;
  pensionDue:  number;
  nhfDue:      number;
  totalDue:    number;
}

export const projectAnnualTax = (
  monthlyRevenue:  number,
  monthlyExpenses: number,
  monthlyPayroll:  number,
  collectsVat:     boolean,
  hasEmployees:    boolean,
  paysVendors:     boolean,
  hasNSITF:        boolean,
  hasPension:      boolean,
  hasNHF:          boolean,
): { months: AnnualPlanMonth[]; totals: Omit<AnnualPlanMonth, 'month'> } => {
  const MONTHS_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const months = MONTHS_LABELS.map(month => {
    const vatDue     = collectsVat    ? monthlyRevenue * 0.075 : 0;
    const payeDue    = hasEmployees   ? monthlyPayroll * 0.12  : 0; // rough avg 12%
    const whtDue     = paysVendors    ? monthlyExpenses * 0.075 : 0; // rough avg 7.5%
    const nsitfDue   = hasNSITF      ? monthlyPayroll * 0.01  : 0;
    const pensionDue = hasPension     ? monthlyPayroll * 0.18  : 0; // 8% emp + 10% employer
    const nhfDue     = hasNHF        ? monthlyPayroll * 0.60 * 0.025 : 0;
    const totalDue   = vatDue + payeDue + whtDue + nsitfDue + pensionDue + nhfDue;
    return { month, vatDue, payeDue, whtDue, nsitfDue, pensionDue, nhfDue, totalDue };
  });

  const totals = months.reduce((acc, m) => ({
    month: '', vatDue: acc.vatDue + m.vatDue, payeDue: acc.payeDue + m.payeDue,
    whtDue: acc.whtDue + m.whtDue, nsitfDue: acc.nsitfDue + m.nsitfDue,
    pensionDue: acc.pensionDue + m.pensionDue, nhfDue: acc.nhfDue + m.nhfDue,
    totalDue: acc.totalDue + m.totalDue,
  }), { month: '', vatDue: 0, payeDue: 0, whtDue: 0, nsitfDue: 0, pensionDue: 0, nhfDue: 0, totalDue: 0 });

  return { months, totals };
};

function parseYearEndMonth(yearEnd: string): number {
  const parts = yearEnd.split(' ');
  const idx = MONTHS.findIndex(m => m.toLowerCase() === parts[0].toLowerCase());
  return idx >= 0 ? idx : 11; // default December
}

export function generateObligations(company: Company): Omit<TaxObligation, 'id'>[] {
  const obligations: Omit<TaxObligation, 'id'>[] = [];
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-based

  // ── VAT — monthly, due 21st of following month ─────────────────────────────
  if (company.collectsVat) {
    for (let i = 0; i < 12; i++) {
      const month = (currentMonth + i) % 12;
      const year = currentYear + Math.floor((currentMonth + i) / 12);
      const dueMonth = (month + 1) % 12;
      const dueYear = dueMonth === 0 ? year + 1 : (month === 11 ? year + 1 : year);
      const dueDate = `${dueYear}-${pad(dueMonth + 1)}-21`;
      const periodLabel = `${MONTHS[month]} ${year}`;

      const status = new Date(dueDate) < now
        ? TaxStatus.OVERDUE
        : new Date(dueDate) <= new Date(now.getTime() + 30 * 86400000)
          ? TaxStatus.DUE
          : TaxStatus.UPCOMING;

      obligations.push({
        companyId: company.id,
        type: TaxType.VAT,
        period: periodLabel,
        dueDate,
        status,
        estimatedAmount: 0,
        checklist: [
          { label: 'Download VAT schedule from NRS portal', completed: false },
          { label: 'Reconcile output VAT (sales)', completed: false },
          { label: 'Reconcile input VAT (purchases)', completed: false },
          { label: 'File VAT return on NRS e-Services', completed: false },
          { label: 'Make payment & keep receipt', completed: false },
        ],
      });
    }
  }

  // ── PAYE — monthly, due 10th of following month ────────────────────────────
  if (company.hasEmployees) {
    for (let i = 0; i < 12; i++) {
      const month = (currentMonth + i) % 12;
      const year = currentYear + Math.floor((currentMonth + i) / 12);
      const dueMonth = (month + 1) % 12;
      const dueYear = dueMonth === 0 ? year + 1 : (month === 11 ? year + 1 : year);
      const dueDate = `${dueYear}-${pad(dueMonth + 1)}-10`;
      const periodLabel = `${MONTHS[month]} ${year}`;

      const status = new Date(dueDate) < now
        ? TaxStatus.OVERDUE
        : new Date(dueDate) <= new Date(now.getTime() + 30 * 86400000)
          ? TaxStatus.DUE
          : TaxStatus.UPCOMING;

      obligations.push({
        companyId: company.id,
        type: TaxType.PAYE,
        period: periodLabel,
        dueDate,
        status,
        estimatedAmount: 0,
        checklist: [
          { label: 'Prepare payroll schedule for the month', completed: false },
          { label: 'Calculate PAYE per employee (NTA 2025 bands)', completed: false },
          { label: 'File PAYE returns with State IRS', completed: false },
          { label: 'Remit PAYE to State IRS', completed: false },
          { label: 'Issue payslips to all employees', completed: false },
        ],
      });
    }
  }

  // ── WHT — monthly, due 21st of following month ─────────────────────────────
  if (company.paysVendors) {
    for (let i = 0; i < 12; i++) {
      const month = (currentMonth + i) % 12;
      const year = currentYear + Math.floor((currentMonth + i) / 12);
      const dueMonth = (month + 1) % 12;
      const dueYear = dueMonth === 0 ? year + 1 : (month === 11 ? year + 1 : year);
      const dueDate = `${dueYear}-${pad(dueMonth + 1)}-21`;
      const periodLabel = `${MONTHS[month]} ${year}`;

      const status = new Date(dueDate) < now
        ? TaxStatus.OVERDUE
        : new Date(dueDate) <= new Date(now.getTime() + 30 * 86400000)
          ? TaxStatus.DUE
          : TaxStatus.UPCOMING;

      obligations.push({
        companyId: company.id,
        type: TaxType.WHT,
        period: periodLabel,
        dueDate,
        status,
        estimatedAmount: 0,
        checklist: [
          { label: 'List all vendor payments made this month', completed: false },
          { label: 'Calculate WHT deducted (5% goods, 10% services)', completed: false },
          { label: 'File WHT schedule on NRS portal', completed: false },
          { label: 'Remit WHT to NRS', completed: false },
          { label: 'Issue WHT credit notes to vendors', completed: false },
        ],
      });
    }
  }

  // ── CIT — once, due 6 months after financial year end ─────────────────────
  {
    const yearEndMonth = parseYearEndMonth(company.yearEnd);
    // Find next year-end date
    let citYear = currentYear;
    if (currentMonth > yearEndMonth) citYear = currentYear + 1;
    const citDueMonth = (yearEndMonth + 6) % 12;
    const citDueYear = yearEndMonth + 6 >= 12 ? citYear + 1 : citYear;
    const citDueDate = `${citDueYear}-${pad(citDueMonth + 1)}-01`;
    const periodLabel = `FY ${citYear} (Year ending ${company.yearEnd} ${citYear})`;

    const citStatus = new Date(citDueDate) < now
      ? TaxStatus.OVERDUE
      : new Date(citDueDate) <= new Date(now.getTime() + 60 * 86400000)
        ? TaxStatus.DUE
        : TaxStatus.UPCOMING;

    obligations.push({
      companyId: company.id,
      type: TaxType.CIT,
      period: periodLabel,
      dueDate: citDueDate,
      status: citStatus,
      estimatedAmount: 0,
      checklist: [
        { label: 'Prepare audited financial statements', completed: false },
        { label: 'Compute assessable profit (NTA 2025)', completed: false },
        { label: 'Check if small company exemption applies (≤₦50M turnover)', completed: false },
        { label: 'Compute 30% CIT + 4% Development Levy', completed: false },
        { label: 'File CIT return on NRS portal', completed: false },
        { label: 'Pay CIT liability and keep receipt', completed: false },
      ],
    });
  }


  // ── PIT — Personal Income Tax (INDIVIDUAL entity type only) ───────────────
  // Annual self-assessment: due 31 March for employed & self-employed
  // Quarterly advance payment: due 31 March, 30 June, 30 Sept, 31 Dec (self-employed)
  if (company.entityType === EntityType.INDIVIDUAL) {
    const assessmentYear = currentMonth >= 2 ? currentYear + 1 : currentYear; // after March, file for next year
    const annualDueDate = `${assessmentYear}-03-31`;
    const annualStatus = new Date(annualDueDate) < now
      ? TaxStatus.OVERDUE
      : new Date(annualDueDate) <= new Date(now.getTime() + 60 * 86400000)
        ? TaxStatus.DUE
        : TaxStatus.UPCOMING;

    obligations.push({
      companyId: company.id,
      type: TaxType.PIT,
      period: `FY ${assessmentYear - 1} (Tax Year)`,
      dueDate: annualDueDate,
      status: annualStatus,
      estimatedAmount: 0,
      checklist: [
        { label: 'Gather all income statements & payslips', completed: false },
        { label: 'Complete PIT self-assessment form (Form A)', completed: false },
        { label: 'Calculate chargeable income after rent relief, pension, NHF', completed: false },
        { label: 'Apply NTA 2025 bands (0% on first ₦800k, up to 25%)', completed: false },
        { label: 'File annual return with your State Internal Revenue Service', completed: false },
        { label: 'Pay any outstanding tax balance', completed: false },
        { label: 'Obtain tax clearance certificate', completed: false },
      ],
    });

    // Quarterly advance payments for self-employed / both
    if (company.employmentType === 'self-employed' || company.employmentType === 'both') {
      const quarters = [
        { label: 'Q1', dueDate: `${currentYear}-03-31` },
        { label: 'Q2', dueDate: `${currentYear}-06-30` },
        { label: 'Q3', dueDate: `${currentYear}-09-30` },
        { label: 'Q4', dueDate: `${currentYear}-12-31` },
      ];
      for (const q of quarters) {
        const qDue = new Date(q.dueDate);
        if (qDue < new Date(now.getTime() - 30 * 86400000)) continue; // skip very old quarters
        const qStatus = qDue < now
          ? TaxStatus.OVERDUE
          : qDue <= new Date(now.getTime() + 30 * 86400000)
            ? TaxStatus.DUE
            : TaxStatus.UPCOMING;
        obligations.push({
          companyId: company.id,
          type: TaxType.PIT,
          period: `${q.label} ${currentYear} (Advance Payment)`,
          dueDate: q.dueDate,
          status: qStatus,
          estimatedAmount: 0,
          checklist: [
            { label: `Calculate estimated income for ${q.label}`, completed: false },
            { label: 'Compute 25% of estimated annual PIT liability', completed: false },
            { label: 'Pay advance PIT instalment to State IRS', completed: false },
            { label: 'Keep payment receipt for annual reconciliation', completed: false },
          ],
        });
      }
    }
  }


  // ── CAC Annual Returns — due 30 June each year ─────────────────────────────
  if (company.cacAnnualReturns !== false && company.entityType !== EntityType.INDIVIDUAL &&
      (company.cacStatus === 'Registered' || company.rcNumber)) {
    const cacDueYear = currentMonth >= 5 ? currentYear + 1 : currentYear; // after June, plan for next year
    const cacDueDate = `${cacDueYear}-06-30`;
    const cacStatus  = new Date(cacDueDate) < now ? TaxStatus.OVERDUE
      : new Date(cacDueDate) <= new Date(now.getTime() + 60 * 86400000) ? TaxStatus.DUE
      : TaxStatus.UPCOMING;

    obligations.push({
      companyId: company.id,
      type: TaxType.CAC,
      period: `FY ${cacDueYear - 1} Annual Returns`,
      dueDate: cacDueDate,
      status: cacStatus,
      estimatedAmount: 0,
      checklist: [
        { label: 'Log in to CAC portal: www.cac.gov.ng', completed: false },
        { label: 'Prepare annual returns form (CAC 10 for LTDs)', completed: false },
        { label: 'Attach audited accounts (if turnover > ₦50M)', completed: false },
        { label: 'Attach list of shareholders/directors (current)', completed: false },
        { label: 'Pay annual returns filing fee on CAC portal', completed: false },
        { label: 'Submit online and download filing confirmation', completed: false },
        { label: 'Keep confirmation — needed for CAC Certificate of Compliance', completed: false },
      ],
    });
  }

  // ── NSITF — 1% of payroll, due 16th of following month ────────────────────
  if (company.hasNSITF && company.hasEmployees) {
    for (let i = 0; i < 12; i++) {
      const month    = (currentMonth + i) % 12;
      const year     = currentYear + Math.floor((currentMonth + i) / 12);
      const dueMonth = (month + 1) % 12;
      const dueYear  = dueMonth === 0 ? year + 1 : (month === 11 ? year + 1 : year);
      const dueDate  = `${dueYear}-${pad(dueMonth + 1)}-16`;
      const status   = new Date(dueDate) < now ? TaxStatus.OVERDUE
        : new Date(dueDate) <= new Date(now.getTime() + 30 * 86400000) ? TaxStatus.DUE
        : TaxStatus.UPCOMING;

      obligations.push({
        companyId: company.id,
        type: TaxType.NSITF,
        period: `${MONTHS[month]} ${year}`,
        dueDate,
        status,
        estimatedAmount: 0,
        checklist: [
          { label: 'Log in to NSITF employer portal: www.nsitf.gov.ng', completed: false },
          { label: 'Calculate 1% of total gross payroll for the month', completed: false },
          { label: 'File monthly contribution schedule', completed: false },
          { label: 'Remit via REMITA or bank transfer to NSITF', completed: false },
          { label: 'Download and file payment receipt', completed: false },
        ],
      });
    }
  }

  // ── Pension — 18% total (8% emp + 10% employer), due 7 days after payday ──
  if (company.hasPension && company.hasEmployees) {
    for (let i = 0; i < 12; i++) {
      const month    = (currentMonth + i) % 12;
      const year     = currentYear + Math.floor((currentMonth + i) / 12);
      // Due 7 days after salary payment — we approximate as 7th of current month
      const dueDate  = `${year}-${pad(month + 1)}-07`;
      const status   = new Date(dueDate) < now ? TaxStatus.OVERDUE
        : new Date(dueDate) <= new Date(now.getTime() + 30 * 86400000) ? TaxStatus.DUE
        : TaxStatus.UPCOMING;

      obligations.push({
        companyId: company.id,
        type: TaxType.PENSION,
        period: `${MONTHS[month]} ${year}`,
        dueDate,
        status,
        estimatedAmount: 0,
        checklist: [
          { label: 'Calculate 8% employee contribution per payslip', completed: false },
          { label: 'Calculate 10% employer contribution', completed: false },
          { label: 'Remit total 18% to employees' respective PFAs', completed: false },
          { label: 'Deadline: 7 days after salary payment date (PRA 2014)', completed: false },
          { label: 'Keep pension remittance advice from each PFA', completed: false },
        ],
      });
    }
  }

  // ── ITF — 1% of payroll annually, due 1 April ─────────────────────────────
  if (company.hasITF && company.hasEmployees) {
    const itfDueYear = currentMonth >= 2 ? currentYear + 1 : currentYear;
    const itfDueDate = `${itfDueYear}-04-01`;
    const itfStatus  = new Date(itfDueDate) < now ? TaxStatus.OVERDUE
      : new Date(itfDueDate) <= new Date(now.getTime() + 60 * 86400000) ? TaxStatus.DUE
      : TaxStatus.UPCOMING;

    obligations.push({
      companyId: company.id,
      type: TaxType.ITF,
      period: `FY ${itfDueYear - 1} ITF Levy`,
      dueDate: itfDueDate,
      status: itfStatus,
      estimatedAmount: 0,
      checklist: [
        { label: 'Calculate 1% of total annual payroll', completed: false },
        { label: 'Register/log in at ITF portal: www.itf.gov.ng', completed: false },
        { label: 'Complete ITF Training Levy Return form', completed: false },
        { label: 'Remit via REMITA by 1 April', completed: false },
        { label: 'Apply for ITF reimbursement (up to 50% back if staff were trained)', completed: false },
        { label: 'Keep proof of training and receipts for reimbursement claim', completed: false },
      ],
    });
  }

  // ── NHF — 2.5% employee basic salary, monthly, due 1st of following month ─
  if (company.hasNHF && company.hasEmployees) {
    for (let i = 0; i < 12; i++) {
      const month    = (currentMonth + i) % 12;
      const year     = currentYear + Math.floor((currentMonth + i) / 12);
      const dueMonth = (month + 1) % 12;
      const dueYear  = dueMonth === 0 ? year + 1 : (month === 11 ? year + 1 : year);
      const dueDate  = `${dueYear}-${pad(dueMonth + 1)}-01`;
      const status   = new Date(dueDate) < now ? TaxStatus.OVERDUE
        : new Date(dueDate) <= new Date(now.getTime() + 30 * 86400000) ? TaxStatus.DUE
        : TaxStatus.UPCOMING;

      obligations.push({
        companyId: company.id,
        type: TaxType.NHF,
        period: `${MONTHS[month]} ${year}`,
        dueDate,
        status,
        estimatedAmount: 0,
        checklist: [
          { label: 'Calculate 2.5% of each employee's basic salary', completed: false },
          { label: 'Log in to FMBN portal: www.fmbn.gov.ng', completed: false },
          { label: 'Submit NHF remittance schedule for all employees', completed: false },
          { label: 'Remit via REMITA to Federal Mortgage Bank of Nigeria (FMBN)', completed: false },
          { label: 'Keep remittance confirmation — employees need it for mortgage access', completed: false },
        ],
      });
    }
  }

  return obligations;
}
