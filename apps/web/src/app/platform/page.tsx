'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { authenticatedFetch, getAccessToken, isPlatformAdminSession, signOut } from '@/lib/auth-session';

type OrganizationRow = {
  id: string;
  name: string;
  slug: string;
  createdAt?: string;
  subscriptionPlan: string;
  subscriptionStatus: string;
  trialEndsAt?: string | null;
  subscriptionEndsAt?: string | null;
  owner: { firstName: string; lastName: string; email: string } | null;
};

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

const statusLabel: Record<string, string> = {
  trial: 'فترة تجريبية',
  active: 'نشط',
  suspended: 'موقوف',
  expired: 'منتهٍ',
};

const planLabel: Record<string, string> = {
  STARTER: 'Starter',
  PROFESSIONAL: 'Professional',
  CLINIC: 'Clinic',
  CENTER: 'Center',
  starter: 'Starter',
  professional: 'Professional',
  clinic: 'Clinic',
  center: 'Center',
  trial: 'تجربة',
};

const statusStyles: Record<string, string> = {
  active: 'border-emerald-300/20 bg-emerald-300/10 text-emerald-200',
  trial: 'border-[#d6b56a]/25 bg-[#d6b56a]/10 text-[#f1d890]',
  suspended: 'border-rose-300/20 bg-rose-300/10 text-rose-200',
  expired: 'border-slate-300/15 bg-slate-300/10 text-slate-300',
};

const moneyFormatter = new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 0 });
const dateFormatter = new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' });

function formatPlan(value: string) {
  return planLabel[value] ?? value;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : dateFormatter.format(date);
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'C';
}

