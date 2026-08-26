'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { getApiErrorMessage } from '@/lib/api-error';
import { authenticatedFetch, getAccessToken, hasSessionPermission } from '@/lib/auth-session';

type Patient = { id: string; firstName: string; lastName: string; medicalRecordNumber: string; phone?: string | null };
type Doctor = { id: string; firstName: string; lastName: string; email: string };
type Visit = { id: string; status: string; startedAt: string; completedAt?: string | null; notes?: string | null };
type Appointment = { id: string; scheduledAt: string; durationMinutes: number; status: string; reason?: string | null; notes?: string | null; patient: Patient; doctor?: Doctor | null; visit?: Visit | null };
type RescheduleState = { id: string; date: string; time: string; doctorId: string };

const statuses: Record<string, string> = { scheduled: 'محجوز', confirmed: 'مؤكد', checked_in: 'وصل العيادة', completed: 'مكتمل', cancelled: 'ملغي', no_show: 'لم يحضر' };
const visitStatuses: Record<string, string> = { in_progress: 'داخل الزيارة', completed: 'الزيارة مكتملة', cancelled: 'الزيارة ملغاة' };
const localDate = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const localTime = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(11, 16); };
const isIsoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00`).getTime());
const formatTime = (value: string) => new Intl.DateTimeFormat('en-GB-u-nu-latn', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Africa/Cairo' }).format(new Date(value));

export default function AppointmentsPage() {
  const [date, setDate] = useState(localDate());
  const [dateInput, setDateInput] = useState(localDate());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [search, setSearch] = useState('');
  const [matches, setMatches] = useState<Patient[]>([]);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [scheduledDate, setScheduledDate] = useState(localDate());
  const [scheduledTime, setScheduledTime] = useState(localTime());
  const [duration, setDuration] = useState('30');
  const [reason, setReason] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [visitNotes, setVisitNotes] = useState<Record<string, string>>({});
  const [reschedule, setReschedule] = useState<RescheduleState | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workingId, setWorkingId] = useState('');
  const mayCreate = hasSessionPermission('appointment:create');
  const mayUpdate = hasSessionPermission('appointment:update');

  const load = async (selected = date) => {
    if (!getAccessToken()) { window.location.replace('/login'); return; }
    setLoading(true); setError('');
    try {
      const response = await authenticatedFetch(`/api/v1/appointments?from=${selected}`);
      if (!response.ok) throw new Error(await getApiErrorMessage(response, 'تعذر تحميل المواعيد.'));
      setAppointments(await response.json() as Appointment[]);
    } catch (reasonValue) { setError(reasonValue instanceof Error ? reasonValue.message : 'تعذر تحميل المواعيد.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  useEffect(() => {
    if (!getAccessToken()) return;
    void authenticatedFetch('/api/v1/appointments/doctors').then(async (response) => {
      if (response.ok) setDoctors(await response.json() as Doctor[]);
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(async () => {
      if (search.trim().length < 2 || patient) { setMatches([]); return; }
      try {
        const response = await authenticatedFetch(`/api/v1/patients?search=${encodeURIComponent(search.trim())}`);
        if (response.ok) setMatches((await response.json() as Patient[]).slice(0, 8));
      } catch { /* optional lookup */ }
    }, 250);
    return () => window.clearTimeout(handle);
  }, [search, patient]);

  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!patient) { setError('اختر المريض من نتائج البحث أولًا.'); return; }
    if (!isIsoDate(scheduledDate)) { setError('اكتب التاريخ بصيغة YYYY-MM-DD.'); return; }
    setSaving(true); setError('');
    try {
      const response = await authenticatedFetch('/api/v1/appointments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ patientId: patient.id, doctorId: doctorId || undefined, scheduledAt: new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString(), durationMinutes: Number(duration), reason: reason || undefined }) });
      if (!response.ok) throw new Error(await getApiErrorMessage(response, 'تعذر حجز الموعد.'));
      setPatient(null); setSearch(''); setReason(''); setDoctorId(''); setScheduledDate(date); setScheduledTime(localTime()); await load(date);
    } catch (reasonValue) { setError(reasonValue instanceof Error ? reasonValue.message : 'تعذر حجز الموعد.'); }
    finally { setSaving(false); }
  };

  const changeStatus = async (id: string, status: string) => {
    setWorkingId(id); setError('');
    try {
      const response = await authenticatedFetch(`/api/v1/appointments/${id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
      if (!response.ok) throw new Error(await getApiErrorMessage(response, 'تعذر تحديث الموعد.'));
      await load(date);
    } catch (reasonValue) { setError(reasonValue instanceof Error ? reasonValue.message : 'تعذر تحديث الموعد.'); }
    finally { setWorkingId(''); }
  };

  const checkIn = async (id: string) => {
    setWorkingId(id); setError('');
    try {
      const response = await authenticatedFetch(`/api/v1/appointments/${id}/check-in`, { method: 'POST' });
      if (!response.ok) throw new Error(await getApiErrorMessage(response, 'تعذر تسجيل وصول المريض.'));
      await load(date);
    } catch (reasonValue) { setError(reasonValue instanceof Error ? reasonValue.message : 'تعذر تسجيل وصول المريض.'); }
    finally { setWorkingId(''); }
  };

  const saveReschedule = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!reschedule || !isIsoDate(reschedule.date)) { setError('اكتب تاريخ إعادة الجدولة بصيغة YYYY-MM-DD.'); return; }
    setWorkingId(reschedule.id); setError('');
    try {
      const response = await authenticatedFetch(`/api/v1/appointments/${reschedule.id}/reschedule`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scheduledAt: new Date(`${reschedule.date}T${reschedule.time}:00`).toISOString(), doctorId: reschedule.doctorId || undefined }) });
      if (!response.ok) throw new Error(await getApiErrorMessage(response, 'تعذر إعادة جدولة الموعد.'));
      setReschedule(null); await load(date);
    } catch (reasonValue) { setError(reasonValue instanceof Error ? reasonValue.message : 'تعذر إعادة جدولة الموعد.'); }
    finally { setWorkingId(''); }
  };

  const updateVisit = async (appointmentId: string, status: string) => {
    setWorkingId(appointmentId); setError('');
    try {
      const response = await authenticatedFetch(`/api/v1/appointments/${appointmentId}/visit`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status, notes: visitNotes[appointmentId] || undefined }) });
      if (!response.ok) throw new Error(await getApiErrorMessage(response, 'تعذر تحديث الزيارة.'));
      await load(date);
    } catch (reasonValue) { setError(reasonValue instanceof Error ? reasonValue.message : 'تعذر تحديث الزيارة.'); }
    finally { setWorkingId(''); }
  };

  const selectDay = () => { if (!isIsoDate(dateInput)) { setError('اكتب التاريخ بصيغة YYYY-MM-DD، مثال 2026-08-21.'); return; } setDate(dateInput); };
  const beginReschedule = (appointment: Appointment) => setReschedule({ id: appointment.id, date: new Date(appointment.scheduledAt).toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' }), time: formatTime(appointment.scheduledAt), doctorId: appointment.doctor?.id ?? '' });

  return <main dir="rtl" className="min-h-screen bg-[#f5f9fd] px-4 py-8 text-slate-900"><section className="mx-auto max-w-6xl rounded-3xl bg-white p-6 shadow-sm ring-1 ring-[#dce7f1] sm:p-8"><Link href="/dashboard" className="text-sm font-bold text-[#176b9d] hover:underline">← العودة إلى لوحة التحكم</Link><div className="mt-5 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-extrabold tracking-[0.16em] text-[#16839a]">SCHEDULING & VISITS</p><h1 className="mt-2 text-3xl font-black">Appointment Desk · جدول المواعيد</h1><p className="mt-2 text-slate-600">الحجز، تعيين الطبيب، استقبال المريض، وإغلاق الزيارة في مسار واحد.</p></div><label className="grid gap-1 text-sm font-bold">تاريخ العرض<div className="flex gap-2" dir="ltr"><input value={dateInput} onChange={(event) => setDateInput(event.target.value)} placeholder="2026-08-21" className="field min-w-0 flex-1 font-normal" /><button type="button" onClick={selectDay} className="rounded-xl border border-[#176b9d] px-4 py-2 font-bold text-[#176b9d] hover:bg-blue-50">عرض</button></div><span className="text-xs font-normal text-slate-500">YYYY-MM-DD</span></label></div>{error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-red-700">{error}</p>}
  {mayCreate && <form onSubmit={create} className="relative mt-7 grid gap-4 rounded-2xl border border-blue-100 bg-[#f7fbff] p-5 sm:grid-cols-4"><div className="sm:col-span-4"><p className="text-xs font-extrabold tracking-[0.14em] text-[#16839a]">NEW APPOINTMENT</p><h2 className="mt-1 text-lg font-black">حجز موعد جديد</h2><p className="mt-1 text-sm text-slate-600">ابحث عن المريض، اختر الطبيب إن لزم، ثم حدّد وقت الزيارة وسببها.</p></div><label className="relative grid gap-1 text-sm font-bold sm:col-span-2">Patient search · بحث المريض<input value={patient ? `${patient.firstName} ${patient.lastName}` : search} onChange={(event) => { setPatient(null); setSearch(event.target.value); }} placeholder="الاسم أو رقم الهاتف أو MRN" className="field font-normal" />{matches.length > 0 && <ul className="absolute top-full z-10 mt-1 w-full overflow-hidden rounded-xl border bg-white shadow-lg">{matches.map((match) => <li key={match.id}><button type="button" onClick={() => { setPatient(match); setMatches([]); }} className="w-full px-3 py-3 text-right hover:bg-slate-50"><b>{match.firstName} {match.lastName}</b><span className="mr-2 text-xs text-slate-500">{match.medicalRecordNumber} · {match.phone}</span></button></li>)}</ul>}</label><label className="grid gap-1 text-sm font-bold">الطبيب<select value={doctorId} onChange={(event) => setDoctorId(event.target.value)} className="field font-normal"><option value="">بدون تعيين</option>{doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.firstName} {doctor.lastName}</option>)}</select></label><label className="grid gap-1 text-sm font-bold">التاريخ<input required dir="ltr" value={scheduledDate} onChange={(event) => setScheduledDate(event.target.value)} className="field font-normal" /></label><label className="grid gap-1 text-sm font-bold">الوقت<input required type="time" dir="ltr" value={scheduledTime} onChange={(event) => setScheduledTime(event.target.value)} className="field font-normal" /></label><label className="grid gap-1 text-sm font-bold">مدة الزيارة<select value={duration} onChange={(event) => setDuration(event.target.value)} className="field font-normal"><option value="15">15 دقيقة</option><option value="30">30 دقيقة</option><option value="45">45 دقيقة</option><option value="60">60 دقيقة</option></select></label><label className="grid gap-1 text-sm font-bold sm:col-span-2">سبب الزيارة<input value={reason} onChange={(event) => setReason(event.target.value)} maxLength={240} placeholder="Consultation / Follow-up / كشف" className="field font-normal" /></label><button disabled={saving} className="self-end rounded-xl bg-[#176b9d] px-4 py-3 font-bold text-white hover:bg-[#125b86] disabled:opacity-60">{saving ? 'جارٍ الحجز…' : 'تأكيد الموعد'}</button></form>}
  <section className="mt-7 overflow-hidden rounded-2xl border border-[#dce7f1]"><div className="flex justify-between bg-[#eef6fc] p-4 font-black"><span>Appointments · المواعيد</span><span>{loading ? '…' : appointments.length}</span></div>{loading ? <p className="p-5 text-slate-600">جارٍ تحميل المواعيد…</p> : appointments.length ? <ul>{appointments.map((appointment) => <li key={appointment.id} className="border-t border-slate-100 p-5"><div className="flex flex-wrap items-start justify-between gap-4"><span><b className="font-mono">{formatTime(appointment.scheduledAt)}</b><b className="mr-3">{appointment.patient.firstName} {appointment.patient.lastName}</b><span className="mr-3 text-sm text-slate-500">{appointment.reason || 'بدون سبب مسجل'}</span><span className="mr-3 text-sm text-slate-500">{appointment.doctor ? `د. ${appointment.doctor.firstName} ${appointment.doctor.lastName}` : 'بدون طبيب'}</span></span><span className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold">{statuses[appointment.status] || appointment.status}</span>{mayUpdate && <select aria-label="Appointment status" value={appointment.status} disabled={workingId === appointment.id} onChange={(event) => void changeStatus(appointment.id, event.target.value)} className="rounded-lg border border-slate-300 bg-white p-2 text-sm">{Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>}</span></div>{mayUpdate && <div className="mt-4 flex flex-wrap gap-2">{!appointment.visit && !['completed', 'cancelled', 'no_show'].includes(appointment.status) && <button type="button" disabled={workingId === appointment.id} onClick={() => void checkIn(appointment.id)} className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-60">تسجيل الوصول وبدء الزيارة</button>}{!appointment.visit && ['scheduled', 'confirmed'].includes(appointment.status) && <button type="button" onClick={() => beginReschedule(appointment)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">إعادة الجدولة</button>}</div>}{reschedule?.id === appointment.id && <form onSubmit={saveReschedule} className="mt-4 grid gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-4"><input required dir="ltr" value={reschedule.date} onChange={(event) => setReschedule({ ...reschedule, date: event.target.value })} className="field" /><input required type="time" dir="ltr" value={reschedule.time} onChange={(event) => setReschedule({ ...reschedule, time: event.target.value })} className="field" /><select value={reschedule.doctorId} onChange={(event) => setReschedule({ ...reschedule, doctorId: event.target.value })} className="field"><option value="">بدون طبيب</option>{doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.firstName} {doctor.lastName}</option>)}</select><div className="flex gap-2"><button disabled={workingId === appointment.id} className="rounded-lg bg-[#176b9d] px-3 py-2 text-sm font-bold text-white">حفظ</button><button type="button" onClick={() => setReschedule(null)} className="rounded-lg border px-3 py-2 text-sm font-bold">إلغاء</button></div></form>}{appointment.visit && <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/50 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><p className="font-bold">الزيارة: {visitStatuses[appointment.visit.status] || appointment.visit.status}</p>{mayUpdate && <select value={appointment.visit.status} disabled={workingId === appointment.id} onChange={(event) => void updateVisit(appointment.id, event.target.value)} className="rounded-lg border border-slate-300 bg-white p-2 text-sm">{Object.entries(visitStatuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>}</div>{mayUpdate && <div className="mt-3 flex gap-2"><input value={visitNotes[appointment.id] ?? appointment.visit.notes ?? ''} onChange={(event) => setVisitNotes({ ...visitNotes, [appointment.id]: event.target.value })} maxLength={5000} placeholder="ملاحظة تشغيلية للزيارة" className="field flex-1 font-normal" /><button type="button" disabled={workingId === appointment.id} onClick={() => void updateVisit(appointment.id, appointment.visit?.status ?? 'in_progress')} className="rounded-lg border border-emerald-700 px-3 py-2 text-sm font-bold text-emerald-800">حفظ الملاحظة</button></div>}</div>}</li>)}</ul> : <p className="p-5 text-slate-600">لا توجد مواعيد في هذا اليوم.</p>}</section></section></main>;
}
