import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { type FieldErrors, useForm } from "react-hook-form";
import type { z } from "zod";

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
import { ApiClientError } from "@/lib/api/api-error";
import {
	type CustomerMagicLinkRequest,
	customerMagicLinkRequestSchema,
} from "../contracts/customer-auth.schemas";

interface CustomerAccessFormProps {
	onSubmit(input: CustomerMagicLinkRequest): Promise<void>;
}

type CustomerAccessFormInput = z.input<typeof customerMagicLinkRequestSchema>;

const COOLDOWN_MS = 60_000;

export function CustomerAccessForm({ onSubmit }: CustomerAccessFormProps) {
	const errorReference = useRef<HTMLDivElement>(null);
	const [accepted, setAccepted] = useState(false);
	const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
	const {
		clearErrors,
		formState: { errors, isSubmitting },
		handleSubmit,
		register,
		setError,
		setFocus,
	} = useForm<CustomerAccessFormInput, unknown, CustomerMagicLinkRequest>({
		defaultValues: { email: "" },
		mode: "onSubmit",
		resolver: zodResolver(customerMagicLinkRequestSchema),
		shouldFocusError: false,
	});
	const errorMessage = errors.root?.server?.message;
	const cooldownActive = cooldownUntil !== null;

	useEffect(() => {
		if (!cooldownUntil) {
			return;
		}

		const timeout = window.setTimeout(
			() => {
				setCooldownUntil(null);
			},
			Math.max(0, cooldownUntil - Date.now()),
		);

		return () => window.clearTimeout(timeout);
	}, [cooldownUntil]);

	useEffect(() => {
		if (errorMessage) {
			errorReference.current?.focus();
		}
	}, [errorMessage]);

	async function handleValidSubmit(
		values: CustomerMagicLinkRequest,
	): Promise<void> {
		clearErrors("root");
		setAccepted(false);

		try {
			await onSubmit(values);
			setAccepted(true);
			setCooldownUntil(Date.now() + COOLDOWN_MS);
		} catch (error) {
			setError("root.server", {
				message: getCustomerAccessErrorMessage(error),
				type: "server",
			});
		}
	}

	function handleInvalidSubmit(
		formErrors: FieldErrors<CustomerAccessFormInput>,
	) {
		clearErrors("root");
		setAccepted(false);

		if (formErrors.email) {
			setFocus("email");
		}
	}

	return (
		<form
			className="flex flex-col gap-5"
			noValidate
			onSubmit={(event) => {
				void handleSubmit(handleValidSubmit, handleInvalidSubmit)(event);
			}}
		>
			{errorMessage ? (
				<div
					ref={errorReference}
					className="rounded-xl border border-[#b34b25]/25 bg-[#b34b25]/10 px-4 py-3 text-sm leading-6 text-[#8f3d20] outline-none"
					role="alert"
					tabIndex={-1}
				>
					{errorMessage}
				</div>
			) : null}

			{accepted ? (
				<Alert aria-live="polite">
					<AlertTitle>Solicitud recibida</AlertTitle>
					<AlertDescription>
						Si existe una cuenta elegible, enviaremos un enlace de acceso a tu
						correo. Revisa tu bandeja de entrada y spam.
					</AlertDescription>
				</Alert>
			) : null}

			<FieldGroup>
				<Field data-invalid={Boolean(errors.email)}>
					<FieldLabel htmlFor="customer-access-email">Email</FieldLabel>
					<Input
						aria-describedby={
							errors.email
								? "customer-access-email-error"
								: "customer-access-email-description"
						}
						aria-invalid={Boolean(errors.email)}
						autoComplete="email"
						disabled={isSubmitting || cooldownActive}
						id="customer-access-email"
						placeholder="ana@ejemplo.com"
						type="email"
						{...register("email")}
					/>
					<FieldDescription id="customer-access-email-description">
						Usa el correo con el que confirmaste una reserva.
					</FieldDescription>
					<FieldError
						errors={errors.email ? [errors.email] : undefined}
						id="customer-access-email-error"
					/>
				</Field>
			</FieldGroup>

			<Button disabled={isSubmitting || cooldownActive} type="submit">
				{isSubmitting
					? "Enviando…"
					: cooldownActive
						? "Espera para solicitar otro enlace"
						: "Solicitar enlace de acceso"}
			</Button>
		</form>
	);
}

function getCustomerAccessErrorMessage(error: unknown): string {
	if (error instanceof ApiClientError) {
		if (error.code === "NETWORK_ERROR" || error.status === 0) {
			return "No se pudo conectar con el servidor. Inténtalo nuevamente.";
		}

		if (error.code === "VALIDATION_ERROR") {
			return "El email no es válido. Revísalo e inténtalo nuevamente.";
		}
	}

	return "No pudimos procesar la solicitud. Inténtalo nuevamente.";
}
