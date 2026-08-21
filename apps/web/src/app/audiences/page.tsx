'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { getApiErrorMessage } from '@/lib/api-error';
import { authenticatedFetch, getAccessToken } from '@/lib/auth-session';

type Filters = { governorate: string; city: string; gender: string; leadSource: string; minAge: string; maxAge: string };
type Audience = { total: number; samples: Array<{ id: string; firstName: string; lastName: string; phone?: string | null; city?: string | null; governorate?: string | null; leadSource?: string | null }> };
const initialFilters: Filters = { governorate: '', city: '', gender: '', leadSource: '', minAge: '', maxAge: '' };

function queryString(filters: Filters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => { if (value.trim()) params.set(key, value.trim()); });
  return params.toString();
}

export default function AudiencesPage() {
  const [filters, setFilters] = useState(initialFilters);
  const [audience, setAudience] = useState<Audience | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  const load = async (currentFilters = filters) => {
    if (!getAccessToken()) { window.location.replace('/login'); return; }
    setLoading(true); setError('');
    try {
      const query = queryString(currentFilters);
      const response = await authenticatedFetch(`/api/v1/patients/marketing-audience${query ? `?${query}` : ''}`);
      if (!response.ok) throw new Error(await getApiErrorMessage(response, 'تعذر تحميل الجمهور التسويقي.'));
      setAudience(await response.json() as Audience);
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'تعذر تحميل الجمهور التسويقي.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(initialFilters); }, []);

  const apply = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void load(); };
  const download = async () => {
    setDownloading(true); setError('');
    try {
      const query = queryString(filters);
      const response = await authenticatedFetch(`/api/v1/patients/marketing-audience/export${query ? `?${query}` : ''}`);
      if (!response.ok) throw new Error(await getApiErrorMessage(response, 'تعذر تصدير الجمهور.'));
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a'); link.href = url; link.download = 'clinicos-consented-audience.csv'; link.click(); URL.revokeObjectURL(url);
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'تعذر تصدير الجمهور.'); }
    finally { setDownloading(false); }
  };

  return <main dir="rtl" className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900"><section className="mx-auto max-w-5xl rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8"><Link href="/dashboard" className="text-sm font-medium text-sky-700 hover:underline">العودة إلى لوحة التحكم ←</Link><div className="mt-4 flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-semibold text-emerald-700">الجمهور التسويقي</p><h1 className="mt-1 text-3xl font-bold">جمهور مبني على الموافقة</h1><p className="mt-2 max-w-3xl text-slate-600">هذه الصفحة لا تضم إلا المرضى الذين سجّل النظام لديهم موافقة تسويقية صريحة. لا تستخدم أي قائمة خارج الغرض المصرح به.</p></div><div className="rounded-xl bg-emerald-50 px-5 py-3 text-center"><p className="text-sm text-emerald-800">المطابقون للفلاتر</p><p className="text-3xl font-bold text-emerald-900">{loading ? '…' : (audience?.total ?? 0).toLocaleString('en-US')}</p></div></div><form onSubmit={apply} className="mt-6 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-3"><label className="grid gap-1 text-sm font-medium">المحافظة<input value={filters.governorate} onChange={(event) => setFilters({ ...filters, governorate: event.target.value })} className="rounded-lg border border-slate-300 p-2 font-normal" /></label><label className="grid gap-1 text-sm font-medium">المدينة / المنطقة<input value={filters.city} onChange={(event) => setFilters({ ...filters, city: event.target.value })} className="rounded-lg border border-slate-300 p-2 font-normal" /></label><label className="grid gap-1 text-sm font-medium">مصدر العميل<input value={filters.leadSource} onChange={(event) => setFilters({ ...filters, leadSource: event.target.value })} className="rounded-lg border border-slate-300 p-2 font-normal" /></label><label className="grid gap-1 text-sm font-medium">النوع<select value={filters.gender} onChange={(event) => setFilters({ ...filters, gender: event.target.value })} className="rounded-lg border border-slate-300 p-2 font-normal"><option value="">الكل</option><option value="female">أنثى</option><option value="male">ذكر</option></select></label><label className="grid gap-1 text-sm font-medium">أقل عمر<input type="number" min="0" max="130" value={filters.minAge} onChange={(event) => setFilters({ ...filters, minAge: event.target.value })} className="rounded-lg border border-slate-300 p-2 font-normal" /></label><label className="grid gap-1 text-sm font-medium">أكبر عمر<input type="number" min="0" max="130" value={filters.maxAge} onChange={(event) => setFilters({ ...filters, maxAge: event.target.value })} className="rounded-lg border border-slate-300 p-2 font-normal" /></label><div className="flex flex-wrap gap-3 sm:col-span-3"><button className="rounded-lg bg-sky-700 px-4 py-2 font-medium text-white hover:bg-sky-800">تطبيق الفلاتر</button><button type="button" disabled={downloading || loading || !audience?.total} onClick={() => void download()} className="rounded-lg bg-emerald-700 px-4 py-2 font-medium text-white hover:bg-emerald-800 disabled:opacity-50">{downloading ? 'جارٍ تجهيز الملف…' : 'تصدير CSV للجمهور الموافق'}</button></div></form>{error && <p role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}<div className="mt-6 overflow-hidden rounded-xl border border-slate-200"><div className="bg-slate-100 p-3 text-sm font-semibold">معاينة أول 10 سجلات</div>{loading ? <p className="p-4 text-slate-600">جارٍ تحميل الجمهور…</p> : audience?.samples.length ? <ul>{audience.samples.map((patient) => <li key={patient.id} className="flex flex-wrap items-center justify-between gap-2 border-t p-4"><span className="font-medium">{patient.firstName} {patient.lastName}</span><span className="text-sm text-slate-600" dir="ltr">{patient.phone || '—'}</span><span className="text-sm text-slate-600">{[patient.city, patient.governorate, patient.leadSource].filter(Boolean).join(' · ') || '—'}</span></li>)}</ul> : <p className="p-4 text-slate-600">لا توجد سجلات لديها موافقة تسويقية مطابقة لهذه الفلاتر.</p>}</div></section></main>;
}
