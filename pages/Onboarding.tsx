import React, { useState } from 'react';
import { Company, EntityType } from '../types';

interface OnboardingProps {
  onComplete: (company: Company) => void;
}

const STEPS = [
  { id: 1, title: "Your Profile", subtitle: 'Tell us about yourself or your business', icon: '1' },
  { id: 2, title: "Registration", subtitle: 'CAC & Tax registration details', icon: '2' },
  { id: 3, title: "Tax Profile", subtitle: 'Configure your tax obligations', icon: '3' },
  { id: 4, title: "Ready!", subtitle: 'Review and launch', icon: '4' },
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

const SVG_CHECK_INLINE = <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [profileType, setProfileType] = useState<'individual' | 'business' | null>(null);
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

  // ── Individual quick onboarding ──────────────────────────────────────────────
  const [indForm, setIndForm] = useState({
    name: '', state: '', employmentType: 'self-employed' as 'employed' | 'self-employed' | 'both',
    annualIncome: '', phone: '',
  });
  const [indSubmitting, setIndSubmitting] = useState(false);

  const handleIndividualSubmit = () => {
    if (!indForm.name.trim() || !indForm.state) return;
    setIndSubmitting(true);
    const company: Company = {
      id: Date.now().toString(),
      name: indForm.name.trim(),
      entityType: EntityType.INDIVIDUAL,
      industry: 'Individual',
      state: indForm.state,
      address: '',
      cacStatus: 'Not Registered',
      yearEnd: 'December 31',
      hasEmployees: false,
      paysVendors: false,
      collectsVat: false,
      complianceScore: 50,
      employmentType: indForm.employmentType,
      annualIncome: parseFloat(indForm.annualIncome) || undefined,
      phone: indForm.phone || undefined,
    };
    onComplete(company);
  };

  // ── Profile type selector ─────────────────────────────────────────────────────
  if (!profileType) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50/30 to-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-10">
          <img src="/logo-full.png" alt="TaxPulse NG" className="h-10 w-auto mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-slate-900">Who are you filing for?</h1>
          <p className="text-slate-500 mt-2">Choose your account type to get started</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => setProfileType('individual')}
            className="bg-white border-2 border-slate-200 rounded-2xl p-6 text-left hover:border-cac-green hover:shadow-md transition-all group"
          >
            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-cac-green/10 transition-all text-blue-600">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
            <h3 className="font-extrabold text-slate-900 text-lg">Myself</h3>
            <p className="text-slate-500 text-sm mt-1">Freelancer, creator, remote worker, employed individual</p>
            <ul className="mt-4 space-y-1">
              {['Personal income tax (PIT)', 'WHT credit tracking', 'Foreign income in USD, GBP, EUR', 'Quarterly tax reminders'].map(f => (
                <li key={f} className="text-xs text-slate-400 flex items-center gap-2">
                  <span className="text-cac-green flex-shrink-0"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span> {f}
                </li>
              ))}
            </ul>
            <div className="mt-4 text-cac-green font-bold text-sm flex items-center gap-1">
              Get started <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </div>
          </button>

          <button
            onClick={() => setProfileType('business')}
            className="bg-white border-2 border-slate-200 rounded-2xl p-6 text-left hover:border-cac-green hover:shadow-md transition-all group"
          >
            <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-cac-green/10 transition-all text-cac-green">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
            </div>
            <h3 className="font-extrabold text-slate-900 text-lg">My Business</h3>
            <p className="text-slate-500 text-sm mt-1">Ltd, PLC, NGO, sole proprietorship, partnership</p>
            <ul className="mt-4 space-y-1">
              {['VAT, PAYE, WHT, CIT filing', 'Multi-employee payroll', 'Evidence vault & PDF export', 'CAC annual returns'].map(f => (
                <li key={f} className="text-xs text-slate-400 flex items-center gap-2">
                  <span className="text-cac-green flex-shrink-0"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span> {f}
                </li>
              ))}
            </ul>
            <div className="mt-4 text-cac-green font-bold text-sm flex items-center gap-1">
              Get started <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </div>
          </button>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          You can add multiple profiles after setup
        </p>
      </div>
    </div>
  );

  // ── Individual flow ───────────────────────────────────────────────────────────
  if (profileType === 'individual') return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <button onClick={() => setProfileType(null)} className="text-slate-400 text-sm hover:text-slate-600 mb-4 flex items-center gap-1 mx-auto">
            Back
          </button>
          <img src="/logo-full.png" alt="TaxPulse NG" className="h-9 w-auto mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900">Personal Tax Profile</h1>
          <p className="text-slate-500 text-sm mt-1">Quick setup — takes under 2 minutes</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Your Full Name *</label>
            <input
              value={indForm.name}
              onChange={e => setIndForm(p => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Chukwuemeka Obi"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-cac-green/30 focus:border-cac-green"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">State of Residence *</label>
            <select
              value={indForm.state}
              onChange={e => setIndForm(p => ({ ...p, state: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-cac-green/30 bg-white"
            >
              <option value="">Select your state</option>
              {NIGERIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">How do you earn?</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'employed', label: 'Salary / PAYE', icon: 'briefcase' },
                { value: 'self-employed', label: 'Freelance / Creator', icon: 'laptop' },
                { value: 'both', label: 'Both', icon: 'zap' },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setIndForm(p => ({ ...p, employmentType: opt.value as any }))}
                  className={`p-3 rounded-xl border text-center transition-all ${indForm.employmentType === opt.value ? 'border-cac-green bg-cac-green/5 text-cac-green' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
                >
                  <div className="mb-1 flex justify-center text-current">
                    {opt.icon === 'briefcase' ? (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>) : opt.icon === 'laptop' ? (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>) : (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>)}
                  </div>
                  <div className="text-xs font-semibold">{opt.label}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Estimated Annual Income (NGN)
              <span className="text-slate-400 font-normal ml-2">optional</span>
            </label>
            <input
              type="number"
              value={indForm.annualIncome}
              onChange={e => setIndForm(p => ({ ...p, annualIncome: e.target.value }))}
              placeholder="e.g. 4800000"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-cac-green/30"
            />
            <p className="text-xs text-slate-400 mt-1">Used to estimate your PIT liability. You can update this anytime.</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Phone Number
              <span className="text-slate-400 font-normal ml-2">optional — for deadline reminders</span>
            </label>
            <input
              type="tel"
              value={indForm.phone}
              onChange={e => setIndForm(p => ({ ...p, phone: e.target.value }))}
              placeholder="e.g. 08012345678"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-cac-green/30"
            />
          </div>

          <button
            onClick={handleIndividualSubmit}
            disabled={!indForm.name.trim() || !indForm.state || indSubmitting}
            className="w-full py-3.5 bg-cac-green text-white rounded-xl font-bold text-sm hover:bg-cac-dark disabled:opacity-50 transition-all"
          >
            {indSubmitting ? 'Setting up...' : 'Launch My Tax Dashboard'}
          </button>
        </div>

        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-700">
          <p className="font-bold mb-1">What happens next?</p>
          <p>We will generate your personal PIT obligations, quarterly remittance calendar, and set up your income tracker — all based on NTA 2025.</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50/30 to-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">

        {/* Header */}
        <div className="text-center mb-8">
          <button onClick={() => setProfileType(null)} className="text-slate-400 text-sm hover:text-slate-600 mb-4 flex items-center gap-1 mx-auto">
            Back
          </button>
          <img src="/logo-full.png" alt="TaxPulse NG" className="h-10 w-auto mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-slate-900">Set Up Your Business</h1>
          <p className="text-slate-500 mt-1">Ready in minutes</p>
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
                  {step > s.id ? SVG_CHECK_INLINE : s.icon}
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
                   {form.entityType === EntityType.INDIVIDUAL
                    ? 'This helps us generate the right PIT obligations and reminders for you.'
                    : 'This helps us generate the right tax obligations and reminders for your business.'}
                </p>

                {/* INDIVIDUAL: employment type + income */}
                {form.entityType === EntityType.INDIVIDUAL ? (
                  <div className="space-y-5">
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <p className="text-xs font-bold text-blue-800 mb-1">Personal Income Tax Setup (NTA 2025)</p>
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
                            ? 'First N800k is tax-free under NTA 2025'
                            : `Estimated monthly PIT: ₦${Math.round(((form.annualIncome || 0) * 0.12) / 12).toLocaleString()} (rough estimate)`}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  /* BUSINESS: existing VAT, PAYE, WHT toggles */
                  <>
                    <ToggleCard
                      icon=""
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
                      icon=""
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
                      icon=""
                      title="Do you pay vendors / contractors?"
                      description="You'll need to deduct and remit Withholding Tax (WHT)"
                      checked={form.paysVendors}
                      onChange={v => update('paysVendors', v)}
                    />

                    {/* Payroll statutory contributions -- shown when has employees */}
                    {form.hasEmployees && (
                      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 space-y-3">
                        <p className="text-xs font-bold text-purple-800">Payroll Statutory Contributions</p>
                        <p className="text-xs text-purple-600">These apply to employers with staff. Tick what applies to you.</p>

                        <ToggleCard
                          icon=""
                          title="NSITF (3+ employees)"
                          description="1% of gross payroll monthly → National Social Insurance Trust Fund (due 16th)"
                          checked={form.hasNSITF || false}
                          onChange={v => update('hasNSITF', v)}
                        />
                        <ToggleCard
                          icon=""
                          title="Pension (3+ employees)"
                          description="8% employee + 10% employer of gross → Pension Fund Administrators (due 7 days after payday)"
                          checked={form.hasPension || false}
                          onChange={v => update('hasPension', v)}
                        />
                        <ToggleCard
                          icon=""
                          title="ITF (5+ staff or ₦50M+ turnover)"
                          description="1% of annual payroll → Industrial Training Fund (due 1 April annually)"
                          checked={form.hasITF || false}
                          onChange={v => update('hasITF', v)}
                        />
                        <ToggleCard
                          icon=""
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
                        icon=""
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
                <p className="text-xs font-bold text-green-800">WhatsApp Deadline Reminders</p>
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
                    icon=""
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
                          <span className="bg-cac-green/10 text-cac-green text-xs font-bold px-2.5 py-1 rounded-full">PIT </span>
                          {(form.employmentType === 'self-employed' || form.employmentType === 'both') && (
                            <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-full">Quarterly Advance </span>
                          )}
                        </>
                      ) : (
                        <>
                          <span className="bg-cac-green/10 text-cac-green text-xs font-bold px-2.5 py-1 rounded-full">CIT </span>
                          {form.collectsVat && <span className="bg-cac-green/10 text-cac-green text-xs font-bold px-2.5 py-1 rounded-full">VAT </span>}
                          {form.hasEmployees && <span className="bg-cac-green/10 text-cac-green text-xs font-bold px-2.5 py-1 rounded-full">PAYE </span>}
                          {form.paysVendors && <span className="bg-cac-green/10 text-cac-green text-xs font-bold px-2.5 py-1 rounded-full">WHT </span>}
                          {form.hasNSITF && <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2.5 py-1 rounded-full">NSITF </span>}
                          {form.hasPension && <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-full">Pension </span>}
                          {form.hasITF && <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full">ITF </span>}
                          {form.hasNHF && <span className="bg-teal-100 text-teal-700 text-xs font-bold px-2.5 py-1 rounded-full">NHF </span>}
                          {form.cacAnnualReturns !== false && form.cacStatus === 'Registered' && <span className="bg-slate-100 text-slate-700 text-xs font-bold px-2.5 py-1 rounded-full">CAC </span>}
                          {form.whatsappOptin && <span className="bg-green-100 text-green-700 text-xs font-bold px-2.5 py-1 rounded-full">WhatsApp </span>}
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
              Back
            </button>
            {step < 4 ? (
              <button
                onClick={next}
                className="px-6 py-2.5 bg-cac-green text-white rounded-xl text-sm font-bold hover:bg-cac-dark transition-all shadow-lg shadow-cac-green/20"
              >
                Continue
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-8 py-2.5 bg-cac-green text-white rounded-xl text-sm font-bold hover:bg-cac-dark transition-all shadow-lg shadow-cac-green/30 flex items-center gap-2 disabled:opacity-70"
              >
                Launch Dashboard
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
