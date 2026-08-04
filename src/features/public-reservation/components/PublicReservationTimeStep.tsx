import { Clock3 } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
	FieldLegend,
	FieldSet,
} from "@/components/ui/field";
import { reservationTimeSchema } from "../contracts/public-reservation.schemas";

interface PublicReservationTimeStepProps {
	availableTimes: string[];
	selectedTime: string;
	durationMinutes?: number;
	hasSearched: boolean;
	isLoading?: boolean;
	disabled?: boolean;
	error?: string;
	selectionError?: string;
	onSelect(time: string): void;
	onRetry?(): void;
	onChangeSearch?(): void;
}

export function PublicReservationTimeStep({
	availableTimes,
	selectedTime,
	durationMinutes,
	hasSearched,
	isLoading = false,
	disabled = false,
	error,
	selectionError,
	onSelect,
	onRetry,
	onChangeSearch,
}: PublicReservationTimeStepProps) {
	const validTimes = availableTimes.filter(
		(time) => reservationTimeSchema.safeParse(time).success,
	);

	return (
		<section aria-labelledby="reservation-time-title">
			<div className="flex flex-col gap-2">
				<h2
					className="font-heading text-2xl font-semibold tracking-[-0.04em]"
					id="reservation-time-title"
				>
					2. Elige un horario
				</h2>
				<p className="text-sm leading-6 text-muted-foreground">
					Los horarios se muestran según la disponibilidad actual de la
					sucursal.
				</p>
			</div>

			{disabled && !hasSearched ? (
				<Alert className="mt-6">
					<Clock3 aria-hidden="true" />
					<AlertTitle>Consulta primero la disponibilidad</AlertTitle>
					<AlertDescription>
						Completa la fecha y la cantidad de personas, y pulsa “Ver horarios”.
					</AlertDescription>
				</Alert>
			) : null}

			{isLoading ? (
				<p className="mt-6 text-sm text-muted-foreground" role="status">
					Consultando horarios disponibles…
				</p>
			) : null}

			{error && !isLoading ? (
				<Alert className="mt-6" variant="destructive">
					<AlertTitle>No pudimos cargar los horarios</AlertTitle>
					<AlertDescription className="flex flex-col gap-3">
						<span>{error}</span>
						{onRetry ? (
							<Button onClick={onRetry} size="sm" variant="outline">
								Intentar de nuevo
							</Button>
						) : null}
					</AlertDescription>
				</Alert>
			) : null}

			{hasSearched && !isLoading && !error && validTimes.length === 0 ? (
				<Empty className="mt-6 border">
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<Clock3 aria-hidden="true" />
						</EmptyMedia>
						<EmptyTitle>No hay horarios disponibles</EmptyTitle>
						<EmptyDescription>
							Prueba otra fecha o cambia la cantidad de personas para consultar
							nuevamente.
						</EmptyDescription>
					</EmptyHeader>
					{onChangeSearch ? (
						<Button onClick={onChangeSearch} variant="outline">
							Cambiar fecha o personas
						</Button>
					) : null}
				</Empty>
			) : null}

			{hasSearched && !isLoading && !error && validTimes.length > 0 ? (
				<FieldSet className="mt-6">
					<FieldLegend>Horarios disponibles</FieldLegend>
					<FieldDescription>
						{durationMinutes
							? `Cada reserva dura ${durationMinutes} minutos.`
							: "Elige un horario para continuar."}
					</FieldDescription>
					<div
						aria-describedby={
							selectionError ? "reservation-time-error" : undefined
						}
						aria-invalid={Boolean(selectionError)}
						className="grid grid-cols-2 gap-2 sm:grid-cols-3"
						role="radiogroup"
					>
						{validTimes.map((time) => {
							const inputId = `reservation-time-${time.replace(":", "-")}`;
							return (
								<Field
									data-invalid={Boolean(selectionError)}
									key={time}
									orientation="horizontal"
								>
									<input
										aria-label={`Reservar a las ${time}`}
										checked={selectedTime === time}
										disabled={disabled}
										id={inputId}
										name="reservation-time"
										onChange={() => onSelect(time)}
										type="radio"
										value={time}
									/>
									<FieldLabel
										className="cursor-pointer justify-center rounded-lg border px-3 py-2 text-center font-medium has-checked:border-primary has-checked:bg-primary/10"
										htmlFor={inputId}
									>
										{time}
									</FieldLabel>
								</Field>
							);
						})}
					</div>
					{selectionError ? (
						<FieldError id="reservation-time-error">
							{selectionError}
						</FieldError>
					) : null}
				</FieldSet>
			) : null}
		</section>
	);
}
