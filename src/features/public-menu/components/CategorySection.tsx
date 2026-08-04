import type { PublicMenuCategory } from "../contracts/public-menu";
import { DishCard } from "./DishCard";

interface CategorySectionProps {
	category: PublicMenuCategory;
}

export function CategorySection({ category }: CategorySectionProps) {
	const headingId = `category-heading-${category.id}`;

	return (
		<section
			className="scroll-mt-8 border-t border-[#12324a]/15 py-10 first:border-t-0 sm:py-14"
			id={`category-${category.id}`}
			aria-labelledby={headingId}
		>
			<div className="mb-7 flex min-w-0 items-end gap-4 sm:mb-9">
				<p className="font-heading text-4xl font-semibold leading-none tracking-[-0.08em] text-[#e76832]/80 sm:text-5xl">
					{String(category.position).padStart(2, "0")}
				</p>
				<h2
					id={headingId}
					className="min-w-0 break-words font-heading text-3xl font-semibold tracking-[-0.055em] text-[#12324a] sm:text-4xl"
				>
					{category.name}
				</h2>
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
