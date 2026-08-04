import { publicPriceSchema } from "../../public-menu/contracts/public-menu";
import type {
	PublicCartItem,
	PublicCartTotals,
} from "../contracts/public-cart.schemas";

const penFormatter = new Intl.NumberFormat("es-PE", {
	style: "currency",
	currency: "PEN",
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
});

export function publicPriceToCents(price: string): number | null {
	if (!publicPriceSchema.safeParse(price).success) return null;

	const [wholePart, decimalPart] = price.split(".");
	if (!wholePart || !decimalPart) return null;

	return Number(wholePart) * 100 + Number(decimalPart);
}

export function calculatePublicCartTotals(
	items: ReadonlyArray<PublicCartItem>,
): PublicCartTotals {
	return items.reduce<PublicCartTotals>(
		(totals, item) => {
			totals.selectedUnits += item.quantity;

			if (item.availability !== "available") {
				totals.unavailableItemCount += 1;
				return totals;
			}

			totals.availableUnits += item.quantity;
			const unitPriceCents = publicPriceToCents(item.unitPrice);
			if (unitPriceCents !== null) {
				totals.availableSubtotalCents += unitPriceCents * item.quantity;
			}

			return totals;
		},
		{
			selectedUnits: 0,
			availableUnits: 0,
			availableSubtotalCents: 0,
			unavailableItemCount: 0,
		},
	);
}

export function formatPublicCartPrice(cents: number): string {
	return penFormatter.format(cents / 100);
}
