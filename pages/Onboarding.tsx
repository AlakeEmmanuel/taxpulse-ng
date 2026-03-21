import React, { useState } from 'react';
import { Company, EntityType } from '../types';

interface OnboardingProps {
  onComplete: (company: Company) => void;
}

const STEPS = [
  { id: 1, title: "Your Profile", subtitle: 'Tell us about yourself or your business', icon: '🏢' },
  { id: 2, title: "Registration", subtitle: 'CAC & Tax registration details', icon: '📋' },
  { id: 3, title: "Tax Profile", subtitle: 'Configure your tax obligations', icon: '🧾' },
  { id: 4, title: "Ready!", subtitle: 'Review and launch', icon: '🚀' },
];

const INDUSTRIES = [
  'Agriculture', 'Construction', 'Education', 'Energy & Utilities',
  'Financial Services', 'Healthcare', 'Hospitality & Tourism', 'ICT & Technology',
  'Logistics & Transport', 'Manufacturing', 'Media & Entertainment',
  'Oil & Gas', 'Real Estate', 'Retail & FMCG', 'Telecoms', 'Other'
];

const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue',
  'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu',
  'FCT - Abuja', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina',
  'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo',
  'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
];

const YEAR_ENDS = [
  'January 31', 'February 28', 'March 31', 'April 30', 'May 31', 'June 30',
  'July 31', 'August 31', 'September 30', 'October 31', 'November 30', 'December 31'
];

type FormData = Omit<Company, 'id' | 'complianceScore'>;

