import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Providers } from '@/components/providers';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://clinicos-crm.vercel.app'),
  title: {
    default: 'Clinico | إدارة عيادتك بوضوح',
    template: '%s | Clinico',
  },
  description:
    'نظام عربي لإدارة العيادات: الاستقبال، المرضى، المواعيد، نقل بيانات CRM، الوصفات الإلكترونية والجمهور التسويقي القائم على الموافقة.',
  keywords: [
    'برنامج إدارة عيادة',
    'نظام إدارة عيادات',
    'CRM عيادات',
    'برنامج استقبال عيادة',
    'روشتة إلكترونية',
    'إدارة المرضى',
  ],
  openGraph: {
    type: 'website',
    locale: 'ar_EG',
    url: '/',
    siteName: 'Clinico',
    title: 'Clinico | إدارة عيادتك بوضوح',
    description: 'من الاستقبال إلى المتابعة: تشغيل يومي منظّم لعيادتك في مساحة آمنة واحدة.',
  },
  twitter: {
    card: 'summary',
    title: 'Clinico | إدارة عيادتك بوضوح',
    description: 'تشغيل يومي منظّم للعيادات والمراكز الطبية.',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
