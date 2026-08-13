'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface CurrentUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  organizationId: string;
}

export default function DashboardPage() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = window.localStorage.getItem('token');
    if (!token) {
      window.location.replace('/login');
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
    void fetch(`${apiUrl}/api/v1/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('Your session has expired. Please sign in again.');
        return response.json() as Promise<CurrentUser>;
      })
      .then(setUser)
      .catch((requestError: unknown) => {
        window.localStorage.removeItem('token');
        setError(requestError instanceof Error ? requestError.message : 'Unable to load your account.');
      });
  }, []);

  const signOut = () => {
    window.localStorage.removeItem('token');
    window.location.assign('/login');
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <section className="mx-auto max-w-4xl rounded-xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-sky-700">ClinicOS</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-900">Workspace dashboard</h1>
          </div>
          <button type="button" onClick={signOut} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Sign out
          </button>
        </div>

        {error ? (
          <div className="mt-8 rounded-lg bg-red-50 p-4 text-red-700">
            <p>{error}</p>
            <Link href="/login" className="mt-2 inline-block font-medium underline">Return to sign in</Link>
          </div>
        ) : !user ? (
          <p className="mt-8 text-slate-600">Loading your secure workspace…</p>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg bg-sky-50 p-5">
              <p className="text-sm text-sky-800">Signed in as</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{user.firstName} {user.lastName}</p>
              <p className="mt-1 text-sm text-slate-600">{user.email}</p>
            </div>
            <div className="rounded-lg bg-slate-100 p-5">
              <p className="text-sm text-slate-600">Access role</p>
              <p className="mt-1 text-xl font-semibold capitalize text-slate-900">{user.role}</p>
              <p className="mt-1 text-xs text-slate-500">Organization-scoped session</p>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
