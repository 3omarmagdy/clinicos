'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { authenticatedFetch, getAccessToken, hasSessionPermission } from '@/lib/auth-session';
import { getApiErrorMessage } from '@/lib/api-error';

type Summary = { configured: boolean; phoneNumberId?: string; wabaId?: string; appointmentTemplate?: string; marketingTemplate?: string | null; templateLanguage?: string; apiVersion?: string; enabled?: boolean };

type FormState = { phoneNumberId: string; wabaId: string; accessToken: string; apiVersion: string; appointmentTemplate: string; marketingTemplate: string; templateLanguage: string; enabled: boolean };

const blank: FormState = { phoneNumberId: '', wabaId: '', accessToken: '', apiVersion: 'v26.0', appointmentTemplate: 'clinic_appointment_reminder', marketingTemplate: 'clinic_offer_v1', templateLanguage: 'ar', enabled: false };

export default function WhatsAppSettingsPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [form, setForm] = useState<FormState>(blank);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const allowed = hasSessionPermission('organization:update');

  useEffect(() => {
    if (!getAccessToken()) { window.location.replace('/login'); return; }
    void authenticatedFetch('/api/v1/whatsapp/integration').then(async (response) => {
      if (response.ok) setSummary(await response.json() as Summary);
    }).catch(() => undefined);
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setNotice(''); setSaving(true);
    try {
      const response = await authenticatedFetch('/api/v1/whatsapp/integration', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!response.ok) throw new Error(await getApiErrorMessage(response, 'تعذر حفظ إعدادات WhatsApp.'));
      setNotice('تم حفظ إعدادات العيادة مشفّرة. الإرسال ما زال متوقفًا حتى تعتمد Meta القوالب وتتم المراجعة.');
      setForm((current) => ({ ...current, accessToken: '' }));
      const refreshed = await authenticatedFetch('/api/v1/whatsapp/integration');
      if (refreshed.ok) setSummary(await refreshed.json() as Summary);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'تعذر حفظ الإعدادات.'); } finally { setSaving(false); }
  }

  if (!allowed) return <main dir="rtl" className="min-h-screen bg-[#f5f9fd] p-8"><p className="mx-auto max-w-2xl rounded-2xl bg-amber-50 p-5 text-amber-800">هذه الصفحة مخصصة لمالك العيادة أو المشرف.</p></main>;

  return <main dir="rtl" className="min-h-screen bg-[#f5f9fd] px-4 py-8 text-slate-900"><section className="mx-auto max-w-3xl"><Link href="/settings" className="text-sm font-bold text-[#176b9d] hover:underline">← العودة إلى الإعدادات</Link><header className="mt-5 rounded-3xl bg-[#12395e] p-7 text-white"><p className="text-xs font-extrabold tracking-[.16em] text-[#7ee5de]">WHATSAPP BUSINESS</p><h1 className="mt-2 text-3xl font-black">ربط WhatsApp الخاص بالعيادة</h1><p className="mt-3 leading-7 text-blue-100">كل عيادة تربط رقم WhatsApp Business الخاص بها. تحفظ Clinicos الأسرار مشفّرة ولا تعرضها بعد الحفظ.</p></header>{error ? <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-red-700">{error}</p> : null}{notice ? <p role="status" className="mt-5 rounded-xl bg-emerald-50 p-4 text-emerald-800">{notice}</p> : null}<section className="mt-6 rounded-2xl border border-[#cde9e5] bg-[#f0fbf9] p-5"><p className="font-black text-[#153c63]">حالة الربط الحالية</p>{summary?.configured ? <p className="mt-2 text-sm leading-7 text-slate-700">Phone Number ID: <span dir="ltr" className="font-mono">{summary.phoneNumberId}</span> · WABA ID: <span dir="ltr" className="font-mono">{summary.wabaId}</span> · القوالب: {summary.appointmentTemplate || 'غير محدد'} و{summary.marketingTemplate || 'غير محدد'} · الإرسال الخاص بالعيادة: {summary.enabled ? 'مفعّل' : 'متوقف'}</p> : <p className="mt-2 text-sm text-slate-700">لم يتم تسجيل تكامل لهذه العيادة بعد.</p>}<p className="mt-2 text-xs text-slate-600">يظل الإرسال العام مغلقًا حتى ضبط WHATSAPP_SEND_ENABLED=true بعد اعتماد القوالب.</p></section><form onSubmit={save} className="mt-6 grid gap-4 rounded-2xl border border-[#dce7f1] bg-white p-6 shadow-sm"><h2 className="text-xl font-black text-[#153c63]">بيانات الربط</h2><p className="text-sm leading-6 text-slate-600">أدخل بيانات عيادتك من Meta مباشرة. لا تظهر App Secret أو Verify Token هنا لأنهما أسرار مركزية محفوظة في Vercel.</p><Field label="Phone Number ID" value={form.phoneNumberId} onChange={(value) => setForm({ ...form, phoneNumberId: value })} required /><Field label="WABA ID" value={form.wabaId} onChange={(value) => setForm({ ...form, wabaId: value })} required /><SecretField label="Access Token الخاص بالعيادة" value={form.accessToken} onChange={(value) => setForm({ ...form, accessToken: value })} required /><div className="grid gap-4 sm:grid-cols-2"><Field label="Appointment template" value={form.appointmentTemplate} onChange={(value) => setForm({ ...form, appointmentTemplate: value })} required /><Field label="Marketing template" value={form.marketingTemplate} onChange={(value) => setForm({ ...form, marketingTemplate: value })} /><Field label="API version" value={form.apiVersion} onChange={(value) => setForm({ ...form, apiVersion: value })} required /><Field label="لغة القالب" value={form.templateLanguage} onChange={(value) => setForm({ ...form, templateLanguage: value })} required /></div><label className="flex items-center gap-3 text-sm font-bold"><input type="checkbox" checked={form.enabled} onChange={(event) => setForm({ ...form, enabled: event.target.checked })} /> تفعيل تكامل هذه العيادة بعد مراجعة الإعدادات</label><button disabled={saving} className="w-fit rounded-xl bg-[#176b9d] px-5 py-3 font-bold text-white disabled:opacity-60">{saving ? 'جارٍ الحفظ…' : 'حفظ إعدادات العيادة'}</button></form></section></main>;
}

function Field({ label, value, onChange, required }: { label: string; value: string; onChange: (value: string) => void; required?: boolean }) { return <label className="grid gap-1 text-sm font-bold">{label}<input required={required} value={value} onChange={(event) => onChange(event.target.value)} className="field font-normal" /></label>; }
function SecretField({ label, value, onChange, required }: { label: string; value: string; onChange: (value: string) => void; required?: boolean }) { return <label className="grid gap-1 text-sm font-bold">{label}<input required={required} type="password" autoComplete="new-password" value={value} onChange={(event) => onChange(event.target.value)} className="field font-normal" /></label>; }
