import React, { useState, useEffect } from 'react';
import { Company, TaxStatus, TaxType } from '../types';
import { Card, Button } from '../components/Shared';
import * as db from '../services/db';

// jsPDF is imported dynamically to avoid blocking the app if not installed
// Run: npm install jspdf jspdf-autotable

const fmt = (n: number) => '₦' + n.toLocaleString(undefined, { maximumFractionDigits: 2 });

const PERIODS = [
  'January 2026', 'February 2026', 'March 2026', 'April 2026',
  'May 2026', 'June 2026', 'July 2026', 'August 2026',
  'September 2026', 'October 2026', 'November 2026', 'December 2026',
  'Q1 2026 (Jan–Mar)', 'Q2 2026 (Apr–Jun)', 'Q3 2026 (Jul–Sep)', 'Q4 2026 (Oct–Dec)',
  'Full Year 2026',
];

interface TaxExportProps { company: Company; }

export const TaxExport: React.FC<TaxExportProps> = ({ company }) => {
  const [period, setPeriod] = useState('Full Year 2026');
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [error, setError] = useState('');
  const [obligations, setObligations] = useState<any[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      db.getObligations(company.id),
      db.getLedgers(company.id),
    ]).then(([obs, led]) => {
      setObligations(obs);
      setLedgerEntries(led);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [company.id]);

  // Compute summary
  const totalSales = ledgerEntries.filter(l => l.type === 'sale').reduce((s, l) => s + l.amount, 0);
  const totalExpenses = ledgerEntries.filter(l => l.type === 'expense').reduce((s, l) => s + l.amount, 0);
  const vatCollected = ledgerEntries.filter(l => l.type === 'sale').reduce((s, l) => s + l.taxAmount, 0);
  const whtDeducted = ledgerEntries.filter(l => l.type === 'expense').reduce((s, l) => s + l.taxAmount, 0);

  const filed = obligations.filter((o: any) => o.status === TaxStatus.FILED);
  const due = obligations.filter((o: any) => o.status === TaxStatus.DUE || o.status === TaxStatus.OVERDUE);
  const upcoming = obligations.filter((o: any) => o.status === TaxStatus.UPCOMING);
  const totalTaxPaid = filed.reduce((s: number, o: any) => s + (o.actualAmount || o.estimatedAmount), 0);

  const generatePDF = async () => {
    setGenerating(true);
    setError('');
    try {
      // Dynamic imports
      const jsPDFModule = await import('jspdf').catch(() => null);
      const autoTableModule = await import('jspdf-autotable').catch(() => null);

      if (!jsPDFModule || !autoTableModule) {
        setError('jsPDF not installed. Run: npm install jspdf jspdf-autotable');
        setGenerating(false);
        return;
      }

      const { jsPDF } = jsPDFModule;
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      const W = doc.internal.pageSize.getWidth();
      const green = [0, 132, 61] as [number, number, number];
      const darkGray = [30, 41, 59] as [number, number, number];
      const lightGray = [241, 245, 249] as [number, number, number];

      // ── Header banner ────────────────────────────────────────────
      doc.setFillColor(...green);
      doc.rect(0, 0, W, 32, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('TaxPulse NG', 14, 13);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('Tax Compliance Summary Report', 14, 20);
      doc.text(`Nigeria Tax Act 2025 (NTA 2025) — Effective 1 January 2026`, 14, 27);

      // NTA badge (right side)
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(W - 45, 9, 31, 10, 2, 2, 'F');
      doc.setTextColor(...green);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('NTA 2025 COMPLIANT', W - 44, 15.5);

      // ── Company info ─────────────────────────────────────────────
      let y = 42;
      doc.setFillColor(...lightGray);
      doc.rect(0, 36, W, 28, 'F');

      doc.setTextColor(...darkGray);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(company.name, 14, y);
      y += 7;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(`${company.entityType}  ·  ${company.state}  ·  ${company.industry}`, 14, y);
      y += 5;
      if (company.rcNumber) doc.text(`RC/BN: ${company.rcNumber}`, 14, y);
      if (company.tin) doc.text(`TIN: ${company.tin}`, 70, y);
      y += 5;
      doc.text(`Report Period: ${period}`, 14, y);
      doc.text(`Generated: ${new Date().toLocaleDateString('en-NG', { day: '2-digit', month: 'long', year: 'numeric' })}`, 70, y);

      y = 72;

      // ── Financial summary ─────────────────────────────────────────
      doc.setTextColor(...green);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('FINANCIAL SUMMARY', 14, y);
      y += 5;

      (doc as any).autoTable({
        startY: y,
        head: [['Metric', 'Amount (NGN)']],
        body: [
          ['Total Sales / Revenue', fmt(totalSales)],
          ['Total Expenses', fmt(totalExpenses)],
          ['Net Position', fmt(totalSales - totalExpenses)],
          ['VAT Collected (7.5% — NTA 2025)', fmt(vatCollected)],
          ['WHT Deducted from Vendors', fmt(whtDeducted)],
          ['Total Tax Paid (Filed Obligations)', fmt(totalTaxPaid)],
        ],
        theme: 'grid',
        headStyles: { fillColor: green, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 9, textColor: darkGray },
        alternateRowStyles: { fillColor: lightGray },
        columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
        margin: { left: 14, right: 14 },
      });

      y = (doc as any).lastAutoTable.finalY + 10;

      // ── Tax Obligations ───────────────────────────────────────────
      doc.setTextColor(...green);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('TAX OBLIGATIONS', 14, y);
      y += 5;

      const statusColor = (status: string) => {
        if (status === 'Filed') return [0, 132, 61];
        if (status === 'Overdue') return [220, 38, 38];
        if (status === 'Due') return [245, 158, 11];
        return [100, 116, 139];
      };

      (doc as any).autoTable({
        startY: y,
        head: [['Tax', 'Period', 'Due Date', 'Amount (NGN)', 'Status', 'Paid On']],
        body: obligations.map((o: any) => [
          o.type,
          o.period,
          o.dueDate,
          fmt(o.actualAmount || o.estimatedAmount),
          o.status,
          o.paymentDate || '—',
        ]),
        theme: 'grid',
        headStyles: { fillColor: green, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 8, textColor: darkGray },
        alternateRowStyles: { fillColor: lightGray },
        didDrawCell: (data: any) => {
          if (data.column.index === 4 && data.section === 'body') {
            const status = data.cell.raw as string;
            const [r, g, b] = statusColor(status) as [number, number, number];
            doc.setTextColor(r, g, b);
            doc.setFont('helvetica', 'bold');
          }
        },
        margin: { left: 14, right: 14 },
      });

      y = (doc as any).lastAutoTable.finalY + 10;

      // ── Compliance Score ──────────────────────────────────────────
      doc.setFillColor(...lightGray);
      doc.roundedRect(14, y, W - 28, 20, 3, 3, 'F');

      doc.setTextColor(...darkGray);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`Compliance Score: ${company.complianceScore}/100`, 20, y + 8);

      const scoreColor: [number, number, number] = company.complianceScore >= 80 ? [0, 132, 61] : company.complianceScore >= 50 ? [245, 158, 11] : [220, 38, 38];
      doc.setFillColor(...scoreColor);
      const barWidth = ((W - 90) * company.complianceScore) / 100;
      doc.roundedRect(20, y + 11, W - 90, 4, 1, 1, 'F');
      doc.setFillColor(...green);
      doc.roundedRect(20, y + 11, barWidth, 4, 1, 1, 'F');

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(`Filed: ${filed.length}  ·  Due: ${due.length}  ·  Upcoming: ${upcoming.length}`, 20, y + 19);

      y += 28;

      // ── NTA 2025 Rates Reference ──────────────────────────────────
      if (y > 230) { doc.addPage(); y = 20; }

      doc.setTextColor(...green);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('NTA 2025 TAX RATES REFERENCE', 14, y);
      y += 5;

      (doc as any).autoTable({
        startY: y,
        head: [['Tax', 'Rate / Rule', 'Authority', 'Filing Deadline']],
        body: [
          ['VAT', '7.5% (unchanged). Zero-rated: food, medical, education', 'NRS (formerly FIRS)', '21st of following month'],
          ['PAYE', '0% ≤₦800k · 15% · 18% · 21% · 23% · 25% >₦50M/yr. CRA abolished.', 'State IRS', '10th of following month'],
          ['WHT', '5% goods/construction · 10% services. ≤₦2M/month TIN holders exempt', 'NRS', '21st of following month'],
          ['CIT', '0% if turnover ≤₦50M · 30% standard + 4% Dev Levy', 'NRS', '6 months after year-end'],
          ['PIT', 'Same bands as PAYE. Rent Relief: 20% rent paid, max ₦500k', 'State IRS', '31 March annually'],
        ],
        theme: 'grid',
        headStyles: { fillColor: green, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 7.5, textColor: darkGray },
        alternateRowStyles: { fillColor: lightGray },
        margin: { left: 14, right: 14 },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 20 },
          1: { cellWidth: 75 },
        },
      });

      y = (doc as any).lastAutoTable.finalY + 10;

      // ── Monthly Breakdown (for annual report) ──────────────────
      const isAnnual = period.includes('Full Year');
      if (ledgerEntries.length > 0) {
        if (y > 200) { doc.addPage(); y = 20; }
        doc.setTextColor(...green);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(isAnnual ? 'MONTHLY FINANCIAL BREAKDOWN' : 'TRANSACTION LEDGER', 14, y);
        y += 5;

        if (isAnnual) {
          // Group by month
          const monthMap = new Map<string, { income: number; expenses: number; vat: number; wht: number; count: number }>();
          const monthOrder = ['January','February','March','April','May','June','July','August','September','October','November','December'];
          for (const l of ledgerEntries) {
            const d = new Date(l.date);
            const key = d.toLocaleDateString('en-NG', { month: 'long', year: 'numeric' });
            if (!monthMap.has(key)) monthMap.set(key, { income: 0, expenses: 0, vat: 0, wht: 0, count: 0 });
            const m = monthMap.get(key)!;
            if (l.type === 'sale') { m.income += l.amount; m.vat += l.taxAmount; }
            else { m.expenses += l.amount; m.wht += l.taxAmount; }
            m.count++;
          }

          // Sort months
          const sortedMonths = Array.from(monthMap.entries()).sort((a, b) => {
            const [aM, aY] = a[0].split(' ');
            const [bM, bY] = b[0].split(' ');
            if (aY !== bY) return Number(aY) - Number(bY);
            return monthOrder.indexOf(aM) - monthOrder.indexOf(bM);
          });

          (doc as any).autoTable({
            startY: y,
            head: [['Month', 'Income (₦)', 'Expenses (₦)', 'Net (₦)', 'VAT (₦)', 'WHT (₦)', 'Txns']],
            body: [
              ...sortedMonths.map(([month, m]) => [
                month,
                fmt(m.income),
                fmt(m.expenses),
                fmt(m.income - m.expenses),
                fmt(m.vat),
                fmt(m.wht),
                m.count,
              ]),
              // Totals row
              ['TOTAL', fmt(totalSales), fmt(totalExpenses), fmt(totalSales - totalExpenses), fmt(vatCollected), fmt(whtDeducted), ledgerEntries.length],
            ],
            theme: 'grid',
            headStyles: { fillColor: green, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
            bodyStyles: { fontSize: 8, textColor: darkGray },
            alternateRowStyles: { fillColor: lightGray },
            columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right', fontStyle: 'bold' }, 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'center' } },
            didDrawRow: (data: any) => {
              // Bold totals row
              if (data.row.index === sortedMonths.length) {
                doc.setFillColor(...green);
              }
            },
            margin: { left: 14, right: 14 },
          });

          y = (doc as any).lastAutoTable.finalY + 10;

          // Full transaction ledger on next page
          doc.addPage(); y = 20;
          doc.setTextColor(...green);
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.text('FULL TRANSACTION LEDGER', 14, y);
          y += 5;
        }

        (doc as any).autoTable({
          startY: y,
          head: [['Date', 'Description', 'Type', 'Amount (NGN)', 'Tax (NGN)']],
          body: ledgerEntries.map(l => [
            l.date,
            l.description.length > 45 ? l.description.slice(0, 45) + '…' : l.description,
            l.type === 'sale' ? 'Income' : 'Expense',
            fmt(l.amount),
            fmt(l.taxAmount),
          ]),
          theme: 'grid',
          headStyles: { fillColor: green, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
          bodyStyles: { fontSize: 7.5, textColor: darkGray },
          alternateRowStyles: { fillColor: lightGray },
          columnStyles: { 2: { fontStyle: 'bold', cellWidth: 18 }, 3: { halign: 'right' }, 4: { halign: 'right' } },
          margin: { left: 14, right: 14 },
        });
      }

      // ── Footer on every page ──────────────────────────────────────
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFillColor(...green);
        doc.rect(0, doc.internal.pageSize.getHeight() - 12, W, 12, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text(
          `TaxPulse NG  ·  Nigeria Tax Act 2025  ·  Generated ${new Date().toLocaleDateString()}  ·  Page ${i} of ${pageCount}`,
          W / 2,
          doc.internal.pageSize.getHeight() - 5,
          { align: 'center' }
        );
        doc.text(
          'For informational purposes only. Consult a certified tax professional for formal tax advice.',
          W / 2,
          doc.internal.pageSize.getHeight() - 1.5,
          { align: 'center' }
        );
      }

      // Save
      const filename = `TaxPulse_${company.name.replace(/\s+/g, '_')}_${period.replace(/\s+/g, '_')}.pdf`;
      doc.save(filename);
      setGenerated(true);
      setTimeout(() => setGenerated(false), 3000);
    } catch (e: any) {
      setError(`Failed to generate PDF: ${e.message}`);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="text-4xl animate-pulse">📄</div>
        <p className="text-slate-500 text-sm">Loading your financial data...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <header>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold text-slate-900">Tax Summary Export</h1>
          <span className="bg-cac-green text-white text-xs font-black px-2.5 py-1 rounded-full">PDF</span>
        </div>
        <p className="text-slate-500 text-sm">Generate a professional tax compliance summary PDF for your records, accountant, or NRS submission.</p>
      </header>



      <div className="grid md:grid-cols-2 gap-6">
        {/* Config */}
        <Card className="space-y-4">
          <h2 className="font-bold text-slate-800">Report Configuration</h2>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Reporting Period</label>
            <select
              value={period}
              onChange={e => setPeriod(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cac-green bg-white"
            >
              {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div className="bg-slate-50 rounded-xl p-3 space-y-2">
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Report includes:</p>
            {[
              '✅ Company profile & TIN',
              '✅ Financial summary (sales, expenses, net)',
              '✅ Tax obligations & filing status',
              '✅ VAT collected & WHT deducted',
              '✅ NTA 2025 tax rates reference',
              '✅ Full transaction ledger (all entries)',
              '✅ Monthly breakdown (annual reports)',
            ].map(item => (
              <p key={item} className="text-xs text-slate-600">{item}</p>
            ))}
          </div>
        </Card>

        {/* Preview summary */}
        <Card className="space-y-4">
          <h2 className="font-bold text-slate-800">Data Preview</h2>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between p-2 bg-slate-50 rounded-lg">
              <span className="text-slate-600">Company</span>
              <span className="font-bold text-slate-900">{company.name}</span>
            </div>
            <div className="flex justify-between p-2 bg-slate-50 rounded-lg">
              <span className="text-slate-600">Total Sales</span>
              <span className="font-bold text-cac-green">{fmt(totalSales)}</span>
            </div>
            <div className="flex justify-between p-2 bg-slate-50 rounded-lg">
              <span className="text-slate-600">Total Expenses</span>
              <span className="font-bold text-slate-700">{fmt(totalExpenses)}</span>
            </div>
            <div className="flex justify-between p-2 bg-slate-50 rounded-lg">
              <span className="text-slate-600">VAT Collected</span>
              <span className="font-bold text-amber-600">{fmt(vatCollected)}</span>
            </div>
            <div className="flex justify-between p-2 bg-slate-50 rounded-lg">
              <span className="text-slate-600">WHT Deducted</span>
              <span className="font-bold text-purple-600">{fmt(whtDeducted)}</span>
            </div>
            <div className="flex justify-between p-2 bg-slate-50 rounded-lg">
              <span className="text-slate-600">Tax Obligations</span>
              <span className="font-bold text-slate-900">{obligations.length} ({filed.length} filed)</span>
            </div>
            <div className="flex justify-between p-2 bg-slate-50 rounded-lg">
              <span className="text-slate-600">Ledger Entries</span>
              <span className="font-bold text-slate-900">{ledgerEntries.length}</span>
            </div>
            <div className="flex justify-between p-2 bg-slate-50 rounded-lg">
              <span className="text-slate-600">Compliance Score</span>
              <span className={`font-bold ${company.complianceScore >= 80 ? 'text-cac-green' : company.complianceScore >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                {company.complianceScore}/100
              </span>
            </div>
          </div>
        </Card>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          <p className="font-bold mb-1">⚠️ {error}</p>
          {error.includes('not installed') && (
            <code className="block bg-red-100 rounded px-3 py-2 mt-2 font-mono text-xs">
              npm install jspdf jspdf-autotable
            </code>
          )}
        </div>
      )}

      {generated && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-cac-green font-bold flex items-center gap-2">
          ✅ PDF downloaded successfully!
        </div>
      )}

      <Button
        onClick={generatePDF}
        disabled={generating}
        className="w-full py-4 text-base"
      >
        {generating ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Generating PDF...
          </span>
        ) : (
          '📄 Generate & Download Tax Summary PDF'
        )}
      </Button>

      <p className="text-xs text-slate-400 text-center">
        PDF is generated entirely in your browser. No data is sent to any server. NTA 2025 compliant.
      </p>
    </div>
  );
};
