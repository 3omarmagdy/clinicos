'use client';

import Link from 'next/link';
import { useState } from 'react';
import { setAccessToken } from '@/lib/auth-session';
import { BrandMark } from '@/components/brand-mark';

const initial = { clinicName: '', firstName: '', lastName: '', email: '', password: '' };

export default function RegisterPage() {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (key: keyof typeof initial, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async () => {
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/v1/auth/register-clinic', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await response.json() as { accessToken?: string; message?: string };
      if (!response.ok || !data.accessToken) throw new Error(data.message || 'تعذر إنشاء مساحة العيادة.');
      setAccessToken(data.accessToken);
      window.location.assign('/dashboard?welcome=1');
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'تعذر إنشاء مساحة العيادة.'); }
    finally { setLoading(false); }
  };

  return <main dir="rtl" className="min-h-screen bg-slate-950 px-4 py-10 text-slate-900"><section className="mx-auto max-w-lg"><BrandMark light /><div className="mt-8 rounded-2xl bg-white p-7 shadow-2xl sm:p-9"><p className="text-sm font-semibold text-teal-700">ابدأ تجربة آمنة</p><h1 className="mt-1 text-3xl font-bold">أنشئ مساحة عيادتك</h1><p className="mt-2 text-slate-600">ستحصل على 14 يومًا للتجربة. بيانات عيادتك تظل منفصلة عن أي مركز آخر.</p>{error && <p role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}<div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="grid gap-1 text-sm font-medium sm:col-span-2">اسم العيادة<input required value={form.clinicName} onChange={(event) => update('clinicName', event.target.value)} className="rounded-lg border p-3 font-normal" placeholder="مثال: عيادة د. أحمد" /></label><label className="grid gap-1 text-sm font-medium">الاسم الأول<input required value={form.firstName} onChange={(event) => update('firstName', event.target.value)} className="rounded-lg border p-3 font-normal" /></label><label className="grid gap-1 text-sm font-medium">اسم العائلة<input required value={form.lastName} onChange={(event) => update('lastName', event.target.value)} className="rounded-lg border p-3 font-normal" /></label><label className="grid gap-1 text-sm font-medium sm:col-span-2">Gmail أو البريد المهني<input required type="email" dir="ltr" value={form.email} onChange={(event) => update('email', event.target.value)} className="rounded-lg border p-3 font-normal" placeholder="name@gmail.com" /></label><label className="grid gap-1 text-sm font-medium sm:col-span-2">كلمة المرور<input required type="password" minLength={10} value={form.password} onChange={(event) => update('password', event.target.value)} className="rounded-lg border p-3 font-normal" /><span className="text-xs font-normal text-slate-500">10 أحرف على الأقل وتشمل حرفًا ورقمًا.</span></label><label className="flex items-start gap-2 text-sm text-slate-600 sm:col-span-2"><input required type="checkbox" className="mt-1" />أؤكد أنني مخول لإنشاء حساب العيادة وأوافق على استخدام البيانات وفق موافقات المرضى.</label><button type="button" disabled={loading} onClick={() => void submit()} className="rounded-lg bg-teal-700 px-4 py-3 font-bold text-white hover:bg-teal-800 disabled:opacity-60 sm:col-span-2">{loading ? 'جارٍ إنشاء المساحة…' : 'إنشاء تجربة مجانية'}</button></div><div className="my-6 flex items-center gap-3 text-xs text-slate-400 before:h-px before:flex-1 before:bg-slate-200 after:h-px after:flex-1 after:bg-slate-200">أو</div><button type="button" disabled title="يُفعّل بعد ربط مفاتيح Google الرسمية" className="w-full rounded-lg border border-slate-300 px-4 py-3 font-semibold text-slate-500">المتابعة باستخدام Google — قريبًا</button><p className="mt-5 text-center text-sm text-slate-600">لديك حساب بالفعل؟ <Link href="/login" className="font-semibold text-teal-700 hover:underline">دخول النظام</Link></p></div></section></main>;
}
