'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { getApiErrorMessage } from '@/lib/api-error';
import { authenticatedFetch, getAccessToken, hasSessionPermission } from '@/lib/auth-session';

type CurrentUser = { organizationId: string };
type Organization = { id: string; name: string; slug: string; timezone: string; currency: string };

export default function SettingsPage() {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [name, setName] = useState('');
  const [timezone, setTimezone] = useState('Africa/Cairo');
  const [currency, setCurrency] = useState('EGP');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const allowed = hasSessionPermission('organization:update');

  useEffect(() => {
    if (!getAccessToken()) { window.location.replace('/login'); return; }
    void authenticatedFetch('/api/v1/users/me').then(async (userResponse) => {
      if (!userResponse.ok) throw new Error('تعذر تحميل صلاحياتك.');
      const user = await userResponse.json() as CurrentUser;
      const organizationResponse = await authenticatedFetch(`/api/v1/organizations/${user.organizationId}`);
      if (!organizationResponse.ok) throw new Error(await getApiErrorMessage(organizationResponse, 'تعذر تحميل إعدادات العيادة.'));
      const data = await organizationResponse.json() as Organization;
      setOrganization(data); setName(data.name); setTimezone(data.timezone); setCurrency(data.currency);
    }).catch((requestError: unknown) => setError(requestError instanceof Error ? requestError.message : 'تعذر تحميل إعدادات العيادة.'));
  }, []);

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!organization) return;
    setSaving(true); setError(''); setNotice('');
    try {
      const response = await authenticatedFetch(`/api/v1/organizations/${organization.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, timezone, currency }) });
      if (!response.ok) throw new Error(await getApiErrorMessage(response, 'تعذر حفظ الإعدادات.'));
      const updated = await response.json() as Organization;
      setOrganization(updated); setName(updated.name); setTimezone(updated.timezone); setCurrency(updated.currency); setNotice('تم حفظ إعدادات العيادة بنجاح.');
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'تعذر حفظ الإعدادات.'); }
    finally { setSaving(false); }
  };

  return <main dir="rtl" className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900"><section className="mx-auto max-w-2xl rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8"><Link href="/dashboard" className="text-sm font-medium text-sky-700 hover:underline">العودة إلى لوحة التحكم ←</Link><h1 className="mt-4 text-3xl font-bold">إعدادات العيادة</h1><p className="mt-2 text-slate-600">هذه البيانات تخص عيادتك فقط ولا تظهر لحسابات المراكز الأخرى.</p>{error && <p role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}{notice && <p className="mt-5 rounded-lg bg-emerald-50 p-3 text-emerald-800">{notice}</p>}{!organization ? <p className="mt-7 text-slate-600">جارٍ تحميل الإعدادات…</p> : !allowed ? <p className="mt-7 rounded-lg bg-amber-50 p-4 text-amber-900">ليس لديك صلاحية تعديل إعدادات العيادة.</p> : <form onSubmit={save} className="mt-7 grid gap-5"><label className="grid gap-1 text-sm font-semibold">اسم العيادة<input required minLength={2} maxLength={120} value={name} onChange={(event) => setName(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 font-normal" /></label><label className="grid gap-1 text-sm font-semibold">المنطقة الزمنية<select value={timezone} onChange={(event) => setTimezone(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 font-normal"><option value="Africa/Cairo">القاهرة (Africa/Cairo)</option><option value="UTC">UTC</option></select></label><label className="grid gap-1 text-sm font-semibold">العملة<select value={currency} onChange={(event) => setCurrency(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 font-normal"><option value="EGP">جنيه مصري (EGP)</option><option value="USD">دولار أمريكي (USD)</option><option value="SAR">ريال سعودي (SAR)</option></select></label><div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600"><p className="font-semibold text-slate-800">رمز العيادة</p><p className="mt-1" dir="ltr">{organization.slug}</p><p className="mt-2 text-xs">يُستخدم عند تسجيل الدخول ولا يمكن تغييره من هذه الشاشة.</p></div><button disabled={saving} className="rounded-lg bg-teal-700 px-4 py-2 font-bold text-white hover:bg-teal-800 disabled:opacity-60">{saving ? 'جارٍ الحفظ…' : 'حفظ الإعدادات'}</button></form>}</section></main>;
}
