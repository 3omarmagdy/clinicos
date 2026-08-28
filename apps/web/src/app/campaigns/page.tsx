'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { getApiErrorMessage } from '@/lib/api-error';
import { authenticatedFetch, getAccessToken } from '@/lib/auth-session';

type Filters = { governorate: string; city: string; gender: string; leadSource: string; minAge: string; maxAge: string };
type Service = { id: string; name: string; durationMinutes: number; price?: number | null };
type PatientOption = { id: string; firstName: string; lastName: string; phone: string | null; whatsappPhone: string | null; status: string };
type Preview = { total: number; samples: Array<{ id: string; name: string; hasWhatsappNumber: boolean }> };
type Campaign = { id: string; templateName: string; offerText: string; expiresAt: string | null; status: string; createdAt: string; _count: { recipients: number }; recipients: Array<{ id: string }> };
type SubscriptionState = { plan: string; status: string };
const initialFilters: Filters = { governorate: '', city: '', gender: '', leadSource: '', minAge: '', maxAge: '' };

function filterPayload(filters: Filters) {
  return Object.fromEntries(Object.entries(filters).filter(([, value]) => value.trim()).map(([key, value]) => [key, key === 'minAge' || key === 'maxAge' ? Number(value) : value.trim()]));
}

function dateLabel(value: string | null) { return value ? new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium' }).format(new Date(value)) : 'بدون تاريخ انتهاء'; }

export default function CampaignsPage() {
  const [filters, setFilters] = useState(initialFilters);
  const [services, setServices] = useState<Service[]>([]);
  const [serviceId, setServiceId] = useState('');
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [selectedPatientIds, setSelectedPatientIds] = useState<string[]>([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [serviceName, setServiceName] = useState('');
  const [offerText, setOfferText] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [subscription, setSubscription] = useState<SubscriptionState | null>(null);
  const medicalOffer = [serviceName.trim(), offerText.trim()].filter(Boolean).join(': ');

  const loadCampaigns = async () => {
    const [response, subscriptionResponse, patientsResponse, servicesResponse] = await Promise.all([authenticatedFetch('/api/v1/whatsapp/campaigns'), authenticatedFetch('/api/v1/subscriptions/current'), authenticatedFetch('/api/v1/patients'), authenticatedFetch('/api/v1/organizations/me/services')]);
    if (!response.ok) throw new Error(await getApiErrorMessage(response, 'تعذر تحميل الحملات.'));
    setCampaigns(await response.json() as Campaign[]);
    if (subscriptionResponse.ok) setSubscription(await subscriptionResponse.json() as SubscriptionState);
    if (patientsResponse.ok) setPatients(await patientsResponse.json() as PatientOption[]);
    if (servicesResponse.ok) setServices(await servicesResponse.json() as Service[]);
  };

  useEffect(() => {
    if (!getAccessToken()) { window.location.replace('/login'); return; }
    void loadCampaigns().catch((requestError) => setError(requestError instanceof Error ? requestError.message : 'تعذر تحميل الحملات.')).finally(() => setLoading(false));
  }, []);

  const previewAudience = async () => {
    if (subscription?.plan === 'FREE_TRIAL') { setError('معاينة جمهور Marketing متاحة بعد تفعيل باقة مدفوعة.'); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await authenticatedFetch('/api/v1/whatsapp/campaigns/preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...filterPayload(filters), ...(selectedPatientIds.length ? { patientIds: selectedPatientIds } : {}), ...(serviceId ? { serviceId } : {}), offerText: medicalOffer || 'عرض طبي تجريبي', ...(expiresAt ? { expiresAt: new Date(`${expiresAt}T12:00:00`).toISOString() } : {}) }) });
      if (!response.ok) throw new Error(await getApiErrorMessage(response, 'تعذر معاينة المرضى الموافقين.'));
      setPreview(await response.json() as Preview);
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'تعذر معاينة المرضى الموافقين.'); }
    finally { setBusy(false); }
  };

  const createCampaign = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (subscription?.plan === 'FREE_TRIAL') { setError('إنشاء حملات Marketing متاح بعد تفعيل باقة مدفوعة.'); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await authenticatedFetch('/api/v1/whatsapp/campaigns', { method: 'POST', body: JSON.stringify({ ...filterPayload(filters), ...(selectedPatientIds.length ? { patientIds: selectedPatientIds } : {}), ...(serviceId ? { serviceId } : {}), offerText: medicalOffer, ...(expiresAt ? { expiresAt: new Date(`${expiresAt}T12:00:00`).toISOString() } : {}) }) });
      if (!response.ok) throw new Error(await getApiErrorMessage(response, 'تعذر إنشاء الحملة.'));
      const created = await response.json() as { recipientCount: number };
      setNotice(`تم حفظ الحملة كمسودة لـ ${created.recipientCount.toLocaleString('ar-EG')} مريض موافق.`);
      setServiceName(''); setServiceId(''); setOfferText(''); setExpiresAt(''); setPreview(null); setSelectedPatientIds([]); await loadCampaigns();
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'تعذر إنشاء الحملة.'); }
    finally { setBusy(false); }
  };

  const sendOneBatch = async (campaign: Campaign) => {
    if (subscription?.plan === 'FREE_TRIAL') { setError('إرسال WhatsApp غير متاح أثناء التجربة المجانية.'); return; }
    if (!window.confirm('سيتم إرسال رسالة حقيقية إلى مريض واحد فقط من هذه الحملة. هل تؤكد؟')) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await authenticatedFetch(`/api/v1/whatsapp/campaigns/${campaign.id}/send`, { method: 'POST', body: JSON.stringify({ confirm: true, maxRecipients: 1 }) });
      if (!response.ok) throw new Error(await getApiErrorMessage(response, 'تعذر إرسال الرسالة التجريبية.'));
      const result = await response.json() as { sent: number; failed: number; pending: number };
      setNotice(`اكتملت دفعة الاختبار: تم إرسال ${result.sent}، وفشل ${result.failed}، والمتبقي ${result.pending}.`); await loadCampaigns();
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'تعذر إرسال الرسالة التجريبية.'); }
    finally { setBusy(false); }
  };

  return <main dir="rtl" className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900"><section className="mx-auto max-w-6xl"><Link href="/dashboard" className="text-sm font-bold text-sky-700 hover:underline">العودة إلى لوحة التحكم ←</Link><header className="mt-5 rounded-[1.7rem] bg-[#12395e] px-6 py-8 text-white sm:px-9"><p className="text-xs font-extrabold tracking-[.16em] text-[#7ee5de]">تواصل مع المرضى</p><h1 className="mt-3 text-3xl font-extrabold">عروض WhatsApp</h1><p className="mt-3 max-w-3xl leading-8 text-blue-100">أنشئ عرضًا طبيًا لخدمة مثل الكشف أو العملية أو الليزك أو الليزر، راجع المرضى الموافقين، ثم احفظه كمسودة. لا تظهر هنا إلا الحسابات التي وافقت على التسويق عبر WhatsApp ولديها رقم صالح.</p></header>

    {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}{notice && <p role="status" className="mt-5 rounded-xl bg-emerald-50 p-4 text-emerald-800">{notice}</p>}{subscription?.plan === 'FREE_TRIAL' && <section className="mt-5 rounded-2xl border border-[#b9d9ee] bg-[#edf6ff] p-5"><h2 className="font-black text-[#153c63]">Marketing وWhatsApp غير مفعّلين في التجربة</h2><p className="mt-2 text-sm leading-7 text-slate-600">يمكنك تجربة الحجز وملف المريض والسجل الطبي أولًا. بعد تفعيل باقة مدفوعة، ستظهر معاينة الجمهور والحملات ضمن موافقات المرضى وحصة الخطة.</p><Link href="/settings/subscription#plans" className="mt-3 inline-flex font-bold text-[#1768a8] hover:underline">مراجعة الباقات ←</Link></section>}
    <section className="mt-6 grid gap-5 lg:grid-cols-[1.15fr_.85fr]"><form onSubmit={createCampaign} className="rounded-2xl border border-[#dce7f1] bg-white p-6 shadow-sm"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-extrabold text-[#087d78]">الخطوة 1</p><h2 className="mt-1 text-xl font-extrabold">أنشئ عرضًا</h2></div><span className="rounded-full bg-[#f0fbf9] px-3 py-1 text-xs font-bold text-[#176763]">القالب: clinic_offer_v1</span></div><label className="mt-5 grid gap-1 text-sm font-bold">الخدمة الطبية<select required value={serviceId} onChange={(event) => { const selected = services.find((service) => service.id === event.target.value); setServiceId(event.target.value); setServiceName(selected?.name || ''); }} className="rounded-xl border border-slate-300 p-3 font-normal"><option value="">اختر خدمة من كتالوج العيادة</option>{services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</select></label><label className="mt-4 grid gap-1 text-sm font-bold">تفاصيل العرض<textarea required minLength={1} maxLength={450} value={offerText} onChange={(event) => setOfferText(event.target.value)} placeholder="مثال: خصم 20% على الكشف الأول أو سعر خاص للعملية" className="min-h-28 rounded-xl border border-slate-300 p-3 font-normal outline-none focus:border-sky-600" /></label><label className="mt-4 grid gap-1 text-sm font-bold">تاريخ انتهاء الحملة (للتنظيم الداخلي فقط) <input type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} className="rounded-xl border border-slate-300 p-3 font-normal" /></label><div className="mt-5 border-t border-slate-100 pt-5"><p className="text-sm font-extrabold">المرضى المستهدفون</p><p className="mt-1 text-xs leading-6 text-slate-500">اختر حالات محددة من سجلات هذه العيادة فقط، أو اترك الاختيار فارغًا لاستخدام الفلاتر. يشترط النظام تلقائيًا مريضًا نشطًا ورقمًا صالحًا وموافقات التسويق المسجلة.</p><input value={patientSearch} onChange={(event) => setPatientSearch(event.target.value)} placeholder="ابحث باسم المريض أو رقمه" className="mt-4 w-full rounded-xl border border-slate-300 p-3" /><div className="mt-3 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2">{patients.filter((patient) => `${patient.firstName} ${patient.lastName} ${patient.phone ?? ''} ${patient.whatsappPhone ?? ''}`.toLowerCase().includes(patientSearch.toLowerCase())).slice(0, 200).map((patient) => <label key={patient.id} className="flex items-center justify-between gap-3 border-b border-slate-200 px-3 py-2 text-sm last:border-0"><span><input type="checkbox" className="ml-2" checked={selectedPatientIds.includes(patient.id)} onChange={(event) => setSelectedPatientIds(event.target.checked ? [...selectedPatientIds, patient.id] : selectedPatientIds.filter((id) => id !== patient.id))} />{`${patient.firstName} ${patient.lastName}`.trim()}<span className="mr-2 text-xs text-slate-500">{patient.whatsappPhone || patient.phone || 'بدون رقم'}</span></span><span className="text-xs text-slate-500">{patient.status === 'active' ? 'نشط' : 'غير نشط'}</span></label>)}</div><p className="mt-2 text-xs font-bold text-[#087d78]">تم اختيار {selectedPatientIds.length.toLocaleString('ar-EG')} حالة</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><Input label="المحافظة" value={filters.governorate} onChange={(value) => setFilters({ ...filters, governorate: value })} /><Input label="المدينة / المنطقة" value={filters.city} onChange={(value) => setFilters({ ...filters, city: value })} /><Input label="مصدر العميل" value={filters.leadSource} onChange={(value) => setFilters({ ...filters, leadSource: value })} /><label className="grid gap-1 text-sm font-bold">النوع<select value={filters.gender} onChange={(event) => setFilters({ ...filters, gender: event.target.value })} className="rounded-xl border border-slate-300 p-2 font-normal"><option value="">الكل</option><option value="female">أنثى</option><option value="male">ذكر</option></select></label><Input label="أقل عمر" type="number" value={filters.minAge} onChange={(value) => setFilters({ ...filters, minAge: value })} /><Input label="أكبر عمر" type="number" value={filters.maxAge} onChange={(value) => setFilters({ ...filters, maxAge: value })} /></div></div><div className="mt-6 flex flex-wrap gap-3"><button type="button" onClick={() => void previewAudience()} disabled={busy || subscription?.plan === 'FREE_TRIAL' || !medicalOffer} className="rounded-xl border border-sky-700 px-4 py-3 font-bold text-sky-700 disabled:opacity-50">{busy ? 'جارٍ التنفيذ…' : 'معاينة العدد'}</button><button disabled={busy || subscription?.plan === 'FREE_TRIAL' || !medicalOffer || !preview?.total} className="rounded-xl bg-sky-700 px-4 py-3 font-bold text-white hover:bg-sky-800 disabled:opacity-50">حفظ كمسودة</button></div></form>

      <aside className="rounded-2xl border border-[#cde9e5] bg-[#f0fbf9] p-6"><p className="text-sm font-extrabold text-[#087d78]">الخطوة 2</p><h2 className="mt-1 text-xl font-extrabold text-[#153c63]">راجع قبل الحفظ</h2><div className="mt-5 rounded-2xl bg-white p-5 ring-1 ring-[#cde9e5]"><p className="text-xs font-bold text-slate-500">معاينة الرسالة</p><p className="mt-3 whitespace-pre-line leading-8 text-slate-800">مرحبًا {`{{اسم المريض}}`}، لدى {`{{اسم العيادة}}`} عرض طبي خاص على {medicalOffer || 'نوع الخدمة وتفاصيل العرض سيظهران هنا'}.
يسري العرض حتى انتهاء المدة المحددة. للحجز أو الاستفسار، تواصل مع العيادة.</p></div><div className="mt-5 rounded-2xl bg-white p-5 text-center ring-1 ring-[#cde9e5]"><p className="text-sm text-slate-600">المستهدفون بعد الفلاتر</p><p className="mt-1 text-4xl font-extrabold text-[#087d78]">{preview ? preview.total.toLocaleString('ar-EG') : '—'}</p><p className="mt-2 text-xs text-slate-500">لا يتم الإرسال من هذه الخطوة</p></div>{preview?.samples.length ? <div className="mt-5"><p className="text-sm font-extrabold">عينة الأسماء</p><ul className="mt-2 space-y-2 text-sm">{preview.samples.slice(0, 5).map((patient) => <li key={patient.id} className="flex justify-between rounded-lg bg-white px-3 py-2"><span>{patient.name}</span><span className="text-emerald-700">موافق</span></li>)}</ul></div> : null}</aside></section>

    <section className="mt-6 rounded-2xl border border-[#dce7f1] bg-white p-6 shadow-sm"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-extrabold text-[#1768a8]">الخطوة 3</p><h2 className="mt-1 text-xl font-extrabold">الحملات المحفوظة</h2></div><p className="text-sm text-slate-500">الإرسال يحتاج موافقة نهائية، والزر الحالي يرسل دفعة اختبار من رسالة واحدة فقط.</p></div>{loading ? <p className="mt-5 text-slate-600">جارٍ التحميل…</p> : campaigns.length ? <div className="mt-5 space-y-3">{campaigns.map((campaign) => <article key={campaign.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 p-4"><div className="min-w-0"><p className="font-extrabold text-[#153c63]">{campaign.offerText}</p><p className="mt-1 text-sm text-slate-500">{campaign.templateName} · {campaign._count.recipients.toLocaleString('ar-EG')} مستهدف · {dateLabel(campaign.expiresAt)}</p></div><div className="flex items-center gap-3"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{campaign.status}</span>{campaign.status !== 'COMPLETED' && <button type="button" disabled={busy || subscription?.plan === 'FREE_TRIAL'} onClick={() => void sendOneBatch(campaign)} className="rounded-lg bg-[#087d78] px-3 py-2 text-sm font-bold text-white disabled:opacity-50">اختبار رسالة واحدة</button>}</div></article>)}</div> : <p className="mt-5 rounded-xl bg-slate-50 p-5 text-slate-600">لا توجد حملات محفوظة بعد.</p>}</section></section></main>;
}

function Input({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) { return <label className="grid gap-1 text-sm font-bold">{label}<input type={type} min={type === 'number' ? 0 : undefined} max={type === 'number' ? 130 : undefined} value={value} onChange={(event) => onChange(event.target.value)} className="rounded-xl border border-slate-300 p-2 font-normal" /></label>; }
