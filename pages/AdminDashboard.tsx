// pages/AdminDashboard.tsx
import React, { useState, useEffect, useCallback } from 'react';

const SESSION_KEY = 'taxpulse_admin_auth';

const fmt     = (n: number) => '₦' + (n || 0).toLocaleString('en-NG');
const fmtNum  = (n: number) => (n || 0).toLocaleString('en-NG');
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' }) : '--';

const PasswordGate: React.FC<{ onUnlock: (s: string) => void }> = ({ onUnlock }) => {
  const [pw, setPw]     = useState('');
  const [err, setErr]   = useState('');
  const [busy, setBusy] = useState(false);

  const attempt = async () => {
    if (!pw.trim()) return;
    setBusy(true); setErr('');
    try {
      const res = await fetch('/api/admin-data?action=stats', { headers: { 'x-admin-secret': pw } });
      if (res.status === 403) { setErr('Incorrect password.'); setBusy(false); return; }
      if (!res.ok) { setErr('Server error ' + res.status); setBusy(false); return; }
      sessionStorage.setItem(SESSION_KEY, pw);
      onUnlock(pw);
    } catch (e: any) { setErr('Network error: ' + e.message); setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-cac-green rounded-2xl flex items-center justify-center text-white font-black text-xl mx-auto mb-3">A</div>
          <h1 className="text-xl font-extrabold text-slate-900">TaxPulse Admin</h1>
          <p className="text-slate-400 text-sm mt-1">Enter your admin password to continue</p>
        </div>
        <input type="password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === 'Enter' && attempt()}
          placeholder="Admin password" autoFocus
          className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-cac-green/30 focus:border-cac-green mb-3" />
        {err && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700 mb-3">{err}</div>}
        <button onClick={attempt} disabled={busy || !pw.trim()}
          className="w-full py-3 bg-cac-green text-white rounded-xl font-bold text-sm hover:bg-cac-dark transition-all disabled:opacity-50">
          {busy ? 'Verifying...' : 'Unlock Admin Panel'}
        </button>
        <div className="mt-4 text-center">
          <a href="/app" className="text-xs text-slate-400 hover:text-cac-green">Back to app</a>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: string | number; sub?: string; color?: string; icon?: string }> =
  ({ label, value, sub, color = 'text-slate-900', icon }) => (
  <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
    {icon && <p className="text-2xl mb-2">{icon}</p>}
    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">{label}</p>
    <p className={`text-2xl font-extrabold ${color}`}>{typeof value === 'number' ? value.toLocaleString('en-NG') : value}</p>
    {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
  </div>
);

export const AdminDashboard: React.FC = () => {
  const [secret, setSecret]             = useState<string | null>(null);
  const [tab, setTab]                   = useState<'overview' | 'users' | 'promos' | 'manual'>('overview');
  const [data, setData]                 = useState<any>(null);
  const [loading, setLoading]           = useState(false);
  const [userSearch, setUserSearch]     = useState('');
  const [msg, setMsg]                   = useState('');
  const [promoCode, setPromoCode]       = useState('');
  const [promoMax, setPromoMax]         = useState('50');
  const [promoExpiry, setPromoExpiry]   = useState('');
  const [promoBusy, setPromoBusy]       = useState(false);
  const [manualId, setManualId]         = useState('');
  const [manualPlan, setManualPlan]     = useState('pro');
  const [manualMonths, setManualMonths] = useState('1');
  const [manualBusy, setManualBusy]     = useState(false);

  useEffect(() => {
    const s = sessionStorage.getItem(SESSION_KEY);
    if (s) setSecret(s);
  }, []);

  const api = useCallback(async (action: string, method = 'GET', body?: any) => {
    const res = await fetch('/api/admin-data?action=' + action, {
      method,
      headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret || '' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (res.status === 403) { sessionStorage.removeItem(SESSION_KEY); setSecret(null); throw new Error('Session expired'); }
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  }, [secret]);

  const load = useCallback(async () => {
    if (!secret) return;
    setLoading(true);
    try { setData(await api('stats')); } catch (e: any) { console.error(e); } finally { setLoading(false); }
  }, [secret, api]);

  useEffect(() => { if (secret) load(); }, [secret, load]);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000); };

  const createPromo = async () => {
    if (!promoCode.trim()) return;
    setPromoBusy(true);
    try {
      await api('create-promo', 'POST', { code: promoCode, maxUses: parseInt(promoMax) || 50, expiresAt: promoExpiry || null });
      flash('Promo ' + promoCode.toUpperCase() + ' created');
      setPromoCode(''); setPromoExpiry(''); load();
    } catch (e: any) { flash('Error: ' + e.message); }
    finally { setPromoBusy(false); }
  };

  const togglePromo = async (id: string, cur: boolean) => {
    try { await api('toggle-promo', 'POST', { promoId: id, isActive: !cur }); flash('Done'); load(); }
    catch (e: any) { flash('Error: ' + e.message); }
  };

  const setPlan = async () => {
    if (!manualId.trim()) return;
    setManualBusy(true);
    try {
      await api('set-plan', 'POST', { userId: manualId.trim(), plan: manualPlan, months: parseInt(manualMonths) || 1 });
      flash('Plan updated to ' + manualPlan); setManualId(''); load();
    } catch (e: any) { flash('Error: ' + e.message); }
    finally { setManualBusy(false); }
  };

  if (!secret) return <PasswordGate onUnlock={s => setSecret(s)} />;

  const s = data?.stats || {};
  const users = (data?.users || []).filter((u: any) =>
    !userSearch || u.email?.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-slate-900 text-white px-6 py-4 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo-white.png" alt="TaxPulse NG" style={{ height: '28px', width: 'auto', objectFit: 'contain' }} />
            <span className="text-xs text-slate-500 border-l border-slate-700 pl-3 font-semibold tracking-widest uppercase">Admin</span>
          </div>
          <div className="flex items-center gap-3">
            {loading && <span className="text-xs text-slate-400 animate-pulse">Loading...</span>}
            <button onClick={load} className="text-xs text-slate-400 hover:text-white font-semibold">Refresh</button>
            <button onClick={() => { sessionStorage.removeItem(SESSION_KEY); setSecret(null); setData(null); }}
              className="text-xs text-red-400 hover:text-red-300 font-semibold">Lock</button>
            <a href="/app" className="text-xs text-slate-500 hover:text-white">Back to app</a>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {msg && <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm font-semibold text-cac-green">{msg}</div>}

        <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 w-fit shadow-sm">
          {([['overview','Overview'],['users','Users'],['promos','Promos'],['manual','Manual Override']] as const).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${tab === id ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
              {label}
            </button>
          ))}
        </div>

        {loading && !data && (
          <div className="grid grid-cols-4 gap-4">
            {Array(8).fill(0).map((_, i) => <div key={i} className="bg-white rounded-2xl p-5 border border-slate-100 h-24 animate-pulse" />)}
          </div>
        )}

        {tab === 'overview' && data && (
          <div className="space-y-6">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Revenue</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon="💰" label="Monthly MRR" value={fmt(s.MRR || 0)} color="text-cac-green" sub={(s.proMonthly || 0) + ' paying users'} />
                <StatCard icon="📈" label="Annual ARR"  value={fmt(s.ARR || 0)} color="text-cac-green" sub="MRR x 12" />
                <StatCard icon="⭐" label="Pro Users"   value={s.proUsers || 0} color="text-blue-600" sub={(s.conversionRate || 0) + '% conversion'} />
                <StatCard icon="🆓" label="Free Users"  value={s.freeUsers || 0} sub="Upgrade opportunity" />
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Users</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon="👤" label="Total Users"   value={s.totalUsers || 0} />
                <StatCard icon="✨" label="New (30 days)" value={s.newUsersLast30 || 0} color="text-purple-600" />
                <StatCard icon="🎫" label="Via Promo"     value={s.proPromo || 0} color="text-amber-600" />
                <StatCard icon="🏢" label="Companies"     value={s.totalCompanies || 0} />
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Compliance</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon="📋" label="Total Obligations" value={fmtNum(s.totalObligations || 0)} />
                <StatCard icon="✅" label="Filed"   value={fmtNum(s.totalFiled || 0)} color="text-cac-green"
                  sub={s.totalObligations > 0 ? ((s.totalFiled / s.totalObligations) * 100).toFixed(0) + '% rate' : '0%'} />
                <StatCard icon="⚠️" label="Overdue"     value={fmtNum(s.overdue || 0)} color="text-red-600" />
                <StatCard icon="📅" label="Filed Today" value={s.filedToday || 0} color="text-blue-600" />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                <p className="font-bold text-slate-800 text-sm mb-4">Top States</p>
                <div className="space-y-3">
                  {(s.topStates || []).map(([state, count]: [string, number]) => (
                    <div key={state}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-semibold text-slate-700">{state}</span>
                        <span className="text-slate-400 text-xs">{count}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-cac-green rounded-full" style={{ width: Math.min(100, (count / Math.max(1, s.totalCompanies)) * 300) + '%' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                <p className="font-bold text-slate-800 text-sm mb-4">Entity Types</p>
                <div className="space-y-2">
                  {Object.entries(s.entityCounts || {}).sort((a: any, b: any) => b[1] - a[1]).map(([type, count]: any) => (
                    <div key={type} className="flex justify-between py-1.5 border-b border-slate-50 last:border-0">
                      <span className="text-sm text-slate-600 truncate mr-3">{type.split(' (')[0]}</span>
                      <span className="text-sm font-bold text-slate-800 shrink-0">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'users' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Search by email..."
                className="flex-1 max-w-sm px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-cac-green/30" />
              <span className="text-sm text-slate-400">{users.length} users</span>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>{['Email','Plan','Status','Expires','Cos','Promo','Joined'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase whitespace-nowrap">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {users.map((u: any) => {
                    const expired = u.expires && new Date(u.expires) < new Date();
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-medium text-slate-800 max-w-[200px]">
                          <button onClick={() => { setManualId(u.id); setTab('manual'); }}
                            className="hover:text-cac-green hover:underline text-left truncate block max-w-full" title={'ID: ' + u.id}>
                            {u.email || '--'}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${u.plan === 'pro' ? 'bg-cac-green/10 text-cac-green' : 'bg-slate-100 text-slate-500'}`}>
                            {(u.plan || 'free').toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${u.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}>
                            {u.status || 'inactive'}
                          </span>
                        </td>
                        <td className={`px-4 py-3 text-xs whitespace-nowrap ${expired ? 'text-red-500 font-bold' : 'text-slate-400'}`}>
                          {u.expires ? fmtDate(u.expires) : '--'}
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-slate-600">{u.companies}</td>
                        <td className="px-4 py-3 text-xs text-slate-400">{u.promoUsed || '--'}</td>
                        <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{fmtDate(u.joined)}</td>
                      </tr>
                    );
                  })}
                  {users.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No users found</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'promos' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-4">Create New Promo Code</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Code</label>
                  <input value={promoCode} onChange={e => setPromoCode(e.target.value.toUpperCase())} placeholder="LAUNCH50"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-cac-green/30" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Max Uses</label>
                  <input type="number" value={promoMax} onChange={e => setPromoMax(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-cac-green/30" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Expiry</label>
                  <input type="date" value={promoExpiry} onChange={e => setPromoExpiry(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-cac-green/30" />
                </div>
                <div className="flex items-end">
                  <button onClick={createPromo} disabled={promoBusy || !promoCode.trim()}
                    className="w-full py-2.5 bg-cac-green text-white rounded-xl text-sm font-bold hover:bg-cac-dark disabled:opacity-50">
                    {promoBusy ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
              <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-slate-800">All Promo Codes</h3>
                <span className="text-xs text-slate-400">{(data?.promoCodes || []).length} total</span>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>{['Code','Plan','Uses/Max','Expires','Status',''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {(data?.promoCodes || []).map((p: any) => (
                    <tr key={p.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-mono font-bold text-slate-800">{p.code}</td>
                      <td className="px-4 py-3 text-cac-green font-semibold uppercase text-xs">{p.plan}</td>
                      <td className="px-4 py-3 text-slate-600">{p.uses_count}/{p.max_uses}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{p.expires_at ? fmtDate(p.expires_at) : 'No expiry'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-500'}`}>
                          {p.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => togglePromo(p.id, p.is_active)}
                          className={`text-xs font-bold hover:underline ${p.is_active ? 'text-red-500' : 'text-cac-green'}`}>
                          {p.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {(data?.promoCodes || []).length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No promo codes yet</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'manual' && (
          <div className="space-y-6 max-w-lg">
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-5">
              <div>
                <h3 className="font-bold text-slate-800">Manual Plan Override</h3>
                <p className="text-xs text-slate-400 mt-1">Use when Paystack webhook missed an upgrade.</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700">
                In Users tab, click a user email to auto-fill their ID here.
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">User ID (UUID)</label>
                  <input value={manualId} onChange={e => setManualId(e.target.value)} placeholder="Paste user UUID"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-cac-green/30" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Plan</label>
                    <select value={manualPlan} onChange={e => setManualPlan(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-cac-green/30">
                      <option value="pro">Pro</option>
                      <option value="free">Free (downgrade)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Months</label>
                    <input type="number" min="1" max="24" value={manualMonths} onChange={e => setManualMonths(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-cac-green/30" />
                  </div>
                </div>
                <button onClick={setPlan} disabled={manualBusy || !manualId.trim()}
                  className="w-full py-3 bg-cac-green text-white rounded-xl text-sm font-bold hover:bg-cac-dark disabled:opacity-50 transition-all">
                  {manualBusy ? 'Updating...' : 'Set to ' + manualPlan.toUpperCase() + ' for ' + manualMonths + ' month(s)'}
                </button>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
              <h3 className="font-bold text-slate-800 text-sm mb-4">Quick Links</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  ['Supabase',  'https://app.supabase.com'],
                  ['Paystack',  'https://dashboard.paystack.com'],
                  ['Vercel',    'https://vercel.com/dashboard'],
                  ['Resend',    'https://resend.com/dashboard'],
                  ['Termii',    'https://app.termii.com'],
                  ['Groq',      'https://console.groq.com'],
                ].map(([label, url]) => (
                  <a key={label} href={url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                    <span className="text-sm font-semibold text-slate-700">{label}</span>
                    <span className="ml-auto text-slate-400 text-xs">→</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
