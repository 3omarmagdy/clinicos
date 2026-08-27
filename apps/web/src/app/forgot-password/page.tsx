'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { BrandMark } from '@/components/brand-mark';

export default function ForgotPasswordPage() {
  const [organizationSlug, setOrganizationSlug] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');
    try {
      const response = await fetch('/api/v1/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationSlug: organizationSlug.trim(), email: email.trim() }),
      });
      const data = await response.json() as { message?: string };
      if (!response.ok) throw new Error(data.message || 'تعذر إرسال طلب الاستعادة.');
      setMessage(data.message || 'إذا كانت البيانات صحيحة، ستصلك رسالة استعادة على بريدك الإلكتروني.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'تعذر إرسال طلب الاستعادة.');
    } finally {
      setLoading(false);
    }
  };

  return <main dir="rtl" className="min-h-screen bg-[#f5f9fd] px-4 py-10"><section className="mx-auto max-w-md"><BrandMark /><div className="mt-8 rounded-2xl bg-white p-7 text-slate-900 shadow-sm ring-1 ring-[#dce8f3]"><p className="text-sm font-semibold text-[#087d78]">استعادة الوصول</p><h1 className="mt-1 text-3xl font-bold">هل نسيت كلمة المرور؟</h1><p className="mt-3 leading-7 text-slate-600">اكتب رمز العيادة والبريد المسجل، وسنرسل لك رابطًا مؤقتًا لإنشاء كلمة مرور جديدة.</p>{message && <p role="status" className="mt-5 rounded-xl bg-emerald-50 p-3 text-sm leading-6 text-emerald-800">{message}</p>}{error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-sm leading-6 text-red-700">{error}</p>}<form onSubmit={submit} className="mt-6 space-y-4"><label className="grid gap-2 text-sm font-extrabold text-[#29435f]">رمز العيادة<input required value={organizationSlug} onChange={(event) => setOrganizationSlug(event.target.value)} placeholder="مثال: my-clinic" autoComplete="organization" className="field" /></label><label className="grid gap-2 text-sm font-extrabold text-[#29435f]">البريد الإلكتروني<input required type="email" dir="ltr" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@clinic.com" autoComplete="email" className="field" /></label><button type="submit" disabled={loading} className="w-full rounded-xl bg-[#1768a8] px-4 py-3 font-bold text-white hover:bg-[#11598f] disabled:opacity-60">{loading ? 'جارٍ إرسال الرابط…' : 'إرسال رابط الاستعادة'}</button></form><div className="mt-6 rounded-xl bg-[#f7fafc] p-4 text-sm leading-6 text-slate-600">إذا لم يعد لديك وصول إلى البريد، تواصل مع مالك العيادة للتحقق من هويتك وتعيين كلمة مرور مؤقتة.</div><Link href="/login" className="mt-6 inline-block font-semibold text-[#1768a8] hover:underline">العودة لتسجيل الدخول</Link></div></section></main>;
}
