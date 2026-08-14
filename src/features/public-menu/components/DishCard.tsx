import { CircleAlert, Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { PublicCartQuantityControl } from "../../public-cart/components/PublicCartQuantityControl";
import { usePublicCart } from "../../public-cart/PublicCartProvider";
import type { PublicDish } from "../contracts/public-menu";
import { formatMenuPrice } from "../lib/format-menu-price";
import { DishImageFallback } from "./MenuState";

interface DishCardProps {
	dish: PublicDish;
}

export function DishCard({ dish }: DishCardProps) {
	const [imageFailed, setImageFailed] = useState(false);
	const { addItem, decrementItem, incrementItem, items } = usePublicCart();
	const isSoldOut = dish.status === "sold_out";
	const cartItem = items.find((item) => item.dishId === dish.id);

	return (
		<article
			className={`group flex h-full flex-col overflow-hidden rounded-[1.75rem] border bg-white/90 shadow-[0_20px_60px_rgba(18,50,74,0.07)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(18,50,74,0.14)] ${
				isSoldOut ? "border-[#b34b25]/25" : "border-[#12324a]/12"
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

			<div className="flex flex-1 flex-col p-5 sm:p-6">
				<div className="flex items-start justify-between gap-4">
					<h3 className="max-w-[17ch] font-heading text-xl font-semibold leading-tight tracking-[-0.035em] text-[#12324a]">
						{dish.name}
					</h3>
					<p className="shrink-0 pt-0.5 text-base font-bold text-[#e76832]">
						{formatMenuPrice(dish.price)}
					</p>
				</div>
				<p className="mt-3 text-sm leading-6 text-[#587080]">
					{dish.description}
				</p>

				{dish.ingredients.length > 0 ? (
					<div className="mt-5">
						<p className="mb-2 text-xs font-semibold text-[#587080]">
							Ingredientes
						</p>
						<ul
							className="flex flex-wrap gap-1.5"
							aria-label={`Ingredientes de ${dish.name}`}
						>
							{dish.ingredients.map((ingredient) => (
								<li
									className="rounded-full border border-[#12324a]/10 bg-[#f4f0e8] px-2.5 py-1 text-xs font-medium text-[#587080]"
									key={ingredient}
								>
									{ingredient}
								</li>
							))}
						</ul>
					</div>
				) : null}

				{dish.allergens.length > 0 ? (
					<p className="mt-5 flex items-start gap-2 rounded-xl bg-[#fff7f1] px-3 py-2.5 text-xs leading-5 text-[#8f3d20]">
						<CircleAlert
							className="mt-0.5 shrink-0 text-[#e76832]"
							size={14}
							aria-hidden="true"
						/>
						<span>
							<strong className="font-semibold">Alérgenos:</strong>{" "}
							{dish.allergens.join(", ")}
						</span>
					</p>
				) : null}

				<div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#12324a]/10 pt-5">
					{isSoldOut ? (
						<p className="text-xs font-semibold text-[#b34b25]">
							No disponible para selección
						</p>
					) : cartItem ? (
						<PublicCartQuantityControl
							itemName={dish.name}
							quantity={cartItem.quantity}
							onDecrease={() => decrementItem(dish.id)}
							onIncrease={() => incrementItem(dish.id)}
						/>
					) : (
						<Button
							aria-label={`Añadir ${dish.name} al carrito`}
							className="min-h-11 rounded-full bg-[#12324a] px-5 text-white hover:bg-[#1d4b68]"
							onClick={() => addItem(dish)}
							variant="default"
						>
							<Plus data-icon="inline-start" />
							Añadir
						</Button>
					)}
					{cartItem && !isSoldOut ? (
						<span className="text-xs font-semibold text-[#22624e]">
							En tu selección
						</span>
					) : null}
				</div>
			</div>
		</article>
	);
}
