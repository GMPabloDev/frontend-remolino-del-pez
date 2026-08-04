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
import { getPublicPaymentErrorPresentation } from "./lib/public-payment-errors";
import type { PublicPaymentState } from "./lib/public-payment-state";
import { classifyPublicPaymentStatus } from "./lib/public-payment-state";
import {
	readCurrentPublicPaymentConfirmation,
	readPublicCheckoutReturn,
	readPublicPaymentConfirmation,
} from "./lib/public-payment-storage";
import { usePublicPaymentStatusQuery } from "./query/public-payment-query";

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
	const [paymentState, setPaymentState] = useState<PublicPaymentState | null>(
		null,
	);
	const [pollingError, setPollingError] = useState<string | null>(null);
	const paymentStatusQueryInput =
		context.kind === "waiting"
			? {
					restaurantSlug: context.marker.restaurantSlug,
					branchSlug: context.marker.branchSlug,
					reservationId: context.marker.reservationId,
					checkoutToken: context.reservation.checkoutToken,
				}
			: null;
	const paymentStatusQuery = usePublicPaymentStatusQuery(
		paymentStatusQueryInput,
		false,
	);

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

	useEffect(() => {
		if (context.kind !== "waiting") return;
		const resultHint = context.hint;

		let disposed = false;
		let timeoutId: ReturnType<typeof setTimeout> | null = null;
		let retryDelay = 2_000;

		setPaymentState(null);
		setPollingError(null);

		function clearScheduledRequest() {
			if (timeoutId === null) return;
			clearTimeout(timeoutId);
			timeoutId = null;
		}

		function scheduleRequest(delay: number) {
			clearScheduledRequest();
			timeoutId = setTimeout(() => {
				timeoutId = null;
				void requestStatus();
			}, delay);
		}

		function handleRequestError(error: unknown) {
			const presentation = getPublicPaymentErrorPresentation(error);
			setPollingError(presentation.message);

			if (
				resultHint === "success" &&
				presentation.code !== "INVALID_API_RESPONSE"
			) {
				const nextDelay = retryDelay;
				retryDelay = Math.min(retryDelay * 2, 10_000);
				scheduleRequest(nextDelay);
			}
		}

		async function requestStatus() {
			if (disposed || document.visibilityState !== "visible") return;

			try {
				const result = await paymentStatusQuery.refetch();
				if (disposed) return;

				if (result.error || !result.data) {
					handleRequestError(
						result.error ?? new Error("Missing payment status response."),
					);
					return;
				}

				setPollingError(null);
				const nextState = classifyPublicPaymentStatus(result.data);
				setPaymentState(nextState);

				if (resultHint === "success" && nextState.shouldContinuePolling) {
					retryDelay = 2_000;
					scheduleRequest(2_000);
				}
			} catch (error) {
				if (!disposed) handleRequestError(error);
			}
		}

		function handleVisibilityChange() {
			if (document.visibilityState === "hidden") {
				clearScheduledRequest();
				return;
			}

			void requestStatus();
		}

		document.addEventListener("visibilitychange", handleVisibilityChange);
		if (document.visibilityState === "visible") {
			void requestStatus();
		}

		return () => {
			disposed = true;
			clearScheduledRequest();
			document.removeEventListener("visibilitychange", handleVisibilityChange);
		};
	}, [context, paymentStatusQuery.refetch]);

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
				<PublicPaymentWaiting
					isRetrying={paymentStatusQuery.isFetching}
					message={getWaitingMessage(context.hint, paymentState, pollingError)}
					onRetry={
						pollingError || context.hint !== "success"
							? () => {
									setPollingError(null);
									setContext((current) =>
										current.kind === "waiting" ? { ...current } : current,
									);
								}
							: undefined
					}
				/>
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

function getWaitingMessage(
	hint: PaymentReturnHint,
	paymentState: PublicPaymentState | null,
	pollingError: string | null,
): string {
	if (pollingError) {
		return `${pollingError} Puedes consultar el estado nuevamente de forma manual.`;
	}

	if (paymentState) {
		switch (paymentState.kind) {
			case "confirmed":
				return "El backend confirmó la reserva. Estamos preparando el resumen final.";
			case "reservation_expired":
				return "La reserva venció antes de completar la confirmación.";
			case "retryable_attempt":
				return "Este intento terminó. Podrás intentar el pago nuevamente si la reserva sigue vigente.";
			case "refund":
				return "El pago está en un proceso de reembolso. No iniciaremos otro cobro.";
			case "inconsistent":
				return "Recibimos un estado que no podemos validar de forma segura.";
			case "waiting_confirmation":
				if (paymentState.reason === "paid_before_confirmation") {
					return "Stripe reportó el pago. Estamos esperando que el webhook confirme la reserva.";
				}
				if (paymentState.reason === "pending") {
					return "El intento sigue pendiente. Esperamos la actualización segura del backend.";
				}
				break;
		}
	}

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
