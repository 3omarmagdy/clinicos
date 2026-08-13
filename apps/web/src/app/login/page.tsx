'use client';

import { useState, FormEvent } from 'react';

export default function LoginPage() {
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
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, organizationSlug }),
      });

      if (!response.ok) throw new Error('Invalid email, password, or clinic code');

      const data = await response.json();
      localStorage.setItem('token', data.accessToken);
      window.location.href = '/dashboard';
    } catch (err: unknown) {
      const error = err instanceof Error ? err.message : 'Login failed';
      setError(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">ClinicOS</h1>
        <p className="text-slate-600 mb-8">Sign in to your clinic account</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="bg-red-50 text-red-700 p-3 rounded text-sm">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Clinic code</label>
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
            <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
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
            <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
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
            className="w-full py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-slate-400 transition"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 p-4 bg-blue-50 rounded text-sm text-blue-700">
          <p className="font-semibold mb-2">Development Credentials:</p>
          <p>Owner: owner@dev.local</p>
          <p>Doctor: doctor@dev.local</p>
          <p>Receptionist: receptionist@dev.local</p>
          <p className="mt-2">Password: dev_password_123</p>
        </div>
      </div>
    </div>
  );
}
