'use client';

import Link from 'next/link';
import { ChangeEvent, useState } from 'react';
import { getApiErrorMessage } from '@/lib/api-error';
import { authenticatedFetch, getAccessToken } from '@/lib/auth-session';

type ImportRow = {
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  dateOfBirth?: string;
  admittedAt?: string;
  gender?: string;
  maritalStatus?: string;
  occupation?: string;
  city?: string;
  governorate?: string;
  leadSource?: string;
  marketingConsent: boolean;
};

const aliases: Record<string, keyof ImportRow> = {
  firstname: 'firstName', 'first name': 'firstName', 'الاسم الأول': 'firstName', 'الاسم الاول': 'firstName',
  givenname: 'firstName', patientname: 'firstName', fullname: 'firstName', 'اسم المريض': 'firstName', 'الاسم الكامل': 'firstName', 'الاسمالكامل': 'firstName',
  lastname: 'lastName', 'last name': 'lastName', surname: 'lastName', familyname: 'lastName', 'اسم العائلة': 'lastName', 'الاسم الأخير': 'lastName', 'الاسم الاخير': 'lastName',
  name: 'firstName', 'الاسم': 'firstName',
  phone: 'phone', phonenumber: 'phone', mobilenumber: 'phone', mobilephone: 'phone', telephone: 'phone', tel: 'phone', contactnumber: 'phone', mobile: 'phone', 'رقم الهاتف': 'phone', 'رقم التليفون': 'phone', 'الهاتف': 'phone', 'التليفون': 'phone',
  email: 'email', 'البريد الإلكتروني': 'email', 'البريد الالكتروني': 'email',
  dateofbirth: 'dateOfBirth', dob: 'dateOfBirth', 'تاريخ الميلاد': 'dateOfBirth',
  admissiondate: 'admittedAt', admittedat: 'admittedAt', 'تاريخ الدخول': 'admittedAt',
  gender: 'gender', 'النوع': 'gender', 'الجنس': 'gender',
  maritalstatus: 'maritalStatus', 'الحالة الاجتماعية': 'maritalStatus',
  occupation: 'occupation', university: 'occupation', 'الوظيفة': 'occupation', 'الجامعة': 'occupation',
  city: 'city', area: 'city', district: 'city', 'المدينة': 'city', 'المنطقة': 'city',
  governorate: 'governorate', 'المحافظة': 'governorate',
  leadsource: 'leadSource', source: 'leadSource', 'مصدر العميل': 'leadSource',
  marketingconsent: 'marketingConsent', consent: 'marketingConsent', 'موافقة تسويقية': 'marketingConsent',
};