const defaultForm: FormData = {
  name: '',
  entityType: EntityType.LTD,
  industry: '',
  state: '',
  address: '',
  cacStatus: 'Registered',
  rcNumber: '',
  tin: '',
  vatNumber: '',
  yearEnd: 'December 31',
  hasEmployees: false,
  employeeCount: undefined,
  paysVendors: false,
  collectsVat: false,
  hasNSITF: false,
  hasPension: false,
  hasITF: false,
  hasNHF: false,
  cacAnnualReturns: true,
  phone: '',
  whatsappOptin: false,
};

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(defaultForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const update = (field: keyof FormData, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validateStep = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    if (step === 1) {
      if (!form.name.trim()) newErrors.name = 'Business name is required';
      if (!form.industry) newErrors.industry = 'Please select an industry';
    }
    if (step === 2) {
      if (!form.state) newErrors.state = 'Please select a state';
      if (!form.address.trim()) newErrors.address = 'Address is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const next = () => {
    if (validateStep()) setStep(s => Math.min(s + 1, 4));
  };

  const back = () => setStep(s => Math.max(s - 1, 1));

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = () => {
    if (submitting) return;
    setSubmitting(true);
    const company: Company = {
      ...form,
      id: Date.now().toString(), // Temp ID -- DB will assign real UUID in App.tsx
      complianceScore: 50,
    };
    onComplete(company);
    // Note: obligation seeding happens in App.tsx handleCompanyAdded
    // AFTER the company is saved to DB and we have the real UUID
  };

  const progress = ((step - 1) / 3) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50/30 to-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-cac-green/10 text-cac-green px-4 py-1.5 rounded-full text-sm font-bold mb-4">
            <span>🇳🇬</span> TaxPulse NG
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Set Up Your Tax Profile</h1>
          <p className="text-slate-500 mt-1">For businesses and individuals -- ready in minutes</p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-between mb-8 px-2">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.id}>
              <div className="flex flex-col items-center gap-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold transition-all duration-300 ${
                  step > s.id
                    ? 'bg-cac-green text-white shadow-lg shadow-cac-green/30'
                    : step === s.id
                    ? 'bg-cac-green text-white shadow-lg shadow-cac-green/30 ring-4 ring-cac-green/20'
                    : 'bg-slate-100 text-slate-400'
                }`}>
                  {step > s.id ? '✓' : s.icon}
                </div>
                <span className={`text-xs font-semibold hidden md:block transition-colors ${step === s.id ? 'text-cac-green' : 'text-slate-400'}`}>
                  {s.title}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className="flex-1 h-0.5 mx-2 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full bg-cac-green transition-all duration-500"
                    style={{ width: step > s.id ? '100%' : '0%' }}
                  />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden">
          <div className="h-1.5 bg-slate-100">
            <div
              className="h-full bg-gradient-to-r from-cac-green to-green-400 transition-all duration-500 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="p-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900">{STEPS[step - 1].title}</h2>
              <p className="text-slate-500 text-sm">{STEPS[step - 1].subtitle}</p>
            </div>

            {/* Step 1: Business Identity */}
            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    {form.entityType === EntityType.INDIVIDUAL ? 'Your Full Name *' : 'Business Name *'}
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => update('name', e.target.value)}
                    placeholder={form.entityType === EntityType.INDIVIDUAL ? 'e.g. Chukwuemeka Obi' : 'e.g. SwiftLogistics Ltd'}
                    className={`w-full px-4 py-3 rounded-xl border ${errors.name ? 'border-red-400 bg-red-50' : 'border-slate-200'} focus:outline-none focus:ring-2 focus:ring-cac-green/30 focus:border-cac-green text-slate-800 transition-all`}
                  />
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Entity Type *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.values(EntityType).map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => update('entityType', type)}
                        className={`px-3 py-2.5 rounded-xl text-sm font-medium border text-left transition-all ${
                          form.entityType === type
                            ? 'border-cac-green bg-cac-green/5 text-cac-green font-bold'
                            : 'border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Industry *</label>
                  <select
                    value={form.industry}
                    onChange={e => update('industry', e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl border ${errors.industry ? 'border-red-400 bg-red-50' : 'border-slate-200'} focus:outline-none focus:ring-2 focus:ring-cac-green/30 focus:border-cac-green text-slate-800 bg-white transition-all`}
                  >
                    <option value="">Select your industry</option>
                    {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                  {errors.industry && <p className="text-red-500 text-xs mt-1">{errors.industry}</p>}
                </div>
              </div>
            )}

            {/* Step 2: Registration */}
            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">CAC Registration Status *</label>
                  <div className="flex gap-2">
                    {(['Registered', 'In Progress', 'Not Registered'] as const).map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => update('cacStatus', s)}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                          form.cacStatus === s
                            ? 'border-cac-green bg-cac-green/5 text-cac-green font-bold'
                            : 'border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {form.cacStatus === 'Registered' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">RC / BN Number</label>
                      <input
                        type="text"
                        value={form.rcNumber || ''}
                        onChange={e => update('rcNumber', e.target.value)}
                        placeholder="RC1234567"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cac-green/30 focus:border-cac-green text-slate-800 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">TIN</label>
                      <input
                        type="text"
                        value={form.tin || ''}
                        onChange={e => update('tin', e.target.value)}
                        placeholder="12345678-0001"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cac-green/30 focus:border-cac-green text-slate-800 transition-all"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">State *</label>
                    <select
                      value={form.state}
                      onChange={e => update('state', e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl border ${errors.state ? 'border-red-400 bg-red-50' : 'border-slate-200'} focus:outline-none focus:ring-2 focus:ring-cac-green/30 focus:border-cac-green text-slate-800 bg-white transition-all`}
                    >
                      <option value="">Select state</option>
                      {NIGERIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {errors.state && <p className="text-red-500 text-xs mt-1">{errors.state}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Financial Year End</label>
                    <select
                      value={form.yearEnd}
                      onChange={e => update('yearEnd', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cac-green/30 focus:border-cac-green text-slate-800 bg-white transition-all"
                    >
                      {YEAR_ENDS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Business Address *</label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={e => update('address', e.target.value)}
                    placeholder="12 Admiralty Way, Lekki Phase 1"
                    className={`w-full px-4 py-3 rounded-xl border ${errors.address ? 'border-red-400 bg-red-50' : 'border-slate-200'} focus:outline-none focus:ring-2 focus:ring-cac-green/30 focus:border-cac-green text-slate-800 transition-all`}
                  />
                  {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
                </div>
              </div>
            )}

            {/* Step 3: Tax Profile */}
            {step === 3 && (
              <div className="space-y-5">
                <p className="text-sm text-slate-500 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                  💡 {form.entityType === EntityType.INDIVIDUAL
                    ? 'This helps us generate the right PIT obligations and reminders for you.'
                    : 'This helps us generate the right tax obligations and reminders for your business.'}
                </p>

                {/* INDIVIDUAL: employment type + income */}
                {form.entityType === EntityType.INDIVIDUAL ? (
                  <div className="space-y-5">
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <p className="text-xs font-bold text-blue-800 mb-1">📋 Personal Income Tax Setup (NTA 2025)</p>
                      <p className="text-xs text-blue-600">Your annual PIT return is due <strong>31 March</strong> each year with your State Internal Revenue Service. Self-employed individuals also make quarterly advance payments.</p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Employment Type *</label>
                      <div className="grid grid-cols-1 gap-2">
                        {([
                          { val: 'employed', label: "Employed", desc: 'Salary earner -- PAYE deducted by employer' },
                          { val: 'self-employed', label: "Self-Employed / Freelancer", desc: 'Runs own business -- must file & pay PIT directly' },
                          { val: 'both', label: "Both (Salary + Business Income)", desc: 'Employed and has other income sources' },
                        ] as const).map(opt => (
                          <button
                            key={opt.val}
                            type="button"
                            onClick={() => update('employmentType', opt.val)}
                            className={`text-left px-4 py-3 rounded-xl border transition-all ${
                              form.employmentType === opt.val
                                ? 'bg-cac-green/10 border-cac-green text-cac-green'
                                : 'bg-white border-slate-200 text-slate-700 hover:border-cac-green/40'
                            }`}
                          >
                            <p className="font-bold text-sm">{opt.label}</p>
                            <p className="text-xs opacity-70 mt-0.5">{opt.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Estimated Annual Gross Income (₦)</label>
                      <input
                        type="number"
                        value={form.annualIncome || ''}
                        onChange={e => update('annualIncome', parseFloat(e.target.value) || undefined)}
                        placeholder="e.g. 4,800,000"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cac-green/30 focus:border-cac-green text-slate-800"
                      />
                      <p className="text-xs text-slate-400 mt-1">Used to estimate your PIT liability. You can update anytime in Settings.</p>
                      {(form.annualIncome || 0) > 0 && (
                        <p className="text-xs text-cac-green mt-1 font-semibold">
                          {(form.annualIncome || 0) <= 800000
                            ? '✓ First ₦800k is tax-free under NTA 2025'
                            : `Estimated monthly PIT: ₦${Math.round(((form.annualIncome || 0) * 0.12) / 12).toLocaleString()} (rough estimate)`}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  /* BUSINESS: existing VAT, PAYE, WHT toggles */
                  <>
                    <ToggleCard
                      icon="🧾"
                      title="Registered for VAT?"
                      description="Your business charges VAT (7.5%) on goods or services"
                      checked={form.collectsVat}
                      onChange={v => update('collectsVat', v)}
                    />
                    {form.collectsVat && (
                      <div className="ml-4 pl-4 border-l-2 border-cac-green/30">
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">VAT Registration Number</label>
                        <input
                          type="text"
                          value={form.vatNumber || ''}
                          onChange={e => update('vatNumber', e.target.value)}
                          placeholder="e.g. 0123456789"
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cac-green/30 focus:border-cac-green text-slate-800 transition-all"
                        />
                      </div>
                    )}

                    <ToggleCard
                      icon="👥"
                      title="Do you have employees?"
                      description="You'll need to file PAYE returns with your state IRS"
                      checked={form.hasEmployees}
                      onChange={v => update('hasEmployees', v)}
                    />
                    {form.hasEmployees && (
                      <div className="ml-4 pl-4 border-l-2 border-cac-green/30">
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Number of Employees</label>
                        <input
                          type="number"
                          min={1}
                          value={form.employeeCount || ''}
                          onChange={e => update('employeeCount', parseInt(e.target.value) || undefined)}
                          placeholder="e.g. 12"
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cac-green/30 focus:border-cac-green text-slate-800 transition-all"
                        />
                      </div>
                    )}

                    <ToggleCard
                      icon="🤝"
                      title="Do you pay vendors / contractors?"
                      description="You'll need to deduct and remit Withholding Tax (WHT)"
                      checked={form.paysVendors}
                      onChange={v => update('paysVendors', v)}
                    />

                    {/* Payroll statutory contributions -- shown when has employees */}
                    {form.hasEmployees && (
                      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 space-y-3">
                        <p className="text-xs font-bold text-purple-800">👥 Payroll Statutory Contributions</p>
                        <p className="text-xs text-purple-600">These apply to employers with staff. Tick what applies to you.</p>

                        <ToggleCard
                          icon="🛡️"
                          title="NSITF (3+ employees)"
                          description="1% of gross payroll monthly → National Social Insurance Trust Fund (due 16th)"
                          checked={form.hasNSITF || false}
                          onChange={v => update('hasNSITF', v)}
                        />
                        <ToggleCard
                          icon="🏦"
                          title="Pension (3+ employees)"
                          description="8% employee + 10% employer of gross → Pension Fund Administrators (due 7 days after payday)"
                          checked={form.hasPension || false}
                          onChange={v => update('hasPension', v)}
                        />
                        <ToggleCard
                          icon="🎓"
                          title="ITF (5+ staff or ₦50M+ turnover)"
                          description="1% of annual payroll → Industrial Training Fund (due 1 April annually)"
                          checked={form.hasITF || false}
                          onChange={v => update('hasITF', v)}
                        />
                        <ToggleCard
                          icon="🏠"
                          title="NHF contributions"
                          description="2.5% of employee basic salary monthly → Federal Mortgage Bank of Nigeria"
                          checked={form.hasNHF || false}
                          onChange={v => update('hasNHF', v)}
                        />
                      </div>
                    )}

                    {/* CAC Annual Returns */}
                    {(form.cacStatus === 'Registered' || form.rcNumber) && (
                      <ToggleCard
                        icon="🏛️"
                        title="CAC Annual Returns"
                        description="All registered companies must file annual returns with CAC by 30 June each year"
                        checked={form.cacAnnualReturns !== false}
                        onChange={v => update('cacAnnualReturns', v)}
                      />
                    )}
                  </>
                )}
              {/* WhatsApp reminder opt-in */}
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
                <p className="text-xs font-bold text-green-800">📱 WhatsApp Deadline Reminders</p>
                <p className="text-xs text-green-600">Get tax deadline reminders directly on WhatsApp -- 7 days and 1 day before each obligation is due.</p>
                <input
                  type="tel"
                  value={form.phone || ''}
                  onChange={e => update('phone', e.target.value)}
                  placeholder="e.g. 08012345678 or +2348012345678"
                  className="w-full px-4 py-2.5 rounded-xl border border-green-200 focus:outline-none focus:ring-2 focus:ring-cac-green/30 focus:border-cac-green text-sm bg-white"
                />
                {form.phone && (
                  <ToggleCard
                    icon="✅"
                    title="Enable WhatsApp reminders"
                    description="I agree to receive tax deadline reminders on WhatsApp from TaxPulse NG"
                    checked={form.whatsappOptin || false}
                    onChange={v => update('whatsappOptin', v)}
                  />
                )}
              </div>
              </div>
            )}

            {/* Step 4: Review */}
            {step === 4 && (
              <div className="space-y-4">
                <div className="bg-slate-50 rounded-2xl p-5 space-y-3">
                  <ReviewRow label={form.entityType === EntityType.INDIVIDUAL ? "Full Name" : "Business Name"} value={form.name} />
                  <ReviewRow label="Entity Type" value={form.entityType} />
                  <ReviewRow label="Industry" value={form.industry} />
                  <ReviewRow label="State" value={form.state} />
                  <ReviewRow label="CAC Status" value={form.cacStatus} />
                  {form.rcNumber && <ReviewRow label="RC/BN Number" value={form.rcNumber} />}
                  {form.tin && <ReviewRow label="TIN" value={form.tin} />}
                  <ReviewRow label="Financial Year End" value={form.yearEnd} />
                  <div className="pt-2 border-t border-slate-200">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-2">Tax Obligations</p>
                    <div className="flex flex-wrap gap-2">
                      {form.entityType === EntityType.INDIVIDUAL ? (
                        <>
                          <span className="bg-cac-green/10 text-cac-green text-xs font-bold px-2.5 py-1 rounded-full">PIT ✓</span>
                          {(form.employmentType === 'self-employed' || form.employmentType === 'both') && (
                            <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-full">Quarterly Advance ✓</span>
                          )}
                        </>
                      ) : (
                        <>
                          <span className="bg-cac-green/10 text-cac-green text-xs font-bold px-2.5 py-1 rounded-full">CIT ✓</span>
                          {form.collectsVat && <span className="bg-cac-green/10 text-cac-green text-xs font-bold px-2.5 py-1 rounded-full">VAT ✓</span>}
                          {form.hasEmployees && <span className="bg-cac-green/10 text-cac-green text-xs font-bold px-2.5 py-1 rounded-full">PAYE ✓</span>}
                          {form.paysVendors && <span className="bg-cac-green/10 text-cac-green text-xs font-bold px-2.5 py-1 rounded-full">WHT ✓</span>}
                          {form.hasNSITF && <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2.5 py-1 rounded-full">NSITF ✓</span>}
                          {form.hasPension && <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-full">Pension ✓</span>}
                          {form.hasITF && <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full">ITF ✓</span>}
                          {form.hasNHF && <span className="bg-teal-100 text-teal-700 text-xs font-bold px-2.5 py-1 rounded-full">NHF ✓</span>}
                          {form.cacAnnualReturns !== false && form.cacStatus === 'Registered' && <span className="bg-slate-100 text-slate-700 text-xs font-bold px-2.5 py-1 rounded-full">CAC ✓</span>}
                          {form.whatsappOptin && <span className="bg-green-100 text-green-700 text-xs font-bold px-2.5 py-1 rounded-full">WhatsApp ✓</span>}
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-slate-400 text-center">You can update these details anytime from Settings.</p>
              </div>
            )}
          </div>

          {/* Footer buttons */}
          <div className="px-8 pb-8 flex justify-between items-center">
            <button
              onClick={back}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all ${step === 1 ? 'invisible' : ''}`}
            >
              ← Back
            </button>
            {step < 4 ? (
              <button
                onClick={next}
                className="px-6 py-2.5 bg-cac-green text-white rounded-xl text-sm font-bold hover:bg-cac-dark transition-all shadow-lg shadow-cac-green/20"
              >
                Continue →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-8 py-2.5 bg-cac-green text-white rounded-xl text-sm font-bold hover:bg-cac-dark transition-all shadow-lg shadow-cac-green/30 flex items-center gap-2 disabled:opacity-70"
              >
                🚀 Launch Dashboard
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const ToggleCard: React.FC<{
  icon: string;
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}> = ({ icon, title, description, checked, onChange }) => (
  <div
    onClick={() => onChange(!checked)}
    className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
      checked ? 'border-cac-green bg-cac-green/5' : 'border-slate-200 hover:border-slate-300'
    }`}
  >
    <span className="text-2xl">{icon}</span>
    <div className="flex-1">
      <p className="font-semibold text-slate-800 text-sm">{title}</p>
      <p className="text-xs text-slate-500">{description}</p>
    </div>
    <div className={`w-11 h-6 rounded-full transition-all flex items-center px-0.5 ${checked ? 'bg-cac-green' : 'bg-slate-200'}`}>
      <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
    </div>
  </div>
);

const ReviewRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex justify-between items-center text-sm">
    <span className="text-slate-500 font-medium">{label}</span>
    <span className="text-slate-800 font-semibold">{value}</span>
  </div>
);

export default Onboarding;
