import { CircleAlert, ShoppingBag } from "lucide-react";
import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import { runtimeConfig } from "../../../config/runtime";
import type { CartItemAvailability } from "../contracts/public-cart.schemas";
import { formatPublicCartPrice } from "../lib/public-cart-money";
import { usePublicCart } from "../PublicCartProvider";
import { PublicCartItem } from "./PublicCartItem";
import { PublicCartTrigger } from "./PublicCartTrigger";

export function PublicCartSheet() {
	const {
		announcement,
		branchSlug,
		clearCart,
		items,
		persistenceWarning,
		prepareReservationNavigation,
		reservationNavigationBlocked,
		totals,
	} = usePublicCart();
	const [open, setOpen] = useState(false);
	const [clearDialogOpen, setClearDialogOpen] = useState(false);
	const unavailableItems = items.filter(
		(item) => item.availability !== "available",
	);
	const canContinueToReservation =
		items.length > 0 &&
		unavailableItems.length === 0 &&
		!runtimeConfig.useMenuFixture;

	function handleContinueToReservation() {
		if (!canContinueToReservation) return;
		if (!prepareReservationNavigation()) return;

		window.location.assign(`/reserve?branch=${encodeURIComponent(branchSlug)}`);
	}

	return (
		<>
			<p className="sr-only" aria-live="polite" aria-atomic="true">
				{announcement}
			</p>
			<Sheet open={open} onOpenChange={setOpen}>
				<SheetTrigger render={<PublicCartTrigger />} />
				<SheetContent
					aria-describedby="public-cart-description"
					className="w-[min(100%-1rem,28rem)] gap-0 bg-[#f4f0e8] p-0 sm:max-w-md [&_[data-slot=sheet-close]]:text-white [&_[data-slot=sheet-close]]:hover:bg-white/10"
					side="right"
				>
					<SheetHeader className="border-b border-white/15 bg-[#12324a] px-5 pb-5 pr-14 pt-6 text-white sm:px-6 sm:pt-7">
						<SheetTitle className="font-heading text-3xl font-semibold tracking-[-0.05em] text-white">
							Tu selección
						</SheetTitle>
						<SheetDescription
							id="public-cart-description"
							className="mt-1 text-white/70"
						>
							Revisa tus platos antes de continuar con la reserva.
						</SheetDescription>
						<div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-white/75">
							<span className="rounded-full bg-white/10 px-3 py-1.5">
								{totals.selectedUnits}{" "}
								{totals.selectedUnits === 1 ? "unidad" : "unidades"}
							</span>
							<span className="rounded-full bg-[#e76832] px-3 py-1.5 text-white">
								{formatPublicCartPrice(totals.availableSubtotalCents)}
							</span>
						</div>
					</SheetHeader>

					<div className="flex min-h-0 flex-1 flex-col">
						{persistenceWarning ? (
							<Alert className="m-4 mb-0" variant="destructive">
								<CircleAlert aria-hidden="true" />
								<AlertTitle>Guardado temporal</AlertTitle>
								<AlertDescription>
									Este carrito seguirá disponible durante esta sesión, pero no
									se conservará al cerrar la pestaña.
								</AlertDescription>
							</Alert>
						) : null}
						{unavailableItems.length > 0 ? (
							<Alert className="m-4 mb-0">
								<CircleAlert aria-hidden="true" />
								<AlertTitle>No puedes continuar todavía</AlertTitle>
								<AlertDescription>
									<p>Corrige estos platos antes de crear la reserva:</p>
									<ul className="mt-2 list-disc pl-5">
										{unavailableItems.map((item) => (
											<li key={item.dishId}>
												{item.name} ({getAvailabilityLabel(item.availability)})
											</li>
										))}
									</ul>
								</AlertDescription>
							</Alert>
						) : null}
						{runtimeConfig.useMenuFixture && items.length > 0 ? (
							<Alert className="m-4 mb-0">
								<CircleAlert aria-hidden="true" />
								<AlertTitle>
									Reserva real no disponible en modo demostración
								</AlertTitle>
								<AlertDescription>
									Desactiva el menú fixture para continuar con la API real.
								</AlertDescription>
							</Alert>
						) : null}
						{reservationNavigationBlocked && items.length > 0 ? (
							<Alert className="m-4 mb-0" variant="destructive">
								<CircleAlert aria-hidden="true" />
								<AlertTitle>No pudimos abrir la reserva</AlertTitle>
								<AlertDescription>
									No pudimos conservar tu selección para abrir la reserva.
									<Button
										className="mt-3"
										onClick={handleContinueToReservation}
										size="sm"
										variant="outline"
									>
										Intentar de nuevo
									</Button>
								</AlertDescription>
							</Alert>
						) : null}

						{items.length === 0 ? (
							<Empty className="flex-1 border-0 px-8">
								<EmptyHeader>
									<EmptyMedia
										className="bg-[#dcecef] text-[#12324a]"
										variant="icon"
									>
										<ShoppingBag aria-hidden="true" />
									</EmptyMedia>
									<EmptyTitle className="font-heading text-2xl tracking-[-0.04em] text-[#12324a]">
										Tu carrito está vacío
									</EmptyTitle>
									<EmptyDescription className="max-w-xs text-[#587080]">
										Añade platos desde la carta para preparar tu próxima visita.
									</EmptyDescription>
								</EmptyHeader>
							</Empty>
						) : (
							<ScrollArea className="min-h-0 flex-1 px-4">
								<div className="flex flex-col gap-3 py-4">
									{items.map((item) => (
										<PublicCartItem item={item} key={item.dishId} />
									))}
								</div>
							</ScrollArea>
						)}
					</div>

					{items.length > 0 ? (
						<SheetFooter className="gap-3 border-t border-[#12324a]/10 bg-white px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:px-6">
							<div className="flex items-end justify-between gap-4">
								<div>
									<p className="text-xs font-bold uppercase tracking-[0.16em] text-[#587080]">
										Subtotal de platos
									</p>
									<p className="mt-1 text-xs text-[#587080]">
										{totals.availableUnits} unidades disponibles · PEN
									</p>
								</div>
								<strong className="font-heading text-3xl tracking-[-0.04em] text-[#e76832]">
									{formatPublicCartPrice(totals.availableSubtotalCents)}
								</strong>
							</div>
							{totals.unavailableItemCount > 0 ? (
								<p className="text-xs leading-5 text-[#587080]">
									Los platos no disponibles no están incluidos en el subtotal.
								</p>
							) : null}
							<Button
								aria-describedby="public-cart-continue-help"
								className="min-h-12 w-full rounded-full bg-[#12324a] hover:bg-[#1d4b68]"
								disabled={!canContinueToReservation}
								onClick={handleContinueToReservation}
								type="button"
							>
								Continuar con la reserva
							</Button>
							<p
								id="public-cart-continue-help"
								className="text-center text-xs leading-5 text-[#587080]"
							>
								{getContinueHelpText({
									fixtureMode: runtimeConfig.useMenuFixture,
									unavailableItemCount: unavailableItems.length,
								})}
							</p>
							<div className="flex justify-end">
								<AlertDialog
									open={clearDialogOpen}
									onOpenChange={setClearDialogOpen}
								>
									<Button
										className="border-[#b34b25]/30 bg-[#fff4ef] text-[#8f3d20] hover:border-[#b34b25] hover:bg-[#b34b25] hover:text-white"
										onClick={() => setClearDialogOpen(true)}
										size="sm"
										variant="outline"
									>
										Vaciar carrito
									</Button>
									<AlertDialogContent>
										<AlertDialogHeader>
											<AlertDialogTitle>¿Vaciar el carrito?</AlertDialogTitle>
											<AlertDialogDescription>
												Se eliminarán todos los platos seleccionados de esta
												sucursal.
											</AlertDialogDescription>
										</AlertDialogHeader>
										<AlertDialogFooter>
											<Button
												onClick={() => setClearDialogOpen(false)}
												variant="outline"
											>
												Conservar selección
											</Button>
											<Button
												onClick={() => {
													clearCart();
													setClearDialogOpen(false);
												}}
												variant="destructive"
											>
												Vaciar carrito
											</Button>
										</AlertDialogFooter>
									</AlertDialogContent>
								</AlertDialog>
							</div>
						</SheetFooter>
					) : null}
				</SheetContent>
			</Sheet>
		</>
	);
}

function getAvailabilityLabel(availability: CartItemAvailability): string {
	switch (availability) {
		case "sold_out":
			return "agotado";
		case "removed":
			return "retirado";
		case "unverified":
			return "sin verificar";
		default:
			return "no disponible";
	}
}

function getContinueHelpText({
	fixtureMode,
	unavailableItemCount,
}: {
	fixtureMode: boolean;
	unavailableItemCount: number;
}): string {
	if (unavailableItemCount > 0) {
		return "Corrige los platos indicados para continuar.";
	}

	if (fixtureMode) {
		return "La reserva se habilitará al usar el menú conectado a la API real.";
	}

	return "Tu selección está lista para consultar disponibilidad.";
}
