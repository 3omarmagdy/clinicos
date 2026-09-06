'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Reminder = { id: string; channel: string; status: string; scheduledAt: string; sentAt?: string | null; error?: string | null; patient: { firstName: string; lastName: string; email?: string | null }; appointment: { scheduledAt: string; status: string; service?: { name: string } | null } };

const labels: Record<string, string> = { pending: 'قيد الانتظار', sent: 'تم الإرسال', failed: 'فشل', skipped: 'تم التجاوز' };

export default function RemindersPage() {
  const [items, setItems] = useState<Reminder[]>([]);
  const [message, setMessage] = useState('جارٍ التحميل…');

  useEffect(() => {
    const token = window.localStorage.getItem('token');
    if (!token) { window.location.replace('/login'); return; }
    const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
    void fetch(`${api}/api/v1/reminders`, { headers: { Authorization: `Bearer ${token}` } }).then(async (response) => {
      if (!response.ok) throw new Error('تعذر تحميل التذكيرات');
      return response.json() as Promise<Reminder[]>;
    }).then((data) => { setItems(data); setMessage(data.length ? '' : 'لا توجد تذكيرات مسجلة بعد.'); }).catch((error: unknown) => setMessage(error instanceof Error ? error.message : 'تعذر تحميل التذكيرات'));
  }, []);

  return <main dir="rtl" className="min-h-screen bg-slate-50 px-4 py-10"><section className="mx-auto max-w-5xl rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200"><Link href="/dashboard" className="text-sky-700">العودة للوحة التحكم ←</Link><h1 className="mt-5 text-3xl font-bold text-slate-950">تذكيرات المواعيد</h1><p className="mt-2 text-slate-600">يتم إرسال التذكير بالبريد الإلكتروني تلقائيًا قبل الموعد. واتساب وSMS يمكن إضافتهما لاحقًا بنفس النظام.</p>{message && <p className="mt-6 rounded-lg bg-slate-100 p-4 text-slate-700">{message}</p>}<div className="mt-6 overflow-x-auto"><table className="w-full text-right text-sm"><thead><tr className="border-b text-slate-500"><th className="p-3">المريض</th><th className="p-3">الخدمة</th><th className="p-3">موعد التذكير</th><th className="p-3">القناة</th><th className="p-3">الحالة</th></tr></thead><tbody>{items.map((item) => <tr key={item.id} className="border-b last:border-0"><td className="p-3">{item.patient.firstName} {item.patient.lastName}<div className="text-xs text-slate-500">{item.patient.email}</div></td><td className="p-3">{item.appointment.service?.name ?? 'موعد'}</td><td className="p-3">{new Date(item.scheduledAt).toLocaleString('ar-EG')}</td><td className="p-3">البريد الإلكتروني</td><td className="p-3"><span className={item.status === 'sent' ? 'text-emerald-700' : item.status === 'failed' ? 'text-red-700' : 'text-amber-700'}>{labels[item.status] ?? item.status}</span>{item.error && <div className="text-xs text-red-600">{item.error}</div>}</td></tr>)}</tbody></table></div></section></main>;
}
