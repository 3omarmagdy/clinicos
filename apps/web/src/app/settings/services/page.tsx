'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { getApiErrorMessage } from '@/lib/api-error';
import { authenticatedFetch, getAccessToken, hasSessionPermission } from '@/lib/auth-session';

type Service = { id: string; name: string; specialty: string; durationMinutes: number; price: number | null; isActive: boolean };

const specialtyLabels: Record<string, string> = { GENERAL: 'طب عام', DENTAL: 'أسنان', SURGERY: 'جراحة', RADIOLOGY: 'أشعة', OBGYN: 'نساء وتوليد', OPHTHALMOLOGY: 'عيون وليزك', UROLOGY: 'مسالك بولية', BEAUTY: 'تجميل وبيوتي' };
const emptyForm = { name: '', durationMinutes: '30', price: '' };

export default function ServicesSettingsPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [specialty, setSpecialty] = useState('GENERAL');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const allowed = hasSessionPermission('organization:update');

  const load = async () => {
    if (!getAccessToken()) { window.location.replace('/login'); return; }
    try {
      const [servicesResponse, organizationResponse] = await Promise.all([authenticatedFetch('/api/v1/organizations/me/services'), authenticatedFetch('/api/v1/users/me')]);
      if (!servicesResponse.ok) throw new Error(await getApiErrorMessage(servicesResponse, 'تعذر تحميل الخدمات.'));
      setServices(await servicesResponse.json() as Service[]);
      if (organizationResponse.ok) {
        const user = await organizationResponse.json() as { organizationId: string };
        const orgResponse = await authenticatedFetch(`/api/v1/organizations/${user.organizationId}`);
        if (orgResponse.ok) setSpecialty((await orgResponse.json() as { specialty?: string }).specialty || 'GENERAL');
      }
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'تعذر تحميل الخدمات.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSaving(true); setError(''); setNotice('');
    try {
      const payload = { name: form.name.trim(), durationMinutes: Number(form.durationMinutes), ...(form.price ? { price: Number(form.price) } : {}) };
      const response = await authenticatedFetch(editingId ? `/api/v1/organizations/me/services/${editingId}` : '/api/v1/organizations/me/services', { method: editingId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error(await getApiErrorMessage(response, 'تعذر حفظ الخدمة.'));
      setNotice(editingId ? 'تم تعديل الخدمة.' : 'تمت إضافة الخدمة.'); setForm(emptyForm); setEditingId(null); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'تعذر حفظ الخدمة.'); }
    finally { setSaving(false); }
  };

  const deactivate = async (service: Service) => {
    if (!window.confirm(`هل تريد تعطيل خدمة «${service.name}»؟`)) return;
    setError(''); setNotice('');
    try {
      const response = await authenticatedFetch(`/api/v1/organizations/me/services/${service.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(await getApiErrorMessage(response, 'تعذر تعطيل الخدمة.'));
      setNotice('تم تعطيل الخدمة ولن تظهر في الحجوزات الجديدة.'); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'تعذر تعطيل الخدمة.'); }
  };

  const edit = (service: Service) => { setEditingId(service.id); setForm({ name: service.name, durationMinutes: String(service.durationMinutes), price: service.price === null ? '' : String(service.price) }); setNotice(''); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  return <main dir="rtl" className="min-h-screen bg-[#f5f9fd] px-4 py-8 text-slate-900"><section className="mx-auto max-w-5xl rounded-3xl bg-white p-6 shadow-sm ring-1 ring-[#dce7f1] sm:p-8"><Link href="/dashboard" className="text-sm font-bold text-[#176b9d] hover:underline">← العودة إلى لوحة التحكم</Link><header className="mt-5"><p className="text-xs font-extrabold tracking-[.16em] text-[#16839a]">SERVICE CATALOG</p><h1 className="mt-2 text-3xl font-black">كتالوج خدمات العيادة</h1><p className="mt-2 text-slate-600">أضف وعدّل خدمات تخصصك. الخدمات هنا تخص عيادتك فقط وتظهر في الحجز والعروض التسويقية.</p><p className="mt-3 inline-flex rounded-full bg-[#f0fbf9] px-3 py-1 text-sm font-bold text-[#087d78]">التخصص الحالي: {specialtyLabels[specialty] || specialty}</p></header>{error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-red-700">{error}</p>}{notice && <p role="status" className="mt-5 rounded-xl bg-emerald-50 p-3 text-emerald-800">{notice}</p>}{!allowed ? <p className="mt-8 rounded-2xl bg-amber-50 p-5 text-amber-900">إدارة الخدمات متاحة لمالك أو مدير العيادة فقط.</p> : <><form onSubmit={save} className="mt-7 grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:grid-cols-[1.5fr_1fr_1fr_auto]"><label className="grid gap-1 text-sm font-bold">اسم الخدمة<input required minLength={2} maxLength={160} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="مثال: حشو عصب" className="field font-normal" /></label><label className="grid gap-1 text-sm font-bold">المدة بالدقائق<input required type="number" min="5" max="480" value={form.durationMinutes} onChange={(event) => setForm({ ...form, durationMinutes: event.target.value })} className="field font-normal" /></label><label className="grid gap-1 text-sm font-bold">السعر بالجنيه<input type="number" min="0" max="100000000" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} placeholder="اختياري" className="field font-normal" /></label><div className="flex items-end gap-2"><button disabled={saving} className="rounded-xl bg-[#176b9d] px-4 py-3 font-bold text-white disabled:opacity-60">{saving ? 'جارٍ الحفظ…' : editingId ? 'حفظ التعديل' : 'إضافة الخدمة'}</button>{editingId && <button type="button" onClick={() => { setEditingId(null); setForm(emptyForm); }} className="rounded-xl border border-slate-300 px-4 py-3 font-bold">إلغاء</button>}</div></form><section className="mt-7 overflow-hidden rounded-2xl border border-slate-200"><div className="flex justify-between bg-[#eef6fc] p-4 font-black"><span>الخدمات النشطة</span><span>{loading ? '…' : services.length}</span></div>{loading ? <p className="p-5 text-slate-600">جارٍ تحميل الخدمات…</p> : services.length === 0 ? <p className="p-5 text-slate-600">لا توجد خدمات بعد.</p> : <ul>{services.map((service) => <li key={service.id} className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 p-4"><div><p className="font-extrabold">{service.name}</p><p className="mt-1 text-sm text-slate-500">{service.durationMinutes} دقيقة{service.price !== null ? ` · ${service.price.toLocaleString('ar-EG')} جنيه` : ''}</p></div><div className="flex gap-2"><button type="button" onClick={() => edit(service)} className="rounded-lg border border-[#176b9d] px-3 py-2 text-sm font-bold text-[#176b9d]">تعديل</button><button type="button" onClick={() => void deactivate(service)} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-bold text-red-700">تعطيل</button></div></li>)}</ul>}</section></>}</section></main>;
}
