import {
	ArrowUpRight,
	Clock3,
	Mail,
	MapPin,
	Phone,
	UsersRound,
} from "lucide-react";

import type { PublicBranch } from "../contracts/public-discovery.schemas";

interface BranchCardProps {
	branch: PublicBranch;
}

export function BranchCard({ branch }: BranchCardProps) {
	const menuHref = `/menu?branch=${encodeURIComponent(branch.branchSlug)}`;
	const duration = branch.rules.defaultReservationDurationMinutes;
	const maxPartySize = branch.rules.maxPartySize;

	return (
		<article className="group flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-[#12324a]/12 bg-white/90 shadow-[0_20px_60px_rgba(18,50,74,0.07)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(18,50,74,0.14)]">
			<div className="flex items-start justify-between gap-5 border-b border-[#12324a]/10 px-5 pb-5 pt-5 sm:px-7 sm:pb-6 sm:pt-7">
				<div>
					<h3 className="font-heading text-2xl font-semibold leading-tight tracking-[-0.05em] text-[#12324a] sm:text-3xl">
						{branch.name}
					</h3>
					<p className="mt-2 text-sm font-medium text-[#587080]">
						Elige esta sucursal para continuar
					</p>
				</div>
				<span
					className="grid size-12 shrink-0 place-items-center rounded-full bg-[#dcecef] text-[#12324a] transition-colors duration-300 group-hover:bg-[#c7e0e5]"
					aria-hidden="true"
				>
					<MapPin size={21} strokeWidth={1.7} />
				</span>
			</div>

			<div className="flex flex-1 flex-col px-5 py-5 sm:px-7 sm:py-6">
				<div className="space-y-3 text-sm leading-6 text-[#587080]">
					<p className="flex items-start gap-3">
						<MapPin
							className="mt-1 shrink-0 text-[#e76832]"
							size={16}
							aria-hidden="true"
						/>
						<span>
							{branch.address}, {branch.district}, {branch.province}
						</span>
					</p>
					<p className="flex items-center gap-3">
						<Phone
							className="shrink-0 text-[#e76832]"
							size={16}
							aria-hidden="true"
						/>
						<a
							className="underline decoration-[#e76832]/40 underline-offset-4 transition-colors hover:text-[#e76832]"
							href={`tel:${branch.phone}`}
						>
							{branch.phone}
						</a>
					</p>
					{branch.email ? (
						<p className="flex items-center gap-3">
							<Mail
								className="shrink-0 text-[#e76832]"
								size={16}
								aria-hidden="true"
							/>
							<a
								className="truncate underline decoration-[#e76832]/40 underline-offset-4 transition-colors hover:text-[#e76832]"
								href={`mailto:${branch.email}`}
							>
								{branch.email}
							</a>
						</p>
					) : null}
				</div>

				<dl className="mt-6 grid grid-cols-2 gap-3 border-y border-[#12324a]/10 py-4">
					<div className="flex items-start gap-2.5">
						<Clock3
							className="mt-0.5 shrink-0 text-[#338faa]"
							size={16}
							aria-hidden="true"
						/>
						<div>
							<dt className="text-xs text-[#587080]">Duración</dt>
							<dd className="mt-0.5 text-sm font-semibold text-[#12324a]">
								{duration} min
							</dd>
						</div>
					</div>
					<div className="flex items-start gap-2.5">
						<UsersRound
							className="mt-0.5 shrink-0 text-[#338faa]"
							size={16}
							aria-hidden="true"
						/>
						<div>
							<dt className="text-xs text-[#587080]">Capacidad</dt>
							<dd className="mt-0.5 text-sm font-semibold text-[#12324a]">
								Hasta {maxPartySize}
							</dd>
						</div>
					</div>
				</dl>

				<a
					className="mt-auto inline-flex min-h-12 items-center justify-between gap-4 rounded-full bg-[#12324a] px-5 text-sm font-semibold text-white transition duration-300 hover:bg-[#1d4b68] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e76832]/35"
					href={menuHref}
				>
					<span>Entrar a esta sucursal</span>
					<ArrowUpRight
						className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
						size={18}
						aria-hidden="true"
					/>
				</a>
			</div>
		</article>
	);
}
