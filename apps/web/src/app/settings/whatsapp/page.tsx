'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { authenticatedFetch, getAccessToken, hasSessionPermission } from '@/lib/auth-session';
import { getApiErrorMessage } from '@/lib/api-error';

type Summary = { configured: boolean; phoneNumberId?: string; wabaId?: string; appointmentTemplate?: string; marketingTemplate?: string | null; templateLanguage?: string; apiVersion?: string; enabled?: boolean };
type EmbeddedConfig = { configured: boolean; appId?: string; configurationId?: string; apiVersion: string };
type FormState = { phoneNumberId: string; wabaId: string; accessToken: string; apiVersion: string; appointmentTemplate: string; marketingTemplate: string; templateLanguage: string; enabled: boolean };
type SignupDetails = { phoneNumberId: string; wabaId: string };
type MetaTemplate = { name: string; language: string; category: string | null; parameterCount: number };

declare global {
  interface Window {
    FB?: { init(options: { appId: string; cookie: boolean; xfbml: boolean; version: string }): void; login(callback: (response: { authResponse?: { code?: string } }) => void, options: Record<string, unknown>): void };
  }
}

const blank: FormState = { phoneNumberId: '', wabaId: '', accessToken: '', apiVersion: 'v26.0', appointmentTemplate: 'clinic_appointment_reminder', marketingTemplate: 'clinic_offer_v1', templateLanguage: 'ar', enabled: false };
const metaOrigins = new Set(['https://www.facebook.com', 'https://web.facebook.com']);

