// pages/AdminDashboard.tsx
// Protected admin panel — only accessible to ADMIN_EMAIL user
// All data loaded via /api/admin-data serverless function

import React, { useState, useEffect, useCallback } from 'react';

const ADMIN_SECRET = import.meta.env.VITE_ADMIN_SECRET as string || '';

const fmt     = (n: number) => '₦' + n.toLocaleString('en-NG');
const fmtNum  = (n: number) => n.toLocaleString('en-NG');
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtDatetime = (d: string) => d ? new Date(d).toLocaleString('en-NG', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

async function adminFetch(action: string, method = 'GET', body?: any) {
  const url = `/api/admin-data?action=${action}`;
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-admin-secret': ADMIN_SECRET,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) throw new Error(`Admin API error: ${res.status}`);
  return res.json();
}

// ── Stat card ─────────────────────────────────────────────────────────────────
const StatCard: React.FC<{ label: string; value: string | number; sub?: string; color?: string; icon?: string }> =
  ({ label, value, sub, color = 'text-slate-900', icon }) => (
  <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
    {icon && <p className="text-2xl mb-2">{icon}</p>}
    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">{label}</p>
    <p className={`text-2xl font-extrabold ${color}`}>{typeof value === 'number' ? value.toLocaleString('en-NG') : value}</p>
    {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
  </div>
);

// ── Main AdminDashboard ───────────────────────────────────────────────────────
export const AdminDashboard: React.FC = () => {
  const [tab, setTab]             = useState<'overview' | 'users' | 'promos' | 'manual'>('overview');
  const [data, setData]           = useState<any>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  // Promo form
  const [promoCode, setPromoCode]     = useState('');
  const [promoMaxUses, setPromoMaxUses] = useState('50');
  const [promoExpiry, setPromoExpiry] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);

  // Manual override form
  const [manualUserId, setManualUserId]   = useState('');
  const [manualPlan, setManualPlan]       = useState('pro');
  const [manualMonths, setManualMonths]   = useState('1');
  const [manualLoading, setManualLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const d = await adminFetch('stats');
      setData(d);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const showMsg = (msg: string) => {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(''), 4000);
  };

  const createPromo = async () => {
    if (!promoCode.trim()) return;
    setPromoLoading(true);
    try {
      await adminFetch('create-promo', 'POST', {
        code: promoCode, maxUses: parseInt(promoMaxUses) || 50,
        expiresAt: promoExpiry || null,
      });
      showMsg(`✅ Promo code ${promoCode.toUpperCase()} created`);
      setPromoCode(''); setPromoExpiry('');
      load();
    } catch (e: any) {
      showMsg(`❌ ${e.message}`);
    } finally {
      setPromoLoading(false);
    }
  };

  const togglePromo = async (id: string, current: boolean) => {
    try {
      await adminFetch('toggle-promo', 'POST', { promoId: id, isActive: !current });
      showMsg(`✅ Promo ${current ? 'deactivated' : 'activated'}`);
      load();
    } catch (e: any) {
      showMsg(`❌ ${e.message}`);
    }
  };

  const setUserPlan = async () => {
    if (!manualUserId.trim()) return;
    setManualLoading(true);
    try {
      await adminFetch('set-plan', 'POST', {
        userId: manualUserId.trim(), plan: manualPlan, months: parseInt(manualMonths) || 1,
      });
      showMsg(`✅ User plan updated to ${manualPlan}`);
      setManualUserId('');
      load();
    } catch (e: any) {
      showMsg(`❌ ${e.message}`);
    } finally {
      setManualLoading(false);
    }
  };

  const filteredUsers = data?.users?.filter((u: any) =>
    !userSearch || u.email?.toLowerCase().includes(userSearch.toLowerCase())
  ) || [];

  if (!ADMIN_SECRET) return (
    <div className="min-h-screen flex items-center justify-center bg-red-50">
      <div className="bg-white rounded-2xl p-8 text-center max-w-sm border border-red-200">
        <p className="text-3xl mb-3">⚠️</p>
        <h2 className="font-bold text-slate-800 mb-2">VITE_ADMIN_SECRET not set</h2>
        <p className="text-sm text-slate-500">Add VITE_ADMIN_SECRET to your .env.local and Vercel environment variables.</p>
      </div>
    </div>
  );

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-cac-green border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-500 text-sm">Loading admin data...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-red-50 p-6">
      <div className="bg-white rounded-2xl p-8 text-center max-w-sm border border-red-200">
        <p className="text-3xl mb-3">🔒</p>
        <h2 className="font-bold text-slate-800 mb-2">Access Denied</h2>
        <p className="text-sm text-red-600">{error}</p>
        <p className="text-xs text-slate-400 mt-2">Check that VITE_ADMIN_SECRET matches ADMIN_SECRET in Vercel.</p>
      </div>
    </div>
  );

  const s = data?.stats || {};

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-slate-900 text-white px-6 py-4 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-cac-green rounded-lg flex items-center justify-center font-black text-sm">A</div>
            <div>
              <p className="font-bold text-sm">TaxPulse NG — Admin</p>
              <p className="text-slate-400 text-xs">Internal dashboard · Confidential</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={load} className="text-xs text-slate-400 hover:text-white font-semibold">↻ Refresh</button>
            <p className="text-xs text-slate-500">Last updated: {new Date().toLocaleTimeString('en-NG')}</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">

        {actionMsg && (
          <div className={`rounded-xl px-4 py-3 text-sm font-semibold ${actionMsg.startsWith('✅') ? 'bg-green-50 border border-green-200 text-cac-green' : 'bg-red-50 border border-red-200 text-red-700'}`}>
            {actionMsg}
          </div>
        )}

        {/* Tab nav */}
        <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 w-fit shadow-sm">
          {([
            { id: 'overview', label: '📊 Overview' },
            { id: 'users',    label: '👥 Users' },
            { id: 'promos',   label: '🎫 Promo Codes' },
            { id: 'manual',   label: '🔧 Manual Override' },
          ] as const).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${tab === t.id ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ──────────────────────────────────────────────── */}
        {tab === 'overview' && (
          <div className="space-y-6">
            {/* Revenue */}
            <div>
              <h2 className="font-bold text-slate-800 mb-3 text-sm uppercase tracking-wider">Revenue</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Monthly MRR" value={fmt(s.MRR || 0)} color="text-cac-green" icon="💰" sub="Paying subscribers × ₦5k" />
                <StatCard label="Annual ARR" value={fmt(s.ARR || 0)} color="text-cac-green" icon="📈" sub="MRR × 12" />
                <StatCard label="Pro Users" value={s.proUsers || 0} color="text-blue-600" icon="⭐" sub={`${s.conversionRate}% conversion`} />
                <StatCard label="Free Users" value={s.freeUsers || 0} color="text-slate-600" icon="🆓" sub="Upgrade opportunity" />
              </div>
            </div>

            {/* Users */}
            <div>
              <h2 className="font-bold text-slate-800 mb-3 text-sm uppercase tracking-wider">Users</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Total Users" value={s.totalUsers || 0} icon="👤" />
                <StatCard label="New (Last 30d)" value={s.newUsersLast30 || 0} icon="✨" color="text-purple-600" />
                <StatCard label="Via Promo Code" value={s.proPromo || 0} icon="🎫" color="text-amber-600" />
                <StatCard label="Total Companies" value={s.totalCompanies || 0} icon="🏢" />
              </div>
            </div>

            {/* Obligations */}
            <div>
              <h2 className="font-bold text-slate-800 mb-3 text-sm uppercase tracking-wider">Tax Compliance Activity</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Total Obligations" value={fmtNum(s.totalObligations || 0)} icon="📋" />
                <StatCard label="Filed" value={fmtNum(s.totalFiled || 0)} icon="✅" color="text-cac-green" sub={`${s.totalObligations > 0 ? ((s.totalFiled/s.totalObligations)*100).toFixed(0) : 0}% of total`} />
                <StatCard label="Overdue" value={fmtNum(s.overdue || 0)} icon="⚠️" color="text-red-600" />
                <StatCard label="Filed Today" value={s.filedToday || 0} icon="📅" color="text-blue-600" />
              </div>
            </div>

            {/* Geographic breakdown */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-3 text-sm">Top States</h3>
                <div className="space-y-2">
                  {(s.topStates || []).map(([state, count]: [string, number]) => (
                    <div key={state} className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-semibold text-slate-700">{state}</span>
                          <span className="text-slate-400">{count} companies</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-cac-green rounded-full"
                            style={{ width: `${Math.min(100, (count / (s.totalCompanies || 1)) * 100 * 3)}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-3 text-sm">Entity Types</h3>
                <div className="space-y-2">
                  {Object.entries(s.entityCounts || {}).sort((a: any, b: any) => b[1] - a[1]).map(([type, count]: any) => (
                    <div key={type} className="flex justify-between items-center py-1.5 border-b border-slate-50 last:border-0">
                      <span className="text-sm text-slate-600">{type.split(' (')[0]}</span>
                      <span className="text-sm font-bold text-slate-800">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── USERS TAB ──────────────────────────────────────────────────── */}
        {tab === 'users' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                placeholder="Search by email..."
                className="flex-1 max-w-sm px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-cac-green/30 bg-white"
              />
              <p className="text-sm text-slate-400">{filteredUsers.length} users</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      {['Email', 'Plan', 'Status', 'Expires', 'Companies', 'Promo Used', 'Joined'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredUsers.map((u: any) => (
                      <tr key={u.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-medium text-slate-800 max-w-xs truncate">
                          <button
                            onClick={() => { setManualUserId(u.id); setTab('manual'); }}
                            className="hover:text-cac-green hover:underline text-left"
                            title="Click to manage this user"
                          >
                            {u.email || '—'}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${u.plan === 'pro' ? 'bg-cac-green/10 text-cac-green' : 'bg-slate-100 text-slate-500'}`}>
                            {u.plan?.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${u.status === 'active' ? 'bg-green-100 text-green-700' : u.status === 'cancelled' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
                            {u.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                          {u.expires ? (
                            <span className={new Date(u.expires) < new Date() ? 'text-red-500 font-bold' : ''}>
                              {fmtDate(u.expires)}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3 text-center text-slate-600 font-bold">{u.companies}</td>
                        <td className="px-4 py-3 text-slate-400 text-xs">{u.promoUsed || '—'}</td>
                        <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{fmtDate(u.joined)}</td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && (
                      <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400 text-sm">No users found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── PROMO CODES TAB ───────────────────────────────────────────── */}
        {tab === 'promos' && (
          <div className="space-y-6">
            {/* Create new promo */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-4">Create New Promo Code</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Code</label>
                  <input
                    value={promoCode}
                    onChange={e => setPromoCode(e.target.value.toUpperCase())}
                    placeholder="e.g. LAUNCH50"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-cac-green/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Max Uses</label>
                  <input
                    type="number"
                    value={promoMaxUses}
                    onChange={e => setPromoMaxUses(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-cac-green/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Expiry Date</label>
                  <input
                    type="date"
                    value={promoExpiry}
                    onChange={e => setPromoExpiry(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-cac-green/30"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={createPromo}
                    disabled={promoLoading || !promoCode.trim()}
                    className="w-full py-2.5 bg-cac-green text-white rounded-xl text-sm font-bold hover:bg-cac-dark disabled:opacity-50 transition-all"
                  >
                    {promoLoading ? 'Creating...' : 'Create Code'}
                  </button>
                </div>
              </div>
            </div>

            {/* Existing promo codes */}
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="font-bold text-slate-800">Active Promo Codes</h3>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {['Code', 'Plan', 'Uses', 'Max Uses', 'Expires', 'Status', 'Action'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {(data?.promoCodes || []).map((p: any) => (
                    <tr key={p.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-mono font-bold text-slate-800">{p.code}</td>
                      <td className="px-4 py-3 font-semibold text-cac-green uppercase">{p.plan}</td>
                      <td className="px-4 py-3 text-slate-600">{p.uses_count}</td>
                      <td className="px-4 py-3 text-slate-600">{p.max_uses}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{p.expires_at ? fmtDate(p.expires_at) : 'No expiry'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                          {p.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => togglePromo(p.id, p.is_active)}
                          className={`text-xs font-bold hover:underline ${p.is_active ? 'text-red-500' : 'text-cac-green'}`}
                        >
                          {p.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── MANUAL OVERRIDE TAB ────────────────────────────────────────── */}
        {tab === 'manual' && (
          <div className="space-y-6 max-w-lg">
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-5">
              <div>
                <h3 className="font-bold text-slate-800 mb-1">Manual Plan Override</h3>
                <p className="text-xs text-slate-400">Use this when a user's payment went through but Paystack webhook missed the upgrade, or to grant Pro access manually.</p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
                ⚠️ To get a user's ID: go to the Users tab, click their email — it auto-fills the User ID below.
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">User ID (from Supabase / Users tab)</label>
                  <input
                    value={manualUserId}
                    onChange={e => setManualUserId(e.target.value)}
                    placeholder="uuid-format user id"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-cac-green/30"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Set Plan To</label>
                    <select
                      value={manualPlan}
                      onChange={e => setManualPlan(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-cac-green/30"
                    >
                      <option value="pro">Pro</option>
                      <option value="free">Free (downgrade)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Duration (months)</label>
                    <input
                      type="number"
                      min="1"
                      max="24"
                      value={manualMonths}
                      onChange={e => setManualMonths(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-cac-green/30"
                    />
                  </div>
                </div>

                <button
                  onClick={setUserPlan}
                  disabled={manualLoading || !manualUserId.trim()}
                  className="w-full py-3 bg-cac-green text-white rounded-xl text-sm font-bold hover:bg-cac-dark disabled:opacity-50 transition-all"
                >
                  {manualLoading ? 'Updating...' : `Set Plan to ${manualPlan.toUpperCase()} for ${manualMonths} month(s)`}
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-3">
              <h3 className="font-bold text-slate-800 mb-1">Quick Links</h3>
              {[
                { label: 'Supabase Dashboard', url: 'https://app.supabase.com' },
                { label: 'Paystack Dashboard', url: 'https://dashboard.paystack.com' },
                { label: 'Vercel Dashboard', url: 'https://vercel.com/dashboard' },
                { label: 'Resend Dashboard', url: 'https://resend.com/dashboard' },
                { label: 'Termii Dashboard', url: 'https://app.termii.com' },
              ].map(link => (
                <a
                  key={link.label}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <span className="text-sm font-semibold text-slate-700">{link.label}</span>
                  <span className="text-slate-400 text-xs">→</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
