'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { authenticatedFetch, getAccessToken, hasSessionPermission } from '@/lib/auth-session';
import { getApiErrorMessage } from '@/lib/api-error';

type AuditLog = { id: string; action: string; entityType: string; summary: string; createdAt: string; actor: { firstName: string; lastName: string; email: string } | null };

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-GB-u-nu-latn', { dateStyle: 'medium', timeStyle: 'short', hour12: false, timeZone: 'Africa/Cairo' }).format(new Date(value));
}

export default function ActivityPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const allowed = hasSessionPermission('audit:read');

  useEffect(() => {
    if (!getAccessToken()) { window.location.replace('/login'); return; }
    if (!allowed) { setLoading(false); return; }
    void authenticatedFetch('/api/v1/audit-logs?take=100').then(async (response) => {
      if (!response.ok) throw new Error(await getApiErrorMessage(response, 'تعذر تحميل سجل النشاط.'));
      setLogs(await response.json() as AuditLog[]);
    }).catch((requestError: unknown) => setError(requestError instanceof Error ? requestError.message : 'تعذر تحميل سجل النشاط.')).finally(() => setLoading(false));
  }, [allowed]);

  return <main dir="rtl" className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900"><section className="mx-auto max-w-4xl rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8"><Link href="/dashboard" className="text-sm font-medium text-sky-700 hover:underline">العودة إلى لوحة التحكم ←</Link><h1 className="mt-4 text-3xl font-bold">سجل النشاط</h1><p className="mt-2 text-slate-600">متابعة أهم العمليات داخل هذه العيادة فقط، دون إظهار محتوى الملف الطبي أو بيانات الاتصال.</p>{!allowed ? <p className="mt-7 rounded-lg bg-amber-50 p-4 text-amber-900">ليس لديك صلاحية عرض سجل النشاط.</p> : error ? <p role="alert" className="mt-7 rounded-lg bg-red-50 p-4 text-red-700">{error}</p> : loading ? <p className="mt-7 text-slate-600">جارٍ تحميل سجل النشاط…</p> : logs.length === 0 ? <p className="mt-7 rounded-lg bg-slate-50 p-4 text-slate-600">لا توجد عمليات مسجلة بعد. سيظهر هنا أي إجراء جديد تقوم به من الآن، مثل إضافة مريض أو حجز موعد أو تصدير جمهور.</p> : <ul className="mt-7 overflow-hidden rounded-xl border border-slate-200">{logs.map((log) => <li key={log.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 last:border-0"><div><p className="font-semibold">{log.summary}</p><p className="mt-1 text-sm text-slate-500">{log.actor ? `${log.actor.firstName} ${log.actor.lastName}` : 'النظام'} · {log.action}</p></div><time dir="ltr" className="text-sm text-slate-500">{formatDate(log.createdAt)}</time></li>)}</ul>}</section></main>;
}
