/// <reference lib="dom" />

import { afterEach, describe, expect, test } from "bun:test";
import { act, render, screen, waitFor } from "@testing-library/react";
import {
	createStoredPublicCart,
	getPublicCartKey,
	readPublicCart,
	writePublicCart,
} from "../src/features/public-cart/lib/public-cart-storage";
import {
	PublicCartProvider,
	usePublicCart,
} from "../src/features/public-cart/PublicCartProvider";

class MemoryStorage {
	private values = new Map<string, string>();

	getItem(key: string): string | null {
		return this.values.get(key) ?? null;
	}

	setItem(key: string, value: string): void {
		this.values.set(key, value);
	}

	removeItem(key: string): void {
		this.values.delete(key);
	}
}

class ThrowingStorage {
	getItem(): string | null {
		throw new Error("storage unavailable");
	}

	setItem(): void {
		throw new Error("storage unavailable");
	}

	removeItem(): void {
		throw new Error("storage unavailable");
	}
}

const restaurantSlug = "restaurante-olimpico";
const branchSlug = "miraflores";
const item = {
	dishId: "dish-1",
	name: "Causa de pollo",
	imageUrl: null,
	unitPrice: "28.90",
	quantity: 1,
};
const originalLocalStorage = globalThis.localStorage;

function setGlobalStorage(storage: MemoryStorage | undefined) {
	Object.defineProperty(globalThis, "localStorage", {
		configurable: true,
		value: storage,
	});
}

function CartName() {
	const { items } = usePublicCart();
	return <output>{items[0]?.name ?? "empty"}</output>;
}

afterEach(() => {
	Object.defineProperty(globalThis, "localStorage", {
		configurable: true,
		value: originalLocalStorage,
	});
});

describe("public cart storage", () => {
	test("writes and reads an isolated seven-day cart", () => {
		const storage = new MemoryStorage();
		const now = new Date("2026-08-04T10:00:00.000Z");
		const cart = createStoredPublicCart({
			restaurantSlug,
			branchSlug,
			items: [item],
			now,
		});

		expect(writePublicCart(cart, { storage }).persistence).toBe("persistent");
		expect(storage.getItem(getPublicCartKey(restaurantSlug, branchSlug))).toBe(
			JSON.stringify(cart),
		);
		expect(
			readPublicCart(restaurantSlug, branchSlug, {
				storage,
				now: new Date("2026-08-10T10:00:00.000Z"),
			}).cart,
		).toEqual(cart);
	});

	test("renews expiration and discards expired or invalid values", () => {
		const storage = new MemoryStorage();
		const first = createStoredPublicCart({
			restaurantSlug,
			branchSlug,
			items: [item],
			now: new Date("2026-08-04T10:00:00.000Z"),
		});
		const renewed = createStoredPublicCart({
			restaurantSlug,
			branchSlug,
			items: [item],
			now: new Date("2026-08-05T10:00:00.000Z"),
		});

		writePublicCart(first, { storage });
		writePublicCart(renewed, { storage });
		expect(
			readPublicCart(restaurantSlug, branchSlug, {
				storage,
				now: new Date("2026-08-12T10:00:01.000Z"),
			}).cart,
		).toBeNull();

		storage.setItem(
			getPublicCartKey(restaurantSlug, branchSlug),
			"broken-json",
		);
		expect(readPublicCart(restaurantSlug, branchSlug, { storage }).reason).toBe(
			"invalid",
		);
		expect(
			storage.getItem(getPublicCartKey(restaurantSlug, branchSlug)),
		).toBeNull();
	});

	test("degrades to memory when localStorage fails", () => {
		const cart = createStoredPublicCart({
			restaurantSlug,
			branchSlug,
			items: [item],
		});
		const result = writePublicCart(cart, { storage: new ThrowingStorage() });

		expect(result.persistence).toBe("memory");
		expect(result.cart).toEqual(cart);
		expect(
			readPublicCart(restaurantSlug, branchSlug, {
				storage: new ThrowingStorage(),
			}).reason,
		).toBe("unavailable");
	});

	test("applies a valid change received from another tab", async () => {
		const storage = new MemoryStorage();
		setGlobalStorage(storage);
		const firstCart = createStoredPublicCart({
			restaurantSlug,
			branchSlug,
			items: [item],
		});
		const secondCart = createStoredPublicCart({
			restaurantSlug,
			branchSlug,
			items: [{ ...item, name: "Causa actualizada" }],
		});
		writePublicCart(firstCart, { storage });

		render(
			<PublicCartProvider
				branchSlug={branchSlug}
				restaurantSlug={restaurantSlug}
			>
				<CartName />
			</PublicCartProvider>,
		);
		await waitFor(() => expect(screen.getByText(item.name)).toBeTruthy());

		writePublicCart(secondCart, { storage });
		const event = new Event("storage");
		Object.defineProperty(event, "key", {
			configurable: true,
			value: getPublicCartKey(restaurantSlug, branchSlug),
		});
		await act(async () => {
			window.dispatchEvent(event);
		});

		await waitFor(() =>
			expect(screen.getByText("Causa actualizada")).toBeTruthy(),
		);
	});
});
