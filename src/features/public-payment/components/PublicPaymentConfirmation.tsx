import { CheckCircle2 } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
	formatPublicCartPrice,
	publicPriceToCents,
} from "../../public-cart/lib/public-cart-money";
import {
	formatReservationDateLabel,
	reservationDateToCalendarDate,
} from "../../public-reservation/lib/public-reservation-date";
import type { StoredPublicPaymentConfirmation } from "../contracts/public-payment.schemas";

interface PublicPaymentConfirmationProps {
	branchName?: string;
	confirmation: StoredPublicPaymentConfirmation;
	onGoHome(): void;
	onReturnToMenu(): void;
	storageWarning?: boolean;
}

export function PublicPaymentConfirmation({
	branchName,
	confirmation,
	onGoHome,
	onReturnToMenu,
	storageWarning = false,
}: PublicPaymentConfirmationProps) {
	const dateLabel = formatReservationDateLabel(
		reservationDateToCalendarDate(confirmation.date),
	);

	return (
		<section aria-labelledby="payment-confirmation-title">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
						Pago confirmado
					</p>
					<h1
						className="mt-2 font-heading text-3xl font-semibold tracking-[-0.05em]"
						id="payment-confirmation-title"
					>
						Tu reserva está confirmada
					</h1>
				</div>
				<Badge variant="secondary">Confirmada</Badge>
			</div>

			<Alert className="mt-6">
				<CheckCircle2 aria-hidden="true" />
				<AlertTitle>Pago recibido correctamente</AlertTitle>
				<AlertDescription>
					La confirmación por correo se procesa por separado y puede tardar.
				</AlertDescription>
			</Alert>

			{storageWarning ? (
				<Alert className="mt-4" variant="destructive">
					<AlertTitle>No pudimos guardar este resumen</AlertTitle>
					<AlertDescription>
						La confirmación permanecerá visible mientras esta pestaña siga
						abierta, pero podría perderse al recargar.
					</AlertDescription>
				</Alert>
			) : null}

			<dl className="mt-6 grid gap-4 rounded-xl border bg-card p-4 sm:grid-cols-3">
				<div>
					<dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
						Sucursal
					</dt>
					<dd className="mt-1 font-medium">
						{branchName ?? confirmation.branchSlug}
					</dd>
				</div>
				<div>
					<dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
						Fecha y hora
					</dt>
					<dd className="mt-1 font-medium">
						{dateLabel} · {confirmation.startTime}
					</dd>
				</div>
				<div>
					<dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
						Personas
					</dt>
					<dd className="mt-1 font-medium">{confirmation.partySize}</dd>
				</div>
			</dl>

			<div className="mt-6 flex flex-col gap-3">
				<h2 className="font-medium">Platos reservados</h2>
				<ul className="flex flex-col gap-3">
					{confirmation.items.map((item) => (
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
						Total confirmado
					</p>
					<p className="mt-1 text-sm text-muted-foreground">
						Confirmado el {formatConfirmationDate(confirmation.confirmedAt)} ·{" "}
						{confirmation.currency}
					</p>
				</div>
				<strong className="font-heading text-2xl text-primary">
					{formatPublicCartPrice(publicPriceToCents(confirmation.total) ?? 0)}
				</strong>
			</div>

			<div className="mt-8 flex flex-col gap-3 sm:flex-row">
				<Button className="sm:flex-1" onClick={onReturnToMenu}>
					Volver al menú
				</Button>
				<Button className="sm:flex-1" onClick={onGoHome} variant="outline">
					Ir al inicio
				</Button>
			</div>
		</section>
	);
}

function formatConfirmationDate(value: string): string {
	return new Intl.DateTimeFormat("es-PE", {
		dateStyle: "medium",
		timeStyle: "short",
		timeZone: "America/Lima",
	}).format(new Date(value));
}
