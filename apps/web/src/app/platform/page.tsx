'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { authenticatedFetch, getAccessToken, isPlatformAdminSession, signOut } from '@/lib/auth-session';

type OrganizationRow = { id: string; name: string; slug: string; subscriptionPlan: string; subscriptionStatus: string; owner: { firstName: string; lastName: string; email: string } | null };
const statusLabel: Record<string, string> = { trial: 'تجربة', active: 'نشط', suspended: 'موقوف', expired: 'منتهٍ' };

export default function PlatformPage() {
  const [organizations, setOrganizations] = useState<OrganizationRow[]>([]);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const load = async () => {
    const response = await authenticatedFetch('/api/v1/platform/organizations');
    if (!response.ok) throw new Error(response.status === 403 ? 'هذه الصفحة مخصصة لمالك المنصة فقط.' : 'تعذر تحميل العيادات.');
    setOrganizations(await response.json() as OrganizationRow[]);
  };
  useEffect(() => {
    if (!getAccessToken()) { window.location.replace('/login'); return; }
    if (!isPlatformAdminSession()) { setError('هذه الصفحة مخصصة لمالك المنصة فقط.'); return; }
    void load().catch((requestError: unknown) => setError(requestError instanceof Error ? requestError.message : 'تعذر تحميل البيانات.'));
  }, []);
  const updateStatus = async (organization: OrganizationRow, status: 'active' | 'suspended') => {
    setBusyId(organization.id);
    try {
      const response = await authenticatedFetch(`/api/v1/platform/organizations/${organization.id}/subscription`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan: organization.subscriptionPlan === 'trial' ? 'clinic' : organization.subscriptionPlan, status }) });
      if (!response.ok) throw new Error('تعذر تحديث الاشتراك.');
      await load();
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'تعذر تحديث الاشتراك.'); }
    finally { setBusyId(''); }
  };
  return <main dir="rtl" className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900"><section className="mx-auto max-w-6xl rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-semibold text-violet-700">Clinico · إدارة المنصة</p><h1 className="mt-1 text-3xl font-bold">الاشتراكات والعيادات</h1><p className="mt-2 max-w-2xl text-sm text-slate-600">تظهر بيانات الاشتراك ومالك العيادة فقط؛ لا تظهر سجلات المرضى أو المحتوى الطبي.</p></div><div className="flex gap-3"><Link href="/dashboard" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold">لوحة العيادة</Link><button onClick={signOut} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold">تسجيل الخروج</button></div></div>{error && <div className="mt-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</div>}<div className="mt-7 overflow-x-auto rounded-xl border border-slate-200"><table className="min-w-full text-right text-sm"><thead className="bg-slate-100 text-slate-600"><tr><th className="p-4">العيادة</th><th className="p-4">المالك</th><th className="p-4">الخطة</th><th className="p-4">الحالة</th><th className="p-4">الإجراء</th></tr></thead><tbody>{organizations.map((organization) => <tr key={organization.id} className="border-t border-slate-100"><td className="p-4"><p className="font-bold">{organization.name}</p><p className="mt-1 text-xs text-slate-500">{organization.slug}</p></td><td className="p-4">{organization.owner ? <><p>{organization.owner.firstName} {organization.owner.lastName}</p><p className="mt-1 text-xs text-slate-500" dir="ltr">{organization.owner.email}</p></> : '—'}</td><td className="p-4">{organization.subscriptionPlan}</td><td className="p-4"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${organization.subscriptionStatus === 'active' ? 'bg-emerald-50 text-emerald-800' : organization.subscriptionStatus === 'suspended' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800'}`}>{statusLabel[organization.subscriptionStatus] ?? organization.subscriptionStatus}</span></td><td className="p-4"><button disabled={busyId === organization.id} onClick={() => void updateStatus(organization, organization.subscriptionStatus === 'suspended' ? 'active' : 'suspended')} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50">{organization.subscriptionStatus === 'suspended' ? 'تفعيل' : 'إيقاف'}</button></td></tr>)}</tbody></table></div><p className="mt-5 text-xs text-slate-500">التفعيل اليدوي مناسب للمرحلة الأولى. ربط الدفع التلقائي سيضاف بعد اختيار بوابة الدفع والبيئة الإنتاجية.</p></section></main>;
}
