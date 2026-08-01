import { useEffect } from "react";

import { PublicApiClientError } from "../../public-api/contracts/api-error";
import {
	usePublicBranchesQuery,
	usePublicRestaurantQuery,
} from "../../public-api/query/public-queries";
import { BranchCard } from "./BranchCard";
import { DiscoveryState } from "./DiscoveryState";

function getErrorCode(error: unknown): string | undefined {
	return error instanceof PublicApiClientError ? error.code : undefined;
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
			className="mx-auto w-full max-w-6xl px-5 pb-16 sm:px-8 sm:pb-24 lg:px-12"
		>
			<div className="mb-8 max-w-2xl sm:mb-10">
				<p className="mb-4 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.25em] text-[#e76832]">
					<span className="h-px w-10 bg-[#e76832]" aria-hidden="true" />
					Elige tu sucursal
				</p>
				<h1 className="font-heading text-[clamp(2.8rem,8vw,5.8rem)] font-semibold leading-[0.9] tracking-[-0.08em] text-[#12324a]">
					¿Dónde nos <em className="font-normal text-[#e76832]">visitas</em>{" "}
					hoy?
				</h1>
				<p className="mt-5 max-w-xl text-base leading-7 text-[#12324a]/70 sm:text-lg sm:leading-8">
					Selecciona la sucursal para consultar su menú y descubrir la carta
					disponible.
				</p>
			</div>

			<ul className="grid list-none grid-cols-1 gap-5 p-0 md:grid-cols-2">
				{branches.map((branch) => (
					<li key={branch.branchSlug}>
						<BranchCard branch={branch} />
					</li>
				))}
			</ul>
		</main>
	);
}
