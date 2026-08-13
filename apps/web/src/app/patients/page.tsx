'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useState } from 'react';

interface Patient { id: string; medicalRecordNumber: string; firstName: string; lastName: string; phone?: string | null; status: string; }

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
  const token = typeof window === 'undefined' ? null : window.localStorage.getItem('token');
  const load = useCallback(async () => {
    if (!token) { window.location.replace('/login'); return; }
    setLoading(true); setError('');
    try { const response = await fetch(`${apiUrl}/api/v1/patients`, { headers: { Authorization: `Bearer ${token}` } }); if (!response.ok) throw new Error('Unable to load patients.'); setPatients(await response.json() as Patient[]); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to load patients.'); }
    finally { setLoading(false); }
  }, [apiUrl, token]);
  useEffect(() => { void load(); }, [load]);
  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = new FormData(event.currentTarget); setSaving(true); setError('');
    try { const response = await fetch(`${apiUrl}/api/v1/patients`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ firstName: form.get('firstName'), lastName: form.get('lastName'), medicalRecordNumber: form.get('medicalRecordNumber'), phone: form.get('phone') || undefined }) }); if (!response.ok) throw new Error('Unable to create patient.'); event.currentTarget.reset(); await load(); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to create patient.'); }
    finally { setSaving(false); }
  };
  return <main className="min-h-screen bg-slate-50 px-4 py-10"><section className="mx-auto max-w-4xl rounded-xl bg-white p-8 shadow-sm ring-1 ring-slate-200"><Link href="/dashboard" className="text-sm font-medium text-sky-700 hover:underline">← Dashboard</Link><h1 className="mt-3 text-3xl font-bold text-slate-900">Patients</h1><p className="mt-1 text-slate-600">Organization-scoped patient registry.</p>{error && <p className="mt-5 rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}<form onSubmit={create} className="mt-6 grid gap-3 rounded-lg bg-slate-50 p-4 sm:grid-cols-2"><input required name="firstName" placeholder="First name" className="rounded border p-2" /><input required name="lastName" placeholder="Last name" className="rounded border p-2" /><input required name="medicalRecordNumber" placeholder="Medical record number" className="rounded border p-2" /><input name="phone" placeholder="Phone (optional)" className="rounded border p-2" /><button disabled={saving} className="rounded bg-sky-700 px-4 py-2 font-medium text-white disabled:opacity-60">{saving ? 'Saving…' : 'Add patient'}</button></form><div className="mt-6 overflow-hidden rounded-lg border border-slate-200">{loading ? <p className="p-4 text-slate-600">Loading patients…</p> : patients.length === 0 ? <p className="p-4 text-slate-600">No patients yet. Add the first patient above.</p> : <ul>{patients.map((patient) => <li key={patient.id} className="flex justify-between border-b p-4 last:border-0"><span className="font-medium text-slate-900">{patient.firstName} {patient.lastName}</span><span className="text-sm text-slate-600">{patient.medicalRecordNumber}{patient.phone ? ` · ${patient.phone}` : ''}</span></li>)}</ul>}</div></section></main>;
}
