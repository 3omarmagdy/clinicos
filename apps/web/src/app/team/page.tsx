'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { getApiErrorMessage } from '@/lib/api-error';
import { authenticatedFetch, getAccessToken, hasSessionPermission } from '@/lib/auth-session';

type TeamMember = { id: string; firstName: string; lastName: string; email: string; role: string; status: string; createdAt: string };
const blank = { firstName: '', lastName: '', email: '', password: '', role: 'receptionist' };

export default function TeamPage() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [form, setForm] = useState(blank);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const mayCreate = hasSessionPermission('user:create');

  const load = async () => {
    if (!getAccessToken()) { window.location.replace('/login'); return; }
    setLoading(true); setError('');
    try { const response = await authenticatedFetch('/api/v1/users'); if (!response.ok) throw new Error(await getApiErrorMessage(response, 'تعذر تحميل الفريق.')); setTeam(await response.json() as TeamMember[]); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'تعذر تحميل الفريق.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSaving(true); setError(''); setNotice('');
    try { const response = await authenticatedFetch('/api/v1/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) }); if (!response.ok) throw new Error(await getApiErrorMessage(response, 'تعذر إضافة الموظف.')); const member = await response.json() as TeamMember; setTeam((current) => [...current, member]); setForm(blank); setNotice('تم إنشاء حساب الموظف. شاركه كلمة المرور التي اخترتها عبر قناة آمنة.'); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'تعذر إضافة الموظف.'); }
    finally { setSaving(false); }
  };

  return <main dir="rtl" className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900"><section className="mx-auto max-w-5xl rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8"><Link href="/dashboard" className="text-sm font-medium text-sky-700 hover:underline">العودة إلى لوحة التحكم ←</Link><div className="mt-4"><p className="text-sm font-semibold text-teal-700">فريق العيادة</p><h1 className="mt-1 text-3xl font-bold">إدارة وصول فريقك</h1><p className="mt-2 text-slate-600">كل حساب يخص هذا المركز فقط. لا تشارك كلمة المرور عبر رسائل عامة.</p></div>{error && <p role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}{notice && <p className="mt-5 rounded-lg bg-emerald-50 p-3 text-emerald-800">{notice}</p>}{mayCreate && <form onSubmit={create} className="mt-6 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2"><h2 className="sm:col-span-2 text-lg font-bold">إضافة عضو للفريق</h2><label className="grid gap-1 text-sm font-medium">الاسم الأول<input required value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} className="rounded-lg border p-2 font-normal" /></label><label className="grid gap-1 text-sm font-medium">اسم العائلة<input required value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} className="rounded-lg border p-2 font-normal" /></label><label className="grid gap-1 text-sm font-medium">البريد الإلكتروني<input required type="email" dir="ltr" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="rounded-lg border p-2 font-normal" /></label><label className="grid gap-1 text-sm font-medium">الدور<select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} className="rounded-lg border p-2 font-normal"><option value="receptionist">استقبال</option><option value="doctor">طبيب</option><option value="admin">مدير</option></select></label><label className="grid gap-1 text-sm font-medium sm:col-span-2">كلمة مرور مؤقتة<input required type="password" minLength={10} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="rounded-lg border p-2 font-normal" /><span className="text-xs font-normal text-slate-500">10 أحرف على الأقل، ويجب أن تحتوي حرفًا ورقمًا.</span></label><button disabled={saving} className="w-fit rounded-lg bg-teal-700 px-4 py-2 font-bold text-white hover:bg-teal-800 disabled:opacity-60">{saving ? 'جارٍ الإنشاء…' : 'إنشاء الحساب'}</button></form>}<div className="mt-6 overflow-hidden rounded-xl border border-slate-200"><div className="bg-slate-100 p-3 font-semibold">أعضاء الفريق</div>{loading ? <p className="p-4 text-slate-600">جارٍ التحميل…</p> : <ul>{team.map((member) => <li key={member.id} className="flex flex-wrap items-center justify-between gap-3 border-t p-4"><span><span className="font-medium">{member.firstName} {member.lastName}</span><span className="mr-2 text-sm text-slate-500" dir="ltr">{member.email}</span></span><span className="rounded-full bg-slate-100 px-3 py-1 text-sm">{member.role} · {member.status}</span></li>)}</ul>}</div></section></main>;
}
