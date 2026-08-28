'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { getApiErrorMessage } from '@/lib/api-error';
import { authenticatedFetch, getAccessToken, hasSessionPermission } from '@/lib/auth-session';

type Patient = {
  id: string;
  medicalRecordNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string | null;
  admittedAt: string;
  gender?: string | null;
  phone?: string | null;
  whatsappPhone?: string | null;
  whatsappOptIn?: boolean;
  whatsappMarketingOptIn?: boolean;
  occupation?: string | null;
  city?: string | null;
  governorate?: string | null;
  email?: string | null;
  address?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  status: string;
};

type ClinicalRecordCategory =
  | 'clinical_note'
  | 'medical_history'
  | 'allergy'
  | 'chronic_condition'
  | 'medication'
  | 'follow_up'
  | 'prescription';

type ClinicalRecord = {
  id: string;
  category: ClinicalRecordCategory;
  content: string;
  symptoms?: string | null;
  diagnosis?: string | null;
  treatmentPlan?: string | null;
  createdAt: string;
  author: { firstName: string; lastName: string };
};

const blankRecord = {
  category: 'clinical_note' as ClinicalRecordCategory,
  content: '',
  symptoms: '',
  diagnosis: '',
  treatmentPlan: '',
};

const recordLabels: Record<ClinicalRecordCategory, string> = {
  clinical_note: 'Clinical Note · ملاحظة سريرية',
  medical_history: 'Medical History · التاريخ المرضي',
  allergy: 'Allergy · حساسية',
  chronic_condition: 'Chronic Condition · مرض مزمن',
  medication: 'Medication · دواء مستمر',
  follow_up: 'Follow-up · متابعة',
  prescription: 'e-Prescription · وصفة إلكترونية',
};

const none = 'غير مسجل';

