/**
 * TaxPulse NG — Paystack Webhook Handler
 * Vercel Serverless Function: api/paystack-webhook.ts
 *
 * Place this file at: Downloads/taxpulse-ng/api/paystack-webhook.ts
 *
 * Required Vercel environment variables (set in Vercel Dashboard → Settings → Environment Variables):
 *   PAYSTACK_SECRET_KEY        — your Paystack secret key (sk_live_xxx)
 *   SUPABASE_URL               — same value as VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY  — from Supabase Dashboard → Settings → API → service_role key
 *
 * In Paystack Dashboard → Settings → Webhooks:
 *   URL: https://taxpulse-ng.vercel.app/api/paystack-webhook
 *   Events to enable: charge.success, subscription.create, subscription.disable, invoice.payment_failed
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// ─── Supabase admin client (service role — bypasses RLS for server ops) ───────
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ─── Verify Paystack signature ────────────────────────────────────────────────
function verifySignature(rawBody: string, signature: string): boolean {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return false;
  const hash = crypto
    .createHmac('sha512', secret)
    .update(rawBody)
    .digest('hex');
  return hash === signature;
}

// ─── Determine plan from event data ──────────────────────────────────────────
function detectPlan(planCode: string, event?: any): 'monthly' | 'annual' {
  // Primary: read plan_type we embedded in metadata
  const fields: any[] = event?.data?.metadata?.custom_fields ?? [];
  const planField = fields.find((f: any) => f.variable_name === 'plan_type');
  if (planField?.value === 'annual') return 'annual';
  if (planField?.value === 'monthly') return 'monthly';

  // Secondary: compare plan code against our env var
  const annualCode = process.env.VITE_PAYSTACK_PLAN_ANNUAL || '';
  return (annualCode && planCode === annualCode) ? 'annual' : 'monthly';
}

// ─── Compute expiry based on plan ────────────────────────────────────────────
function computeExpiry(plan: 'monthly' | 'annual'): string {
  const d = new Date();
  if (plan === 'annual') {
    d.setFullYear(d.getFullYear() + 1);
  } else {
    d.setMonth(d.getMonth() + 1);
    // Add 3-day grace period so renewal doesn't cut off mid-day
    d.setDate(d.getDate() + 3);
  }
  return d.toISOString();
}

// ─── Activate a user's Pro plan ───────────────────────────────────────────────
async function activatePro(
  userId: string,
  customerCode: string,
  subscriptionCode: string,
  plan: 'monthly' | 'annual',
  planCode: string
): Promise<void> {
  const expiresAt = computeExpiry(plan);
  const { error } = await supabaseAdmin
    .from('profiles')
    .update({
      plan:                        'pro',
      subscription_status:         'active',
      paystack_customer_code:      customerCode,
      paystack_subscription_code:  subscriptionCode,
      paystack_plan_code:          planCode,
      plan_expires_at:             expiresAt,
      pro_activated_at:            new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) throw new Error(`Supabase update failed: ${error.message}`);
  console.log(`[webhook] ✅ Pro activated for user ${userId} — plan: ${plan}, expires: ${expiresAt}`);
}

// ─── Deactivate a user's Pro plan ────────────────────────────────────────────
async function deactivatePro(subscriptionCode: string, reason: string): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update({ subscription_status: 'cancelled' })
    .eq('paystack_subscription_code', subscriptionCode)
    .select('id')
    .single();

  if (error) {
    console.error(`[webhook] deactivate failed for sub ${subscriptionCode}:`, error.message);
    return;
  }
  console.log(`[webhook] ⚠️ Pro deactivated for user ${data?.id} — reason: ${reason}`);
}

// ─── Look up user ID by email ─────────────────────────────────────────────────
async function findUserByEmail(email: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single();
  return data?.id ?? null;
}

// ─── Extract user ID from event metadata ─────────────────────────────────────
function extractUserId(event: any): string | null {
  // Primary: we embed user_id in Paystack metadata.custom_fields in Paywall.tsx
  const fields: any[] = event?.data?.metadata?.custom_fields ?? [];
  const field = fields.find((f: any) => f.variable_name === 'user_id');
  if (field?.value) return field.value;

  // Secondary: subscription metadata
  const subFields: any[] = event?.data?.subscription?.metadata?.custom_fields ?? [];
  const subField = subFields.find((f: any) => f.variable_name === 'user_id');
  if (subField?.value) return subField.value;

  return null;
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only accept POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Collect raw body for signature verification
  const rawBody = JSON.stringify(req.body);
  const signature = req.headers['x-paystack-signature'] as string;

  if (!signature || !verifySignature(rawBody, signature)) {
    console.warn('[webhook] ❌ Invalid signature — rejected');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const event    = req.body;
  const eventType: string = event?.event ?? '';
  const data     = event?.data ?? {};

  console.log(`[webhook] 📥 Event: ${eventType}`);

  try {
    // ── charge.success ──────────────────────────────────────────────────────
    // Fires for every successful charge — the most reliable event
    if (eventType === 'charge.success') {
      const email        = data?.customer?.email;
      const customerCode = data?.customer?.customer_code ?? '';
      const subCode      = data?.subscription?.subscription_code
                        ?? data?.reference
                        ?? '';
      const planCode     = data?.plan?.plan_code ?? data?.plan_object?.plan_code ?? '';
      const plan         = detectPlan(planCode, event);

      let userId = extractUserId(event);
      if (!userId && email) userId = await findUserByEmail(email);

      if (!userId) {
        console.error(`[webhook] charge.success: no user found for email ${email}`);
        // Return 200 so Paystack doesn't retry — we can't match this payment
        return res.status(200).json({ received: true, warning: 'user not found' });
      }

      await activatePro(userId, customerCode, subCode, plan, planCode);
      return res.status(200).json({ received: true, event: eventType, userId });
    }

    // ── subscription.create ─────────────────────────────────────────────────
    // Fires when a subscription is created (may fire before charge.success)
    if (eventType === 'subscription.create') {
      const email        = data?.customer?.email;
      const customerCode = data?.customer?.customer_code ?? '';
      const subCode      = data?.subscription_code ?? '';
      const planCode     = data?.plan?.plan_code ?? '';
      const plan         = detectPlan(planCode, event);

      let userId = extractUserId(event);
      if (!userId && email) userId = await findUserByEmail(email);

      if (!userId) {
        console.error(`[webhook] subscription.create: no user found for email ${email}`);
        return res.status(200).json({ received: true, warning: 'user not found' });
      }

      await activatePro(userId, customerCode, subCode, plan, planCode);
      return res.status(200).json({ received: true, event: eventType, userId });
    }

    // ── subscription.disable ────────────────────────────────────────────────
    // Fires when user cancels or card expires
    if (eventType === 'subscription.disable') {
      const subCode = data?.subscription_code ?? '';
      if (subCode) await deactivatePro(subCode, 'subscription.disable');
      return res.status(200).json({ received: true, event: eventType });
    }

    // ── invoice.payment_failed ──────────────────────────────────────────────
    // Fires when a recurring charge fails (card declined, expired, etc.)
    if (eventType === 'invoice.payment_failed') {
      const subCode = data?.subscription?.subscription_code ?? '';
      if (subCode) {
        // Don't immediately deactivate — Paystack retries 3 times.
        // Just log it. If subscription.disable fires later, that's when we act.
        console.warn(`[webhook] ⚠️ Payment failed for subscription ${subCode} — Paystack will retry`);
      }
      return res.status(200).json({ received: true, event: eventType });
    }

    // ── All other events ────────────────────────────────────────────────────
    // Acknowledge receipt — we don't process every event type
    console.log(`[webhook] ℹ️ Unhandled event type: ${eventType} — acknowledged`);
    return res.status(200).json({ received: true, event: eventType, handled: false });

  } catch (err: any) {
    console.error(`[webhook] 💥 Handler error for ${eventType}:`, err.message);
    // Return 500 so Paystack knows to retry
    return res.status(500).json({ error: 'Internal error', message: err.message });
  }
}
