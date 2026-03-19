// services/notifications.ts
import { supabase } from './supabaseClient';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

export async function isPushSubscribed(): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    return !!sub;
  } catch { return false; }
}

export async function subscribeToPush(userId: string): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert('Push notifications are not supported in this browser.');
      return false;
    }

    if (!VAPID_PUBLIC_KEY) {
      console.error('VITE_VAPID_PUBLIC_KEY is not set');
      return false;
    }

    // Request permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return false;

    const reg = await navigator.serviceWorker.ready;

    // Unsubscribe from any existing subscription first
    const existing = await reg.pushManager.getSubscription();
    if (existing) await existing.unsubscribe();

    // Create fresh subscription
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    // Delete any existing row for this user, then insert fresh
    await supabase.from('push_subscriptions').delete().eq('user_id', userId);
    
    const { error } = await supabase
      .from('push_subscriptions')
      .insert({ user_id: userId, subscription: sub.toJSON() });

    if (error) {
      console.error('Failed to save push subscription:', error);
      return false;
    }

    return true;
  } catch (e) {
    console.error('Push subscribe error:', e);
    return false;
  }
}

export async function unsubscribeFromPush(userId: string): Promise<void> {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) await sub.unsubscribe();
    await supabase.from('push_subscriptions').delete().eq('user_id', userId);
  } catch (e) {
    console.error('Push unsubscribe error:', e);
  }
}

// ─── WhatsApp Reminders via Termii ───────────────────────────────────────────
// Termii is a Nigerian messaging API — www.termii.com
// Set VITE_TERMII_API_KEY in your Vercel environment variables
// IMPORTANT: This is a client-side call for demo purposes.
// For production, move this to a Vercel serverless function to protect your API key.

const TERMII_API_KEY = import.meta.env.VITE_TERMII_API_KEY as string;

export interface WhatsAppReminder {
  phone:       string;  // Nigerian number e.g. "2348012345678"
  taxType:     string;
  period:      string;
  dueDate:     string;
  daysLeft:    number;
  companyName: string;
  amount?:     number;
}

export async function sendWhatsAppReminder(reminder: WhatsAppReminder): Promise<boolean> {
  if (!TERMII_API_KEY) {
    console.warn('VITE_TERMII_API_KEY not set — WhatsApp reminders disabled');
    return false;
  }

  // Sanitize phone number — ensure it starts with 234
  const phone = reminder.phone.replace(/^0/, '234').replace(/[^0-9]/g, '');

  const urgency = reminder.daysLeft <= 1 ? '🚨 URGENT' : reminder.daysLeft <= 3 ? '⚠️ DUE SOON' : '📅 REMINDER';
  const amountText = reminder.amount && reminder.amount > 0
    ? `
Estimated amount: ₦${reminder.amount.toLocaleString('en-NG')}`
    : '';

  const message = `${urgency} — TaxPulse NG

Hi, this is a tax filing reminder for ${reminder.companyName}.

📋 *${reminder.taxType}* for ${reminder.period}
📆 Due: ${new Date(reminder.dueDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}
⏰ Days left: ${reminder.daysLeft}${amountText}

Log in to TaxPulse NG to file and mark as done:
🔗 taxpulse-ng.vercel.app/app

Reply STOP to unsubscribe.`;

  try {
    const response = await fetch('https://api.ng.termii.com/api/sms/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to:        phone,
        from:      'TaxPulse',
        sms:       message,
        type:      'plain',
        channel:   'whatsapp',  // Use WhatsApp channel
        api_key:   TERMII_API_KEY,
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      console.error('Termii WhatsApp error:', result);
      return false;
    }
    return true;
  } catch (e) {
    console.error('WhatsApp send failed:', e);
    return false;
  }
}

export async function sendSMSReminder(reminder: WhatsAppReminder): Promise<boolean> {
  // Fallback to SMS if WhatsApp fails
  if (!TERMII_API_KEY) return false;

  const phone = reminder.phone.replace(/^0/, '234').replace(/[^0-9]/g, '');
  const daysText = reminder.daysLeft <= 0 ? 'OVERDUE' : `due in ${reminder.daysLeft} day(s)`;

  const message = `TaxPulse NG: ${reminder.taxType} for ${reminder.companyName} is ${daysText} (${reminder.period}). Login: taxpulse-ng.vercel.app/app`;

  try {
    const response = await fetch('https://api.ng.termii.com/api/sms/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to:      phone,
        from:    'TaxPulse',
        sms:     message,
        type:    'plain',
        channel: 'generic', // SMS fallback
        api_key: TERMII_API_KEY,
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

// Called from the dashboard — checks all overdue/due-soon obligations
// and sends WhatsApp if user has opted in
export async function sendDueReminders(
  obligations: Array<{ type: string; period: string; dueDate: string; estimatedAmount?: number; status: string }>,
  companyName: string,
  phone: string,
  whatsappOptin: boolean
): Promise<number> {
  if (!phone || !whatsappOptin) return 0;

  const now = new Date();
  const toAlert = obligations.filter(o => {
    if (o.status === 'Filed') return false;
    const due = new Date(o.dueDate);
    const daysLeft = Math.ceil((due.getTime() - now.getTime()) / 86400000);
    return daysLeft <= 7; // Alert for obligations due within 7 days or overdue
  });

  let sent = 0;
  for (const ob of toAlert) {
    const due = new Date(ob.dueDate);
    const daysLeft = Math.ceil((due.getTime() - now.getTime()) / 86400000);
    const success = await sendWhatsAppReminder({
      phone,
      taxType: ob.type,
      period: ob.period,
      dueDate: ob.dueDate,
      daysLeft,
      companyName,
      amount: ob.estimatedAmount,
    });
    if (success) sent++;
    // Small delay between messages to avoid rate limiting
    await new Promise(r => setTimeout(r, 500));
  }
  return sent;
}
