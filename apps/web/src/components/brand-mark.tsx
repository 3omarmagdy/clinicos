import Link from 'next/link';

export function BrandMark({ href = '/', light = false }: { href?: string; light?: boolean }) {
  return <Link href={href} className="inline-flex items-center gap-3" aria-label="Clinico home"><span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-500 text-lg font-bold text-slate-950 shadow-sm">C</span><span><span className={`block text-lg font-bold tracking-tight ${light ? 'text-white' : 'text-slate-950'}`}>Clinico</span><span className={`block text-[10px] font-semibold uppercase tracking-[0.18em] ${light ? 'text-teal-200' : 'text-teal-700'}`}>Clinic intelligence</span></span></Link>;
}
