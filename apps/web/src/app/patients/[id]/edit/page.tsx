'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { getApiErrorMessage } from '@/lib/api-error';
import { authenticatedFetch, getAccessToken, hasSessionPermission } from '@/lib/auth-session';

interface Patient {
  id: string;
  medicalRecordNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string | null;
  admittedAt: string;
  gender?: string | null;
  maritalStatus?: string | null;
  phone?: string | null;
  whatsappPhone?: string | null;
  whatsappOptIn: boolean;
  whatsappOptInAt?: string | null;
  whatsappMarketingOptIn: boolean;
  occupation?: string | null;
  city?: string | null;
  governorate?: string | null;
  leadSource?: string | null;
  marketingConsent: boolean;
  email?: string | null;
  address?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  status: 'active' | 'inactive';
}

interface PatientForm {
  medicalRecordNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  admittedAt: string;
  gender: string;
  maritalStatus: string;
  phone: string;
  whatsappPhone: string;
  whatsappOptIn: boolean;
  whatsappMarketingOptIn: boolean;
  occupation: string;
  city: string;
  governorate: string;
  leadSource: string;
  marketingConsent: boolean;
  email: string;
  address: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  status: 'active' | 'inactive';
}

function toFormValues(patient: Patient): PatientForm {
  return {
    medicalRecordNumber: patient.medicalRecordNumber,
    firstName: patient.firstName,
    lastName: patient.lastName,
    dateOfBirth: patient.dateOfBirth?.slice(0, 10) || '',
    admittedAt: patient.admittedAt.slice(0, 10),
    gender: patient.gender || '',
    maritalStatus: patient.maritalStatus || '',
    phone: patient.phone || '',
    whatsappPhone: patient.whatsappPhone || '',
    whatsappOptIn: patient.whatsappOptIn,
    whatsappMarketingOptIn: patient.whatsappMarketingOptIn,
    occupation: patient.occupation || '',
    city: patient.city || '',
    governorate: patient.governorate || '',
    leadSource: patient.leadSource || '',
    marketingConsent: patient.marketingConsent,
    email: patient.email || '',
    address: patient.address || '',
    emergencyContactName: patient.emergencyContactName || '',
    emergencyContactPhone: patient.emergencyContactPhone || '',
    status: patient.status,
  };
}

