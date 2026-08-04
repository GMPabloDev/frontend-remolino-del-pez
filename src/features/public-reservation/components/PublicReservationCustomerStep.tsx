import { zodResolver } from "@hookform/resolvers/zod";
import { type FieldErrors, useForm } from "react-hook-form";
import type { z } from "zod";

import { Button } from "@/components/ui/button";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	type ReservationCustomer,
	reservationCustomerSchema,
} from "../contracts/public-reservation.schemas";

interface PublicReservationCustomerStepProps {
	defaultValues?: Partial<CustomerFormInput>;
	disabled?: boolean;
	onSubmit(customer: ReservationCustomer): void | Promise<void>;
}

type CustomerFormInput = z.input<typeof reservationCustomerSchema>;

export function PublicReservationCustomerStep({
	defaultValues,
	disabled = false,
	onSubmit,
}: PublicReservationCustomerStepProps) {
	const {
		formState: { errors, isSubmitting },
		handleSubmit,
		register,
		setFocus,
	} = useForm<CustomerFormInput, unknown, ReservationCustomer>({
		defaultValues: {
			email: "",
			fullName: "",
			phone: "",
			...defaultValues,
		},
		mode: "onSubmit",
		resolver: zodResolver(reservationCustomerSchema),
		shouldFocusError: false,
	});
	const formDisabled = disabled || isSubmitting;

	function handleInvalidSubmit(formErrors: FieldErrors<CustomerFormInput>) {
		if (formErrors.fullName) {
			setFocus("fullName");
			return;
		}

		if (formErrors.email) {
			setFocus("email");
			return;
		}

		setFocus("phone");
	}

	return (
		<section aria-labelledby="reservation-customer-title">
			<div className="flex flex-col gap-2">
				<h2
					className="font-heading text-2xl font-semibold tracking-[-0.04em]"
					id="reservation-customer-title"
				>
					3. Tus datos
				</h2>
				<p className="text-sm leading-6 text-muted-foreground">
					Los necesitamos para preparar tu reserva. No se guardarán en el
					navegador.
				</p>
			</div>

			<form
				className="mt-6 flex flex-col gap-5"
				noValidate
				onSubmit={(event) => {
					void handleSubmit(onSubmit, handleInvalidSubmit)(event);
				}}
			>
				<FieldGroup>
					<Field data-invalid={Boolean(errors.fullName)}>
						<FieldLabel htmlFor="reservation-full-name">
							Nombre completo
						</FieldLabel>
						<Input
							aria-describedby={
								errors.fullName ? "reservation-full-name-error" : undefined
							}
							aria-invalid={Boolean(errors.fullName)}
							autoComplete="name"
							disabled={formDisabled}
							id="reservation-full-name"
							placeholder="Ana Torres"
							{...register("fullName")}
						/>
						<FieldError
							errors={errors.fullName ? [errors.fullName] : undefined}
							id="reservation-full-name-error"
						/>
					</Field>

					<Field data-invalid={Boolean(errors.email)}>
						<FieldLabel htmlFor="reservation-email">Email</FieldLabel>
						<Input
							aria-describedby={
								errors.email ? "reservation-email-error" : undefined
							}
							aria-invalid={Boolean(errors.email)}
							autoComplete="email"
							disabled={formDisabled}
							id="reservation-email"
							placeholder="ana@ejemplo.com"
							type="email"
							{...register("email")}
						/>
						<FieldError
							errors={errors.email ? [errors.email] : undefined}
							id="reservation-email-error"
						/>
					</Field>

					<Field data-invalid={Boolean(errors.phone)}>
						<FieldLabel htmlFor="reservation-phone">Teléfono</FieldLabel>
						<Input
							aria-describedby="reservation-phone-description reservation-phone-error"
							aria-invalid={Boolean(errors.phone)}
							autoComplete="tel"
							disabled={formDisabled}
							id="reservation-phone"
							inputMode="tel"
							placeholder="+51987654321"
							{...register("phone")}
						/>
						<p
							className="text-sm leading-normal text-muted-foreground"
							id="reservation-phone-description"
						>
							Usa el formato internacional, por ejemplo +51987654321. Puedes
							separar los dígitos con espacios o guiones.
						</p>
						<FieldError
							errors={errors.phone ? [errors.phone] : undefined}
							id="reservation-phone-error"
						/>
					</Field>
				</FieldGroup>

				<Button disabled={formDisabled} type="submit">
					{isSubmitting ? "Revisando…" : "Revisar reserva"}
				</Button>
			</form>
		</section>
	);
}
