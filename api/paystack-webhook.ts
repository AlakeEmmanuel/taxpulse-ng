/**
 * TaxPulse NG — Paystack Webhook Handler
 * Vercel Serverless Function  →  api/paystack-webhook.ts
 *
 * SETUP CHECKLIST:
 * 1. Place this file at: Downloads/taxpulse-ng/api/paystack-webhook.ts
 * 2. Place api/package.json ({"type":"commonjs"}) in the SAME api/ folder
 * 3. Vercel env vars needed (Settings → Environment Variables):
 *      PAYSTACK_SECRET_KEY         → sk_live_xxx
 *      SUPABASE_URL                → same as VITE_SUPABASE_URL
 *      SUPABASE_SERVICE_ROLE_KEY   → Supabase → Settings → API → service_role key
 */

import crypto from 'crypto';
import type { IncomingMessage, ServerResponse } from 'http';
import { createClient } from '@supabase/supabase-js';

type Req = IncomingMessage & { body?: any };
type Res = ServerResponse;

function getAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function verifySignature(rawBody: string, signature: string): boolean {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) { console.error('[webhook] PAYSTACK_SECRET_KEY not set'); return false; }
  const hash = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');
  return hash === signature;
}

function detectPlan(eventData: any): 'monthly' | 'annual' {
  const fields: any[] = eventData?.metadata?.custom_fields ?? [];
  const f = fields.find((x: any) => x.variable_name === 'plan_type');
  if (f?.value === 'annual')  return 'annual';
  if (f?.value === 'monthly') return 'monthly';
  const planCode   = eventData?.plan?.plan_code ?? eventData?.plan_object?.plan_code ?? '';
  const annualCode = process.env.VITE_PAYSTACK_PLAN_ANNUAL ?? '';
  return (annualCode && planCode === annualCode) ? 'annual' : 'monthly';
}

function computeExpiry(plan: 'monthly' | 'annual'): string {
  const d = new Date();
  if (plan === 'annual') {
    d.setFullYear(d.getFullYear() + 1);
  } else {
    d.setMonth(d.getMonth() + 1);
    d.setDate(d.getDate() + 3);
  }
  return d.toISOString();
}

async function findUserByEmail(email: string): Promise<string | null> {
  const { data } = await getAdmin().from('profiles').select('id').eq('email', email).single();
  return data?.id ?? null;
}

function extractUserId(eventData: any): string | null {
  const fields: any[] = eventData?.metadata?.custom_fields ?? [];
  return fields.find((f: any) => f.variable_name === 'user_id')?.value ?? null;
}

async function activatePro(userId: string, customerCode: string, subCode: string, plan: 'monthly' | 'annual') {
  const { error } = await getAdmin()
    .from('profiles')
    .update({
      plan:                       'pro',
      subscription_status:        'active',
      paystack_customer_code:     customerCode,
      paystack_subscription_code: subCode,
      plan_expires_at:            computeExpiry(plan),
      pro_activated_at:           new Date().toISOString(),
    })
    .eq('id', userId);
  if (error) throw new Error(`DB update failed: ${error.message}`);
  console.log(`[webhook] ✅ Pro activated — user:${userId} plan:${plan}`);
}

async function deactivatePro(subscriptionCode: string) {
  const { data, error } = await getAdmin()
    .from('profiles')
    .update({ subscription_status: 'cancelled' })
    .eq('paystack_subscription_code', subscriptionCode)
    .select('id').single();
  if (error) { console.error('[webhook] deactivate failed:', error.message); return; }
  console.log(`[webhook] ⚠️ Cancelled — user:${data?.id}`);
}

function readBody(req: Req): Promise<string> {
  return new Promise((resolve, reject) => {
    if (req.body !== undefined) {
      resolve(typeof req.body === 'string' ? req.body : JSON.stringify(req.body));
      return;
    }
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
    req.on('error', reject);
  });
}

function send(res: Res, status: number, body: object) {
  res.setHeader('Content-Type', 'application/json');
  res.statusCode = status;
  res.end(JSON.stringify(body));
}

export default async function handler(req: Req, res: Res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });

  const rawBody   = await readBody(req);
  const parsed    = req.body ?? (() => { try { return JSON.parse(rawBody); } catch { return {}; } })();
  const signature = (req.headers['x-paystack-signature'] as string) ?? '';
  const hmacInput = typeof req.body === 'string' ? req.body : rawBody;

  if (!signature || !verifySignature(hmacInput, signature)) {
    console.warn('[webhook] ❌ Bad signature');
    return send(res, 401, { error: 'Invalid signature' });
  }

  const eventType: string = parsed?.event ?? '';
  const data              = parsed?.data ?? {};
  console.log(`[webhook] 📥 ${eventType}`);

  try {
    if (eventType === 'charge.success') {
      const email        = data?.customer?.email ?? '';
      const customerCode = data?.customer?.customer_code ?? '';
      const subCode      = data?.subscription?.subscription_code ?? data?.reference ?? '';
      const plan         = detectPlan(data);
      let userId         = extractUserId(data);
      if (!userId && email) userId = await findUserByEmail(email);
      if (!userId) {
        console.error(`[webhook] no user found for ${email}`);
        return send(res, 200, { received: true, warning: 'user not found' });
      }
      await activatePro(userId, customerCode, subCode, plan);
      return send(res, 200, { received: true, event: eventType, plan });
    }

    if (eventType === 'subscription.create') {
      const email        = data?.customer?.email ?? '';
      const customerCode = data?.customer?.customer_code ?? '';
      const subCode      = data?.subscription_code ?? '';
      const plan         = detectPlan(data);
      let userId         = extractUserId(data);
      if (!userId && email) userId = await findUserByEmail(email);
      if (!userId) {
        console.error(`[webhook] no user found for ${email}`);
        return send(res, 200, { received: true, warning: 'user not found' });
      }
      await activatePro(userId, customerCode, subCode, plan);
      return send(res, 200, { received: true, event: eventType, plan });
    }

    if (eventType === 'subscription.disable') {
      const subCode = data?.subscription_code ?? '';
      if (subCode) await deactivatePro(subCode);
      return send(res, 200, { received: true, event: eventType });
    }

    if (eventType === 'invoice.payment_failed') {
      console.warn('[webhook] ⚠️ Payment failed — Paystack will retry');
      return send(res, 200, { received: true, event: eventType });
    }

    return send(res, 200, { received: true, event: eventType, handled: false });

  } catch (err: any) {
    console.error(`[webhook] 💥 ${eventType}:`, err.message);
    return send(res, 500, { error: 'Internal error', message: err.message });
  }
}