export default function EditPatientPage({ params }: { params: { id: string } }) {
  const [formValues, setFormValues] = useState<PatientForm | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const canUpdate = hasSessionPermission('patient:update');

  const load = useCallback(async () => {
    if (!getAccessToken()) {
      window.location.replace('/login');
      return;
    }

    if (!canUpdate) {
      setError('You do not have permission to edit patients.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await authenticatedFetch(`/api/v1/patients/${params.id}`);
      if (!response.ok) throw new Error(await getApiErrorMessage(response, 'Unable to load this patient.'));
      setFormValues(toFormValues(await response.json() as Patient));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load this patient.');
    } finally {
      setLoading(false);
    }
  }, [canUpdate, params.id]);

  useEffect(() => { void load(); }, [load]);

  const updateField = (key: keyof PatientForm, value: string | boolean) => {
    setFormValues((current) => current ? { ...current, [key]: value } as PatientForm : current);
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formValues) return;

    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const response = await authenticatedFetch(`/api/v1/patients/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formValues,
          dateOfBirth: formValues.dateOfBirth || undefined,
          admittedAt: formValues.admittedAt || undefined,
          gender: formValues.gender || undefined,
          phone: formValues.phone || undefined,
          whatsappPhone: formValues.whatsappPhone || undefined,
          whatsappOptIn: formValues.whatsappOptIn,
          whatsappOptInAt: formValues.whatsappOptIn ? new Date().toISOString() : undefined,
          whatsappMarketingOptIn: formValues.whatsappMarketingOptIn,
          whatsappMarketingOptInAt: formValues.whatsappMarketingOptIn ? new Date().toISOString() : undefined,
          email: formValues.email || undefined,
          address: formValues.address || undefined,
          emergencyContactName: formValues.emergencyContactName || undefined,
          emergencyContactPhone: formValues.emergencyContactPhone || undefined,
        }),
      });
      if (!response.ok) throw new Error(await getApiErrorMessage(response, 'Unable to update this patient.'));
      setFormValues(toFormValues(await response.json() as Patient));
      setSuccess('Patient changes saved.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to update this patient.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <section className="mx-auto max-w-4xl rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
        <Link href={`/patients/${params.id}`} className="text-sm font-medium text-sky-700 hover:underline">← Patient details</Link>
        <h1 className="mt-3 text-3xl font-bold text-slate-900">Edit patient</h1>
        {loading ? <p className="mt-8 text-slate-600">Loading patient…</p> : error ? <div role="alert" className="mt-6 rounded-lg bg-red-50 p-4 text-red-700">{error}</div> : formValues && (
          <form onSubmit={save} className="mt-6 grid gap-4 sm:grid-cols-2">
            {success && <p role="status" className="sm:col-span-2 rounded-lg bg-green-50 p-3 text-green-700">{success}</p>}
            <label className="grid gap-1 text-sm font-medium text-slate-700">First name<input required value={formValues.firstName} onChange={(event) => updateField('firstName', event.target.value)} className="rounded border p-2 font-normal" /></label>
            <label className="grid gap-1 text-sm font-medium text-slate-700">Last name<input required value={formValues.lastName} onChange={(event) => updateField('lastName', event.target.value)} className="rounded border p-2 font-normal" /></label>
            <label className="grid gap-1 text-sm font-medium text-slate-700">MRN<input required pattern="[A-Za-z0-9-]{3,40}" value={formValues.medicalRecordNumber} onChange={(event) => updateField('medicalRecordNumber', event.target.value)} className="rounded border p-2 font-normal" /></label>
            <label className="grid gap-1 text-sm font-medium text-slate-700">Date of birth<input type="date" value={formValues.dateOfBirth} onChange={(event) => updateField('dateOfBirth', event.target.value)} className="rounded border p-2 font-normal" /></label>
            <label className="grid gap-1 text-sm font-medium text-slate-700">Admission date<input required type="date" lang="en" dir="ltr" value={formValues.admittedAt} onChange={(event) => updateField('admittedAt', event.target.value)} className="rounded border p-2 font-normal" /></label>
            <label className="grid gap-1 text-sm font-medium text-slate-700">Phone<input value={formValues.phone} onChange={(event) => updateField('phone', event.target.value)} maxLength={30} className="rounded border p-2 font-normal" /></label>
            <label className="grid gap-1 text-sm font-medium text-slate-700">WhatsApp number<input value={formValues.whatsappPhone} onChange={(event) => updateField('whatsappPhone', event.target.value)} maxLength={30} placeholder="مثال: +2010…" className="rounded border p-2 font-normal" /></label>
            <label className="flex items-start gap-2 rounded border border-[#bfe6e1] bg-[#f0fbf9] p-3 text-sm text-[#176763] sm:col-span-2"><input type="checkbox" checked={formValues.whatsappOptIn} onChange={(event) => updateField('whatsappOptIn', event.target.checked)} className="mt-1" /><span>وافق المريض صراحةً على استقبال تذكيرات المواعيد عبر WhatsApp.</span></label>
            <label className="flex items-start gap-2 rounded border border-sky-200 bg-sky-50 p-3 text-sm text-sky-950 sm:col-span-2"><input type="checkbox" checked={formValues.whatsappMarketingOptIn} onChange={(event) => updateField('whatsappMarketingOptIn', event.target.checked)} className="mt-1" /><span>وافق المريض صراحةً على استقبال العروض والتواصل التسويقي عبر WhatsApp. هذه الموافقة منفصلة عن تذكيرات المواعيد.</span></label>
            <label className="grid gap-1 text-sm font-medium text-slate-700">Gender<select value={formValues.gender} onChange={(event) => updateField('gender', event.target.value)} className="rounded border p-2 font-normal"><option value="">Not recorded</option><option value="female">Female</option><option value="male">Male</option></select></label>
            <label className="grid gap-1 text-sm font-medium text-slate-700">Marital status<select value={formValues.maritalStatus} onChange={(event) => updateField('maritalStatus', event.target.value)} className="rounded border p-2 font-normal"><option value="">Not recorded</option><option value="single">Single</option><option value="married">Married</option><option value="divorced">Divorced</option><option value="widowed">Widowed</option><option value="other">Other</option></select></label>
            <label className="grid gap-1 text-sm font-medium text-slate-700">Email<input type="email" value={formValues.email} onChange={(event) => updateField('email', event.target.value)} maxLength={254} className="rounded border p-2 font-normal" /></label>
            <label className="grid gap-1 text-sm font-medium text-slate-700">Status<select value={formValues.status} onChange={(event) => updateField('status', event.target.value as PatientForm['status'])} className="rounded border p-2 font-normal"><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
            <fieldset className="grid gap-4 rounded-lg border border-slate-200 p-4 sm:col-span-2 sm:grid-cols-2">
              <legend className="px-1 text-sm font-semibold text-slate-900">CRM and marketing</legend>
              <label className="grid gap-1 text-sm font-medium text-slate-700">Occupation<input value={formValues.occupation} onChange={(event) => updateField('occupation', event.target.value)} maxLength={120} className="rounded border p-2 font-normal" /></label>
              <label className="grid gap-1 text-sm font-medium text-slate-700">Lead source<input value={formValues.leadSource} onChange={(event) => updateField('leadSource', event.target.value)} maxLength={120} placeholder="e.g. Facebook Ads" className="rounded border p-2 font-normal" /></label>
              <label className="grid gap-1 text-sm font-medium text-slate-700">City<input value={formValues.city} onChange={(event) => updateField('city', event.target.value)} maxLength={120} className="rounded border p-2 font-normal" /></label>
              <label className="grid gap-1 text-sm font-medium text-slate-700">Governorate<input value={formValues.governorate} onChange={(event) => updateField('governorate', event.target.value)} maxLength={120} className="rounded border p-2 font-normal" /></label>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 sm:col-span-2"><input type="checkbox" checked={formValues.marketingConsent} onChange={(event) => updateField('marketingConsent', event.target.checked)} /> Marketing consent</label>
            </fieldset>
            <label className="grid gap-1 text-sm font-medium text-slate-700 sm:col-span-2">Address<textarea value={formValues.address} onChange={(event) => updateField('address', event.target.value)} maxLength={500} className="min-h-24 rounded border p-2 font-normal" /></label>
            <label className="grid gap-1 text-sm font-medium text-slate-700">Emergency contact name<input value={formValues.emergencyContactName} onChange={(event) => updateField('emergencyContactName', event.target.value)} maxLength={160} className="rounded border p-2 font-normal" /></label>
            <label className="grid gap-1 text-sm font-medium text-slate-700">Emergency contact phone<input value={formValues.emergencyContactPhone} onChange={(event) => updateField('emergencyContactPhone', event.target.value)} maxLength={30} className="rounded border p-2 font-normal" /></label>
            <div className="sm:col-span-2 flex flex-wrap gap-3">
              <button disabled={saving} className="rounded bg-sky-700 px-4 py-2 font-medium text-white hover:bg-sky-800 disabled:opacity-60">{saving ? 'Saving…' : 'Save changes'}</button>
              <Link href={`/patients/${params.id}`} className="rounded border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50">Cancel</Link>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}
