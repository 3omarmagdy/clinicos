'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { authenticatedFetch, getAccessToken, isPlatformAdminSession, signOut } from '@/lib/auth-session';

type OrganizationRow = { id: string; name: string; slug: string; subscriptionPlan: string; subscriptionStatus: string; owner: { firstName: string; lastName: string; email: string } | null };
type PendingPayment = {
  id: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  reference: string;
  status: string;
  createdAt: string;
  organization: { id: string; name: string; slug: string };
  subscription: { plan: string; status: string };
};

const statusLabel: Record<string, string> = { trial: 'تجربة', active: 'نشط', suspended: 'موقوف', expired: 'منتهٍ' };
const planLabel: Record<string, string> = { STARTER: 'Starter', PROFESSIONAL: 'Professional', CLINIC: 'Clinic', CENTER: 'Center' };

export default function PlatformPage() {
  const [organizations, setOrganizations] = useState<OrganizationRow[]>([]);
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');

  const load = async () => {
    const [organizationsResponse, paymentsResponse] = await Promise.all([
      authenticatedFetch('/api/v1/platform/organizations'),
      authenticatedFetch('/api/v1/platform/payments/pending'),
    ]);
    if (!organizationsResponse.ok) throw new Error(organizationsResponse.status === 403 ? 'هذه الصفحة مخصصة لمالك المنصة فقط.' : 'تعذر تحميل العيادات.');
    setOrganizations(await organizationsResponse.json() as OrganizationRow[]);
    if (paymentsResponse.ok) setPendingPayments(await paymentsResponse.json() as PendingPayment[]);
  };

  useEffect(() => {
    if (!getAccessToken()) { window.location.replace('/login'); return; }
    if (!isPlatformAdminSession()) { setError('هذه الصفحة مخصصة لمالك المنصة فقط.'); return; }
    void load().catch((requestError: unknown) => setError(requestError instanceof Error ? requestError.message : 'تعذر تحميل البيانات.'));
  }, []);

  const updateStatus = async (organization: OrganizationRow, status: 'active' | 'suspended') => {
    setBusyId(organization.id);
    setError('');
    try {
      const response = await authenticatedFetch(`/api/v1/platform/organizations/${organization.id}/subscription`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan: organization.subscriptionPlan === 'trial' ? 'clinic' : organization.subscriptionPlan, status }) });
      if (!response.ok) throw new Error('تعذر تحديث الاشتراك.');
      await load();
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'تعذر تحديث الاشتراك.'); }
    finally { setBusyId(''); }
  };

  const reviewPayment = async (payment: PendingPayment, action: 'approve' | 'reject') => {
    const rejectionReason = action === 'reject' ? window.prompt('اكتب سبب رفض طلب التحويل:')?.trim() : undefined;
    if (action === 'reject' && !rejectionReason) return;
    setBusyId(payment.id);
    setError('');
    try {
      const response = await authenticatedFetch(`/api/v1/platform/payments/${payment.id}/review`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...(rejectionReason ? { rejectionReason } : {}) }) });
      if (!response.ok) throw new Error('تعذر تحديث طلب التحويل.');
      await load();
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'تعذر تحديث طلب التحويل.'); }
    finally { setBusyId(''); }
  };

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900">
      <section className="mx-auto max-w-6xl rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-sm font-semibold text-violet-700">Clinico · إدارة المنصة</p><h1 className="mt-1 text-3xl font-bold">الاشتراكات والعيادات</h1><p className="mt-2 max-w-2xl text-sm text-slate-600">تظهر بيانات الاشتراك ومالك العيادة فقط؛ لا تظهر سجلات المرضى أو المحتوى الطبي.</p></div>
          <div className="flex gap-3"><Link href="/dashboard" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold">لوحة العيادة</Link><button onClick={signOut} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold">تسجيل الخروج</button></div>
        </div>
        {error && <div className="mt-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</div>}

        <section className="mt-7 rounded-xl border border-amber-200 bg-amber-50 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-extrabold tracking-[.14em] text-amber-800">MANUAL PAYMENT REVIEW</p><h2 className="mt-1 text-xl font-black text-amber-950">طلبات التحويل المعلقة</h2><p className="mt-1 text-sm text-amber-900">راجع رقم المرجع خارج Clinicos أولًا، ثم اعتمد الطلب أو ارفضه بسبب واضح.</p></div><span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-amber-900 ring-1 ring-amber-200">{pendingPayments.length} طلب</span></div>{pendingPayments.length === 0 ? <p className="mt-4 text-sm text-amber-900">لا توجد طلبات تحويل قيد المراجعة.</p> : <div className="mt-5 overflow-x-auto"><table className="min-w-full text-right text-sm"><thead className="text-amber-900"><tr><th className="p-3">العيادة</th><th className="p-3">الباقة</th><th className="p-3">المبلغ</th><th className="p-3">رقم المرجع</th><th className="p-3">تاريخ الطلب</th><th className="p-3">الإجراء</th></tr></thead><tbody>{pendingPayments.map((payment) => <tr key={payment.id} className="border-t border-amber-200"><td className="p-3"><p className="font-bold">{payment.organization.name}</p><p className="text-xs text-amber-800">{payment.organization.slug}</p></td><td className="p-3">{planLabel[payment.subscription.plan] ?? payment.subscription.plan}</td><td className="p-3 font-bold">{payment.amount} {payment.currency}</td><td className="p-3 font-mono" dir="ltr">{payment.reference}</td><td className="p-3">{new Date(payment.createdAt).toLocaleDateString('ar-EG')}</td><td className="p-3"><div className="flex flex-wrap gap-2"><button disabled={busyId === payment.id} onClick={() => void reviewPayment(payment, 'approve')} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">اعتماد وتفعيل</button><button disabled={busyId === payment.id} onClick={() => void reviewPayment(payment, 'reject')} className="rounded-lg border border-red-300 bg-white px-3 py-2 text-xs font-bold text-red-700 disabled:opacity-50">رفض</button></div></td></tr>)}</tbody></table></div>}</section>

        <section className="mt-7 overflow-x-auto rounded-xl border border-slate-200"><table className="min-w-full text-right text-sm"><thead className="bg-slate-100 text-slate-600"><tr><th className="p-4">العيادة</th><th className="p-4">المالك</th><th className="p-4">الخطة</th><th className="p-4">الحالة</th><th className="p-4">الإجراء</th></tr></thead><tbody>{organizations.map((organization) => <tr key={organization.id} className="border-t border-slate-100"><td className="p-4"><p className="font-bold">{organization.name}</p><p className="mt-1 text-xs text-slate-500">{organization.slug}</p></td><td className="p-4">{organization.owner ? <><p>{organization.owner.firstName} {organization.owner.lastName}</p><p className="mt-1 text-xs text-slate-500" dir="ltr">{organization.owner.email}</p></> : '—'}</td><td className="p-4">{organization.subscriptionPlan}</td><td className="p-4"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${organization.subscriptionStatus === 'active' ? 'bg-emerald-50 text-emerald-800' : organization.subscriptionStatus === 'suspended' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800'}`}>{statusLabel[organization.subscriptionStatus] ?? organization.subscriptionStatus}</span></td><td className="p-4"><button disabled={busyId === organization.id} onClick={() => void updateStatus(organization, organization.subscriptionStatus === 'suspended' ? 'active' : 'suspended')} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50">{organization.subscriptionStatus === 'suspended' ? 'تفعيل' : 'إيقاف'}</button></td></tr>)}</tbody></table></section>
        <p className="mt-5 text-xs text-slate-500">التفعيل اليدوي لا يؤكد وصول المال تلقائيًا؛ اعتمد الطلب فقط بعد مراجعة حسابك البنكي أو InstaPay خارج النظام.</p>
      </section>
    </main>
  );
}
