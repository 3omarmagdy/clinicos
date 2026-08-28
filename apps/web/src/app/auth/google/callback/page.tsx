'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { setAccessToken } from '@/lib/auth-session';

export default function GoogleCallbackPage() {
  const [message, setMessage] = useState('جارٍ تأكيد الدخول الآمن عبر Google…');

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code');
    if (!code) {
      setMessage('رابط الدخول غير صالح أو انتهت صلاحيته.');
      return;
    }

    void (async () => {
      try {
        const response = await fetch('/api/v1/auth/google/exchange', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        });
        if (!response.ok) throw new Error('Login failed');
        setAccessToken();
        window.location.replace('/dashboard');
      } catch {
        setMessage('تعذر إكمال الدخول. تأكد أن بريد Google هو نفس البريد المسجل في هذه العيادة.');
      }
    })();
  }, []);

  return <main dir="rtl" className="min-h-screen bg-slate-950 p-6 text-center text-white"><div className="mx-auto mt-32 max-w-md rounded-2xl bg-white p-8 text-slate-900 shadow-2xl"><h1 className="text-2xl font-bold">Clinico</h1><p className="mt-4 text-slate-600">{message}</p><Link className="mt-6 inline-block text-teal-700 hover:underline" href="/login">العودة لتسجيل الدخول</Link></div></main>;
}
