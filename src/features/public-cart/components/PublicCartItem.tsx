import { CircleAlert, Trash2 } from "lucide-react";
import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DishImageFallback } from "../../public-menu/components/MenuState";
import type { PublicCartItem as PublicCartItemData } from "../contracts/public-cart.schemas";
import {
	formatPublicCartPrice,
	publicPriceToCents,
} from "../lib/public-cart-money";
import { usePublicCart } from "../PublicCartProvider";
import { PublicCartQuantityControl } from "./PublicCartQuantityControl";

interface PublicCartItemProps {
	item: PublicCartItemData;
}

export function PublicCartItem({ item }: PublicCartItemProps) {
	const { decrementItem, incrementItem, removeItem } = usePublicCart();
	const [imageFailed, setImageFailed] = useState(false);
	const lineTotalCents =
		(publicPriceToCents(item.unitPrice) ?? 0) * item.quantity;
	const isAvailable = item.availability === "available";
	const statusText = getAvailabilityText(item.availability);

	return (
		<article
			className="rounded-2xl border border-[#12324a]/10 bg-white p-3 shadow-[0_10px_28px_rgba(18,50,74,0.06)]"
			aria-label={`${item.name}, ${item.quantity} unidades`}
		>
			<div className="flex gap-3">
				<div className="size-16 shrink-0 overflow-hidden rounded-xl bg-[#dcecef]">
					{item.imageUrl && !imageFailed ? (
						<img
							className="size-full object-cover"
							src={item.imageUrl}
							alt={`Fotografía de ${item.name}`}
							loading="lazy"
							onError={() => setImageFailed(true)}
						/>
					) : (
						<DishImageFallback />
					)}
				</div>

				<div className="min-w-0 flex-1">
					<div className="flex items-start justify-between gap-2">
						<h3 className="font-heading text-base font-semibold leading-tight text-[#12324a]">
							{item.name}
						</h3>
						<p className="shrink-0 text-sm font-bold text-[#e76832]">
							{formatPublicCartPrice(lineTotalCents)}
						</p>
					</div>
					<p className="mt-1 text-xs text-[#12324a]/60">
						{formatPublicCartPrice(publicPriceToCents(item.unitPrice) ?? 0)} por
						unidad
					</p>
				</div>
			</div>

			<div className="mt-3 flex flex-wrap items-center justify-between gap-2">
				<PublicCartQuantityControl
					itemName={item.name}
					quantity={item.quantity}
					onDecrease={() => decrementItem(item.dishId)}
					onIncrease={() => incrementItem(item.dishId)}
				/>
				<Button
					aria-label={`Eliminar ${item.name} del carrito`}
					className="border-[#b34b25]/30 bg-[#fff4ef] text-[#8f3d20] hover:border-[#b34b25] hover:bg-[#b34b25] hover:text-white"
					onClick={() => removeItem(item.dishId)}
					size="sm"
					variant="outline"
				>
					<Trash2 data-icon="inline-start" />
					Eliminar
				</Button>
			</div>

			{!isAvailable ? (
				<Alert className="mt-3 py-2" variant="destructive">
					<CircleAlert aria-hidden="true" />
					<AlertDescription>
						{statusText}. Retira este plato antes de continuar.
					</AlertDescription>
				</Alert>
			) : null}
			{item.availability === "unverified" ? (
				<Badge className="mt-3" variant="outline">
					No verificado
				</Badge>
			) : null}
			{item.priceChanged ? (
				<Badge className="mt-3" variant="outline">
					Precio actualizado
				</Badge>
			) : null}
		</article>
	);
}

function getAvailabilityText(
	availability: PublicCartItemData["availability"],
): string {
	switch (availability) {
		case "sold_out":
			return "Este plato está agotado por ahora";
		case "removed":
			return "Este plato ya no está publicado";
		case "unverified":
			return "No pudimos verificar la disponibilidad de este plato";
		default:
			return "Este plato no está disponible";
	}
}
