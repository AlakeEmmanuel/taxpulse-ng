// api/admin-data.ts
// Protected Vercel serverless function -- admin only
// Requires ADMIN_SECRET header to match ADMIN_SECRET env var
// Uses SUPABASE_SERVICE_ROLE_KEY to bypass RLS and read all data

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const ADMIN_SECRET = process.env.ADMIN_SECRET || '';
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function getAdmin() {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS for local dev
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-secret');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Auth check
  const secret = req.headers['x-admin-secret'];
  if (!ADMIN_SECRET || secret !== ADMIN_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const db = getAdmin();
  const action = req.query.action as string;

  try {
    // ── GET actions ──────────────────────────────────────────────────────────
    if (req.method === 'GET') {

      if (action === 'stats') {
        const [profiles, companies, obligations, promoCodes] = await Promise.all([
          db.from('profiles').select('id, email, plan, subscription_status, plan_expires_at, created_at, promo_code_used'),
          db.from('companies').select('id, user_id, name, entity_type, state, created_at'),
          db.from('tax_obligations').select('id, company_id, type, status, due_date, estimated_amount, actual_amount'),
          db.from('promo_codes').select('*').order('created_at', { ascending: false }),
        ]);

        const now = new Date();
        const users = profiles.data || [];
        const cos   = companies.data || [];
        const obs   = obligations.data || [];
        const promos = promoCodes.data || [];

        // MRR calculation
        const proMonthly = users.filter(u =>
          u.plan === 'pro' && u.subscription_status === 'active' &&
          (!u.plan_expires_at || new Date(u.plan_expires_at) > now) &&
          !u.promo_code_used
        ).length;
        const proPromo = users.filter(u =>
          u.plan === 'pro' && u.promo_code_used &&
          (!u.plan_expires_at || new Date(u.plan_expires_at) > now)
        ).length;
        const proTotal = users.filter(u =>
          u.plan === 'pro' && (!u.plan_expires_at || new Date(u.plan_expires_at) > now)
        ).length;

        const MRR = proMonthly * 5000; // ₦5,000/mo -- some may be annual but rough MRR

        // Signups last 30 days
        const last30 = new Date(now.getTime() - 30 * 86400000).toISOString();
        const newUsersLast30 = users.filter(u => u.created_at > last30).length;

        // Obligations stats
        const filedToday = obs.filter(o => {
          const pd = (o as any).payment_date;
          return pd && pd.startsWith(now.toISOString().slice(0, 10));
        }).length;
        const overdue = obs.filter(o => o.status === 'Overdue').length;
        const totalFiled = obs.filter(o => o.status === 'Filed').length;

        // Top states
        const stateCounts: Record<string, number> = {};
        cos.forEach(c => { stateCounts[c.state] = (stateCounts[c.state] || 0) + 1; });
        const topStates = Object.entries(stateCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

        // Entity type breakdown
        const entityCounts: Record<string, number> = {};
        cos.forEach(c => { entityCounts[c.entity_type] = (entityCounts[c.entity_type] || 0) + 1; });

        return res.status(200).json({
          stats: {
            totalUsers:     users.length,
            proUsers:       proTotal,
            proMonthly,
            proPromo,
            freeUsers:      users.length - proTotal,
            conversionRate: users.length > 0 ? ((proTotal / users.length) * 100).toFixed(1) : '0',
            MRR,
            ARR:            MRR * 12,
            newUsersLast30,
            totalCompanies: cos.length,
            totalObligations: obs.length,
            totalFiled,
            overdue,
            filedToday,
            topStates,
            entityCounts,
          },
          users: users.map(u => ({
            id:       u.id,
            email:    u.email,
            plan:     u.plan,
            status:   u.subscription_status,
            expires:  u.plan_expires_at,
            joined:   u.created_at,
            promoUsed: u.promo_code_used,
            companies: cos.filter(c => c.user_id === u.id).length,
          })).sort((a, b) => new Date(b.joined).getTime() - new Date(a.joined).getTime()),
          promoCodes: promos,
        });
      }

      return res.status(400).json({ error: 'Unknown action' });
    }

    // ── POST actions ─────────────────────────────────────────────────────────
    if (req.method === 'POST') {
      const body = req.body;

      // Manually set a user's plan
      if (action === 'set-plan') {
        const { userId, plan, months = 1 } = body;
        if (!userId || !plan) return res.status(400).json({ error: 'userId and plan required' });

        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + parseInt(months));

        const { error } = await db.from('profiles').update({
          plan,
          subscription_status: plan === 'pro' ? 'active' : 'inactive',
          plan_expires_at:      plan === 'pro' ? expiresAt.toISOString() : null,
        }).eq('id', userId);

        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json({ ok: true, message: `User plan set to ${plan}` });
      }

      // Create promo code
      if (action === 'create-promo') {
        const { code, plan = 'pro', maxUses = 50, expiresAt } = body;
        if (!code) return res.status(400).json({ error: 'code required' });

        const { data, error } = await db.from('promo_codes').insert({
          code:       code.toUpperCase().trim(),
          plan,
          max_uses:   maxUses,
          uses_count: 0,
          is_active:  true,
          expires_at: expiresAt || null,
        }).select().single();

        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json({ ok: true, promo: data });
      }

      // Toggle promo active/inactive
      if (action === 'toggle-promo') {
        const { promoId, isActive } = body;
        if (!promoId) return res.status(400).json({ error: 'promoId required' });

        const { error } = await db.from('promo_codes')
          .update({ is_active: isActive }).eq('id', promoId);

        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json({ ok: true });
      }

      // Send announcement (stores in a simple key-value config table -- optional)
      if (action === 'set-announcement') {
        const { message } = body;
        // Store in promo_codes table as a special record for simplicity
        // Or just return 200 -- frontend reads from env/hardcoded for now
        return res.status(200).json({ ok: true, message: 'Announcement noted' });
      }

      return res.status(400).json({ error: 'Unknown action' });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (e: any) {
    console.error('Admin API error:', e);
    return res.status(500).json({ error: e.message });
  }
}
