import React, { useState } from 'react';
import { UserProfile, redeemPromoCode, activateSubscription } from '../services/auth';

// Your Paystack public key — replace with yours from dashboard.paystack.com
const PAYSTACK_PUBLIC_KEY  = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY       || 'pk_test_xxxxxx';
const MONTHLY_PLAN_CODE    = import.meta.env.VITE_PAYSTACK_PLAN_MONTHLY      || 'PLN_xxxxxx';
const ANNUAL_PLAN_CODE     = import.meta.env.VITE_PAYSTACK_PLAN_ANNUAL       || 'PLN_xxxxxx';
const MONTHLY_PRICE_NGN    = 2500;
const ANNUAL_PRICE_NGN     = 25000;

interface PaywallProps {
  profile: UserProfile;
  onUpgraded: () => void;
  onContinueFree: () => void;
}

declare global {
  interface Window { PaystackPop: any; }
}

export const Paywall: React.FC<PaywallProps> = ({ profile, onUpgraded, onContinueFree }) => {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('annual');
  const [promoCode, setPromoCode] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoMsg, setPromoMsg] = useState('');
  const [promoError, setPromoError] = useState('');
  const [payLoading, setPayLoading] = useState(false);

  const handlePromo = async () => {
    if (!promoCode.trim()) return;
    setPromoLoading(true); setPromoError(''); setPromoMsg('');
    try {
      const msg = await redeemPromoCode(profile.id, promoCode);
      setPromoMsg(msg);
      setTimeout(onUpgraded, 1500);
    } catch (e: any) {
      setPromoError(e.message);
    } finally {
      setPromoLoading(false);
    }
  };

  const handlePaystack = () => {
    if (!profile.email) {
      alert('Please update your email in Settings first.');
      return;
    }

    // Load Paystack script if not already loaded
    if (!window.PaystackPop) {
      const script = document.createElement('script');
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.onload = () => initPaystack();
      document.head.appendChild(script);
    } else {
      initPaystack();
    }
  };

  const initPaystack = () => {
    setPayLoading(true);
    const isAnnual = selectedPlan === 'annual';
    const handler = window.PaystackPop.setup({
      key:       PAYSTACK_PUBLIC_KEY,
      email:     profile.email,
      amount:    (isAnnual ? ANNUAL_PRICE_NGN : MONTHLY_PRICE_NGN) * 100,
      currency:  'NGN',
      plan:      isAnnual ? ANNUAL_PLAN_CODE : MONTHLY_PLAN_CODE,
      ref:       'TAXPULSE_' + Date.now(),
      metadata: {
        custom_fields: [
          { display_name: 'User ID', variable_name: 'user_id', value: profile.id },
          { display_name: 'App',     variable_name: 'app',     value: 'TaxPulse NG' },
        ]
      },
      callback: async (response: any) => {
        setPayLoading(false);
        // In production, verify on your backend. Here we optimistically activate.
        try {
          await activateSubscription(
            profile.id,
            response.customer?.customer_code || '',
            response.subscription?.subscription_code || response.reference
          );
          onUpgraded();
        } catch (e) {
          alert('Payment received but activation failed. Contact support with ref: ' + response.reference);
        }
      },
      onClose: () => setPayLoading(false),
    });
    handler.openIframe();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-4">

        {/* Header */}
        <div className="text-center mb-6">
          <img src="/logo-full.png" alt="TaxPulse NG" className="h-10 w-auto mx-auto mb-4" />
          <h1 className="text-2xl font-extrabold text-slate-900">Upgrade to Pro</h1>
          <p className="text-slate-500 text-sm mt-1">Unlock the full power of TaxPulse NG</p>
        </div>

        {/* Plan toggle */}
        <div className="bg-white rounded-2xl border border-slate-100 p-2 flex gap-2">
          {(['monthly', 'annual'] as const).map(plan => (
            <button key={plan} onClick={() => setSelectedPlan(plan)}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-colors relative ${selectedPlan === plan ? 'bg-cac-green text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
              {plan === 'monthly' ? '₦2,500 / month' : '₦25,000 / year'}
              {plan === 'annual' && (
                <span className={`ml-2 text-[9px] font-black px-2 py-0.5 rounded-full ${selectedPlan === 'annual' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'}`}>
                  SAVE 17%
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Plan comparison */}
        <div className="grid grid-cols-2 gap-3">
          {/* Free */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">Free</p>
            <p className="text-2xl font-extrabold text-slate-900 mb-4">₦0</p>
            <div className="space-y-2 text-xs text-slate-600">
              {[
                { ok: true,  text: '1 company' },
                { ok: true,  text: 'All calculators' },
                { ok: true,  text: 'Tax ledger' },
                { ok: true,  text: 'Penalty calculator' },
                { ok: false, text: 'AI Tax Assistant' },
                { ok: false, text: 'PDF export' },
                { ok: false, text: 'Evidence Vault' },
                { ok: false, text: 'Multiple companies' },
              ].map(({ ok, text }) => (
                <div key={text} className={`flex items-center gap-2 ${!ok ? 'opacity-40' : ''}`}>
                  <span>{ok ? '✅' : '🔒'}</span>
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pro */}
          <div className="bg-cac-green rounded-2xl border border-cac-green p-5 text-white relative overflow-hidden">
            <div className="absolute top-3 right-3 bg-white/20 text-white text-[9px] font-black px-2 py-0.5 rounded-full">RECOMMENDED</div>
            <p className="text-xs font-black text-green-200 uppercase tracking-wider mb-3">Pro</p>
            <div className="mb-4">
              {selectedPlan === 'monthly' ? (
                <><span className="text-2xl font-extrabold">₦2,500</span><span className="text-green-200 text-xs">/month</span></>
              ) : (
                <><span className="text-2xl font-extrabold">₦25,000</span><span className="text-green-200 text-xs">/year</span></>
              )}
            </div>
            <div className="space-y-2 text-xs text-green-100">
              {[
                'Unlimited companies',
                'All calculators',
                'Tax ledger',
                'Penalty calculator',
                '🤖 AI Tax Assistant',
                '📄 PDF export',
                '🗄️ Evidence Vault',
                'Priority support',
              ].map(text => (
                <div key={text} className="flex items-center gap-2">
                  <span className="text-green-300">✓</span>
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Pay with Paystack */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
          <p className="font-bold text-slate-800 text-sm">Pay with Paystack</p>
          <p className="text-xs text-slate-500">Secure payment via card, bank transfer, or USSD. Cancel anytime.</p>
          <button
            onClick={handlePaystack}
            disabled={payLoading}
            className="w-full bg-cac-green text-white py-3.5 rounded-xl font-bold text-sm hover:bg-cac-dark disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {payLoading ? (
              <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Processing...</>
            ) : (
  <>💳 Subscribe — {selectedPlan === 'monthly' ? '₦2,500/month' : '₦25,000/year'}</>
            )}
          </button>
          <p className="text-[10px] text-slate-400 text-center">Powered by Paystack · 100% secure · NGN payments</p>
        </div>

        {/* Promo code */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
          <p className="font-bold text-slate-800 text-sm">Have a promo code?</p>
          {promoMsg && <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-xs text-cac-green font-bold">{promoMsg}</div>}
          {promoError && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-600">{promoError}</div>}
          <div className="flex gap-2">
            <input
              value={promoCode}
              onChange={e => setPromoCode(e.target.value.toUpperCase())}
              placeholder="e.g. TAXPULSE2026"
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono font-bold tracking-wider focus:outline-none focus:ring-2 focus:ring-cac-green uppercase"
            />
            <button
              onClick={handlePromo}
              disabled={promoLoading || !promoCode.trim()}
              className="bg-slate-900 text-white px-5 rounded-xl text-sm font-bold hover:bg-slate-700 disabled:opacity-50 transition-colors"
            >
              {promoLoading ? '...' : 'Apply'}
            </button>
          </div>
        </div>

        {/* Continue free */}
        <button
          onClick={onContinueFree}
          className="w-full text-slate-400 text-sm py-3 hover:text-slate-600 transition-colors"
        >
          Continue with Free plan →
        </button>
      </div>
    </div>
  );
};
