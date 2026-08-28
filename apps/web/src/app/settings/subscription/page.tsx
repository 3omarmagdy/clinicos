'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { getApiErrorMessage } from '@/lib/api-error';
import { authenticatedFetch, getAccessToken, hasSessionPermission } from '@/lib/auth-session';

type LimitKey = 'users' | 'doctors' | 'patients' | 'appointments' | 'branches';
type Plan = { label: string; priceEgp: number | null; limits: Record<LimitKey, number | null> };
type PaymentInstructions = {
  bankName: string;
  accountName: string;
  accountNumber: string;
  iban: string;
  swiftCode: string;
  instapayAddress: string;
  instapayLink: string;
  emoneyPhone: string;
  emoneyAppLink: string;
  reviewWindow: string;
  note: string;
};
type Current = {
  plan: keyof typeof planLabels;
  status: string;
  remainingTrialDays: number | null;
  readOnly: boolean;
  limits: Record<LimitKey, number | null>;
  usage: Record<LimitKey, number>;
};
type Payment = { id: string; amount: number; currency: string; reference: string; status: string; createdAt: string };

const planLabels = {
  FREE_TRIAL: 'تجربة مجانية',
  STARTER: 'Starter',
  PROFESSIONAL: 'Professional',
  CLINIC: 'Clinic',
  CENTER: 'Center',
} as const;
const labels: Record<LimitKey, string> = {
  users: 'أعضاء الفريق',
  doctors: 'الأطباء',
  patients: 'المرضى',
  appointments: 'مواعيد الشهر',
  branches: 'الفروع',
};
const paidPlans = ['STARTER', 'PROFESSIONAL', 'CLINIC', 'CENTER'] as const;
const emptyInstructions: PaymentInstructions = {
  bankName: '',
  accountName: '',
  accountNumber: '',
  iban: '',
  swiftCode: '',
  instapayAddress: '',
  instapayLink: '',
  emoneyPhone: '',
  emoneyAppLink: 'https://flous.page.link/eAndMoney',
  reviewWindow: 'تتم مراجعة الطلب خلال أيام العمل بعد التحقق من التحويل.',
  note: 'لا ترسل كلمة المرور أو PIN أو OTP أو بيانات البطاقة. أدخل رقم العملية فقط.',
};

