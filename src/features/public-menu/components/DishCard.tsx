import { CircleAlert } from "lucide-react";
import { useState } from "react";

import type { PublicDish } from "../contracts/public-menu";
import { formatMenuPrice } from "../lib/format-menu-price";
import { DishImageFallback } from "./MenuState";

interface DishCardProps {
	dish: PublicDish;
}

export function DishCard({ dish }: DishCardProps) {
	const [imageFailed, setImageFailed] = useState(false);
	const isSoldOut = dish.status === "sold_out";

	return (
		<article
			className={`group overflow-hidden rounded-[1.75rem] border bg-white/85 shadow-[0_18px_50px_rgba(18,50,74,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(18,50,74,0.14)] ${
				isSoldOut ? "border-[#e76832]/25" : "border-[#12324a]/10"
			}`}
		>
			<div className="relative aspect-[4/3] overflow-hidden bg-[#dcecef]">
				{dish.imageUrl && !imageFailed ? (
					<img
						className={`size-full object-cover transition duration-700 group-hover:scale-105 ${isSoldOut ? "saturate-[0.55]" : ""}`}
						src={dish.imageUrl}
						alt={`Fotografía de ${dish.name}`}
						loading="lazy"
						onError={() => setImageFailed(true)}
					/>
				) : (
					<DishImageFallback />
				)}
				<span
					className={`absolute left-4 top-4 rounded-full px-3 py-1.5 text-[0.65rem] font-bold uppercase tracking-[0.13em] shadow-sm ${
						isSoldOut
							? "bg-[#fff0e9] text-[#b34b25]"
							: "bg-[#f8fbf8]/95 text-[#22624e]"
					}`}
				>
					{isSoldOut ? "Agotado por hoy" : "Disponible"}
				</span>
			</div>

			<div className="p-5 sm:p-6">
				<div className="flex items-start justify-between gap-4">
					<h3 className="max-w-[17ch] font-heading text-xl font-semibold leading-tight tracking-[-0.035em] text-[#12324a]">
						{dish.name}
					</h3>
					<p className="shrink-0 pt-0.5 text-base font-bold text-[#e76832]">
						{formatMenuPrice(dish.price)}
					</p>
				</div>
				<p className="mt-3 text-sm leading-6 text-[#12324a]/68">
					{dish.description}
				</p>

				{dish.ingredients.length > 0 ? (
					<div className="mt-5">
						<p className="mb-2 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-[#12324a]/45">
							Lleva
						</p>
						<ul
							className="flex flex-wrap gap-1.5"
							aria-label={`Ingredientes de ${dish.name}`}
						>
							{dish.ingredients.map((ingredient) => (
								<li
									className="rounded-full border border-[#12324a]/10 bg-[#f3f7f5] px-2.5 py-1 text-xs font-medium text-[#12324a]/70"
									key={ingredient}
								>
									{ingredient}
								</li>
							))}
						</ul>
					</div>
				) : null}

				{dish.allergens.length > 0 ? (
					<p className="mt-5 flex items-start gap-2 border-t border-[#12324a]/10 pt-4 text-xs leading-5 text-[#12324a]/60">
						<CircleAlert
							className="mt-0.5 shrink-0 text-[#e76832]"
							size={14}
							aria-hidden="true"
						/>
						<span>
							<strong className="font-semibold text-[#12324a]/80">
								Alérgenos:
							</strong>{" "}
							{dish.allergens.join(", ")}
						</span>
					</p>
				) : null}
			</div>
		</article>
	);
}
