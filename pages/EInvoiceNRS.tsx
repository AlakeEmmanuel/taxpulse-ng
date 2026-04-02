// pages/EInvoiceNRS.tsx
// NRS-compliant e-invoice submission via DigiTax API
// STANDALONE — does not import from or modify any other TaxPulse NG file
// Requires DIGITAX_API_KEY in Vercel env vars (sign up at digitax.tech)

import React, { useState, useEffect } from 'react';
import { Company } from '../types';

interface Props {
  company: Company;
}

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxCategory: 'VAT' | 'EXEMPT' | 'ZERO_RATED';
  itemCode: string;
}

interface SubmittedInvoice {
  irn: string;
  invoiceNumber: string;
  status: string;
  qrCode?: string;
  buyerName: string;
  totalAmount: number;
  vatAmount: number;
  createdAt: string;
}

const VAT_RATE = 0.075;
const fmt = (n: number) => '\u20a6' + (n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const API = (action: string, params?: Record<string, string>) => {
  const q = new URLSearchParams({ action, ...params });
  return `/api/einvoice?${q}`;
};

const statusColor = (s: string) => {
  if (s === 'COMPLETE' || s === 'ACCEPTED') return { bg: '#F0FDF4', color: '#15803D', border: '#bbf7d0' };
  if (s === 'PENDING')  return { bg: '#FFF7ED', color: '#C2410C', border: '#fed7aa' };
  if (s === 'DRAFT')    return { bg: '#F8FAFC', color: '#64748b', border: '#e2e8f0' };
  if (s === 'FAILED')   return { bg: '#FFF1F2', color: '#E4002B', border: '#fecdd3' };
  return { bg: '#F8FAFC', color: '#64748b', border: '#e2e8f0' };
};

export const EInvoiceNRS: React.FC<Props> = ({ company }) => {
  const [tab, setTab]               = useState<'create' | 'history'>('create');
  const [invoices, setInvoices]     = useState<SubmittedInvoice[]>([]);
  const [loading, setLoading]       = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState<SubmittedInvoice | null>(null);
  const [configured, setConfigured] = useState<boolean | null>(null);

  // Buyer fields
  const [buyerName, setBuyerName]   = useState('');
  const [buyerTIN, setBuyerTIN]     = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [buyerAddress, setBuyerAddress] = useState('');

  // Invoice fields
  const [invoiceNumber, setInvoiceNumber] = useState('INV-' + Date.now().toString().slice(-6));
  const [invoiceDate, setInvoiceDate]     = useState(new Date().toISOString().slice(0, 10));
  const [currency, setCurrency]           = useState('NGN');
  const [paymentMeans, setPaymentMeans]   = useState('BANK_TRANSFER');
  const [notes, setNotes]                 = useState('');

  // Line items
  const [items, setItems] = useState<LineItem[]>([
    { id: '1', description: '', quantity: 1, unitPrice: 0, taxCategory: 'VAT', itemCode: 'SRV001' },
  ]);

  // Check if API key is configured
  useEffect(() => {
    fetch(API('get_business_info'))
      .then(r => r.json())
      .then(d => setConfigured(!d.error || d.error !== 'DigiTax API key not configured'))
      .catch(() => setConfigured(false));
  }, []);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const res = await fetch(API('list_invoices'));
      const data = await res.json();
      if (data.data) {
        setInvoices(data.data.map((inv: any) => ({
          irn:           inv.irn || inv.invoice_reference_number || '--',
          invoiceNumber: inv.invoice_number || '--',
          status:        inv.status || 'UNKNOWN',
          qrCode:        inv.qr_code,
          buyerName:     inv.buyer?.name || inv.party?.name || '--',
          totalAmount:   inv.total_amount || 0,
          vatAmount:     inv.vat_amount || 0,
          createdAt:     inv.created_at || new Date().toISOString(),
        })));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'history') loadInvoices();
  }, [tab]);

  const addItem = () => {
    setItems(prev => [...prev, {
      id: Date.now().toString(),
      description: '', quantity: 1, unitPrice: 0,
      taxCategory: 'VAT', itemCode: 'SRV001',
    }]);
  };

  const updateItem = (id: string, field: keyof LineItem, value: any) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, [field]: value } : it));
  };

  const removeItem = (id: string) => {
    if (items.length > 1) setItems(prev => prev.filter(it => it.id !== id));
  };

  const subtotal    = items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
  const vatAmount   = items.reduce((s, it) => s + (it.taxCategory === 'VAT' ? it.quantity * it.unitPrice * VAT_RATE : 0), 0);
  const totalAmount = subtotal + vatAmount;

  const handleSubmit = async () => {
    if (!buyerName.trim())  return setError('Buyer name is required');
    if (!buyerTIN.trim())   return setError('Buyer TIN is required');
    if (!items[0].description.trim()) return setError('At least one line item is required');
    if (items.some(it => it.unitPrice <= 0)) return setError('All line items must have a price greater than zero');

    setSubmitting(true);
    setError('');

    const payload = {
      invoice_number: invoiceNumber,
      invoice_date:   invoiceDate,
      currency_code:  currency,
      payment_means:  paymentMeans,
      notes:          notes || undefined,
      buyer: {
        name:    buyerName,
        tin:     buyerTIN,
        email:   buyerEmail || undefined,
        phone:   buyerPhone || undefined,
        address: buyerAddress || undefined,
      },
      seller: {
        name:    company.name,
        tin:     company.tin || '',
        address: company.address || '',
      },
      line_items: items.map(it => ({
        description:  it.description,
        quantity:     it.quantity,
        unit_price:   it.unitPrice,
        item_code:    it.itemCode,
        tax_category: it.taxCategory,
        vat_amount:   it.taxCategory === 'VAT' ? it.quantity * it.unitPrice * VAT_RATE : 0,
        total_amount: it.quantity * it.unitPrice * (it.taxCategory === 'VAT' ? 1 + VAT_RATE : 1),
      })),
      subtotal,
      vat_amount:   vatAmount,
      total_amount: totalAmount,
    };

    try {
      const res  = await fetch(API('create_invoice'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Submission failed. Check your DigiTax account and try again.');
        setSubmitting(false);
        return;
      }

      setSuccess({
        irn:           data.irn || data.invoice_reference_number || data.data?.irn || '--',
        invoiceNumber: invoiceNumber,
        status:        data.status || data.data?.status || 'DRAFT',
        qrCode:        data.qr_code || data.data?.qr_code,
        buyerName:     buyerName,
        totalAmount:   totalAmount,
        vatAmount:     vatAmount,
        createdAt:     new Date().toISOString(),
      });

    } catch (e: any) {
      setError('Network error: ' + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSuccess(null);
    setError('');
    setBuyerName(''); setBuyerTIN(''); setBuyerEmail('');
    setBuyerPhone(''); setBuyerAddress('');
    setInvoiceNumber('INV-' + Date.now().toString().slice(-6));
    setInvoiceDate(new Date().toISOString().slice(0, 10));
    setNotes('');
    setItems([{ id: '1', description: '', quantity: 1, unitPrice: 0, taxCategory: 'VAT', itemCode: 'SRV001' }]);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px',
    fontSize: '14px', outline: 'none', boxSizing: 'border-box', background: '#fff', color: '#0f172a',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b',
    textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px',
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <h1 className="text-2xl font-extrabold text-slate-900">NRS e-Invoice</h1>
          <span style={{ background: '#FFF7ED', color: '#C2410C', fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '6px', border: '1px solid #fed7aa' }}>
            Beta
          </span>
        </div>
        <p className="text-slate-500 text-sm">Submit invoices to the Nigeria Revenue Service via DigiTax. Returns a legally valid IRN and QR code.</p>
      </div>

      {/* API not configured banner */}
      {configured === false && (
        <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: '12px', padding: '16px 20px' }}>
          <p style={{ fontWeight: 700, color: '#C2410C', margin: '0 0 8px', fontSize: '14px' }}>DigiTax API key not configured</p>
          <p style={{ color: '#92400E', fontSize: '13px', margin: '0 0 10px', lineHeight: 1.6 }}>
            To submit e-invoices to NRS, you need a DigiTax API key:
          </p>
          <ol style={{ color: '#92400E', fontSize: '13px', margin: '0 0 10px', lineHeight: 1.8, paddingLeft: '20px' }}>
            <li>Sign up at <a href="https://digitax.tech" target="_blank" rel="noopener noreferrer" style={{ color: '#C2410C', fontWeight: 700 }}>digitax.tech</a></li>
            <li>Get your X-API-Key from the DigiTax Dashboard</li>
            <li>Add <code style={{ background: '#FEF3C7', padding: '1px 6px', borderRadius: '4px', fontSize: '12px' }}>DIGITAX_API_KEY=your_key</code> to Vercel environment variables</li>
            <li>Redeploy with <code style={{ background: '#FEF3C7', padding: '1px 6px', borderRadius: '4px', fontSize: '12px' }}>npx vercel --prod</code></li>
          </ol>
          <p style={{ color: '#92400E', fontSize: '12px', margin: 0, fontStyle: 'italic' }}>
            The form below still works for drafting invoices. Submission to NRS requires the API key.
          </p>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', background: '#F1F5F9', borderRadius: '10px', padding: '4px', width: 'fit-content' }}>
        {(['create', 'history'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', fontWeight: 700, fontSize: '13px', cursor: 'pointer', background: tab === t ? '#00843D' : 'transparent', color: tab === t ? '#fff' : '#64748b', transition: 'all 0.2s' }}>
            {t === 'create' ? 'Create Invoice' : 'Submitted Invoices'}
          </button>
        ))}
      </div>

      {/* SUCCESS SCREEN */}
      {success && (
        <div style={{ background: '#F0FDF4', border: '1px solid #bbf7d0', borderRadius: '16px', padding: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div>
              <p style={{ fontSize: '18px', fontWeight: 800, color: '#14532D', margin: '0 0 4px' }}>Invoice submitted to NRS</p>
              <p style={{ fontSize: '13px', color: '#15803D', margin: 0 }}>Status: <strong>{success.status}</strong></p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '11px', color: '#64748b', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Invoice Reference Number</p>
              <p style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', fontFamily: 'monospace', margin: 0 }}>{success.irn}</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: success.qrCode ? '1fr auto' : '1fr', gap: '20px', marginBottom: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {[
                ['Invoice Number', success.invoiceNumber],
                ['Buyer', success.buyerName],
                ['Subtotal', fmt(success.totalAmount - success.vatAmount)],
                ['VAT (7.5%)', fmt(success.vatAmount)],
                ['Total Amount', fmt(success.totalAmount)],
                ['Created', new Date(success.createdAt).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' })],
              ].map(([label, value]) => (
                <div key={String(label)} style={{ background: '#fff', borderRadius: '10px', padding: '12px 14px', border: '1px solid #bbf7d0' }}>
                  <p style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 3px' }}>{label}</p>
                  <p style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: 0 }}>{value}</p>
                </div>
              ))}
            </div>

            {success.qrCode && (
              <div style={{ background: '#fff', borderRadius: '12px', padding: '12px', border: '1px solid #bbf7d0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <img src={`data:image/png;base64,${success.qrCode}`} alt="NRS QR Code" style={{ width: '120px', height: '120px' }} />
                <p style={{ fontSize: '10px', color: '#64748b', textAlign: 'center', margin: 0 }}>NRS verification QR code</p>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button onClick={resetForm}
              style={{ padding: '10px 22px', background: '#00843D', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
              Create another invoice
            </button>
            <button onClick={() => setTab('history')}
              style={{ padding: '10px 22px', background: '#fff', color: '#00843D', border: '1px solid #00843D', borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
              View all invoices
            </button>
          </div>

          <p style={{ fontSize: '12px', color: '#64748b', marginTop: '14px', fontStyle: 'italic' }}>
            The QR code and IRN have been registered with NRS. Your client can scan the QR code to verify this invoice.
          </p>
        </div>
      )}

      {/* CREATE FORM */}
      {tab === 'create' && !success && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px', alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Invoice details */}
            <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '20px' }}>
              <p style={{ fontWeight: 700, fontSize: '14px', margin: '0 0 16px', color: '#0f172a' }}>Invoice Details</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Invoice Number</label>
                  <input value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Invoice Date</label>
                  <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Currency</label>
                  <select value={currency} onChange={e => setCurrency(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                    <option value="NGN">NGN — Nigerian Naira</option>
                    <option value="USD">USD — US Dollar</option>
                    <option value="GBP">GBP — British Pound</option>
                    <option value="EUR">EUR — Euro</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Payment Method</label>
                  <select value={paymentMeans} onChange={e => setPaymentMeans(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CASH">Cash</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="CARD">Card</option>
                    <option value="MOBILE_MONEY">Mobile Money</option>
                  </select>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={labelStyle}>Notes (optional)</label>
                  <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Payment terms, references..." style={inputStyle} />
                </div>
              </div>
            </div>

            {/* Seller */}
            <div style={{ background: '#F0FDF4', borderRadius: '16px', border: '1px solid #bbf7d0', padding: '20px' }}>
              <p style={{ fontWeight: 700, fontSize: '14px', margin: '0 0 12px', color: '#14532D' }}>Seller (Your Business)</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ ...labelStyle, color: '#15803D' }}>Business Name</label>
                  <div style={{ ...inputStyle, background: '#F0FDF4', color: '#15803D', fontWeight: 600 }}>{company.name}</div>
                </div>
                <div>
                  <label style={{ ...labelStyle, color: '#15803D' }}>TIN</label>
                  <div style={{ ...inputStyle, background: '#F0FDF4', color: company.tin ? '#15803D' : '#E4002B', fontWeight: 600 }}>
                    {company.tin || 'TIN not set — add in Settings'}
                  </div>
                </div>
              </div>
              {!company.tin && (
                <p style={{ fontSize: '12px', color: '#E4002B', margin: '8px 0 0' }}>
                  Add your TIN in Settings to submit to NRS.
                </p>
              )}
            </div>

            {/* Buyer */}
            <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '20px' }}>
              <p style={{ fontWeight: 700, fontSize: '14px', margin: '0 0 16px', color: '#0f172a' }}>Buyer (Client)</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Client / Company Name *</label>
                  <input value={buyerName} onChange={e => setBuyerName(e.target.value)} placeholder="e.g. Zenith Bank Plc" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Client TIN *</label>
                  <input value={buyerTIN} onChange={e => setBuyerTIN(e.target.value)} placeholder="e.g. 1234567890" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Email (optional)</label>
                  <input type="email" value={buyerEmail} onChange={e => setBuyerEmail(e.target.value)} placeholder="client@company.com" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Phone (optional)</label>
                  <input type="tel" value={buyerPhone} onChange={e => setBuyerPhone(e.target.value)} placeholder="08012345678" style={inputStyle} />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={labelStyle}>Address (optional)</label>
                  <input value={buyerAddress} onChange={e => setBuyerAddress(e.target.value)} placeholder="1 Broad Street, Lagos" style={inputStyle} />
                </div>
              </div>
            </div>

            {/* Line items */}
            <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <p style={{ fontWeight: 700, fontSize: '14px', margin: 0, color: '#0f172a' }}>Line Items</p>
                <button onClick={addItem} style={{ padding: '6px 14px', background: '#F0FDF4', color: '#00843D', border: '1px solid #bbf7d0', borderRadius: '8px', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>
                  + Add Item
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {items.map((item, idx) => (
                  <div key={item.id} style={{ background: '#F8FAFC', borderRadius: '12px', padding: '14px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 80px 120px 120px 120px auto', gap: '10px', alignItems: 'center' }}>
                      <div>
                        <label style={{ ...labelStyle, fontSize: '10px' }}>Description *</label>
                        <input value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)} placeholder="Service or product description" style={{ ...inputStyle, fontSize: '13px' }} />
                      </div>
                      <div>
                        <label style={{ ...labelStyle, fontSize: '10px' }}>Qty</label>
                        <input type="number" min="1" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 1)} style={{ ...inputStyle, fontSize: '13px' }} />
                      </div>
                      <div>
                        <label style={{ ...labelStyle, fontSize: '10px' }}>Unit Price (NGN)</label>
                        <input type="number" min="0" value={item.unitPrice || ''} onChange={e => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)} placeholder="0.00" style={{ ...inputStyle, fontSize: '13px' }} />
                      </div>
                      <div>
                        <label style={{ ...labelStyle, fontSize: '10px' }}>Item Code</label>
                        <input value={item.itemCode} onChange={e => updateItem(item.id, 'itemCode', e.target.value)} placeholder="SRV001" style={{ ...inputStyle, fontSize: '13px' }} />
                      </div>
                      <div>
                        <label style={{ ...labelStyle, fontSize: '10px' }}>Tax</label>
                        <select value={item.taxCategory} onChange={e => updateItem(item.id, 'taxCategory', e.target.value)} style={{ ...inputStyle, fontSize: '13px', cursor: 'pointer' }}>
                          <option value="VAT">VAT 7.5%</option>
                          <option value="ZERO_RATED">Zero Rated</option>
                          <option value="EXEMPT">Exempt</option>
                        </select>
                      </div>
                      <div style={{ paddingTop: '20px' }}>
                        {items.length > 1 && (
                          <button onClick={() => removeItem(item.id)} style={{ background: 'none', border: 'none', color: '#E4002B', cursor: 'pointer', fontWeight: 700, fontSize: '16px', padding: '4px 8px' }}>
                            x
                          </button>
                        )}
                      </div>
                    </div>
                    <p style={{ fontSize: '12px', color: '#64748b', margin: '8px 0 0', textAlign: 'right' }}>
                      Line total: <strong style={{ color: '#0f172a' }}>{fmt(item.quantity * item.unitPrice * (item.taxCategory === 'VAT' ? 1 + VAT_RATE : 1))}</strong>
                      {item.taxCategory === 'VAT' && <span style={{ color: '#64748b' }}> (incl. {fmt(item.quantity * item.unitPrice * VAT_RATE)} VAT)</span>}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div style={{ background: '#FFF1F2', border: '1px solid #fecdd3', borderRadius: '10px', padding: '12px 16px', fontSize: '13px', color: '#E4002B', fontWeight: 600 }}>
                {error}
              </div>
            )}
          </div>

          {/* SUMMARY SIDEBAR */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', position: 'sticky', top: '80px' }}>
            <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '20px' }}>
              <p style={{ fontWeight: 700, fontSize: '14px', margin: '0 0 16px', color: '#0f172a' }}>Invoice Summary</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span style={{ color: '#64748b' }}>Subtotal</span>
                  <span style={{ fontWeight: 600 }}>{fmt(subtotal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span style={{ color: '#64748b' }}>VAT (7.5%)</span>
                  <span style={{ fontWeight: 600 }}>{fmt(vatAmount)}</span>
                </div>
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '16px' }}>
                  <span style={{ fontWeight: 700 }}>Total</span>
                  <span style={{ fontWeight: 800, color: '#00843D' }}>{fmt(totalAmount)}</span>
                </div>
              </div>
            </div>

            <div style={{ background: '#F8FAFC', borderRadius: '14px', padding: '14px 16px', border: '1px solid #e2e8f0' }}>
              <p style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 8px' }}>What happens next</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  'Invoice submitted to DigiTax',
                  'DigiTax validates with NRS',
                  'IRN and QR code returned',
                  'Invoice legally compliant',
                ].map((step, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#64748b' }}>
                    <div style={{ width: '18px', height: '18px', background: '#00843D', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ color: '#fff', fontSize: '10px', fontWeight: 700 }}>{i + 1}</span>
                    </div>
                    {step}
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting || !company.tin}
              style={{ width: '100%', padding: '14px', background: submitting || !company.tin ? '#e2e8f0' : '#00843D', color: submitting || !company.tin ? '#94a3b8' : '#fff', border: 'none', borderRadius: '12px', fontWeight: 800, fontSize: '15px', cursor: submitting || !company.tin ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}>
              {submitting ? 'Submitting to NRS...' : 'Submit to NRS'}
            </button>

            {!company.tin && (
              <p style={{ fontSize: '12px', color: '#E4002B', textAlign: 'center', margin: 0 }}>
                Add your TIN in Settings first
              </p>
            )}

            <p style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center', lineHeight: 1.5, margin: 0 }}>
              Powered by DigiTax. Submitted directly to NRS Merchant Buyer Solution (MBS).
            </p>
          </div>
        </div>
      )}

      {/* HISTORY */}
      {tab === 'history' && (
        <div>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
              <div style={{ width: '32px', height: '32px', border: '3px solid #e2e8f0', borderTopColor: '#00843D', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : invoices.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🧾</div>
              <p style={{ fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>No invoices submitted yet</p>
              <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 20px' }}>Invoices you submit to NRS will appear here with their IRN and status.</p>
              <button onClick={() => setTab('create')} style={{ padding: '10px 24px', background: '#00843D', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>
                Create your first invoice
              </button>
            </div>
          ) : (
            <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
                <p style={{ fontWeight: 700, fontSize: '14px', margin: 0 }}>Submitted Invoices</p>
                <button onClick={loadInvoices} style={{ padding: '6px 14px', background: '#F8FAFC', border: '1px solid #e2e8f0', borderRadius: '8px', fontWeight: 600, fontSize: '12px', cursor: 'pointer', color: '#64748b' }}>
                  Refresh
                </button>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead style={{ background: '#F8FAFC' }}>
                  <tr>
                    {['Invoice #', 'IRN', 'Buyer', 'Amount', 'Status', 'Date'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(inv => {
                    const sc = statusColor(inv.status);
                    return (
                      <tr key={inv.irn} style={{ borderBottom: '1px solid #f8fafc' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 600 }}>{inv.invoiceNumber}</td>
                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '12px', color: '#64748b' }}>{inv.irn}</td>
                        <td style={{ padding: '12px 16px' }}>{inv.buyerName}</td>
                        <td style={{ padding: '12px 16px', fontWeight: 700 }}>{fmt(inv.totalAmount)}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ padding: '3px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                            {inv.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '12px' }}>
                          {new Date(inv.createdAt).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};
