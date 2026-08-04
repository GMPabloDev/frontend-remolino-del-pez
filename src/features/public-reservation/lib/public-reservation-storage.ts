import type { z } from "zod";
import type { StoredPublicCart } from "../../public-cart/contracts/public-cart.schemas";
import {
	type PublicReservationCartHandoff,
	publicReservationCartHandoffSchema,
	type StoredPublicReservation,
	storedPublicReservationSchema,
	type TemporaryReservationResponse,
} from "../contracts/public-reservation.schemas";

export const PUBLIC_RESERVATION_VERSION = 1;
export const PUBLIC_RESERVATION_KEY_PREFIX = "public-reservation:v1:";
export const PUBLIC_RESERVATION_CART_HANDOFF_KEY_PREFIX =
	"public-reservation-cart-handoff:v1:";

export interface PublicReservationStorageAdapter {
	getItem(key: string): string | null;
	setItem(key: string, value: string): void;
	removeItem(key: string): void;
}

export type PublicReservationPersistence = "persistent" | "memory";
export type PublicReservationStorageReason =
	| "available"
	| "empty"
	| "expired"
	| "invalid"
	| "unavailable"
	| "saved"
	| "removed";

export interface PublicReservationStorageResult<T> {
	value: T | null;
	persistence: PublicReservationPersistence;
	reason: PublicReservationStorageReason;
}

interface PublicReservationStorageOptions {
	now?: Date;
	storage?: PublicReservationStorageAdapter | null;
}

export function getPublicReservationKey(
	restaurantSlug: string,
	branchSlug: string,
): string {
	return `${PUBLIC_RESERVATION_KEY_PREFIX}${restaurantSlug}:${branchSlug}`;
}

export function getPublicReservationCartHandoffKey(
	restaurantSlug: string,
	branchSlug: string,
): string {
	return `${PUBLIC_RESERVATION_CART_HANDOFF_KEY_PREFIX}${restaurantSlug}:${branchSlug}`;
}

export function createStoredPublicReservation(
	restaurantSlug: string,
	branchSlug: string,
	reservation: TemporaryReservationResponse,
	now = new Date(),
): StoredPublicReservation {
	return storedPublicReservationSchema.parse({
		...reservation,
		version: PUBLIC_RESERVATION_VERSION,
		restaurantSlug,
		branchSlug,
		savedAt: now.toISOString(),
	});
}

export function readPublicReservation(
	restaurantSlug: string,
	branchSlug: string,
	{
		now = new Date(),
		storage = getDefaultPublicReservationStorage(),
	}: PublicReservationStorageOptions = {},
): PublicReservationStorageResult<StoredPublicReservation> {
	return readStoredValue(
		getPublicReservationKey(restaurantSlug, branchSlug),
		restaurantSlug,
		branchSlug,
		storedPublicReservationSchema,
		(value) => value.expiresAt,
		{ now, storage },
	);
}

export function writePublicReservation(
	reservation: StoredPublicReservation,
	{
		storage = getDefaultPublicReservationStorage(),
	}: Pick<PublicReservationStorageOptions, "storage"> = {},
): PublicReservationStorageResult<StoredPublicReservation> {
	return writeStoredValue(
		reservation,
		storedPublicReservationSchema,
		getPublicReservationKey(reservation.restaurantSlug, reservation.branchSlug),
		storage,
	);
}

export function removePublicReservation(
	restaurantSlug: string,
	branchSlug: string,
	{
		storage = getDefaultPublicReservationStorage(),
	}: Pick<PublicReservationStorageOptions, "storage"> = {},
): PublicReservationStorageResult<StoredPublicReservation> {
	return removeStoredValue(
		getPublicReservationKey(restaurantSlug, branchSlug),
		storage,
	);
}

export function createPublicReservationCartHandoff(
	restaurantSlug: string,
	branchSlug: string,
	cart: StoredPublicCart,
	now = new Date(),
): PublicReservationCartHandoff {
	if (
		cart.restaurantSlug !== restaurantSlug ||
		cart.branchSlug !== branchSlug
	) {
		throw new Error("The cart does not belong to the reservation context.");
	}

	return publicReservationCartHandoffSchema.parse({
		version: PUBLIC_RESERVATION_VERSION,
		restaurantSlug,
		branchSlug,
		createdAt: now.toISOString(),
		cart,
	});
}

export function readPublicReservationCartHandoff(
	restaurantSlug: string,
	branchSlug: string,
	{
		now = new Date(),
		storage = getDefaultPublicReservationStorage(),
	}: PublicReservationStorageOptions = {},
): PublicReservationStorageResult<PublicReservationCartHandoff> {
	return readStoredValue(
		getPublicReservationCartHandoffKey(restaurantSlug, branchSlug),
		restaurantSlug,
		branchSlug,
		publicReservationCartHandoffSchema,
		(value) => value.cart.expiresAt,
		{ now, storage },
	);
}

