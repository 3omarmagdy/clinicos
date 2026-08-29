'use client';

import Link from 'next/link';
import { BrandMark } from '@/components/brand-mark';

const navigation = [['المنتج', '#product'], ['للفريق', '#workflow'], ['الباقات', '#plans']];
const outcomes = [
  ['01', 'Patient Operations', 'ملف مريض منظم، بيانات اتصال واضحة، وسجل الزيارات في مكان واحد.'],
  ['02', 'Appointment Flow', 'الاستقبال والطبيب يعملان على جدول واحد بدون تكرار أو فقدان للمتابعة.'],
  ['03', 'Clinical Workspace', 'ملاحظات ووصفات إلكترونية منظمة بصلاحيات تحمي الخصوصية السريرية.'],
];
const plans: Array<[string, string, string, string[]]> = [
  ['Starter', '449', 'لعيادة مستقلة', ['طبيب واحد', '500 مريض', '300 موعد شهريًا']],
  ['Professional', '799', 'لفريق آخذ في النمو', ['طبيبان و5 أعضاء', '2,000 مريض', 'مواعيد غير محدودة']],
  ['Clinic', '1,199', 'تشغيل متكامل للعيادة', ['5 أطباء و10 أعضاء', 'مرضى غير محدودين', 'WhatsApp ضمن الخطة']],
];

