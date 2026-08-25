import Link from 'next/link';

export function BrandMark({ href = '/', light = false }: { href?: string; light?: boolean }) {
  return (
    <Link href={href} className="inline-flex items-center gap-3" aria-label="Clinicos home">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-teal-300 via-teal-400 to-cyan-500 shadow-sm shadow-teal-500/30">
        <svg
          viewBox="0 0 24 24"
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="8.5" cy="12" r="5.5" className="text-slate-950" strokeWidth="1.6" opacity="0.9" />
          <circle cx="15.5" cy="12" r="5.5" className="text-slate-950" strokeWidth="1.6" opacity="0.45" />
          <path
            className="text-white"
            strokeWidth="2"
            d="M3.5 12h3l2-5 3 10 2-5h4"
          />
        </svg>
      </span>
      <span>
        <span
          className={`block text-lg font-bold tracking-tight ${
            light ? 'text-white' : 'text-slate-950'
          }`}
        >
          Clinicos
        </span>
        <span
          className={`block text-[10px] font-semibold uppercase tracking-[0.18em] ${
            light ? 'text-teal-200' : 'text-teal-700'
          }`}
        >
          connected care
        </span>
      </span>
    </Link>
  );
}
