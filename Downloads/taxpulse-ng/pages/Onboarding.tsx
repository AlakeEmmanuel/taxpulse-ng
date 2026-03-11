import React, { useState } from 'react';
import { Company, EntityType } from '../types';

interface OnboardingProps {
  onComplete: (company: Company) => void;
}

const STEPS = [
  { id: 1, title: 'Business Identity', subtitle: 'Tell us about your business', icon: '🏢' },
  { id: 2, title: 'Registration', subtitle: 'CAC & Tax registration details', icon: '📋' },
  { id: 3, title: 'Tax Profile', subtitle: 'Configure your tax obligations', icon: '🧾' },
  { id: 4, title: 'Ready!', subtitle: 'Review and launch', icon: '🚀' },
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

  const handleSubmit = () => {
    const company: Company = {
      ...form,
      id: Date.now().toString(),
      complianceScore: 50,
    };
    onComplete(company);
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
          <h1 className="text-3xl font-bold text-slate-900">Set Up Your Business</h1>
          <p className="text-slate-500 mt-1">Get your tax compliance dashboard ready in minutes</p>
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
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Business Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => update('name', e.target.value)}
                    placeholder="e.g. SwiftLogistics Ltd"
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
                  💡 This helps us generate the right tax obligations and reminders for your business.
                </p>

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
              </div>
            )}

            {/* Step 4: Review */}
            {step === 4 && (
              <div className="space-y-4">
                <div className="bg-slate-50 rounded-2xl p-5 space-y-3">
                  <ReviewRow label="Business Name" value={form.name} />
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
                      <span className="bg-cac-green/10 text-cac-green text-xs font-bold px-2.5 py-1 rounded-full">CIT ✓</span>
                      {form.collectsVat && <span className="bg-cac-green/10 text-cac-green text-xs font-bold px-2.5 py-1 rounded-full">VAT ✓</span>}
                      {form.hasEmployees && <span className="bg-cac-green/10 text-cac-green text-xs font-bold px-2.5 py-1 rounded-full">PAYE ✓</span>}
                      {form.paysVendors && <span className="bg-cac-green/10 text-cac-green text-xs font-bold px-2.5 py-1 rounded-full">WHT ✓</span>}
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
                className="px-8 py-2.5 bg-cac-green text-white rounded-xl text-sm font-bold hover:bg-cac-dark transition-all shadow-lg shadow-cac-green/30 flex items-center gap-2"
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
