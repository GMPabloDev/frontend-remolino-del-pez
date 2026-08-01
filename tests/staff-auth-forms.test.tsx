/// <reference lib="dom" />

import { describe, expect, test } from "bun:test";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ChangePasswordForm } from "../src/features/staff-auth/components/ChangePasswordForm";
import { LoginForm } from "../src/features/staff-auth/components/LoginForm";
import type {
	ChangePasswordRequest,
	LoginInput,
} from "../src/features/staff-auth/contracts/staff-auth.schemas";
import { ApiClientError } from "../src/lib/api/api-error";

function renderLogin(
	onSubmit: (input: LoginInput) => Promise<void>,
	onSuccess: () => void = () => {},
) {
	render(<LoginForm onSubmit={onSubmit} onSuccess={onSuccess} />);

	return {
		email: screen.getByLabelText("Email"),
		password: screen.getByLabelText("Contraseña"),
		submit: screen.getByRole("button", { name: "Ingresar al panel" }),
	};
}

function renderChangePassword(
	onSubmit: (input: ChangePasswordRequest) => Promise<void>,
	onPasswordChanged: () => Promise<void> | void = () => {},
) {
	render(
		<ChangePasswordForm
			onPasswordChanged={onPasswordChanged}
			onSubmit={onSubmit}
		/>,
	);

	return {
		currentPassword: screen.getByLabelText("Contraseña actual"),
		newPassword: screen.getByLabelText("Nueva contraseña"),
		confirmNewPassword: screen.getByLabelText("Confirmar nueva contraseña"),
		submit: screen.getByRole("button", {
			name: "Actualizar contraseña",
		}),
	};
}

describe("LoginForm", () => {
	test("focuses the first invalid field and does not submit", async () => {
		const user = userEvent.setup();
		const calls: LoginInput[] = [];
		const form = renderLogin(async (input) => {
			calls.push(input);
		});

		await user.click(form.submit);

		expect(calls).toHaveLength(0);
		expect(document.activeElement).toBe(form.email);
		expect(screen.getByText("Ingresa un email válido.")).toBeTruthy();
		expect(screen.getByText("Ingresa tu contraseña.")).toBeTruthy();
	});

	test("shows a field error for an invalid email", async () => {
		const user = userEvent.setup();
		const calls: LoginInput[] = [];
		const form = renderLogin(async (input) => {
			calls.push(input);
		});

		await user.type(form.email, "invalid-email");
		await user.type(form.password, "password");
		await user.click(form.submit);

		expect(calls).toHaveLength(0);
		expect(screen.getByText("Ingresa un email válido.")).toBeTruthy();
		expect(document.activeElement).toBe(form.email);
	});

	test("normalizes the email and clears only the password after submit", async () => {
		const user = userEvent.setup();
		const calls: LoginInput[] = [];
		let successCalls = 0;
		const form = renderLogin(
			async (input) => {
				calls.push(input);
			},
			() => {
				successCalls += 1;
			},
		);

		await user.type(form.email, " ADMIN@EXAMPLE.COM ");
		await user.type(form.password, "Password123");
		await user.click(form.submit);

		await waitFor(() => expect(calls).toHaveLength(1));
		expect(calls[0]).toEqual({
			email: "admin@example.com",
			password: "Password123",
		});
		expect(successCalls).toBe(1);
		expect(form.email).toHaveProperty("value", "admin@example.com");
		expect(form.password).toHaveProperty("value", "");
	});

	test("blocks duplicate submissions while login is pending", async () => {
		const user = userEvent.setup();
		const calls: LoginInput[] = [];
		let resolveSubmit: (() => void) | undefined;
		const form = renderLogin(async (input) => {
			calls.push(input);
			await new Promise<void>((resolve) => {
				resolveSubmit = resolve;
			});
		});

		await user.type(form.email, "admin@example.com");
		await user.type(form.password, "Password123");
		const firstSubmit = user.click(form.submit);
		await waitFor(() => expect(calls).toHaveLength(1));
		await user.click(form.submit);

		expect(calls).toHaveLength(1);
		expect(form.submit).toHaveProperty("disabled", true);
		resolveSubmit?.();
		await firstSubmit;
	});

	test("focuses the server error and clears the password after failure", async () => {
		const user = userEvent.setup();
		const form = renderLogin(async () => {
			throw new ApiClientError(
				401,
				"INVALID_CREDENTIALS",
				"Credenciales inválidas",
			);
		});

		await user.type(form.email, "admin@example.com");
		await user.type(form.password, "Password123");
		await user.click(form.submit);

		const error = await screen.findByRole("alert");
		expect(error.textContent).toContain(
			"El email o la contraseña no son válidos.",
		);
		expect(document.activeElement).toBe(error);
		expect(form.email).toHaveProperty("value", "admin@example.com");
		expect(form.password).toHaveProperty("value", "");
	});
});

