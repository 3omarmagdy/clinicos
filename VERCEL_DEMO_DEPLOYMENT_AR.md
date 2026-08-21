# نشر Clinico كنسخة تعريفية مجانية على Vercel

هذه الإعدادات تنشر الصفحة العامة فقط على رابط مجاني ينتهي بـ `.vercel.app`.
لا تنشر قاعدة PostgreSQL المحلية ولا تسمح بتسجيل دخول أو بيانات مرضى على الإنترنت.

## الإعداد في Vercel

1. من Vercel اختر **Add New → Project** ثم استورد `3omarmagdy/clinicos`.
2. اترك **Root Directory** على جذر المستودع، ولا تختَر `apps/web`.
3. لا تغيّر أوامر Install أو Build؛ ملف `vercel.json` يضبطها تلقائيًا.
4. من **Settings → Environment Variables** أضف:

```text
NEXT_PUBLIC_DEMO_MODE = true
```

5. اضغط Deploy.

بعد النجاح سيظهر رابط مثل `clinicos-xxxx.vercel.app`. يمكن مشاركته كعرض تعريفي فقط.

## قبل إطلاق نظام فعلي

يجب توفير قاعدة PostgreSQL مُدارة، API منشور، ونسخ احتياطي، ثم إضافة هذه القيم في Vercel:

```text
NEXT_PUBLIC_API_URL = https://your-api-host.example
```

وفي بيئة الـ API:

```text
DATABASE_URL = ...
JWT_SECRET = قيمة قوية وفريدة لا تقل عن 32 حرفًا
FRONTEND_URL = https://your-project.vercel.app
NODE_ENV = production
```

لا ترفع قاعدة بيانات مرضى أو تستخدم حسابات التطوير في رابط Vercel العام.
