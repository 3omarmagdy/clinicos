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
  occupation?: string | null;
  city?: string | null;
  governorate?: string | null;
  leadSource?: string | null;
  marketingConsent: boolean;
  marketingConsentAt?: string | null;
  email?: string | null;
  address?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

type ClinicalRecordCategory = 'clinical_note' | 'medical_history' | 'allergy' | 'chronic_condition' | 'medication' | 'follow_up' | 'prescription';

interface ClinicalRecord {
  id: string;
  category: ClinicalRecordCategory;
  content: string;
  symptoms?: string | null;
  diagnosis?: string | null;
  treatmentPlan?: string | null;
  createdAt: string;
  updatedAt: string;
  author: { id: string; firstName: string; lastName: string };
}

const emptyClinicalRecord = {
  category: 'clinical_note' as ClinicalRecordCategory,
  content: '',
  symptoms: '',
  diagnosis: '',
  treatmentPlan: '',
};

const categoryLabels: Record<ClinicalRecordCategory, string> = {
  clinical_note: 'Clinical note',
  medical_history: 'Medical history',
  allergy: 'Allergy',
  chronic_condition: 'Chronic condition',
  medication: 'Medication',
  follow_up: 'Follow-up',
  prescription: 'Prescription',
};

function formatDate(value?: string | null): string {
  return value
    ? new Intl.DateTimeFormat('en-GB', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(value))
    : 'Not recorded';
}

