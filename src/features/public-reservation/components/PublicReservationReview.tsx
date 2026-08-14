import { CalendarDays, CircleAlert, MapPin, UsersRound } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { PublicCartItem } from "../../public-cart/contracts/public-cart.schemas";
import {
	calculatePublicCartTotals,
	formatPublicCartPrice,
	publicPriceToCents,
} from "../../public-cart/lib/public-cart-money";
import { isValidCalendarDate } from "../contracts/public-reservation.schemas";
import {
	formatReservationDateLabel,
	reservationDateToCalendarDate,
} from "../lib/public-reservation-date";

interface PublicReservationReviewProps {
	branchName: string;
	date: string;
	time: string;
	partySize: number;
	items: ReadonlyArray<PublicCartItem>;
	isSubmitting?: boolean;
	onConfirm?(): void;
}

export function PublicReservationReview({
	branchName,
	date,
	time,
	partySize,
	items,
	isSubmitting = false,
	onConfirm,
}: PublicReservationReviewProps) {
	const totals = calculatePublicCartTotals(items);
	const hasUnavailableItems = totals.unavailableItemCount > 0;
	const displayDate = isValidCalendarDate(date)
		? formatReservationDateLabel(reservationDateToCalendarDate(date))
		: date;

	return (
		<section
			className="rounded-[2rem] border border-[#12324a]/12 bg-white/90 p-5 shadow-[0_20px_60px_rgba(18,50,74,0.07)] sm:p-7"
			aria-labelledby="reservation-review-title"
		>
			<div className="flex flex-col gap-2">
				<h2
					className="font-heading text-3xl font-semibold tracking-[-0.04em] text-[#12324a] sm:text-4xl"
					id="reservation-review-title"
				>
					Revisa tu reserva
				</h2>
				<p className="text-sm leading-6 text-[#587080] sm:text-base">
					Confirma los datos de tu visita y los platos seleccionados antes de
					crear el bloqueo temporal.
				</p>
			</div>

			<dl className="mt-7 grid gap-3 rounded-[1.5rem] bg-[#dcecef] p-4 sm:grid-cols-3 sm:gap-4 sm:p-5">
				<div className="flex items-start gap-3">
					<MapPin
						className="mt-0.5 shrink-0 text-[#e76832]"
						size={17}
						aria-hidden="true"
					/>
					<div>
						<dt className="text-xs font-bold uppercase tracking-[0.14em] text-[#587080]">
							Sucursal
						</dt>
						<dd className="mt-1 font-semibold text-[#12324a]">{branchName}</dd>
					</div>
				</div>
				<div className="flex items-start gap-3">
					<CalendarDays
						className="mt-0.5 shrink-0 text-[#e76832]"
						size={17}
						aria-hidden="true"
					/>
					<div>
						<dt className="text-xs font-bold uppercase tracking-[0.14em] text-[#587080]">
							Fecha y hora
						</dt>
						<dd className="mt-1 font-semibold text-[#12324a]">
							{displayDate} · {time}
						</dd>
					</div>
				</div>
				<div className="flex items-start gap-3">
					<UsersRound
						className="mt-0.5 shrink-0 text-[#e76832]"
						size={17}
						aria-hidden="true"
					/>
					<div>
						<dt className="text-xs font-bold uppercase tracking-[0.14em] text-[#587080]">
							Personas
						</dt>
						<dd className="mt-1 font-semibold text-[#12324a]">{partySize}</dd>
					</div>
				</div>
			</dl>

			<div className="mt-8">
				<div className="flex items-end justify-between gap-3">
					<div>
						<h3 className="font-heading text-xl font-semibold tracking-[-0.04em] text-[#12324a]">
							Platos seleccionados
						</h3>
						<p className="mt-1 text-sm text-[#587080]">
							Los llevaremos a tu revisión de reserva.
						</p>
					</div>
					<span className="rounded-full bg-[#dcecef] px-3 py-1.5 text-xs font-semibold text-[#12324a]">
						{totals.selectedUnits}{" "}
						{totals.selectedUnits === 1 ? "unidad" : "unidades"}
					</span>
				</div>
				<ul className="mt-4 flex flex-col gap-2">
					{items.map((item) => (
						<ReviewItem item={item} key={item.dishId} />
					))}
				</ul>
			</div>

			<div className="my-7 border-t border-[#12324a]/12 pt-6">
				<div className="flex items-end justify-between gap-4">
					<div>
						<p className="text-xs font-bold uppercase tracking-[0.16em] text-[#587080]">
							Subtotal estimado
						</p>
						<p className="mt-1 text-sm text-[#587080]">
							Solo incluye platos disponibles · PEN
						</p>
					</div>
					<strong className="font-heading text-3xl tracking-[-0.04em] text-[#e76832]">
						{formatPublicCartPrice(totals.availableSubtotalCents)}
					</strong>
				</div>
			</div>

			{hasUnavailableItems ? (
				<Alert className="mt-6" variant="destructive">
					<CircleAlert aria-hidden="true" />
					<AlertTitle>Actualiza tu selección</AlertTitle>
					<AlertDescription>
						Hay platos que deben revisarse antes de crear la reserva.
					</AlertDescription>
				</Alert>
			) : null}

			{onConfirm ? (
				<>
					<Button
						className="mt-6 min-h-12 w-full rounded-full bg-[#12324a] text-base hover:bg-[#1d4b68]"
						disabled={isSubmitting || hasUnavailableItems || items.length === 0}
						onClick={onConfirm}
						type="button"
					>
						{isSubmitting ? "Creando reserva…" : "Crear reserva temporal"}
					</Button>
					<p className="mt-3 text-center text-xs leading-5 text-[#587080]">
						Todavía no realizaremos ningún cobro. Podrás pagar en el siguiente
						paso.
					</p>
				</>
			) : null}
		</section>
	);
}

function ReviewItem({ item }: { item: PublicCartItem }) {
	const unitPriceCents = publicPriceToCents(item.unitPrice);
	const lineTotalCents =
		unitPriceCents === null ? 0 : unitPriceCents * item.quantity;

	return (
		<li className="flex items-start justify-between gap-4 rounded-xl border border-[#12324a]/10 bg-[#f4f0e8]/55 px-4 py-3">
			<div className="min-w-0">
				<p className="truncate font-semibold text-[#12324a]">{item.name}</p>
				<p className="mt-1 text-sm text-[#587080]">
					{item.quantity} × {formatPublicCartPrice(unitPriceCents ?? 0)}
				</p>
			</div>
			<strong className="shrink-0 font-semibold text-[#e76832]">
				{formatPublicCartPrice(lineTotalCents)}
			</strong>
		</li>
	);
}
