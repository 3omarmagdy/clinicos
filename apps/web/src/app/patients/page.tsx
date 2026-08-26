'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { getApiErrorMessage } from '@/lib/api-error';
import { authenticatedFetch, getAccessToken } from '@/lib/auth-session';

interface PatientListItem {
  id: string;
  medicalRecordNumber: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  city?: string | null;
  governorate?: string | null;
  admittedAt: string;
  status: string;
}

const governorateCities = {
  'القاهرة': ['القاهرة الجديدة', 'التجمع الأول', 'التجمع الخامس', 'مدينة نصر', 'مصر الجديدة', 'المعادي', 'حلوان', 'الشروق', 'بدر', 'السلام', 'المرج', 'عين شمس', 'المقطم', 'وسط البلد', 'الزيتون', 'النزهة', 'السيدة زينب', 'حدائق القبة', 'شبرا', 'دار السلام', 'البساتين'],
  'الجيزة': ['الدقي', 'المهندسين', 'العجوزة', 'الهرم', 'فيصل', 'بولاق الدكرور', 'إمبابة', 'الوراق', '6 أكتوبر', 'الشيخ زايد', 'حدائق أكتوبر', 'أكتوبر الجديدة', 'كرداسة', 'أوسيم', 'أبو النمرس', 'الحوامدية', 'البدرشين', 'الصف', 'أطفيح', 'العياط', 'منشأة القناطر', 'الواحات البحرية'],
} as const;

function todayDate() {
  const today = new Date();
  const offset = today.getTimezoneOffset() * 60_000;
  return new Date(today.getTime() - offset).toISOString().slice(0, 10);
}

function formatAdmissionDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value));
}

const emptyPatientForm = {
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  admittedAt: todayDate(),
  phone: '',
  gender: '',
  maritalStatus: '',
  occupation: '',
  city: '',
  governorate: '',
  leadSource: '',
  marketingConsent: false,
};

