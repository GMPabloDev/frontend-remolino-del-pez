import { useEffect, useState } from "react";

import { ApiClientError } from "@/lib/api/api-error";
import { runtimeConfig } from "../../../config/runtime";
import { usePublicMenuQuery } from "../../public-api/query/public-queries";
import { PublicCartSheet } from "../../public-cart/components/PublicCartSheet";
import {
	PublicCartProvider,
	usePublicCart,
} from "../../public-cart/PublicCartProvider";
import type { PublicMenu as PublicMenuData } from "../contracts/public-menu";
import { type MenuQueryResult, readMenuQuery } from "../lib/menu-query";
import { CategorySection } from "./CategorySection";
import { MenuState } from "./MenuState";

function getErrorCode(error: unknown): string | undefined {
	return error instanceof ApiClientError ? error.code : undefined;
}

function getMenuQueryBranch(
	queryResult: MenuQueryResult | null,
): string | null {
	return queryResult?.valid ? queryResult.value.branchSlug : null;
}

export function PublicMenu() {
	const [queryResult, setQueryResult] = useState<MenuQueryResult | null>(null);
	const branchSlug = getMenuQueryBranch(queryResult);
	const menuQuery = usePublicMenuQuery(branchSlug);

	useEffect(() => {
		setQueryResult(readMenuQuery(window.location.search));
	}, []);

	if (queryResult === null) {
		return <MenuState kind="loading" />;
	}

	if (!queryResult.valid) {
		return (
			<MenuState kind="invalid-query" invalidQueryReason={queryResult.reason} />
		);
	}

	if (branchSlug === null) {
		return <MenuState kind="invalid-query" invalidQueryReason="invalid" />;
	}

	return (
		<PublicCartProvider
			branchSlug={branchSlug}
			restaurantSlug={runtimeConfig.restaurantSlug}
		>
			<PublicMenuContent menuQuery={menuQuery} />
		</PublicCartProvider>
	);
}

interface PublicMenuContentProps {
	menuQuery: ReturnType<typeof usePublicMenuQuery>;
}

function PublicMenuContent({ menuQuery }: PublicMenuContentProps) {
	const { markItemsUnverified, reconcileMenu } = usePublicCart();

	useEffect(() => {
		if (menuQuery.data) {
			reconcileMenu(menuQuery.data);
			return;
		}

		if (menuQuery.isError) {
			markItemsUnverified();
		}
	}, [markItemsUnverified, menuQuery.data, menuQuery.isError, reconcileMenu]);

	if (menuQuery.isPending) {
		return (
			<>
				<MenuState kind="loading" />
				<PublicCartSheet />
			</>
		);
	}

	if (menuQuery.isError) {
		return (
			<>
				<MenuState
					kind="error"
					errorCode={getErrorCode(menuQuery.error)}
					onRetry={() => void menuQuery.refetch()}
				/>
				<PublicCartSheet />
			</>
		);
	}

	if (!menuQuery.data) {
		return (
			<>
				<MenuState kind="loading" />
				<PublicCartSheet />
			</>
		);
	}

	const menu: PublicMenuData = menuQuery.data;

	if (menu.categories.length === 0) {
		return (
			<>
				<MenuState kind="empty" />
				<PublicCartSheet />
			</>
		);
	}

	return (
		<>
			<main
				id="main-content"
				className="mx-auto w-full max-w-6xl px-5 pb-32 sm:px-8 sm:pb-36 lg:px-12"
			>
				<nav
					className="mb-4 flex flex-col gap-4 border-y border-[#12324a]/15 py-4 sm:flex-row sm:items-center sm:justify-between"
					aria-label="Categorías del menú"
				>
					<p className="shrink-0 text-xs font-bold uppercase tracking-[0.2em] text-[#12324a]/50">
						Explora la carta
					</p>
					<ul className="flex list-none flex-wrap gap-x-5 gap-y-2 p-0 text-sm font-semibold text-[#12324a]">
						{menu.categories.map((category) => (
							<li key={category.id}>
								<a
									className="underline decoration-[#e76832]/50 decoration-2 underline-offset-4 transition-colors hover:text-[#e76832] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e76832]/25"
									href={`#category-${category.id}`}
								>
									{category.name}
								</a>
							</li>
						))}
					</ul>
				</nav>

				<div>
					{menu.categories.map((category) => (
						<CategorySection key={category.id} category={category} />
					))}
				</div>
			</main>
			<PublicCartSheet />
		</>
	);
}