export default function WhatsAppSettingsPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [embedded, setEmbedded] = useState<EmbeddedConfig | null>(null);
  const [form, setForm] = useState<FormState>(blank);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [templates, setTemplates] = useState<MetaTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const codeRef = useRef<string | null>(null);
  const detailsRef = useRef<SignupDetails | null>(null);
  const allowed = hasSessionPermission('organization:update');

  const refresh = useCallback(async () => {
    const response = await authenticatedFetch('/api/v1/whatsapp/integration');
    if (response.ok) {
      const nextSummary = await response.json() as Summary;
      setSummary(nextSummary);
      if (nextSummary.configured) setForm((current) => ({ ...current, phoneNumberId: nextSummary.phoneNumberId || current.phoneNumberId, wabaId: nextSummary.wabaId || current.wabaId, appointmentTemplate: nextSummary.appointmentTemplate || current.appointmentTemplate, marketingTemplate: nextSummary.marketingTemplate || current.marketingTemplate, templateLanguage: nextSummary.templateLanguage || current.templateLanguage, apiVersion: nextSummary.apiVersion || current.apiVersion, enabled: nextSummary.enabled === true }));
    }
  }, []);

  useEffect(() => {
    if (!getAccessToken()) { window.location.replace('/login'); return; }
    void refresh();
    void authenticatedFetch('/api/v1/whatsapp/embedded-signup/config').then(async (response) => {
      if (response.ok) setEmbedded(await response.json() as EmbeddedConfig);
    }).catch(() => undefined);
  }, [refresh]);

  const finishSignup = useCallback(async () => {
    const code = codeRef.current;
    const details = detailsRef.current;
    if (!code || !details || !embedded) return;
    setSaving(true); setError('');
    try {
      const response = await authenticatedFetch('/api/v1/whatsapp/embedded-signup/complete', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, ...details, apiVersion: embedded.apiVersion, appointmentTemplate: form.appointmentTemplate, marketingTemplate: form.marketingTemplate || undefined, templateLanguage: form.templateLanguage, enabled: false }),
      });
      if (!response.ok) throw new Error(await getApiErrorMessage(response, 'تعذر حفظ ربط Meta.'));
      setNotice('تم ربط رقم WhatsApp Business الخاص بالعيادة. الإرسال ما زال متوقفًا حتى تفعّله بعد الاختبار.');
      codeRef.current = null; detailsRef.current = null;
      await refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'تعذر إكمال الربط.'); }
    finally { setSaving(false); setConnecting(false); }
  }, [embedded, form.appointmentTemplate, form.marketingTemplate, form.templateLanguage, refresh]);

  useEffect(() => {
    const receive = (event: MessageEvent<unknown>) => {
      if (!metaOrigins.has(event.origin)) return;
      let value: unknown = event.data;
      if (typeof value === 'string') { try { value = JSON.parse(value); } catch { return; } }
      if (!value || typeof value !== 'object') return;
      const data = value as { type?: string; event?: string; data?: { phone_number_id?: string; waba_id?: string } };
      if (data.type !== 'WA_EMBEDDED_SIGNUP' || data.event !== 'FINISH' || !data.data?.phone_number_id || !data.data.waba_id) return;
      detailsRef.current = { phoneNumberId: data.data.phone_number_id, wabaId: data.data.waba_id };
      void finishSignup();
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [finishSignup]);

  const connect = () => {
    if (!embedded?.configured || !embedded.appId || !embedded.configurationId) { setError('الربط الذاتي لم يُضبط في Meta بعد. استخدم الربط اليدوي المؤقت أو أكمل إعداد المنصة.'); return; }
    setError(''); setNotice(''); setConnecting(true); codeRef.current = null; detailsRef.current = null;
    const launch = () => window.FB?.login((response) => {
      const code = response.authResponse?.code;
      if (!code) { setConnecting(false); setError('لم يكتمل تفويض Meta. لم يتم حفظ أي بيانات.'); return; }
      codeRef.current = code;
      void finishSignup();
    }, { config_id: embedded.configurationId, response_type: 'code', override_default_response_type: true, extras: { setup: {} } });
    if (window.FB) { window.FB.init({ appId: embedded.appId, cookie: true, xfbml: false, version: embedded.apiVersion }); launch(); return; }
    const script = document.createElement('script');
    script.async = true; script.defer = true; script.crossOrigin = 'anonymous'; script.src = 'https://connect.facebook.net/en_US/sdk.js';
    script.onload = () => { if (!window.FB) { setConnecting(false); setError('تعذر تحميل نافذة Meta. أعد المحاولة.'); return; } window.FB.init({ appId: embedded.appId!, cookie: true, xfbml: false, version: embedded.apiVersion }); launch(); };
    script.onerror = () => { setConnecting(false); setError('تعذر تحميل Meta. تحقق من الاتصال أو مانع الإعلانات.'); };
    document.body.appendChild(script);
  };

  const loadTemplates = async () => {
    setLoadingTemplates(true); setError(''); setNotice('');
    try {
      const response = await authenticatedFetch('/api/v1/whatsapp/integration/templates');
      if (!response.ok) throw new Error(await getApiErrorMessage(response, 'تعذر قراءة القوالب المعتمدة من Meta.'));
      const values = await response.json() as MetaTemplate[];
      setTemplates(values);
      if (!values.length) setNotice('لم يُرجع Meta أي قالب معتمد لهذا الرقم. راجع القوالب داخل WhatsApp Manager.');
      else if (!values.some((template) => template.parameterCount === 4)) setNotice('القوالب الحالية لا تحتوي قالب تذكير بأربعة متغيرات. أنشئ أو عدّل قالب الموعد في Meta ليحتوي: اسم المريض، التاريخ والوقت، الطبيب، اسم العيادة.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'تعذر قراءة القوالب المعتمدة من Meta.'); }
    finally { setLoadingTemplates(false); }
  };

  const selectAppointmentTemplate = (value: string) => {
    const selected = templates.find((template) => `${template.name}::${template.language}` === value);
    if (selected) setForm((current) => ({ ...current, appointmentTemplate: selected.name, templateLanguage: selected.language }));
  };

  async function saveManual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(''); setNotice('');
    try {
      const response = await authenticatedFetch('/api/v1/whatsapp/integration', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!response.ok) throw new Error(await getApiErrorMessage(response, 'تعذر حفظ إعدادات WhatsApp.'));
      setForm((value) => ({ ...value, accessToken: '' })); setNotice('تم حفظ إعدادات العيادة مشفّرة. اختبار الإرسال هو التحقق الفعلي من صلاحيات Meta، ولا تُرسل أي رسالة تلقائيًا.'); await refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'تعذر حفظ الإعدادات.'); } finally { setSaving(false); }
  }

  if (!allowed) return <main dir="rtl" className="min-h-screen bg-[#f5f9fd] p-8"><p className="mx-auto max-w-2xl rounded-2xl bg-amber-50 p-5 text-amber-800">هذه الصفحة مخصصة لمالك العيادة أو المشرف.</p></main>;
  const update = (key: keyof FormState, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));
  return <main dir="rtl" className="min-h-screen bg-[#f5f9fd] px-4 py-8 text-slate-900"><section className="mx-auto max-w-3xl"><Link href="/settings" className="text-sm font-bold text-[#176b9d] hover:underline">← العودة إلى الإعدادات</Link><header className="mt-5 rounded-3xl bg-[#12395e] p-7 text-white"><p className="text-xs font-extrabold tracking-[.16em] text-[#7ee5de]">WHATSAPP BUSINESS</p><h1 className="mt-2 text-3xl font-black">ربط WhatsApp الخاص بالعيادة</h1><p className="mt-3 leading-7 text-blue-100">كل عيادة تستخدم رقم WhatsApp Business الخاص بها. لا يظهر الـAccess Token لأي موظف.</p></header>{error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}{notice && <p role="status" className="mt-5 rounded-xl bg-emerald-50 p-4 text-emerald-800">{notice}</p>}<section className="mt-6 rounded-2xl border border-[#cde9e5] bg-[#f0fbf9] p-5"><p className="font-black text-[#153c63]">حالة الربط</p><p className="mt-2 text-sm text-slate-700">{summary?.configured ? <>رقم العيادة: <span dir="ltr" className="font-mono">{summary.phoneNumberId}</span> · الإرسال: {summary.enabled ? 'مفعّل' : 'متوقف'}</> : 'لم يتم ربط رقم لهذه العيادة بعد.'}</p><p className="mt-2 text-xs text-slate-600">لا تفعّل الإرسال العام إلا بعد اختبار رسالة واحدة على رقمك.</p>{summary?.configured && <Link href="/whatsapp-test" className="mt-4 inline-block rounded-xl border border-[#176b9d] px-4 py-2 text-sm font-bold text-[#176b9d] hover:bg-white">اختبار رسالة واحدة</Link>}</section><section className="mt-6 rounded-2xl border border-[#b9d9ee] bg-white p-6 shadow-sm"><p className="text-xs font-extrabold tracking-[.14em] text-[#176b9d]">RECOMMENDED</p><h2 className="mt-1 text-xl font-black text-[#153c63]">ربط تلقائي عبر Meta</h2><p className="mt-2 text-sm leading-7 text-slate-600">يسجل مالك العيادة في Meta ويختار رقم العيادة. لا يحتاج لنسخ Token أو أرقام تقنية.</p><button type="button" onClick={connect} disabled={connecting || saving || !embedded?.configured} className="mt-4 rounded-xl bg-[#176b9d] px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60">{connecting || saving ? 'جارٍ إكمال الربط…' : embedded?.configured ? 'ربط WhatsApp Business' : 'الربط الذاتي قيد الإعداد'}</button></section><details className="mt-6 rounded-2xl border border-[#dce7f1] bg-white p-6"><summary className="cursor-pointer font-black text-[#153c63]">ربط يدوي مؤقت للمسؤول التقني</summary><form onSubmit={saveManual} className="mt-5 grid gap-4"><Field label="Phone Number ID" value={form.phoneNumberId} onChange={(v) => update('phoneNumberId', v)} /><Field label="WABA ID" value={form.wabaId} onChange={(v) => update('wabaId', v)} /><Field label="Access Token" secret value={form.accessToken} onChange={(v) => update('accessToken', v)} /><div className="grid gap-4 sm:grid-cols-2"><Field label="Appointment template" value={form.appointmentTemplate} onChange={(v) => update('appointmentTemplate', v)} /><Field label="Marketing template" value={form.marketingTemplate} onChange={(v) => update('marketingTemplate', v)} /><Field label="API version" value={form.apiVersion} onChange={(v) => update('apiVersion', v)} /><Field label="لغة القالب" value={form.templateLanguage} onChange={(v) => update('templateLanguage', v)} /></div><button type="button" onClick={() => void loadTemplates()} disabled={loadingTemplates || !summary?.configured} className="w-fit rounded-xl border border-[#176b9d] px-4 py-2 font-bold text-[#176b9d] disabled:opacity-60">{loadingTemplates ? 'جارٍ قراءة القوالب…' : 'قراءة القوالب المعتمدة من Meta'}</button>{templates.length > 0 && <label className="grid gap-1 text-sm font-bold">اختر قالب تذكير الموعد المعتمد<select value={`${form.appointmentTemplate}::${form.templateLanguage}`} onChange={(event) => selectAppointmentTemplate(event.target.value)} className="field font-normal"><option value="">اختر قالبًا</option>{templates.filter((template) => template.parameterCount === 4).map((template) => <option key={`${template.name}:${template.language}`} value={`${template.name}::${template.language}`}>{template.name} · {template.language} · {template.category || 'UNKNOWN'} · متغيرات الرسالة: {template.parameterCount}</option>)}</select></label>}<label className="flex items-center gap-3 text-sm font-bold"><input type="checkbox" checked={form.enabled} onChange={(e) => update('enabled', e.target.checked)} /> تفعيل التكامل بعد المراجعة</label><button disabled={saving} className="w-fit rounded-xl bg-[#176b9d] px-5 py-3 font-bold text-white disabled:opacity-60">{saving ? 'جارٍ الحفظ…' : 'حفظ الإعدادات'}</button></form></details></section></main>;
}

function Field({ label, value, onChange, secret = false }: { label: string; value: string; onChange: (value: string) => void; secret?: boolean }) { return <label className="grid gap-1 text-sm font-bold">{label}<input required={!(secret && label === 'Access Token')} type={secret ? 'password' : 'text'} autoComplete={secret ? 'new-password' : undefined} value={value} onChange={(event) => onChange(event.target.value)} className="field font-normal" /></label>; }
