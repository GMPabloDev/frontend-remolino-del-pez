import { useEffect, useMemo, useRef, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { runtimeConfig } from "../../../config/runtime";
import type { PublicCartItem } from "../../public-cart/contracts/public-cart.schemas";
import {
	availabilityRequestSchema,
	createTemporaryReservationRequestSchema,
	type ReservationAttempt,
	type ReservationCustomer,
	type TemporaryReservationResponse,
} from "../contracts/public-reservation.schemas";
import { getPublicReservationErrorPresentation } from "../lib/public-reservation-errors";
import { getReservationAttemptForPayload } from "../lib/public-reservation-idempotency";
import {
	useCreatePublicTemporaryReservationMutation,
	usePublicAvailabilityQuery,
} from "../query/public-reservation-query";
import { PublicReservationAvailabilityStep } from "./PublicReservationAvailabilityStep";
import { PublicReservationCustomerStep } from "./PublicReservationCustomerStep";
import { PublicReservationReview } from "./PublicReservationReview";
import { PublicReservationTimeStep } from "./PublicReservationTimeStep";

interface PublicReservationFlowProps {
	branchName: string;
	branchSlug: string;
	initialDate: string;
	minDate: Date;
	maxDate: Date;
	maxPartySize: number;
	items: ReadonlyArray<PublicCartItem>;
	onReservationCreated(reservation: TemporaryReservationResponse): void;
}

export function PublicReservationFlow({
	branchName,
	branchSlug,
	initialDate,
	minDate,
	maxDate,
	maxPartySize,
	items,
	onReservationCreated,
}: PublicReservationFlowProps) {
	const [date, setDate] = useState(initialDate);
	const [partySize, setPartySize] = useState<number | "">("");
	const [availabilityRequest, setAvailabilityRequest] = useState<{
		branchSlug: string;
		date: string;
		partySize: number;
	} | null>(null);
	const [selectedTime, setSelectedTime] = useState("");
	const [customer, setCustomer] = useState<ReservationCustomer | null>(null);
	const [attempt, setAttempt] = useState<ReservationAttempt | null>(null);
	const [localError, setLocalError] = useState<string | null>(null);
	const errorReference = useRef<HTMLDivElement>(null);
	const availabilityQuery = usePublicAvailabilityQuery(
		availabilityRequest
			? {
					restaurantSlug: runtimeConfig.restaurantSlug,
					...availabilityRequest,
				}
			: null,
	);
	const reservationMutation = useCreatePublicTemporaryReservationMutation();
	const availabilityError = useMemo(
		() =>
			availabilityQuery.error
				? getPublicReservationErrorPresentation(availabilityQuery.error)
				: null,
		[availabilityQuery.error],
	);
	const mutationError = useMemo(
		() =>
			reservationMutation.error
				? getPublicReservationErrorPresentation(reservationMutation.error)
				: null,
		[reservationMutation.error],
	);
	const flowError = useMemo(
		() =>
			localError
				? {
						code: "VALIDATION_ERROR" as const,
						title: "Revisa la información",
						message: localError,
						action: "review" as const,
						retryable: false,
					}
				: mutationError,
		[localError, mutationError],
	);
	const availabilityData = availabilityQuery.data;
	const customerReady = Boolean(selectedTime && customer);

	useEffect(() => {
		if (flowError) {
			errorReference.current?.focus();
		}
	}, [flowError]);

	function handleDateChange(nextDate: string) {
		setDate(nextDate);
		setSelectedTime("");
		setAvailabilityRequest(null);
		setLocalError(null);
		reservationMutation.reset();
	}

	function handlePartySizeChange(nextPartySize: number | "") {
		setPartySize(nextPartySize);
		setSelectedTime("");
		setAvailabilityRequest(null);
		setLocalError(null);
		reservationMutation.reset();
	}

	function handleAvailabilitySearch() {
		const parsedRequest = availabilityRequestSchema.safeParse({
			date,
			partySize,
		});

		if (!parsedRequest.success || parsedRequest.data.partySize > maxPartySize) {
			setLocalError(
				`La cantidad de personas debe estar entre 1 y ${maxPartySize}.`,
			);
			return;
		}

		setLocalError(null);
		setSelectedTime("");
		reservationMutation.reset();
		setAvailabilityRequest({
			branchSlug,
			date: parsedRequest.data.date,
			partySize: parsedRequest.data.partySize,
		});
	}

	function handleCustomerSubmit(nextCustomer: ReservationCustomer) {
		setCustomer(nextCustomer);
		setLocalError(null);
		reservationMutation.reset();
	}

	function handleTimeSelect(time: string) {
		setSelectedTime(time);
		setLocalError(null);
		reservationMutation.reset();
	}

	function handleReservationSubmit() {
		if (!customer || !selectedTime || !availabilityData || partySize === "") {
			setLocalError(
				"Completa la fecha, el horario y tus datos antes de continuar.",
			);
			return;
		}

		const parsedPayload = createTemporaryReservationRequestSchema.safeParse({
			date,
			time: selectedTime,
			partySize,
			customer,
			items: items.map((item) => ({
				dishId: item.dishId,
				quantity: item.quantity,
			})),
		});

		if (!parsedPayload.success) {
			setLocalError(
				"No pudimos validar los platos seleccionados. Regresa al menú y revisa tu selección.",
			);
			return;
		}

		const nextAttempt = getReservationAttemptForPayload(
			parsedPayload.data,
			attempt ?? undefined,
		);
		setAttempt(nextAttempt);
		setLocalError(null);
		reservationMutation.mutate(
			{
				restaurantSlug: runtimeConfig.restaurantSlug,
				branchSlug,
				idempotencyKey: nextAttempt.idempotencyKey,
				payload: nextAttempt.payload,
			},
			{
				onSuccess: handleReservationCreated,
			},
		);
	}

	function handleReservationCreated(reservation: TemporaryReservationResponse) {
		setAttempt(null);
		onReservationCreated(reservation);
	}

	const availabilityRemoteMessage = availabilityError?.message;
	const hasSearched = availabilityRequest !== null;
	const selectedTimeIsAvailable = Boolean(
		availabilityData?.availableTimes.includes(selectedTime),
	);
	const reviewItems = useMemo(() => [...items], [items]);

	return (
		<div className="flex flex-col gap-10">
			{flowError ? (
				<Alert
					className="scroll-mt-6"
					ref={errorReference}
					tabIndex={-1}
					variant="destructive"
				>
					<AlertTitle>{flowError.title}</AlertTitle>
					<AlertDescription className="flex flex-col gap-3">
						<span>{flowError.message}</span>
						{flowError.retryable ? (
							<Button
								onClick={() => reservationMutation.reset()}
								size="sm"
								variant="outline"
							>
								Revisar y volver a intentar
							</Button>
						) : null}
					</AlertDescription>
				</Alert>
			) : null}

			<PublicReservationAvailabilityStep
				date={date}
				dateError={localError && !availabilityRequest ? localError : undefined}
				disabled={reservationMutation.isPending}
				isLoading={availabilityQuery.isPending}
				maxDate={maxDate}
				maxPartySize={maxPartySize}
				minDate={minDate}
				onDateChange={handleDateChange}
				onPartySizeChange={handlePartySizeChange}
				onRetry={() => void availabilityQuery.refetch()}
				onSearch={handleAvailabilitySearch}
				partySize={partySize}
				partySizeError={
					localError && !availabilityRequest ? localError : undefined
				}
				remoteError={availabilityRemoteMessage}
			/>

			<PublicReservationTimeStep
				availableTimes={availabilityData?.availableTimes ?? []}
				disabled={!hasSearched || reservationMutation.isPending}
				durationMinutes={availabilityData?.durationMinutes}
				error={availabilityRemoteMessage}
				hasSearched={hasSearched}
				isLoading={availabilityQuery.isPending}
				onChangeSearch={() => {
					setAvailabilityRequest(null);
					setSelectedTime("");
					reservationMutation.reset();
				}}
				onRetry={() => void availabilityQuery.refetch()}
				onSelect={handleTimeSelect}
				selectedTime={selectedTime}
				selectionError={
					selectedTime && !selectedTimeIsAvailable
						? "Selecciona un horario disponible."
						: undefined
				}
			/>

			<PublicReservationCustomerStep
				disabled={!selectedTimeIsAvailable || reservationMutation.isPending}
				onSubmit={handleCustomerSubmit}
			/>

			{customerReady ? (
				<PublicReservationReview
					branchName={branchName}
					date={date}
					items={reviewItems}
					onConfirm={handleReservationSubmit}
					partySize={partySize as number}
					time={selectedTime}
				/>
			) : null}
		</div>
	);
}

export type { PublicReservationFlowProps };
