import { Search } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PublicReservationDatePicker } from "./PublicReservationDatePicker";

interface PublicReservationAvailabilityStepProps {
	date: string;
	partySize: number | "";
	minDate: Date;
	maxDate: Date;
	maxPartySize: number;
	dateError?: string;
	partySizeError?: string;
	remoteError?: string;
	isLoading?: boolean;
	disabled?: boolean;
	onDateChange(value: string): void;
	onPartySizeChange(value: number | ""): void;
	onSearch(): void;
	onRetry?(): void;
}

export function PublicReservationAvailabilityStep({
	date,
	partySize,
	minDate,
	maxDate,
	maxPartySize,
	dateError,
	partySizeError,
	remoteError,
	isLoading = false,
	disabled = false,
	onDateChange,
	onPartySizeChange,
	onSearch,
	onRetry,
}: PublicReservationAvailabilityStepProps) {
	const canSearch =
		!disabled &&
		!isLoading &&
		date.length > 0 &&
		typeof partySize === "number" &&
		partySize >= 1 &&
		partySize <= maxPartySize;

	return (
		<section aria-labelledby="reservation-availability-title">
			<div className="flex flex-col gap-2">
				<h2
					className="font-heading text-2xl font-semibold tracking-[-0.04em]"
					id="reservation-availability-title"
				>
					1. Fecha y personas
				</h2>
				<p className="text-sm leading-6 text-muted-foreground">
					Indica cuándo nos visitarás y cuántas personas asistirán.
				</p>
			</div>

			<FieldGroup className="mt-6">
				<PublicReservationDatePicker
					disabled={disabled}
					error={dateError}
					maxDate={maxDate}
					minDate={minDate}
					onChange={onDateChange}
					value={date}
				/>

				<Field data-invalid={Boolean(partySizeError)}>
					<FieldLabel htmlFor="reservation-party-size">
						Cantidad de personas
					</FieldLabel>
					<Input
						aria-describedby="reservation-party-size-description reservation-party-size-error"
						aria-invalid={Boolean(partySizeError)}
						disabled={disabled}
						id="reservation-party-size"
						inputMode="numeric"
						max={maxPartySize}
						min={1}
						onChange={(event) => {
							const value = event.currentTarget.value;
							onPartySizeChange(value === "" ? "" : Number(value));
						}}
						step={1}
						type="number"
						value={partySize}
					/>
					<FieldDescription id="reservation-party-size-description">
						Puedes reservar para entre 1 y {maxPartySize} personas.
					</FieldDescription>
					{partySizeError ? (
						<FieldError id="reservation-party-size-error">
							{partySizeError}
						</FieldError>
					) : null}
				</Field>

				<Button
					className="w-full sm:w-fit"
					disabled={!canSearch}
					onClick={onSearch}
					type="button"
				>
					<Search data-icon="inline-start" />
					{isLoading ? "Consultando horarios…" : "Ver horarios"}
				</Button>
			</FieldGroup>

			{remoteError ? (
				<Alert className="mt-6" variant="destructive">
					<AlertTitle>No pudimos consultar la disponibilidad</AlertTitle>
					<AlertDescription className="flex flex-col gap-3">
						<span>{remoteError}</span>
						{onRetry ? (
							<Button onClick={onRetry} size="sm" variant="outline">
								Intentar de nuevo
							</Button>
						) : null}
					</AlertDescription>
				</Alert>
			) : null}
		</section>
	);
}
