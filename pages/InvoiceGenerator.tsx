import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import React, { useState } from 'react';
import { Company } from '../types';
import { computeInvoice, VAT_RATE, InvoiceLineItem } from '../utils/taxEngine';
import { Card, Input, Button } from '../components/Shared';

const fmt  = (n: number) => '₦' + n.toLocaleString('en-NG', { maximumFractionDigits: 2 });

interface InvoiceGeneratorProps { company: Company; }

interface ClientInfo {
  name:    string;
  address: string;
  tin:     string;
  email:   string;
  phone:   string;
}

const emptyClient: ClientInfo = { name: '', address: '', tin: '', email: '', phone: '' };
const emptyLine: InvoiceLineItem = { description: '', quantity: 1, unitPrice: 0, vatApplicable: true };

const MONTHS = ['January','February','March','April','May','June',
  'July','August','September','October','November','December'];

export const InvoiceGenerator: React.FC<InvoiceGeneratorProps> = ({ company }) => {
  const now    = new Date();
  const [client, setClient]           = useState<ClientInfo>(emptyClient);
  const [lines, setLines]             = useState<InvoiceLineItem[]>([{ ...emptyLine }]);
  const [invoiceNo, setInvoiceNo]     = useState(`INV-${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-001`);
  const [invoiceDate, setInvoiceDate] = useState(now.toISOString().slice(0,10));
  const [dueDate, setDueDate]         = useState(new Date(now.getTime() + 30*86400000).toISOString().slice(0,10));
  const [notes, setNotes]             = useState('');
  const [generating, setGenerating]   = useState(false);
  const [generated, setGenerated]     = useState(false);
  const [error, setError]             = useState('');

  const updateClient = (f: keyof ClientInfo, v: string) =>
    setClient(prev => ({ ...prev, [f]: v }));
  const updateLine = (i: number, f: keyof InvoiceLineItem, v: any) =>
    setLines(prev => prev.map((l, idx) => idx === i ? { ...l, [f]: v } : l));
  const addLine    = () => setLines(prev => [...prev, { ...emptyLine }]);
  const removeLine = (i: number) => setLines(prev => prev.filter((_, idx) => idx !== i));

  const computed = computeInvoice(lines.filter(l => l.description.trim()));

  const generatePDF = async () => {
    if (!client.name.trim()) { setError('Client name is required.'); return; }
    if (!lines.some(l => l.description.trim() && l.unitPrice > 0)) {
      setError('Add at least one line item with a description and price.');
      return;
    }
    setGenerating(true); setError('');
    try {
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const W   = doc.internal.pageSize.getWidth();
      const H   = doc.internal.pageSize.getHeight();

      const GREEN: [number,number,number] = [0, 132, 61];
      const DARK:  [number,number,number] = [30, 41, 59];
      const LGRAY: [number,number,number] = [241, 245, 249];
      const WHITE: [number,number,number] = [255, 255, 255];

      // ── Header band ──
      doc.setFillColor(...GREEN);
      doc.rect(0, 0, W, 40, 'F');

      doc.setTextColor(...WHITE);
      doc.setFontSize(20); doc.setFont('helvetica', 'bold');
      doc.text('TAX INVOICE', 14, 16);
      doc.setFontSize(9); doc.setFont('helvetica', 'normal');
      doc.text('Value Added Tax Invoice -- NTA 2025 Compliant', 14, 24);

      // NTA badge
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(W - 52, 10, 38, 10, 2, 2, 'F');
      doc.setTextColor(...GREEN);
      doc.setFontSize(7); doc.setFont('helvetica', 'bold');
      doc.text('NTA 2025 · VAT 7.5%', W - 51, 16.5);

      // Invoice meta (top right of header)
      doc.setTextColor(...WHITE);
      doc.setFontSize(8); doc.setFont('helvetica', 'normal');
      doc.text(`Invoice No: ${invoiceNo}`, W - 14, 26, { align: 'right' });
      doc.text(`Date: ${new Date(invoiceDate).toLocaleDateString('en-NG', { day:'2-digit', month:'long', year:'numeric' })}`, W - 14, 32, { align: 'right' });
      doc.text(`Due: ${new Date(dueDate).toLocaleDateString('en-NG', { day:'2-digit', month:'long', year:'numeric' })}`, W - 14, 38, { align: 'right' });

      // ── Supplier & Client boxes ──
      let y = 48;

      // Supplier (left)
      doc.setFillColor(...LGRAY);
      doc.roundedRect(14, y, (W - 36) / 2, 42, 3, 3, 'F');
      doc.setTextColor(100, 116, 139); doc.setFontSize(7); doc.setFont('helvetica', 'bold');
      doc.text('FROM (SUPPLIER)', 18, y + 7);
      doc.setTextColor(...DARK); doc.setFontSize(10); doc.setFont('helvetica', 'bold');
      doc.text(company.name, 18, y + 15);
      doc.setFontSize(8); doc.setFont('helvetica', 'normal');
      const supplierInfo = [
        company.tin        ? `TIN: ${company.tin}`                : '',
        company.vatNumber  ? `VAT No: ${company.vatNumber}`       : '',
        company.rcNumber   ? `RC No: ${company.rcNumber}`         : '',
        company.address    ? company.address.slice(0, 35)         : '',
        company.state,
      ].filter(Boolean);
      supplierInfo.forEach((line, i) => doc.text(line, 18, y + 22 + (i * 5)));

      // Client (right)
      const cx = 14 + (W - 36) / 2 + 8;
      doc.setFillColor(...LGRAY);
      doc.roundedRect(cx, y, (W - 36) / 2, 42, 3, 3, 'F');
      doc.setTextColor(100, 116, 139); doc.setFontSize(7); doc.setFont('helvetica', 'bold');
      doc.text('TO (CLIENT)', cx + 4, y + 7);
      doc.setTextColor(...DARK); doc.setFontSize(10); doc.setFont('helvetica', 'bold');
      doc.text(client.name.slice(0, 30), cx + 4, y + 15);
      doc.setFontSize(8); doc.setFont('helvetica', 'normal');
      const clientInfo = [
        client.tin     ? `TIN: ${client.tin}`         : '',
        client.address ? client.address.slice(0, 35)  : '',
        client.email   ? `Email: ${client.email}`     : '',
        client.phone   ? `Tel: ${client.phone}`       : '',
      ].filter(Boolean);
      clientInfo.forEach((line, i) => doc.text(line, cx + 4, y + 22 + (i * 5)));

      y += 50;

      // ── Line items table ──
      const validLines = lines.filter(l => l.description.trim());
      autoTable(doc, {
        startY: y,
        head: [['#', 'Description', 'Qty', 'Unit Price (₦)', 'VAT', 'Line Total (₦)', 'VAT Amount (₦)']],
        body: computed.lines.map((l, i) => [
          i + 1,
          l.description,
          l.quantity,
          fmt(l.unitPrice),
          l.vatApplicable ? '7.5%' : '0% (Zero-rated)',
          fmt(l.lineTotal),
          fmt(l.vatAmount),
        ]),
        theme: 'grid',
        headStyles: { fillColor: GREEN, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 8.5, textColor: DARK },
        alternateRowStyles: { fillColor: LGRAY },
        columnStyles: {
          0: { cellWidth: 8 },
          2: { halign: 'center', cellWidth: 10 },
          3: { halign: 'right' },
          4: { halign: 'center', cellWidth: 20 },
          5: { halign: 'right', fontStyle: 'bold' },
          6: { halign: 'right', fontStyle: 'bold' },
        },
        margin: { left: 14, right: 14 },
      });
      y = (doc as any).lastAutoTable.finalY + 6;

      // ── Summary box ──
      const sbW = 85;
      const sbX = W - 14 - sbW;
      doc.setFillColor(...LGRAY);
      doc.roundedRect(sbX, y, sbW, 36, 3, 3, 'F');
      doc.setTextColor(...DARK); doc.setFontSize(9); doc.setFont('helvetica', 'normal');
      [
        ['Subtotal (ex-VAT)', fmt(computed.subtotal)],
        [`VAT @ 7.5%`,        fmt(computed.vatAmount)],
      ].forEach(([label, val], i) => {
        doc.text(label, sbX + 4, y + 9 + i * 7);
        doc.text(val, sbX + sbW - 4, y + 9 + i * 7, { align: 'right' });
      });
      // Total
      doc.setFillColor(...GREEN);
      doc.roundedRect(sbX, y + 22, sbW, 12, 2, 2, 'F');
      doc.setTextColor(...WHITE); doc.setFontSize(10); doc.setFont('helvetica', 'bold');
      doc.text('TOTAL DUE', sbX + 4, y + 30);
      doc.text(fmt(computed.total), sbX + sbW - 4, y + 30, { align: 'right' });

      // ── NTA compliance notice ──
      y += 46;
      if (company.tin || company.vatNumber) {
        doc.setFillColor(240, 253, 244);
        doc.roundedRect(14, y, W - 28, 16, 2, 2, 'F');
        doc.setTextColor(0, 100, 40); doc.setFontSize(7.5); doc.setFont('helvetica', 'normal');
        doc.text('✓ VAT REGISTERED INVOICE -- This invoice complies with the Nigeria Tax Act 2025.', 18, y + 6);
        doc.text(`Supplier VAT No: ${company.vatNumber || 'Pending'}  ·  Supplier TIN: ${company.tin || 'N/A'}  ·  VAT Rate: 7.5%  ·  Filing Authority: Nigeria Revenue Service (NRS)`, 18, y + 12);
        y += 20;
      }

      // ── Notes ──
      if (notes.trim()) {
        doc.setFillColor(...LGRAY);
        doc.roundedRect(14, y, W - 28, 20, 2, 2, 'F');
        doc.setTextColor(100, 116, 139); doc.setFontSize(7); doc.setFont('helvetica', 'bold');
        doc.text('NOTES', 18, y + 7);
        doc.setTextColor(...DARK); doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
        doc.text(notes.slice(0, 200), 18, y + 13, { maxWidth: W - 40 });
        y += 24;
      }

      // ── Payment instruction ──
      doc.setFillColor(255, 251, 235);
      doc.roundedRect(14, y, W - 28, 18, 2, 2, 'F');
      doc.setTextColor(120, 80, 0); doc.setFontSize(7.5); doc.setFont('helvetica', 'normal');
      doc.text('PAYMENT INSTRUCTION: Transfer to our bank account and send proof of payment. This is a computer-generated invoice.', 18, y + 7, { maxWidth: W - 40 });
      doc.text(`Please retain this invoice for VAT input credit recovery purposes. Client TIN required for input VAT claims.`, 18, y + 13, { maxWidth: W - 40 });

      // ── Footer ──
      doc.setFillColor(...GREEN);
      doc.rect(0, H - 10, W, 10, 'F');
      doc.setTextColor(...WHITE); doc.setFontSize(6.5); doc.setFont('helvetica', 'normal');
      doc.text(`TaxPulse NG  ·  NTA 2025 Compliant Invoice  ·  ${invoiceNo}  ·  Generated ${new Date().toLocaleDateString('en-NG')}`, W / 2, H - 4, { align: 'center' });

      const filename = `Invoice_${invoiceNo}_${client.name.replace(/\s+/g,'_')}.pdf`;
      doc.save(filename);
      setGenerated(true);
      setTimeout(() => setGenerated(false), 4000);
    } catch (e: any) {
      setError(`Failed: ${e.message}`);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <header>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold text-slate-900">VAT Invoice Generator</h1>
          <span className="bg-cac-green text-white text-xs font-black px-2.5 py-1 rounded-full">NTA 2025</span>
        </div>
        <p className="text-slate-500 text-sm">
          Generate NTA 2025-compliant VAT invoices with your TIN, VAT number, and itemised tax. Required for customers to claim input VAT.
        </p>
      </header>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-800 space-y-1">
        <p className="font-bold">📋 What an NTA 2025-compliant VAT invoice must contain</p>
        <div className="grid md:grid-cols-2 gap-1 mt-1">
          <p>• "TAX INVOICE' title (not just 'Invoice")</p>
          <p>• Supplier TIN and VAT Registration Number</p>
          <p>• Client name, address and TIN (for B2B)</p>
          <p>• Invoice number and date</p>
          <p>• Description of goods/services</p>
          <p>• Net amount, VAT rate (7.5%), VAT amount, total</p>
          <p>• Zero-rated items clearly marked 0%</p>
          <p>• Supplier RC Number (if registered with CAC)</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Invoice meta */}
        <Card className="space-y-3">
          <h2 className="font-bold text-slate-800">Invoice Details</h2>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Invoice Number" value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} />
            <Input label="Invoice Date" type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} />
            <div className="col-span-2">
              <Input label="Payment Due Date" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
          </div>
        </Card>

        {/* Client info */}
        <Card className="space-y-3">
          <h2 className="font-bold text-slate-800">Client / Customer</h2>
          <Input label="Client Name *" value={client.name} onChange={e => updateClient('name', e.target.value)} placeholder="Company or individual name" />
          <Input label="Client Address" value={client.address} onChange={e => updateClient('address', e.target.value)} placeholder="Full address" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Client TIN" value={client.tin} onChange={e => updateClient('tin', e.target.value)} placeholder="For B2B input VAT" />
            <Input label="Email" value={client.email} onChange={e => updateClient('email', e.target.value)} placeholder="client@email.com" />
          </div>
        </Card>
      </div>

      {/* Line items */}
      <Card className="space-y-4">
        <h2 className="font-bold text-slate-800">Line Items</h2>

        <div className="space-y-3">
          {/* Header */}
          <div className="hidden md:grid grid-cols-12 gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
            <span className="col-span-4">Description</span>
            <span className="col-span-2 text-center">Qty</span>
            <span className="col-span-2 text-right">Unit Price</span>
            <span className="col-span-2 text-center">VAT</span>
            <span className="col-span-1 text-right">Total</span>
            <span className="col-span-1"></span>
          </div>

          {lines.map((line, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-start">
              <div className="col-span-12 md:col-span-4">
                <input
                  value={line.description}
                  onChange={e => updateLine(i, 'description', e.target.value)}
                  placeholder="Description of goods/services"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-cac-green/30"
                />
              </div>
              <div className="col-span-4 md:col-span-2">
                <input type="number" min="1"
                  value={line.quantity}
                  onChange={e => updateLine(i, 'quantity', parseFloat(e.target.value) || 1)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-center focus:outline-none focus:ring-2 focus:ring-cac-green/30"
                />
              </div>
              <div className="col-span-4 md:col-span-2">
                <input type="number" min="0"
                  value={line.unitPrice || ''}
                  onChange={e => updateLine(i, 'unitPrice', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-right focus:outline-none focus:ring-2 focus:ring-cac-green/30"
                />
              </div>
              <div className="col-span-3 md:col-span-2 flex items-center justify-center">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox"
                    checked={line.vatApplicable}
                    onChange={e => updateLine(i, 'vatApplicable', e.target.checked)}
                    className="accent-cac-green w-4 h-4"
                  />
                  <span className="text-xs text-slate-600">{line.vatApplicable ? '7.5%' : '0%'}</span>
                </label>
              </div>
              <div className="col-span-4 md:col-span-1 text-right text-sm font-bold text-slate-700 py-2">
                {fmt(line.quantity * line.unitPrice)}
              </div>
              <div className="col-span-1 flex items-center justify-center">
                {lines.length > 1 && (
                  <button onClick={() => removeLine(i)}
                    className="text-red-400 hover:text-red-600 text-lg leading-none font-bold">×</button>
                )}
              </div>
            </div>
          ))}

          <button onClick={addLine}
            className="w-full py-2.5 border-2 border-dashed border-cac-green/30 rounded-xl text-cac-green text-sm font-bold hover:border-cac-green hover:bg-cac-green/5 transition-all">
            + Add Line Item
          </button>
        </div>

        {/* Invoice summary */}
        {computed.lines.length > 0 && (
          <div className="bg-slate-50 rounded-xl p-4 space-y-2 max-w-xs ml-auto">
            {[
              ['Subtotal (ex-VAT)', fmt(computed.subtotal),  'text-slate-700'],
              ['VAT @ 7.5%',        fmt(computed.vatAmount), 'text-amber-600 font-bold'],
              ['TOTAL',             fmt(computed.total),     'text-cac-green font-extrabold text-base'],
            ].map(([label, val, cls]) => (
              <div key={label} className="flex justify-between items-center text-sm">
                <span className="text-slate-500">{label}</span>
                <span className={cls as string}>{val}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Notes */}
      <Card>
        <h2 className="font-bold text-slate-800 mb-3">Notes / Terms (optional)</h2>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="e.g. Payment due within 30 days. Bank: GTBank, Account: 0123456789, Sort Code: 058."
          rows={3}
          className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-cac-green/30 resize-none"
        />
      </Card>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          <p className="font-bold">⚠️ {error}</p>
        </div>
      )}

      {generated && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-cac-green font-bold flex items-center gap-2">
          ✅ Invoice downloaded! Share with your client -- they can use it to claim input VAT.
        </div>
      )}

      <Button onClick={generatePDF} disabled={generating} className="w-full py-4 text-base">
        {generating ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Generating invoice...
          </span>
        ) : (
          `🧾 Generate Tax Invoice -- ${fmt(computed.total)}`
        )}
      </Button>

      <p className="text-xs text-slate-400 text-center">
        Generated in your browser. All calculations use NTA 2025 VAT rates. This invoice is suitable for NRS input VAT recovery purposes.
      </p>
    </div>
  );
};
