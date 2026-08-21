'use client';

import { useState, FormEvent } from 'react';
import { setAccessToken } from '@/lib/auth-session';
import { BrandMark } from '@/components/brand-mark';

export default function LoginPage() {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organizationSlug, setOrganizationSlug] = useState('dev-clinic');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, organizationSlug }),
      });

      if (!response.ok) throw new Error('Invalid email, password, or clinic code');

      const data = await response.json();
      setAccessToken(data.accessToken);
      window.location.href = '/dashboard';
    } catch (err: unknown) {
      const error = err instanceof Error ? err.message : 'Login failed';
      setError(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-slate-950 px-4 py-10 sm:py-16"><div className="mx-auto max-w-md"><BrandMark light /><div className="mt-10 rounded-2xl bg-white p-7 shadow-2xl sm:p-9"><h1 className="text-3xl font-bold text-slate-950">دخول آمن لمساحة عيادتك</h1><p className="mt-2 text-slate-600">بيانات كل مركز تبقى منفصلة عن أي مركز آخر.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="bg-red-50 text-red-700 p-3 rounded text-sm">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">رمز العيادة</label>
            <input
              type="text"
              value={organizationSlug}
              onChange={(e) => setOrganizationSlug(e.target.value)}
              placeholder="dev-clinic"
              autoComplete="organization"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">البريد الإلكتروني</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="owner@dev.local"
              autoComplete="email"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">كلمة المرور</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="dev_password_123"
              autoComplete="current-password"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-teal-600 text-white rounded-lg font-bold hover:bg-teal-700 disabled:bg-slate-400 transition"
          >
            {loading ? 'جارٍ الدخول…' : 'دخول النظام'}
          </button>
        </form>

        {isDevelopment && <div className="mt-6 p-4 bg-slate-50 rounded-lg text-sm text-slate-600">
          <p className="font-semibold mb-2 text-slate-800">بيانات بيئة التطوير:</p>
          <p>Owner: owner@dev.local</p>
          <p>Doctor: doctor@dev.local</p>
          <p>Receptionist: receptionist@dev.local</p>
          <p className="mt-2">Password: dev_password_123</p>
        </div>}
      </div></div></div>
  );
}
