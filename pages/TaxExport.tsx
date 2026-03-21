import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import React, { useState, useEffect } from 'react';
import { Company, TaxStatus, TaxType, EntityType, LedgerEntry, TaxObligation } from '../types';
import { Card, Button } from '../components/Shared';
import * as db from '../services/db';

const fmt = (n: number) => '₦' + n.toLocaleString('en-NG', { maximumFractionDigits: 2 });
const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-NG', { day: '2-digit', month: 'long', year: 'numeric' });
const today = () => new Date().toLocaleDateString('en-NG', { day: '2-digit', month: 'long', year: 'numeric' });

const MONTHS_LIST = ['January','February','March','April','May','June',
  'July','August','September','October','November','December'];

const buildPeriods = () => {
  const now = new Date();
  const year = now.getFullYear();
  const periods: string[] = [];
  for (const y of [year - 1, year]) {
    MONTHS_LIST.forEach(m => periods.push(`${m} ${y}`));
    periods.push(`Full Year ${y}`);
  }
  return periods;
};
const PERIODS = buildPeriods();

const GREEN: [number,number,number] = [0, 132, 61];
const DARK:  [number,number,number] = [30, 41, 59];
const LGRAY: [number,number,number] = [241, 245, 249];
const WHITE: [number,number,number] = [255, 255, 255];
const RED:   [number,number,number] = [220, 38, 38];
const AMBER: [number,number,number] = [180, 100, 0];

// ─── PDF helpers ─────────────────────────────────────────────────────────────
function drawHeader(doc: any, title: string, subtitle: string, company: Company) {
  const W = doc.internal.pageSize.getWidth();
  doc.setFillColor(...GREEN);
  doc.rect(0, 0, W, 36, 'F');
  doc.setTextColor(...WHITE);
  doc.setFontSize(18); doc.setFont('helvetica', 'bold');
  doc.text('TaxPulse NG', 14, 14);
  doc.setFontSize(10); doc.setFont('helvetica', 'normal');
  doc.text(title, 14, 22);
  doc.text(subtitle, 14, 29);
  // NTA badge
  doc.setFillColor(...WHITE);
  doc.roundedRect(W - 50, 11, 36, 10, 2, 2, 'F');
  doc.setTextColor(...GREEN);
  doc.setFontSize(7); doc.setFont('helvetica', 'bold');
  doc.text('NTA 2025 COMPLIANT', W - 49, 17.5);
  // Company strip
  doc.setFillColor(...LGRAY);
  doc.rect(0, 36, W, 24, 'F');
  doc.setTextColor(...DARK);
  doc.setFontSize(12); doc.setFont('helvetica', 'bold');
  doc.text(company.name, 14, 47);
  doc.setFontSize(8); doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  const infoLine = [
    company.entityType,
    company.state,
    company.tin ? `TIN: ${company.tin}` : '',
    company.rcNumber ? `RC: ${company.rcNumber}` : '',
  ].filter(Boolean).join('·');
  doc.text(infoLine, 14, 54);
  doc.text(`Generated: ${today()}`, W - 14, 54, { align: 'right' });
}

function drawFooter(doc: any, pageNum: number, totalPages: number) {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  doc.setFillColor(...GREEN);
  doc.rect(0, H - 12, W, 12, 'F');
  doc.setTextColor(...WHITE);
  doc.setFontSize(7); doc.setFont('helvetica', 'normal');
  doc.text(
    `TaxPulse NG  ·  Nigeria Tax Act 2025  ·  Page ${pageNum} of ${totalPages}  ·  For informational purposes. Consult a certified tax professional for formal advice.`,
    W / 2, H - 5, { align: 'center' }
  );
}

function addFooters(doc: any) {
  const total = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    drawFooter(doc, i, total);
  }
}

function sectionTitle(doc: any, text: string, y: number) {
  doc.setTextColor(...GREEN);
  doc.setFontSize(10); doc.setFont('helvetica', 'bold');
  doc.text(text, 14, y);
  doc.setDrawColor(...GREEN);
  doc.setLineWidth(0.4);
  doc.line(14, y + 2, doc.internal.pageSize.getWidth() - 14, y + 2);
  return y + 8;
}

function infoBox(doc: any, rows: [string, string][], startX: number, startY: number, colWidth: number = 85) {
  const W = doc.internal.pageSize.getWidth();
  let y = startY;
  rows.forEach(([label, value], i) => {
    if (i % 2 === 0) {
      doc.setFillColor(...LGRAY);
      doc.rect(startX, y - 4, W - startX * 2, 8, 'F');
    }
    doc.setTextColor(100, 116, 139); doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    doc.text(label, startX + 2, y);
    doc.setTextColor(...DARK); doc.setFont('helvetica', 'bold');
    doc.text(value || '--', startX + colWidth, y);
    y += 9;
  });
  return y + 4;
}