const MAX_IMPORT_ROWS = 300_000;
const IMPORT_CHUNK_SIZE = 1_000;

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { value += '"'; i += 1; } else quoted = !quoted;
    } else if (char === ',' && !quoted) { row.push(value.trim()); value = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      row.push(value.trim());
      if (row.some(Boolean)) rows.push(row);
      row = []; value = '';
    } else value += char;
  }
  row.push(value.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function normalizeHeader(value: string) {
  return value.replace(/^\uFEFF/, '').trim().toLowerCase().replace(/[ _\-()./]/g, '');
}
function isoDate(value?: string) {
  if (!value) return undefined;
  const match = value.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (!match) return undefined;
  return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
}
function yes(value?: string) { return ['true', 'yes', '1', 'نعم', 'موافق'].includes(value?.trim().toLowerCase() ?? ''); }

export default function PatientImportPage() {
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const selectFile = async (event: ChangeEvent<HTMLInputElement>) => {
    setError(''); setNotice(''); setRows([]);
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) { setError('في هذه المرحلة يدعم مركز النقل ملفات CSV فقط. احفظ ملف Excel بصيغة CSV UTF-8 ثم أعد اختياره.'); return; }
    const table = parseCsv(await file.text());
    if (table.length < 2) { setError('الملف لا يحتوي على صف عناوين وصف بيانات واحد على الأقل.'); return; }
    const headers = table[0].map((header) => aliases[normalizeHeader(header)] ?? aliases[header.toLowerCase()]);
    if (!headers.includes('firstName') || !headers.includes('phone')) { setError('نحتاج على الأقل عمودَي الاسم ورقم الهاتف. استخدم العناوين Name/Phone أو الاسم/رقم الهاتف.'); return; }
    const parsed = table.slice(1).map((values) => {
      const result: Partial<ImportRow> = { marketingConsent: false };
      values.forEach((value, index) => {
        const field = headers[index];
        if (!field) return;
        if (field === 'marketingConsent') result.marketingConsent = yes(value);
        else if (field === 'dateOfBirth' || field === 'admittedAt') result[field] = isoDate(value);
        else result[field] = value || undefined;
      });
      if (!result.lastName && result.firstName?.includes(' ')) {
        const [firstName, ...rest] = result.firstName.split(/\s+/);
        result.firstName = firstName; result.lastName = rest.join(' ') || '-';
      }
      return { ...result, lastName: result.lastName || '-' } as ImportRow;
    }).filter((row) => row.firstName && row.phone);
    if (!parsed.length) { setError('لم نجد أي صف صالح يحتوي على الاسم ورقم الهاتف.'); return; }
    if (parsed.length > MAX_IMPORT_ROWS) { setError(`الحد الأقصى للنقل في ملف واحد هو ${MAX_IMPORT_ROWS.toLocaleString('en-US')} سجل.`); return; }
    setFileName(file.name); setRows(parsed);
  };

  const submit = async () => {
    if (!getAccessToken()) { window.location.replace('/login'); return; }
    setImporting(true); setError(''); setNotice(''); setProgress(0);
    try {
      let created = 0;
      let skipped = 0;
      for (let start = 0; start < rows.length; start += IMPORT_CHUNK_SIZE) {
        const batch = rows.slice(start, start + IMPORT_CHUNK_SIZE);
        const response = await authenticatedFetch('/api/v1/patients/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ patients: batch }) });
        if (!response.ok) throw new Error(await getApiErrorMessage(response, 'تعذر نقل البيانات.'));
        const result = await response.json() as { created: number; skipped: number };
        created += result.created;
        skipped += result.skipped;
        setProgress(Math.min(100, Math.round(((start + batch.length) / rows.length) * 100)));
      }
      setNotice(`تمت إضافة ${created} مريضًا. تم تخطي ${skipped} سجلًا مكررًا برقم الهاتف.`);
      setRows([]);
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'تعذر نقل البيانات.'); }
    finally { setImporting(false); }
  };

  return <main dir="rtl" className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900"><section className="mx-auto max-w-5xl rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8"><Link href="/patients" className="text-sm font-medium text-sky-700 hover:underline">العودة إلى المرضى ←</Link><div className="mt-4"><p className="text-sm font-semibold text-sky-700">مركز نقل البيانات</p><h1 className="mt-1 text-3xl font-bold">انقل قاعدة مرضاك دفعة واحدة</h1><p className="mt-2 max-w-3xl text-slate-600">ارفع نسخة CSV من النظام السابق، راجع المعاينة، ثم أضف السجلات إلى مركزك فقط. لا يطلع عليها أي مركز آخر.</p></div><div className="mt-6 rounded-xl border-2 border-dashed border-sky-200 bg-sky-50 p-6 text-center"><label className="inline-flex cursor-pointer rounded-lg bg-sky-700 px-4 py-2 font-medium text-white hover:bg-sky-800">اختيار ملف CSV<input type="file" accept=".csv,text/csv" onChange={selectFile} className="sr-only" /></label><p className="mt-3 text-sm text-slate-600">يدعم حتى 300,000 سجل في الملف الواحد. تُنقل البيانات في دفعات آمنة من 1000 سجل مع مؤشر تقدم.</p><a href="/templates/clinicos-patient-import-template.csv" download className="mt-3 inline-block text-sm font-medium text-sky-800 underline">تحميل قالب CSV جاهز</a></div>{error && <p role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}{notice && <p className="mt-5 rounded-lg bg-emerald-50 p-3 text-emerald-800">{notice}</p>}{rows.length > 0 && <><div className="mt-6 flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">معاينة {fileName}</h2><p className="text-sm text-slate-600">{rows.length.toLocaleString('en-US')} سجل صالح للاستيراد. السجلات ذات رقم الهاتف الموجود مسبقًا لن تُكرر.</p></div><button type="button" disabled={importing} onClick={() => void submit()} className="rounded-lg bg-emerald-700 px-4 py-2 font-medium text-white hover:bg-emerald-800 disabled:opacity-60">{importing ? `جارٍ النقل… ${progress}%` : `تأكيد نقل ${rows.length.toLocaleString('en-US')} سجل`}</button></div>{importing && <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200" aria-label={`Import progress ${progress}%`}><div className="h-full bg-emerald-600 transition-all" style={{ width: `${progress}%` }} /></div>}<div className="mt-4 overflow-x-auto rounded-lg border border-slate-200"><table className="min-w-full text-right text-sm"><thead className="bg-slate-100 text-slate-700"><tr><th className="p-3">الاسم</th><th className="p-3">الهاتف</th><th className="p-3">المدينة</th><th className="p-3">موافقة تسويقية</th></tr></thead><tbody>{rows.slice(0, 8).map((row, index) => <tr key={`${row.phone}-${index}`} className="border-t"><td className="p-3">{row.firstName} {row.lastName}</td><td className="p-3" dir="ltr">{row.phone}</td><td className="p-3">{[row.city, row.governorate].filter(Boolean).join(' - ') || '—'}</td><td className="p-3">{row.marketingConsent ? 'نعم' : 'لا'}</td></tr>)}</tbody></table>{rows.length > 8 && <p className="border-t p-3 text-sm text-slate-600">تظهر أول 8 سجلات فقط في المعاينة.</p>}</div></>}</section></main>;
}
