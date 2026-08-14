import { Compass } from "lucide-react";
import { useEffect } from "react";

import { ApiClientError } from "@/lib/api/api-error";
import {
	usePublicBranchesQuery,
	usePublicRestaurantQuery,
} from "../../public-api/query/public-queries";
import { BranchCard } from "./BranchCard";
import { DiscoveryState } from "./DiscoveryState";

function getErrorCode(error: unknown): string | undefined {
	return error instanceof ApiClientError ? error.code : undefined;
}

export function BranchDiscovery() {
	const restaurantQuery = usePublicRestaurantQuery();
	const branchesQuery = usePublicBranchesQuery();
	const branches = branchesQuery.data ?? [];
	const isLoading = restaurantQuery.isPending || branchesQuery.isPending;
	const error = restaurantQuery.error ?? branchesQuery.error;

	useEffect(() => {
		if (!isLoading && !error && branches.length === 1) {
			window.location.replace(
				`/menu?branch=${encodeURIComponent(branches[0].branchSlug)}`,
			);
		}
	}, [branches, error, isLoading]);

	if (isLoading || (!error && branches.length === 1)) {
		return <DiscoveryState kind="loading" />;
	}

	if (error) {
		return (
			<DiscoveryState
				kind="error"
				errorCode={getErrorCode(error)}
				onRetry={() => {
					void Promise.all([
						restaurantQuery.refetch(),
						branchesQuery.refetch(),
					]);
				}}
			/>
		);
	}

	if (branches.length === 0) {
		return <DiscoveryState kind="empty" />;
	}

	return (
		<main
			id="main-content"
			className="mx-auto w-full max-w-6xl px-5 pb-16 pt-14 sm:px-8 sm:pb-24 sm:pt-20 lg:px-12"
			aria-labelledby="branch-selection-title"
		>
			<div className="mb-9 flex flex-col gap-6 sm:mb-12 sm:flex-row sm:items-end sm:justify-between">
				<div className="max-w-2xl">
					<h2
						id="branch-selection-title"
						className="font-heading text-[clamp(2.5rem,6vw,4.5rem)] font-semibold leading-[0.92] tracking-[-0.07em] text-[#12324a]"
					>
						Elige dónde quieres{" "}
						<em className="font-normal text-[#e76832]">sentarte.</em>
					</h2>
					<p className="mt-5 max-w-xl text-base leading-7 text-[#587080] sm:text-lg sm:leading-8">
						Selecciona una sucursal para abrir su menú y comenzar tu reserva.
					</p>
				</div>
				<div className="flex items-center gap-3 self-start rounded-full border border-[#12324a]/12 bg-white/65 px-4 py-2.5 text-xs font-semibold text-[#12324a] shadow-[0_12px_30px_rgba(18,50,74,0.05)] sm:self-end">
					<Compass
						className="text-[#e76832]"
						size={17}
						strokeWidth={1.8}
						aria-hidden="true"
					/>
					<span>Encuentra tu sucursal</span>
				</div>
			</div>

			<section id="branch-selection" aria-label="Sucursales disponibles">
				<ul className="grid list-none grid-cols-1 gap-5 p-0 md:grid-cols-2 md:gap-6">
					{branches.map((branch) => (
						<li key={branch.branchSlug}>
							<BranchCard branch={branch} />
						</li>
					))}
				</ul>
			</section>
		</main>
	);
}
