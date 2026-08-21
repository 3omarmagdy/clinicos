'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { getApiErrorMessage } from '@/lib/api-error';
import { authenticatedFetch, getAccessToken, hasSessionPermission } from '@/lib/auth-session';

type Patient = { id: string; firstName: string; lastName: string; medicalRecordNumber: string; phone?: string | null };
type Appointment = { id: string; scheduledAt: string; durationMinutes: number; status: string; reason?: string | null; patient: Patient };
const statuses: Record<string, string> = { scheduled: 'محجوز', confirmed: 'مؤكد', checked_in: 'حضر', completed: 'مكتمل', cancelled: 'ملغي', no_show: 'لم يحضر' };

function localDate() { const date = new Date(); date.setMinutes(date.getMinutes() - date.getTimezoneOffset()); return date.toISOString().slice(0, 10); }
function localTime() { const date = new Date(); date.setMinutes(date.getMinutes() - date.getTimezoneOffset()); return date.toISOString().slice(11, 16); }
function isIsoDate(value: string) { return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00`).getTime()); }

export default function AppointmentsPage() {
  const [date, setDate] = useState(localDate());
  const [dateInput, setDateInput] = useState(localDate());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [matches, setMatches] = useState<Patient[]>([]);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [scheduledDate, setScheduledDate] = useState(localDate());
  const [scheduledTime, setScheduledTime] = useState(localTime());
  const [durationMinutes, setDurationMinutes] = useState('30');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const mayCreate = hasSessionPermission('appointment:create');
  const mayUpdate = hasSessionPermission('appointment:update');

  const load = async (selectedDate = date) => {
    if (!getAccessToken()) { window.location.replace('/login'); return; }
    setLoading(true); setError('');
    try { const response = await authenticatedFetch(`/api/v1/appointments?from=${selectedDate}`); if (!response.ok) throw new Error(await getApiErrorMessage(response, 'تعذر تحميل المواعيد.')); setAppointments(await response.json() as Appointment[]); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'تعذر تحميل المواعيد.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [date]);
  useEffect(() => { const handle = window.setTimeout(async () => { if (patientSearch.trim().length < 2 || patient) { setMatches([]); return; } try { const response = await authenticatedFetch(`/api/v1/patients?search=${encodeURIComponent(patientSearch.trim())}`); if (response.ok) setMatches((await response.json() as Patient[]).slice(0, 8)); } catch { /* optional */ } }, 250); return () => window.clearTimeout(handle); }, [patientSearch, patient]);

  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!patient) { setError('اختر مريضًا من نتائج البحث أولًا.'); return; }
    if (!isIsoDate(scheduledDate) || !/^\d{2}:\d{2}$/.test(scheduledTime)) { setError('اكتب التاريخ بصيغة YYYY-MM-DD واختر وقتًا صحيحًا.'); return; }
    setSaving(true); setError('');
    try { const response = await authenticatedFetch('/api/v1/appointments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ patientId: patient.id, scheduledAt: new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString(), durationMinutes: Number(durationMinutes), reason: reason || undefined }) }); if (!response.ok) throw new Error(await getApiErrorMessage(response, 'تعذر حجز الموعد.')); setPatient(null); setPatientSearch(''); setReason(''); setScheduledDate(date); setScheduledTime(localTime()); await load(date); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'تعذر حجز الموعد.'); }
    finally { setSaving(false); }
  };
  const changeStatus = async (id: string, status: string) => { setError(''); try { const response = await authenticatedFetch(`/api/v1/appointments/${id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }); if (!response.ok) throw new Error(await getApiErrorMessage(response, 'تعذر تحديث الموعد.')); await load(date); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'تعذر تحديث الموعد.'); } };
  const selectDay = () => { if (!isIsoDate(dateInput)) { setError('اكتب التاريخ بصيغة YYYY-MM-DD، مثل 2026-08-21.'); return; } setError(''); setDate(dateInput); };

  return <main dir="rtl" className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900"><section className="mx-auto max-w-6xl rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8"><Link href="/dashboard" className="text-sm font-medium text-sky-700 hover:underline">العودة إلى لوحة التحكم ←</Link><div className="mt-4 flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold text-teal-700">المواعيد والزيارات</p><h1 className="mt-1 text-3xl font-bold">جدول العيادة</h1><p className="mt-2 text-slate-600">حجز الموعد وتحديث حالة حضور المريض من مكان واحد.</p></div><label className="grid gap-1 text-sm font-medium">اليوم (ميلادي)<div className="flex gap-2" dir="ltr"><input type="text" inputMode="numeric" placeholder="2026-08-21" pattern="\d{4}-\d{2}-\d{2}" value={dateInput} onChange={(event) => setDateInput(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-300 p-2 text-slate-900" /><button type="button" onClick={selectDay} className="rounded-lg border border-teal-700 px-4 py-2 font-semibold text-teal-800 hover:bg-teal-50">عرض</button></div><span className="text-xs font-normal text-slate-500">مثال: 2026-08-21</span></label></div>{error && <p role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}{mayCreate && <form onSubmit={create} className="relative mt-6 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-3"><h2 className="sm:col-span-3 text-lg font-bold">حجز موعد جديد</h2><label className="relative grid gap-1 text-sm font-medium">ابحث عن المريض<input value={patient ? `${patient.firstName} ${patient.lastName}` : patientSearch} onChange={(event) => { setPatient(null); setPatientSearch(event.target.value); }} placeholder="الاسم أو الهاتف أو رقم الملف" className="rounded-lg border p-2 font-normal" />{matches.length > 0 && <ul className="absolute top-full z-10 mt-1 w-full overflow-hidden rounded-lg border bg-white shadow-lg">{matches.map((match) => <li key={match.id}><button type="button" onClick={() => { setPatient(match); setMatches([]); }} className="w-full px-3 py-2 text-right hover:bg-slate-50">{match.firstName} {match.lastName} <span className="text-xs text-slate-500">{match.medicalRecordNumber} · {match.phone}</span></button></li>)}</ul>}</label><label className="grid gap-1 text-sm font-medium">التاريخ (ميلادي)<input required type="text" inputMode="numeric" dir="ltr" placeholder="2026-08-21" pattern="\d{4}-\d{2}-\d{2}" value={scheduledDate} onChange={(event) => setScheduledDate(event.target.value)} className="rounded-lg border p-2 font-normal text-slate-900" /></label><label className="grid gap-1 text-sm font-medium">الوقت<input required type="time" lang="en" dir="ltr" value={scheduledTime} onChange={(event) => setScheduledTime(event.target.value)} className="rounded-lg border p-2 font-normal text-slate-900" /></label><label className="grid gap-1 text-sm font-medium">المدة<select value={durationMinutes} onChange={(event) => setDurationMinutes(event.target.value)} className="rounded-lg border p-2 font-normal"><option value="15">15 دقيقة</option><option value="30">30 دقيقة</option><option value="45">45 دقيقة</option><option value="60">ساعة</option></select></label><label className="grid gap-1 text-sm font-medium sm:col-span-2">سبب الزيارة<input value={reason} onChange={(event) => setReason(event.target.value)} maxLength={240} placeholder="كشف / متابعة / استشارة" className="rounded-lg border p-2 font-normal" /></label><button disabled={saving} className="self-end rounded-lg bg-teal-700 px-4 py-2 font-bold text-white hover:bg-teal-800 disabled:opacity-60">{saving ? 'جارٍ الحجز…' : 'حجز الموعد'}</button></form>}<div className="mt-6 overflow-hidden rounded-xl border border-slate-200"><div className="flex justify-between bg-slate-100 p-3 font-semibold"><span>مواعيد اليوم</span><span>{loading ? '…' : appointments.length}</span></div>{loading ? <p className="p-4 text-slate-600">جارٍ تحميل المواعيد…</p> : appointments.length ? <ul>{appointments.map((appointment) => <li key={appointment.id} className="flex flex-wrap items-center justify-between gap-4 border-t p-4"><span><span className="font-bold">{new Intl.DateTimeFormat('en-GB-u-nu-latn', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Africa/Cairo' }).format(new Date(appointment.scheduledAt))}</span><span className="mr-3">{appointment.patient.firstName} {appointment.patient.lastName}</span><span className="text-sm text-slate-500">{appointment.reason || 'بدون سبب مسجل'}</span></span><span className="flex items-center gap-2"><span className="rounded-full bg-slate-100 px-3 py-1 text-sm">{statuses[appointment.status] || appointment.status}</span>{mayUpdate && <select aria-label="Appointment status" value={appointment.status} onChange={(event) => void changeStatus(appointment.id, event.target.value)} className="rounded-lg border p-1 text-sm">{Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>}</span></li>)}</ul> : <p className="p-4 text-slate-600">لا توجد مواعيد في هذا اليوم.</p>}</div></section></main>;
}
