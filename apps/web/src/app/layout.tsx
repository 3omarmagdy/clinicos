import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Cairo } from 'next/font/google';
import { Providers } from '@/components/providers';
import './globals.css';

const cairo = Cairo({ subsets: ['arabic', 'latin'], display: 'swap', variable: '--font-clinicos' });

export const metadata: Metadata = {
  metadataBase: new URL('https://clinicos-crm.vercel.app'),
  title: {
    default: 'Clinicos | كل مريض يستحق فريقًا متصلًا',
    template: '%s | Clinicos',
  },
  description:
    'Clinicos هو نظام عربي لإدارة العيادات يجمع الاستقبال والطبيب والإدارة حول رحلة مريض واحدة، من التسجيل إلى المتابعة والوصفة الإلكترونية.',
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
    siteName: 'Clinicos',
    title: 'Clinicos | كل مريض يستحق فريقًا متصلًا',
    description: 'من الاستقبال إلى المتابعة: مساحة عمل واحدة تجعل رعاية المريض أوضح لفريق العيادة.',
  },
  twitter: {
    card: 'summary',
    title: 'Clinicos | كل مريض يستحق فريقًا متصلًا',
    description: 'نظام عربي منظّم للعيادات والمراكز الطبية.',
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
      <body className={cairo.variable}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
