import React, { useState, useEffect } from 'react';
import { Company, EntityType } from '../types';
import { Card, Input, Button } from '../components/Shared';
import * as db from '../services/db';

interface SettingsProps { company: Company; onCompanyUpdate: (c: Company) => void; }


const NotificationToggle: React.FC = () => {
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { supabase } = await import('../services/supabaseClient');
      const { data: { session } } = await supabase.auth.getSession();
      setUserId(session?.user?.id || null);
      setSubscribed(await isPushSubscribed());
      setLoading(false);
    };
    init();
  }, []);

  const toggle = async () => {
    if (!userId) return;
    setLoading(true);
    if (subscribed) {
      await unsubscribeFromPush(userId);
      setSubscribed(false);
    } else {
      const ok = await subscribeToPush(userId);
      setSubscribed(ok);
      if (!ok) alert('Please allow notifications in your browser settings.');
    }
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{subscribed ? '🔔' : '🔕'}</span>
        <div>
          <p className="text-sm font-bold text-slate-900">{subscribed ? 'Notifications enabled' : 'Notifications disabled'}</p>
          <p className="text-xs text-slate-500">{subscribed ? 'You will receive deadline alerts' : 'Enable to get deadline alerts'}</p>
        </div>
      </div>
      <button
        onClick={toggle}
        disabled={loading}
        className={"relative inline-flex h-6 w-11 items-center rounded-full transition-colors " + (subscribed ? "bg-cac-green" : "bg-slate-200") + " disabled:opacity-50"}
      >
        <span className={"inline-block h-4 w-4 transform rounded-full bg-white transition-transform " + (subscribed ? "translate-x-6" : "translate-x-1")} />
      </button>
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

        <label className="flex items-center justify-between p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition">
          <div>
            <p className="font-semibold text-sm text-slate-800">Has Employees (PAYE Applicable)</p>
            <p className="text-xs text-slate-400">PAYE due 10th of each month → State IRS</p>
          </div>
          <input type="checkbox" className="accent-cac-green w-4 h-4" checked={form.hasEmployees} onChange={e => update('hasEmployees', e.target.checked)} />
        </label>

        {form.hasEmployees && (
          <Input label="Number of Employees" type="number" value={String(form.employeeCount || '')} onChange={e => update('employeeCount', parseInt(e.target.value) || 0)} placeholder="0" />
        )}

        <label className="flex items-center justify-between p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition">
          <div>
            <p className="font-semibold text-sm text-slate-800">Pays Vendors (WHT Applicable)</p>
            <p className="text-xs text-slate-400">5% goods/construction · 10% services · Due 21st monthly → NRS</p>
          </div>
          <input type="checkbox" className="accent-cac-green w-4 h-4" checked={form.paysVendors} onChange={e => update('paysVendors', e.target.checked)} />
        </label>

        <label className="flex items-center justify-between p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition">
          <div>
            <p className="font-semibold text-sm text-slate-800">Collects VAT (≥₦100M Turnover)</p>
            <p className="text-xs text-slate-400">NTA 2025: VAT registration threshold raised to ₦100M (was ₦25M)</p>
          </div>
          <input type="checkbox" className="accent-cac-green w-4 h-4" checked={form.collectsVat} onChange={e => update('collectsVat', e.target.checked)} />
        </label>
      </Card>

      {/* NTA 2025 info box */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 space-y-1">
        <p className="font-bold">💡 NTA 2025 Reminder</p>
        <p>• Small company threshold (CIT-free): ≤₦50M turnover (raised from ₦25M)</p>
        <p>• VAT registration threshold: ≤₦100M turnover (raised from ₦25M)</p>
        <p>• FIRS is now called Nigeria Revenue Service (NRS)</p>
        <p>• Development Levy (4%) applies to all non-small companies</p>
      </div>

      <Button onClick={handleSave} className="w-full py-3">Save Settings</Button>

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
