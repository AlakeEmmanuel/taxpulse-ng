/**
 * TaxPulse NG — Tax Engine
 * Based on Nigeria Tax Act (NTA) 2025, effective 1 January 2026
 * Signed by President Bola Tinubu, 26 June 2025
 */

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
