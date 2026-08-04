import { CalendarDays } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from "@/components/ui/field";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { isValidCalendarDate } from "../contracts/public-reservation.schemas";
import {
	calendarDateToReservationDate,
	formatReservationDateLabel,
	reservationDateToCalendarDate,
} from "../lib/public-reservation-date";

interface PublicReservationDatePickerProps {
	id?: string;
	label?: string;
	value: string;
	minDate: Date;
	maxDate: Date;
	description?: string;
	error?: string;
	disabled?: boolean;
	onChange(value: string): void;
}

export function PublicReservationDatePicker({
	id = "reservation-date",
	label = "Fecha",
	value,
	minDate,
	maxDate,
	description = "Selecciona una fecha dentro del periodo permitido.",
	error,
	disabled = false,
	onChange,
}: PublicReservationDatePickerProps) {
	const [open, setOpen] = useState(false);
	const selectedDate = isValidCalendarDate(value)
		? reservationDateToCalendarDate(value)
		: undefined;
	const describedBy = [
		description ? `${id}-description` : null,
		error ? `${id}-error` : null,
	]
		.filter(Boolean)
		.join(" ");

	return (
		<Field data-invalid={Boolean(error)}>
			<FieldLabel htmlFor={id}>{label}</FieldLabel>
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger
					render={
						<Button
							aria-describedby={describedBy || undefined}
							aria-expanded={open}
							aria-invalid={Boolean(error)}
							aria-haspopup="dialog"
							className="w-full justify-between"
							disabled={disabled}
							id={id}
							variant="outline"
						/>
					}
				>
					<CalendarDays data-icon="inline-start" />
					<span className={selectedDate ? "" : "text-muted-foreground"}>
						{selectedDate
							? formatReservationDateLabel(selectedDate)
							: "Selecciona una fecha"}
					</span>
				</PopoverTrigger>
				<PopoverContent align="start" className="w-auto p-0">
					<Calendar
						captionLayout="dropdown"
						defaultMonth={selectedDate ?? minDate}
						disabled={[{ before: minDate }, { after: maxDate }]}
						mode="single"
						onSelect={(date) => {
							if (!date) return;

							onChange(calendarDateToReservationDate(date));
							setOpen(false);
						}}
						selected={selectedDate}
					/>
				</PopoverContent>
			</Popover>
			{description ? (
				<FieldDescription id={`${id}-description`}>
					{description}
				</FieldDescription>
			) : null}
			{error ? <FieldError id={`${id}-error`}>{error}</FieldError> : null}
		</Field>
	);
}
