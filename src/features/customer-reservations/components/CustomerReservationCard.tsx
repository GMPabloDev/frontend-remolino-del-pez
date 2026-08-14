import { CalendarDays, MapPin, Users } from "lucide-react";

import { Badge } from "../../../components/ui/badge";
import { Separator } from "../../../components/ui/separator";
import type { CustomerReservationsClient } from "../api/customer-reservations-client";
import type { CustomerReservation } from "../contracts/customer-reservation.schemas";
import {
	formatCustomerReservationDate,
	formatCustomerReservationMoney,
	formatCustomerReservationTimeRange,
} from "../lib/customer-reservation-presentation";
import { CustomerReceiptDownload } from "./CustomerReceiptDownload";

interface CustomerReservationCardProps {
	client: CustomerReservationsClient;
	reservation: CustomerReservation;
	onRefresh: () => void;
}

export function CustomerReservationCard({
	client,
	reservation,
	onRefresh,
}: CustomerReservationCardProps) {
	const receiptLabel = getReceiptLabel(reservation.receipt?.status);
	const receiptVariant = getReceiptVariant(reservation.receipt?.status);

	return (
		<article className="rounded-[1.5rem] border border-[#12324a]/10 bg-[#fffdfa] p-5 shadow-[0_16px_50px_rgba(18,50,74,0.08)] sm:p-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<p className="text-xs font-bold uppercase tracking-[0.18em] text-[#e76832]">
						{reservation.branch.name}
					</p>
					<h3 className="mt-2 font-heading text-xl font-semibold tracking-[-0.04em] text-[#12324a]">
						{formatCustomerReservationDate(reservation.startAt)}
					</h3>
				</div>
				<Badge variant={receiptVariant}>{receiptLabel}</Badge>
			</div>

			<div className="mt-5 grid gap-3 text-sm text-[#12324a]/75 sm:grid-cols-2">
				<div className="flex items-start gap-2">
					<CalendarDays
						aria-hidden="true"
						className="mt-0.5 size-4 shrink-0 text-[#e76832]"
					/>
					<span>
						{formatCustomerReservationTimeRange(
							reservation.startAt,
							reservation.endAt,
						)}
					</span>
				</div>
				<div className="flex items-start gap-2">
					<Users
						aria-hidden="true"
						className="mt-0.5 size-4 shrink-0 text-[#e76832]"
					/>
					<span>{reservation.partySize} personas</span>
				</div>
				<div className="flex items-start gap-2 sm:col-span-2">
					<MapPin
						aria-hidden="true"
						className="mt-0.5 size-4 shrink-0 text-[#e76832]"
					/>
					<span>
						{reservation.branch.address}, {reservation.branch.district},{" "}
						{reservation.branch.province}, {reservation.branch.department}
					</span>
				</div>
			</div>

			<Separator className="my-5" />

			<div>
				<h4 className="text-xs font-bold uppercase tracking-[0.16em] text-[#12324a]/55">
					Detalle de la reserva
				</h4>
				<ul className="mt-3 divide-y divide-[#12324a]/10">
					{reservation.items.map((item) => (
						<li
							className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"
							key={item.dishId}
						>
							<div className="min-w-0">
								<p className="break-words font-medium text-[#12324a]">
									{item.name}
								</p>
								<p className="mt-1 text-xs text-[#12324a]/60">
									{item.quantity} ×{" "}
									{formatCustomerReservationMoney(item.unitPrice)}
								</p>
							</div>
							<span className="shrink-0 font-medium text-[#12324a]">
								{formatCustomerReservationMoney(item.subtotal)}
							</span>
						</li>
					))}
				</ul>
			</div>

			<div className="mt-5 flex flex-wrap items-end justify-between gap-4 border-t border-[#12324a]/10 pt-4">
				<div>
					<p className="text-xs text-[#12324a]/60">
						Confirmada el{" "}
						{formatCustomerReservationDate(reservation.confirmedAt)}
					</p>
					<p className="mt-1 font-heading text-2xl font-semibold tracking-[-0.04em] text-[#12324a]">
						{formatCustomerReservationMoney(reservation.total)}
					</p>
				</div>
				{reservation.receipt?.status === "available" ? (
					<CustomerReceiptDownload
						client={client}
						onRefresh={onRefresh}
						reservationId={reservation.id}
					/>
				) : null}
			</div>
			{reservation.receipt?.status === "available" ? (
				<p className="mt-3 text-xs text-[#12324a]/60">
					Comprobante {reservation.receipt.number}
				</p>
			) : null}
		</article>
	);
}

function getReceiptLabel(
	status: "pending" | "available" | "failed" | undefined,
) {
	switch (status) {
		case "available":
			return "Comprobante disponible";
		case "pending":
			return "Comprobante en preparación";
		case "failed":
			return "Comprobante no disponible";
		default:
			return "Sin comprobante";
	}
}

function getReceiptVariant(
	status: "pending" | "available" | "failed" | undefined,
): "default" | "secondary" | "destructive" {
	switch (status) {
		case "available":
			return "default";
		case "failed":
			return "destructive";
		default:
			return "secondary";
	}
}
