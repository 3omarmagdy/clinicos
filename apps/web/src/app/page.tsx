'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <main className="flex items-center justify-center min-h-screen px-4">
        <div className="max-w-2xl w-full text-center">
          <div className="mb-8">
            <h1 className="text-5xl font-bold text-slate-900 mb-4">ClinicOS</h1>
            <p className="text-xl text-slate-600 mb-2">Universal Clinic Operating System</p>
            <p className="text-sm text-slate-500">Phase 01 - Foundation</p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">Welcome to ClinicOS</h2>
            <p className="text-slate-600 mb-6">
              ClinicOS is a modern, healthcare-focused clinic operating system designed for efficiency, security, and scalability.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="p-4 bg-blue-50 rounded">
                <h3 className="font-semibold text-blue-900">🏥 Multi-Tenant</h3>
                <p className="text-sm text-blue-700 mt-2">Strict data isolation for multiple organizations</p>
              </div>
              <div className="p-4 bg-green-50 rounded">
                <h3 className="font-semibold text-green-900">🎯 Specialty-Agnostic</h3>
                <p className="text-sm text-green-700 mt-2">Works with any medical specialty</p>
              </div>
              <div className="p-4 bg-purple-50 rounded">
                <h3 className="font-semibold text-purple-900">📍 Multi-Location</h3>
                <p className="text-sm text-purple-700 mt-2">Support for multiple clinic locations</p>
              </div>
            </div>

            <div className="flex gap-4 justify-center">
              <Link
                href="/login"
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
              >
                Login
              </Link>
              <Link
                href="http://localhost:3001/api/v1/health"
                target="_blank"
                className="px-6 py-3 bg-slate-200 text-slate-900 rounded-lg font-medium hover:bg-slate-300 transition"
              >
                API Health
              </Link>
            </div>
          </div>

          <div className="text-sm text-slate-500">
            <p>Phase 01: Foundation Architecture</p>
            <p className="mt-2">Next: Phase 02 - Authentication & Access Control</p>
          </div>
        </div>
      </main>
    </div>
  );
}
