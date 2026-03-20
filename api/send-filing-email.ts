// api/send-filing-email.ts
// Vercel serverless function -- sends confirmation email when user marks obligation as filed
// Uses Resend API (https://resend.com) -- set RESEND_API_KEY in Vercel env vars

import type { VercelRequest, VercelResponse } from '@vercel/node';

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';

interface FilingEmailPayload {
  to:          string;   // user email
  companyName: string;
  taxType:     string;
  period:      string;
  dueDate:     string;
  actualAmount?: number;
  paymentDate:  string;
  receiptRef?:  string;
}

function formatAmount(n?: number): string {
  if (!n) return 'Not specified';
  return '₦' + n.toLocaleString('en-NG', { maximumFractionDigits: 2 });
}

function formatDate(d: string): string {
  try {
    return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch { return d; }
}

function buildEmailHtml(p: FilingEmailPayload): string {
  const GREEN = '#00843D';
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#F7F7F5;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F7F5;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e8e8e4;max-width:600px;width:100%;">

        <!-- Header -->
        <tr><td style="background:${GREEN};padding:28px 32px;">
          <p style="margin:0;color:#fff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">TaxPulse NG</p>
          <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">Nigeria Tax Compliance Platform · NTA 2025</p>
        </td></tr>

        <!-- Success badge -->
        <tr><td style="padding:32px 32px 8px;">
          <table cellpadding="0" cellspacing="0" style="background:#e8f5ee;border:1px solid #b8dfc8;border-radius:12px;width:100%;">
            <tr><td style="padding:20px 24px;">
              <p style="margin:0;font-size:26px;">✅</p>
              <p style="margin:8px 0 4px;color:${GREEN};font-size:18px;font-weight:800;">Tax obligation filed successfully!</p>
              <p style="margin:0;color:#555;font-size:14px;">Your compliance record has been updated in TaxPulse NG.</p>
            </td></tr>
          </table>
        </td></tr>

        <!-- Filing details -->
        <tr><td style="padding:24px 32px 8px;">
          <p style="margin:0 0 16px;color:#0d0d0d;font-size:15px;font-weight:700;border-bottom:2px solid #e8f5ee;padding-bottom:8px;">Filing Summary</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            ${[
              ['Company', p.companyName],
              ['Tax Type', p.taxType],
              ['Period', p.period],
              ['Original Due Date', formatDate(p.dueDate)],
              ['Amount Paid', formatAmount(p.actualAmount)],
              ['Payment Date', formatDate(p.paymentDate)],
              ...(p.receiptRef ? [['Reference No.', p.receiptRef]] : []),
            ].map(([label, val], i) => `
            <tr style="background:${i % 2 === 0 ? '#f7f7f5' : '#fff'}">
              <td style="padding:10px 12px;color:#888;font-size:13px;width:45%;">${label}</td>
              <td style="padding:10px 12px;color:#0d0d0d;font-size:13px;font-weight:600;">${val}</td>
            </tr>`).join('')}
          </table>
        </td></tr>

        <!-- NTA reminder -->
        <tr><td style="padding:16px 32px;">
          <table cellpadding="0" cellspacing="0" style="background:#fef9e7;border:1px solid #fde68a;border-radius:10px;width:100%;">
            <tr><td style="padding:16px 20px;">
              <p style="margin:0 0 6px;color:#92400e;font-size:13px;font-weight:700;">📋 NTA 2025 Reminder</p>
              <p style="margin:0;color:#78350f;font-size:12px;line-height:1.6;">Keep all payment receipts and supporting documents for a minimum of <strong>6 years</strong> as required by the Nigeria Tax Act 2025, Section 98. Store them in your TaxPulse Evidence Vault for easy access during an NRS audit.</p>
            </td></tr>
          </table>
        </td></tr>

        <!-- CTA -->
        <tr><td style="padding:16px 32px 32px;text-align:center;">
          <a href="https://taxpulse-ng.vercel.app/app"
             style="display:inline-block;background:${GREEN};color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-size:14px;font-weight:700;letter-spacing:-0.3px;">
            View Dashboard →
          </a>
          <p style="margin:16px 0 0;color:#999;font-size:12px;">This is an automated confirmation from TaxPulse NG.</p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#0d0d0d;padding:20px 32px;">
          <p style="margin:0;color:#666;font-size:12px;">TaxPulse NG · NTA 2025 Compliant · taxpulse-ng.vercel.app</p>
          <p style="margin:4px 0 0;color:#444;font-size:11px;">Built for Nigerian SMEs. Not financial advice -- consult a tax professional for complex situations.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!RESEND_API_KEY) {
    // Silently succeed if key not set -- don't break the filing flow
    console.warn('RESEND_API_KEY not set -- email skipped');
    return res.status(200).json({ ok: true, skipped: true });
  }

  const payload: FilingEmailPayload = req.body;

  if (!payload.to || !payload.taxType || !payload.companyName) {
    return res.status(400).json({ error: 'Missing required fields: to, taxType, companyName' });
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from:    'TaxPulse NG <noreply@taxpulse.ng>',
        to:      [payload.to],
        subject: `✅ ${payload.taxType} filed -- ${payload.companyName} (${payload.period})`,
        html:    buildEmailHtml(payload),
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Resend error:', result);
      // Return 200 to avoid breaking the filing flow
      return res.status(200).json({ ok: false, error: result });
    }

    return res.status(200).json({ ok: true, id: result.id });
  } catch (e: any) {
    console.error('Email send failed:', e.message);
    // Always return 200 -- email failure must never break filing
    return res.status(200).json({ ok: false, error: e.message });
  }
}
