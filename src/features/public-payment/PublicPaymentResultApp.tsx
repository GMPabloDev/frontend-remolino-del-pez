import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { usePublicBranchesQuery } from "../public-api/query/public-queries";
import { PublicQueryProvider } from "../public-api/query/public-query-client";
import type { PublicBranch } from "../public-discovery/contracts/public-discovery.schemas";
import type { StoredPublicReservation } from "../public-reservation/contracts/public-reservation.schemas";
import { readPublicReservation } from "../public-reservation/lib/public-reservation-storage";
import { PublicPaymentConfirmation } from "./components/PublicPaymentConfirmation";
import { PublicPaymentResultState } from "./components/PublicPaymentResultState";
import { PublicPaymentWaiting } from "./components/PublicPaymentWaiting";
import type {
	PublicCheckoutReturn,
	StoredPublicPaymentConfirmation,
} from "./contracts/public-payment.schemas";
import { matchesPublicCheckoutReturnReservation } from "./lib/public-payment-contracts";
import {
	readCurrentPublicPaymentConfirmation,
	readPublicCheckoutReturn,
	readPublicPaymentConfirmation,
} from "./lib/public-payment-storage";

export function PublicPaymentResultApp() {
	return (
		<PublicQueryProvider>
			<PublicPaymentResultContent />
		</PublicQueryProvider>
	);
}

type PaymentReturnHint = "success" | "cancel" | "unknown";

type PublicPaymentResultContext =
	| { kind: "loading" }
	| { kind: "invalid"; reason: string }
	| {
			kind: "waiting";
			hint: PaymentReturnHint;
			marker: PublicCheckoutReturn;
			reservation: StoredPublicReservation;
	  }
	| { kind: "confirmed"; confirmation: StoredPublicPaymentConfirmation };

function PublicPaymentResultContent() {
	const branchesQuery = usePublicBranchesQuery();
	const [context, setContext] = useState<PublicPaymentResultContext>({
		kind: "loading",
	});

	useEffect(() => {
		const resultHint = readPaymentReturnHint(window.location.search);
		const currentConfirmation = readCurrentPublicPaymentConfirmation();

		if (currentConfirmation.value) {
			const confirmation = readPublicPaymentConfirmation(
				currentConfirmation.value.restaurantSlug,
				currentConfirmation.value.branchSlug,
			).value;
			if (confirmation) {
				setContext({ kind: "confirmed", confirmation });
				return;
			}
		}

		const checkoutReturn = readPublicCheckoutReturn().value;
		if (!checkoutReturn) {
			setContext({
				kind: "invalid",
				reason:
					"No encontramos el contexto seguro necesario para consultar este pago.",
			});
			return;
		}

		const reservation = readPublicReservation(
			checkoutReturn.restaurantSlug,
			checkoutReturn.branchSlug,
		).value;
		if (
			!reservation ||
			!matchesPublicCheckoutReturnReservation(checkoutReturn, reservation)
		) {
			setContext({
				kind: "invalid",
				reason:
					"La reserva y el retorno de Stripe ya no coinciden. Conservamos tu carrito para que puedas revisarlo.",
			});
			return;
		}

		setContext({
			kind: "waiting",
			hint: resultHint,
			marker: checkoutReturn,
			reservation,
		});
	}, []);

	const branch = getContextBranch(context, branchesQuery.data);

	return (
		<main
			className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-8 sm:py-14"
			id="main-content"
		>
			{context.kind === "loading" ? <ResultLoadingState /> : null}

			{context.kind === "invalid" ? (
				<PublicPaymentResultState
					description={context.reason}
					onPrimaryAction={() => window.location.assign("/")}
					primaryActionLabel="Ir al inicio"
					secondaryActionLabel="Ir al menú"
					onSecondaryAction={() => window.location.assign("/menu")}
					title="No pudimos recuperar el pago"
					variant="destructive"
				/>
			) : null}

			{context.kind === "waiting" ? (
				<PublicPaymentWaiting message={getWaitingMessage(context.hint)} />
			) : null}

			{context.kind === "confirmed" ? (
				<PublicPaymentConfirmation
					branchName={branch?.name}
					confirmation={context.confirmation}
					onGoHome={() => window.location.assign("/")}
					onReturnToMenu={() =>
						window.location.assign(
							`/menu?branch=${encodeURIComponent(context.confirmation.branchSlug)}`,
						)
					}
				/>
			) : null}
		</main>
	);
}

function getContextBranch(
	context: PublicPaymentResultContext,
	branches: PublicBranch[] | undefined,
): PublicBranch | undefined {
	const branchSlug =
		context.kind === "waiting"
			? context.marker.branchSlug
			: context.kind === "confirmed"
				? context.confirmation.branchSlug
				: undefined;

	return branchSlug
		? branches?.find((branch) => branch.branchSlug === branchSlug)
		: undefined;
}

function readPaymentReturnHint(search: string): PaymentReturnHint {
	const result = new URLSearchParams(search).get("result");
	if (result === "success" || result === "cancel") return result;
	return "unknown";
}

function getWaitingMessage(hint: PaymentReturnHint): string {
	switch (hint) {
		case "success":
			return "Stripe terminó el flujo. Estamos esperando la confirmación asíncrona del backend.";
		case "cancel":
			return "Consultaremos el estado real del intento antes de ofrecerte otro pago.";
		default:
			return "Consultaremos el estado real de tu reserva antes de mostrar un resultado.";
	}
}

function ResultLoadingState() {
	return (
		<section aria-live="polite" className="rounded-2xl border bg-card p-6">
			<h1 className="font-heading text-2xl font-semibold tracking-[-0.04em]">
				Preparando el resultado del pago…
			</h1>
			<p className="mt-2 text-sm leading-6 text-muted-foreground">
				Estamos recuperando el contexto seguro de esta pestaña.
			</p>
			<Button className="mt-5" disabled type="button" variant="outline">
				Cargando
			</Button>
		</section>
	);
}
