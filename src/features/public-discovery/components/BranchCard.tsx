import { Clock3, Mail, MapPin, Phone, UsersRound } from 'lucide-react';

import type { PublicBranch } from '../contracts/public-discovery.schemas';

interface BranchCardProps {
  branch: PublicBranch;
}

export function BranchCard({ branch }: BranchCardProps) {
  const menuHref = `/menu?branch=${encodeURIComponent(branch.branchSlug)}`;
  const duration = branch.rules.defaultReservationDurationMinutes;
  const maxPartySize = branch.rules.maxPartySize;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-[#12324a]/10 bg-white/85 p-5 shadow-[0_18px_50px_rgba(18,50,74,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(18,50,74,0.14)] sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[#e76832]">
            Sucursal
          </p>
          <h2 className="font-heading text-2xl font-semibold tracking-[-0.045em] text-[#12324a]">
            {branch.name}
          </h2>
        </div>
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#dcecef] text-[#12324a]" aria-hidden="true">
          <MapPin size={20} strokeWidth={1.7} />
        </span>
      </div>

      <div className="mt-6 space-y-3 text-sm leading-6 text-[#12324a]/70">
        <p className="flex items-start gap-2.5">
          <MapPin className="mt-1 shrink-0 text-[#e76832]" size={15} aria-hidden="true" />
          <span>
            {branch.address}, {branch.district}, {branch.province}
          </span>
        </p>
        <p className="flex items-center gap-2.5">
          <Phone className="shrink-0 text-[#e76832]" size={15} aria-hidden="true" />
          <a className="underline decoration-[#e76832]/40 underline-offset-4 hover:text-[#e76832]" href={`tel:${branch.phone}`}>
            {branch.phone}
          </a>
        </p>
        {branch.email ? (
          <p className="flex items-center gap-2.5">
            <Mail className="shrink-0 text-[#e76832]" size={15} aria-hidden="true" />
            <a className="truncate underline decoration-[#e76832]/40 underline-offset-4 hover:text-[#e76832]" href={`mailto:${branch.email}`}>
              {branch.email}
            </a>
          </p>
        ) : null}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-2 border-y border-[#12324a]/10 py-4 text-xs text-[#12324a]/65">
        <p className="flex items-center gap-2">
          <Clock3 className="shrink-0 text-[#338faa]" size={15} aria-hidden="true" />
          <span><strong className="font-semibold text-[#12324a]">{duration} min</strong> por reserva</span>
        </p>
        <p className="flex items-center gap-2">
          <UsersRound className="shrink-0 text-[#338faa]" size={15} aria-hidden="true" />
          <span>Hasta <strong className="font-semibold text-[#12324a]">{maxPartySize}</strong> personas</span>
        </p>
      </div>

      <a
        className="mt-auto inline-flex min-h-12 items-center justify-between gap-4 rounded-full bg-[#12324a] px-5 text-sm font-semibold text-white transition duration-300 hover:bg-[#1d4b68] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e76832]/35"
        href={menuHref}
      >
        Ver menú de la sucursal
        <span className="text-lg transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true">→</span>
      </a>
    </article>
  );
}