describe("ChangePasswordForm", () => {
	test("focuses the first invalid password field", async () => {
		const user = userEvent.setup();
		const calls: ChangePasswordRequest[] = [];
		const form = renderChangePassword(async (input) => {
			calls.push(input);
		});

		await user.click(form.submit);

		expect(calls).toHaveLength(0);
		expect(document.activeElement).toBe(form.currentPassword);
		expect(screen.getByText("Ingresa tu contraseña actual.")).toBeTruthy();
	});

	test("shows password rules next to the new password field", async () => {
		const user = userEvent.setup();
		const calls: ChangePasswordRequest[] = [];
		const form = renderChangePassword(async (input) => {
			calls.push(input);
		});

		await user.type(form.currentPassword, "Current123");
		await user.type(form.newPassword, "short");
		await user.type(form.confirmNewPassword, "short");
		await user.click(form.submit);

		expect(calls).toHaveLength(0);
		expect(screen.getByText("Debe tener al menos 10 caracteres.")).toBeTruthy();
		expect(document.activeElement).toBe(form.newPassword);
	});

	test("focuses confirmation when new passwords differ", async () => {
		const user = userEvent.setup();
		const calls: ChangePasswordRequest[] = [];
		const form = renderChangePassword(async (input) => {
			calls.push(input);
		});

		await user.type(form.currentPassword, "Current123");
		await user.type(form.newPassword, "NewPassword123");
		await user.type(form.confirmNewPassword, "OtherPassword123");
		await user.click(form.submit);

		expect(calls).toHaveLength(0);
		expect(
			screen.getByText("Las contraseñas nuevas deben coincidir."),
		).toBeTruthy();
		expect(document.activeElement).toBe(form.confirmNewPassword);
	});

	test("sends only the API payload and clears all passwords", async () => {
		const user = userEvent.setup();
		const calls: ChangePasswordRequest[] = [];
		let passwordChangedCalls = 0;
		const form = renderChangePassword(
			async (input) => {
				calls.push(input);
			},
			() => {
				passwordChangedCalls += 1;
			},
		);

		await user.type(form.currentPassword, "Current123");
		await user.type(form.newPassword, "NewPassword123");
		await user.type(form.confirmNewPassword, "NewPassword123");
		await user.click(form.submit);

		await waitFor(() => expect(calls).toHaveLength(1));
		expect(calls[0]).toEqual({
			currentPassword: "Current123",
			newPassword: "NewPassword123",
		});
		expect(Object.hasOwn(calls[0], "confirmNewPassword")).toBe(false);
		expect(passwordChangedCalls).toBe(1);
		expect(form.currentPassword).toHaveProperty("value", "");
		expect(form.newPassword).toHaveProperty("value", "");
		expect(form.confirmNewPassword).toHaveProperty("value", "");
	});

	test("blocks duplicate password changes while the request is pending", async () => {
		const user = userEvent.setup();
		const calls: ChangePasswordRequest[] = [];
		let resolveSubmit: (() => void) | undefined;
		const form = renderChangePassword(async (input) => {
			calls.push(input);
			await new Promise<void>((resolve) => {
				resolveSubmit = resolve;
			});
		});

		await user.type(form.currentPassword, "Current123");
		await user.type(form.newPassword, "NewPassword123");
		await user.type(form.confirmNewPassword, "NewPassword123");
		const firstSubmit = user.click(form.submit);
		await waitFor(() => expect(calls).toHaveLength(1));
		await user.click(form.submit);

		expect(calls).toHaveLength(1);
		expect(form.submit).toHaveProperty("disabled", true);
		resolveSubmit?.();
		await firstSubmit;
	});

	test("focuses the server error and clears all passwords after failure", async () => {
		const user = userEvent.setup();
		const form = renderChangePassword(async () => {
			throw new ApiClientError(
				401,
				"INVALID_CREDENTIALS",
				"Credenciales inválidas",
			);
		});

		await user.type(form.currentPassword, "Current123");
		await user.type(form.newPassword, "NewPassword123");
		await user.type(form.confirmNewPassword, "NewPassword123");
		await user.click(form.submit);

		const error = await screen.findByRole("alert");
		expect(error.textContent).toContain("La contraseña actual no es correcta.");
		expect(document.activeElement).toBe(error);
		expect(form.currentPassword).toHaveProperty("value", "");
		expect(form.newPassword).toHaveProperty("value", "");
		expect(form.confirmNewPassword).toHaveProperty("value", "");
	});
});
