import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef } from "react";
import { type FieldErrors, useForm } from "react-hook-form";

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
	type ChangePasswordInput,
	type ChangePasswordRequest,
	changePasswordFormSchema,
} from "../contracts/staff-auth.schemas";

interface ChangePasswordFormProps {
	onPasswordChanged: () => Promise<void> | void;
	onSubmit: (input: ChangePasswordRequest) => Promise<void>;
}

export function ChangePasswordForm({
	onPasswordChanged,
	onSubmit,
}: ChangePasswordFormProps) {
	const errorReference = useRef<HTMLParagraphElement>(null);
	const {
		clearErrors,
		formState: { errors, isSubmitting },
		handleSubmit,
		register,
		reset,
		setError,
		setFocus,
	} = useForm<ChangePasswordInput>({
		defaultValues: {
			currentPassword: "",
			newPassword: "",
			confirmNewPassword: "",
		},
		mode: "onSubmit",
		resolver: zodResolver(changePasswordFormSchema),
		shouldFocusError: false,
	});
	const errorMessage = errors.root?.server?.message;

	useEffect(() => {
		if (errorMessage) {
			errorReference.current?.focus();
		}
	}, [errorMessage]);

	async function handleValidSubmit(values: ChangePasswordInput): Promise<void> {
		setErrorMessage(null);

		try {
			await onSubmit({
				currentPassword: values.currentPassword,
				newPassword: values.newPassword,
			});
			await onPasswordChanged();
		} catch (error) {
			setErrorMessage(getPasswordErrorMessage(error));
		} finally {
			reset(
				{
					currentPassword: "",
					newPassword: "",
					confirmNewPassword: "",
				},
				{ keepErrors: true },
			);
		}
	}

	function handleInvalidSubmit(
		formErrors: FieldErrors<ChangePasswordInput>,
	): void {
		setErrorMessage(null);

		if (formErrors.currentPassword) {
			setFocus("currentPassword");
			return;
		}

		if (formErrors.newPassword) {
			setFocus("newPassword");
			return;
		}

		setFocus("confirmNewPassword");
	}

	function setErrorMessage(message: string | null): void {
		if (message) {
			setError("root.server", {
				message,
				type: "server",
			});
			return;
		}

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
					id="staff-password-error"
					role="alert"
					tabIndex={-1}
				>
					{errorMessage}
				</p>
			) : null}

			<FieldGroup>
				<Field data-invalid={Boolean(errors.currentPassword)}>
					<FieldLabel htmlFor="current-password">Contraseña actual</FieldLabel>
					<Input
						aria-describedby={
							errors.currentPassword
								? "current-password-field-error"
								: undefined
						}
						aria-invalid={Boolean(errors.currentPassword)}
						autoComplete="current-password"
						disabled={isSubmitting}
						id="current-password"
						type="password"
						{...register("currentPassword")}
					/>
					<FieldError
						errors={
							errors.currentPassword ? [errors.currentPassword] : undefined
						}
						id="current-password-field-error"
					/>
				</Field>

				<Field data-invalid={Boolean(errors.newPassword)}>
					<FieldLabel htmlFor="new-password">Nueva contraseña</FieldLabel>
					<Input
						aria-describedby={
							errors.newPassword ? "new-password-field-error" : undefined
						}
						aria-invalid={Boolean(errors.newPassword)}
						autoComplete="new-password"
						disabled={isSubmitting}
						id="new-password"
						type="password"
						{...register("newPassword")}
					/>
					<FieldError
						errors={errors.newPassword ? [errors.newPassword] : undefined}
						id="new-password-field-error"
					/>
				</Field>

				<Field data-invalid={Boolean(errors.confirmNewPassword)}>
					<FieldLabel htmlFor="confirm-new-password">
						Confirmar nueva contraseña
					</FieldLabel>
					<Input
						aria-describedby={
							errors.confirmNewPassword
								? "confirm-new-password-field-error"
								: undefined
						}
						aria-invalid={Boolean(errors.confirmNewPassword)}
						autoComplete="new-password"
						disabled={isSubmitting}
						id="confirm-new-password"
						type="password"
						{...register("confirmNewPassword")}
					/>
					<FieldError
						errors={
							errors.confirmNewPassword
								? [errors.confirmNewPassword]
								: undefined
						}
						id="confirm-new-password-field-error"
					/>
				</Field>
			</FieldGroup>

			<FieldDescription className="text-xs leading-5">
				Entre 10 y 128 caracteres.
				<br />
				Al menos una mayúscula, una minúscula y un número.
			</FieldDescription>

			<Button
				className="h-12 w-full rounded-xl"
				disabled={isSubmitting}
				type="submit"
			>
				{isSubmitting ? "Actualizando…" : "Actualizar contraseña"}
			</Button>
		</form>
	);
}

function getPasswordErrorMessage(error: unknown): string {
	if (error instanceof ApiClientError) {
		if (error.code === "INVALID_CREDENTIALS") {
			return "La contraseña actual no es correcta.";
		}

		if (error.code === "NETWORK_ERROR" || error.status === 0) {
			return "No se pudo conectar con el servidor. Inténtalo nuevamente.";
		}
	}

	return "No se pudo actualizar la contraseña. Inténtalo nuevamente.";
}
