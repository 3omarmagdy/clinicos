'use client';

import Link from 'next/link';
import { BrandMark } from '@/components/brand-mark';

const contactUrl = 'https://wa.me/201102418143?text=%D9%85%D8%B1%D8%AD%D8%A8%D9%8B%D8%A7%20Clinicos%D8%8C%20%D8%A3%D8%B1%D8%BA%D8%A8%20%D9%81%D9%8A%20%D8%AA%D8%AC%D8%B1%D8%A8%D8%A9%20%D8%A7%D9%84%D9%86%D8%B8%D8%A7%D9%85%20%D9%84%D8%B9%D9%8A%D8%A7%D8%AF%D8%AA%D9%8A.';

const workspaces = [
  { number: '01', title: 'Reception Desk', arabic: 'الاستقبال', text: 'تسجيل سريع، Patient Profile واضح، وإدارة المواعيد دون الوصول إلى المحتوى السريري.' },
  { number: '02', title: 'Clinical Workspace', arabic: 'الطبيب', text: 'EMR وClinical Notes ووصفة إلكترونية قابلة للطباعة من ملف المريض نفسه.' },
  { number: '03', title: 'Clinic Operations', arabic: 'الإدارة', text: 'فريق، استيراد من CRM، نشاط تشغيلي، وجمهور تسويقي بموافقة موثقة.' },
];

const capabilities = [
  ['Patient Profile & EMR', 'ملف موحد يختصر بيانات الزيارة والتاريخ العلاجي في مسار مفهوم.'],
  ['Smart Import', 'استيراد ملفات CRM ومراجعة العينة قبل حفظ البيانات، دون نقل يدوي مرهق.'],
  ['e-Prescription', 'وصفة إلكترونية بهوية العيادة، جاهزة للكتابة والطباعة من ملف المريض.'],
  ['Consent-based Marketing', 'تجهيز جمهور تسويقي من الحالات التي وافقت فقط، مع احترام الخصوصية.'],
];

