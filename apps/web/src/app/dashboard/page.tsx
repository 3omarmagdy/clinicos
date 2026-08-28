'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { authenticatedFetch, clearAccessToken, getAccessToken, hasSessionPermission, isPlatformAdminSession, signOut } from '@/lib/auth-session';
import { WorkspaceShell } from '@/components/workspace-shell';

type CurrentUser = { id: string; email: string; firstName: string; lastName: string; role: string; organizationId: string };
type DashboardMetrics = { patients: number; consentedPatients: number; newPatientsThisMonth: number; todayAppointments: number; upcomingAppointments: number; todayByStatus: Record<string, number> };

const formatNumber = new Intl.NumberFormat('en-US');

const roleCopy: Record<string, { eyebrow: string; title: string; description: string }> = {
  receptionist: {
    eyebrow: 'RECEPTION DESK',
    title: 'مساحة الاستقبال',
    description: 'احجز المواعيد، سجّل بيانات المريض، وتابع حالة الحضور من مكان واحد — دون إظهار الملاحظات السريرية أو الوصفات.',
  },
  doctor: {
    eyebrow: 'DOCTOR WORKSPACE',
    title: 'مساحة الطبيب',
    description: 'تابع جدولك اليومي، افتح ملف المريض، ثم دوّن الملاحظات السريرية أو اكتب الوصفة عند الحاجة.',
  },
  owner: {
    eyebrow: 'CLINIC OPERATIONS',
    title: 'إدارة العيادة',
    description: 'تابع التشغيل اليومي، نظّم الفريق والمرضى والمواعيد، واضبط إعدادات عيادتك من مساحة واحدة.',
  },
  admin: {
    eyebrow: 'CLINIC OPERATIONS',
    title: 'إدارة العيادة',
    description: 'نظّم الفريق والمرضى والمواعيد من لوحة تشغيل واحدة واضحة.',
  },
};

