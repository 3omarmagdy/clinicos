'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { getApiErrorMessage } from '@/lib/api-error';
import { authenticatedFetch, getAccessToken } from '@/lib/auth-session';

type Patient = { id: string; firstName: string; lastName: string; phone?: string | null; whatsappPhone?: string | null; status: string };

function normalisePhone(phone?: string | null) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('20') && digits.length === 12) return digits;
  if (digits.startsWith('01') && digits.length === 11) return `20${digits.slice(1)}`;
  return digits.length >= 10 && digits.length <= 15 ? digits : null;
}

export default function CampaignsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [message, setMessage] = useState('مرحبًا {{اسم المريض}}، معك {{اسم العيادة}}.');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!getAccessToken()) { window.location.replace('/login'); return; }
    void authenticatedFetch('/api/v1/patients')
      .then(async (response) => {
        if (!response.ok) throw new Error(await getApiErrorMessage(response, 'تعذر تحميل ملفات المرضى.'));
        setPatients(await response.json() as Patient[]);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'تعذر تحميل ملفات المرضى.'))
      .finally(() => setLoading(false));
  }, []);

  const matchingPatients = useMemo(() => {
    const value = query.trim().toLowerCase();
    return patients.filter((patient) => {
      const name = `${patient.firstName} ${patient.lastName}`.toLowerCase();
      return patient.status === 'active' && normalisePhone(patient.whatsappPhone || patient.phone) !== null && (!value || name.includes(value) || (patient.phone || '').includes(value));
    });
  }, [patients, query]);

  const whatsappUrl = (patient: Patient) => {
    const phone = normalisePhone(patient.whatsappPhone || patient.phone);
    if (!phone) return '#';
    const personalMessage = message
      .split('{{اسم المريض}}').join(`${patient.firstName} ${patient.lastName}`.trim())
      .split('{{اسم العيادة}}').join('العيادة');
    return `https://wa.me/${phone}?text=${encodeURIComponent(personalMessage)}`;
  };

  return (
    <main dir="rtl" className="clinicos-shell min-h-screen px-4 py-8 text-[#0b1f33] sm:px-8">
      <section className="mx-auto max-w-6xl">
        <Link href="/dashboard" className="text-sm font-bold text-[#1268a6] hover:underline">← العودة إلى لوحة التحكم</Link>
        <header className="clinicos-grid mt-5 rounded-[1.7rem] bg-[#0b1f33] px-7 py-9 text-white">
          <p className="text-xs font-bold tracking-[.16em] text-teal-200">PATIENT COMMUNICATION</p>
          <h1 className="mt-3 text-3xl font-bold">تواصل مباشر مع مرضى العيادة</h1>
          <p className="mt-3 max-w-3xl leading-8 text-slate-300">اختر حالة مسجلة في عيادتك وافتح محادثتها من الرقم المحفوظ في ملفها. يفتح WhatsApp على جهازك أنت؛ لا يرسل Clinicos أي رسالة تلقائيًا ولا يستخدم أرقامًا من خارج ملفات العيادة.</p>
        </header>
        {error ? <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-red-700">{error}</p> : null}
        <section className="mt-6 grid gap-5 lg:grid-cols-[.9fr_1.1fr]">
          <aside className="clinicos-card rounded-2xl p-6">
            <p className="text-xs font-bold tracking-[.14em] text-[#0a948d]">MESSAGE DRAFT</p>
            <h2 className="mt-2 text-xl font-bold">اكتب نصًا جاهزًا</h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">يمكنك استخدام <b>{'{{اسم المريض}}'}</b>، ثم تراجع الرسالة وتضغط إرسال بنفسك داخل WhatsApp.</p>
            <textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={800} className="field mt-5 min-h-40 w-full font-normal" aria-label="نص الرسالة" />
            <div className="mt-5 rounded-xl border border-[#cde9e5] bg-[#f0fbf9] p-4 text-sm leading-7 text-[#0b625c]">هذه ميزة تواصل فردي يدوي. لا يوجد إرسال دفعات أو حملة تلقائية هنا، لذلك لا تعتمد على تكامل Meta أو على موافقات تسويقية داخل النظام.</div>
          </aside>
          <section className="clinicos-card rounded-2xl p-6">
            <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold tracking-[.14em] text-[#1268a6]">SAVED PATIENTS</p><h2 className="mt-2 text-xl font-bold">ملفات المرضى ذات الأرقام المحفوظة</h2></div><span className="rounded-full bg-[#dff7f3] px-3 py-1 text-sm font-bold text-[#087e76]">{matchingPatients.length.toLocaleString('ar-EG')} حالة</span></div>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث بالاسم أو رقم الهاتف" className="field mt-5 w-full" aria-label="البحث عن مريض" />
            {loading ? <p className="mt-5 text-slate-500">جارٍ تحميل الحالات…</p> : matchingPatients.length ? <div className="mt-4 grid gap-3 sm:grid-cols-2">{matchingPatients.map((patient) => <article key={patient.id} className="rounded-2xl border border-slate-100 bg-[#fbfdff] p-4"><p className="font-bold">{patient.firstName} {patient.lastName}</p><p dir="ltr" className="mt-1 text-sm text-slate-500">{patient.whatsappPhone || patient.phone}</p><a href={whatsappUrl(patient)} target="_blank" rel="noreferrer" className="mt-4 inline-flex rounded-xl bg-[#128c7e] px-4 py-2 text-sm font-bold text-white hover:bg-[#0d756a]">فتح محادثة WhatsApp</a></article>)}</div> : <p className="mt-5 rounded-xl bg-slate-50 p-4 text-slate-500">لا توجد حالات نشطة برقم هاتف صالح يطابق بحثك.</p>}
          </section>
        </section>
      </section>
    </main>
  );
}
