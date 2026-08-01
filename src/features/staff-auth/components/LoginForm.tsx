import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef } from "react";
import { type FieldErrors, useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ApiClientError } from "@/lib/api/api-error";
import {
	type LoginInput,
	loginRequestSchema,
} from "../contracts/staff-auth.schemas";

interface LoginFormProps {
	onSubmit: (input: LoginInput) => Promise<void>;
	onSuccess: () => void;
}

export function LoginForm({ onSubmit, onSuccess }: LoginFormProps) {
	const errorReference = useRef<HTMLParagraphElement>(null);
	const {
		formState: { errors, isSubmitting },
		clearErrors,
		handleSubmit,
		register,
		reset,
		setError,
		setFocus,
	} = useForm<LoginInput>({
		defaultValues: {
			email: "",
			password: "",
		},
		mode: "onSubmit",
		resolver: zodResolver(loginRequestSchema),
		shouldFocusError: false,
	});
	const errorMessage = errors.root?.server?.message;

	useEffect(() => {
		if (errorMessage) {
			errorReference.current?.focus();
		}
	}, [errorMessage]);

	async function handleValidSubmit(values: LoginInput): Promise<void> {
		setErrorMessage(null);

		try {
			await onSubmit(values);
			onSuccess();
		} catch (error) {
			const message = getLoginErrorMessage(error);
			setErrorMessage(message);
		} finally {
			reset(
				{
					email: values.email,
					password: "",
				},
				{ keepErrors: true },
			);
		}
	}

	function handleInvalidSubmit(formErrors: FieldErrors<LoginInput>): void {
		setErrorMessage(null);

		if (formErrors.email) {
			setFocus("email");
			return;
		}

		setFocus("password");
	}

	function setErrorMessage(message: string | null): void {
		if (message) {
			setRootError(message);
			return;
		}

		clearRootError();
	}

	function setRootError(message: string): void {
		setError("root.server", {
			message,
			type: "server",
		});
	}

	function clearRootError(): void {
		clearErrors("root");
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
				<p
					ref={errorReference}
					className="rounded-xl border border-[#b34b25]/25 bg-[#b34b25]/10 px-4 py-3 text-sm leading-6 text-[#8f3d20] outline-none"
					id="staff-login-error"
					role="alert"
					tabIndex={-1}
				>
					{errorMessage}
				</p>
			) : null}

			<FieldGroup>
				<Field data-invalid={Boolean(errors.email)}>
					<FieldLabel htmlFor="staff-email">Email</FieldLabel>
					<Input
						aria-describedby={errors.email ? "staff-email-error" : undefined}
						aria-invalid={Boolean(errors.email)}
						autoComplete="email"
						disabled={isSubmitting}
						id="staff-email"
						placeholder="nombre@restaurante.com"
						type="email"
						{...register("email")}
					/>
					<FieldError
						errors={errors.email ? [errors.email] : undefined}
						id="staff-email-error"
					/>
				</Field>

				<Field data-invalid={Boolean(errors.password)}>
					<FieldLabel htmlFor="staff-password">Contraseña</FieldLabel>
					<Input
						aria-describedby={
							errors.password ? "staff-password-error" : undefined
						}
						aria-invalid={Boolean(errors.password)}
						autoComplete="current-password"
						disabled={isSubmitting}
						id="staff-password"
						type="password"
						{...register("password")}
					/>
					<FieldError
						errors={errors.password ? [errors.password] : undefined}
						id="staff-password-error"
					/>
				</Field>
			</FieldGroup>

			<Button
				className="h-12 w-full rounded-xl"
				disabled={isSubmitting}
				type="submit"
			>
				{isSubmitting ? "Ingresando…" : "Ingresar al panel"}
			</Button>
		</form>
	);
}

function getLoginErrorMessage(error: unknown): string {
	if (error instanceof ApiClientError) {
		if (error.code === "INVALID_CREDENTIALS") {
			return "El email o la contraseña no son válidos.";
		}

		if (error.code === "NETWORK_ERROR" || error.status === 0) {
			return "No se pudo conectar con el servidor. Inténtalo nuevamente.";
		}
	}

	return "No se pudo iniciar sesión. Inténtalo nuevamente.";
}
