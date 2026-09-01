'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { getApiErrorMessage } from '@/lib/api-error';
import { authenticatedFetch, getAccessToken, hasSessionPermission } from '@/lib/auth-session';

type Appointment = {
  id: string;
  scheduledAt: string;
  status: string;
  patient: { firstName: string; lastName: string; phone?: string | null };
  service?: { name: string } | null;
};

const cairoToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(new Date());
const cairoTime = (value: string) => new Intl.DateTimeFormat('en-GB-u-nu-latn', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Africa/Cairo' }).format(new Date(value));

export default function WhatsAppTestPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const allowed = hasSessionPermission('organization:update');

  const load = useCallback(async () => {
    if (!getAccessToken()) { window.location.replace('/login'); return; }
    setLoading(true); setError('');
    try {
      const response = await authenticatedFetch(`/api/v1/appointments?from=${cairoToday()}`);
      if (!response.ok) throw new Error(await getApiErrorMessage(response, 'تعذر تحميل مواعيد اليوم.'));
      setAppointments((await response.json() as Appointment[]).filter((appointment) => ['scheduled', 'confirmed'].includes(appointment.status)));
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'تعذر تحميل مواعيد اليوم.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const sendTest = async (appointment: Appointment) => {
    const patientName = `${appointment.patient.firstName} ${appointment.patient.lastName}`.trim();
    if (!window.confirm(`سيتم إرسال رسالة تذكير WhatsApp واحدة إلى ${patientName} على الرقم المسجل في ملفه. هل تؤكد الإرسال؟`)) return;

    setSendingId(appointment.id); setError(''); setNotice('');
    try {
      const response = await authenticatedFetch('/api/v1/whatsapp/reminders/test', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ appointmentId: appointment.id, confirm: true }),
      });
      if (!response.ok) throw new Error(await getApiErrorMessage(response, 'تعذر إرسال رسالة الاختبار.'));
      const result = await response.json() as { status: string; reason?: string };
      if (result.status !== 'sent') {
        const message = result.reason === 'missing_or_invalid_phone' ? 'رقم WhatsApp للمريض غير صالح.' : result.reason === 'whatsapp_not_configured' ? 'ربط WhatsApp غير مكتمل لهذه العيادة.' : 'لم تُرسل رسالة الاختبار.';
        throw new Error(message);
      }
      setNotice('تم قبول رسالة الاختبار من Meta. افحص WhatsApp على هاتف المريض خلال لحظات.');
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'تعذر إرسال رسالة الاختبار.'); }
    finally { setSendingId(''); }
  };

  if (!allowed) return <main dir="rtl" className="min-h-screen bg-[#f5f9fd] p-8"><p className="mx-auto max-w-2xl rounded-2xl bg-amber-50 p-5 text-amber-800">اختبار WhatsApp متاح لمالك العيادة أو المشرف فقط.</p></main>;

  return <main dir="rtl" className="min-h-screen bg-[#f5f9fd] px-4 py-8 text-slate-900"><section className="mx-auto max-w-3xl rounded-3xl bg-white p-6 shadow-sm ring-1 ring-[#dce7f1] sm:p-8"><Link href="/appointments" className="text-sm font-bold text-[#176b9d] hover:underline">← العودة إلى المواعيد</Link><p className="mt-6 text-xs font-extrabold tracking-[.16em] text-[#16839a]">SINGLE MESSAGE TEST</p><h1 className="mt-2 text-3xl font-black text-[#10233d]">اختبار تذكير WhatsApp</h1><p className="mt-3 leading-7 text-slate-600">هذه الشاشة ترسل رسالة تذكير واحدة فقط إلى مريض لديه موعد اليوم وموافقة موثقة. لا تفعّل الإرسال العام ولا تشغّل أي حملة.</p>{error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}{notice && <p role="status" className="mt-5 rounded-xl bg-emerald-50 p-4 text-emerald-800">{notice}</p>}<section className="mt-6 overflow-hidden rounded-2xl border border-[#dce7f1]">{loading ? <p className="p-5 text-slate-600">جارٍ تحميل المواعيد…</p> : appointments.length ? <ul>{appointments.map((appointment) => <li key={appointment.id} className="flex flex-wrap items-center justify-between gap-4 border-b p-5 last:border-0"><div><p className="font-black">{appointment.patient.firstName} {appointment.patient.lastName}</p><p className="mt-1 text-sm text-slate-600">{cairoTime(appointment.scheduledAt)} · {appointment.service?.name || 'موعد'}</p></div><button type="button" disabled={sendingId === appointment.id} onClick={() => void sendTest(appointment)} className="rounded-xl bg-[#176b9d] px-4 py-3 font-bold text-white hover:bg-[#125b86] disabled:opacity-60">{sendingId === appointment.id ? 'جارٍ الإرسال…' : 'إرسال اختبار واحد'}</button></li>)}</ul> : <p className="p-5 text-slate-600">لا يوجد موعد محجوز أو مؤكد اليوم لإرسال اختبار عليه.</p>}</section></section></main>;
}
