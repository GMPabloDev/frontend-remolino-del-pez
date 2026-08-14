import { zodResolver } from "@hookform/resolvers/zod";
import { type FieldErrors, useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	type ReservationBillingDocument,
	type ReservationCustomer,
	reservationBillingDocumentSchema,
	reservationCustomerSchema,
} from "../contracts/public-reservation.schemas";

const reservationDetailsFormSchema = z
	.object({
		...reservationCustomerSchema.shape,
		billingType: z.enum(["BOLETA", "FACTURA"]),
		documentNumber: z.string(),
		ruc: z.string(),
		businessName: z.string(),
		fiscalAddress: z.string(),
	})
	.strict()
	.superRefine((values, context) => {
		const billingDocument =
			values.billingType === "BOLETA"
				? {
						type: values.billingType,
						documentNumber: values.documentNumber,
					}
				: {
						type: values.billingType,
						ruc: values.ruc,
						businessName: values.businessName,
						fiscalAddress: values.fiscalAddress,
					};
		const result = reservationBillingDocumentSchema.safeParse(billingDocument);

		if (result.success) return;

		for (const issue of result.error.issues) {
			context.addIssue({
				code: "custom",
				message: issue.message,
				path: issue.path,
			});
		}
	});

type ReservationDetailsFormInput = z.input<typeof reservationDetailsFormSchema>;
type ReservationDetailsFormOutput = z.output<
	typeof reservationDetailsFormSchema
>;

