import React, { useState } from 'react';
import { Company, EntityType } from '../types';
import { Card, Input, Button } from '../components/Shared';
import { db } from '../services/mockDb';

interface SettingsProps { company: Company; onCompanyUpdate: (c: Company) => void; }

export const SettingsPage: React.FC<SettingsProps> = ({ company, onCompanyUpdate }) => {
  const [form, setForm] = useState<Company>({ ...company });
  const [saved, setSaved] = useState(false);

  const update = (field: keyof Company, value: any) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleSave = () => {
    db.updateCompany(form);
    onCompanyUpdate(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
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
        {field('Company Name', 'name')}
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
    </div>
  );
};
