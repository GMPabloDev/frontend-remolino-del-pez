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
		<section
			aria-labelledby="reservation-customer-title"
			className={`border-t border-[#12324a]/10 px-5 py-7 sm:px-8 sm:py-9 ${disabled ? "bg-[#f4f0e8]/35" : "bg-white"}`}
		>
			<div className="max-w-2xl">
				<h2
					className="font-heading text-3xl font-semibold tracking-[-0.04em] text-[#12324a]"
					id="reservation-customer-title"
				>
					Tus datos
				</h2>
				<p className="mt-2 text-sm leading-6 text-[#587080] sm:text-base">
					Los usaremos para identificar tu reserva. No se guardarán en este
					navegador.
				</p>
			</div>

			{disabled ? (
				<p className="mt-5 rounded-2xl border border-[#12324a]/10 bg-white/70 px-4 py-3 text-sm leading-6 text-[#587080]">
					Elige un horario disponible para completar tus datos.
				</p>
			) : null}

			<form
				className="mt-7 flex flex-col gap-6"
				noValidate
				onSubmit={(event) => {
					void handleSubmit(onSubmit, handleInvalidSubmit)(event);
				}}
			>
				<FieldGroup className="grid gap-5 sm:grid-cols-2 sm:gap-6">
					<Field data-invalid={Boolean(errors.fullName)}>
						<FieldLabel htmlFor="reservation-full-name">
							Nombre completo
						</FieldLabel>
						<Input
							aria-describedby={
								errors.fullName ? "reservation-full-name-error" : undefined
							}
							className="h-12 rounded-xl border-[#12324a]/20 bg-[#f4f0e8]/35 px-4 text-base focus-visible:bg-white"
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
							className="h-12 rounded-xl border-[#12324a]/20 bg-[#f4f0e8]/35 px-4 text-base focus-visible:bg-white"
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

					<Field className="sm:col-span-2" data-invalid={Boolean(errors.phone)}>
						<FieldLabel htmlFor="reservation-phone">Teléfono</FieldLabel>
						<Input
							aria-describedby="reservation-phone-description reservation-phone-error"
							className="h-12 rounded-xl border-[#12324a]/20 bg-[#f4f0e8]/35 px-4 text-base focus-visible:bg-white"
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

				<Button
					className="min-h-12 w-full rounded-full bg-[#12324a] px-6 text-base hover:bg-[#1d4b68] sm:w-fit"
					disabled={formDisabled}
					type="submit"
				>
					{isSubmitting ? "Revisando…" : "Revisar reserva"}
				</Button>
			</form>
		</section>
	);
}
