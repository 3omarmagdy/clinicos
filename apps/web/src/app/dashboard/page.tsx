'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { authenticatedFetch, clearAccessToken, getAccessToken, hasSessionPermission, isPlatformAdminSession, signOut } from '@/lib/auth-session';

type CurrentUser = { id: string; email: string; firstName: string; lastName: string; role: string; organizationId: string };
type DashboardMetrics = { patients: number; consentedPatients: number; newPatientsThisMonth: number; todayAppointments: number; upcomingAppointments: number; todayByStatus: Record<string, number> };
const formatNumber = new Intl.NumberFormat('en-US');

const roleCopy: Record<string, { title: string; description: string }> = {
  receptionist: { title: 'استقبال اليوم', description: 'تسجيل مريض، البحث عن ملفه، ثم حجز الموعد وتحديث حالة الحضور — دون الوصول للمحتوى الطبي.' },
  doctor: { title: 'عيادتك اليوم', description: 'راجع مواعيد اليوم، افتح ملف المريض، ثم اكتب سجل الكشف أو الوصفة الإلكترونية واطبعها.' },
  owner: { title: 'لوحة إدارة العيادة', description: 'تابع الاستقبال والمواعيد وفريقك وبياناتك التسويقية الموافَق عليها.' },
  admin: { title: 'لوحة إدارة العيادة', description: 'تابع التشغيل اليومي ونظّم الفريق والمرضى.' },
};

export default function DashboardPage() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const canReadOrganization = hasSessionPermission('organization:read');
  const canUpdateOrganization = hasSessionPermission('organization:update');
  const canReadAudit = hasSessionPermission('audit:read');
  const isPlatformAdmin = isPlatformAdminSession();

  useEffect(() => {
    if (!getAccessToken()) { window.location.replace('/login'); return; }
    void (async () => {
      try {
        const userResponse = await authenticatedFetch('/api/v1/users/me');
        if (!userResponse.ok) { if (userResponse.status === 401) clearAccessToken(); throw new Error(userResponse.status === 401 ? 'انتهت الجلسة، سجل الدخول مرة أخرى.' : 'تعذر تحميل حسابك.'); }
        const currentUser = await userResponse.json() as CurrentUser;
        setUser(currentUser);
        if (canReadOrganization) {
          const metricsResponse = await authenticatedFetch('/api/v1/organizations/me/dashboard');
          if (!metricsResponse.ok) throw new Error('تعذر تحميل مؤشرات العيادة.');
          setMetrics(await metricsResponse.json() as DashboardMetrics);
        }
      } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'تعذر تحميل لوحة التحكم.'); }
      finally { setLoading(false); }
    })();
  }, [canReadOrganization]);

  if (loading || !user) return <main dir="rtl" className="min-h-screen bg-slate-50 p-10 text-slate-700">جارٍ تحميل مساحة العيادة الآمنة…</main>;
  const copy = roleCopy[user.role] ?? roleCopy.admin;
  const reception = user.role === 'receptionist';
  const doctor = user.role === 'doctor';
  const owner = ['owner', 'admin'].includes(user.role);
  return <main dir="rtl" className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900"><section className="mx-auto max-w-6xl rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8"><header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-semibold text-teal-700">Clinico · مساحة العيادة</p><h1 className="mt-1 text-3xl font-bold">{copy.title}</h1><p className="mt-2 max-w-2xl text-slate-600">{copy.description}</p></div><button type="button" onClick={signOut} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50">تسجيل الخروج</button></header>{error && <div className="mt-6 rounded-lg bg-red-50 p-4 text-red-700">{error}<Link href="/login" className="mr-2 font-medium underline">تسجيل الدخول</Link></div>}
    {owner && <section className="mt-7 rounded-xl border border-teal-100 bg-teal-50 p-5"><h2 className="font-bold text-teal-950">ابدأ في 3 خطوات</h2><ol className="mt-3 grid gap-2 text-sm text-teal-900 sm:grid-cols-3"><li>1. <Link className="font-semibold underline" href="/team">أضف فريقك</Link></li><li>2. <Link className="font-semibold underline" href="/patients/import">استورد ملفاتك السابقة</Link></li><li>3. <Link className="font-semibold underline" href="/appointments">احجز أول موعد</Link></li></ol></section>}
    {metrics && <section className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Metric title="إجمالي المرضى" value={formatNumber.format(metrics.patients)} tone="bg-sky-50 text-sky-900" /><Metric title="مواعيد اليوم" value={formatNumber.format(metrics.todayAppointments)} tone="bg-teal-50 text-teal-900" /><Metric title="القادم خلال 7 أيام" value={formatNumber.format(metrics.upcomingAppointments)} tone="bg-violet-50 text-violet-900" />{owner && <Metric title="جمهور تسويقي موافق" value={formatNumber.format(metrics.consentedPatients)} tone="bg-emerald-50 text-emerald-900" />}</section>}
    <section className="mt-7"><h2 className="text-lg font-bold">إجراءاتك الآن</h2><div className="mt-3 flex flex-wrap gap-3"><Link href="/patients" className="rounded-lg bg-sky-700 px-4 py-3 text-sm font-semibold text-white hover:bg-sky-800">{reception ? 'تسجيل أو بحث عن مريض' : doctor ? 'فتح ملف مريض' : 'إدارة المرضى'}</Link><Link href="/appointments" className="rounded-lg border border-violet-700 px-4 py-3 text-sm font-semibold text-violet-800 hover:bg-violet-50">{doctor ? 'مواعيد ومرضى اليوم' : 'المواعيد'}</Link>{doctor && <Link href="/patients" className="rounded-lg bg-teal-700 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-800">كتابة وطباعة وصفة</Link>}{owner && <><Link href="/team" className="rounded-lg border border-teal-700 px-4 py-3 text-sm font-semibold text-teal-800 hover:bg-teal-50">فريق العيادة</Link><Link href="/patients/import" className="rounded-lg border border-sky-700 px-4 py-3 text-sm font-semibold text-sky-800 hover:bg-sky-50">استيراد بيانات CRM</Link><Link href="/audiences" className="rounded-lg border border-emerald-700 px-4 py-3 text-sm font-semibold text-emerald-800 hover:bg-emerald-50">الجمهور التسويقي</Link></>}{canReadAudit && <Link href="/activity" className="rounded-lg border border-amber-700 px-4 py-3 text-sm font-semibold text-amber-800 hover:bg-amber-50">سجل النشاط</Link>}{canUpdateOrganization && <Link href="/settings" className="rounded-lg border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50">إعدادات العيادة</Link>}{isPlatformAdmin && <Link href="/platform" className="rounded-lg bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">إدارة المنصة</Link>}</div>{doctor && <p className="mt-4 rounded-lg bg-teal-50 p-3 text-sm text-teal-900">لإنشاء الوصفة: افتح ملف المريض ثم اختر «وصفة إلكترونية».</p>}{reception && <p className="mt-4 rounded-lg bg-sky-50 p-3 text-sm text-sky-900">مساحتك مخصصة للاستقبال؛ لا تظهر لك الوصفات أو السجل الطبي للمريض.</p>}</section><footer className="mt-8 border-t pt-5 text-xs text-slate-500">تُعرض فقط البيانات المصرح بها لدورك. لا تشارك كلمة مرورك مع أي شخص.</footer></section></main>;
}

function Metric({ title, value, tone }: { title: string; value: string; tone: string }) { return <div className={`rounded-xl p-5 ${tone}`}><p className="text-sm opacity-80">{title}</p><p className="mt-2 text-3xl font-bold" dir="ltr">{value}</p></div>; }
