'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { BrandMark } from './brand-mark';

const navigation = [
  ['dashboard', '/dashboard', 'لوحة التحكم', '⌂'],
  ['patients', '/patients', 'المرضى', '◉'],
  ['appointments', '/appointments', 'المواعيد', '◷'],
  ['team', '/team', 'الفريق', '♙'],
  ['settings', '/settings', 'إعدادات العيادة', '⚙'],
] as const;

export function WorkspaceShell({ children, name, role, onSignOut }: { children: ReactNode; name: string; role: string; onSignOut: () => void }) {
  const pathname = usePathname();
  return <main dir="rtl" className="clinicos-shell min-h-screen text-[#102840] lg:grid lg:grid-cols-[17rem_1fr]">
    <aside className="hidden min-h-screen bg-[#0b1f33] px-4 py-6 text-slate-200 lg:flex lg:flex-col">
      <BrandMark href="/dashboard" light />
      <p className="mt-10 px-3 text-[10px] font-bold tracking-[.18em] text-teal-300">CLINIC WORKSPACE</p>
      <nav className="mt-3 grid gap-1" aria-label="تنقل مساحة العمل">
        {navigation.map(([key, href, label, icon]) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(`${href}/`));
          return <Link key={key} href={href} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${active ? 'bg-white/12 text-white shadow-inner shadow-white/5' : 'text-slate-300 hover:bg-white/7 hover:text-white'}`}><span className={`grid h-6 w-6 place-items-center rounded-lg text-xs ${active ? 'bg-teal-400 text-[#0b1f33]' : 'bg-white/8 text-teal-200'}`}>{icon}</span>{label}</Link>;
        })}
      </nav>
      <div className="mt-auto rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-sm font-bold text-white">{name}</p>
        <p className="mt-1 text-xs capitalize text-slate-400">{role} · Clinicos</p>
        <button type="button" onClick={onSignOut} className="mt-4 w-full rounded-xl border border-white/15 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-white/10">تسجيل الخروج</button>
      </div>
    </aside>
    <section className="min-w-0">
      <header className="flex items-center justify-between border-b border-[#dce7ef] bg-white/80 px-5 py-4 backdrop-blur sm:px-8">
        <BrandMark href="/dashboard" />
        <div className="flex items-center gap-3"><span className="hidden rounded-full bg-[#e8f8f5] px-3 py-1.5 text-xs font-bold text-[#087e76] sm:inline-flex">مساحة عيادة آمنة</span><span className="grid h-9 w-9 place-items-center rounded-full bg-[#dff7f3] text-sm font-black text-[#0b6f75]">{name.charAt(0)}</span></div>
      </header>
      {children}
    </section>
  </main>;
}
