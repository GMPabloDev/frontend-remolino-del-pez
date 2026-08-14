import { useEffect, useMemo, useRef } from "react";

import {
	Alert,
	AlertDescription,
	AlertTitle,
} from "../../../components/ui/alert";
import { Button } from "../../../components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "../../../components/ui/empty";
import type { CustomerReservationsClient } from "../api/customer-reservations-client";
import type { CustomerReservation } from "../contracts/customer-reservation.schemas";
import { getCustomerReservationHistoryErrorMessage } from "../lib/customer-reservation-errors";
import { groupCustomerReservations } from "../lib/customer-reservation-presentation";
import { useCustomerReservationsQuery } from "../query/customer-reservations-query";
import { CustomerReservationCard } from "./CustomerReservationCard";

interface CustomerReservationHistoryProps {
	client: CustomerReservationsClient;
}

export function CustomerReservationHistory({
	client,
}: CustomerReservationHistoryProps) {
	const query = useCustomerReservationsQuery(client, true);
	const errorRef = useRef<HTMLParagraphElement>(null);
	const groups = useMemo(
		() => groupCustomerReservations(query.data ?? []),
		[query.data],
	);

	useEffect(() => {
		if (query.isError) errorRef.current?.focus();
	}, [query.isError]);

	if (query.isPending) {
		return (
			<CustomerReservationHistoryStatus message="Cargando tu historial…" busy />
		);
	}

	if (query.isError) {
		return (
			<Alert className="mt-8" variant="destructive">
				<AlertTitle>No pudimos cargar tu historial</AlertTitle>
				<AlertDescription>
					<p ref={errorRef} tabIndex={-1}>
						{getCustomerReservationHistoryErrorMessage(query.error)}
					</p>
					<Button
						className="mt-4"
						onClick={() => void query.refetch()}
						type="button"
						variant="outline"
					>
						Reintentar
					</Button>
				</AlertDescription>
			</Alert>
		);
	}

	if (!query.data?.length) {
		return (
			<Empty className="mt-8 border border-dashed border-[#12324a]/15 bg-[#f4f0e8]/45 py-10">
				<EmptyHeader>
					<EmptyTitle>Aún no tienes reservas confirmadas</EmptyTitle>
					<EmptyDescription>
						Cuando confirmes una reserva, aparecerá aquí con su comprobante.
					</EmptyDescription>
				</EmptyHeader>
				<EmptyContent>
					<a
						className="rounded-lg px-3 py-2 text-sm font-medium text-[#12324a] underline decoration-[#e76832]/60 underline-offset-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e76832]/25"
						href="/menu"
					>
						Explorar el menú
					</a>
				</EmptyContent>
			</Empty>
		);
	}

	return (
		<section aria-labelledby="reservation-history-title" className="mt-10">
			<div className="flex flex-wrap items-end justify-between gap-3">
				<div>
					<p className="text-xs font-bold uppercase tracking-[0.2em] text-[#e76832]">
						Tu actividad
					</p>
					<h2
						className="mt-2 font-heading text-3xl font-semibold tracking-[-0.05em] text-[#12324a]"
						id="reservation-history-title"
					>
						Historial de reservas
					</h2>
				</div>
				<Button
					disabled={query.isFetching}
					onClick={() => void query.refetch()}
					type="button"
					variant="ghost"
				>
					{query.isFetching ? "Actualizando…" : "Actualizar"}
				</Button>
			</div>

			<div className="mt-7 space-y-8">
				{groups.upcoming.length ? (
					<ReservationGroup
						client={client}
						onRefresh={() => void query.refetch()}
						reservations={groups.upcoming}
						title="Próximas"
					/>
				) : null}
				{groups.past.length ? (
					<ReservationGroup
						client={client}
						onRefresh={() => void query.refetch()}
						reservations={groups.past}
						title="Anteriores"
					/>
				) : null}
			</div>
		</section>
	);
}

function ReservationGroup({
	client,
	onRefresh,
	reservations,
	title,
}: {
	client: CustomerReservationsClient;
	onRefresh: () => void;
	reservations: CustomerReservation[];
	title: string;
}) {
	return (
		<section aria-labelledby={`reservation-group-${title}`}>
			<h3
				className="font-heading text-xl font-semibold tracking-[-0.04em] text-[#12324a]"
				id={`reservation-group-${title}`}
			>
				{title}
			</h3>
			<div className="mt-4 grid gap-5">
				{reservations.map((reservation) => (
					<CustomerReservationCard
						client={client}
						key={reservation.id}
						onRefresh={onRefresh}
						reservation={reservation}
					/>
				))}
			</div>
		</section>
	);
}

function CustomerReservationHistoryStatus({
	busy,
	message,
}: {
	busy?: boolean;
	message: string;
}) {
	return (
		<div
			aria-busy={busy}
			className="mt-8 rounded-2xl border border-[#12324a]/10 bg-[#f4f0e8]/45 p-6 text-sm text-[#12324a]/70"
			role="status"
		>
			{message}
		</div>
	);
}
