// pages/AdminDashboard.tsx
// Standalone admin panel — rendered directly from index.tsx when path is /admin
// Has its own password gate — no email matching needed
// Password = ADMIN_SECRET (same value set in Vercel env vars)

import React, { useState, useEffect, useCallback } from 'react';

const SESSION_KEY = 'taxpulse_admin_auth';

const fmt       = (n: number) => '₦' + n.toLocaleString('en-NG');
const fmtNum    = (n: number) => n.toLocaleString('en-NG');
const fmtDate   = (d: string) => d ? new Date(d).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

// ── Password Gate ─────────────────────────────────────────────────────────────
const PasswordGate: React.FC<{ onUnlock: (secret: string) => void }> = ({ onUnlock }) => {
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const attempt = async () => {
    if (!password.trim()) return;
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/admin-data?action=stats', {
        headers: { 'x-admin-secret': password },
      });
      if (res.status === 403) {
        setError('Incorrect password. Check your ADMIN_SECRET environment variable in Vercel.');
        setLoading(false);
        return;
      }
      if (!res.ok) {
        setError(`Server error ${res.status} — check Vercel function logs.`);
        setLoading(false);
        return;
      }
      sessionStorage.setItem(SESSION_KEY, password);
      onUnlock(password);
    } catch (e: any) {
      setError('Network error: ' + e.message);
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight:'100vh', background:'#0f172a', display:'flex', alignItems:'center', justifyContent:'center', padding:'24px' }}>
      <div style={{ background:'#fff', borderRadius:'16px', padding:'32px', width:'100%', maxWidth:'360px', boxShadow:'0 25px 50px rgba(0,0,0,0.5)' }}>
        <div style={{ textAlign:'center', marginBottom:'24px' }}>
          <div style={{ width:'56px', height:'56px', background:'#00843D', borderRadius:'14px', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:900, fontSize:'20px', margin:'0 auto 12px' }}>A</div>
          <h1 style={{ fontSize:'20px', fontWeight:800, color:'#0f172a', margin:0 }}>TaxPulse Admin</h1>
          <p style={{ color:'#94a3b8', fontSize:'13px', marginTop:'6px' }}>Enter your ADMIN_SECRET to continue</p>
        </div>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && attempt()}
          placeholder="Admin password"
          autoFocus
          style={{ width:'100%', padding:'12px 16px', borderRadius:'12px', border:'1.5px solid #e2e8f0', fontSize:'14px', outline:'none', boxSizing:'border-box', marginBottom:'12px', fontFamily:'monospace' }}
        />
        {error && (
          <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:'10px', padding:'10px 14px', fontSize:'12px', color:'#b91c1c', marginBottom:'12px' }}>
            {error}
          </div>
        )}
        <button
          onClick={attempt}
          disabled={loading || !password.trim()}
          style={{ width:'100%', padding:'12px', background: loading||!password.trim() ? '#94a3b8' : '#00843D', color:'#fff', border:'none', borderRadius:'12px', fontWeight:700, fontSize:'14px', cursor: loading||!password.trim() ? 'not-allowed' : 'pointer' }}
        >
          {loading ? 'Verifying...' : 'Unlock Admin Panel'}
        </button>
        <div style={{ marginTop:'16px', background:'#f8fafc', borderRadius:'10px', padding:'12px', fontSize:'11px', color:'#64748b' }}>
          <p style={{ fontWeight:600, color:'#475569', margin:'0 0 6px' }}>Setup:</p>
          <p style={{ margin:'2px 0' }}>1. In Vercel → Settings → Environment Variables</p>
          <p style={{ margin:'2px 0' }}>2. Add: <code style={{ background:'#e2e8f0', padding:'1px 5px', borderRadius:'4px' }}>ADMIN_SECRET</code> = your chosen password</p>
          <p style={{ margin:'2px 0' }}>3. Redeploy, then enter that password here</p>
        </div>
        <div style={{ textAlign:'center', marginTop:'16px' }}>
          <a href="/app" style={{ fontSize:'12px', color:'#94a3b8', textDecoration:'none' }}>← Back to app</a>
        </div>
      </div>
    </div>
  );
};

