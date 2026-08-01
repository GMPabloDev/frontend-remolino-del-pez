import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { ApiClientError } from "@/lib/api/api-error";
import { createStaffApiClient } from "../api/staff-api-client";
import { changePasswordFormSchema } from "../contracts/staff-auth.schemas";
import { useStaffAuth } from "./StaffAuthProvider";

interface ChangePasswordFormProps {
	onPasswordChanged: () => Promise<void> | void;
}

export function ChangePasswordForm({
	onPasswordChanged,
}: ChangePasswordFormProps) {
	const { session } = useStaffAuth();
	const apiClient = useMemo(() => createStaffApiClient(session), [session]);
	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmNewPassword, setConfirmNewPassword] = useState("");
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const errorReference = useRef<HTMLParagraphElement>(null);

	useEffect(() => {
		if (errorMessage) {
			errorReference.current?.focus();
		}
	}, [errorMessage]);

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setErrorMessage(null);

		const result = changePasswordFormSchema.safeParse({
			currentPassword,
			newPassword,
			confirmNewPassword,
		});

		if (!result.success) {
			setErrorMessage(
				"La nueva contraseña debe tener 10–128 caracteres, mayúscula, minúscula y número; además debe coincidir con la confirmación.",
			);
			return;
		}

		setIsSubmitting(true);

		try {
			await apiClient.requestNoContent("/auth/password", {
				method: "PATCH",
				body: JSON.stringify({
					currentPassword: result.data.currentPassword,
					newPassword: result.data.newPassword,
				}),
				headers: { "Content-Type": "application/json" },
			});
			await onPasswordChanged();
		} catch (error) {
			setErrorMessage(getPasswordErrorMessage(error));
		} finally {
			setCurrentPassword("");
			setNewPassword("");
			setConfirmNewPassword("");
			setIsSubmitting(false);
		}
	}

	return (
		<form
			className="space-y-5"
			onSubmit={(event) => void handleSubmit(event)}
			noValidate
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

			<PasswordField
				autoComplete="current-password"
				disabled={isSubmitting}
				id="current-password"
				label="Contraseña actual"
				onChange={setCurrentPassword}
				value={currentPassword}
			/>
			<PasswordField
				autoComplete="new-password"
				disabled={isSubmitting}
				id="new-password"
				label="Nueva contraseña"
				onChange={setNewPassword}
				value={newPassword}
			/>
			<PasswordField
				autoComplete="new-password"
				disabled={isSubmitting}
				id="confirm-new-password"
				label="Confirmar nueva contraseña"
				onChange={setConfirmNewPassword}
				value={confirmNewPassword}
			/>

			<ul className="space-y-1 text-xs leading-5 text-[#12324a]/60">
				<li>• Entre 10 y 128 caracteres.</li>
				<li>• Al menos una mayúscula, una minúscula y un número.</li>
			</ul>

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

function PasswordField({
	autoComplete,
	disabled,
	id,
	label,
	onChange,
	value,
}: {
	autoComplete: "current-password" | "new-password";
	disabled: boolean;
	id: string;
	label: string;
	onChange: (value: string) => void;
	value: string;
}) {
	return (
		<div className="space-y-2">
			<label className="block text-sm font-semibold" htmlFor={id}>
				{label}
			</label>
			<input
				autoComplete={autoComplete}
				className="h-12 w-full rounded-xl border border-[#12324a]/15 bg-white px-4 text-sm outline-none transition focus:border-[#e76832] focus:ring-4 focus:ring-[#e76832]/15"
				disabled={disabled}
				id={id}
				name={id}
				onChange={(event) => onChange(event.target.value)}
				required
				type="password"
				value={value}
			/>
		</div>
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
