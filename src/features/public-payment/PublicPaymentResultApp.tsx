import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { usePublicBranchesQuery } from "../public-api/query/public-queries";
import { PublicQueryProvider } from "../public-api/query/public-query-client";
import { removePublicCart } from "../public-cart/lib/public-cart-storage";
import type { PublicBranch } from "../public-discovery/contracts/public-discovery.schemas";
import type { StoredPublicReservation } from "../public-reservation/contracts/public-reservation.schemas";
import {
	readPublicReservation,
	removePublicReservation,
} from "../public-reservation/lib/public-reservation-storage";
import { PublicPaymentConfirmation } from "./components/PublicPaymentConfirmation";
import { PublicPaymentResultState } from "./components/PublicPaymentResultState";
import { PublicPaymentWaiting } from "./components/PublicPaymentWaiting";
import type {
	PublicCheckoutReturn,
	PublicPaymentStatus,
	StoredPublicPaymentConfirmation,
} from "./contracts/public-payment.schemas";
import {
	currentPublicPaymentConfirmationSchema,
	PUBLIC_PAYMENT_VERSION,
	publicCheckoutReturnSchema,
	storedPublicPaymentConfirmationSchema,
} from "./contracts/public-payment.schemas";
import {
	isAllowedPublicCheckoutUrl,
	matchesPublicCheckoutReservation,
	matchesPublicCheckoutReturnReservation,
} from "./lib/public-payment-contracts";
import { getPublicPaymentErrorPresentation } from "./lib/public-payment-errors";
import type { PublicPaymentState } from "./lib/public-payment-state";
import { classifyPublicPaymentStatus } from "./lib/public-payment-state";
import {
	getPublicPaymentConfirmationKey,
	readCurrentPublicPaymentConfirmation,
	readPublicCheckoutReturn,
	readPublicPaymentConfirmation,
	removePublicCheckoutReturn,
	writeCurrentPublicPaymentConfirmation,
	writePublicCheckoutReturn,
	writePublicPaymentConfirmation,
} from "./lib/public-payment-storage";
import {
	useCreatePublicCheckoutMutation,
	usePublicPaymentStatusQuery,
} from "./query/public-payment-query";

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
	const [checkoutError, setCheckoutError] = useState<string | null>(null);
	const [confirmationStorageWarning, setConfirmationStorageWarning] =
		useState(false);
	const checkoutMutation = useCreatePublicCheckoutMutation();
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

	const completeConfirmation = useCallback(
		(nextStatus: PublicPaymentStatus) => {
			if (context.kind !== "waiting" || nextStatus.confirmedAt === null) {
				return;
			}

			const savedAt = new Date().toISOString();
			const confirmationResult =
				storedPublicPaymentConfirmationSchema.safeParse({
					...context.reservation,
					version: PUBLIC_PAYMENT_VERSION,
					status: "confirmed",
					confirmedAt: nextStatus.confirmedAt,
					savedAt,
				});

			const clearPendingContext = () => {
				removePublicReservation(
					context.reservation.restaurantSlug,
					context.reservation.branchSlug,
				);
				removePublicCheckoutReturn();
				removePublicCart(
					context.reservation.restaurantSlug,
					context.reservation.branchSlug,
				);
			};

			if (!confirmationResult.success) {
				clearPendingContext();
				setConfirmationStorageWarning(true);
				setContext({
					kind: "invalid",
					reason:
						"El pago fue confirmado, pero no pudimos preparar su resumen local. Conservamos el resultado solo durante esta vista.",
				});
				return;
			}

			const currentConfirmationResult =
				currentPublicPaymentConfirmationSchema.safeParse({
					version: PUBLIC_PAYMENT_VERSION,
					restaurantSlug: confirmationResult.data.restaurantSlug,
					branchSlug: confirmationResult.data.branchSlug,
					reservationId: confirmationResult.data.id,
					confirmationKey: getPublicPaymentConfirmationKey(
						confirmationResult.data.restaurantSlug,
						confirmationResult.data.branchSlug,
					),
					savedAt,
				});

			const confirmationWrite = writePublicPaymentConfirmation(
				confirmationResult.data,
			);
			const currentWrite = currentConfirmationResult.success
				? writeCurrentPublicPaymentConfirmation(currentConfirmationResult.data)
				: null;
			const persisted =
				confirmationWrite.persistence === "persistent" &&
				currentWrite?.persistence === "persistent";

			clearPendingContext();
			setConfirmationStorageWarning(!persisted);
			setPaymentState({
				kind: "confirmed",
				canRetryCheckout: false,
				shouldContinuePolling: false,
			});
			setPollingError(null);
			setContext({
				kind: "confirmed",
				confirmation: confirmationResult.data,
			});
		},
		[context],
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
		const pendingReservation = context.reservation;

		let disposed = false;
		let timeoutId: ReturnType<typeof setTimeout> | null = null;
		let retryDelay = 2_000;

		setPaymentState(null);
		setPollingError(null);
		setCheckoutError(null);

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
			if (presentation.code === "PUBLIC_PAYMENT_NOT_FOUND") {
				removePublicReservation(
					pendingReservation.restaurantSlug,
					pendingReservation.branchSlug,
				);
				removePublicCheckoutReturn();
				setContext({
					kind: "invalid",
					reason:
						"No encontramos una reserva accesible para este pago. Conservamos tu carrito para que puedas iniciar otra reserva.",
				});
				return;
			}

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

				if (nextState.kind === "reservation_expired") {
					removePublicReservation(
						pendingReservation.restaurantSlug,
						pendingReservation.branchSlug,
					);
					removePublicCheckoutReturn();
				}

				if (nextState.kind === "confirmed") {
					completeConfirmation(result.data);
					return;
				}

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
	}, [completeConfirmation, context, paymentStatusQuery.refetch]);

	function retryCheckout() {
		if (context.kind !== "waiting") return;

		const pendingReservation = context.reservation;
		if (Date.parse(pendingReservation.expiresAt) <= Date.now()) {
			removePublicReservation(
				pendingReservation.restaurantSlug,
				pendingReservation.branchSlug,
			);
			removePublicCheckoutReturn();
			setContext({
				kind: "invalid",
				reason:
					"La reserva venció. Conservamos tu carrito para que puedas iniciar otra reserva.",
			});
			return;
		}

		setCheckoutError(null);
		setPollingError(null);
		setPaymentState(null);
		checkoutMutation.mutate(
			{
				restaurantSlug: pendingReservation.restaurantSlug,
				branchSlug: pendingReservation.branchSlug,
				reservationId: pendingReservation.id,
				checkoutToken: pendingReservation.checkoutToken,
			},
			{
				onError: (error) => {
					const presentation = getPublicPaymentErrorPresentation(error);
					if (presentation.code === "RESERVATION_ALREADY_CONFIRMED") {
						setContext((current) =>
							current.kind === "waiting" ? { ...current } : current,
						);
						return;
					}
					if (
						presentation.code === "PUBLIC_PAYMENT_NOT_FOUND" ||
						presentation.code === "RESERVATION_EXPIRED"
					) {
						removePublicReservation(
							pendingReservation.restaurantSlug,
							pendingReservation.branchSlug,
						);
						removePublicCheckoutReturn();
						setContext({
							kind: "invalid",
							reason:
								presentation.code === "RESERVATION_EXPIRED"
									? "La reserva venció. Conservamos tu carrito para que puedas iniciar otra reserva."
									: "No encontramos una reserva accesible para este pago. Conservamos tu carrito para que puedas iniciar otra reserva.",
						});
						return;
					}
					setCheckoutError(presentation.message);
				},
				onSuccess: (checkout) => {
					if (!matchesPublicCheckoutReservation(checkout, pendingReservation)) {
						setCheckoutError(
							"La sesión de pago no coincide con tu reserva. No realizamos la redirección.",
						);
						return;
					}
					if (!isAllowedPublicCheckoutUrl(checkout.checkoutUrl)) {
						setCheckoutError(
							"El proveedor devolvió una dirección de pago no segura. No realizamos la redirección.",
						);
						return;
					}

					const markerResult = publicCheckoutReturnSchema.safeParse({
						version: PUBLIC_PAYMENT_VERSION,
						restaurantSlug: pendingReservation.restaurantSlug,
						branchSlug: pendingReservation.branchSlug,
						reservationId: pendingReservation.id,
						paymentAttemptId: checkout.paymentAttemptId,
						initiatedAt: new Date().toISOString(),
						reservationExpiresAt: pendingReservation.expiresAt,
					});
					if (!markerResult.success) {
						setCheckoutError(
							"No pudimos preparar el retorno seguro del pago. Conservamos tu reserva.",
						);
						return;
					}

					const writeResult = writePublicCheckoutReturn(markerResult.data);
					if (writeResult.persistence !== "persistent") {
						setCheckoutError(
							"No pudimos conservar el contexto para volver desde Stripe. Conservamos tu reserva; inténtalo nuevamente.",
						);
						return;
					}
					window.location.assign(checkout.checkoutUrl);
				},
			},
		);
	}

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

			{context.kind === "waiting" && checkoutError ? (
				<PublicPaymentResultState
					description={checkoutError}
					onPrimaryAction={retryCheckout}
					primaryActionLabel="Intentar pago nuevamente"
					secondaryActionLabel="Volver al menú"
					onSecondaryAction={() =>
						window.location.assign(getBranchMenuHref(context.marker.branchSlug))
					}
					title="No pudimos iniciar el nuevo intento"
					variant="destructive"
				/>
			) : null}

			{context.kind === "waiting" &&
			!checkoutError &&
			paymentState?.kind === "retryable_attempt" ? (
				<PublicPaymentResultState
					description="El intento de pago terminó, pero la reserva puede seguir vigente. Puedes volver a intentarlo sin crear otra reserva."
					onPrimaryAction={retryCheckout}
					primaryActionLabel="Intentar pago nuevamente"
					secondaryActionLabel="Volver al menú"
					onSecondaryAction={() =>
						window.location.assign(getBranchMenuHref(context.marker.branchSlug))
					}
					title="El intento de pago terminó"
				/>
			) : null}

			{context.kind === "waiting" &&
			!checkoutError &&
			paymentState?.kind === "reservation_expired" ? (
				<PublicPaymentResultState
					description="La reserva venció. Conservamos tu carrito para que puedas iniciar otra reserva."
					onPrimaryAction={() =>
						window.location.assign(getBranchMenuHref(context.marker.branchSlug))
					}
					primaryActionLabel="Volver al menú"
					secondaryActionLabel="Ir al inicio"
					onSecondaryAction={() => window.location.assign("/")}
					title="La reserva venció"
					variant="destructive"
				/>
			) : null}

			{context.kind === "waiting" &&
			!checkoutError &&
			paymentState?.kind === "refund" ? (
				<PublicPaymentResultState
					description={getBranchContactMessage(branch)}
					onPrimaryAction={() =>
						window.location.assign(getBranchMenuHref(context.marker.branchSlug))
					}
					primaryActionLabel="Volver al menú"
					secondaryActionLabel="Ir al inicio"
					onSecondaryAction={() => window.location.assign("/")}
					title="El pago requiere atención"
				/>
			) : null}

			{context.kind === "waiting" &&
			!checkoutError &&
			paymentState?.kind === "inconsistent" ? (
				<PublicPaymentResultState
					description="Recibimos un estado que no podemos validar de forma segura. No iniciaremos otro cobro automáticamente."
					onPrimaryAction={() =>
						setContext((current) =>
							current.kind === "waiting" ? { ...current } : current,
						)
					}
					primaryActionLabel="Consultar nuevamente"
					secondaryActionLabel="Volver al menú"
					onSecondaryAction={() =>
						window.location.assign(getBranchMenuHref(context.marker.branchSlug))
					}
					title="No pudimos validar el pago"
					variant="destructive"
				/>
			) : null}

			{context.kind === "waiting" &&
			!checkoutError &&
			(paymentState === null ||
				paymentState.kind === "waiting_confirmation") ? (
				<PublicPaymentWaiting
					isRetrying={
						paymentStatusQuery.isFetching || checkoutMutation.isPending
					}
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
					storageWarning={confirmationStorageWarning}
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

function getBranchMenuHref(branchSlug: string): string {
	return `/menu?branch=${encodeURIComponent(branchSlug)}`;
}

function getBranchContactMessage(branch: PublicBranch | undefined): string {
	if (!branch) {
		return "El pago requiere revisión manual. Contacta a la sucursal para recibir asistencia.";
	}

	const contact = branch.email
		? `${branch.phone} o ${branch.email}`
		: branch.phone;
	return `El pago requiere revisión manual. Contacta a ${branch.name} en ${contact}. No iniciaremos otro cobro.`;
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
