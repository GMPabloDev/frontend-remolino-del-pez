/// <reference lib="dom" />

import { describe, expect, test } from "bun:test";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PublicCartSheet } from "../src/features/public-cart/components/PublicCartSheet";
import { PublicCartProvider } from "../src/features/public-cart/PublicCartProvider";
import { DishCard } from "../src/features/public-menu/components/DishCard";
import type { PublicDish } from "../src/features/public-menu/contracts/public-menu";

const availableDish = {
	id: "dish-ui-1",
	name: "Causa de pollo",
	description: "Causa con pollo crocante.",
	imageUrl: null,
	ingredients: ["Papa"],
	allergens: ["Huevo"],
	position: 1,
	price: "28.90",
	status: "available" as const,
};

const soldOutDish = {
	...availableDish,
	id: "dish-ui-2",
	name: "Pesca del día",
	status: "sold_out" as const,
};

function CartSurface({ dish = availableDish }: { dish?: PublicDish }) {
	return (
		<PublicCartProvider
			branchSlug="miraflores"
			restaurantSlug="restaurante-olimpico"
		>
			<DishCard dish={dish} />
			<PublicCartSheet />
		</PublicCartProvider>
	);
}

describe("public cart UI", () => {
	test("adds a dish without opening the Sheet and synchronizes controls", async () => {
		const user = userEvent.setup();
		render(<CartSurface />);

		await user.click(
			screen.getByRole("button", { name: "Añadir Causa de pollo al carrito" }),
		);
		expect(screen.getByText("En tu selección")).toBeTruthy();
		expect(screen.getByText("Añadido Causa de pollo al carrito.")).toBeTruthy();
		expect(screen.queryByText("Tu selección")).toBeNull();

		await user.click(screen.getByRole("button", { name: /Abrir carrito/ }));
		expect(screen.getByText("Tu selección")).toBeTruthy();
		expect(
			screen
				.getByRole("button", { name: "Continuar con la reserva" })
				.hasAttribute("disabled"),
		).toBe(true);
		const sheet = screen.getByRole("dialog");
		expect(within(sheet).getByText("Causa de pollo")).toBeTruthy();

		const increaseButtons = screen.getAllByRole("button", {
			name: "Aumentar cantidad de Causa de pollo",
		});
		const firstIncreaseButton = increaseButtons[0];
		expect(firstIncreaseButton).toBeTruthy();
		await user.click(firstIncreaseButton as HTMLElement);
		expect(screen.getAllByText("2").length).toBeGreaterThan(0);
		expect(screen.getByText("Cantidad de Causa de pollo: 2.")).toBeTruthy();
	});

	test("does not allow adding sold-out dishes", () => {
		render(<CartSurface dish={soldOutDish} />);

		expect(
			screen.queryByRole("button", { name: "Añadir Pesca del día al carrito" }),
		).toBeNull();
		expect(screen.getByText("No disponible para selección")).toBeTruthy();
	});

	test("confirms clearing the cart and keeps the dialog accessible", async () => {
		const user = userEvent.setup();
		render(<CartSurface />);

		await user.click(
			screen.getByRole("button", { name: "Añadir Causa de pollo al carrito" }),
		);
		await user.click(screen.getByRole("button", { name: /Abrir carrito/ }));
		await user.click(screen.getByRole("button", { name: "Vaciar carrito" }));

		expect(
			screen.getByRole("heading", { name: "¿Vaciar el carrito?" }),
		).toBeTruthy();
		expect(
			screen.getByText(
				"Se eliminarán todos los platos seleccionados de esta sucursal.",
			),
		).toBeTruthy();
		await user.click(
			screen.getByRole("button", { name: "Conservar selección" }),
		);
		expect(screen.getAllByText("Causa de pollo").length).toBeGreaterThan(1);
		await waitFor(() =>
			expect(
				screen.getByRole("button", { name: "Vaciar carrito" }),
			).toBeTruthy(),
		);

		await user.click(screen.getByRole("button", { name: "Vaciar carrito" }));
		await waitFor(() =>
			expect(
				screen.getByRole("heading", { name: "¿Vaciar el carrito?" }),
			).toBeTruthy(),
		);
		expect(screen.getByRole("button", { name: "Vaciar carrito" })).toBeTruthy();
		await user.click(screen.getByRole("button", { name: "Vaciar carrito" }));
		expect(screen.getByText("Tu carrito está vacío")).toBeTruthy();
	});
});
