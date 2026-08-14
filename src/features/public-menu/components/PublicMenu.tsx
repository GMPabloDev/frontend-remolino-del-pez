import { type ReactNode, useEffect, useState } from "react";

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

	let content: ReactNode;

	if (menuQuery.isPending) {
		content = renderResponsiveMenuState(<MenuState kind="loading" />);
	} else if (menuQuery.isError) {
		content = renderResponsiveMenuState(
			<MenuState
				kind="error"
				errorCode={getErrorCode(menuQuery.error)}
				onRetry={() => void menuQuery.refetch()}
			/>,
		);
	} else if (!menuQuery.data) {
		content = renderResponsiveMenuState(<MenuState kind="loading" />);
	} else if (menuQuery.data.categories.length === 0) {
		content = renderResponsiveMenuState(<MenuState kind="empty" />);
	} else {
		const menu: PublicMenuData = menuQuery.data;
		const dishCount = menu.categories.reduce(
			(total, category) => total + category.dishes.length,
			0,
		);
		content = (
			<main
				id="main-content"
				className="mx-auto w-full max-w-6xl px-5 pb-32 pt-12 sm:px-8 sm:pb-36 sm:pt-16 lg:px-12"
				aria-labelledby="menu-content-title"
			>
				<section className="mb-9 flex flex-col gap-5 sm:mb-12 sm:flex-row sm:items-end sm:justify-between">
					<div className="max-w-2xl">
						<h2
							id="menu-content-title"
							className="font-heading text-[clamp(2.5rem,6vw,4.5rem)] font-semibold leading-[0.92] tracking-[-0.07em] text-[#12324a]"
						>
							Elige algo para la{" "}
							<em className="font-normal text-[#e76832]">mesa.</em>
						</h2>
						<p className="mt-5 max-w-xl text-base leading-7 text-[#587080] sm:text-lg sm:leading-8">
							Explora por categorías y añade tus favoritos a la selección.
						</p>
					</div>
					<p className="text-sm font-semibold text-[#587080]">
						{dishCount}{" "}
						{dishCount === 1 ? "plato en la carta" : "platos en la carta"}
					</p>
				</section>

				<nav
					className="sticky top-0 z-20 -mx-5 mb-3 overflow-x-auto border-y border-[#12324a]/12 bg-[#f4f0e8] px-5 py-3 sm:-mx-8 sm:px-8 lg:-mx-12 lg:px-12"
					aria-label="Categorías del menú"
				>
					<ul className="flex min-w-max list-none gap-2 p-0 text-sm font-semibold text-[#12324a]">
						{menu.categories.map((category) => (
							<li key={category.id}>
								<a
									className="inline-flex min-h-10 items-center rounded-full border border-[#12324a]/12 bg-white/70 px-4 transition-colors hover:border-[#e76832]/45 hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e76832]/25"
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
		);
	}

	return (
		<>
			{content}
			<PublicCartSheet />
		</>
	);
}

function renderResponsiveMenuState(content: ReactNode) {
	return <div className="px-5 sm:px-8 lg:px-12">{content}</div>;
}
