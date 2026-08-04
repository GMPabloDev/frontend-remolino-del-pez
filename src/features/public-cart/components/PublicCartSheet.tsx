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
import { Separator } from "@/components/ui/separator";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import { formatPublicCartPrice } from "../lib/public-cart-money";
import { usePublicCart } from "../PublicCartProvider";
import { PublicCartItem } from "./PublicCartItem";
import { PublicCartTrigger } from "./PublicCartTrigger";

export function PublicCartSheet() {
	const { announcement, clearCart, items, persistenceWarning, totals } =
		usePublicCart();
	const [open, setOpen] = useState(false);
	const [clearDialogOpen, setClearDialogOpen] = useState(false);
	const hasUnverifiedItems = items.some(
		(item) => item.availability === "unverified",
	);

	return (
		<>
			<p className="sr-only" aria-live="polite" aria-atomic="true">
				{announcement}
			</p>
			<Sheet open={open} onOpenChange={setOpen}>
				<SheetTrigger render={<PublicCartTrigger />} />
				<SheetContent
					aria-describedby="public-cart-description"
					className="w-[min(100%-1rem,28rem)] gap-0 p-0 sm:max-w-md"
					side="right"
				>
					<SheetHeader className="border-b border-[#12324a]/10 bg-[#f7faf8] pr-14">
						<SheetTitle className="font-heading text-2xl font-semibold tracking-[-0.04em] text-[#12324a]">
							Tu selección
						</SheetTitle>
						<SheetDescription
							id="public-cart-description"
							className="text-[#12324a]/65"
						>
							Revisa tus platos antes de continuar con la reserva.
						</SheetDescription>
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
						{hasUnverifiedItems ? (
							<Alert className="m-4 mb-0">
								<CircleAlert aria-hidden="true" />
								<AlertTitle>Disponibilidad por verificar</AlertTitle>
								<AlertDescription>
									No pudimos confirmar estos platos. Se verificarán antes de
									crear la reserva.
								</AlertDescription>
							</Alert>
						) : null}

						{items.length === 0 ? (
							<Empty className="flex-1 border-0 px-8">
								<EmptyHeader>
									<EmptyMedia variant="icon">
										<ShoppingBag aria-hidden="true" />
									</EmptyMedia>
									<EmptyTitle>Tu carrito está vacío</EmptyTitle>
									<EmptyDescription>
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
						<>
							<Separator />
							<SheetFooter className="gap-3 bg-[#f7faf8]">
								<div className="flex items-end justify-between gap-4">
									<div>
										<p className="text-xs font-bold uppercase tracking-[0.16em] text-[#12324a]/50">
											Subtotal estimado
										</p>
										<p className="mt-1 text-xs text-[#12324a]/60">
											{totals.availableUnits} unidades disponibles · PEN
										</p>
									</div>
									<strong className="font-heading text-2xl text-[#e76832]">
										{formatPublicCartPrice(totals.availableSubtotalCents)}
									</strong>
								</div>
								{totals.unavailableItemCount > 0 ? (
									<p className="text-xs leading-5 text-[#12324a]/60">
										Los platos no disponibles no están incluidos en el subtotal.
									</p>
								) : null}
								<Button
									aria-describedby="public-cart-continue-help"
									disabled
									className="w-full"
									type="button"
								>
									Continuar con la reserva
								</Button>
								<p
									id="public-cart-continue-help"
									className="text-center text-xs leading-5 text-[#12324a]/55"
								>
									Esta opción estará disponible en el siguiente paso.
								</p>
								<div className="flex justify-between gap-3">
									<AlertDialog
										open={clearDialogOpen}
										onOpenChange={setClearDialogOpen}
									>
										<Button
											onClick={() => setClearDialogOpen(true)}
											size="sm"
											variant="ghost"
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
						</>
					) : null}
				</SheetContent>
			</Sheet>
		</>
	);
}