export default function Home() {
  return (
    <main dir="rtl" className="min-h-screen bg-[#f7fafd] text-[#10233d]">
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <BrandMark />
          <nav className="flex items-center gap-2" aria-label="التنقل الرئيسي">
            <Link href="/demo" className="hidden rounded-xl px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-100 sm:inline-flex">شاهد التجربة</Link>
            <Link href="/login" className="rounded-xl border border-[#1e5fa8] px-4 py-2 text-sm font-extrabold text-[#14518e] transition hover:bg-[#edf6ff]">دخول النظام</Link>
          </nav>
        </div>
      </header>

      <section className="border-b border-[#dceaf8] bg-[linear-gradient(120deg,#f7fbff_0%,#edf7ff_58%,#f7fcfb_100%)]">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[1.05fr_.95fr] lg:py-24">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-[#b9d9f5] bg-white px-4 py-2 text-xs font-extrabold tracking-wide text-[#2166aa]"><span className="h-2 w-2 rounded-full bg-[#10a29a]" /> CLINIC OPERATIONS PLATFORM</p>
            <h1 className="mt-6 text-4xl font-extrabold leading-[1.28] tracking-tight text-[#10233d] sm:text-6xl">رعاية منظمة،<span className="block text-[#14639f]">وفريق يعرف ما عليه.</span></h1>
            <p className="mt-6 max-w-2xl text-lg leading-9 text-slate-600">Clinicos يجمع <strong className="font-extrabold text-[#163a63]">Reception، Clinical Care، وClinic Operations</strong> في مساحة عمل واحدة. كل دور يرى ما يحتاجه، وكل مريض يحصل على رحلة أكثر اتساقًا.</p>
            <div className="mt-8 flex flex-wrap gap-3"><Link href="/register" className="rounded-xl bg-[#1768a8] px-6 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-blue-200 transition hover:-translate-y-0.5 hover:bg-[#11598f]">ابدأ تجربة عيادتك</Link><Link href="/demo" className="rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-sm font-bold text-[#183b61] transition hover:border-[#82b7e3] hover:bg-[#f7fbff]">استكشف المسارات</Link></div>
            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-slate-600"><span>✓ مساحة مستقلة لكل عيادة</span><span>✓ صلاحيات حسب الدور</span><span>✓ تجربة ببيانات غير حقيقية</span></div>
          </div>

          <div className="rounded-[1.7rem] border border-[#d5e4f1] bg-white p-5 shadow-[0_24px_60px_-32px_rgba(26,78,123,.45)] sm:p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-5"><div><p className="text-sm font-extrabold text-[#173b63]">Today&apos;s care flow</p><p className="mt-1 text-xs text-slate-500">رحلة واحدة من التسجيل إلى المتابعة</p></div><span className="rounded-full bg-[#e7f7f5] px-3 py-1.5 text-xs font-extrabold text-[#087d78]">LIVE WORKSPACE</span></div>
            <div className="mt-5 space-y-3">{[['01', 'Reception', 'Patient registration · Appointment'], ['02', 'Clinical', 'EMR · Clinical Notes · e-Prescription'], ['03', 'Operations', 'Team access · Follow-up · Reporting']].map(([number, title, detail], index) => <div key={title} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-[#fbfdff] p-4"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm font-black ${index === 1 ? 'bg-[#1768a8] text-white' : 'bg-[#eaf4fc] text-[#1768a8]'}`}>{number}</span><div><p className="font-extrabold text-[#1a3555]">{title}</p><p className="mt-0.5 text-xs leading-5 text-slate-500">{detail}</p></div></div>)}</div>
            <p className="mt-5 rounded-2xl border border-[#cde9e5] bg-[#f0fbf9] p-4 text-sm leading-7 text-[#176763]">واجهة منظمة لا تطلب من كل شخص أن يفهم كل شيء؛ فقط ما يلزم لدوره الآن.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8"><div className="max-w-2xl"><p className="text-sm font-extrabold text-[#18766f]">BUILT FOR REAL CLINIC WORK</p><h2 className="mt-3 text-3xl font-extrabold leading-tight text-[#10233d] sm:text-4xl">ثلاث مساحات عمل واضحة. تجربة واحدة متصلة.</h2><p className="mt-4 text-base leading-8 text-slate-600">لا يرى الاستقبال ما يخص الطبيب، ولا يضيع الطبيب وقتًا بين تفاصيل التشغيل. كل شاشة تبدأ بالسؤال الصحيح: ما الذي تحتاجه الآن؟</p></div><div className="mt-10 grid gap-5 md:grid-cols-3">{workspaces.map((item) => <article key={item.number} className="rounded-2xl border border-[#dce7f1] bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:border-[#96c4e9] hover:shadow-lg"><span className="text-sm font-black tracking-wide text-[#1b75b9]">{item.number}</span><p className="mt-5 text-xs font-extrabold tracking-[.12em] text-[#0d8b84]">{item.title}</p><h3 className="mt-2 text-2xl font-extrabold text-[#142f4e]">{item.arabic}</h3><p className="mt-4 text-sm leading-7 text-slate-600">{item.text}</p></article>)}</div></section>

      <section className="border-y border-[#dceaf8] bg-white"><div className="mx-auto max-w-7xl px-5 py-20 sm:px-8"><div className="grid gap-8 lg:grid-cols-[.82fr_1.18fr] lg:items-center"><div><p className="text-sm font-extrabold text-[#18766f]">MIGRATE WITH CONFIDENCE</p><h2 className="mt-3 text-3xl font-extrabold leading-tight text-[#10233d] sm:text-4xl">نظامك السابق لا يجب أن يؤخر بداية أفضل.</h2><p className="mt-5 leading-8 text-slate-600">ارفع ملف CRM، راجع العينة قبل النقل، ثم ابدأ العمل من Patient Profile منظم بدل إدخال الأسماء واحدًا واحدًا.</p><Link href="/patients/import" className="mt-7 inline-flex font-extrabold text-[#1768a8] hover:text-[#0e4f83]">اكتشف استيراد البيانات ←</Link></div><div className="grid gap-4 sm:grid-cols-2">{capabilities.map(([title, text]) => <article key={title} className="rounded-2xl border border-[#dce7f1] bg-[#f9fcff] p-6"><h3 className="font-extrabold text-[#173b63]">{title}</h3><p className="mt-3 text-sm leading-7 text-slate-600">{text}</p></article>)}</div></div></div></section>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8"><div className="rounded-[2rem] bg-[#12395e] px-6 py-12 text-white shadow-xl sm:px-12"><div className="mx-auto max-w-3xl text-center"><p className="text-sm font-extrabold tracking-wider text-[#78ded7]">START WITH CLARITY</p><h2 className="mt-3 text-3xl font-extrabold sm:text-4xl">جرّب المسارات أولًا، ثم فعّل التشغيل الشهري عندما تصبح جاهزًا.</h2><p className="mt-4 leading-8 text-blue-100">الحساب التجريبي يشرح رحلة العمل ببيانات آمنة. عند جاهزية العيادة، يتم تفعيل الباقة الشهرية يدويًا في المرحلة الحالية.</p></div><div className="mx-auto mt-9 grid max-w-5xl gap-4 md:grid-cols-3"><div className="rounded-2xl border border-white/15 p-6"><h3 className="font-extrabold">تجربة موجّهة</h3><p className="mt-3 text-sm leading-7 text-blue-100">استكشف المسارات والبيانات التوضيحية قبل فتح مساحة عيادتك.</p><Link href="/demo" className="mt-6 inline-flex font-bold text-[#81e2dc]">افتح التجربة ←</Link></div><div className="rounded-2xl bg-[#56d7cd] p-6 text-[#092f4d]"><p className="text-sm font-black">لعيادة مستقلة</p><h3 className="mt-2 text-2xl font-black">اشتراك شهري</h3><p className="mt-3 text-sm leading-7">فريق ومرضى ومواعيد واستيراد وEMR في مساحة تشغيل واحدة.</p><a href={contactUrl} target="_blank" rel="noreferrer" className="mt-6 inline-flex font-extrabold underline underline-offset-4">اطلب التفعيل ←</a></div><div className="rounded-2xl border border-white/15 p-6"><h3 className="font-extrabold">مراكز وفروع</h3><p className="mt-3 text-sm leading-7 text-blue-100">خطة نقل وتهيئة للفريق تناسب حجم العمل وعدد المستخدمين.</p><a href={contactUrl} target="_blank" rel="noreferrer" className="mt-6 inline-flex font-bold text-[#81e2dc]">تحدث معنا ←</a></div></div></div></section>
      <footer className="border-t border-slate-200 bg-white"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-7 text-sm text-slate-500 sm:px-8"><BrandMark /><p>Clinicos — رعاية أوضح، وفريق أقرب.</p></div></footer>
    </main>
  );
}
