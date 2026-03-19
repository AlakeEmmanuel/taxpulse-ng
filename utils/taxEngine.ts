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