export default function PatientDetailsPage({ params }: { params: { id: string } }) {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [clinicalRecords, setClinicalRecords] = useState<ClinicalRecord[]>([]);
  const [clinicalError, setClinicalError] = useState('');
  const [clinicalLoading, setClinicalLoading] = useState(false);
  const [clinicalSaving, setClinicalSaving] = useState(false);
  const [clinicalForm, setClinicalForm] = useState(emptyClinicalRecord);
  const canUpdate = hasSessionPermission('patient:update');
  const canReadClinical = hasSessionPermission('clinical_record:read');
  const canCreateClinical = hasSessionPermission('clinical_record:create');

  const load = useCallback(async () => {
    if (!getAccessToken()) {
      window.location.replace('/login');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await authenticatedFetch(`/api/v1/patients/${params.id}`);
      if (!response.ok) throw new Error(await getApiErrorMessage(response, 'Unable to load this patient.'));
      setPatient(await response.json() as Patient);

      if (canReadClinical) {
        setClinicalLoading(true);
        setClinicalError('');
        try {
          const clinicalResponse = await authenticatedFetch(`/api/v1/patients/${params.id}/clinical-records`);
          if (!clinicalResponse.ok) throw new Error(await getApiErrorMessage(clinicalResponse, 'Unable to load clinical history.'));
          setClinicalRecords(await clinicalResponse.json() as ClinicalRecord[]);
        } catch (requestError) {
          setClinicalError(requestError instanceof Error ? requestError.message : 'Unable to load clinical history.');
        } finally {
          setClinicalLoading(false);
        }
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load this patient.');
    } finally {
      setLoading(false);
    }
  }, [canReadClinical, params.id]);

  useEffect(() => { void load(); }, [load]);

  const createClinicalRecord = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setClinicalSaving(true);
    setClinicalError('');
    try {
      const response = await authenticatedFetch(`/api/v1/patients/${params.id}/clinical-records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...clinicalForm,
          symptoms: clinicalForm.symptoms || undefined,
          diagnosis: clinicalForm.diagnosis || undefined,
          treatmentPlan: clinicalForm.treatmentPlan || undefined,
        }),
      });
      if (!response.ok) throw new Error(await getApiErrorMessage(response, 'Unable to add the clinical record.'));
      const record = await response.json() as ClinicalRecord;
      setClinicalRecords((current) => [record, ...current]);
      setClinicalForm(emptyClinicalRecord);
    } catch (requestError) {
      setClinicalError(requestError instanceof Error ? requestError.message : 'Unable to add the clinical record.');
    } finally {
      setClinicalSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <section className="mx-auto max-w-4xl rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/patients" className="text-sm font-medium text-sky-700 hover:underline">â† Patients</Link>
          <div className="flex gap-2">{patient && canCreateClinical && <Link href={`/patients/${patient.id}/prescription`} className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800">وصفة إلكترونية</Link>}{patient && canUpdate && <Link href={`/patients/${patient.id}/edit`} className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-800">Edit patient</Link>}</div>
        </div>

        {loading ? <p className="mt-8 text-slate-600">Loading patientâ€¦</p> : error ? (
          <div role="alert" className="mt-8 rounded-lg bg-red-50 p-4 text-red-700">
            <p>{error}</p>
            <button type="button" onClick={() => void load()} className="mt-2 font-medium underline">Try again</button>
          </div>
        ) : patient && (
          <>
            <div className="mt-6">
              <p className="text-sm font-medium text-sky-700">{patient.medicalRecordNumber}</p>
              <h1 className="mt-1 text-3xl font-bold text-slate-900">{patient.firstName} {patient.lastName}</h1>
              <p className="mt-1 capitalize text-slate-600">{patient.status}</p>
            </div>

            <dl className="mt-8 grid gap-5 sm:grid-cols-2">
              <div><dt className="text-sm text-slate-500">Phone</dt><dd className="mt-1 text-slate-900">{patient.phone || 'Not recorded'}</dd></div>
              <div><dt className="text-sm text-slate-500">Admission date</dt><dd className="mt-1 text-slate-900">{formatDate(patient.admittedAt)}</dd></div>
              <div><dt className="text-sm text-slate-500">Date of birth</dt><dd className="mt-1 text-slate-900">{formatDate(patient.dateOfBirth)}</dd></div>
              <div><dt className="text-sm text-slate-500">Email</dt><dd className="mt-1 text-slate-900">{patient.email || 'Not recorded'}</dd></div>
              <div><dt className="text-sm text-slate-500">Gender</dt><dd className="mt-1 text-slate-900">{patient.gender || 'Not recorded'}</dd></div>
              <div><dt className="text-sm text-slate-500">Marital status</dt><dd className="mt-1 capitalize text-slate-900">{patient.maritalStatus?.replace('_', ' ') || 'Not recorded'}</dd></div>
              <div><dt className="text-sm text-slate-500">Occupation</dt><dd className="mt-1 text-slate-900">{patient.occupation || 'Not recorded'}</dd></div>
              <div><dt className="text-sm text-slate-500">Location</dt><dd className="mt-1 text-slate-900">{[patient.city, patient.governorate].filter(Boolean).join(', ') || 'Not recorded'}</dd></div>
              <div><dt className="text-sm text-slate-500">Lead source</dt><dd className="mt-1 text-slate-900">{patient.leadSource || 'Not recorded'}</dd></div>
              <div><dt className="text-sm text-slate-500">Marketing consent</dt><dd className="mt-1 text-slate-900">{patient.marketingConsent ? `Granted${patient.marketingConsentAt ? ` on ${formatDate(patient.marketingConsentAt)}` : ''}` : 'Not granted'}</dd></div>
              <div><dt className="text-sm text-slate-500">Organization</dt><dd className="mt-1 text-slate-900">Current organization</dd></div>
              <div><dt className="text-sm text-slate-500">Location / department</dt><dd className="mt-1 text-slate-900">Not assigned</dd></div>
              <div><dt className="text-sm text-slate-500">Created</dt><dd className="mt-1 text-slate-900">{formatDate(patient.createdAt)}</dd></div>
              <div><dt className="text-sm text-slate-500">Last updated</dt><dd className="mt-1 text-slate-900">{formatDate(patient.updatedAt)}</dd></div>
            </dl>

            {(patient.address || patient.emergencyContactName || patient.emergencyContactPhone) && (
              <section className="mt-8 border-t border-slate-200 pt-6">
                <h2 className="text-lg font-semibold text-slate-900">Additional details</h2>
                {patient.address && <p className="mt-3 text-slate-700">{patient.address}</p>}
                {(patient.emergencyContactName || patient.emergencyContactPhone) && <p className="mt-3 text-slate-700">Emergency contact: {patient.emergencyContactName || 'Unnamed'}{patient.emergencyContactPhone ? ` Â· ${patient.emergencyContactPhone}` : ''}</p>}
              </section>
            )}

            <section className="mt-8 border-t border-slate-200 pt-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Clinical history</h2>
                  <p className="mt-1 text-sm text-slate-600">Medical history, allergies, conditions, medications, and notes.</p>
                </div>
              </div>

              {!canReadClinical ? <p className="mt-5 rounded-lg bg-slate-100 p-4 text-slate-600">Clinical history is restricted to authorized clinical staff.</p> : (
                <>
                  {clinicalError && <p role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-red-700">{clinicalError}</p>}
                  {canCreateClinical && (
                    <form onSubmit={createClinicalRecord} className="mt-5 grid gap-3 rounded-lg bg-slate-50 p-4 sm:grid-cols-2">
                      <h3 className="sm:col-span-2 text-lg font-semibold text-slate-900">Add clinical note</h3>
                      <label className="grid gap-1 text-sm font-medium text-slate-700">Type
                        <select value={clinicalForm.category} onChange={(event) => setClinicalForm((current) => ({ ...current, category: event.target.value as ClinicalRecordCategory }))} className="rounded border border-slate-300 p-2 font-normal">
                          {Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                      </label>
                                            {clinicalForm.category === 'clinical_note' && (
                        <>
                          <label className="grid gap-1 text-sm font-medium text-slate-700">
                            Symptoms / complaint
                            <input value={clinicalForm.symptoms} onChange={(event) => setClinicalForm((current) => ({ ...current, symptoms: event.target.value }))} maxLength={4000} className="rounded border border-slate-300 p-2 font-normal" />
                          </label>
                          <label className="grid gap-1 text-sm font-medium text-slate-700 sm:col-span-2">
                            Clinical note
                            <textarea required value={clinicalForm.content} onChange={(event) => setClinicalForm((current) => ({ ...current, content: event.target.value }))} maxLength={10000} className="min-h-28 rounded border border-slate-300 p-2 font-normal" />
                          </label>
                          <label className="grid gap-1 text-sm font-medium text-slate-700">
                            Diagnosis
                            <input value={clinicalForm.diagnosis} onChange={(event) => setClinicalForm((current) => ({ ...current, diagnosis: event.target.value }))} maxLength={4000} className="rounded border border-slate-300 p-2 font-normal" />
                          </label>
                          <label className="grid gap-1 text-sm font-medium text-slate-700">
                            Treatment / plan
                            <input value={clinicalForm.treatmentPlan} onChange={(event) => setClinicalForm((current) => ({ ...current, treatmentPlan: event.target.value }))} maxLength={4000} className="rounded border border-slate-300 p-2 font-normal" />
                          </label>
                        </>
                      )}

                      {clinicalForm.category === 'medical_history' && (
                        <label className="grid gap-1 text-sm font-medium text-slate-700 sm:col-span-2">
                          Medical history
                          <textarea required value={clinicalForm.content} onChange={(event) => setClinicalForm((current) => ({ ...current, content: event.target.value }))} maxLength={10000} className="min-h-28 rounded border border-slate-300 p-2 font-normal" />
                        </label>
                      )}

                      {clinicalForm.category === 'allergy' && (
                        <label className="grid gap-1 text-sm font-medium text-slate-700 sm:col-span-2">
                          Allergy
                          <textarea required value={clinicalForm.content} onChange={(event) => setClinicalForm((current) => ({ ...current, content: event.target.value }))} maxLength={10000} className="min-h-28 rounded border border-slate-300 p-2 font-normal" />
                        </label>
                      )}

                      {clinicalForm.category === 'chronic_condition' && (
  <>
    <label className="grid gap-1 text-sm font-medium text-slate-700 sm:col-span-2">
      Chronic condition
      <textarea required value={clinicalForm.content} onChange={(event) => setClinicalForm((current) => ({ ...current, content: event.target.value }))} maxLength={10000} className="min-h-28 rounded border border-slate-300 p-2 font-normal" />
    </label>
    <label className="grid gap-1 text-sm font-medium text-slate-700">
      Treatment / plan
      <input value={clinicalForm.treatmentPlan} onChange={(event) => setClinicalForm((current) => ({ ...current, treatmentPlan: event.target.value }))} maxLength={4000} className="rounded border border-slate-300 p-2 font-normal" />
    </label>
  </>
)}

                      {clinicalForm.category === 'medication' && (
  <>
    <label className="grid gap-1 text-sm font-medium text-slate-700 sm:col-span-2">
      Medication
      <input required value={clinicalForm.content} onChange={(event) => setClinicalForm((current) => ({ ...current, content: event.target.value }))} maxLength={10000} className="rounded border border-slate-300 p-2 font-normal" />
    </label>
    <label className="grid gap-1 text-sm font-medium text-slate-700">
      Dosage / instructions
      <input value={clinicalForm.treatmentPlan} onChange={(event) => setClinicalForm((current) => ({ ...current, treatmentPlan: event.target.value }))} maxLength={4000} className="rounded border border-slate-300 p-2 font-normal" />
    </label>
  </>
)}

                      {clinicalForm.category === 'follow_up' && (
                        <>
                          <label className="grid gap-1 text-sm font-medium text-slate-700 sm:col-span-2">
                            Follow-up
                            <textarea required value={clinicalForm.content} onChange={(event) => setClinicalForm((current) => ({ ...current, content: event.target.value }))} maxLength={10000} className="min-h-28 rounded border border-slate-300 p-2 font-normal" />
                          </label>
                          <label className="grid gap-1 text-sm font-medium text-slate-700">
                            Treatment / plan
                            <input value={clinicalForm.treatmentPlan} onChange={(event) => setClinicalForm((current) => ({ ...current, treatmentPlan: event.target.value }))} maxLength={4000} className="rounded border border-slate-300 p-2 font-normal" />
                          </label>
                        </>
                      )}
                      <button disabled={clinicalSaving} className="w-fit rounded-lg bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-800 disabled:opacity-60">{clinicalSaving ? 'Savingâ€¦' : 'Add to history'}</button>
                    </form>
                  )}
                  <div className="mt-5 space-y-3">
                    {clinicalLoading ? <p className="text-slate-600">Loading clinical historyâ€¦</p> : clinicalRecords.length === 0 ? <p className="rounded-lg border border-dashed border-slate-300 p-4 text-slate-600">No clinical history has been recorded yet.</p> : clinicalRecords.map((record) => (
                      <article key={record.id} className="rounded-lg border border-slate-200 p-4">
                        <div className="flex flex-wrap items-baseline justify-between gap-2"><h3 className="font-semibold text-slate-900">{categoryLabels[record.category]}</h3><p className="text-sm text-slate-500">{formatDate(record.createdAt)} Â· {record.author.firstName} {record.author.lastName}</p></div>
                        <p className="mt-3 whitespace-pre-wrap text-slate-700">{record.content}</p>
                        {record.symptoms && <p className="mt-3 text-sm text-slate-700"><span className="font-medium">Symptoms:</span> {record.symptoms}</p>}
                        {record.diagnosis && <p className="mt-1 text-sm text-slate-700"><span className="font-medium">Diagnosis:</span> {record.diagnosis}</p>}
                        {record.treatmentPlan && <p className="mt-1 text-sm text-slate-700"><span className="font-medium">Treatment / plan:</span> {record.treatmentPlan}</p>}
                      </article>
                    ))}
                  </div>
                </>
              )}
            </section>
          </>
        )}
      </section>
    </main>
  );
}