interface PublicReservationCustomerStepProps {
	defaultValues?: Partial<ReservationDetailsFormInput>;
	disabled?: boolean;
	onSubmit(
		customer: ReservationCustomer,
		billingDocument: ReservationBillingDocument,
	): void | Promise<void>;
}

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
		watch,
	} = useForm<
		ReservationDetailsFormInput,
		unknown,
		ReservationDetailsFormOutput
	>({
		defaultValues: {
			billingType: "BOLETA",
			businessName: "",
			documentNumber: "",
			email: "",
			fiscalAddress: "",
			fullName: "",
			phone: "",
			ruc: "",
			...defaultValues,
		},
		mode: "onSubmit",
		resolver: zodResolver(reservationDetailsFormSchema),
		shouldFocusError: false,
	});
	const billingType = watch("billingType");
	const formDisabled = disabled || isSubmitting;

	function handleValidSubmit(values: ReservationDetailsFormOutput) {
		const customer = reservationCustomerSchema.parse({
			fullName: values.fullName,
			email: values.email,
			phone: values.phone,
		});
		const billingDocument = reservationBillingDocumentSchema.parse(
			values.billingType === "BOLETA"
				? {
						type: values.billingType,
						documentNumber: values.documentNumber,
					}
				: {
						type: values.billingType,
						ruc: values.ruc,
						businessName: values.businessName,
						fiscalAddress: values.fiscalAddress,
					},
		);

		return onSubmit(customer, billingDocument);
	}

	function handleInvalidSubmit(
		formErrors: FieldErrors<ReservationDetailsFormInput>,
	) {
		for (const field of ["fullName", "email", "phone"] as const) {
			if (formErrors[field]) {
				setFocus(field);
				return;
			}
		}

		if (billingType === "BOLETA") {
			setFocus("documentNumber");
			return;
		}

		for (const field of ["ruc", "businessName", "fiscalAddress"] as const) {
			if (formErrors[field]) {
				setFocus(field);
				return;
			}
		}
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
					Los usaremos para identificar tu reserva y emitir el comprobante. No
					se guardarán en este navegador.
				</p>
			</div>

			{disabled ? (
				<p className="mt-5 rounded-2xl border border-[#12324a]/10 bg-white/70 px-4 py-3 text-sm leading-6 text-[#587080]">
					Elige un horario disponible para completar tus datos.
				</p>
			) : null}

			<form
				className="mt-7 flex flex-col gap-7"
				noValidate
				onSubmit={(event) => {
					void handleSubmit(handleValidSubmit, handleInvalidSubmit)(event);
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

				<FieldSet className="border-t border-[#12324a]/10 pt-7">
					<FieldLegend className="font-heading text-2xl font-semibold tracking-[-0.04em] text-[#12324a]">
						Tipo de comprobante
					</FieldLegend>
					<p className="-mt-2 text-sm leading-6 text-[#587080]">
						Elige el comprobante que necesitas para esta reserva.
					</p>
					<div className="grid gap-3 sm:grid-cols-2" role="radiogroup">
						{[
							{
								label: "Boleta",
								description: "Para consumo personal con DNI",
								value: "BOLETA" as const,
							},
							{
								label: "Factura",
								description: "Para empresas con RUC",
								value: "FACTURA" as const,
							},
						].map((option) => (
							<label
								className="flex min-h-20 cursor-pointer items-center gap-3 rounded-2xl border border-[#12324a]/15 bg-[#f4f0e8]/35 px-4 py-3 transition-colors has-[:checked]:border-[#e76832] has-[:checked]:bg-[#e76832]/8 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#e76832]/35"
								key={option.value}
							>
								<input
									className="size-4 accent-[#e76832]"
									disabled={formDisabled}
									type="radio"
									value={option.value}
									{...register("billingType")}
								/>
								<span className="min-w-0">
									<span className="block font-semibold text-[#12324a]">
										{option.label}
									</span>
									<span className="block text-sm text-[#587080]">
										{option.description}
									</span>
								</span>
							</label>
						))}
					</div>

					{billingType === "BOLETA" ? (
						<Field data-invalid={Boolean(errors.documentNumber)}>
							<FieldLabel htmlFor="reservation-dni">DNI</FieldLabel>
							<Input
								aria-describedby={
									errors.documentNumber ? "reservation-dni-error" : undefined
								}
								className="h-12 rounded-xl border-[#12324a]/20 bg-[#f4f0e8]/35 px-4 text-base tabular-nums focus-visible:bg-white sm:max-w-sm"
								aria-invalid={Boolean(errors.documentNumber)}
								disabled={formDisabled}
								id="reservation-dni"
								inputMode="numeric"
								maxLength={8}
								pattern="[0-9]{8}"
								placeholder="12345678"
								{...register("documentNumber")}
							/>
							<FieldError
								errors={
									errors.documentNumber ? [errors.documentNumber] : undefined
								}
								id="reservation-dni-error"
							/>
						</Field>
					) : (
						<FieldGroup className="grid gap-5 sm:grid-cols-2 sm:gap-6">
							<Field data-invalid={Boolean(errors.ruc)}>
								<FieldLabel htmlFor="reservation-ruc">RUC</FieldLabel>
								<Input
									aria-describedby={
										errors.ruc ? "reservation-ruc-error" : undefined
									}
									className="h-12 rounded-xl border-[#12324a]/20 bg-[#f4f0e8]/35 px-4 text-base tabular-nums focus-visible:bg-white"
									aria-invalid={Boolean(errors.ruc)}
									disabled={formDisabled}
									id="reservation-ruc"
									inputMode="numeric"
									maxLength={11}
									pattern="[0-9]{11}"
									placeholder="20123456789"
									{...register("ruc")}
								/>
								<FieldError
									errors={errors.ruc ? [errors.ruc] : undefined}
									id="reservation-ruc-error"
								/>
							</Field>

							<Field data-invalid={Boolean(errors.businessName)}>
								<FieldLabel htmlFor="reservation-business-name">
									Razón social
								</FieldLabel>
								<Input
									aria-describedby={
										errors.businessName
											? "reservation-business-name-error"
											: undefined
									}
									className="h-12 rounded-xl border-[#12324a]/20 bg-[#f4f0e8]/35 px-4 text-base focus-visible:bg-white"
									aria-invalid={Boolean(errors.businessName)}
									autoComplete="organization"
									disabled={formDisabled}
									id="reservation-business-name"
									placeholder="Empresa Demo S.A.C."
									{...register("businessName")}
								/>
								<FieldError
									errors={
										errors.businessName ? [errors.businessName] : undefined
									}
									id="reservation-business-name-error"
								/>
							</Field>

							<Field
								className="sm:col-span-2"
								data-invalid={Boolean(errors.fiscalAddress)}
							>
								<FieldLabel htmlFor="reservation-fiscal-address">
									Dirección fiscal
								</FieldLabel>
								<Input
									aria-describedby={
										errors.fiscalAddress
											? "reservation-fiscal-address-error"
											: undefined
									}
									className="h-12 rounded-xl border-[#12324a]/20 bg-[#f4f0e8]/35 px-4 text-base focus-visible:bg-white"
									aria-invalid={Boolean(errors.fiscalAddress)}
									autoComplete="street-address"
									disabled={formDisabled}
									id="reservation-fiscal-address"
									placeholder="Av. Principal 123, Lima"
									{...register("fiscalAddress")}
								/>
								<FieldError
									errors={
										errors.fiscalAddress ? [errors.fiscalAddress] : undefined
									}
									id="reservation-fiscal-address-error"
								/>
							</Field>
						</FieldGroup>
					)}
				</FieldSet>

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
