import { Clock3 } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
	formatPublicCartPrice,
	publicPriceToCents,
} from "../../public-cart/lib/public-cart-money";
import type { TemporaryReservationResponse } from "../contracts/public-reservation.schemas";
import {
	formatReservationDateLabel,
	reservationDateToCalendarDate,
} from "../lib/public-reservation-date";
import { PublicReservationCountdown } from "./PublicReservationCountdown";

interface PublicReservationSummaryProps {
	reservation: TemporaryReservationResponse;
	branchName?: string;
	isPaymentAvailable?: boolean;
	onExpired(): void;
}

export function PublicReservationSummary({
	reservation,
	branchName,
	isPaymentAvailable = false,
	onExpired,
}: PublicReservationSummaryProps) {
	const dateLabel = formatReservationDateLabel(
		reservationDateToCalendarDate(reservation.date),
	);

	return (
		<section aria-labelledby="reservation-summary-title">
			<div className="flex flex-col gap-2">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<h2
						className="font-heading text-2xl font-semibold tracking-[-0.04em]"
						id="reservation-summary-title"
					>
						Reserva temporal
					</h2>
					<Badge variant="secondary">Pendiente de pago</Badge>
				</div>
				<p className="text-sm leading-6 text-muted-foreground">
					Tu mesa está bloqueada temporalmente. Completa el siguiente paso antes
					de que termine el tiempo.
				</p>
			</div>

			<PublicReservationCountdown
				createdAt={reservation.createdAt}
				expiresAt={reservation.expiresAt}
				onExpire={onExpired}
			/>

			<dl className="mt-6 grid gap-4 rounded-xl border bg-card p-4 sm:grid-cols-3">
				<div>
					<dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
						Sucursal
					</dt>
					<dd className="mt-1 font-medium">
						{branchName ?? reservation.branchSlug}
					</dd>
				</div>
				<div>
					<dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
						Fecha y hora
					</dt>
					<dd className="mt-1 font-medium">
						{dateLabel} · {reservation.startTime}
					</dd>
				</div>
				<div>
					<dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
						Personas
					</dt>
					<dd className="mt-1 font-medium">{reservation.partySize}</dd>
				</div>
			</dl>

			<div className="mt-6 flex flex-col gap-3">
				<h3 className="font-medium">Platos congelados</h3>
				<ul className="flex flex-col gap-3">
					{reservation.items.map((item) => (
						<li
							className="flex items-start justify-between gap-4 rounded-lg border p-3"
							key={item.dishId}
						>
							<div className="min-w-0">
								<p className="truncate font-medium">{item.name}</p>
								<p className="mt-1 text-sm text-muted-foreground">
									{item.quantity} ×{" "}
									{formatPublicCartPrice(
										publicPriceToCents(item.unitPrice) ?? 0,
									)}
								</p>
							</div>
							<strong className="shrink-0 font-medium">
								{formatPublicCartPrice(publicPriceToCents(item.subtotal) ?? 0)}
							</strong>
						</li>
					))}
				</ul>
			</div>

			<Separator className="my-6" />

			<div className="flex items-end justify-between gap-4">
				<div>
					<p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
						Total congelado
					</p>
					<p className="mt-1 text-sm text-muted-foreground">
						Importe en {reservation.currency}
					</p>
				</div>
				<strong className="font-heading text-2xl text-primary">
					{formatPublicCartPrice(publicPriceToCents(reservation.total) ?? 0)}
				</strong>
			</div>

			<Alert className="mt-6">
				<Clock3 aria-hidden="true" />
				<AlertTitle>El pago se habilitará después</AlertTitle>
				<AlertDescription>
					{isPaymentAvailable
						? "El pago estará disponible cuando se habilite el siguiente paso."
						: "Continuar al pago estará disponible en el siguiente paso del flujo."}
				</AlertDescription>
			</Alert>

			<Button
				aria-describedby="reservation-payment-help"
				className="mt-6 w-full"
				disabled={!isPaymentAvailable}
				type="button"
			>
				Continuar al pago
			</Button>
			<p
				className="mt-2 text-center text-sm text-muted-foreground"
				id="reservation-payment-help"
			>
				Esta opción se habilitará en la siguiente spec.
			</p>
		</section>
	);
}
