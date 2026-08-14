import { Check, Clock3 } from "lucide-react";

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
		<section
			aria-labelledby="reservation-time-title"
			className={`border-t border-[#12324a]/10 px-5 py-7 sm:px-8 sm:py-9 ${disabled && !hasSearched ? "bg-[#f4f0e8]/35" : "bg-white"}`}
		>
			<div className="max-w-2xl">
				<h2
					className="font-heading text-3xl font-semibold tracking-[-0.04em] text-[#12324a]"
					id="reservation-time-title"
				>
					Elige un horario
				</h2>
				<p className="mt-2 text-sm leading-6 text-[#587080] sm:text-base">
					Te mostramos únicamente los turnos disponibles para los datos que
					elegiste.
				</p>
			</div>

			{disabled && !hasSearched ? (
				<Alert className="mt-6 rounded-2xl border-[#12324a]/10 bg-white/70">
					<Clock3 aria-hidden="true" />
					<AlertTitle>Consulta primero la disponibilidad</AlertTitle>
					<AlertDescription>
						Completa la fecha y la cantidad de personas, y pulsa “Ver horarios”.
					</AlertDescription>
				</Alert>
			) : null}

			{isLoading ? (
				<p
					className="mt-6 flex min-h-20 items-center justify-center rounded-2xl bg-[#dcecef]/70 text-sm font-medium text-[#12324a]"
					role="status"
				>
					<Clock3 aria-hidden="true" className="mr-2 size-4 animate-pulse" />
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
				<Empty className="mt-6 rounded-2xl border border-[#12324a]/10 bg-[#f4f0e8]/40 py-8">
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
				<FieldSet className="mt-7">
					<FieldLegend className="font-semibold text-[#12324a]">
						Horarios disponibles
					</FieldLegend>
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
						className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4"
						role="radiogroup"
					>
						{validTimes.map((time) => {
							const inputId = `reservation-time-${time.replace(":", "-")}`;
							const isSelected = selectedTime === time;
							return (
								<Field
									data-invalid={Boolean(selectionError)}
									key={time}
									orientation="horizontal"
								>
									<input
										aria-label={`Reservar a las ${time}`}
										checked={selectedTime === time}
										className="peer sr-only"
										disabled={disabled}
										id={inputId}
										name="reservation-time"
										onChange={() => onSelect(time)}
										type="radio"
										value={time}
									/>
									<FieldLabel
										className={`min-h-12 cursor-pointer justify-center gap-2 rounded-xl border px-3 py-2 text-center text-base font-semibold text-[#12324a] transition-[border-color,background-color,box-shadow] peer-focus-visible:border-[#e76832] peer-focus-visible:ring-4 peer-focus-visible:ring-[#e76832]/25 ${isSelected ? "border-[#e76832] bg-[#fff0e6] shadow-[0_10px_24px_rgba(231,104,50,0.12)]" : "border-[#12324a]/15 bg-white shadow-[0_8px_24px_rgba(18,50,74,0.05)] hover:border-[#e76832] hover:bg-[#fff7f1]"}`}
										data-selected={isSelected}
										htmlFor={inputId}
									>
										{isSelected ? (
											<Check
												aria-hidden="true"
												className="size-4 text-[#e76832]"
											/>
										) : null}
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