export default function PlatformPage() {
  const [organizations, setOrganizations] = useState<OrganizationRow[]>([]);
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'trial' | 'suspended'>('all');

  const load = async () => {
    setIsRefreshing(true);
    try {
      const [organizationsResponse, paymentsResponse] = await Promise.all([
        authenticatedFetch('/api/v1/platform/organizations'),
        authenticatedFetch('/api/v1/platform/payments/pending'),
      ]);
      if (!organizationsResponse.ok) {
        throw new Error(organizationsResponse.status === 403 ? 'هذه الصفحة مخصصة لمالك المنصة فقط.' : 'تعذر تحميل العيادات.');
      }
      setOrganizations(await organizationsResponse.json() as OrganizationRow[]);
      if (paymentsResponse.ok) setPendingPayments(await paymentsResponse.json() as PendingPayment[]);
      else setPendingPayments([]);
      setError('');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!getAccessToken()) { window.location.replace('/login'); return; }
    if (!isPlatformAdminSession()) { setError('هذه الصفحة مخصصة لمالك المنصة فقط.'); return; }
    void load().catch((requestError: unknown) => setError(requestError instanceof Error ? requestError.message : 'تعذر تحميل البيانات.'));
  }, []);

  const stats = useMemo(() => {
    const active = organizations.filter((organization) => organization.subscriptionStatus === 'active').length;
    const trial = organizations.filter((organization) => organization.subscriptionStatus === 'trial').length;
    const suspended = organizations.filter((organization) => organization.subscriptionStatus === 'suspended').length;
    const pendingAmount = pendingPayments.reduce((total, payment) => total + Number(payment.amount || 0), 0);
    return { total: organizations.length, active, trial, suspended, pendingAmount };
  }, [organizations, pendingPayments]);

  const filteredOrganizations = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return organizations.filter((organization) => {
      const matchesStatus = statusFilter === 'all' || organization.subscriptionStatus === statusFilter;
      const ownerName = organization.owner ? `${organization.owner.firstName} ${organization.owner.lastName}` : '';
      const haystack = `${organization.name} ${organization.slug} ${ownerName} ${organization.owner?.email ?? ''}`.toLowerCase();
      return matchesStatus && (!query || haystack.includes(query));
    });
  }, [organizations, searchTerm, statusFilter]);

  const updateStatus = async (organization: OrganizationRow, status: 'active' | 'suspended') => {
    const actionLabel = status === 'suspended' ? 'إيقاف' : 'تفعيل';
    if (!window.confirm(`هل تريد ${actionLabel} اشتراك عيادة «${organization.name}»؟`)) return;
    setBusyId(organization.id);
    setError('');
    try {
      const response = await authenticatedFetch(`/api/v1/platform/organizations/${organization.id}/subscription`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: organization.subscriptionPlan === 'trial' ? 'clinic' : organization.subscriptionPlan, status }),
      });
      if (!response.ok) throw new Error('تعذر تحديث الاشتراك.');
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'تعذر تحديث الاشتراك.');
    } finally {
      setBusyId('');
    }
  };

  const reviewPayment = async (payment: PendingPayment, action: 'approve' | 'reject') => {
    const rejectionReason = action === 'reject' ? window.prompt('اكتب سبب رفض طلب التحويل:')?.trim() : undefined;
    if (action === 'reject' && !rejectionReason) return;
    if (action === 'approve' && !window.confirm(`تأكدت من وصول تحويل «${payment.reference}» من ${payment.organization.name}؟`)) return;
    setBusyId(payment.id);
    setError('');
    try {
      const response = await authenticatedFetch(`/api/v1/platform/payments/${payment.id}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...(rejectionReason ? { rejectionReason } : {}) }),
      });
      if (!response.ok) throw new Error('تعذر تحديث طلب التحويل.');
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'تعذر تحديث طلب التحويل.');
    } finally {
      setBusyId('');
    }
  };

  return (
    <main dir="rtl" className="min-h-screen bg-[#070b0a] text-[#f8f5ed]">
      <div className="mx-auto flex min-h-screen max-w-[1560px] flex-col lg:flex-row">
        <aside className="border-b border-white/10 bg-[#0b1210] lg:min-h-screen lg:w-[248px] lg:border-b-0 lg:border-l lg:border-white/10">
          <div className="flex h-full flex-col px-5 py-6 lg:sticky lg:top-0 lg:h-screen">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#d6b56a] text-lg font-black text-[#10130f]">C</div>
              <div>
                <p className="text-base font-black tracking-tight">Clinicos</p>
                <p className="text-xs text-[#9ba49e]">مركز إدارة المنصة</p>
              </div>
            </div>
            <nav className="mt-9 space-y-2">
              <div className="flex items-center justify-between rounded-xl border border-[#d6b56a]/20 bg-[#d6b56a]/10 px-4 py-3 text-sm font-bold text-[#f1d890]">
                <span>نظرة عامة</span><span className="text-base">⌂</span>
              </div>
              <Link href="#payments" className="flex items-center justify-between rounded-xl px-4 py-3 text-sm text-[#aab2ac] transition hover:bg-white/5 hover:text-white">
                <span>طلبات التحويل</span><span className="rounded-full bg-[#d6b56a] px-2 py-0.5 text-[10px] font-black text-[#11140f]">{pendingPayments.length}</span>
              </Link>
              <Link href="#clinics" className="flex items-center justify-between rounded-xl px-4 py-3 text-sm text-[#aab2ac] transition hover:bg-white/5 hover:text-white">
                <span>العيادات</span><span className="text-base">▦</span>
              </Link>
            </nav>
            <div className="mt-auto hidden rounded-2xl border border-white/10 bg-white/[0.03] p-4 lg:block">
              <p className="text-xs font-bold text-[#d6b56a]">مراجعة آمنة</p>
              <p className="mt-2 text-xs leading-6 text-[#9ba49e]">اعتمد طلب التحويل فقط بعد مطابقة المرجع مع حسابك البنكي أو InstaPay خارج النظام.</p>
            </div>
            <button onClick={signOut} className="mt-5 rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-[#c4cbc5] transition hover:border-rose-300/30 hover:text-white">تسجيل الخروج</button>
          </div>
        </aside>

        <section className="min-w-0 flex-1 px-4 py-6 sm:px-7 lg:px-10 lg:py-9">
          <header className="flex flex-col gap-5 border-b border-white/10 pb-7 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#d6b56a]">Platform control center</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">نظرة عامة على المنصة</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[#9ba49e]">تابع نمو العيادات، راجع طلبات التحويل اليدوي، وتحكم في حالة الاشتراكات من مكان واحد.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => void load()} disabled={isRefreshing} className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-bold text-[#e4e8e3] transition hover:border-[#d6b56a]/40 disabled:opacity-50">{isRefreshing ? 'جارٍ التحديث…' : 'تحديث البيانات'}</button>
              <Link href="/dashboard" className="rounded-xl bg-[#d6b56a] px-4 py-3 text-sm font-black text-[#10130f] transition hover:bg-[#ecd07f]">لوحة العيادة</Link>
            </div>
          </header>

          {error && <div className="mt-6 rounded-xl border border-rose-300/20 bg-rose-300/10 p-4 text-sm text-rose-100">{error}</div>}

          <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-[#0d1512] p-5"><div className="flex items-center justify-between"><span className="text-sm text-[#aab2ac]">إجمالي العيادات</span><span className="text-[#d6b56a]">◈</span></div><p className="mt-4 text-3xl font-black">{stats.total}</p><p className="mt-2 text-xs text-[#7f8b83]">كل الحسابات المسجلة</p></div>
            <div className="rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.04] p-5"><div className="flex items-center justify-between"><span className="text-sm text-[#aab2ac]">اشتراكات نشطة</span><span className="text-emerald-300">↗</span></div><p className="mt-4 text-3xl font-black text-emerald-100">{stats.active}</p><p className="mt-2 text-xs text-[#7f8b83]">تتمتع بصلاحيات الاستخدام</p></div>
            <div className="rounded-2xl border border-[#d6b56a]/15 bg-[#d6b56a]/[0.04] p-5"><div className="flex items-center justify-between"><span className="text-sm text-[#aab2ac]">في الفترة التجريبية</span><span className="text-[#d6b56a]">◷</span></div><p className="mt-4 text-3xl font-black text-[#f1d890]">{stats.trial}</p><p className="mt-2 text-xs text-[#7f8b83]">تحتاج متابعة وتحويلًا مدفوعًا</p></div>
            <div className="rounded-2xl border border-rose-300/15 bg-rose-300/[0.04] p-5"><div className="flex items-center justify-between"><span className="text-sm text-[#aab2ac]">موقوفة</span><span className="text-rose-300">!</span></div><p className="mt-4 text-3xl font-black text-rose-100">{stats.suspended}</p><p className="mt-2 text-xs text-[#7f8b83]">تحتاج مراجعة يدوية</p></div>
          </section>

          <section id="payments" className="mt-8 grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(280px,.75fr)]">
            <div className="rounded-2xl border border-[#d6b56a]/20 bg-[#0d1512] p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#d6b56a]">Manual payment review</p><h2 className="mt-2 text-2xl font-black">طلبات التحويل المعلقة</h2><p className="mt-2 text-sm text-[#9ba49e]">طابق المرجع خارج Clinicos أولًا، ثم اتخذ قرار الاعتماد.</p></div>
                <div className="text-left"><p className="text-2xl font-black text-[#f1d890]">{pendingPayments.length}</p><p className="text-xs text-[#7f8b83]">طلب معلق</p></div>
              </div>
              {pendingPayments.length === 0 ? <div className="mt-6 border-t border-white/10 pt-6 text-sm text-[#9ba49e]">لا توجد طلبات تحتاج إلى مراجعة حاليًا.</div> : <div className="mt-6 space-y-3">{pendingPayments.map((payment) => <div key={payment.id} className="rounded-xl border border-white/10 bg-white/[0.025] p-4"><div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div className="flex min-w-0 items-center gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#d6b56a]/10 text-sm font-black text-[#f1d890]">{getInitials(payment.organization.name)}</div><div className="min-w-0"><p className="truncate font-black">{payment.organization.name}</p><p className="mt-1 text-xs text-[#7f8b83]">{formatPlan(payment.subscription.plan)} · {formatDate(payment.createdAt)}</p></div></div><div className="flex flex-wrap items-center gap-3"><div className="text-right"><p className="font-black text-[#f1d890]">{moneyFormatter.format(Number(payment.amount))} {payment.currency}</p><p className="mt-1 font-mono text-xs text-[#9ba49e]" dir="ltr">{payment.reference}</p></div><button disabled={busyId === payment.id} onClick={() => void reviewPayment(payment, 'approve')} className="rounded-lg bg-emerald-500/90 px-3 py-2 text-xs font-black text-[#06100b] disabled:opacity-50">{busyId === payment.id ? 'جارٍ…' : 'اعتماد'}</button><button disabled={busyId === payment.id} onClick={() => void reviewPayment(payment, 'reject')} className="rounded-lg border border-rose-300/25 px-3 py-2 text-xs font-bold text-rose-200 disabled:opacity-50">رفض</button></div></div></div>)}</div>}
            </div>
            <aside className="rounded-2xl border border-white/10 bg-[#0d1512] p-5 sm:p-6"><div className="flex items-center justify-between"><h2 className="text-lg font-black">ملخص التحصيل</h2><span className="text-[#d6b56a]">₪</span></div><p className="mt-5 text-3xl font-black text-[#f1d890]">{moneyFormatter.format(stats.pendingAmount)}</p><p className="mt-1 text-xs text-[#7f8b83]">قيمة الطلبات المعلقة ({pendingPayments[0]?.currency ?? 'EGP'})</p><div className="mt-7 space-y-4 border-t border-white/10 pt-5 text-sm"><div className="flex items-center justify-between"><span className="text-[#9ba49e]">طريقة التحصيل</span><span className="font-bold">تحويل يدوي</span></div><div className="flex items-center justify-between"><span className="text-[#9ba49e]">قرار الاعتماد</span><span className="font-bold text-[#f1d890]">بعد المطابقة</span></div><p className="leading-6 text-[#7f8b83]">رقم المرجع وحده لا يثبت وصول الأموال؛ استخدمه للمطابقة مع كشف حسابك.</p></div></aside>
          </section>

          <section id="clinics" className="mt-8 rounded-2xl border border-white/10 bg-[#0d1512] p-5 sm:p-6">
            <div className="flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#d6b56a]">Organizations</p><h2 className="mt-2 text-2xl font-black">دليل العيادات</h2><p className="mt-2 text-sm text-[#9ba49e]">إدارة حالة الاشتراك دون الوصول إلى السجلات الطبية.</p></div><div className="flex flex-col gap-3 sm:flex-row"><label className="relative"><span className="sr-only">البحث عن عيادة</span><input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="ابحث عن عيادة أو مالك…" className="w-full rounded-xl border border-white/10 bg-[#080d0b] px-4 py-3 text-sm text-white outline-none placeholder:text-[#657169] focus:border-[#d6b56a]/60 sm:w-64" /></label><div className="flex rounded-xl border border-white/10 bg-[#080d0b] p-1 text-xs font-bold text-[#9ba49e]"><button onClick={() => setStatusFilter('all')} className={`rounded-lg px-3 py-2 ${statusFilter === 'all' ? 'bg-[#d6b56a] text-[#11140f]' : ''}`}>الكل</button><button onClick={() => setStatusFilter('active')} className={`rounded-lg px-3 py-2 ${statusFilter === 'active' ? 'bg-[#d6b56a] text-[#11140f]' : ''}`}>نشط</button><button onClick={() => setStatusFilter('trial')} className={`rounded-lg px-3 py-2 ${statusFilter === 'trial' ? 'bg-[#d6b56a] text-[#11140f]' : ''}`}>تجربة</button><button onClick={() => setStatusFilter('suspended')} className={`rounded-lg px-3 py-2 ${statusFilter === 'suspended' ? 'bg-[#d6b56a] text-[#11140f]' : ''}`}>موقوف</button></div></div></div>
            {filteredOrganizations.length === 0 ? <div className="py-12 text-center text-sm text-[#9ba49e]">لا توجد نتائج مطابقة للبحث الحالي.</div> : <div className="mt-5 overflow-x-auto"><table className="min-w-[820px] w-full text-right text-sm"><thead className="text-xs text-[#7f8b83]"><tr><th className="px-4 py-3 font-bold">العيادة</th><th className="px-4 py-3 font-bold">المالك</th><th className="px-4 py-3 font-bold">الخطة</th><th className="px-4 py-3 font-bold">الحالة</th><th className="px-4 py-3 font-bold">تاريخ التسجيل</th><th className="px-4 py-3 font-bold">إجراء</th></tr></thead><tbody>{filteredOrganizations.map((organization) => <tr key={organization.id} className="border-t border-white/10"><td className="px-4 py-4"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-xs font-black text-[#d6b56a]">{getInitials(organization.name)}</div><div><p className="font-black">{organization.name}</p><p className="mt-1 text-xs text-[#7f8b83]">{organization.slug}</p></div></div></td><td className="px-4 py-4"><p className="font-bold">{organization.owner ? `${organization.owner.firstName} ${organization.owner.lastName}` : 'غير محدد'}</p><p className="mt-1 text-xs text-[#7f8b83]" dir="ltr">{organization.owner?.email ?? '—'}</p></td><td className="px-4 py-4 font-bold text-[#ded9ca]">{formatPlan(organization.subscriptionPlan)}</td><td className="px-4 py-4"><span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${statusStyles[organization.subscriptionStatus] ?? statusStyles.expired}`}>{statusLabel[organization.subscriptionStatus] ?? organization.subscriptionStatus}</span></td><td className="px-4 py-4 text-xs text-[#9ba49e]">{organization.createdAt ? formatDate(organization.createdAt) : '—'}</td><td className="px-4 py-4"><button disabled={busyId === organization.id} onClick={() => void updateStatus(organization, organization.subscriptionStatus === 'suspended' ? 'active' : 'suspended')} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-[#d9dfda] transition hover:border-[#d6b56a]/50 hover:text-[#f1d890] disabled:opacity-50">{organization.subscriptionStatus === 'suspended' ? 'تفعيل' : 'إيقاف'}</button></td></tr>)}</tbody></table></div>}
            <p className="mt-5 border-t border-white/10 pt-4 text-xs leading-6 text-[#6f7a72]">ملاحظة: لا يظهر في هذه الصفحة أي محتوى طبي أو سجلات مرضى. إجراءات الاعتماد والإيقاف تغيّر حالة النظام فعلًا بعد التأكيد.</p>
          </section>
        </section>
      </div>
    </main>
  );
}
