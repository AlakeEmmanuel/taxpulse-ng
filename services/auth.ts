import { supabase } from './supabaseClient';

export interface UserProfile {
  id: string;
  email?: string;
  fullName?: string;
  phone?: string;
  plan: 'free' | 'pro';
  subscriptionStatus: 'active' | 'inactive' | 'cancelled';
  promoCodeUsed?: string;
  planExpiresAt?: string;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export async function signUpEmail(email: string, password: string, fullName: string) {
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: { data: { full_name: fullName } }
  });
  if (error) throw error;
  return data;
}

export async function signInEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}


export async function signOut() {
  await supabase.auth.signOut();
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

// ─── Profile ──────────────────────────────────────────────────────────────────
export async function getProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error || !data) return null;
  return {
    id:                 data.id,
    email:              data.email,
    fullName:           data.full_name,
    phone:              data.phone,
    plan:               data.plan || 'free',
    subscriptionStatus: data.subscription_status || 'inactive',
    promoCodeUsed:      data.promo_code_used,
    planExpiresAt:      data.plan_expires_at,
  };
}

export function isPro(profile: UserProfile | null): boolean {
  if (!profile) return false;
  if (profile.plan === 'pro' && profile.subscriptionStatus === 'active') return true;
  // Check expiry
  if (profile.planExpiresAt) {
    return new Date(profile.planExpiresAt) > new Date();
  }
  return false;
}

// ─── Promo Codes ──────────────────────────────────────────────────────────────
export async function redeemPromoCode(userId: string, code: string): Promise<string> {
  const upper = code.toUpperCase().trim();

  // Fetch promo code
  const { data: promo, error } = await supabase
    .from('promo_codes')
    .select('*')
    .eq('code', upper)
    .eq('is_active', true)
    .single();

  if (error || !promo) throw new Error('Invalid or inactive promo code.');
  if (promo.uses_count >= promo.max_uses) throw new Error('This promo code has reached its usage limit.');
  if (promo.expires_at && new Date(promo.expires_at) < new Date()) throw new Error('This promo code has expired.');

  // Activate user pro plan
  const expiresAt = new Date();
  expiresAt.setFullYear(expiresAt.getFullYear() + 1); // 1 year access

  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      plan: promo.plan,
      subscription_status: 'active',
      promo_code_used: upper,
      plan_expires_at: expiresAt.toISOString(),
    })
    .eq('id', userId);

  if (updateError) throw updateError;

  // Increment usage count
  await supabase
    .from('promo_codes')
    .update({ uses_count: promo.uses_count + 1 })
    .eq('id', promo.id);

  return `✅ Code applied! You have Pro access until ${expiresAt.toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}.`;
}

// ─── Paystack subscription callback ───────────────────────────────────────────
export async function activateSubscription(
  userId: string,
  paystackCustomerCode: string,
  paystackSubCode: string,
  plan: 'monthly' | 'annual' = 'monthly'
) {
  const expiresAt = new Date();
  if (plan === 'annual') {
    expiresAt.setFullYear(expiresAt.getFullYear() + 1); // 1 year
  } else {
    expiresAt.setMonth(expiresAt.getMonth() + 1); // 1 month
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      plan: 'pro',
      subscription_status: 'active',
      paystack_customer_code: paystackCustomerCode,
      paystack_subscription_code: paystackSubCode,
      plan_expires_at: expiresAt.toISOString(),
    })
    .eq('id', userId);

  if (error) throw error;
}
