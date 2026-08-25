'use client';

import Link from 'next/link';
import { BrandMark } from '@/components/brand-mark';

const whatsappTrialUrl =
  'https://wa.me/201102418143?text=%D9%85%D8%B1%D8%AD%D8%A8%D9%8B%D8%A7%20Clinicos%D8%8C%20%D8%A3%D8%B1%D8%BA%D8%A8%20%D9%81%D9%8A%20%D8%AA%D8%AC%D8%B1%D8%A8%D8%A9%20%D8%A7%D9%84%D9%86%D8%B8%D8%A7%D9%85%20%D9%84%D8%B9%D9%8A%D8%A7%D8%AF%D8%AA%D9%8A.';

const roles = [
  ['الاستقبال', 'يسجّل الزيارة ويحجز الموعد ويعرف ما يحتاجه المريض دون الدخول في التفاصيل الطبية.'],
  ['الطبيب', 'يرى تاريخ المريض وسجله السريري ويكتب الوصفة الإلكترونية في مساحة هادئة وواضحة.'],
  ['المدير', 'يدير الفريق والاستيراد والنشاط والتسويق المعتمد على موافقة المريض فقط.'],
];

export default function Home() {
  return (
    <main dir="rtl" className="min-h-screen overflow-hidden bg-[#061a20] text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[680px] bg-[radial-gradient(circle_at_82%_10%,rgba(45,212,191,.27),transparent_34%),radial-gradient(circle_at_15%_28%,rgba(14,165,233,.17),transparent_29%)]" />
      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <header className="flex items-center justify-between py-6 sm:py-8">
          <BrandMark light />
          <nav className="flex items-center gap-2 sm:gap-3" aria-label="التنقل الرئيسي">
            <Link href="/demo" className="hidden rounded-xl px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10 sm:inline-block">شاهد التجربة</Link>
            <Link href="/login" className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-bold transition hover:border-teal-200/60 hover:bg-white/10">دخول النظام</Link>
          </nav>
        </header>

        <section className="grid items-center gap-12 pb-20 pt-10 lg:grid-cols-[1.08fr_.92fr] lg:pb-28 lg:pt-20">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-teal-200/25 bg-teal-300/10 px-4 py-2 text-sm font-semibold text-teal-100"><span className="h-2 w-2 rounded-full bg-teal-300" /> نظام تشغيل إنساني للعيادات</p>
            <h1 className="mt-7 text-4xl font-extrabold leading-[1.18] tracking-tight text-white sm:text-6xl">كل مريض يستحق<span className="block bg-gradient-to-l from-teal-200 via-cyan-200 to-white bg-clip-text text-transparent">فريقًا متصلًا حوله.</span></h1>
            <p className="mt-7 max-w-2xl text-lg leading-9 text-slate-300 sm:text-xl"><strong className="font-bold text-white">Clinicos</strong> يربط الاستقبال والطبيب والإدارة في رحلة واحدة واضحة؛ حتى يحصل المريض على اهتمام أدق، ويعمل فريقك بانسجام أكبر في كل زيارة.</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/register" className="rounded-xl bg-teal-300 px-6 py-3.5 text-sm font-extrabold text-slate-950 shadow-xl shadow-teal-400/20 transition hover:-translate-y-0.5 hover:bg-teal-200">أنشئ مساحة عيادتك مجانًا</Link>
              <Link href="/demo" className="rounded-xl border border-white/20 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-white/10">استكشف التجربة أولًا</Link>
            </div>
            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-300"><span>✓ مساحة مستقلة لكل عيادة</span><span>✓ صلاحيات حسب الدور</span><span>✓ بيانات تجريبية آمنة</span></div>
          </div>

          <div className="relative mx-auto w-full max-w-lg rounded-[2rem] border border-white/15 bg-slate-900/70 p-5 shadow-2xl shadow-black/30 backdrop-blur sm:p-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-5"><div><p className="text-sm font-bold text-teal-200">رحلة المريض اليوم</p><p className="mt-1 text-xs text-slate-400">رؤية واحدة، لكل من يحتاجها</p></div><span className="rounded-full bg-teal-300/10 px-3 py-1 text-xs font-bold text-teal-200">منظّم</span></div>
            <div className="mt-5 space-y-3">
              {[
                ['01', 'الاستقبال', 'تأكيد الزيارة والبيانات الأساسية'],
                ['02', 'الطبيب', 'تاريخ واضح وخطة متابعة ووصفة'],
                ['03', 'الفريق', 'موعد قادم ومسؤولية محددة'],
              ].map(([number, title, detail], index) => <div key={title} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[.045] p-4"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm font-black ${index === 1 ? 'bg-teal-300 text-slate-950' : 'bg-white/10 text-teal-100'}`}>{number}</span><div><p className="font-bold text-white">{title}</p><p className="mt-0.5 text-xs leading-5 text-slate-400">{detail}</p></div></div>)}
            </div>
            <div className="mt-5 rounded-2xl bg-gradient-to-l from-teal-300/15 to-cyan-400/10 p-4 text-sm leading-6 text-teal-50">لا شاشة مزدحمة. فقط الخطوة الصحيحة، للشخص الصحيح، في الوقت الصحيح.</div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-12 text-slate-900 shadow-2xl shadow-black/10 sm:px-10 sm:py-16">
          <div className="max-w-2xl"><p className="text-sm font-extrabold text-teal-700">مصمم ليوم العيادة الحقيقي</p><h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">أدوار واضحة، بدلًا من نظام يربك الجميع.</h2><p className="mt-4 text-base leading-8 text-slate-600">كل شخص يبدأ من مساحة تناسبه؛ لهذا لا تضيع الاستقبال في السجل الطبي، ولا يفقد الطبيب وقتًا في البحث عن بيانات الزيارة.</p></div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">{roles.map(([title, description], index) => <article key={title} className="rounded-2xl border border-slate-200 p-6 transition hover:-translate-y-1 hover:border-teal-300 hover:shadow-lg"><span className="text-sm font-black text-teal-700">0{index + 1}</span><h3 className="mt-5 text-xl font-extrabold">{title}</h3><p className="mt-3 text-sm leading-7 text-slate-600">{description}</p></article>)}</div>
        </section>

        <section className="grid gap-8 py-20 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
          <div><p className="text-sm font-extrabold text-teal-200">انتقل بدون بداية مؤلمة</p><h2 className="mt-3 text-3xl font-extrabold leading-tight sm:text-4xl">نظامك السابق ليس عائقًا أمام بداية أفضل.</h2><p className="mt-5 text-base leading-8 text-slate-300">ارفع ملف CRM، راجع عيّنة قبل النقل، ثم ابدأ العمل على ملف المرضى دون إدخال الأسماء واحدًا واحدًا.</p><Link href="/patients/import" className="mt-7 inline-block text-sm font-bold text-teal-200 hover:text-white">تعرّف على الاستيراد الآمن ←</Link></div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[['نقل بيانات CRM', 'مراجعة الأعمدة والعينة ومنع تكرار الهاتف قبل الحفظ.'], ['وصفة إلكترونية', 'قالب باسم العيادة ومعلوماتها، جاهز للكتابة والطباعة.'], ['تسويق بموافقة', 'تصدير الجمهور المصرّح له فقط، مع الحفاظ على الثقة والخصوصية.'], ['سجل نشاط', 'متابعة أهم العمليات دون كشف محتوى الملف الطبي أو تفاصيله الحساسة.']].map(([title, description]) => <div key={title} className="rounded-2xl border border-white/10 bg-white/[.06] p-6"><p className="font-extrabold">{title}</p><p className="mt-3 text-sm leading-7 text-slate-300">{description}</p></div>)}
          </div>
        </section>

        <section className="border-t border-white/10 py-16">
          <div className="text-center"><p className="text-sm font-extrabold text-teal-200">ابدأ بالطريقة التي تناسبك</p><h2 className="mt-3 text-3xl font-extrabold sm:text-4xl">تجربة واضحة اليوم، اشتراك شهري عندما تكون جاهزًا.</h2><p className="mx-auto mt-4 max-w-2xl leading-7 text-slate-300">نبدأ بتجربة ببيانات وهمية حتى تتعرّف على المسارات والأدوار بأمان. بعد ذلك يفعّل مالك المنصة باقتك شهريًا يدويًا في المرحلة الحالية.</p></div>
          <div className="mx-auto mt-10 grid max-w-5xl gap-5 md:grid-cols-3">
            <div className="rounded-2xl border border-white/15 p-6"><h3 className="font-extrabold">استكشف</h3><p className="mt-3 text-sm leading-7 text-slate-300">شاهد الحساب التجريبي وجرّب رحلة العمل ببيانات غير حقيقية.</p><Link href="/demo" className="mt-6 inline-block font-bold text-teal-200 hover:text-white">افتح التجربة ←</Link></div>
            <div className="rounded-2xl border-2 border-teal-300 bg-teal-300 p-6 text-slate-950"><p className="text-sm font-black">لعيادة مستقلة</p><h3 className="mt-2 text-2xl font-black">باقة شهرية</h3><p className="mt-3 text-sm leading-7 text-slate-800">تشغيل يومي، فريق، مرضى، مواعيد، واستيراد منظّم.</p><a href={whatsappTrialUrl} target="_blank" rel="noreferrer" className="mt-6 inline-block font-extrabold underline underline-offset-4">اطلب تفعيل الباقة ←</a></div>
            <div className="rounded-2xl border border-white/15 p-6"><h3 className="font-extrabold">للمراكز والفروع</h3><p className="mt-3 text-sm leading-7 text-slate-300">نقل منظم للبيانات، تهيئة للفريق، وخطة إطلاق تناسب حجم المركز.</p><a href={whatsappTrialUrl} target="_blank" rel="noreferrer" className="mt-6 inline-block font-bold text-teal-200 hover:text-white">تحدث معنا ←</a></div>
          </div>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 py-7 text-sm text-slate-400"><BrandMark light /><p>Clinicos — رعاية أوضح، وفريق أقرب.</p></footer>
      </div>
    </main>
  );
}