export default function Home() {
  return <main dir="rtl" className="min-h-screen overflow-hidden bg-[#f4f8fb] text-[#0b1f33]">
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
        <BrandMark />
        <nav className="flex items-center gap-1" aria-label="التنقل الرئيسي">
          {navigation.map(([label, href]) => <a key={href} href={href} className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 md:inline-flex">{label}</a>)}
          <Link href="/login" className="mr-2 rounded-xl border border-[#b8cadd] px-4 py-2 text-sm font-bold text-[#0b1f33] hover:bg-slate-50">تسجيل الدخول</Link>
          <Link href="/register" className="rounded-xl bg-[#1268a6] px-4 py-2 text-sm font-bold text-white shadow-lg shadow-blue-900/15 hover:bg-[#0d5285]">ابدأ التجربة</Link>
        </nav>
      </div>
    </header>

    <section className="clinicos-grid relative bg-[#0b1f33] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(16,175,163,.32),transparent_28rem),radial-gradient(circle_at_82%_10%,rgba(18,104,166,.38),transparent_30rem)]" />
      <div className="relative mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[1.05fr_.95fr] lg:py-28">
        <div className="max-w-3xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-teal-300/30 bg-teal-300/10 px-3 py-1.5 text-xs font-bold tracking-[.13em] text-teal-200"><span className="h-2 w-2 rounded-full bg-[#10afa3]" /> CLINIC OPERATING SYSTEM</p>
          <h1 className="mt-7 text-4xl font-bold leading-[1.25] sm:text-6xl">إدارة عيادتك.<br /><span className="text-[#6fe0d8]">كل حاجة في مكان واحد.</span></h1>
          <p className="mt-6 max-w-2xl text-lg leading-9 text-slate-300">Clinicos يربط الطبيب والاستقبال وفريق العيادة في Workflow واحد؛ من الحجز وPatient Profile إلى المتابعة والوصفة الإلكترونية.</p>
          <div className="mt-9 flex flex-wrap gap-3"><Link href="/register" className="rounded-xl bg-[#10afa3] px-6 py-3.5 text-sm font-bold text-[#062538] shadow-lg shadow-teal-400/20 hover:bg-[#68ddd4]">أنشئ مساحة عيادتك</Link><Link href="/demo" className="rounded-xl border border-white/25 px-6 py-3.5 text-sm font-bold text-white hover:bg-white/10">شاهد التجربة</Link></div>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-300"><span>✓ تجربة 14 يومًا</span><span>✓ بدون بطاقة ائتمانية</span><span>✓ بيانات عيادتك معزولة</span></div>
        </div>
        <DashboardPreview />
      </div>
    </section>

    <section id="product" className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
      <div className="max-w-3xl"><p className="text-xs font-bold tracking-[.16em] text-[#0a948d]">CLINICOS PLATFORM</p><h2 className="mt-3 text-3xl font-bold leading-tight sm:text-5xl">تشغيل العيادة يحتاج وضوحًا، لا شاشات أكثر.</h2><p className="mt-5 text-lg leading-8 text-slate-600">تصميم هادئ، معلومات واضحة، وأدوات موزعة حسب دور المستخدم داخل العيادة.</p></div>
      <div className="mt-10 grid gap-5 md:grid-cols-3">{outcomes.map(([number, title, text]) => <article key={number} className="clinicos-card rounded-2xl p-7"><p className="text-xs font-bold tracking-[.16em] text-[#0a948d]">{number}</p><h3 className="mt-8 text-xl font-bold text-[#0b1f33]">{title}</h3><p className="mt-4 leading-7 text-slate-600">{text}</p><span className="mt-7 block h-px bg-slate-100" /><p className="mt-4 text-sm font-bold text-[#1268a6]">مصمم لسير العمل الطبي</p></article>)}</div>
    </section>

    <section id="workflow" className="border-y border-[#dce7ef] bg-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[.72fr_1.28fr] lg:items-center">
        <div><p className="text-xs font-bold tracking-[.16em] text-[#0a948d]">ONE CONNECTED FLOW</p><h2 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl">الفريق يعمل كفريق، والمريض يرى رعاية أوضح.</h2><p className="mt-5 leading-8 text-slate-600">الاستقبال يحجز ويسجل، الطبيب يراجع ويكتب، والإدارة تتابع التشغيل. لكل دور واجهة مفهومة وصلاحيات واضحة.</p><Link href="/demo" className="mt-7 inline-flex rounded-xl bg-[#0b1f33] px-5 py-3 text-sm font-bold text-white hover:bg-[#173e60]">استكشف Clinicos</Link></div>
        <div className="grid gap-4 sm:grid-cols-3">{[['الاستقبال', 'Registration & Scheduling', 'يسجل المريض ويحجز الموعد دون دخول إلى التفاصيل الطبية.'], ['الطبيب', 'Clinical Notes & e-Rx', 'يفتح Patient Profile ويوثق الزيارة ويطبع وصفة إلكترونية.'], ['الإدارة', 'Operations & Insights', 'تدير الفريق والاشتراك والنشاط داخل عيادتك.']].map(([name, english, text], index) => <article key={name} className={`rounded-2xl p-6 ${index === 1 ? 'bg-[#0b1f33] text-white' : 'border border-[#dce7ef] bg-[#f8fbfd]'}`}><span className={`grid h-10 w-10 place-items-center rounded-xl text-sm font-bold ${index === 1 ? 'bg-[#10afa3] text-[#0b1f33]' : 'bg-[#dff7f3] text-[#087e76]'}`}>0{index + 1}</span><h3 className="mt-7 text-xl font-bold">{name}</h3><p className={`mt-2 text-xs font-semibold ${index === 1 ? 'text-teal-200' : 'text-[#1268a6]'}`}>{english}</p><p className={`mt-5 text-sm leading-7 ${index === 1 ? 'text-slate-300' : 'text-slate-600'}`}>{text}</p></article>)}</div>
      </div>
    </section>

    <section id="plans" className="mx-auto max-w-7xl px-5 py-20 sm:px-8"><div className="text-center"><p className="text-xs font-bold tracking-[.16em] text-[#0a948d]">SIMPLE PRICING</p><h2 className="mt-3 text-3xl font-bold sm:text-4xl">اختر ما يناسب حجم عيادتك.</h2><p className="mt-4 text-slate-600">ابدأ بتجربة منظمة، ثم فعّل باقة شهرية عند الجاهزية.</p></div><div className="mt-10 grid gap-5 md:grid-cols-3">{plans.map(([name, price, caption, features], index) => <article key={name} className={`rounded-2xl p-7 ${index === 1 ? 'bg-[#0b1f33] text-white shadow-xl shadow-blue-950/15' : 'clinicos-card'}`}><p className={`text-sm font-bold ${index === 1 ? 'text-teal-300' : 'text-[#1268a6]'}`}>{name}</p><p className="mt-5 text-4xl font-bold" dir="ltr">{price} <span className={`text-sm font-medium ${index === 1 ? 'text-slate-300' : 'text-slate-500'}`}>EGP/mo</span></p><p className={`mt-3 ${index === 1 ? 'text-slate-300' : 'text-slate-600'}`}>{caption}</p><ul className={`mt-6 space-y-3 border-t pt-5 text-sm ${index === 1 ? 'border-white/15 text-slate-200' : 'border-slate-100 text-slate-600'}`}>{(features as string[]).map((feature) => <li key={feature}>✓ {feature}</li>)}</ul><Link href="/register" className={`mt-8 block rounded-xl px-4 py-3 text-center text-sm font-bold ${index === 1 ? 'bg-[#10afa3] text-[#062538]' : 'bg-[#e8f3fb] text-[#1268a6]'}`}>ابدأ الآن</Link></article>)}</div></section>

    <footer className="border-t border-slate-200 bg-white"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-7 text-sm text-slate-500 sm:px-8"><BrandMark /><p>Clinicos — Connected Care for every clinic.</p><Link href="/login" className="font-bold text-[#1268a6]">دخول النظام</Link></div></footer>
  </main>;
}

function DashboardPreview() {
  return <div className="relative rounded-[1.8rem] border border-white/15 bg-[#f8fbfd] p-4 text-[#0b1f33] shadow-[0_30px_80px_-35px_rgba(0,0,0,.7)] sm:p-5">
    <div className="flex items-center justify-between border-b border-slate-200 pb-4"><div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#0b1f33] text-xs font-bold text-[#6fe0d8]">C</span><span className="text-sm font-bold">Clinicos</span></div><span className="rounded-full bg-[#dff7f3] px-3 py-1 text-xs font-bold text-[#087e76]">Today</span></div>
    <div className="mt-4 grid grid-cols-4 gap-2">{[['23', 'Patients'], ['12', 'Appointments'], ['08', 'Visits'], ['EGP', 'Revenue']].map(([value, label]) => <div key={label} className="rounded-xl border border-slate-100 bg-white p-3"><p className="text-lg font-bold text-[#0b1f33]">{value}</p><p className="mt-1 text-[9px] font-semibold text-slate-500">{label}</p></div>)}</div>
    <div className="mt-4 grid gap-3 sm:grid-cols-[1.25fr_.75fr]"><div className="rounded-xl border border-slate-100 bg-white p-4"><p className="text-xs font-bold">Appointment Timeline</p><div className="mt-4 space-y-3">{[['09:00', 'Ahmed H.', 'Confirmed'], ['10:30', 'Mona A.', 'Waiting'], ['12:00', 'Salma K.', 'Scheduled']].map(([time, name, status]) => <div key={time} className="flex items-center gap-2 text-xs"><span className="w-10 font-bold text-[#1268a6]" dir="ltr">{time}</span><span className="h-7 w-7 rounded-full bg-[#dff7f3]" /><span className="flex-1 font-semibold">{name}</span><span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] text-slate-500">{status}</span></div>)}</div></div><div className="rounded-xl bg-[#0b1f33] p-4 text-white"><p className="text-xs font-bold text-teal-200">Patient Activity</p><p className="mt-5 text-3xl font-bold">+12%</p><div className="mt-5 flex h-16 items-end gap-1">{[30, 48, 37, 67, 52, 86, 70].map((height, index) => <span key={index} className="flex-1 rounded-t bg-[#10afa3]" style={{ height: `${height}%` }} />)}</div><p className="mt-3 text-[10px] text-slate-300">هذا الأسبوع</p></div></div>
  </div>;
}