// ── Stat card ─────────────────────────────────────────────────────────────────
const StatCard: React.FC<{ label: string; value: string | number; sub?: string; color?: string; icon?: string }> =
  ({ label, value, sub, color = '#0f172a', icon }) => (
  <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
    {icon && <p className="text-2xl mb-2">{icon}</p>}
    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">{label}</p>
    <p className="text-2xl font-extrabold" style={{ color }}>{typeof value === 'number' ? value.toLocaleString('en-NG') : value}</p>
    {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
  </div>
);

// ── Main AdminDashboard ───────────────────────────────────────────────────────
export const AdminDashboard: React.FC = () => {
  const [secret, setSecret]             = useState<string | null>(null);
  const [tab, setTab]                   = useState<'overview' | 'users' | 'promos' | 'manual'>('overview');
  const [data, setData]                 = useState<any>(null);
  const [loading, setLoading]           = useState(false);
  const [userSearch, setUserSearch]     = useState('');
  const [actionMsg, setActionMsg]       = useState('');
  const [promoCode, setPromoCode]       = useState('');
  const [promoMaxUses, setPromoMaxUses] = useState('50');
  const [promoExpiry, setPromoExpiry]   = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [manualUserId, setManualUserId] = useState('');
  const [manualPlan, setManualPlan]     = useState('pro');
  const [manualMonths, setManualMonths] = useState('1');
  const [manualLoading, setManualLoading] = useState(false);

  // Restore session
  useEffect(() => {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) setSecret(stored);
  }, []);

  const apiFetch = useCallback(async (action: string, method = 'GET', body?: any) => {
    const res = await fetch(`/api/admin-data?action=${action}`, {
      method,
      headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret || '' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (res.status === 403) { sessionStorage.removeItem(SESSION_KEY); setSecret(null); throw new Error('Session expired'); }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }, [secret]);

  const load = useCallback(async () => {
    if (!secret) return;
    setLoading(true);
    try { setData(await apiFetch('stats')); }
    catch (e: any) { console.error('Admin load error:', e.message); }
    finally { setLoading(false); }
  }, [secret, apiFetch]);

  useEffect(() => { if (secret) load(); }, [secret, load]);

  const showMsg = (msg: string) => { setActionMsg(msg); setTimeout(() => setActionMsg(''), 4000); };

  const createPromo = async () => {
    if (!promoCode.trim()) return;
    setPromoLoading(true);
    try {
      await apiFetch('create-promo', 'POST', { code: promoCode, maxUses: parseInt(promoMaxUses)||50, expiresAt: promoExpiry||null });
      showMsg(`✅ Code ${promoCode.toUpperCase()} created`);
      setPromoCode(''); setPromoExpiry(''); load();
    } catch (e: any) { showMsg(`❌ ${e.message}`); }
    finally { setPromoLoading(false); }
  };

  const togglePromo = async (id: string, cur: boolean) => {
    try { await apiFetch('toggle-promo', 'POST', { promoId: id, isActive: !cur }); showMsg(`✅ Done`); load(); }
    catch (e: any) { showMsg(`❌ ${e.message}`); }
  };

  const setUserPlan = async () => {
    if (!manualUserId.trim()) return;
    setManualLoading(true);
    try {
      await apiFetch('set-plan', 'POST', { userId: manualUserId.trim(), plan: manualPlan, months: parseInt(manualMonths)||1 });
      showMsg(`✅ Plan updated to ${manualPlan}`); setManualUserId(''); load();
    } catch (e: any) { showMsg(`❌ ${e.message}`); }
    finally { setManualLoading(false); }
  };

  if (!secret) return <PasswordGate onUnlock={s => setSecret(s)} />;

  const s = data?.stats || {};
  const filteredUsers = (data?.users || []).filter((u: any) =>
    !userSearch || u.email?.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-slate-900 text-white px-6 py-4 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-cac-green rounded-lg flex items-center justify-center font-black text-sm">A</div>
            <div>
              <p className="font-bold text-sm">TaxPulse NG — Admin Panel</p>
              <p className="text-xs text-slate-400">Internal · Confidential</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {loading && <span className="text-xs text-slate-400 animate-pulse">Loading...</span>}
            <button onClick={load} className="text-xs text-slate-400 hover:text-white">↻ Refresh</button>
            <button onClick={() => { sessionStorage.removeItem(SESSION_KEY); setSecret(null); setData(null); }}
              className="text-xs text-red-400 hover:text-red-300">Lock</button>
            <a href="/app" className="text-xs text-slate-500 hover:text-white">← App</a>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {actionMsg && (
          <div className={`rounded-xl px-4 py-3 text-sm font-semibold ${actionMsg.startsWith('✅') ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
            {actionMsg}
          </div>
        )}

        <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 w-fit shadow-sm">
          {([
            ['overview', '📊 Overview'], ['users', '👥 Users'],
            ['promos', '🎫 Promos'], ['manual', '🔧 Manual'],
          ] as const).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id as any)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${tab === id ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
              {label}
            </button>
          ))}
        </div>

        {loading && !data && (
          <div className="grid grid-cols-4 gap-4">
            {Array(8).fill(0).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 border border-slate-100 h-24 animate-pulse" />
            ))}
          </div>
        )}

        {tab === 'overview' && data && (
          <div className="space-y-6">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Revenue</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon="💰" label="Monthly MRR" value={fmt(s.MRR||0)} color="#00843D" sub={`${s.proMonthly||0} paying`} />
                <StatCard icon="📈" label="Annual ARR" value={fmt(s.ARR||0)} color="#00843D" sub="MRR × 12" />
                <StatCard icon="⭐" label="Pro Users" value={s.proUsers||0} color="#2563eb" sub={`${s.conversionRate||0}% conversion`} />
                <StatCard icon="🆓" label="Free Users" value={s.freeUsers||0} sub="Upgrade opportunity" />
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Users & Companies</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon="👤" label="Total Users" value={s.totalUsers||0} />
                <StatCard icon="✨" label="New (30 days)" value={s.newUsersLast30||0} color="#7c3aed" />
                <StatCard icon="🎫" label="Via Promo" value={s.proPromo||0} color="#d97706" />
                <StatCard icon="🏢" label="Companies" value={s.totalCompanies||0} />
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Compliance Activity</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon="📋" label="Total Obligations" value={fmtNum(s.totalObligations||0)} />
                <StatCard icon="✅" label="Filed" value={fmtNum(s.totalFiled||0)} color="#00843D"
                  sub={`${s.totalObligations>0?((s.totalFiled/s.totalObligations)*100).toFixed(0):0}% rate`} />
                <StatCard icon="⚠️" label="Overdue" value={fmtNum(s.overdue||0)} color="#dc2626" />
                <StatCard icon="📅" label="Filed Today" value={s.filedToday||0} color="#2563eb" />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                <p className="font-bold text-slate-800 text-sm mb-4">Top States</p>
                <div className="space-y-3">
                  {(s.topStates||[]).map(([state, count]: [string,number]) => (
                    <div key={state}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-semibold text-slate-700">{state}</span>
                        <span className="text-slate-400 text-xs">{count}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-cac-green rounded-full" style={{ width: `${Math.min(100,(count/Math.max(1,s.totalCompanies))*300)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                <p className="font-bold text-slate-800 text-sm mb-4">Entity Types</p>
                <div className="space-y-2">
                  {Object.entries(s.entityCounts||{}).sort((a:any,b:any)=>b[1]-a[1]).map(([type,count]:any) => (
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
              <span className="text-sm text-slate-400">{filteredUsers.length} users</span>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>{['Email','Plan','Status','Expires','Cos','Promo','Joined'].map(h=>(
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase whitespace-nowrap">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredUsers.map((u:any)=>{
                    const expired = u.expires && new Date(u.expires)<new Date();
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-medium text-slate-800 max-w-[200px]">
                          <button onClick={()=>{setManualUserId(u.id);setTab('manual');}}
                            className="hover:text-cac-green hover:underline text-left truncate block max-w-full" title={`ID: ${u.id}`}>
                            {u.email||'—'}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${u.plan==='pro'?'bg-cac-green/10 text-cac-green':'bg-slate-100 text-slate-500'}`}>
                            {(u.plan||'free').toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${u.status==='active'?'bg-green-100 text-green-700':'bg-slate-100 text-slate-400'}`}>
                            {u.status||'inactive'}
                          </span>
                        </td>
                        <td className={`px-4 py-3 text-xs whitespace-nowrap ${expired?'text-red-500 font-bold':'text-slate-400'}`}>{u.expires?fmtDate(u.expires):'—'}</td>
                        <td className="px-4 py-3 text-center font-bold text-slate-600">{u.companies}</td>
                        <td className="px-4 py-3 text-xs text-slate-400">{u.promoUsed||'—'}</td>
                        <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{fmtDate(u.joined)}</td>
                      </tr>
                    );
                  })}
                  {filteredUsers.length===0&&<tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No users found</td></tr>}
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
                  <input value={promoCode} onChange={e=>setPromoCode(e.target.value.toUpperCase())} placeholder="LAUNCH50"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-cac-green/30"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Max Uses</label>
                  <input type="number" value={promoMaxUses} onChange={e=>setPromoMaxUses(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-cac-green/30"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Expiry</label>
                  <input type="date" value={promoExpiry} onChange={e=>setPromoExpiry(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-cac-green/30"/>
                </div>
                <div className="flex items-end">
                  <button onClick={createPromo} disabled={promoLoading||!promoCode.trim()}
                    className="w-full py-2.5 bg-cac-green text-white rounded-xl text-sm font-bold hover:bg-cac-dark disabled:opacity-50">
                    {promoLoading?'Creating...':'Create'}
                  </button>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
              <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-slate-800">All Promo Codes</h3>
                <span className="text-xs text-slate-400">{(data?.promoCodes||[]).length} total</span>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>{['Code','Plan','Uses/Max','Expires','Status',''].map(h=>(
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {(data?.promoCodes||[]).map((p:any)=>(
                    <tr key={p.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-mono font-bold text-slate-800">{p.code}</td>
                      <td className="px-4 py-3 text-cac-green font-semibold uppercase text-xs">{p.plan}</td>
                      <td className="px-4 py-3 text-slate-600">{p.uses_count}/{p.max_uses}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{p.expires_at?fmtDate(p.expires_at):'No expiry'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${p.is_active?'bg-green-100 text-green-700':'bg-red-100 text-red-500'}`}>
                          {p.is_active?'Active':'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={()=>togglePromo(p.id,p.is_active)}
                          className={`text-xs font-bold hover:underline ${p.is_active?'text-red-500':'text-cac-green'}`}>
                          {p.is_active?'Deactivate':'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {(data?.promoCodes||[]).length===0&&<tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No promo codes yet</td></tr>}
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
                <p className="text-xs text-slate-400 mt-1">Use when Paystack webhook missed an upgrade, or to grant Pro access.</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700">
                💡 In Users tab, click a user's email to auto-fill their ID here.
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">User ID (UUID)</label>
                  <input value={manualUserId} onChange={e=>setManualUserId(e.target.value)} placeholder="Paste user UUID here"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-cac-green/30"/>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Plan</label>
                    <select value={manualPlan} onChange={e=>setManualPlan(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-cac-green/30">
                      <option value="pro">Pro</option>
                      <option value="free">Free (downgrade)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Months</label>
                    <input type="number" min="1" max="24" value={manualMonths} onChange={e=>setManualMonths(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-cac-green/30"/>
                  </div>
                </div>
                <button onClick={setUserPlan} disabled={manualLoading||!manualUserId.trim()}
                  className="w-full py-3 bg-cac-green text-white rounded-xl text-sm font-bold hover:bg-cac-dark disabled:opacity-50 transition-all">
                  {manualLoading?'Updating...':`Set to ${manualPlan.toUpperCase()} for ${manualMonths} month(s)`}
                </button>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
              <h3 className="font-bold text-slate-800 text-sm mb-4">Quick Links</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  ['Supabase','https://app.supabase.com','🗄️'],
                  ['Paystack','https://dashboard.paystack.com','💳'],
                  ['Vercel','https://vercel.com/dashboard','▲'],
                  ['Resend','https://resend.com/dashboard','📧'],
                  ['Termii','https://app.termii.com','📱'],
                  ['Groq','https://console.groq.com','🤖'],
                ].map(([label,url,icon])=>(
                  <a key={label} href={url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                    <span>{icon}</span>
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
