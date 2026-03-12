// Supabase Edge Function — send-reminders
// Sends email + push notifications for upcoming tax deadlines
// Deploy with: supabase functions deploy send-reminders

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY   = Deno.env.get('RESEND_API_KEY')!;
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_EMAIL       = Deno.env.get('VAPID_EMAIL')!;
const SUPABASE_URL      = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Nigerian tax deadline descriptions
const OBLIGATION_LABELS: Record<string, string> = {
  VAT:       'VAT Return',
  WHT:       'Withholding Tax Remittance',
  CIT:       'Company Income Tax',
  PAYE:      'PAYE Remittance',
  PENSION:   'Pension Contribution',
  NHF:       'National Housing Fund',
};

Deno.serve(async (req) => {
  try {
    const today = new Date();
    const in7Days = new Date(today);
    in7Days.setDate(today.getDate() + 7);

    const in1Day = new Date(today);
    in1Day.setDate(today.getDate() + 1);

    // Get all upcoming obligations due in 7 days or 1 day
    const { data: obligations, error } = await supabase
      .from('tax_obligations')
      .select('*, companies(name, email)')
      .eq('status', 'pending')
      .lte('due_date', in7Days.toISOString().split('T')[0])
      .gte('due_date', today.toISOString().split('T')[0]);

    if (error) throw error;
    if (!obligations || obligations.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: 'No upcoming deadlines' }), { status: 200 });
    }

    let emailsSent = 0;
    let pushSent = 0;

    for (const ob of obligations) {
      const dueDate = new Date(ob.due_date);
      const daysLeft = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      // Only send on 7-day and 1-day marks
      if (daysLeft !== 7 && daysLeft !== 1) continue;

      const label = OBLIGATION_LABELS[ob.type] || ob.type;
      const company = ob.companies;
      const urgency = daysLeft === 1 ? '🚨 URGENT: Due Tomorrow' : '⏰ Due in 7 Days';

      // ── Send Email via Resend ──────────────────────────────
      if (company?.email) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'TaxPulse NG <reminders@taxpulse.ng>',
            to: [company.email],
            subject: `${urgency} — ${label} for ${company.name}`,
            html: `
              <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 32px;">
                <div style="background: #00843D; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
                  <h1 style="color: white; font-size: 20px; margin: 0;">TaxPulse NG</h1>
                  <p style="color: #a7f3c4; font-size: 12px; margin: 4px 0 0;">Tax Deadline Reminder</p>
                </div>
                <h2 style="color: #0f172a; font-size: 18px;">${urgency}</h2>
                <p style="color: #475569;">Hello,</p>
                <p style="color: #475569;">This is a reminder that <strong>${company.name}</strong> has a tax deadline coming up:</p>
                <div style="background: #f8fafc; border-left: 4px solid #00843D; border-radius: 8px; padding: 16px; margin: 20px 0;">
                  <p style="margin: 0; font-weight: bold; color: #0f172a;">${label}</p>
                  <p style="margin: 4px 0 0; color: #64748b;">Due: <strong>${dueDate.toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</strong></p>
                  <p style="margin: 4px 0 0; color: ${daysLeft === 1 ? '#dc2626' : '#d97706'}; font-weight: bold;">${daysLeft === 1 ? 'Due TOMORROW' : `${daysLeft} days remaining`}</p>
                </div>
                <a href="https://taxpulse-ng.vercel.app" style="display: inline-block; background: #00843D; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 8px;">
                  Open TaxPulse NG →
                </a>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
                <p style="color: #94a3b8; font-size: 11px;">TaxPulse NG · NTA 2025 Compliant · <a href="https://taxpulse-ng.vercel.app" style="color: #94a3b8;">taxpulse-ng.vercel.app</a></p>
              </div>
            `,
          }),
        });
        emailsSent++;
      }

      // ── Send Push Notification ─────────────────────────────
      const { data: pushSubs } = await supabase
        .from('push_subscriptions')
        .select('subscription')
        .eq('user_id', ob.user_id);

      if (pushSubs && pushSubs.length > 0) {
        for (const row of pushSubs) {
          try {
            await sendWebPush(row.subscription, {
              title: `${urgency} — ${label}`,
              body: `${company?.name}: ${label} due ${daysLeft === 1 ? 'tomorrow' : 'in 7 days'}`,
              url: 'https://taxpulse-ng.vercel.app',
            });
            pushSent++;
          } catch (e) {
            console.error('Push send error:', e);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, emailsSent, pushSent }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});

// ── Minimal Web Push using VAPID ───────────────────────────────────────────
async function sendWebPush(subscription: any, payload: { title: string; body: string; url: string }) {
  const endpoint = subscription.endpoint;
  const keys = subscription.keys;

  // Encode payload
  const payloadStr = JSON.stringify(payload);

  // Build VAPID JWT
  const vapidHeaders = await buildVapidHeaders(endpoint, VAPID_EMAIL, VAPID_PRIVATE_KEY);

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      ...vapidHeaders,
      'Content-Type': 'application/octet-stream',
      'Content-Length': '0',
      'TTL': '86400',
    },
  });

  if (!res.ok) throw new Error(`Push failed: ${res.status}`);
}

async function buildVapidHeaders(endpoint: string, email: string, privateKeyB64: string) {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const now = Math.floor(Date.now() / 1000);

  const header = btoa(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const claims = btoa(JSON.stringify({ aud: audience, exp: now + 43200, sub: email }));
  const unsigned = `${header}.${claims}`;

  return {
    'Authorization': `vapid t=${unsigned},k=${privateKeyB64}`,
  };
}
