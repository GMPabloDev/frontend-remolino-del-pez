import type { MouseEvent } from "react";

import {
	type CatalogStatusFilter,
	getCatalogStatusQuery,
} from "../lib/catalog-status-filter";

const FILTER_OPTIONS: Array<{
	label: string;
	value: CatalogStatusFilter;
}> = [
	{ label: "Todas", value: "all" },
	{ label: "Activas", value: "active" },
	{ label: "Inactivas", value: "inactive" },
];

interface CatalogStatusFilterNavProps {
	basePath: string;
	filter: CatalogStatusFilter;
	label: string;
}

export function CatalogStatusFilterNav({
	basePath,
	filter,
	label,
}: CatalogStatusFilterNavProps) {
	return (
		<nav aria-label={label}>
			<ul className="flex flex-wrap gap-2">
				{FILTER_OPTIONS.map((option) => (
					<li key={option.value}>
						<a
							aria-current={filter === option.value ? "page" : undefined}
							className={getFilterClassName(filter === option.value)}
							href={getFilterHref(basePath, option.value)}
							onClick={(event) =>
								handleFilterClick(event, basePath, option.value)
							}
						>
							{option.label}
						</a>
					</li>
				))}
			</ul>
		</nav>
	);
}

function handleFilterClick(
	event: MouseEvent<HTMLAnchorElement>,
	basePath: string,
	filter: CatalogStatusFilter,
): void {
	if (
		event.defaultPrevented ||
		event.button !== 0 ||
		event.metaKey ||
		event.ctrlKey ||
		event.shiftKey ||
		event.altKey
	) {
		return;
	}

	event.preventDefault();
	window.history.pushState({}, "", getFilterHref(basePath, filter));
	window.dispatchEvent(new window.Event("popstate"));
}

function getFilterHref(basePath: string, filter: CatalogStatusFilter): string {
	const query = getCatalogStatusQuery(filter);
	return query ? `${basePath}?status=${query}` : basePath;
}

function getFilterClassName(isSelected: boolean): string {
	return isSelected
		? "inline-flex rounded-full bg-[#12324a] px-4 py-2 text-xs font-bold text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e76832]/35"
		: "inline-flex rounded-full border border-[#12324a]/15 px-4 py-2 text-xs font-semibold text-[#12324a]/65 transition hover:border-[#12324a]/30 hover:text-[#12324a] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e76832]/35";
}
