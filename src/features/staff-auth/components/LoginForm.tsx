import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
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
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
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

		const result = loginRequestSchema.safeParse({ email, password });

		if (!result.success) {
			setErrorMessage("Ingresa un email válido y tu contraseña.");
			return;
		}

		setIsSubmitting(true);

		try {
			await onSubmit(result.data);
			onSuccess();
		} catch (error) {
			setErrorMessage(getLoginErrorMessage(error));
		} finally {
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
					id="staff-login-error"
					role="alert"
					tabIndex={-1}
				>
					{errorMessage}
				</p>
			) : null}

			<div className="space-y-2">
				<label className="block text-sm font-semibold" htmlFor="staff-email">
					Email
				</label>
				<input
					aria-describedby={errorMessage ? "staff-login-error" : undefined}
					aria-invalid={Boolean(errorMessage)}
					autoComplete="email"
					className="h-12 w-full rounded-xl border border-[#12324a]/15 bg-white px-4 text-sm outline-none transition focus:border-[#e76832] focus:ring-4 focus:ring-[#e76832]/15"
					disabled={isSubmitting}
					id="staff-email"
					name="email"
					onChange={(event) => setEmail(event.target.value)}
					placeholder="nombre@restaurante.com"
					required
					type="email"
					value={email}
				/>
			</div>

			<div className="space-y-2">
				<label className="block text-sm font-semibold" htmlFor="staff-password">
					Contraseña
				</label>
				<input
					aria-describedby={errorMessage ? "staff-login-error" : undefined}
					aria-invalid={Boolean(errorMessage)}
					autoComplete="current-password"
					className="h-12 w-full rounded-xl border border-[#12324a]/15 bg-white px-4 text-sm outline-none transition focus:border-[#e76832] focus:ring-4 focus:ring-[#e76832]/15"
					disabled={isSubmitting}
					id="staff-password"
					name="password"
					onChange={(event) => setPassword(event.target.value)}
					required
					type="password"
					value={password}
				/>
			</div>

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
