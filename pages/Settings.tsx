import React, { useState, useEffect } from 'react';
import { Company, EntityType } from '../types';
import { generateObligations } from '../utils/taxEngine';
import { Card, Input, Button } from '../components/Shared';
import { AccountantShareManager } from './AccountantShare';
import * as db from '../services/db';
import { subscribeToPush, unsubscribeFromPush, isPushSubscribed } from '../services/notifications';

interface SettingsProps { company: Company; onCompanyUpdate: (c: Company) => void; }


const NotificationToggle: React.FC = () => {
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Get userId from window -- set by App.tsx on login, avoids auth lock
  const userId = (window as any).__taxpulse_uid as string | undefined;

  useEffect(() => {
    isPushSubscribed().then(val => {
      setSubscribed(val);
      setLoading(false);
    });
  }, []);

  const toggle = async () => {
    if (!userId || loading) return;
    setError('');

    // Optimistic UI -- update immediately so toggle feels instant
    const newState = !subscribed;
    setSubscribed(newState);

    if (!newState) {
      // Turning OFF
      await unsubscribeFromPush(userId);
    } else {
      // Turning ON
      setLoading(true);
      const ok = await subscribeToPush(userId);
      setLoading(false);
      if (!ok) {
        // Revert if failed
        setSubscribed(false);
        setError('Could not enable notifications. Open browser Settings → Notifications and allow this site.');
      }
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{subscribed ? '🔔" : '🔕'}</span>
          <div>
            <p className="text-sm font-bold text-slate-900">{subscribed ? 'Notifications enabled" : 'Notifications disabled'}</p>
            <p className="text-xs text-slate-500">{subscribed ? 'You'll get alerts 7 days and 1 day before deadlines" : "Enable to get tax deadline alerts"}</p>
          </div>
        </div>
      <button
        onClick={toggle}
        disabled={loading}
        className={"relative inline-flex h-6 w-11 items-center rounded-full transition-colors ' + (subscribed ? 'bg-cac-green" : "bg-slate-200") + ' disabled:opacity-50'}
      >
        <span className={"inline-block h-4 w-4 transform rounded-full bg-white transition-transform ' + (subscribed ? 'translate-x-6" : "translate-x-1")} />
      </button>
      </div>
      {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      {!subscribed && !error && <p className="text-xs text-slate-400">Note: your browser will only ask for permission once. If you previously denied it, go to browser Settings → Notifications to re-enable.</p>}
    </div>
  );
};

const RegenerateButton: React.FC<{ company: Company }> = ({ company }) => {
  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(false);
  const [err, setErr]         = useState('');

  const handleRegenerate = async () => {
    if (!window.confirm(
      'This will add any missing tax obligations based on your current settings.\n\n' +
      'Existing obligations will NOT be deleted -- only new ones added.\n\nContinue?'
    )) return;

    setLoading(true); setErr(''); setDone(false);
    try {
      const obligations = generateObligations(company);
      let added = 0;
      for (const ob of obligations) {
        try {
          await db.addObligation({ ...ob, id: '' });
          added++;
        } catch (e: any) {
          // Ignore duplicate key errors -- obligation already exists
          if (!e?.message?.includes('duplicate') && !e?.message?.includes('unique')) {
            console.warn('Obligation insert skipped:', e?.message);
          }
        }
      }
      setDone(true);
      setTimeout(() => setDone(false), 4000);
    } catch (e: any) {
      setErr(e?.message || 'Failed to regenerate.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={handleRegenerate}
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {loading ? '⏳ Generating...' : '🔄 Regenerate Tax Schedule'}
      </button>
      {done && <p className="text-xs text-cac-green font-bold text-center">✅ Tax schedule updated!</p>}
      {err  && <p className="text-xs text-red-600 text-center">{err}</p>}
    </div>
  );
};

export const SettingsPage: React.FC<SettingsProps> = ({ company, onCompanyUpdate }) => {
  const [form, setForm] = useState<Company>({ ...company });
  const [saved, setSaved] = useState(false);

  const update = (field: keyof Company, value: any) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    try {
      await db.updateCompany(form);
      onCompanyUpdate(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      alert('Error saving: ' + e.message);
    }
  };

  const field = (label: string, key: keyof Company, type = 'text', placeholder = '') => (
    <Input
      label={label}
      type={type}
      placeholder={placeholder}
      value={(form[key] as string) || ''}
      onChange={e => update(key, e.target.value)}
    />
  );

  return (
    <div className="space-y-6 max-w-2xl">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 text-sm">Manage your company profile and tax configuration</p>
      </header>

      {saved && (
        <div className="bg-cac-light border border-cac-green/30 rounded-xl p-3 flex items-center gap-2 text-cac-green text-sm font-bold">
          ✅ Settings saved successfully
        </div>
      )}

      <Card className="space-y-4">
        <h2 className="font-bold text-slate-800">Company Profile</h2>
        <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">⚡ Changes here affect your tax calculations, obligations and PDF exports</p>
        {field('Company Name', 'name')}
        <p className="text-xs text-slate-400 -mt-2">Used in all PDF exports and reports</p>
        {field('RC / BN Number', 'rcNumber')}
        {field('Tax Identification Number (TIN)', 'tin')}
        {field('VAT Registration Number', 'vatNumber')}
        {field('State of Registration', 'state')}
        {field('Registered Address', 'address')}

        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Entity Type</label>
          <select
            value={form.entityType}
            onChange={e => update('entityType', e.target.value as EntityType)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cac-green bg-white"
          >
            {Object.values(EntityType).map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {field('Industry', 'industry')}
        {field('Financial Year End', 'yearEnd', 'text', 'e.g., December 31')}
      </Card>

      <Card className="space-y-4">
        <h2 className="font-bold text-slate-800">Tax Configuration (NTA 2025)</h2>

        {form.entityType !== 'Individual (Personal Income Tax)' && (<>
        <label className="flex items-center justify-between p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition">
          <div>
            <p className="font-semibold text-sm text-slate-800">Has Employees (PAYE Applicable)</p>
            <p className="text-xs text-slate-400">PAYE due 10th of each month → State IRS</p>
          </div>
          <input type="checkbox" className="accent-cac-green w-4 h-4" checked={form.hasEmployees} onChange={e => update("hasEmployees", e.target.checked)} />
        </label>

        {form.hasEmployees && (
          <Input label="Number of Employees" type="number" value={String(form.employeeCount || "')} onChange={e => update('employeeCount', parseInt(e.target.value) || 0)} placeholder="0" />
        )}

        <label className="flex items-center justify-between p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition">
          <div>
            <p className="font-semibold text-sm text-slate-800">Pays Vendors (WHT Applicable)</p>
            <p className="text-xs text-slate-400">5% goods/construction · 10% services · Due 21st monthly → NRS</p>
          </div>
          <input type="checkbox" className="accent-cac-green w-4 h-4" checked={form.paysVendors} onChange={e => update("paysVendors", e.target.checked)} />
        </label>
        </>)}

        {form.entityType !== 'Individual (Personal Income Tax)' && (
          <label className="flex items-center justify-between p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition">
            <div>
              <p className="font-semibold text-sm text-slate-800">Collects VAT (≥₦100M Turnover)</p>
              <p className="text-xs text-slate-400">NTA 2025: VAT registration threshold raised to ₦100M (was ₦25M)</p>
            </div>
            <input type="checkbox" className="accent-cac-green w-4 h-4" checked={form.collectsVat} onChange={e => update("collectsVat", e.target.checked)} />
          </label>
        )}

        {/* Individual-specific fields */}
        {form.entityType === 'Individual (Personal Income Tax)' && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-4">
            <p className="text-xs font-bold text-blue-800">📋 Personal Income Tax Settings</p>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Employment Type</label>
              <select
                value={form.employmentType || 'employed'}
                onChange={e => update('employmentType', e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cac-green bg-white"
              >
                <option value="employed">Employed (Salary earner)</option>
                <option value="self-employed">Self-Employed / Freelancer</option>
                <option value="both">Both (Salary + Business income)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Estimated Annual Gross Income (₦)</label>
              <input
                type="number"
                value={form.annualIncome || ''}
                onChange={e => update('annualIncome', parseFloat(e.target.value) || undefined)}
                placeholder="e.g. 4800000"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cac-green/30 focus:border-cac-green text-sm"
              />
              <p className="text-xs text-slate-400 mt-1">Used to estimate your PIT liability in reports.</p>
            </div>
          </div>
        )}
      </Card>

      {/* Payroll statutory contributions */}
      {form.entityType !== 'Individual (Personal Income Tax)' && form.hasEmployees && (
        <Card className="space-y-4">
          <h2 className="font-bold text-slate-800">Payroll Statutory Contributions</h2>
          <p className="text-xs text-slate-500">These create monthly/annual obligations on your dashboard alongside VAT, PAYE, and WHT.</p>

          <label className="flex items-center justify-between p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition">
            <div>
              <p className="font-semibold text-sm text-slate-800">NSITF (3+ employees)</p>
              <p className="text-xs text-slate-400">1% of gross payroll · due 16th monthly → National Social Insurance Trust Fund</p>
            </div>
            <input type="checkbox" className="accent-cac-green w-4 h-4" checked={form.hasNSITF || false} onChange={e => update("hasNSITF", e.target.checked)} />
          </label>

          <label className="flex items-center justify-between p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition">
            <div>
              <p className="font-semibold text-sm text-slate-800">Pension (3+ employees)</p>
              <p className="text-xs text-slate-400">8% employee + 10% employer · due 7 days after payday → Pension Fund Admins</p>
            </div>
            <input type="checkbox" className="accent-cac-green w-4 h-4" checked={form.hasPension || false} onChange={e => update("hasPension", e.target.checked)} />
          </label>

          <label className="flex items-center justify-between p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition">
            <div>
              <p className="font-semibold text-sm text-slate-800">ITF (5+ staff or ₦50M+ turnover)</p>
              <p className="text-xs text-slate-400">1% of annual payroll · due 1 April → Industrial Training Fund</p>
            </div>
            <input type="checkbox" className="accent-cac-green w-4 h-4" checked={form.hasITF || false} onChange={e => update("hasITF", e.target.checked)} />
          </label>

          <label className="flex items-center justify-between p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition">
            <div>
              <p className="font-semibold text-sm text-slate-800">NHF contributions</p>
              <p className="text-xs text-slate-400">2.5% of employee basic salary · monthly → Federal Mortgage Bank of Nigeria</p>
            </div>
            <input type="checkbox" className="accent-cac-green w-4 h-4" checked={form.hasNHF || false} onChange={e => update("hasNHF", e.target.checked)} />
          </label>
        </Card>
      )}

      {/* CAC Annual Returns */}
      {form.entityType !== 'Individual (Personal Income Tax)' && form.cacStatus === 'Registered' && (
        <Card className="space-y-3">
          <h2 className="font-bold text-slate-800">CAC Annual Returns</h2>
          <label className="flex items-center justify-between p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition">
            <div>
              <p className="font-semibold text-sm text-slate-800">Track CAC annual returns</p>
              <p className="text-xs text-slate-400">All registered companies must file with CAC by 30 June each year. Penalty: ₦3,000/day.</p>
            </div>
            <input type="checkbox" className="accent-cac-green w-4 h-4" checked={form.cacAnnualReturns !== false} onChange={e => update("cacAnnualReturns", e.target.checked)} />
          </label>
        </Card>
      )}

      {/* WhatsApp Reminders */}
      <Card className="space-y-4">
        <h2 className="font-bold text-slate-800">WhatsApp Deadline Reminders</h2>
        <p className="text-xs text-slate-500">Get tax deadline reminders sent directly to your WhatsApp -- 7 days and 1 day before each obligation is due.</p>
        <Input
          label="WhatsApp / Phone Number"
          type="tel"
          value={form.phone || ''}
          onChange={e => update('phone', e.target.value)}
          placeholder="e.g. 08012345678 or +2348012345678"
        />
        {form.phone && (
          <label className="flex items-center justify-between p-3 bg-green-50 rounded-xl cursor-pointer hover:bg-green-100 transition border border-green-200">
            <div>
              <p className="font-semibold text-sm text-slate-800">Enable WhatsApp reminders</p>
              <p className="text-xs text-slate-400">Agree to receive deadline alerts from TaxPulse NG on WhatsApp</p>
            </div>
            <input type="checkbox" className="accent-cac-green w-4 h-4" checked={form.whatsappOptin || false} onChange={e => update("whatsappOptin", e.target.checked)} />
          </label>
        )}
      </Card>

      {/* NTA 2025 info box */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 space-y-1">
        <p className="font-bold">💡 NTA 2025 Reminder</p>
        <p>• Small company threshold (CIT-free): ≤₦50M turnover (raised from ₦25M)</p>
        <p>• VAT registration threshold: ≤₦100M turnover (raised from ₦25M)</p>
        <p>• Nigeria Revenue Service (NRS) -- formerly FIRS</p>
        <p>• Development Levy (4%) applies to all non-small companies</p>
      </div>

      {/* Accountant share */}
      <AccountantShareManager company={form} />

      <Button onClick={handleSave} className="w-full py-3">Save Settings</Button>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
        <div>
          <p className="font-bold text-blue-900 text-sm">Updated your tax configuration?</p>
          <p className="text-xs text-blue-700 mt-1">If you changed your VAT, PAYE, or WHT settings, regenerate your tax schedule to add the new obligations.</p>
        </div>
        <RegenerateButton company={form} />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-50">
          <h2 className="font-extrabold text-slate-900 text-sm">Deadline Reminders</h2>
          <p className="text-xs text-slate-500 mt-0.5">Get notified 7 days and 1 day before tax deadlines</p>
        </div>
        <div className="p-6">
          <NotificationToggle />
        </div>
      </div>
    </div>
  );
};