export default function PatientsPage() {
  const [patients, setPatients] = useState<PatientListItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [formValues, setFormValues] = useState(emptyPatientForm);
  const [sessionChecked, setSessionChecked] = useState(false);

  const load = useCallback(async (searchQuery = '') => {
    if (!getAccessToken()) {
      window.location.replace('/login');
      return;
    }

    setSessionChecked(true);

    setLoading(true);
    setError('');
    try {
      const query = searchQuery.trim() ? `?search=${encodeURIComponent(searchQuery.trim())}` : '';
      const response = await authenticatedFetch(`/api/v1/patients${query}`);
      if (!response.ok) throw new Error(await getApiErrorMessage(response, 'Unable to load patients.'));
      setPatients(await response.json() as PatientListItem[]);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load patients.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(search); }, 250);
    return () => window.clearTimeout(timer);
  }, [load, search]);

  if (!sessionChecked && !getAccessToken()) {
    return <main className="min-h-screen bg-slate-50 px-4 py-10"><p className="mx-auto max-w-5xl text-slate-600">Redirecting to secure sign in…</p></main>;
  }

  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      const response = await authenticatedFetch('/api/v1/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formValues.firstName,
          lastName: formValues.lastName,
          dateOfBirth: formValues.dateOfBirth || undefined,
          admittedAt: formValues.admittedAt || undefined,
          phone: formValues.phone || undefined,
          gender: formValues.gender || undefined,
          maritalStatus: formValues.maritalStatus || undefined,
          occupation: formValues.occupation || undefined,
          city: formValues.city || undefined,
          governorate: formValues.governorate || undefined,
          leadSource: formValues.leadSource || undefined,
          marketingConsent: formValues.marketingConsent,
        }),
      });
      if (!response.ok) throw new Error(await getApiErrorMessage(response, 'Unable to create patient.'));
      const patient = await response.json() as PatientListItem;
      setPatients((currentPatients) => [...currentPatients, patient].sort((left, right) => {
        const lastNameOrder = left.lastName.localeCompare(right.lastName);
        return lastNameOrder || left.firstName.localeCompare(right.firstName);
      }));
      setFormValues(emptyPatientForm);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to create patient.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main dir="rtl" className="min-h-screen bg-[#f5f9fd] px-4 py-6 text-[#10233d] sm:py-10">
      <section className="mx-auto max-w-6xl rounded-2xl bg-white p-6 shadow-sm ring-1 ring-[#dce7f1] sm:p-8">
        <div className="flex flex-wrap gap-4 text-sm font-bold text-[#1768a8]"><Link href="/dashboard" className="hover:underline">العودة إلى Workspace ←</Link><Link href="/patients/import" className="hover:underline">CRM Import · استيراد بيانات سابقة</Link></div>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold tracking-[.14em] text-[#087d78]">PATIENT MANAGEMENT</p>
            <h1 className="mt-1 text-3xl font-extrabold text-[#10233d]">Patient Registry · سجل المرضى</h1>
            <p className="mt-2 text-slate-600">تسجيل مرضى، Patient Profile، وبيانات تسويقية تعتمد على موافقة موثقة.</p>
          </div>
          <p className="text-sm text-slate-500">{patients.length} result{patients.length === 1 ? '' : 's'}</p>
        </div>

        {error && <p role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}

        <div className="mt-6">
          <label htmlFor="patient-search" className="sr-only">Search patients</label>
          <input id="patient-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="بحث بالاسم أو MRN أو رقم الهاتف" className="field" />
        </div>

        <form onSubmit={create} className="mt-5 grid gap-4 rounded-2xl border border-[#dce7f1] bg-[#fbfdff] p-5 sm:grid-cols-2">
          <div className="sm:col-span-2"><p className="text-xs font-extrabold tracking-[.14em] text-[#1768a8]">NEW PATIENT</p><h2 className="mt-1 text-xl font-extrabold text-[#173b63]">تسجيل مريض جديد</h2></div>
          <label className="grid gap-1 text-sm font-medium text-slate-700">First name<input required name="firstName" value={formValues.firstName} onChange={(event) => setFormValues((current) => ({ ...current, firstName: event.target.value }))} className="rounded border p-2 font-normal" /></label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">Last name<input required name="lastName" value={formValues.lastName} onChange={(event) => setFormValues((current) => ({ ...current, lastName: event.target.value }))} className="rounded border p-2 font-normal" /></label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">Phone<input required name="phone" value={formValues.phone} onChange={(event) => setFormValues((current) => ({ ...current, phone: event.target.value }))} maxLength={30} className="rounded border p-2 font-normal" /></label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">Admission date<input required name="admittedAt" type="date" lang="en" dir="ltr" value={formValues.admittedAt} onChange={(event) => setFormValues((current) => ({ ...current, admittedAt: event.target.value }))} className="rounded border p-2 font-normal" /></label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">Gender<select name="gender" value={formValues.gender} onChange={(event) => setFormValues((current) => ({ ...current, gender: event.target.value }))} className="rounded border p-2 font-normal"><option value="">Not recorded</option><option value="female">Female</option><option value="male">Male</option></select></label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">Marital status<select name="maritalStatus" value={formValues.maritalStatus} onChange={(event) => setFormValues((current) => ({ ...current, maritalStatus: event.target.value }))} className="rounded border p-2 font-normal"><option value="">Not recorded</option><option value="single">Single</option><option value="married">Married</option><option value="divorced">Divorced</option><option value="widowed">Widowed</option><option value="other">Other</option></select></label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">Date of birth<input name="dateOfBirth" type="date" value={formValues.dateOfBirth} onChange={(event) => setFormValues((current) => ({ ...current, dateOfBirth: event.target.value }))} className="rounded border p-2 font-normal" /></label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">Occupation<input name="occupation" value={formValues.occupation} onChange={(event) => setFormValues((current) => ({ ...current, occupation: event.target.value }))} maxLength={120} className="rounded border p-2 font-normal" /></label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">Governorate<select name="governorate" value={formValues.governorate} onChange={(event) => setFormValues((current) => ({ ...current, governorate: event.target.value, city: '' }))} className="rounded border p-2 font-normal"><option value="">Select governorate</option>{Object.keys(governorateCities).map((governorate) => <option key={governorate} value={governorate}>{governorate}</option>)}</select></label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">City<select name="city" value={formValues.city} onChange={(event) => setFormValues((current) => ({ ...current, city: event.target.value }))} disabled={!formValues.governorate} className="rounded border p-2 font-normal disabled:bg-slate-100"><option value="">{formValues.governorate ? 'Select city' : 'Choose governorate first'}</option>{formValues.governorate && governorateCities[formValues.governorate as keyof typeof governorateCities].map((city) => <option key={city} value={city}>{city}</option>)}</select></label>
          <label className="grid gap-1 text-sm font-medium text-slate-700 sm:col-span-2">Lead source<input name="leadSource" value={formValues.leadSource} onChange={(event) => setFormValues((current) => ({ ...current, leadSource: event.target.value }))} maxLength={120} placeholder="e.g. Facebook Ads, referral, walk-in" className="rounded border p-2 font-normal" /></label>
          <label className="flex items-start gap-2 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950 sm:col-span-2"><input name="marketingConsent" type="checkbox" checked={formValues.marketingConsent} onChange={(event) => setFormValues((current) => ({ ...current, marketingConsent: event.target.checked }))} className="mt-1" /><span>Patient has explicitly consented to receive marketing communications and to the permitted use of their contact data for advertising audiences.</span></label>
          <p className="text-sm text-slate-600 sm:col-span-2">A medical record number is generated automatically. Only consented contacts should ever be included in marketing exports.</p>
          <button disabled={saving} className="w-fit rounded-xl bg-[#1768a8] px-5 py-3 font-extrabold text-white hover:bg-[#11598f] disabled:opacity-60">
            {saving ? 'جارٍ حفظ Patient Profile…' : 'حفظ بيانات المريض'}
          </button>
        </form>

        <div className="mt-6 overflow-hidden rounded-lg border border-slate-200">
          {loading ? <p className="p-4 text-slate-600">Loading patients…</p> : patients.length === 0 ? <p className="p-4 text-slate-600">{search.trim() ? 'No patients match that search.' : 'No patients yet. Add the first patient above.'}</p> : (
            <ul>
              {patients.map((patient) => (
                <li key={patient.id} className="border-b p-4 last:border-0">
                  <Link href={`/patients/${patient.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-md hover:bg-slate-50">
                    <span>
                      <span className="font-medium text-slate-900">{patient.firstName} {patient.lastName}</span>
                      <span className="ml-2 text-sm text-slate-500">{patient.medicalRecordNumber}</span>
                    </span>
                    <span className="text-right text-sm text-slate-600"><span className="block">{patient.phone || 'No phone'}</span><span className="block text-xs text-slate-500">{[patient.city, patient.governorate].filter(Boolean).join('، ') || 'No location'} · Admitted {formatAdmissionDate(patient.admittedAt)}</span></span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