// ─── VAT Return PDF ──────────────────────────────────────────────────────────
async function generateVATReturn(doc: any, company: Company, period: string, ledger: LedgerEntry[], obligations: TaxObligation[]) {
  drawHeader(doc, 'VAT Return -- Form 002', `Period: ${period}  ·  Due: 21st of following month  ·  File with: Nigeria Revenue Service (NRS)`, company);
  let y = 72;

  y = sectionTitle(doc, 'TAXPAYER DETAILS', y);
  y = infoBox(doc, [
    ['Taxpayer Name', company.name],
    ['TIN / VAT Number', company.tin || company.vatNumber || 'Not provided'],
    ['Business Address', company.address || 'Not provided'],
    ['State', company.state],
    ['VAT Period', period],
    ['Entity Type', company.entityType],
    ['Return Type', 'Monthly VAT Return (Form 002)'],
    ['Filing Authority', 'Nigeria Revenue Service (NRS)'],
  ], 14, y);

  y = sectionTitle(doc, 'VAT COMPUTATION', y);

  // Filter ledger for period
  const periodLower = period.toLowerCase();
  const [pMonth, pYear] = period.split('');
  const periodLedger = ledger.filter(l => {
    const d = new Date(l.date);
    return MONTHS_LIST[d.getMonth()] === pMonth && d.getFullYear().toString() === pYear;
  });

  const outputVAT = periodLedger.filter(l => l.type === 'sale').reduce((s, l) => s + l.taxAmount, 0);
  const totalSales = periodLedger.filter(l => l.type === 'sale').reduce((s, l) => s + l.amount, 0);
  const inputVAT = periodLedger.filter(l => l.type === 'expense').reduce((s, l) => s + l.taxAmount, 0);
  const totalExpenses = periodLedger.filter(l => l.type === 'expense').reduce((s, l) => s + l.amount, 0);
  const vatPayable = Math.max(0, outputVAT - inputVAT);

  const obligation = obligations.find(o => o.type === TaxType.VAT && o.period === period);

  autoTable(doc, {
    startY: y,
    head: [['Line', 'Description', 'Amount (NGN)']],
    body: [
      ['1', 'Total Taxable Sales / Revenue', fmt(totalSales)],
      ['2', 'Output VAT (7.5% of Line 1)', fmt(outputVAT)],
      ['3', 'Total Taxable Purchases / Expenses', fmt(totalExpenses)],
      ['4', 'Input VAT (7.5% of Line 3)', fmt(inputVAT)],
      ['5', 'NET VAT PAYABLE (Line 2 minus Line 4)', fmt(vatPayable)],
      ['6', 'Previous VAT Credit (if applicable)', '0.00'],
      ['7', 'TOTAL VAT DUE TO NRS', fmt(vatPayable)],
    ],
    theme: 'grid',
    headStyles: { fillColor: GREEN, textColor: WHITE, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: DARK },
    alternateRowStyles: { fillColor: LGRAY },
    columnStyles: { 0: { cellWidth: 12 }, 2: { halign: 'right', fontStyle: 'bold' } },
    didDrawRow: (data: any) => {
      if (data.row.index === 4 || data.row.index === 6) {
        doc.setFillColor(...GREEN);
      }
    },
    margin: { left: 14, right: 14 },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  y = sectionTitle(doc, 'TRANSACTION DETAIL -- SALES (Output VAT)', y);
  const salesRows = periodLedger.filter(l => l.type === 'sale');
  if (salesRows.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['Date', 'Description', 'Sale Amount', 'VAT @ 7.5%']],
      body: salesRows.map(l => [l.date, l.description.slice(0, 50), fmt(l.amount), fmt(l.taxAmount)]),
      theme: 'grid',
      headStyles: { fillColor: GREEN, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 8, textColor: DARK },
      alternateRowStyles: { fillColor: LGRAY },
      columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right', fontStyle: 'bold' } },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  } else {
    doc.setFontSize(8); doc.setTextColor(100, 116, 139);
    doc.text('No sales transactions recorded for this period.', 14, y);
    y += 10;
  }

  if (y > 220) { doc.addPage(); y = 20; }
  y = sectionTitle(doc, 'TRANSACTION DETAIL -- PURCHASES (Input VAT)', y);
  const expRows = periodLedger.filter(l => l.type === 'expense');
  if (expRows.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['Date', 'Description', 'Purchase Amount', 'Input VAT @ 7.5%']],
      body: expRows.map(l => [l.date, l.description.slice(0, 50), fmt(l.amount), fmt(l.taxAmount)]),
      theme: 'grid',
      headStyles: { fillColor: GREEN, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 8, textColor: DARK },
      alternateRowStyles: { fillColor: LGRAY },
      columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right', fontStyle: 'bold' } },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  if (y > 230) { doc.addPage(); y = 20; }
  y = sectionTitle(doc, 'DECLARATION & FILING INSTRUCTIONS', y);
  doc.setFontSize(8); doc.setTextColor(...DARK); doc.setFont('helvetica', 'normal');
  const instructions = [
    '1. File this return on the NRS e-Services portal (www.nrs.gov.ng) by the 21st of the following month.',
    '2. Payment may be made via REMITA, bank transfer to NRS collection account, or NRS e-payment portal.',
    '3. Attach copies of all sales invoices and purchase receipts as supporting documents.',
    '4. Nil returns (₦0) must still be filed if no transactions occurred in the period.',
    '5. Keep this document and all supporting records for a minimum of 6 years (NTA 2025, Section 98).',
    '6. Late filing penalty: ₦50,000 + ₦25,000 per day of default. Late payment: 10% p.a. + MPR interest.',
    '7. Zero-rated supplies: basic food, medical products, educational materials, exports (report separately).',
  ];
  instructions.forEach(line => { doc.text(line, 14, y); y += 7; });

  y += 5;
  doc.setFillColor(...LGRAY);
  doc.rect(14, y, doc.internal.pageSize.getWidth() - 28, 28, 'F');
  doc.setTextColor(...DARK); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
  doc.text('CERTIFICATION', 16, y + 7);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
  doc.text('I certify that the information provided in this return is true and accurate to the best of my knowledge.', 16, y + 14);
  doc.text(`Authorised Signatory: ___________________________    Date: _______________    Designation: _______________`, 16, y + 22);
}

// ─── PAYE Monthly Schedule PDF ───────────────────────────────────────────────
async function generatePAYESchedule(doc: any, company: Company, period: string, ledger: LedgerEntry[], obligations: TaxObligation[]) {
  drawHeader(doc, 'PAYE Monthly Remittance Schedule', `Period: ${period}  ·  Due: 10th of following month  ·  File with: ${company.state} State Internal Revenue Service`, company);
  let y = 72;

  y = sectionTitle(doc, 'EMPLOYER DETAILS', y);
  y = infoBox(doc, [
    ['Employer Name', company.name],
    ['TIN', company.tin || 'Not provided'],
    ['State IRS', `${company.state} State Internal Revenue Service`],
    ['PAYE Period', period],
    ['Number of Employees', (company.employeeCount || 0).toString()],
    ['Filing Deadline', `10th of the month following ${period}`],
  ], 14, y);

  y = sectionTitle(doc, 'PAYE COMPUTATION SUMMARY (NTA 2025)', y);

  const [pMonth, pYear] = period.split('');
  const periodLedger = ledger.filter(l => {
    const d = new Date(l.date);
    return MONTHS_LIST[d.getMonth()] === pMonth && d.getFullYear().toString() === pYear;
  });
  const totalPayroll = periodLedger.filter(l => l.type === 'expense' && l.description.toLowerCase().includes('salary')).reduce((s,l) => s + l.amount, 0);
  const payeDeducted = periodLedger.filter(l => l.type === 'expense' && l.description.toLowerCase().includes('salary')).reduce((s,l) => s + l.taxAmount, 0);

  autoTable(doc, {
    startY: y,
    head: [['Item', 'Description', 'Amount (NGN)']],
    body: [
      ['1', 'Total Gross Payroll for period', fmt(totalPayroll || 0)],
      ['2', 'Total Pension Deductions (8%)', fmt((totalPayroll || 0) * 0.08)],
      ['3', 'Total NHIS Deductions (1.5%)', fmt((totalPayroll || 0) * 0.015)],
      ['4', 'Total NHF Deductions (2.5%)', fmt((totalPayroll || 0) * 0.025)],
      ['5', 'Total Taxable Emoluments (after deductions)', fmt(Math.max(0, (totalPayroll || 0) * 0.895))],
      ['6', 'TOTAL PAYE DEDUCTED (per NTA 2025 bands)', fmt(payeDeducted || 0)],
      ['7', 'PAYE TO REMIT TO STATE IRS', fmt(payeDeducted || 0)],
    ],
    theme: 'grid',
    headStyles: { fillColor: GREEN, textColor: WHITE, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: DARK },
    alternateRowStyles: { fillColor: LGRAY },
    columnStyles: { 0: { cellWidth: 12 }, 2: { halign: 'right', fontStyle: 'bold' } },
    margin: { left: 14, right: 14 },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  y = sectionTitle(doc, 'NTA 2025 PAYE BANDS (EFFECTIVE 1 JAN 2026)', y);
  autoTable(doc, {
    startY: y,
    head: [['Annual Income Band', 'Rate', 'Note']],
    body: [
      ['First ₦800,000', '0%', 'Tax-free band -- replaces CRA'],
      ['Next ₦2,200,000 (₦800k-₦3M)', '15%', ''],
      ['Next ₦9,000,000 (₦3M-₦12M)', '18%', ''],
      ['Next ₦13,000,000 (₦12M-₦25M)', '21%', ''],
      ['Next ₦25,000,000 (₦25M-₦50M)', '23%', ''],
      ['Above ₦50,000,000', '25%', 'Maximum rate'],
    ],
    theme: 'grid',
    headStyles: { fillColor: GREEN, textColor: WHITE, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8.5, textColor: DARK },
    alternateRowStyles: { fillColor: LGRAY },
    margin: { left: 14, right: 14 },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  if (y > 220) { doc.addPage(); y = 20; }
  y = sectionTitle(doc, 'EMPLOYEE PAYE SCHEDULE', y);
  doc.setFontSize(8); doc.setTextColor(100, 116, 139); doc.setFont('helvetica', 'italic');
  doc.text('Complete this table for each employee. Attach individual payslips as supporting documents.', 14, y);
  y += 7;

  const empRows: string[][] = [];
  for (let i = 1; i <= Math.max(5, company.employeeCount || 5); i++) {
    empRows.push([i.toString(), '', '', '', '', '', '']);
  }
  autoTable(doc, {
    startY: y,
    head: [['#', 'Employee Name', 'TIN / NSITF No.', 'Gross Salary (₦)', 'Deductions (₦)', 'Taxable Income (₦)', 'PAYE Deducted (₦)']],
    body: empRows,
    theme: 'grid',
    headStyles: { fillColor: GREEN, textColor: WHITE, fontStyle: 'bold', fontSize: 7.5 },
    bodyStyles: { fontSize: 8, textColor: DARK, minCellHeight: 10 },
    columnStyles: { 0: { cellWidth: 10 } },
    margin: { left: 14, right: 14 },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  y = sectionTitle(doc, 'FILING INSTRUCTIONS', y);
  doc.setFontSize(8); doc.setTextColor(...DARK); doc.setFont('helvetica', 'normal');
  [
    '1. File this schedule with your State Internal Revenue Service (SIRS) by the 10th of the following month.',
    `2. For ${company.state}: Visit the ${company.state} State IRS portal or nearest tax office for electronic filing.`,
    '3. Remit total PAYE (Line 7) via REMITA or bank transfer to the State IRS collection account.',
    '4. Obtain and retain the payment receipt / confirmation as proof of remittance.',
    '5. File annual employer return (Form H1) by 31 January each year for the preceding year.',
    '6. Penalty for non-deduction: 40% of undeducted tax (NTA 2025, stiffened enforcement).',
    "7. PAYE is due to the State IRS of the employee\"s state of RESIDENCE, not the business location.",
  ].forEach(line => { doc.text(line, 14, y); y += 7; });
}

// ─── WHT Schedule PDF ────────────────────────────────────────────────────────
async function generateWHTSchedule(doc: any, company: Company, period: string, ledger: LedgerEntry[], obligations: TaxObligation[]) {
  drawHeader(doc, 'Withholding Tax (WHT) Schedule', `Period: ${period}  ·  Due: 21st of following month  ·  File with: Nigeria Revenue Service (NRS)`, company);
  let y = 72;

  y = sectionTitle(doc, 'AGENT DETAILS', y);
  y = infoBox(doc, [
    ['Withholding Tax Agent', company.name],
    ['TIN', company.tin || 'Not provided'],
    ['Period', period],
    ['Filing Deadline', `21st of the month following ${period}`],
    ['Filing Authority', 'Nigeria Revenue Service (NRS)'],
    ['WHT Rates (NTA 2025)', '5% for goods/construction · 10% for services/professional fees'],
  ], 14, y);

  y = sectionTitle(doc, 'WHT COMPUTATION SUMMARY', y);

  const [pMonth, pYear] = period.split('');
  const periodExpenses = ledger.filter(l => {
    const d = new Date(l.date);
    return l.type === 'expense' && MONTHS_LIST[d.getMonth()] === pMonth && d.getFullYear().toString() === pYear;
  });
  const totalWHT = periodExpenses.reduce((s, l) => s + l.taxAmount, 0);
  const totalPayments = periodExpenses.reduce((s, l) => s + l.amount, 0);

  autoTable(doc, {
    startY: y,
    head: [['Item', 'Category', 'Gross Payments (₦)', 'WHT Rate', 'WHT Amount (₦)']],
    body: [
      ['1', 'Supply of goods', fmt(totalPayments * 0.5), '5%', fmt(totalWHT * 0.5)],
      ['2', 'Professional / consulting services', fmt(totalPayments * 0.4), '10%', fmt(totalWHT * 0.4)],
      ['3', 'Other services', fmt(totalPayments * 0.1), '10%', fmt(totalWHT * 0.1)],
      ['', 'TOTAL WHT TO REMIT TO NRS', fmt(totalPayments), '', fmt(totalWHT)],
    ],
    theme: 'grid',
    headStyles: { fillColor: GREEN, textColor: WHITE, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: DARK },
    alternateRowStyles: { fillColor: LGRAY },
    columnStyles: { 2: { halign: 'right' }, 4: { halign: 'right', fontStyle: 'bold' } },
    margin: { left: 14, right: 14 },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  y = sectionTitle(doc, 'VENDOR PAYMENT DETAIL', y);
  if (periodExpenses.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['Date', 'Vendor / Description', 'Payment Amount (₦)', 'WHT Rate', 'WHT Deducted (₦)', 'Net Paid (₦)']],
      body: periodExpenses.map(l => {
        const rate = l.taxAmount > 0 ? ((l.taxAmount / l.amount) * 100).toFixed(0) + '%' : '--';
        return [l.date, l.description.slice(0, 40), fmt(l.amount), rate, fmt(l.taxAmount), fmt(l.amount - l.taxAmount)];
      }),
      theme: 'grid',
      headStyles: { fillColor: GREEN, textColor: WHITE, fontStyle: 'bold', fontSize: 7.5 },
      bodyStyles: { fontSize: 8, textColor: DARK },
      alternateRowStyles: { fillColor: LGRAY },
      columnStyles: { 2: { halign: 'right' }, 4: { halign: 'right', fontStyle: 'bold' }, 5: { halign: 'right' } },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  if (y > 230) { doc.addPage(); y = 20; }
  y = sectionTitle(doc, 'WHT CREDIT NOTE ISSUANCE', y);
  doc.setFontSize(8); doc.setTextColor(100, 116, 139); doc.setFont('helvetica', 'italic');
  doc.text('After remitting WHT to NRS, issue credit notes to each vendor. Fill below:', 14, y); y += 8;
  autoTable(doc, {
    startY: y,
    head: [['Vendor Name', 'Vendor TIN', 'Amount Paid (₦)', 'WHT Deducted (₦)', 'Credit Note No.', 'Date Issued']],
    body: Array(Math.max(3, periodExpenses.length)).fill(['', '', '', '', '', '']),
    theme: 'grid',
    headStyles: { fillColor: GREEN, textColor: WHITE, fontStyle: 'bold', fontSize: 7.5 },
    bodyStyles: { fontSize: 8, minCellHeight: 10, textColor: DARK },
    margin: { left: 14, right: 14 },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  y = sectionTitle(doc, 'FILING INSTRUCTIONS', y);
  doc.setFontSize(8); doc.setTextColor(...DARK); doc.setFont('helvetica', 'normal');
  [
    '1. File this WHT schedule with NRS via the TaxPro Max portal by the 21st of the following month.',
    '2. Remit total WHT via REMITA to the NRS WHT collection account.',
    '3. Issue WHT credit notes to all vendors within 30 days of deduction.',
    '4. Small businesses with valid TIN are exempt from WHT on transactions ≤₦2M/month (NTA 2025).',
    '5. Penalty for failure to deduct: 40% of undeducted WHT amount -- a significant increase under NTA 2025.',
    '6. Digital asset transactions: 10% WHT now applies (new under NTA 2025).',
  ].forEach(line => { doc.text(line, 14, y); y += 7; });
}

// ─── CIT Computation PDF ─────────────────────────────────────────────────────
async function generateCITReturn(doc: any, company: Company, period: string, ledger: LedgerEntry[], obligations: TaxObligation[]) {
  drawHeader(doc, 'Company Income Tax (CIT) Computation', `Period: ${period}  ·  Due: 6 months after year-end  ·  File with: Nigeria Revenue Service (NRS)`, company);
  let y = 72;

  y = sectionTitle(doc, 'COMPANY DETAILS', y);
  y = infoBox(doc, [
    ['Company Name', company.name],
    ['TIN', company.tin || 'Not provided'],
    ['RC Number', company.rcNumber || 'Not provided'],
    ['Financial Year End', company.yearEnd],
    ['Industry', company.industry],
    ['State', company.state],
    ['CIT Period', period],
    ['Filing Authority', 'Nigeria Revenue Service (NRS) -- TaxPro Max Portal'],
  ], 14, y);

  y = sectionTitle(doc, 'INCOME STATEMENT SUMMARY', y);

  const totalRevenue = ledger.filter(l => l.type === 'sale').reduce((s, l) => s + l.amount, 0);
  const totalExpenses = ledger.filter(l => l.type === 'expense').reduce((s, l) => s + l.amount, 0);
  const grossProfit = totalRevenue - totalExpenses;
  const isSmallCompany = totalRevenue <= 50_000_000;
  const citRate = isSmallCompany ? 0 : 0.30;
  const devLevyRate = isSmallCompany ? 0 : 0.04;
  const taxableProfit = Math.max(0, grossProfit);
  const citLiability = taxableProfit * citRate;
  const devLevy = taxableProfit * devLevyRate;
  const totalTax = citLiability + devLevy;

  autoTable(doc, {
    startY: y,
    head: [['Line', 'Description', 'Amount (NGN)']],
    body: [
      ['1', 'Total Revenue / Turnover', fmt(totalRevenue)],
      ['2', 'Total Allowable Deductions / Expenses', fmt(totalExpenses)],
      ['3', 'GROSS PROFIT (Line 1 minus Line 2)', fmt(grossProfit)],
      ['4', 'Capital Allowances (attach Schedule A)', '0.00'],
      ['5', 'Other Adjustments (add/deduct)', '0.00'],
      ['6', 'ASSESSABLE PROFIT (Line 3 + 4 + 5)', fmt(taxableProfit)],
      ['7', `CIT Rate: ${isSmallCompany ? '0% (Small Company Exemption)' : '30%'}`, isSmallCompany ? '₦0.00' : fmt(citLiability)],
      ['8', `Development Levy: ${isSmallCompany ? '0% (Exempt)' : '4% of assessable profit'}`, isSmallCompany ? '₦0.00' : fmt(devLevy)],
      ['9', 'TOTAL CIT + DEVELOPMENT LEVY DUE', fmt(totalTax)],
    ],
    theme: 'grid',
    headStyles: { fillColor: GREEN, textColor: WHITE, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: DARK },
    alternateRowStyles: { fillColor: LGRAY },
    columnStyles: { 0: { cellWidth: 12 }, 2: { halign: 'right', fontStyle: 'bold' } },
    margin: { left: 14, right: 14 },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // Small company status box
  doc.setFillColor(isSmallCompany ? 220 : 254, isSmallCompany ? 252 : 242, isSmallCompany ? 231 : 231);
  doc.roundedRect(14, y, doc.internal.pageSize.getWidth() - 28, 22, 3, 3, 'F');
  doc.setTextColor(isSmallCompany ? 0 : 180, isSmallCompany ? 100 : 50, isSmallCompany ? 0 : 0);
  doc.setFontSize(9); doc.setFont('helvetica', 'bold');
  doc.text(isSmallCompany ? 'SMALL COMPANY EXEMPTION APPLIES' : 'STANDARD COMPANY -- CIT APPLIES', 20, y + 8);
  doc.setFontSize(8); doc.setFont('helvetica', 'normal');
  doc.text(isSmallCompany
    ? `Turnover ≤₦50M: 0% CIT, 0% Dev Levy, 0% CGT under NTA 2025. Professional service firms do not qualify.`
    : `Turnover >₦50M or fixed assets >₦250M: 30% CIT + 4% Development Levy applies.`,
    20, y + 16);
  y += 30;

  if (y > 210) { doc.addPage(); y = 20; }
  y = sectionTitle(doc, 'NTA 2025 CIT RULES', y);
  autoTable(doc, {
    startY: y,
    head: [['Category', 'Threshold', 'CIT Rate', 'Dev Levy', 'CGT']],
    body: [
      ['Small Company', 'Turnover ≤₦50M AND fixed assets ≤₦250M', '0%', '0%', '0%'],
      ['Standard Company', 'All other companies', '30%', '4%', 'Applicable'],
        ['Professional Services', 'Law, accounting, consulting (cannot be small)', '30%', '4%', 'Applicable'],
    ],
    theme: 'grid',
    headStyles: { fillColor: GREEN, textColor: WHITE, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: DARK },
    alternateRowStyles: { fillColor: LGRAY },
    margin: { left: 14, right: 14 },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  y = sectionTitle(doc, 'FILING INSTRUCTIONS', y);
  doc.setFontSize(8); doc.setTextColor(...DARK); doc.setFont('helvetica', 'normal');
  [
    `1. File CIT return via NRS TaxPro Max portal (www.nrs.gov.ng) within 6 months of year-end (${company.yearEnd}).`,
    '2. Attach audited financial statements (mandatory for non-small companies).',
    '3. Attach tax computation showing assessable profit, capital allowances, and adjustments.',
    '4. Development Levy (4%) replaces: TET Levy, IT Development Levy, NASENI Levy, Police Trust Fund (NTA 2025).',
    '5. Small company threshold raised from ₦25M to ₦50M turnover under NTA 2025 (effective 1 Jan 2026).',
    '6. Penalty for non-filing: ₦50,000 + ₦25,000 per day of default.',
  ].forEach(line => { doc.text(line, 14, y); y += 7; });
}

// ─── PIT Return PDF (Individual) ─────────────────────────────────────────────
async function generatePITReturn(doc: any, company: Company, period: string, ledger: LedgerEntry[], obligations: TaxObligation[]) {
  drawHeader(doc, 'Personal Income Tax -- Self-Assessment Return (Form A)', `Tax Year: ${period}  ·  Due: 31 March annually  ·  File with: ${company.state} State IRS`, company);
  let y = 72;

  y = sectionTitle(doc, 'TAXPAYER DETAILS', y);
  y = infoBox(doc, [
    ['Full Name', company.name],
    ['TIN', company.tin || 'Not provided'],
    ['State of Residence', company.state],
    ['Tax Authority', `${company.state} State Internal Revenue Service`],
    ['Employment Type', company.employmentType || 'Not specified'],
    ['Tax Year', period],
    ['Filing Deadline', '31 March annually'],
    ['Return Type', 'Annual Self-Assessment (Form A)'],
  ], 14, y);

  y = sectionTitle(doc, 'INCOME DECLARATION', y);

  const totalIncome = ledger.filter(l => l.type === 'sale').reduce((s, l) => s + l.amount, 0);
  const totalExpenses = ledger.filter(l => l.type === 'expense').reduce((s, l) => s + l.amount, 0);
  const annualIncome = company.annualIncome || totalIncome || 0;
  const pension = annualIncome * 0.08;
  const nhis = annualIncome * 0.015;
  const nhf = annualIncome * 0.025;
  const rentRelief = Math.min(annualIncome * 0.2, 500_000);
  const taxableIncome = Math.max(0, annualIncome - pension - nhis - nhf - rentRelief);
  const taxFreeAmount = Math.min(taxableIncome, 800_000);
  const pitLiability = taxableIncome <= 800_000 ? 0
    : taxableIncome <= 3_000_000 ? (taxableIncome - 800_000) * 0.15
    : taxableIncome <= 12_000_000 ? 330_000 + (taxableIncome - 3_000_000) * 0.18
    : taxableIncome <= 25_000_000 ? 1_950_000 + (taxableIncome - 12_000_000) * 0.21
    : taxableIncome <= 50_000_000 ? 4_680_000 + (taxableIncome - 25_000_000) * 0.23
    : 10_430_000 + (taxableIncome - 50_000_000) * 0.25;

  autoTable(doc, {
    startY: y,
    head: [['Line', 'Income / Deduction', 'Amount (NGN)']],
    body: [
      ['1', 'Employment Income (Salary, allowances, bonuses)', fmt(annualIncome * (company.employmentType === 'both' ? 0.6 : company.employmentType === 'employed' ? 1 : 0))],
      ['2', 'Business / Self-Employment Income', fmt(annualIncome * (company.employmentType === 'both' ? 0.4 : company.employmentType === 'self-employed' ? 1 : 0))],
      ['3', 'Rental Income', '0.00'],
      ['4', 'Investment Income (dividends, interest)', '0.00'],
      ['5', 'Other Income', '0.00'],
      ['6', 'TOTAL GROSS INCOME', fmt(annualIncome)],
      ['', '', ''],
      ['7', 'Pension Contribution (8% of gross)', `(${fmt(pension)})`],
      ['8', 'NHIS Contribution (1.5% of gross)', `(${fmt(nhis)})`],
      ['9', 'NHF Contribution (2.5% of gross)', `(${fmt(nhf)})`],
      ['10', 'Rent Relief (20% of annual rent paid, max ₦500k) -- NEW NTA 2025', `(${fmt(rentRelief)})`],
      ['11', 'Life Assurance Premium (max ₦100,000)', '(0.00)'],
      ['12', 'TOTAL DEDUCTIONS', `(${fmt(pension + nhis + nhf + rentRelief)})`],
      ['13', 'TAXABLE INCOME (Line 6 minus Line 12)', fmt(taxableIncome)],
      ['', '', ''],
      ['14', 'Tax-Free Band (first ₦800,000 @ 0%)', fmt(Math.min(taxableIncome, 800_000))],
      ['15', 'PIT COMPUTED (NTA 2025 progressive bands)', fmt(pitLiability)],
      ['16', 'PAYE Already Paid by Employer (if employed)', '0.00'],
      ['17', 'BALANCE OF TAX DUE / (REFUNDABLE)', fmt(pitLiability)],
    ],
    theme: 'grid',
    headStyles: { fillColor: GREEN, textColor: WHITE, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8.5, textColor: DARK },
    alternateRowStyles: { fillColor: LGRAY },
    columnStyles: { 0: { cellWidth: 12 }, 2: { halign: 'right', fontStyle: 'bold' } },
    margin: { left: 14, right: 14 },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  if (y > 210) { doc.addPage(); y = 20; }
  y = sectionTitle(doc, 'PIT BAND BREAKDOWN (NTA 2025)', y);
  autoTable(doc, {
    startY: y,
    head: [['Band', 'Annual Income Range', 'Rate', 'Max Tax on Band']],
    body: [
      ['1', '₦0 -- ₦800,000', '0%', '₦0'],
      ['2', '₦800,001 -- ₦3,000,000', '15%', '₦330,000'],
      ['3', '₦3,000,001 -- ₦12,000,000', '18%', '₦1,620,000'],
      ['4', '₦12,000,001 -- ₦25,000,000', '21%', '₦2,730,000'],
      ['5', '₦25,000,001 -- ₦50,000,000', '23%', '₦5,750,000'],
      ['6', 'Above ₦50,000,000', '25%', 'No cap'],
    ],
    theme: 'grid',
    headStyles: { fillColor: GREEN, textColor: WHITE, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: DARK },
    alternateRowStyles: { fillColor: LGRAY },
    columnStyles: { 2: { fontStyle: 'bold', halign: 'center' }, 3: { halign: 'right' } },
    margin: { left: 14, right: 14 },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  y = sectionTitle(doc, 'FILING INSTRUCTIONS', y);
  doc.setFontSize(8); doc.setTextColor(...DARK); doc.setFont('helvetica', 'normal');
  [
    `1. File Form A with ${company.state} State IRS by 31 March. Visit your state IRS portal or nearest office.`,
    '2. If employed, attach all P60 / payslips showing PAYE deducted. Reconcile with Line 16 above.',
    '3. If self-employed, attach business income statement and expense receipts.',
    '4. Attach proof of pension contributions, NHF payments, and annual rent receipts.',
    '5. Rent Relief: 20% of actual rent paid during the year, maximum ₦500,000 (NTA 2025 -- replaces CRA).',
    '6. After filing and payment, apply for your Tax Clearance Certificate (TCC) from your State IRS.',
    '7. Self-employed: make quarterly advance payments -- due 31 Mar, 30 Jun, 30 Sep, 31 Dec.',
    '8. Penalty for late filing: ₦50,000 + ₦25,000 per day. Late payment: 10% p.a. + MPR interest.',
  ].forEach(line => { doc.text(line, 14, y); y += 7; });
}

// ─── Tax Compliance Summary PDF ───────────────────────────────────────────────
async function generateComplianceSummary(doc: any, company: Company, period: string, ledger: LedgerEntry[], obligations: TaxObligation[]) {
  drawHeader(doc, 'Tax Compliance Summary Report', `Period: ${period}  ·  All obligations  ·  Nigeria Tax Act 2025`, company);
  let y = 72;

  const totalSales = ledger.filter(l => l.type === 'sale').reduce((s, l) => s + l.amount, 0);
  const totalExpenses = ledger.filter(l => l.type === 'expense').reduce((s, l) => s + l.amount, 0);
  const vatCollected = ledger.filter(l => l.type === 'sale').reduce((s, l) => s + l.taxAmount, 0);
  const whtDeducted = ledger.filter(l => l.type === 'expense').reduce((s, l) => s + l.taxAmount, 0);
  const filed = obligations.filter(o => o.status === TaxStatus.FILED);
  const due = obligations.filter(o => o.status === TaxStatus.DUE || o.status === TaxStatus.OVERDUE);
  const totalTaxPaid = filed.reduce((s, o) => s + (o.actualAmount || o.estimatedAmount), 0);

  y = sectionTitle(doc, 'FINANCIAL SUMMARY', y);
  autoTable(doc, {
    startY: y,
    head: [['Metric', 'Amount (NGN)']],
    body: [
      ['Total Revenue / Sales', fmt(totalSales)],
      ['Total Expenses', fmt(totalExpenses)],
      ['Net Position', fmt(totalSales - totalExpenses)],
      ['Output VAT Collected (7.5%)', fmt(vatCollected)],
      ['Input VAT on Purchases', fmt(ledger.filter(l=>l.type==='expense').reduce((s,l)=>s+l.taxAmount,0))],
      ['Net VAT Payable', fmt(Math.max(0, vatCollected - ledger.filter(l=>l.type==='expense').reduce((s,l)=>s+l.taxAmount,0)))],
      ['WHT Deducted from Vendors', fmt(whtDeducted)],
      ['Total Tax Paid (Filed Obligations)', fmt(totalTaxPaid)],
    ],
    theme: 'grid',
    headStyles: { fillColor: GREEN, textColor: WHITE, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: DARK },
    alternateRowStyles: { fillColor: LGRAY },
    columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
    margin: { left: 14, right: 14 },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  y = sectionTitle(doc, 'TAX OBLIGATIONS STATUS', y);
  autoTable(doc, {
    startY: y,
    head: [['Tax', 'Period', 'Due Date', 'Amount (NGN)', 'Status', 'Filed On']],
    body: obligations.map(o => [
      o.type, o.period, o.dueDate,
      fmt(o.actualAmount || o.estimatedAmount),
      o.status,
      o.paymentDate || '--',
    ]),
    theme: 'grid',
    headStyles: { fillColor: GREEN, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: DARK },
    alternateRowStyles: { fillColor: LGRAY },
    didDrawCell: (data: any) => {
      if (data.column.index === 4 && data.section === 'body') {
        const status = data.cell.raw as string;
        if (status === 'Filed') doc.setTextColor(...GREEN);
        else if (status === 'Overdue') doc.setTextColor(...RED);
        else if (status === 'Due') doc.setTextColor(...AMBER);
        doc.setFont('helvetica', 'bold');
      }
    },
    margin: { left: 14, right: 14 },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // Compliance bar
  doc.setFillColor(...LGRAY);
  doc.roundedRect(14, y, doc.internal.pageSize.getWidth() - 28, 22, 3, 3, 'F');
  doc.setTextColor(...DARK); doc.setFontSize(10); doc.setFont('helvetica', 'bold');
  doc.text(`Compliance Score: ${company.complianceScore}/100`, 20, y + 8);
  const scoreColor: [number,number,number] = company.complianceScore >= 80 ? GREEN : company.complianceScore >= 50 ? AMBER : RED;
  const bw = ((doc.internal.pageSize.getWidth() - 90) * company.complianceScore) / 100;
  doc.setFillColor(220,220,220); doc.roundedRect(20, y + 11, doc.internal.pageSize.getWidth() - 90, 4, 1, 1, 'F');
  doc.setFillColor(...scoreColor); doc.roundedRect(20, y + 11, bw, 4, 1, 1, 'F');
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(100,116,139);
  doc.text(`Filed: ${filed.length}  ·  Due/Overdue: ${due.length}  ·  Total: ${obligations.length}`, 20, y + 20);
  y += 30;

  if (y > 200) { doc.addPage(); y = 20; }
  y = sectionTitle(doc, 'NTA 2025 TAX CALENDAR REFERENCE', y);
  autoTable(doc, {
    startY: y,
    head: [['Tax', 'Rate', 'Filing Deadline', 'Authority', 'Key Change (NTA 2025)']],
    body: [
      ['VAT', '7.5%', '21st of next month', 'NRS', 'E-invoicing mandatory (phased)'],
      ['PAYE', '0-25%', '10th of next month', 'State IRS', 'CRA abolished → Rent Relief ₦500k cap'],
      ['WHT', '5% / 10%', '21st of next month', 'NRS', 'Non-deduction penalty now 40%'],
      ['CIT', '0% or 30%', '6 months after year-end', 'NRS', 'Small company threshold: ₦25M → ₦50M'],
      ['Dev Levy', '4%', 'With CIT return', 'NRS', 'Replaces TET, IT, NASENI, Police levies'],
      ['PIT', '0-25%', '31 March annually', 'State IRS', 'Same bands as PAYE. Self-employed: quarterly advance'],
    ],
    theme: 'grid',
    headStyles: { fillColor: GREEN, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 7.5, textColor: DARK },
    alternateRowStyles: { fillColor: LGRAY },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 18 } },
    margin: { left: 14, right: 14 },
  });
}

// ─── Report type definitions ──────────────────────────────────────────────────
const REPORT_TYPES = [
  { id: 'compliance', label: "Tax Compliance Summary", desc: 'Full overview -- all obligations, financial summary, compliance score', icon: null, color:'bg-slate-50 border-slate-200', always: true },
  { id: 'vat', label: "VAT Return (Form 002)", desc: 'Monthly VAT return with output/input VAT computation. File with NRS by 21st.', icon: null, color:'bg-blue-50 border-blue-200', requires: 'vat' },
  { id: 'paye', label: "PAYE Monthly Schedule", desc: 'Employee payroll PAYE schedule with NTA 2025 bands. File with State IRS by 10th.', icon: null, color:'bg-purple-50 border-purple-200', requires: 'paye' },
  { id: 'wht', label: "WHT Schedule", desc: 'Withholding tax deduction schedule with vendor breakdown. File with NRS by 21st.', icon: null, color:'bg-amber-50 border-amber-200', requires: 'wht' },
  { id: 'cit', label: "CIT Computation Sheet", desc: 'Company Income Tax computation + small company check. File with NRS within 6 months.', icon: null, color:'bg-green-50 border-green-200', requires: 'cit' },
  { id: 'pit', label: "PIT Self-Assessment (Form A)", desc: 'Personal Income Tax return with all deductions. File with State IRS by 31 March.', icon: null, color:'bg-rose-50 border-rose-200', requires: 'pit' },
];

interface TaxExportProps { company: Company; onNavigate?: (v: string) => void; }

export const TaxExport: React.FC<TaxExportProps> = ({ company, onNavigate }) => {
  const [period, setPeriod] = useState(`${MONTHS_LIST[new Date().getMonth()]} ${new Date().getFullYear()}`);
  const [reportType, setReportType] = useState('compliance');
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [error, setError] = useState('');
  const [obligations, setObligations] = useState<TaxObligation[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const isIndividual = company.entityType === EntityType.INDIVIDUAL;

  useEffect(() => {
    setLoading(true);
    Promise.all([
      db.getObligations(company.id),
      db.getLedgers(company.id),
    ]).then(([obs, led]) => {
      setObligations(obs as TaxObligation[]);
      setLedgerEntries(led as LedgerEntry[]);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [company.id]);

  const totalSales    = ledgerEntries.filter(l => l.type === 'sale').reduce((s, l) => s + l.amount, 0);
  const totalExpenses = ledgerEntries.filter(l => l.type === 'expense').reduce((s, l) => s + l.amount, 0);
  const vatCollected  = ledgerEntries.filter(l => l.type === 'sale').reduce((s, l) => s + l.taxAmount, 0);
  const whtDeducted   = ledgerEntries.filter(l => l.type === 'expense').reduce((s, l) => s + l.taxAmount, 0);
  const filed = obligations.filter(o => o.status === TaxStatus.FILED);
  const overdue = obligations.filter(o => o.status === TaxStatus.OVERDUE);

  const availableReports = REPORT_TYPES.filter(r => {
    if (r.always) return true;
    if (r.requires === 'pit') return isIndividual;
    if (r.requires === 'vat') return company.collectsVat && !isIndividual;
    if (r.requires === 'paye') return company.hasEmployees && !isIndividual;
    if (r.requires === 'wht') return company.paysVendors && !isIndividual;
    if (r.requires === 'cit') return !isIndividual;
    return false;
  });

  const generatePDF = async () => {
    setGenerating(true); setError('');
    try {
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      switch (reportType) {
        case 'vat':      await generateVATReturn(doc, company, period, ledgerEntries, obligations); break;
        case 'paye':     await generatePAYESchedule(doc, company, period, ledgerEntries, obligations); break;
        case 'wht':      await generateWHTSchedule(doc, company, period, ledgerEntries, obligations); break;
        case 'cit':      await generateCITReturn(doc, company, period, ledgerEntries, obligations); break;
        case 'pit':      await generatePITReturn(doc, company, period, ledgerEntries, obligations); break;
        default:         await generateComplianceSummary(doc, company, period, ledgerEntries, obligations); break;
      }

      addFooters(doc);
      const rLabel = availableReports.find(r => r.id === reportType)?.label.replace(/\s+/g,'_') || 'Report';
      const filename = `TaxPulse_${company.name.replace(/\s+/g,'_')}_${rLabel}_${period.replace(/\s+/g,'_')}.pdf`;
      doc.save(filename);
      try { localStorage.setItem('taxpulse_pdf_generated_' + company.id, '1'); } catch {}
      setGenerated(true);
      setTimeout(() => setGenerated(false), 4000);
    } catch (e: any) {
      setError(`Failed to generate PDF: ${e.message}`);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="text-4xl animate-pulse"><span style={{display:"inline-flex",alignItems:"center",verticalAlign:"middle"}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg></span></div>
        <p className="text-slate-500 text-sm">Loading your data...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-4xl">
      <header>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold text-slate-900">Tax Filing Returns</h1>
          <span className="bg-cac-green text-white text-xs font-black px-2.5 py-1 rounded-full">NTA 2025</span>
        </div>
        <p className="text-slate-500 text-sm">
          Generate pre-filled tax returns and filing schedules aligned to NRS requirements. Each PDF includes the correct fields, filing instructions, and NTA 2025 rules.
        </p>
      </header>

      {/* Filing education banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-xs font-bold text-blue-800 mb-2"><span style={{display:"inline-flex",alignItems:"center",verticalAlign:"middle"}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg></span> How tax filing works in Nigeria (NTA 2025)</p>
        <div className="grid md:grid-cols-2 gap-2 text-xs text-blue-700">
          {isIndividual ? <>
            <p>• <strong>PIT Return (Form A):</strong> File with your State IRS by 31 March each year</p>
            <p>• <strong>Employed:</strong> Employer deducts PAYE monthly -- still file annual Form A to reconcile</p>
            <p>• <strong>Self-employed:</strong> Make quarterly advance payments + annual return by 31 March</p>
            <p>• <strong>Tax Clearance Certificate (TCC):</strong> Apply after filing -- needed for contracts, travel</p>
          </> : <>
            <p>• <strong>VAT:</strong> File Form 002 with NRS by 21st of each month (if VAT-registered)</p>
            <p>• <strong>PAYE:</strong> File schedule with State IRS by 10th of each month (if you have staff)</p>
            <p>• <strong>WHT:</strong> File schedule with NRS by 21st of each month (if you pay vendors)</p>
            <p>• <strong>CIT:</strong> File with NRS within 6 months of your financial year-end</p>
          </>}
        </div>
      </div>

      <div className="grid md:grid-cols-5 gap-6">
        {/* Report selector */}
        <div className="md:col-span-3 space-y-3">
          <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Select Return Type</h2>
          <div className="space-y-2">
            {availableReports.map(r => (
              <button
                key={r.id}
                onClick={() => setReportType(r.id)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                  reportType === r.id
                    ? 'border-cac-green bg-cac-green/5'
                    : `${r.color} hover:border-cac-green/40`
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl mt-0.5">{r.icon}</span>
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{r.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{r.desc}</p>
                  </div>
                  {reportType === r.id && <span className="ml-auto text-cac-green font-black text-lg"><span style={{display:"inline-flex",alignItems:"center",verticalAlign:"middle"}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span></span>}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Config + preview */}
        <div className="md:col-span-2 space-y-4">
          <Card className="space-y-4">
            <h2 className="font-bold text-slate-800">Configuration</h2>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Period</label>
              <select
                value={period}
                onChange={e => setPeriod(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cac-green bg-white"
              >
                {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 space-y-1.5">
              <p className="text-xs font-bold text-slate-600 uppercase">Live data preview</p>
              {[
                ['Revenue', fmt(totalSales), 'text-cac-green'],
                ['Expenses', fmt(totalExpenses), 'text-slate-700'],
                ['VAT Collected', fmt(vatCollected), 'text-amber-600'],
                ['WHT Deducted', fmt(whtDeducted), 'text-purple-600'],
                ['Obligations', `${obligations.length} (${filed.length} filed)`, 'text-slate-700'],
                ['Overdue', overdue.length.toString(), overdue.length > 0 ? 'text-red-600 font-black' : 'text-slate-500'],
              ].map(([label, val, cls]) => (
                <div key={label} className="flex justify-between text-xs">
                  <span className="text-slate-500">{label}</span>
                  <span className={`font-bold ${cls}`}>{val}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Filing guide for selected report */}
          <Card className="space-y-2 text-xs">
            <p className="font-bold text-slate-800">
              {availableReports.find(r => r.id === reportType)?.icon}{''}
              {availableReports.find(r => r.id === reportType)?.label}
            </p>
            {reportType === 'compliance' && <><p className="text-slate-500">Use this for your accountant, internal records, or as a working document before filing individual returns.</p></>}
            {reportType === 'vat' && <><p className="text-slate-500">File on NRS e-Services portal. Attach this PDF and all sales invoices/purchase receipts. Remit via REMITA.</p><p className="text-amber-700 font-semibold mt-1">Deadline: 21st of following month</p></>}
            {reportType === 'paye' && <><p className="text-slate-500">File with {company.state} State IRS. Each employee needs their own PAYE computed. Attach individual payslips.</p><p className="text-amber-700 font-semibold mt-1">Deadline: 10th of following month</p></>}
            {reportType === 'wht' && <><p className="text-slate-500">File on NRS TaxPro Max. Issue credit notes to all vendors. Small businesses with TIN exempt on ≤₦2M/month.</p><p className="text-amber-700 font-semibold mt-1">Deadline: 21st of following month</p></>}
            {reportType === 'cit' && <><p className="text-slate-500">File on NRS TaxPro Max with audited financial statements. Check small company exemption (≤₦50M turnover).</p><p className="text-amber-700 font-semibold mt-1">Deadline: 6 months after year-end</p></>}
            {reportType === 'pit' && <><p className="text-slate-500">File Form A with {company.state} State IRS. Attach payslips, rent receipts, pension statements, business accounts.</p><p className="text-amber-700 font-semibold mt-1">Deadline: 31 March annually</p></>}
          </Card>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          <p className="font-bold"><span style={{display:"inline-flex",alignItems:"center",verticalAlign:"middle"}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span> {error}</p>
        </div>
      )}

      {generated && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-cac-green font-bold flex items-center gap-2">
          <span style={{display:"inline-flex",alignItems:"center",verticalAlign:"middle"}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></span> PDF downloaded! Upload it to the relevant tax portal or share with your accountant.
        </div>
      )}

      <Button onClick={generatePDF} disabled={generating} className="w-full py-4 text-base">
        {generating ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Generating {availableReports.find(r=>r.id===reportType)?.label}...
          </span>
        ) : (
          `Generate ${availableReports.find(r=>r.id===reportType)?.label}`
        )}
      </Button>

      <p className="text-xs text-slate-400 text-center">
        PDFs are generated entirely in your browser -- no data leaves your device. All returns are based on NTA 2025 rules effective 1 January 2026.
      </p>
    </div>
  );
};
