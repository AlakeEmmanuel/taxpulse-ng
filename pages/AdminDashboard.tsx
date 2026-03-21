import React, { useState, useEffect, useCallback } from 'react';

const SESSION_KEY = 'taxpulse_admin_auth';
const fmt     = (n: number) => 'NGN ' + (n || 0).toLocaleString('en-NG');
const fmtNum  = (n: number) => (n || 0).toLocaleString('en-NG');
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' }) : '--';

const Icon = {
  home:    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  users:   <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  tag:     <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
  tool:    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>,
  refresh: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>,
  lock:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  arrow:   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
  search:  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  check:   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  x:       <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  trend:   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
  link:    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>,
};

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
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ background: '#111', border: '1px solid #222', borderRadius: '16px', padding: '36px', width: '100%', maxWidth: '380px' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <img src="/logo-white.png" alt="TaxPulse NG" style={{ height: '32px', width: 'auto', objectFit: 'contain', marginBottom: '14px' }} />
          <p style={{ color: '#555', fontSize: '13px', margin: 0 }}>Admin access only</p>
        </div>
        <input type="password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === 'Enter' && attempt()}
          placeholder="Enter admin password" autoFocus
          style={{ width: '100%', padding: '12px 16px', background: '#1a1a1a', border: '1px solid #333', borderRadius: '10px', fontSize: '14px', color: 'white', outline: 'none', boxSizing: 'border-box', marginBottom: '12px', fontFamily: 'monospace' }} />
        {err && <div style={{ background: '#2a0a0a', border: '1px solid #5a1a1a', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: '#ff6b6b', marginBottom: '12px' }}>{err}</div>}
        <button onClick={attempt} disabled={busy || !pw.trim()}
          style={{ width: '100%', padding: '12px', background: busy || !pw.trim() ? '#1a1a1a' : '#00843D', color: busy || !pw.trim() ? '#444' : 'white', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '14px', cursor: busy || !pw.trim() ? 'not-allowed' : 'pointer' }}>
          {busy ? 'Verifying...' : 'Unlock Dashboard'}
        </button>
        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <a href="/app" style={{ fontSize: '12px', color: '#444', textDecoration: 'none' }}>Back to app</a>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: string | number; sub?: string; color?: string; icon?: React.ReactNode }> =
  ({ label, value, sub, color = 'white', icon }) => (
  <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '18px 20px' }}>
    {icon && <div style={{ color: '#00843D', marginBottom: '10px' }}>{icon}</div>}
    <p style={{ fontSize: '11px', color: '#555', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', margin: '0 0 6px' }}>{label}</p>
    <p style={{ fontSize: '22px', fontWeight: 700, color, margin: 0 }}>{typeof value === 'number' ? value.toLocaleString('en-NG') : value}</p>
    {sub && <p style={{ fontSize: '11px', color: '#444', margin: '4px 0 0' }}>{sub}</p>}
  </div>
);

const TabBtn: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> =
  ({ active, onClick, icon, label }) => (
  <button onClick={onClick}
    style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '9px 16px', borderRadius: '9px', border: 'none', background: active ? '#00843D' : 'transparent', color: active ? 'white' : '#555', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
    {icon} {label}
  </button>
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

  const inp: React.CSSProperties = { width: '100%', padding: '10px 14px', background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', fontSize: '13px', color: 'white', outline: 'none', boxSizing: 'border-box' };
  const card: React.CSSProperties = { background: '#111', border: '1px solid #222', borderRadius: '12px', overflow: 'hidden' };
  const g4: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px' };
  const sec: React.CSSProperties = { fontSize: '11px', color: '#444', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', margin: '0 0 12px' };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: 'white' }}>
      <div style={{ background: '#0d0d0d', borderBottom: '1px solid #1a1a1a', padding: '0 24px', position: 'sticky', top: 0, zIndex: 40 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '60px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/logo-white.png" alt="TaxPulse NG" style={{ height: '26px', width: 'auto', objectFit: 'contain' }} />
            <span style={{ fontSize: '11px', color: '#444', borderLeft: '1px solid #222', paddingLeft: '12px', fontWeight: 600 }}>ADMIN</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {loading && <span style={{ fontSize: '12px', color: '#444' }}>Loading...</span>}
            <button onClick={load} style={{ background: 'none', border: '1px solid #222', color: '#555', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
              {Icon.refresh} Refresh
            </button>
            <button onClick={() => { sessionStorage.removeItem(SESSION_KEY); setSecret(null); setData(null); }}
              style={{ background: 'none', border: '1px solid #3a1a1a', color: '#ff6b6b', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
              {Icon.lock} Lock
            </button>
            <a href="/app" style={{ color: '#444', fontSize: '12px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
              {Icon.arrow} App
            </a>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
        {msg && <div style={{ background: '#0a2a0a', border: '1px solid #00843D', borderRadius: '10px', padding: '12px 16px', fontSize: '13px', color: '#00843D', marginBottom: '16px', fontWeight: 600 }}>{msg}</div>}

        <div style={{ display: 'flex', gap: '4px', background: '#111', border: '1px solid #1a1a1a', borderRadius: '11px', padding: '4px', width: 'fit-content', marginBottom: '24px' }}>
          <TabBtn active={tab === 'overview'} onClick={() => setTab('overview')} icon={Icon.home}  label="Overview" />
          <TabBtn active={tab === 'users'}    onClick={() => setTab('users')}    icon={Icon.users} label="Users" />
          <TabBtn active={tab === 'promos'}   onClick={() => setTab('promos')}   icon={Icon.tag}   label="Promos" />
          <TabBtn active={tab === 'manual'}   onClick={() => setTab('manual')}   icon={Icon.tool}  label="Manual Override" />
        </div>

        {loading && !data && (
          <div style={g4}>
            {Array(8).fill(0).map((_, i) => <div key={i} style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', height: '90px' }} />)}
          </div>
        )}

        {tab === 'overview' && data && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <p style={sec}>Revenue</p>
              <div style={g4}>
                <StatCard icon={Icon.trend} label="Monthly MRR" value={fmt(s.MRR || 0)} color="#00843D" sub={(s.proMonthly || 0) + ' paying users'} />
                <StatCard icon={Icon.trend} label="Annual ARR"  value={fmt(s.ARR || 0)} color="#00843D" sub="MRR x 12" />
                <StatCard icon={Icon.users} label="Pro Users"   value={s.proUsers || 0} color="#60a5fa" sub={(s.conversionRate || 0) + '% conversion'} />
                <StatCard icon={Icon.users} label="Free Users"  value={s.freeUsers || 0} sub="Upgrade opportunity" />
              </div>
            </div>
            <div>
              <p style={sec}>Users</p>
              <div style={g4}>
                <StatCard icon={Icon.users} label="Total Users"   value={s.totalUsers || 0} />
                <StatCard icon={Icon.trend} label="New (30 days)" value={s.newUsersLast30 || 0} color="#a78bfa" />
                <StatCard icon={Icon.tag}   label="Via Promo"     value={s.proPromo || 0} color="#fbbf24" />
                <StatCard icon={Icon.check} label="Companies"     value={s.totalCompanies || 0} />
              </div>
            </div>
            <div>
              <p style={sec}>Compliance Activity</p>
              <div style={g4}>
                <StatCard icon={Icon.check} label="Total Obligations" value={fmtNum(s.totalObligations || 0)} />
                <StatCard icon={Icon.check} label="Filed"  value={fmtNum(s.totalFiled || 0)} color="#00843D"
                  sub={s.totalObligations > 0 ? ((s.totalFiled / s.totalObligations) * 100).toFixed(0) + '% rate' : '0%'} />
                <StatCard icon={Icon.x}     label="Overdue"     value={fmtNum(s.overdue || 0)} color="#ff6b6b" />
                <StatCard icon={Icon.check} label="Filed Today" value={s.filedToday || 0} color="#60a5fa" />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={card}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #1a1a1a' }}>
                  <p style={{ fontWeight: 700, fontSize: '13px', margin: 0 }}>Top States</p>
                </div>
                <div style={{ padding: '16px 20px' }}>
                  {(s.topStates || []).map(([state, count]: [string, number]) => (
                    <div key={state} style={{ marginBottom: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontSize: '13px', color: '#ccc' }}>{state}</span>
                        <span style={{ fontSize: '12px', color: '#555' }}>{count}</span>
                      </div>
                      <div style={{ height: '3px', background: '#1a1a1a', borderRadius: '2px' }}>
                        <div style={{ height: '100%', background: '#00843D', borderRadius: '2px', width: Math.min(100, (count / Math.max(1, s.totalCompanies)) * 300) + '%' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={card}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #1a1a1a' }}>
                  <p style={{ fontWeight: 700, fontSize: '13px', margin: 0 }}>Entity Types</p>
                </div>
                <div style={{ padding: '16px 20px' }}>
                  {Object.entries(s.entityCounts || {}).sort((a: any, b: any) => b[1] - a[1]).map(([type, count]: any) => (
                    <div key={type} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #111' }}>
                      <span style={{ fontSize: '13px', color: '#ccc' }}>{type.split(' (')[0]}</span>
                      <span style={{ fontSize: '13px', fontWeight: 700 }}>{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'users' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ position: 'relative', flex: 1, maxWidth: '360px' }}>
                <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#555' }}>{Icon.search}</div>
                <input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Search by email..."
                  style={{ ...inp, paddingLeft: '36px' }} />
              </div>
              <span style={{ fontSize: '13px', color: '#555' }}>{users.length} users</span>
            </div>
            <div style={card}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #1a1a1a' }}>
                    {['Email', 'Plan', 'Status', 'Expires', 'Cos', 'Promo', 'Joined'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: '#555', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u: any) => {
                    const expired = u.expires && new Date(u.expires) < new Date();
                    return (
                      <tr key={u.id} style={{ borderBottom: '1px solid #111' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <button onClick={() => { setManualId(u.id); setTab('manual'); }}
                            style={{ background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', fontSize: '13px', padding: 0 }}>
                            {u.email || '--'}
                          </button>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, background: u.plan === 'pro' ? '#0a2a0a' : '#1a1a1a', color: u.plan === 'pro' ? '#00843D' : '#555' }}>
                            {(u.plan || 'free').toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, background: u.status === 'active' ? '#0a2a0a' : '#1a1a1a', color: u.status === 'active' ? '#00843D' : '#555' }}>
                            {u.status || 'inactive'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', color: expired ? '#ff6b6b' : '#555', fontSize: '12px', fontWeight: expired ? 700 : 400 }}>
                          {u.expires ? fmtDate(u.expires) : '--'}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700 }}>{u.companies}</td>
                        <td style={{ padding: '12px 16px', color: '#555', fontSize: '12px' }}>{u.promoUsed || '--'}</td>
                        <td style={{ padding: '12px 16px', color: '#555', fontSize: '12px' }}>{fmtDate(u.joined)}</td>
                      </tr>
                    );
                  })}
                  {users.length === 0 && <tr><td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#444' }}>No users found</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'promos' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ ...card, padding: '20px' }}>
              <p style={{ fontWeight: 700, fontSize: '14px', margin: '0 0 16px' }}>Create New Promo Code</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '12px', alignItems: 'end' }}>
                <div>
                  <p style={{ fontSize: '11px', color: '#555', fontWeight: 600, margin: '0 0 6px', textTransform: 'uppercase' }}>Code</p>
                  <input value={promoCode} onChange={e => setPromoCode(e.target.value.toUpperCase())} placeholder="LAUNCH50" style={{ ...inp, fontFamily: 'monospace' }} />
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: '#555', fontWeight: 600, margin: '0 0 6px', textTransform: 'uppercase' }}>Max Uses</p>
                  <input type="number" value={promoMax} onChange={e => setPromoMax(e.target.value)} style={inp} />
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: '#555', fontWeight: 600, margin: '0 0 6px', textTransform: 'uppercase' }}>Expiry</p>
                  <input type="date" value={promoExpiry} onChange={e => setPromoExpiry(e.target.value)} style={inp} />
                </div>
                <button onClick={createPromo} disabled={promoBusy || !promoCode.trim()}
                  style={{ padding: '10px 20px', background: promoBusy || !promoCode.trim() ? '#1a1a1a' : '#00843D', color: promoBusy || !promoCode.trim() ? '#444' : 'white', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
                  {promoBusy ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>
            <div style={card}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #1a1a1a', display: 'flex', justifyContent: 'space-between' }}>
                <p style={{ fontWeight: 700, fontSize: '13px', margin: 0 }}>All Promo Codes</p>
                <span style={{ fontSize: '12px', color: '#555' }}>{(data?.promoCodes || []).length} total</span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #1a1a1a' }}>
                    {['Code', 'Plan', 'Uses/Max', 'Expires', 'Status', ''].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: '#555', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(data?.promoCodes || []).map((p: any) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #111' }}>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 700 }}>{p.code}</td>
                      <td style={{ padding: '12px 16px', color: '#00843D', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase' }}>{p.plan}</td>
                      <td style={{ padding: '12px 16px', color: '#ccc' }}>{p.uses_count}/{p.max_uses}</td>
                      <td style={{ padding: '12px 16px', color: '#555', fontSize: '12px' }}>{p.expires_at ? fmtDate(p.expires_at) : 'No expiry'}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, background: p.is_active ? '#0a2a0a' : '#2a0a0a', color: p.is_active ? '#00843D' : '#ff6b6b' }}>
                          {p.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <button onClick={() => togglePromo(p.id, p.is_active)}
                          style={{ background: 'none', border: 'none', color: p.is_active ? '#ff6b6b' : '#00843D', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}>
                          {p.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {(data?.promoCodes || []).length === 0 && <tr><td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#444' }}>No promo codes yet</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'manual' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', maxWidth: '800px' }}>
            <div style={{ ...card, padding: '20px' }}>
              <p style={{ fontWeight: 700, fontSize: '14px', margin: '0 0 6px' }}>Manual Plan Override</p>
              <p style={{ fontSize: '12px', color: '#555', margin: '0 0 16px' }}>Use when Paystack webhook missed an upgrade.</p>
              <div style={{ background: '#0a1a2a', border: '1px solid #1a3a5a', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: '#60a5fa', marginBottom: '16px' }}>
                In Users tab, click a user email to auto-fill their ID here.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <p style={{ fontSize: '11px', color: '#555', fontWeight: 600, margin: '0 0 6px', textTransform: 'uppercase' }}>User ID (UUID)</p>
                  <input value={manualId} onChange={e => setManualId(e.target.value)} placeholder="Paste user UUID" style={{ ...inp, fontFamily: 'monospace' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <p style={{ fontSize: '11px', color: '#555', fontWeight: 600, margin: '0 0 6px', textTransform: 'uppercase' }}>Plan</p>
                    <select value={manualPlan} onChange={e => setManualPlan(e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
                      <option value="pro">Pro</option>
                      <option value="free">Free (downgrade)</option>
                    </select>
                  </div>
                  <div>
                    <p style={{ fontSize: '11px', color: '#555', fontWeight: 600, margin: '0 0 6px', textTransform: 'uppercase' }}>Months</p>
                    <input type="number" min="1" max="24" value={manualMonths} onChange={e => setManualMonths(e.target.value)} style={inp} />
                  </div>
                </div>
                <button onClick={setPlan} disabled={manualBusy || !manualId.trim()}
                  style={{ padding: '11px', background: manualBusy || !manualId.trim() ? '#1a1a1a' : '#00843D', color: manualBusy || !manualId.trim() ? '#444' : 'white', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
                  {manualBusy ? 'Updating...' : 'Set to ' + manualPlan.toUpperCase() + ' for ' + manualMonths + ' month(s)'}
                </button>
              </div>
            </div>
            <div style={{ ...card, padding: '20px' }}>
              <p style={{ fontWeight: 700, fontSize: '14px', margin: '0 0 16px' }}>Quick Links</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  ['Supabase',    'https://app.supabase.com'],
                  ['Paystack',    'https://dashboard.paystack.com'],
                  ['Vercel',      'https://vercel.com/dashboard'],
                  ['Resend',      'https://resend.com/dashboard'],
                  ['Termii',      'https://app.termii.com'],
                  ['Groq Console','https://console.groq.com'],
                ].map(([label, url]) => (
                  <a key={label} href={url} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#1a1a1a', borderRadius: '8px', textDecoration: 'none', color: '#ccc', fontSize: '13px', border: '1px solid #222' }}>
                    {label} <span style={{ color: '#555' }}>{Icon.link}</span>
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
