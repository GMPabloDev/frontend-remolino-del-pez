import { Clock3 } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
	formatPublicCartPrice,
	publicPriceToCents,
} from "../../public-cart/lib/public-cart-money";
import { PublicCheckoutButton } from "../../public-payment/components/PublicCheckoutButton";
import type { TemporaryReservationResponse } from "../contracts/public-reservation.schemas";
import {
	formatReservationDateLabel,
	reservationDateToCalendarDate,
} from "../lib/public-reservation-date";
import { PublicReservationCountdown } from "./PublicReservationCountdown";

export type PublicReservationSummaryData = Pick<
	TemporaryReservationResponse,
	| "id"
	| "branchSlug"
	| "status"
	| "date"
	| "startTime"
	| "endTime"
	| "timezone"
	| "durationMinutes"
	| "expiresAt"
	| "partySize"
	| "items"
	| "currency"
	| "total"
	| "createdAt"
>;

interface PublicReservationSummaryProps {
	reservation: PublicReservationSummaryData;
	branchName?: string;
	checkoutError?: string;
	isCheckoutPending?: boolean;
	isPaymentAvailable?: boolean;
	onCheckout?(): void;
	onExpired(): void;
	paymentDisabledReason?: string;
}

export function PublicReservationSummary({
	reservation,
	branchName,
	checkoutError,
	isCheckoutPending = false,
	isPaymentAvailable = false,
	onCheckout = () => {},
	onExpired,
	paymentDisabledReason,
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

			{checkoutError ? (
				<Alert className="mt-6" variant="destructive">
					<Clock3 aria-hidden="true" />
					<AlertTitle>No pudimos iniciar el pago</AlertTitle>
					<AlertDescription>{checkoutError}</AlertDescription>
				</Alert>
			) : (
				<Alert className="mt-6">
					<Clock3 aria-hidden="true" />
					<AlertTitle>
						{isCheckoutPending
							? "Preparando tu pago"
							: isPaymentAvailable
								? "Pago seguro con Stripe"
								: "El pago no está disponible"}
					</AlertTitle>
					<AlertDescription>
						{isCheckoutPending
							? "Estamos preparando una sesión segura. No cierres esta página."
							: isPaymentAvailable
								? "Serás redirigido a Stripe para completar el pago."
								: (paymentDisabledReason ??
									"Necesitamos conservar el contexto de la reserva antes de continuar.")}
					</AlertDescription>
				</Alert>
			)}

			<PublicCheckoutButton
				aria-describedby="reservation-payment-help"
				disabled={!isPaymentAvailable}
				isPending={isCheckoutPending}
				onClick={onCheckout}
			/>
			<p
				className="mt-2 text-center text-sm text-muted-foreground"
				id="reservation-payment-help"
			>
				{isCheckoutPending
					? "No cierres esta página mientras preparamos la redirección."
					: isPaymentAvailable
						? "El pago se procesa en Stripe; no introducimos datos de tarjeta aquí."
						: (paymentDisabledReason ??
							"El pago requiere una reserva vigente y guardada en esta pestaña.")}
			</p>
		</section>
	);
}
