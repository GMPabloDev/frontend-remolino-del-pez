import { AlertCircle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
		<section aria-labelledby="reservation-review-title">
			<div className="flex flex-col gap-2">
				<h2
					className="font-heading text-2xl font-semibold tracking-[-0.04em]"
					id="reservation-review-title"
				>
					Revisa tu reserva
				</h2>
				<p className="text-sm leading-6 text-muted-foreground">
					Confirma los datos de tu visita y los platos seleccionados antes de
					crear el bloqueo temporal.
				</p>
			</div>

			<dl className="mt-6 grid gap-4 rounded-xl border bg-card p-4 sm:grid-cols-3">
				<div>
					<dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
						Sucursal
					</dt>
					<dd className="mt-1 font-medium">{branchName}</dd>
				</div>
				<div>
					<dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
						Fecha y hora
					</dt>
					<dd className="mt-1 font-medium">
						{displayDate} · {time}
					</dd>
				</div>
				<div>
					<dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
						Personas
					</dt>
					<dd className="mt-1 font-medium">{partySize}</dd>
				</div>
			</dl>

			<div className="mt-6 flex flex-col gap-3">
				<div className="flex items-center justify-between gap-3">
					<h3 className="font-medium">Platos seleccionados</h3>
					<Badge variant="secondary">
						{totals.selectedUnits}{" "}
						{totals.selectedUnits === 1 ? "unidad" : "unidades"}
					</Badge>
				</div>
				<ul className="flex flex-col gap-3">
					{items.map((item) => (
						<ReviewItem item={item} key={item.dishId} />
					))}
				</ul>
			</div>

			<Separator className="my-6" />

			<div className="flex items-end justify-between gap-4">
				<div>
					<p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
						Subtotal estimado
					</p>
					<p className="mt-1 text-sm text-muted-foreground">
						Solo incluye platos disponibles · PEN
					</p>
				</div>
				<strong className="font-heading text-2xl text-primary">
					{formatPublicCartPrice(totals.availableSubtotalCents)}
				</strong>
			</div>

			{hasUnavailableItems ? (
				<Alert className="mt-6" variant="destructive">
					<AlertCircle aria-hidden="true" />
					<AlertTitle>Actualiza tu selección</AlertTitle>
					<AlertDescription>
						Hay platos que deben revisarse antes de crear la reserva.
					</AlertDescription>
				</Alert>
			) : null}

			{onConfirm ? (
				<Button
					className="mt-6 w-full"
					disabled={isSubmitting || hasUnavailableItems || items.length === 0}
					onClick={onConfirm}
					type="button"
				>
					{isSubmitting ? "Creando reserva…" : "Crear reserva temporal"}
				</Button>
			) : null}
		</section>
	);
}

function ReviewItem({ item }: { item: PublicCartItem }) {
	const unitPriceCents = publicPriceToCents(item.unitPrice);
	const lineTotalCents =
		unitPriceCents === null ? 0 : unitPriceCents * item.quantity;

	return (
		<li className="flex items-start justify-between gap-4 rounded-lg border p-3">
			<div className="min-w-0">
				<p className="truncate font-medium">{item.name}</p>
				<p className="mt-1 text-sm text-muted-foreground">
					{item.quantity} × {formatPublicCartPrice(unitPriceCents ?? 0)}
				</p>
			</div>
			<strong className="shrink-0 font-medium">
				{formatPublicCartPrice(lineTotalCents)}
			</strong>
		</li>
	);
}