export default function DashboardPage() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const canReadOrganization = hasSessionPermission('organization:read');
  const canReadAudit = hasSessionPermission('audit:read');
  const isPlatformAdmin = isPlatformAdminSession();

  useEffect(() => {
    if (!getAccessToken()) {
      window.location.replace('/login');
      return;
    }

    void (async () => {
      try {
        const userResponse = await authenticatedFetch('/api/v1/users/me');
        if (!userResponse.ok) {
          if (userResponse.status === 401) clearAccessToken();
          throw new Error(userResponse.status === 401 ? 'انتهت الجلسة، سجّل الدخول مرة أخرى.' : 'تعذر تحميل حسابك.');
        }

        const currentUser = await userResponse.json() as CurrentUser;
        setUser(currentUser);

        if (canReadOrganization) {
          const metricsResponse = await authenticatedFetch('/api/v1/organizations/me/dashboard');
          if (!metricsResponse.ok) throw new Error('تعذر تحميل مؤشرات العيادة.');
          setMetrics(await metricsResponse.json() as DashboardMetrics);
        }
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : 'تعذر تحميل لوحة التحكم.');
      } finally {
        setLoading(false);
      }
    })();
  }, [canReadOrganization]);

  if (loading || !user) {
    return <main dir="rtl" className="grid min-h-screen place-items-center bg-[#f5f9fd] p-10 text-[#31506d]">جارٍ تحميل مساحة العمل الآمنة…</main>;
  }

  const copy = roleCopy[user.role] ?? roleCopy.admin;
  const reception = user.role === 'receptionist';
  const doctor = user.role === 'doctor';
  const owner = ['owner', 'admin'].includes(user.role);
  const fullName = `${user.firstName} ${user.lastName}`.trim();

  return (
    <WorkspaceShell name={fullName} role={user.role} onSignOut={signOut}>
      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-9">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#dce7f1] bg-white px-5 py-4 shadow-sm lg:hidden">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#1768a8] text-sm font-black text-white">C</span>
            <div>
              <p className="font-extrabold">Clinicos</p>
              <p className="text-xs text-slate-500">مساحة عمل العيادة</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-left sm:block">
              <p className="text-sm font-extrabold">{fullName}</p>
              <p className="text-xs text-slate-500">{user.email}</p>
            </div>
            <button type="button" onClick={signOut} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50">تسجيل الخروج</button>
          </div>
        </header>

        <section className="clinicos-grid mt-6 overflow-hidden rounded-[1.7rem] bg-[#0b1f33] px-6 py-8 text-white shadow-[0_28px_60px_-36px_rgba(11,31,51,.8)] sm:px-9">
          <p className="text-xs font-extrabold tracking-[.16em] text-[#7ee5de]">{copy.eyebrow}</p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-5">
            <div>
              <h1 className="text-3xl font-extrabold">{copy.title}</h1>
              <p className="mt-3 max-w-3xl leading-8 text-blue-100">{copy.description}</p>
            </div>
            <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold">{user.role}</span>
          </div>
        </section>

        {error && <div className="mt-5 rounded-xl bg-red-50 p-4 text-red-700">{error}<Link href="/login" className="mr-2 font-bold underline">تسجيل الدخول</Link></div>}

        {owner && <section className="mt-6 rounded-2xl border border-[#cde9e5] bg-[#f0fbf9] p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-extrabold text-[#087d78]">ابدأ بسرعة</p><h2 className="mt-1 text-lg font-extrabold">ثلاث خطوات لتشغيل عيادتك</h2></div><div className="flex flex-wrap gap-2 text-sm font-bold"><Link href="/team" className="rounded-lg bg-white px-3 py-2 text-[#176763] ring-1 ring-[#cde9e5]">1. أضف الفريق</Link><Link href="/patients/import" className="rounded-lg bg-white px-3 py-2 text-[#176763] ring-1 ring-[#cde9e5]">2. انقل بياناتك</Link><Link href="/appointments" className="rounded-lg bg-white px-3 py-2 text-[#176763] ring-1 ring-[#cde9e5]">3. ابدأ الحجوزات</Link></div></div></section>}

        {metrics && <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Metric label="PATIENTS" title="إجمالي المرضى" value={formatNumber.format(metrics.patients)} /><Metric label="TODAY" title="مواعيد اليوم" value={formatNumber.format(metrics.todayAppointments)} /><Metric label="UPCOMING" title="المواعيد خلال 7 أيام" value={formatNumber.format(metrics.upcomingAppointments)} /></section>}

        <section className="mt-6 grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
          <div className="rounded-2xl border border-[#dce7f1] bg-white p-6 shadow-sm">
            <p className="text-xs font-extrabold tracking-[.14em] text-[#1768a8]">YOUR NEXT ACTION</p>
            <h2 className="mt-2 text-xl font-extrabold">ماذا تريد أن تفعل؟</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Action href="/appointments" title={doctor ? 'جدول اليوم' : 'الحجوزات والاستشارات'} text={doctor ? 'راجع مواعيدك وحالة حضور كل مريض.' : 'احجز موعدًا جديدًا وتابع حالة الحضور والاستشارة.'} primary />
              <Action href="/patients" title={reception ? 'بيانات المرضى' : doctor ? 'ملفات المرضى والسجل الطبي' : 'إدارة المرضى'} text={reception ? 'سجّل مريضًا جديدًا أو افتح ملفًا موجودًا.' : doctor ? 'افتح الملف لتسجيل الملاحظات أو الوصفة.' : 'عرض وتحديث ملفات المرضى.'} />
              {owner && <Action href="/team" title="فريق العيادة" text="أضف أعضاء الفريق وحدد دور كل شخص." tone="teal" />}
              {owner && <Action href="/settings" title="إعدادات العيادة" text="اضبط اسم العيادة وبيانات التشغيل والطباعة." />}
              {owner && <Action href="/settings/subscription" title="الاشتراك والفوترة" text="راجع خطتك وحدود الاستخدام وطلبات التفعيل." tone="teal" />}
              {owner && <Action href="/campaigns" title="عروض WhatsApp" text="أنشئ عرضًا للمرضى الموافقين وراجعه قبل الإرسال." tone="teal" />}
              {doctor && <Action href="/patients" title="الوصفة الإلكترونية" text="افتح ملف المريض ثم أنشئ وصفة قابلة للطباعة." tone="teal" />}
            </div>
          </div>

          <aside className="rounded-2xl border border-[#dce7f1] bg-white p-6 shadow-sm">
            <p className="text-xs font-extrabold tracking-[.14em] text-[#1768a8]">WORKSPACE ACCESS</p>
            <h2 className="mt-2 text-xl font-extrabold">صلاحيات مساحة العمل</h2>
            <div className="mt-5 grid gap-2 text-sm">
              {canReadAudit && <Link href="/activity" className="rounded-xl bg-[#f5f9fd] p-3 font-bold text-[#234667] hover:bg-[#edf6ff]">سجل النشاط</Link>}
              {isPlatformAdmin && <Link href="/platform" className="rounded-xl bg-[#10233d] p-3 font-bold text-white hover:bg-[#173b63]">إدارة منصة Clinicos</Link>}
              {reception && <p className="rounded-xl bg-[#edf6ff] p-3 leading-6 text-[#17577c]">صلاحياتك مخصصة للاستقبال والحجوزات وبيانات المرضى، ولا تظهر لك الملاحظات السريرية أو الوصفات.</p>}
              {doctor && <p className="rounded-xl bg-[#f0fbf9] p-3 leading-6 text-[#176763]">صلاحياتك مخصصة لجدولك وملفات المرضى والسجل الطبي والوصفات.</p>}
              {owner && <p className="rounded-xl bg-[#f5f9fd] p-3 leading-6 text-[#234667]">أنت تدير تشغيل العيادة والفريق والاشتراك، بينما تبقى إدارة المنصة العامة منفصلة.</p>}
            </div>
          </aside>
        </section>

        <footer className="mt-6 px-2 text-xs text-slate-500">تُعرض فقط البيانات والصلاحيات المرتبطة بدورك داخل هذه العيادة.</footer>
      </section>
    </WorkspaceShell>
  );
}

function Metric({ label, title, value }: { label: string; title: string; value: string }) {
  return <article className="clinicos-card rounded-2xl p-5"><p className="text-[10px] font-extrabold tracking-[.16em] text-[#0a948d]">{label}</p><p className="mt-3 text-sm font-semibold text-slate-500">{title}</p><p dir="ltr" className="mt-2 text-3xl font-bold text-[#0b1f33]">{value}</p><span className="mt-4 block h-1.5 w-14 rounded-full bg-gradient-to-l from-[#10afa3] to-[#1268a6]" /></article>;
}

function Action({ href, title, text, primary, tone }: { href: string; title: string; text: string; primary?: boolean; tone?: 'teal' }) {
  return <Link href={href} className={`rounded-xl border p-4 transition hover:-translate-y-0.5 ${primary ? 'border-[#1768a8] bg-[#1768a8] text-white' : tone === 'teal' ? 'border-[#bfe6e1] bg-[#f0fbf9] text-[#135d59]' : 'border-[#dce7f1] bg-[#fbfdff] text-[#1e3d5d]'}`}><p className="font-extrabold">{title}</p><p className={`mt-1 text-xs leading-6 ${primary ? 'text-blue-100' : 'opacity-80'}`}>{text}</p></Link>;
}
