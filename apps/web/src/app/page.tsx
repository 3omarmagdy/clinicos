'use client';

import Link from 'next/link';
import { BrandMark } from '@/components/brand-mark';

export default function Home() {
  const whatsappTrialUrl =
    'https://wa.me/201102418143?text=%D9%85%D8%B1%D8%AD%D8%A8%D9%8B%D8%A7%20Clinico%D8%8C%20%D8%A3%D8%B1%D8%BA%D8%A8%20%D9%81%D9%8A%20%D8%AA%D8%AC%D8%B1%D8%A8%D8%A9%20%D8%A7%D9%84%D9%86%D8%B8%D8%A7%D9%85%20%D9%84%D8%B9%D9%8A%D8%A7%D8%AF%D8%AA%D9%8A.';

  return (
    <main dir="rtl" className="min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="mx-auto max-w-6xl px-6 py-6">
        {/* Header */}
        <header className="flex items-center justify-between">
          <BrandMark light />
          <div className="flex gap-3">
            <Link
              href="/demo"
              className="rounded-lg border border-teal-300/40 px-4 py-2 text-sm font-semibold text-teal-100 hover:bg-white/10"
            >
              حساب تجريبي
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold hover:bg-white/10"
            >
              دخول النظام
            </Link>
          </div>
        </header>

        {/* Hero */}
        <section className="grid items-center gap-12 py-20 lg:grid-cols-2">
          <div>
            <p className="inline-flex rounded-full bg-teal-400/10 px-3 py-1 text-sm font-medium text-teal-200 ring-1 ring-teal-400/30">
              تشغيل العيادة — من أول زيارة إلى المتابعة
            </p>
            <h1 className="mt-6 text-5xl font-bold leading-tight tracking-tight sm:text-6xl">
              عيادتك تعمل أسرع، وفريقك يرى ما يخصه فقط.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
              Clinico ينظّم الاستقبال، ملفات المرضى، المواعيد، الوصفات الإلكترونية ونقل
              البيانات من نظامك السابق — في مساحة مستقلة وآمنة لكل عيادة.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/register"
                className="rounded-lg bg-teal-400 px-6 py-3 font-bold text-slate-950 shadow-lg shadow-teal-400/20 hover:bg-teal-300"
              >
                ابدأ تجربة العيادة
              </Link>
              <Link
                href="/demo"
                className="rounded-lg border border-white/20 px-5 py-3 font-semibold hover:bg-white/10"
              >
                شاهد الحساب التجريبي
              </Link>
              <a
                href={whatsappTrialUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-semibold text-slate-300 underline-offset-4 hover:text-teal-200 hover:underline"
              >
                تواصل معنا
              </a>
            </div>

            <p className="mt-4 text-sm text-slate-400">
              جرّب تجربة موجهة ببيانات وهمية؛ بيانات مرضاك الفعلية لا تُستخدم في العرض.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-800 to-slate-900 p-7 shadow-2xl">
            <p className="text-sm font-semibold text-teal-300">يوم عمل أوضح</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl bg-white/5 p-5">
                <p className="text-3xl font-bold">01</p>
                <p className="mt-1 text-sm text-slate-300">الاستقبال يسجّل المريض في ثوانٍ</p>
              </div>
              <div className="rounded-2xl bg-white/5 p-5">
                <p className="text-3xl font-bold">02</p>
                <p className="mt-1 text-sm text-slate-300">الطبيب يصل للتاريخ والروشتة فورًا</p>
              </div>
              <div className="rounded-2xl bg-white/5 p-5">
                <p className="font-semibold">03 — المتابعة بثقة</p>
                <p className="mt-1 text-sm text-slate-300">
                  مواعيد وفريق وبيانات مفصولة تمامًا لكل مركز.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-white/10 py-12 text-center">
          <p className="text-sm font-semibold text-teal-300">مصمم حسب دور كل شخص</p>
          <div className="mt-6 grid gap-4 text-right md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="font-bold">للاستقبال</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">تسجيل، بحث، مواعيد، وبيانات التواصل؛ بلا تشتيت بمحتوى طبي.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="font-bold">للطبيب</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">تاريخ المريض، السجل السريري، ووصفة إلكترونية قابلة للطباعة باسم العيادة.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="font-bold">للمدير</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">الفريق، الاستيراد، النشاط، وإدارة الجمهور التسويقي المبني على الموافقة.</p>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="grid gap-4 py-20 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-6 text-slate-900">
            <p className="font-bold">ابدأ من بياناتك الحالية</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              استورد CSV، راجع العينة قبل النقل، ومنع تكرار رقم الهاتف تلقائيًا.
            </p>
          </div>
          <div className="rounded-2xl bg-white p-6 text-slate-900">
            <p className="font-bold">صلاحيات بدون فوضى</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              كل عضو يرى فقط الأدوات والبيانات المناسبة لدوره داخل العيادة.
            </p>
          </div>
          <div className="rounded-2xl bg-white p-6 text-slate-900">
            <p className="font-bold">تسويق أكثر مسؤولية</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              صدّر الجمهور التسويقي فقط عند وجود موافقة واضحة من المريض.
            </p>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="pb-16">
          <div className="mb-10 text-center">
            <p className="text-sm font-semibold text-teal-300">خطط شهرية واضحة</p>
            <h2 className="mt-2 text-3xl font-bold">ابدأ بلا مخاطرة، ثم فعّل الباقة المناسبة</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-white/15 p-6">
              <p className="font-bold">تجربة موجهة</p>
              <p className="mt-2 text-3xl font-bold">14 يومًا</p>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                شاهد النظام بأدوار واضحة وبيانات آمنة قبل استخدام بيانات عيادتك.
              </p>
              <Link
                href="/register"
                className="mt-5 inline-block font-semibold text-teal-300 hover:text-teal-200"
              >
                أنشئ التجربة ←
              </Link>
            </div>

            <div className="relative rounded-2xl border-2 border-teal-300/60 bg-teal-400/10 p-6">
              <span className="absolute -top-3 right-6 rounded-full bg-teal-400 px-3 py-1 text-xs font-bold text-slate-950">
                الأكثر اختيارًا
              </span>
              <p className="font-bold text-teal-100">عيادة مستقلة</p>
              <p className="mt-2 text-3xl font-bold">اشتراك شهري</p>
              <p className="mt-3 text-sm leading-6 text-slate-200">
                استقبال، مرضى، مواعيد، استيراد، وفريق عمل صغير.
              </p>
              <a
                href={whatsappTrialUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-block text-sm font-semibold text-teal-200 hover:text-white"
              >
                اطلب الاشتراك ←
              </a>
            </div>

            <div className="rounded-2xl border border-white/15 p-6">
              <p className="font-bold">مركز أو فروع</p>
              <p className="mt-2 text-3xl font-bold">عرض سعر</p>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                صلاحيات متقدمة، نقل CRM، تدريب الفريق، ودعم الإطلاق.
              </p>
              <a
                href={whatsappTrialUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-block text-sm font-semibold text-teal-300 hover:text-teal-200"
              >
                اطلب عرض سعر ←
              </a>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