export default function SubscriptionPage() {
  const [current, setCurrent] = useState<Current | null>(null);
  const [plans, setPlans] = useState<Record<string, Plan>>({});
  const [payments, setPayments] = useState<Payment[]>([]);
  const [instructions, setInstructions] = useState<PaymentInstructions>(emptyInstructions);
  const [selected, setSelected] = useState<(typeof paidPlans)[number]>('STARTER');
  const [reference, setReference] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [showBankDetails, setShowBankDetails] = useState(false);
  const allowed = hasSessionPermission('organization:update');

  const load = async () => {
    const [currentResponse, planResponse, paymentResponse, instructionResponse] = await Promise.all([
      authenticatedFetch('/api/v1/subscriptions/current'),
      authenticatedFetch('/api/v1/subscriptions/plans'),
      authenticatedFetch('/api/v1/subscriptions/payments'),
      authenticatedFetch('/api/v1/subscriptions/payment-instructions'),
    ]);
    if (!currentResponse.ok) throw new Error(await getApiErrorMessage(currentResponse, 'تعذر تحميل حالة الاشتراك.'));
    setCurrent(await currentResponse.json() as Current);
    if (planResponse.ok) setPlans(await planResponse.json() as Record<string, Plan>);
    if (paymentResponse.ok) setPayments(await paymentResponse.json() as Payment[]);
    if (instructionResponse.ok) setInstructions(await instructionResponse.json() as PaymentInstructions);
  };

  useEffect(() => {
    if (!getAccessToken()) {
      window.location.replace('/login');
      return;
    }
    void load().catch((reason) => setError(reason instanceof Error ? reason.message : 'تعذر تحميل الاشتراك.'));
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setNotice('');
    if (!reference.trim()) {
      setError('أدخل رقم العملية أو المرجع الذي ستستخدمه الإدارة لمراجعة الدفع.');
      return;
    }
    setSaving(true);
    try {
      const response = await authenticatedFetch('/api/v1/subscriptions/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selected, reference: reference.trim(), paymentMethod: 'manual_transfer' }),
      });
      if (!response.ok) throw new Error(await getApiErrorMessage(response, 'تعذر إرسال طلب الترقية.'));
      setReference('');
      setNotice('تم استلام طلبك. ستراجعه إدارة Clinicos ثم تُفعّل الخطة من دون تغيير بيانات عيادتك.');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'تعذر إرسال الطلب.');
    } finally {
      setSaving(false);
    }
  };

  const detail = (label: string, value: string) => value ? (
    <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-1 break-all font-bold text-slate-900" dir={label.includes('IBAN') || label.includes('InstaPay') || label.includes('SWIFT') ? 'ltr' : undefined}>{value}</p>
    </div>
  ) : null;

  return (
    <main dir="rtl" className="min-h-screen bg-[#f5f9fd] px-4 py-8 text-slate-900">
      <section className="mx-auto max-w-6xl">
        <Link href="/dashboard" className="text-sm font-bold text-[#176b9d] hover:underline">← العودة إلى لوحة التحكم</Link>
        <header className="mt-5 rounded-3xl bg-[#12395e] p-7 text-white sm:p-9">
          <p className="text-xs font-extrabold tracking-[.16em] text-[#7ee5de]">SUBSCRIPTION & BILLING</p>
          <h1 className="mt-2 text-3xl font-black">اشتراك عيادتك</h1>
          <p className="mt-3 max-w-2xl leading-7 text-blue-100">تجربة كاملة دون بطاقة. عند انتهاء التجربة تبقى بياناتك قابلة للقراءة، وتحتاج فقط لتفعيل خطة كي تتابع الإضافة والتعديل.</p>
        </header>

        {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
        {notice && <p className="mt-5 rounded-xl bg-emerald-50 p-4 text-emerald-800">{notice}</p>}

        {!current ? <p className="mt-8 text-slate-600">جارٍ تحميل الاشتراك…</p> : <>
          <section className={`mt-6 rounded-2xl border p-6 ${current.readOnly ? 'border-amber-200 bg-amber-50' : 'border-[#cde9e5] bg-[#f0fbf9]'}`}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-extrabold text-[#087d78]">{planLabels[current.plan] ?? current.plan}</p>
                <h2 className="mt-1 text-2xl font-black">{current.status === 'TRIALING' ? `يتبقى ${current.remainingTrialDays ?? 0} يوم من التجربة` : current.readOnly ? 'الاشتراك يحتاج تفعيلًا' : 'اشتراكك نشط'}</h2>
                <p className="mt-2 text-sm text-slate-600">{current.readOnly ? 'لا تُحذف أي بيانات؛ فقط تُعلّق عمليات الكتابة إلى أن تُفعّل الباقة.' : 'يمكنك متابعة استخدام أدوات العيادة ضمن حدود خطتك الحالية.'}</p>
              </div>
              <span className="rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-700 ring-1 ring-slate-200">{current.status}</span>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {(Object.keys(labels) as LimitKey[]).map((key) => <div key={key} className="rounded-xl bg-white p-3 ring-1 ring-slate-100"><p className="text-xs text-slate-500">{labels[key]}</p><p className="mt-1 font-black">{current.usage[key]} <span className="font-normal text-slate-400">/ {current.limits[key] ?? '∞'}</span></p></div>)}
            </div>
          </section>

          <section className="mt-6 rounded-2xl border border-[#dce7f1] bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-extrabold tracking-[.14em] text-[#1768a8]">HOW TO PAY MANUALLY</p>
                <h2 className="mt-2 text-xl font-black">اختَر وسيلة الدفع المناسبة</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">استخدم وسيلة الدفع المناسبة لك، ثم اضغط على الشعار لفتح القناة الرسمية أو عرض تفاصيل التحويل. بعد الدفع أدخل رقم العملية فقط؛ لا نطلب كلمة المرور أو الرقم السري أو رمز التحقق.</p>
              </div>
              <span className="rounded-full bg-[#edf6ff] px-4 py-2 text-xs font-bold text-[#176b9d]">تفعيل بعد المراجعة</span>
            </div>
            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              <PaymentMethodCard logo="/payment/instapay.webp" alt="InstaPay" title="InstaPay" actionLabel={instructions.instapayLink ? 'فتح رابط الدفع' : 'فتح InstaPay'} href={instructions.instapayLink || 'https://www.instapay.eg/'} />
              <PaymentMethodCard logo="/payment/nbe.png" alt={instructions.bankName || 'البنك'} title="تحويل بنكي" actionLabel="عرض تفاصيل التحويل" onClick={() => setShowBankDetails(true)} />
              <PaymentMethodCard logo="/payment/emoney.jpg" alt="e& money" title="محفظة e& money" actionLabel="فتح تطبيق e& money" href={instructions.emoneyAppLink} />
            </div>
            {showBankDetails && <div id="bank-details" className="mt-5 rounded-2xl border border-[#b9d9ee] bg-[#f7fafc] p-4"><div className="flex items-center justify-between gap-3"><h3 className="font-black text-[#153c63]">تفاصيل التحويل البنكي</h3><button type="button" onClick={() => setShowBankDetails(false)} className="text-sm font-bold text-[#176b9d]">إخفاء</button></div><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{detail('البنك', instructions.bankName)}{detail('اسم المستفيد', instructions.accountName)}{detail('رقم الحساب', instructions.accountNumber)}{detail('IBAN', instructions.iban)}{detail('SWIFT / BIC (اختياري)', instructions.swiftCode)}</div></div>}
            {!instructions.bankName && !instructions.accountNumber && !instructions.iban && !instructions.instapayAddress && !instructions.emoneyPhone && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">سيتم تفعيل وسائل الدفع بعد ضبط بياناتها من الإدارة.</p>}
            <p className="mt-5 text-sm leading-6 text-slate-600">اختر وسيلة الدفع المناسبة. لن تظهر بيانات الحساب في البداية؛ تظهر تفاصيل البنك فقط عند اختيار «تحويل بنكي». بعد التحويل، أدخل رقم العملية أو المرجع فقط في النموذج أدناه.</p>
            <div className="mt-4 rounded-xl bg-[#12395e] p-4 text-sm leading-6 text-white"><strong>مراجعة الطلب:</strong> {instructions.reviewWindow}<br /><span className="text-blue-100">{instructions.note}</span></div>
          </section>

          <section className="mt-6 grid gap-4 lg:grid-cols-4">
            {paidPlans.map((plan) => { const item = plans[plan]; if (!item) return null; return <button type="button" key={plan} onClick={() => setSelected(plan)} className={`rounded-2xl border p-5 text-right transition ${selected === plan ? 'border-[#176b9d] bg-[#edf6ff] ring-2 ring-[#b9d9ee]' : 'border-[#dce7f1] bg-white hover:border-[#8fc2df]'}`}><p className="font-black">{item.label}</p><p className="mt-2 text-2xl font-black">{item.priceEgp === null ? 'تواصل معنا' : `${item.priceEgp} EGP`}</p><p className="mt-1 text-xs text-slate-500">شهريًا</p><p className="mt-4 text-sm text-slate-600">{item.limits.patients === null ? 'مرضى غير محدودين' : `${item.limits.patients} مريض`} · {item.limits.users === null ? 'فريق غير محدود' : `${item.limits.users} أعضاء`}</p></button>; })}
          </section>

          {allowed && <section className="mt-6 rounded-2xl border border-[#dce7f1] bg-white p-6">
            <p className="text-xs font-extrabold tracking-[.14em] text-[#1768a8]">MANUAL ACTIVATION</p>
            <h2 className="mt-2 text-xl font-black">أرسل طلب تفعيل الباقة</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">بعد التحويل، اكتب رقم العملية أو المرجع كما هو. لا تكتب رقم الحساب أو الرقم السري.</p>
            <form onSubmit={submit} className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <select value={selected} onChange={(event) => setSelected(event.target.value as (typeof paidPlans)[number])} className="field"><option value="STARTER">Starter · 399 EGP</option><option value="PROFESSIONAL">Professional · 699 EGP</option><option value="CLINIC">Clinic · 999 EGP</option><option value="CENTER">Center · تواصل معنا</option></select>
              <input value={reference} onChange={(event) => setReference(event.target.value)} maxLength={100} placeholder="رقم العملية / المرجع" className="field" />
              <button disabled={saving} className="rounded-xl bg-[#176b9d] px-5 py-3 font-bold text-white hover:bg-[#125b86] disabled:opacity-60">{saving ? 'جارٍ الإرسال…' : 'إرسال الطلب'}</button>
            </form>
          </section>}

          <section className="mt-6 rounded-2xl border border-[#dce7f1] bg-white p-6"><h2 className="font-black">طلبات التفعيل السابقة</h2>{payments.length === 0 ? <p className="mt-3 text-sm text-slate-500">لا توجد طلبات دفع بعد.</p> : <div className="mt-4 overflow-x-auto"><table className="min-w-full text-right text-sm"><thead className="text-slate-500"><tr><th className="p-2">المبلغ</th><th className="p-2">المرجع</th><th className="p-2">الحالة</th><th className="p-2">التاريخ</th></tr></thead><tbody>{payments.map((payment) => <tr key={payment.id} className="border-t"><td className="p-2">{payment.amount} {payment.currency}</td><td className="p-2" dir="ltr">{payment.reference}</td><td className="p-2">{payment.status}</td><td className="p-2">{new Date(payment.createdAt).toLocaleDateString('ar-EG')}</td></tr>)}</tbody></table></div>}</section>
        </>}
      </section>
    </main>
  );
}


function PaymentMethodCard({ logo, alt, title, actionLabel, href, onClick }: { logo: string; alt: string; title: string; actionLabel: string; href?: string; onClick?: () => void }) {
  const content = <><span className="flex h-24 items-center justify-center rounded-xl bg-white p-3 ring-1 ring-slate-200"><img src={logo} alt={alt} className="h-16 w-32 object-contain" /></span><h3 className="mt-5 text-center text-lg font-black text-[#153c63]">{title}</h3><span className="mt-4 inline-flex items-center justify-center rounded-lg bg-[#176b9d] px-4 py-2.5 text-xs font-black text-white">{actionLabel}</span></>;
  return <article className="rounded-2xl border border-[#dce7f1] bg-[#f7fafc] p-5">{href ? <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noreferrer' : undefined} className="block rounded-xl outline-none focus:ring-2 focus:ring-[#8fc2df]">{content}</a> : <button type="button" onClick={onClick} className="block w-full rounded-xl text-right outline-none focus:ring-2 focus:ring-[#8fc2df]">{content}</button>}</article>;
}
