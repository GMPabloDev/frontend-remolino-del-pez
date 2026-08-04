import { ShoppingBag } from "lucide-react";
import { type ComponentProps, forwardRef } from "react";

import { Button } from "@/components/ui/button";
import { formatPublicCartPrice } from "../lib/public-cart-money";
import { usePublicCart } from "../PublicCartProvider";

export const PublicCartTrigger = forwardRef<
	HTMLButtonElement,
	Omit<ComponentProps<typeof Button>, "children">
>(function PublicCartTrigger({ className, ...props }, ref) {
	const { totals } = usePublicCart();
	const label = `Abrir carrito. ${totals.selectedUnits} unidades. Subtotal ${formatPublicCartPrice(totals.availableSubtotalCents)}.`;

	return (
		<Button
			ref={ref}
			{...props}
			aria-label={props["aria-label"] ?? label}
			className={`fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 mx-auto flex min-h-14 max-w-sm items-center justify-between rounded-full bg-[#12324a] px-5 text-white shadow-[0_18px_45px_rgba(18,50,74,0.28)] hover:bg-[#1d4b68] sm:inset-auto sm:bottom-6 sm:right-6 sm:left-auto sm:mx-0 sm:max-w-none ${className ?? ""}`}
			variant="default"
		>
			<span className="flex items-center gap-3">
				<span
					className="grid size-9 place-items-center rounded-full bg-[#e76832]"
					aria-hidden="true"
				>
					<ShoppingBag />
				</span>
				<span className="text-left">
					<strong className="block text-sm font-semibold">Tu carrito</strong>
					<span className="block text-xs text-white/70">
						{totals.selectedUnits} unidades ·{" "}
						{formatPublicCartPrice(totals.availableSubtotalCents)}
					</span>
				</span>
			</span>
			<span className="text-lg" aria-hidden="true">
				→
			</span>
		</Button>
	);
});
