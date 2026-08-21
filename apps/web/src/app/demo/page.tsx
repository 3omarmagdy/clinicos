'use client';

import Link from 'next/link';
import { useState } from 'react';
import { BrandMark } from '@/components/brand-mark';

const patients = [
  { name: 'سارة أحمد', phone: '0100 000 0001', status: 'موعد اليوم' },
  { name: 'محمود علي', phone: '0100 000 0002', status: 'متابعة' },
  { name: 'ندى محمد', phone: '0100 000 0003', status: 'موافقة تسويقية' },
];

export default function DemoPage() {
  const [section, setSection] = useState<'dashboard' | 'patients' | 'audience'>('dashboard');

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4"><BrandMark /><div className="flex items-center gap-3"><span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">حساب تجريبي · بيانات وهمية</span><Link href="/" className="text-sm font-semibold text-teal-700">الرئيسية</Link></div></div></header>
      <div className="mx-auto grid max-w-6xl gap-6 px-6 py-8 lg:grid-cols-[210px_1fr]">
        <aside className="rounded-2xl bg-slate-950 p-4 text-white"><p className="px-3 pb-4 text-sm text-slate-300">عيادة الحياة · Demo</p>{([['dashboard', 'لوحة التحكم'], ['patients', 'إدارة المرضى'], ['audience', 'الجمهور التسويقي']] as const).map(([id, label]) => <button key={id} onClick={() => setSection(id)} className={`mb-2 w-full rounded-lg px-3 py-3 text-right text-sm font-semibold ${section === id ? 'bg-teal-400 text-slate-950' : 'text-slate-200 hover:bg-white/10'}`}>{label}</button>)}</aside>
        <section><div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">هذه بيئة عرض فقط. لا تدخل أي اسم أو رقم هاتف حقيقي؛ لا يتم حفظ أو إرسال البيانات.</div>
          {section === 'dashboard' && <><h1 className="text-3xl font-bold">لوحة تحكم العيادة</h1><p className="mt-2 text-slate-600">نموذج مبسط لما يراه مالك العيادة بعد الدخول.</p><div className="mt-6 grid gap-4 sm:grid-cols-3"><Metric title="إجمالي المرضى" value="2,009" note="قاعدة بيانات المثال" /><Metric title="مواعيد اليوم" value="8" note="3 بانتظار التأكيد" /><Metric title="جمهور موافق" value="612" note="مؤهل للتصدير" /></div><div className="mt-6 rounded-2xl bg-white p-6 shadow-sm"><h2 className="font-bold">لماذا Clinico؟</h2><ul className="mt-4 space-y-3 text-sm text-slate-600"><li>• استيراد ملفات CRM القديمة دون نقل اسمًا باسم.</li><li>• فصل كامل لبيانات كل عيادة وصلاحيات حسب الفريق.</li><li>• تصدير تسويقي مبني على الموافقة فقط.</li></ul></div></>}
          {section === 'patients' && <><div className="flex items-end justify-between gap-4"><div><h1 className="text-3xl font-bold">إدارة المرضى</h1><p className="mt-2 text-slate-600">بحث، استقبال، ومتابعة في مكان واحد.</p></div><button className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-bold text-white">+ تسجيل مريض</button></div><div className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm"><table className="w-full text-right text-sm"><thead className="bg-slate-100 text-slate-600"><tr><th className="p-4">الاسم</th><th className="p-4">الهاتف</th><th className="p-4">الحالة</th></tr></thead><tbody>{patients.map((patient) => <tr key={patient.phone} className="border-t border-slate-100"><td className="p-4 font-semibold">{patient.name}</td><td className="p-4" dir="ltr">{patient.phone}</td><td className="p-4"><span className="rounded-full bg-teal-50 px-3 py-1 text-xs text-teal-800">{patient.status}</span></td></tr>)}</tbody></table></div></>}
          {section === 'audience' && <><h1 className="text-3xl font-bold">الجمهور التسويقي</h1><p className="mt-2 text-slate-600">جهّز شريحة قابلة للتصدير للحملات بعد التحقق من الموافقة.</p><div className="mt-6 rounded-2xl bg-white p-6 shadow-sm"><div className="grid gap-4 sm:grid-cols-3"><Metric title="موافقون" value="612" note="جاهزون للتصدير" /><Metric title="القاهرة" value="344" note="ضمن الشريحة" /><Metric title="الجيزة" value="191" note="ضمن الشريحة" /></div><button className="mt-6 rounded-lg border border-teal-600 px-4 py-2 text-sm font-bold text-teal-700">تصدير CSV تجريبي</button></div></>}
        </section>
      </div>
    </main>
  );
}

function Metric({ title, value, note }: { title: string; value: string; note: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{title}</p><p className="mt-2 text-3xl font-bold text-slate-950">{value}</p><p className="mt-2 text-xs text-slate-500">{note}</p></div>;
}
