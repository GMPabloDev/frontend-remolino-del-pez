import type { z } from "zod";

import {
	type StoredPublicCart,
	type StoredPublicCartItem,
	storedPublicCartSchema,
} from "../contracts/public-cart.schemas";

export const PUBLIC_CART_VERSION = 1;
export const PUBLIC_CART_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const PUBLIC_CART_KEY_PREFIX = "public-cart:v1:";

export interface PublicCartStorageAdapter {
	getItem(key: string): string | null;
	setItem(key: string, value: string): void;
	removeItem(key: string): void;
}

export type PublicCartPersistence = "persistent" | "memory";
export type PublicCartStorageReason =
	| "available"
	| "empty"
	| "expired"
	| "invalid"
	| "unavailable"
	| "saved"
	| "removed";

export interface PublicCartStorageResult {
	cart: StoredPublicCart | null;
	persistence: PublicCartPersistence;
	reason: PublicCartStorageReason;
}

interface PublicCartStorageOptions {
	now?: Date;
	storage?: PublicCartStorageAdapter | null;
}

interface CreateStoredPublicCartInput {
	restaurantSlug: string;
	branchSlug: string;
	items: ReadonlyArray<StoredPublicCartItem>;
	now?: Date;
}

export function getPublicCartKey(
	restaurantSlug: string,
	branchSlug: string,
): string {
	return `${PUBLIC_CART_KEY_PREFIX}${restaurantSlug}:${branchSlug}`;
}

export function createStoredPublicCart({
	restaurantSlug,
	branchSlug,
	items,
	now = new Date(),
}: CreateStoredPublicCartInput): StoredPublicCart {
	const cart = {
		version: PUBLIC_CART_VERSION,
		restaurantSlug,
		branchSlug,
		savedAt: now.toISOString(),
		expiresAt: new Date(now.getTime() + PUBLIC_CART_TTL_MS).toISOString(),
		items: [...items],
	};

	return storedPublicCartSchema.parse(cart);
}

export function readPublicCart(
	restaurantSlug: string,
	branchSlug: string,
	{
		now = new Date(),
		storage = getDefaultPublicCartStorage(),
	}: PublicCartStorageOptions = {},
): PublicCartStorageResult {
	if (!storage) {
		return createStorageResult(null, "memory", "unavailable");
	}

	const key = getPublicCartKey(restaurantSlug, branchSlug);
	let rawValue: string | null;

	try {
		rawValue = storage.getItem(key);
	} catch {
		return createStorageResult(null, "memory", "unavailable");
	}

	if (rawValue === null) {
		return createStorageResult(null, "persistent", "empty");
	}

	const parsedValue = parseStoredCart(rawValue);
	if (!parsedValue.success) {
		removeStoredCart(storage, key);
		return createStorageResult(null, "persistent", "invalid");
	}

	if (
		parsedValue.data.restaurantSlug !== restaurantSlug ||
		parsedValue.data.branchSlug !== branchSlug
	) {
		removeStoredCart(storage, key);
		return createStorageResult(null, "persistent", "invalid");
	}

	if (new Date(parsedValue.data.expiresAt).getTime() <= now.getTime()) {
		removeStoredCart(storage, key);
		return createStorageResult(null, "persistent", "expired");
	}

	return createStorageResult(parsedValue.data, "persistent", "available");
}

export function writePublicCart(
	cart: StoredPublicCart,
	{
		storage = getDefaultPublicCartStorage(),
	}: Pick<PublicCartStorageOptions, "storage"> = {},
): PublicCartStorageResult {
	const parsedCart = storedPublicCartSchema.safeParse(cart);
	if (!parsedCart.success) {
		return createStorageResult(null, "memory", "invalid");
	}

	if (!storage) {
		return createStorageResult(parsedCart.data, "memory", "unavailable");
	}

	try {
		storage.setItem(
			getPublicCartKey(
				parsedCart.data.restaurantSlug,
				parsedCart.data.branchSlug,
			),
			JSON.stringify(parsedCart.data),
		);
		return createStorageResult(parsedCart.data, "persistent", "saved");
	} catch {
		return createStorageResult(parsedCart.data, "memory", "unavailable");
	}
}

export function removePublicCart(
	restaurantSlug: string,
	branchSlug: string,
	{
		storage = getDefaultPublicCartStorage(),
	}: Pick<PublicCartStorageOptions, "storage"> = {},
): PublicCartStorageResult {
	if (!storage) {
		return createStorageResult(null, "memory", "unavailable");
	}

	try {
		storage.removeItem(getPublicCartKey(restaurantSlug, branchSlug));
		return createStorageResult(null, "persistent", "removed");
	} catch {
		return createStorageResult(null, "memory", "unavailable");
	}
}

export function getDefaultPublicCartStorage(): PublicCartStorageAdapter | null {
	try {
		return globalThis.localStorage ?? null;
	} catch {
		return null;
	}
}

function parseStoredCart(
	rawValue: string,
): z.ZodSafeParseResult<StoredPublicCart> {
	try {
		return storedPublicCartSchema.safeParse(JSON.parse(rawValue));
	} catch {
		return storedPublicCartSchema.safeParse(null);
	}
}

function removeStoredCart(
	storage: PublicCartStorageAdapter,
	key: string,
): void {
	try {
		storage.removeItem(key);
	} catch {
		// La lectura sigue siendo segura aunque no se pueda limpiar el valor inválido.
	}
}

function createStorageResult(
	cart: StoredPublicCart | null,
	persistence: PublicCartPersistence,
	reason: PublicCartStorageReason,
): PublicCartStorageResult {
	return { cart, persistence, reason };
}
