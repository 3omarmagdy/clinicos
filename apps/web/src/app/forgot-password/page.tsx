import Link from 'next/link';
import { BrandMark } from '@/components/brand-mark';

export default function ForgotPasswordPage() {
  return <main dir="rtl" className="min-h-screen bg-slate-950 px-4 py-10"><section className="mx-auto max-w-md"><BrandMark light /><div className="mt-8 rounded-2xl bg-white p-7 text-slate-900 shadow-2xl"><p className="text-sm font-semibold text-teal-700">استعادة الوصول</p><h1 className="mt-1 text-3xl font-bold">هل نسيت كلمة المرور؟</h1><p className="mt-3 leading-7 text-slate-600">في هذه المرحلة، اطلب من مالك العيادة أو مديرها تعيين كلمة مرور مؤقتة لك من صفحة «فريق العيادة». لا نرسل كلمات مرور في البريد أو واتساب.</p><div className="mt-6 rounded-lg bg-slate-50 p-4 text-sm text-slate-700"><p className="font-semibold">للمالك أو المدير</p><p className="mt-1">ادخل إلى فريق العيادة، اختر الموظف، ثم اضغط «تعيين كلمة مرور».</p></div><Link href="/login" className="mt-6 inline-block rounded-lg bg-teal-700 px-4 py-3 font-bold text-white hover:bg-teal-800">العودة لتسجيل الدخول</Link></div></section></main>;
}
