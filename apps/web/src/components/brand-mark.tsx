import Link from 'next/link';

export function BrandMark({ href = '/', light = false }: { href?: string; light?: boolean }) {
  return (
    <Link href={href} className="inline-flex items-center gap-3" aria-label="Clinicos home">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[#0b1f33] via-[#1268a6] to-[#10afa3] shadow-sm shadow-cyan-950/30">
        <svg
          viewBox="0 0 24 24"
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path className="text-white" strokeWidth="1.75" d="m12 2.8 3.2 1.85v3.7l-3.2 1.85-3.2-1.85v-3.7L12 2.8Zm0 10.9 3.2 1.85v3.7L12 21.1l-3.2-1.85v-3.7L12 13.7Zm-9.1-5.35 3.2-1.85 3.2 1.85v3.7l-3.2 1.85-3.2-1.85v-3.7Zm18.2 0-3.2-1.85-3.2 1.85v3.7l3.2 1.85 3.2-1.85v-3.7Z" />
        </svg>
      </span>
      <span>
        <span
          className={`block text-lg font-bold tracking-tight ${
            light ? 'text-white' : 'text-[#0b1f33]'
          }`}
        >
          Clinicos
        </span>
        <span
          className={`block text-[10px] font-semibold uppercase tracking-[0.18em] ${
            light ? 'text-teal-200' : 'text-[#0d8d86]'
          }`}
        >
          connected care
        </span>
      </span>
    </Link>
  );
}