function formatDate(value?: string | null) {
  if (!value) return none;
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export default function PatientDetailsPage({ params }: { params: { id: string } }) {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [records, setRecords] = useState<ClinicalRecord[]>([]);
  const [error, setError] = useState('');
  const [clinicalError, setClinicalError] = useState('');
  const [loading, setLoading] = useState(true);
  const [clinicalLoading, setClinicalLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [whatsappSaving, setWhatsappSaving] = useState(false);
  const [whatsappNotice, setWhatsappNotice] = useState('');
  const [form, setForm] = useState(blankRecord);

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
      if (!response.ok) {
        throw new Error(await getApiErrorMessage(response, 'تعذر تحميل ملف المريض.'));
      }
      setPatient((await response.json()) as Patient);

      if (canReadClinical) {
        setClinicalLoading(true);
        setClinicalError('');
        try {
          const clinicalResponse = await authenticatedFetch(
            `/api/v1/patients/${params.id}/clinical-records`,
          );
          if (!clinicalResponse.ok) {
            throw new Error(await getApiErrorMessage(clinicalResponse, 'تعذر تحميل الـ EMR.'));
          }
          setRecords((await clinicalResponse.json()) as ClinicalRecord[]);
        } catch (reason) {
          setClinicalError(reason instanceof Error ? reason.message : 'تعذر تحميل الـ EMR.');
        } finally {
          setClinicalLoading(false);
        }
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'تعذر تحميل ملف المريض.');
    } finally {
      setLoading(false);
    }
  }, [canReadClinical, params.id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function disableWhatsApp() {
    if (!window.confirm('هل تريد إيقاف جميع رسائل WhatsApp لهذا المريض؟')) return;
    setWhatsappSaving(true);
    setWhatsappNotice('');
    try {
      const response = await authenticatedFetch(`/api/v1/patients/${params.id}/whatsapp-opt-out`, { method: 'POST' });
      if (!response.ok) throw new Error(await getApiErrorMessage(response, 'تعذر إيقاف رسائل WhatsApp.'));
      setWhatsappNotice('تم إيقاف تذكيرات المواعيد والعروض لهذا المريض.');
      await load();
    } catch (reason) {
      setWhatsappNotice(reason instanceof Error ? reason.message : 'تعذر إيقاف الرسائل.');
    } finally {
      setWhatsappSaving(false);
    }
  }

  async function saveRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setClinicalError('');

    try {
      const response = await authenticatedFetch(`/api/v1/patients/${params.id}/clinical-records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          diagnosis: form.diagnosis || undefined,
          symptoms: form.symptoms || undefined,
          treatmentPlan: form.treatmentPlan || undefined,
        }),
      });
      if (!response.ok) {
        throw new Error(await getApiErrorMessage(response, 'تعذر حفظ الملاحظة السريرية.'));
      }
      const saved = (await response.json()) as ClinicalRecord;
      setRecords((current) => [saved, ...current]);
      setForm(blankRecord);
    } catch (reason) {
      setClinicalError(reason instanceof Error ? reason.message : 'تعذر حفظ الملاحظة السريرية.');
    } finally {
      setSaving(false);
    }
  }

  const summary: Array<[string, string]> = patient
    ? [
        ['الهاتف', patient.phone || none],
        ['تاريخ التسجيل', formatDate(patient.admittedAt)],
        ['تاريخ الميلاد', formatDate(patient.dateOfBirth)],
        ['النوع', patient.gender || none],
        ['المهنة', patient.occupation || none],
        ['الموقع', [patient.city, patient.governorate].filter(Boolean).join(' · ') || none],
      ]
    : [];

  return (
    <main dir="rtl" className="min-h-screen bg-[#f5f9fd] px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/patients" className="text-sm font-bold text-[#176b9d] hover:underline">
            ← العودة إلى سجل المرضى
          </Link>
          <div className="flex flex-wrap gap-2">
            {patient && canCreateClinical ? (
              <Link
                href={`/patients/${patient.id}/prescription`}
                className="rounded-xl bg-[#0b6e79] px-4 py-2 text-sm font-bold text-white hover:bg-[#075b65]"
              >
                e-Prescription · وصفة إلكترونية
              </Link>
            ) : null}
            {patient && canUpdate ? (
              <Link
                href={`/patients/${patient.id}/edit`}
                className="rounded-xl border border-[#bed4e5] bg-white px-4 py-2 text-sm font-bold text-[#125b86] hover:bg-blue-50"
              >
                تعديل بيانات المريض
              </Link>
            ) : null}
          </div>
        </header>

        {loading ? <p className="mt-10 text-slate-600">جارٍ تحميل ملف المريض…</p> : null}

        {!loading && error ? (
          <div role="alert" className="mt-8 rounded-2xl border border-red-100 bg-red-50 p-5 text-red-800">
            <p>{error}</p>
            <button type="button" onClick={() => void load()} className="mt-2 font-bold underline">
              إعادة المحاولة
            </button>
          </div>
        ) : null}

        {!loading && !error && patient ? (
          <>
            <section className="mt-5 rounded-3xl border border-[#dce7f1] bg-white p-6 shadow-sm sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-5 border-b border-slate-100 pb-6">
                <div>
                  <p className="text-xs font-extrabold tracking-[0.16em] text-[#16839a]">
                    PATIENT PROFILE · ملف المريض
                  </p>
                  <h1 className="mt-2 text-3xl font-black tracking-tight">
                    {patient.firstName} {patient.lastName}
                  </h1>
                  <p className="mt-2 font-mono text-sm text-slate-500">
                    MRN · {patient.medicalRecordNumber}
                  </p>
                </div>
                <span className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-800">
                  {patient.status === 'active' ? 'Active · نشط' : patient.status}
                </span>
              </div>

              <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {summary.map(([label, value]) => (
                  <div key={label} className="rounded-2xl bg-[#f7fafc] p-4">
                    <dt className="text-xs font-bold text-slate-500">{label}</dt>
                    <dd className="mt-2 font-semibold text-slate-800">{value}</dd>
                  </div>
                ))}
              </dl>

              {patient.address || patient.emergencyContactName || patient.email ? (
                <div className="mt-5 grid gap-3 border-t border-slate-100 pt-5 text-sm sm:grid-cols-2">
                  <p>
                    <b>البريد الإلكتروني:</b> <span dir="ltr">{patient.email || none}</span>
                  </p>
                  <p>
                    <b>جهة اتصال طوارئ:</b> {patient.emergencyContactName || none}
                    {patient.emergencyContactPhone ? ` · ${patient.emergencyContactPhone}` : ''}
                  </p>
                  {patient.address ? (
                    <p className="sm:col-span-2">
                      <b>العنوان:</b> {patient.address}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-5 border-t border-slate-100 pt-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-black text-[#153c63]">تفضيلات التواصل عبر WhatsApp</p>
                    <p className="mt-1 text-sm text-slate-600">تذكيرات المواعيد: {patient.whatsappOptIn ? 'مفعّلة' : 'متوقفة'} · العروض: {patient.whatsappMarketingOptIn ? 'مفعّلة' : 'متوقفة'}</p>
                  </div>
                  {canUpdate && (patient.whatsappOptIn || patient.whatsappMarketingOptIn) ? <button type="button" onClick={() => void disableWhatsApp()} disabled={whatsappSaving} className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700 disabled:opacity-60">{whatsappSaving ? 'جارٍ الإيقاف…' : 'إيقاف كل رسائل WhatsApp'}</button> : null}
                </div>
                {whatsappNotice ? <p role="status" className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{whatsappNotice}</p> : null}
              </div>
            </section>

            <section className="mt-6 rounded-3xl border border-[#dce7f1] bg-white p-6 shadow-sm sm:p-8">
              <p className="text-xs font-extrabold tracking-[0.16em] text-[#16839a]">
                EMR · ELECTRONIC MEDICAL RECORD
              </p>
              <h2 className="mt-2 text-2xl font-black">المتابعة السريرية</h2>
              <p className="mt-1 text-sm text-slate-600">
                Clinical Notes، تاريخ مرضي، تشخيص وخطة علاج في تسلسل واحد.
              </p>

              {!canReadClinical ? (
                <p className="mt-5 rounded-2xl bg-slate-100 p-4 text-sm text-slate-600">
                  هذه المساحة مخصصة للفريق الطبي. الاستقبال يرى بيانات التسجيل والمواعيد فقط.
                </p>
              ) : (
                <>
                  {clinicalError ? (
                    <p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-red-700">
                      {clinicalError}
                    </p>
                  ) : null}

                  {canCreateClinical ? (
                    <form
                      onSubmit={saveRecord}
                      className="mt-6 grid gap-4 rounded-2xl border border-blue-100 bg-[#f7fbff] p-5 sm:grid-cols-2"
                    >
                      <h3 className="text-lg font-black sm:col-span-2">إضافة إلى الـ EMR</h3>
                      <label className="grid gap-1 text-sm font-bold">
                        نوع السجل
                        <select
                          value={form.category}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              category: event.target.value as ClinicalRecordCategory,
                            }))
                          }
                          className="field font-normal"
                        >
                          {Object.entries(recordLabels).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="grid gap-1 text-sm font-bold">
                        Symptoms / Chief complaint
                        <input
                          value={form.symptoms}
                          onChange={(event) =>
                            setForm((current) => ({ ...current, symptoms: event.target.value }))
                          }
                          maxLength={4000}
                          className="field font-normal"
                        />
                      </label>
                      <label className="grid gap-1 text-sm font-bold sm:col-span-2">
                        Clinical note / تفاصيل الزيارة
                        <textarea
                          required
                          value={form.content}
                          onChange={(event) =>
                            setForm((current) => ({ ...current, content: event.target.value }))
                          }
                          maxLength={10000}
                          className="field min-h-32 font-normal"
                        />
                      </label>
                      <label className="grid gap-1 text-sm font-bold">
                        Diagnosis / التشخيص
                        <input
                          value={form.diagnosis}
                          onChange={(event) =>
                            setForm((current) => ({ ...current, diagnosis: event.target.value }))
                          }
                          maxLength={4000}
                          className="field font-normal"
                        />
                      </label>
                      <label className="grid gap-1 text-sm font-bold">
                        Treatment plan / الخطة العلاجية
                        <input
                          value={form.treatmentPlan}
                          onChange={(event) =>
                            setForm((current) => ({ ...current, treatmentPlan: event.target.value }))
                          }
                          maxLength={4000}
                          className="field font-normal"
                        />
                      </label>
                      <button
                        disabled={saving}
                        className="w-fit rounded-xl bg-[#176b9d] px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
                      >
                        {saving ? 'جارٍ الحفظ…' : 'حفظ الملاحظة السريرية'}
                      </button>
                    </form>
                  ) : null}

                  <div className="mt-6 space-y-3">
                    {clinicalLoading ? <p className="text-slate-600">جارٍ تحميل الـ EMR…</p> : null}
                    {!clinicalLoading && records.length === 0 ? (
                      <p className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-600">
                        لا توجد ملاحظات سريرية بعد. ابدأ بتوثيق الزيارة الأولى.
                      </p>
                    ) : null}
                    {!clinicalLoading
                      ? records.map((record) => (
                          <article key={record.id} className="rounded-2xl border border-slate-200 p-5">
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                              <h3 className="font-black text-slate-900">{recordLabels[record.category]}</h3>
                              <p className="text-xs text-slate-500">
                                {formatDate(record.createdAt)} · د. {record.author.firstName}{' '}
                                {record.author.lastName}
                              </p>
                            </div>
                            <p className="mt-3 whitespace-pre-wrap leading-7 text-slate-700">
                              {record.content}
                            </p>
                            {record.symptoms ? <p className="mt-3 text-sm"><b>Symptoms:</b> {record.symptoms}</p> : null}
                            {record.diagnosis ? <p className="mt-2 text-sm"><b>Diagnosis:</b> {record.diagnosis}</p> : null}
                            {record.treatmentPlan ? <p className="mt-2 text-sm"><b>Treatment plan:</b> {record.treatmentPlan}</p> : null}
                          </article>
                        ))
                      : null}
                  </div>
                </>
              )}
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
