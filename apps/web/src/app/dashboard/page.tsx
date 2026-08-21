'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { authenticatedFetch, clearAccessToken, getAccessToken, hasSessionPermission } from '@/lib/auth-session';

type CurrentUser = { id: string; email: string; firstName: string; lastName: string; role: string; organizationId: string };
type DashboardMetrics = { patients: number; consentedPatients: number; newPatientsThisMonth: number; todayAppointments: number; upcomingAppointments: number; todayByStatus: Record<string, number> };
const formatNumber = new Intl.NumberFormat('en-US');

export default function DashboardPage() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const canReadOrganization = hasSessionPermission('organization:read');
  const canUpdateOrganization = hasSessionPermission('organization:update');

  useEffect(() => {
    if (!getAccessToken()) { window.location.replace('/login'); return; }
    void (async () => {
      try {
        const userResponse = await authenticatedFetch('/api/v1/users/me');
        if (!userResponse.ok) { if (userResponse.status === 401) clearAccessToken(); throw new Error(userResponse.status === 401 ? 'انتهت الجلسة، سجل الدخول مرة أخرى.' : 'تعذر تحميل حسابك.'); }
        setUser(await userResponse.json() as CurrentUser);
        if (canReadOrganization) {
          const metricsResponse = await authenticatedFetch('/api/v1/organizations/me/dashboard');
          if (!metricsResponse.ok) throw new Error('تعذر تحميل مؤشرات العيادة.');
          setMetrics(await metricsResponse.json() as DashboardMetrics);
        }
      } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'تعذر تحميل لوحة التحكم.'); }
      finally { setLoading(false); }
    })();
  }, [canReadOrganization]);

  const signOut = () => { clearAccessToken(); window.location.assign('/login'); };
  return <main dir="rtl" className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900"><section className="mx-auto max-w-6xl rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-semibold text-teal-700">Clinico</p><h1 className="mt-1 text-3xl font-bold">لوحة تحكم العيادة</h1><p className="mt-2 text-slate-600">نظرة سريعة على الاستقبال والمواعيد والجمهور التسويقي الموافق.</p></div><button type="button" onClick={signOut} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">تسجيل الخروج</button></div>{error ? <div className="mt-8 rounded-lg bg-red-50 p-4 text-red-700">{error}<Link href="/login" className="mr-2 font-medium underline">تسجيل الدخول</Link></div> : loading || !user ? <p className="mt-8 text-slate-600">جارٍ تحميل مساحة العيادة الآمنة…</p> : <><div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{metrics && <><Metric title="إجمالي المرضى" value={formatNumber.format(metrics.patients)} detail={`+${formatNumber.format(metrics.newPatientsThisMonth)} هذا الشهر`} tone="bg-sky-50 text-sky-900" /><Metric title="مواعيد اليوم" value={formatNumber.format(metrics.todayAppointments)} detail={`${formatNumber.format(metrics.todayByStatus.checked_in || 0)} حضر حتى الآن`} tone="bg-teal-50 text-teal-900" /><Metric title="القادم خلال 7 أيام" value={formatNumber.format(metrics.upcomingAppointments)} detail="غير الملغى فقط" tone="bg-violet-50 text-violet-900" /><Metric title="جمهور تسويقي موافق" value={formatNumber.format(metrics.consentedPatients)} detail="مؤهل للتصدير فقط بموافقة" tone="bg-emerald-50 text-emerald-900" /></>}</div><div className="mt-7 rounded-xl border border-slate-200 p-5"><p className="text-sm text-slate-600">مساحة العمل الحالية</p><p className="mt-1 text-xl font-bold">{user.firstName} {user.lastName}</p><p className="mt-1 text-sm text-slate-500">{user.email} · {user.role}</p></div></>}<div className="mt-7 flex flex-wrap gap-3 border-t border-slate-200 pt-6"><Link href="/patients" className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800">إدارة المرضى</Link><Link href="/appointments" className="rounded-lg border border-violet-700 px-4 py-2 text-sm font-semibold text-violet-800 hover:bg-violet-50">المواعيد</Link><Link href="/patients/import" className="rounded-lg border border-sky-700 px-4 py-2 text-sm font-semibold text-sky-800 hover:bg-sky-50">استيراد بيانات CRM</Link><Link href="/audiences" className="rounded-lg border border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50">الجمهور التسويقي</Link><Link href="/team" className="rounded-lg border border-teal-700 px-4 py-2 text-sm font-semibold text-teal-800 hover:bg-teal-50">فريق العيادة</Link>{canUpdateOrganization && <Link href="/settings" className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50">إعدادات العيادة</Link>}</div><p className="mt-6 text-xs text-slate-500">تنبيه تشغيلي: قبل النشر العام، فعّل نسخة احتياطية تلقائية لقاعدة البيانات من مزود الاستضافة. لا تعتبر جهاز التطوير نسخة احتياطية.</p></section></main>;
}

function Metric({ title, value, detail, tone }: { title: string; value: string; detail: string; tone: string }) {
  return <div className={`rounded-xl p-5 ${tone}`}><p className="text-sm opacity-80">{title}</p><p className="mt-2 text-3xl font-bold" dir="ltr">{value}</p><p className="mt-2 text-xs opacity-80">{detail}</p></div>;
}
