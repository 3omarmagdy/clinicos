'use client';

import Link from 'next/link';
import { FormEvent, Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { BrandMark } from '@/components/brand-mark';

export default function ResetPasswordPage() {
  return <Suspense fallback={<main dir="rtl" className="grid min-h-screen place-items-center bg-[#f5f9fd] p-10 text-slate-600">جارٍ تحميل صفحة الاستعادة…</main>}><ResetPasswordForm /></Suspense>;
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    setError('');
    if (!token) { setError('رابط الاستعادة غير صالح أو ناقص.'); return; }
    if (password !== confirmation) { setError('كلمتا المرور غير متطابقتين.'); return; }
    setLoading(true);
    try {
      const response = await fetch('/api/v1/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await response.json() as { message?: string };
      if (!response.ok) throw new Error(data.message || 'تعذر تغيير كلمة المرور.');
      setMessage(data.message || 'تم تغيير كلمة المرور. يمكنك تسجيل الدخول الآن.');
      setPassword('');
      setConfirmation('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'تعذر تغيير كلمة المرور.');
    } finally {
      setLoading(false);
    }
  };

  return <main dir="rtl" className="min-h-screen bg-[#f5f9fd] px-4 py-10"><section className="mx-auto max-w-md"><BrandMark /><div className="mt-8 rounded-2xl bg-white p-7 text-slate-900 shadow-sm ring-1 ring-[#dce8f3]"><p className="text-sm font-semibold text-[#087d78]">تأمين الحساب</p><h1 className="mt-1 text-3xl font-bold">أنشئ كلمة مرور جديدة</h1><p className="mt-3 leading-7 text-slate-600">استخدم كلمة مرور لا تقل عن 6 أحرف وتحتوي على حرف ورقم. لا تشاركها مع أي شخص.</p>{message && <p role="status" className="mt-5 rounded-xl bg-emerald-50 p-3 text-sm leading-6 text-emerald-800">{message}</p>}{error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-sm leading-6 text-red-700">{error}</p>}<form onSubmit={submit} className="mt-6 space-y-4"><label className="grid gap-2 text-sm font-extrabold text-[#29435f]">كلمة المرور الجديدة<input required minLength={6} maxLength={128} type="password" dir="ltr" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" className="field" /></label><label className="grid gap-2 text-sm font-extrabold text-[#29435f]">تأكيد كلمة المرور<input required minLength={6} maxLength={128} type="password" dir="ltr" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" className="field" /></label><button type="submit" disabled={loading || Boolean(message)} className="w-full rounded-xl bg-[#1768a8] px-4 py-3 font-bold text-white hover:bg-[#11598f] disabled:opacity-60">{loading ? 'جارٍ حفظ كلمة المرور…' : 'حفظ كلمة المرور الجديدة'}</button></form><Link href="/login" className="mt-6 inline-block font-semibold text-[#1768a8] hover:underline">العودة لتسجيل الدخول</Link></div></section></main>;
}