export function writePublicReservationCartHandoff(
	handoff: PublicReservationCartHandoff,
	{
		storage = getDefaultPublicReservationStorage(),
	}: Pick<PublicReservationStorageOptions, "storage"> = {},
): PublicReservationStorageResult<PublicReservationCartHandoff> {
	return writeStoredValue(
		handoff,
		publicReservationCartHandoffSchema,
		getPublicReservationCartHandoffKey(
			handoff.restaurantSlug,
			handoff.branchSlug,
		),
		storage,
	);
}

export function removePublicReservationCartHandoff(
	restaurantSlug: string,
	branchSlug: string,
	{
		storage = getDefaultPublicReservationStorage(),
	}: Pick<PublicReservationStorageOptions, "storage"> = {},
): PublicReservationStorageResult<PublicReservationCartHandoff> {
	return removeStoredValue(
		getPublicReservationCartHandoffKey(restaurantSlug, branchSlug),
		storage,
	);
}

export function getDefaultPublicReservationStorage(): PublicReservationStorageAdapter | null {
	try {
		return globalThis.sessionStorage ?? null;
	} catch {
		return null;
	}
}

function readStoredValue<T>(
	key: string,
	restaurantSlug: string,
	branchSlug: string,
	schema: z.ZodType<T>,
	getExpiresAt: (value: T) => string,
	{
		now,
		storage,
	}: Required<Pick<PublicReservationStorageOptions, "now" | "storage">>,
): PublicReservationStorageResult<T> {
	if (!storage) {
		return createStorageResult<T>(null, "memory", "unavailable");
	}

	let rawValue: string | null;

	try {
		rawValue = storage.getItem(key);
	} catch {
		return createStorageResult<T>(null, "memory", "unavailable");
	}

	if (rawValue === null) {
		return createStorageResult<T>(null, "persistent", "empty");
	}

	const parsedValue = parseStoredValue(rawValue, schema);
	if (!parsedValue.success) {
		removeStoredValueByKey(storage, key);
		return createStorageResult<T>(null, "persistent", "invalid");
	}

	if (!belongsToContext(parsedValue.data, restaurantSlug, branchSlug)) {
		removeStoredValueByKey(storage, key);
		return createStorageResult<T>(null, "persistent", "invalid");
	}

	if (new Date(getExpiresAt(parsedValue.data)).getTime() <= now.getTime()) {
		removeStoredValueByKey(storage, key);
		return createStorageResult<T>(null, "persistent", "expired");
	}

	return createStorageResult(parsedValue.data, "persistent", "available");
}

function writeStoredValue<T>(
	value: T,
	schema: z.ZodType<T>,
	key: string,
	storage: PublicReservationStorageAdapter | null | undefined,
): PublicReservationStorageResult<T> {
	const parsedValue = schema.safeParse(value);
	if (!parsedValue.success) {
		return createStorageResult<T>(null, "memory", "invalid");
	}

	if (!storage) {
		return createStorageResult(parsedValue.data, "memory", "unavailable");
	}

	try {
		storage.setItem(key, JSON.stringify(parsedValue.data));
		return createStorageResult(parsedValue.data, "persistent", "saved");
	} catch {
		return createStorageResult(parsedValue.data, "memory", "unavailable");
	}
}

function removeStoredValue<T>(
	key: string,
	storage: PublicReservationStorageAdapter | null | undefined,
): PublicReservationStorageResult<T> {
	if (!storage) {
		return createStorageResult<T>(null, "memory", "unavailable");
	}

	try {
		storage.removeItem(key);
		return createStorageResult<T>(null, "persistent", "removed");
	} catch {
		return createStorageResult<T>(null, "memory", "unavailable");
	}
}

function parseStoredValue<T>(
	rawValue: string,
	schema: z.ZodType<T>,
): z.ZodSafeParseResult<T> {
	try {
		return schema.safeParse(JSON.parse(rawValue));
	} catch {
		return schema.safeParse(null);
	}
}

function removeStoredValueByKey(
	storage: PublicReservationStorageAdapter,
	key: string,
): void {
	try {
		storage.removeItem(key);
	} catch {
		// El valor inválido no debe romper la navegación pública.
	}
}

function belongsToContext(
	value: unknown,
	restaurantSlug: string,
	branchSlug: string,
): boolean {
	if (!value || typeof value !== "object") return false;

	const contextualValue = value as {
		restaurantSlug?: unknown;
		branchSlug?: unknown;
	};

	return (
		contextualValue.restaurantSlug === restaurantSlug &&
		contextualValue.branchSlug === branchSlug
	);
}

function createStorageResult<T>(
	value: T | null,
	persistence: PublicReservationPersistence,
	reason: PublicReservationStorageReason,
): PublicReservationStorageResult<T> {
	return { value, persistence, reason };
}
