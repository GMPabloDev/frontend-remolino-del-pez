import type { PublicMenuCategory } from "../contracts/public-menu";
import { DishCard } from "./DishCard";

interface CategorySectionProps {
	category: PublicMenuCategory;
}

export function CategorySection({ category }: CategorySectionProps) {
	const headingId = `category-heading-${category.id}`;
	const dishCount = category.dishes.length;

	return (
		<section
			className="scroll-mt-20 border-t border-[#12324a]/12 py-10 first:border-t-0 sm:py-14"
			id={`category-${category.id}`}
			aria-labelledby={headingId}
		>
			<div className="mb-7 flex min-w-0 items-end justify-between gap-4 sm:mb-9">
				<div className="flex min-w-0 items-center gap-4">
					<span className="h-px w-9 shrink-0 bg-[#e76832]" aria-hidden="true" />
					<h2
						id={headingId}
						className="min-w-0 break-words font-heading text-3xl font-semibold tracking-[-0.055em] text-[#12324a] sm:text-4xl"
					>
						{category.name}
					</h2>
				</div>
				<span className="shrink-0 text-xs font-semibold text-[#587080]">
					{dishCount} {dishCount === 1 ? "plato" : "platos"}
				</span>
			</div>
			<ul className="grid list-none grid-cols-1 gap-5 p-0 sm:grid-cols-2 xl:grid-cols-3">
				{category.dishes.map((dish) => (
					<li key={dish.id}>
						<DishCard dish={dish} />
					</li>
				))}
			</ul>
		</section>
	);
}
