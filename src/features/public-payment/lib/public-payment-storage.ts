import type { z } from "zod";
import {
	type CurrentPublicPaymentConfirmation,
	currentPublicPaymentConfirmationSchema,
	type PublicCheckoutReturn,
	publicCheckoutReturnSchema,
	type StoredPublicPaymentConfirmation,
	storedPublicPaymentConfirmationSchema,
} from "../contracts/public-payment.schemas";

export const PUBLIC_CHECKOUT_RETURN_KEY = "public-checkout-return:v1";
export const PUBLIC_PAYMENT_CONFIRMATION_KEY_PREFIX =
	"public-payment-confirmation:v1:";
export const PUBLIC_PAYMENT_CONFIRMATION_CURRENT_KEY =
	"public-payment-confirmation-current:v1";

export interface PublicPaymentStorageAdapter {
	getItem(key: string): string | null;
	setItem(key: string, value: string): void;
	removeItem(key: string): void;
}

export type PublicPaymentPersistence = "persistent" | "memory";
export type PublicPaymentStorageReason =
	| "available"
	| "empty"
	| "expired"
	| "invalid"
	| "unavailable"
	| "saved"
	| "removed";

export interface PublicPaymentStorageResult<T> {
	value: T | null;
	persistence: PublicPaymentPersistence;
	reason: PublicPaymentStorageReason;
}

interface PublicPaymentStorageOptions {
	now?: Date;
	storage?: PublicPaymentStorageAdapter | null;
}

export function getPublicPaymentConfirmationKey(
	restaurantSlug: string,
	branchSlug: string,
): string {
	return `${PUBLIC_PAYMENT_CONFIRMATION_KEY_PREFIX}${restaurantSlug}:${branchSlug}`;
}

export function readPublicCheckoutReturn({
	now = new Date(),
	storage = getDefaultPublicPaymentStorage(),
}: PublicPaymentStorageOptions = {}): PublicPaymentStorageResult<PublicCheckoutReturn> {
	return readStoredValue(
		PUBLIC_CHECKOUT_RETURN_KEY,
		publicCheckoutReturnSchema,
		(value) => value.reservationExpiresAt,
		{ now, storage },
	);
}

export function writePublicCheckoutReturn(
	checkoutReturn: PublicCheckoutReturn,
	{
		storage = getDefaultPublicPaymentStorage(),
	}: Pick<PublicPaymentStorageOptions, "storage"> = {},
): PublicPaymentStorageResult<PublicCheckoutReturn> {
	return writeStoredValue(
		PUBLIC_CHECKOUT_RETURN_KEY,
		checkoutReturn,
		publicCheckoutReturnSchema,
		storage,
	);
}

export function removePublicCheckoutReturn({
	storage = getDefaultPublicPaymentStorage(),
}: Pick<
	PublicPaymentStorageOptions,
	"storage"
> = {}): PublicPaymentStorageResult<PublicCheckoutReturn> {
	return removeStoredValue(PUBLIC_CHECKOUT_RETURN_KEY, storage);
}

export function readPublicPaymentConfirmation(
	restaurantSlug: string,
	branchSlug: string,
	{
		storage = getDefaultPublicPaymentStorage(),
	}: Pick<PublicPaymentStorageOptions, "storage"> = {},
): PublicPaymentStorageResult<StoredPublicPaymentConfirmation> {
	return readContextualStoredValue(
		getPublicPaymentConfirmationKey(restaurantSlug, branchSlug),
		restaurantSlug,
		branchSlug,
		storedPublicPaymentConfirmationSchema,
		storage,
	);
}

export function writePublicPaymentConfirmation(
	confirmation: StoredPublicPaymentConfirmation,
	{
		storage = getDefaultPublicPaymentStorage(),
	}: Pick<PublicPaymentStorageOptions, "storage"> = {},
): PublicPaymentStorageResult<StoredPublicPaymentConfirmation> {
	return writeStoredValue(
		getPublicPaymentConfirmationKey(
			confirmation.restaurantSlug,
			confirmation.branchSlug,
		),
		confirmation,
		storedPublicPaymentConfirmationSchema,
		storage,
	);
}

export function removePublicPaymentConfirmation(
	restaurantSlug: string,
	branchSlug: string,
	{
		storage = getDefaultPublicPaymentStorage(),
	}: Pick<PublicPaymentStorageOptions, "storage"> = {},
): PublicPaymentStorageResult<StoredPublicPaymentConfirmation> {
	return removeStoredValue(
		getPublicPaymentConfirmationKey(restaurantSlug, branchSlug),
		storage,
	);
}

export function readCurrentPublicPaymentConfirmation({
	storage = getDefaultPublicPaymentStorage(),
}: Pick<
	PublicPaymentStorageOptions,
	"storage"
> = {}): PublicPaymentStorageResult<CurrentPublicPaymentConfirmation> {
	return readStoredValue(
		PUBLIC_PAYMENT_CONFIRMATION_CURRENT_KEY,
		currentPublicPaymentConfirmationSchema,
		undefined,
		{
			storage,
			validate: (value) =>
				value.confirmationKey ===
				getPublicPaymentConfirmationKey(value.restaurantSlug, value.branchSlug),
		},
	);
}

export function writeCurrentPublicPaymentConfirmation(
	currentConfirmation: CurrentPublicPaymentConfirmation,
	{
		storage = getDefaultPublicPaymentStorage(),
	}: Pick<PublicPaymentStorageOptions, "storage"> = {},
): PublicPaymentStorageResult<CurrentPublicPaymentConfirmation> {
	return writeStoredValue(
		PUBLIC_PAYMENT_CONFIRMATION_CURRENT_KEY,
		currentConfirmation,
		currentPublicPaymentConfirmationSchema,
		storage,
		(value) =>
			value.confirmationKey ===
			getPublicPaymentConfirmationKey(value.restaurantSlug, value.branchSlug),
	);
}

export function removeCurrentPublicPaymentConfirmation({
	storage = getDefaultPublicPaymentStorage(),
}: Pick<
	PublicPaymentStorageOptions,
	"storage"
> = {}): PublicPaymentStorageResult<CurrentPublicPaymentConfirmation> {
	return removeStoredValue(PUBLIC_PAYMENT_CONFIRMATION_CURRENT_KEY, storage);
}

export function getDefaultPublicPaymentStorage(): PublicPaymentStorageAdapter | null {
	try {
		return globalThis.sessionStorage ?? null;
	} catch {
		return null;
	}
}

function readContextualStoredValue<T>(
	key: string,
	restaurantSlug: string,
	branchSlug: string,
	schema: z.ZodType<T>,
	storage: PublicPaymentStorageAdapter | null | undefined,
): PublicPaymentStorageResult<T> {
	return readStoredValue(key, schema, undefined, {
		storage,
		validate: (value) => belongsToContext(value, restaurantSlug, branchSlug),
	});
}

function readStoredValue<T>(
	key: string,
	schema: z.ZodType<T>,
	getExpiresAt?: (value: T) => string,
	{
		now = new Date(),
		storage,
		validate,
	}: PublicPaymentStorageOptions & {
		validate?: (value: T) => boolean;
	} = {},
): PublicPaymentStorageResult<T> {
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
	if (!parsedValue.success || (validate && !validate(parsedValue.data))) {
		removeStoredValueByKey(storage, key);
		return createStorageResult<T>(null, "persistent", "invalid");
	}

	if (getExpiresAt) {
		const expiresAt = Date.parse(getExpiresAt(parsedValue.data));
		if (!Number.isFinite(expiresAt) || expiresAt <= now.getTime()) {
			removeStoredValueByKey(storage, key);
			return createStorageResult<T>(null, "persistent", "expired");
		}
	}

	return createStorageResult(parsedValue.data, "persistent", "available");
}

function writeStoredValue<T>(
	key: string,
	value: T,
	schema: z.ZodType<T>,
	storage: PublicPaymentStorageAdapter | null | undefined,
	validate?: (value: T) => boolean,
): PublicPaymentStorageResult<T> {
	const parsedValue = schema.safeParse(value);
	if (!parsedValue.success || (validate && !validate(parsedValue.data))) {
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
	storage: PublicPaymentStorageAdapter | null | undefined,
): PublicPaymentStorageResult<T> {
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
	storage: PublicPaymentStorageAdapter,
	key: string,
): void {
	try {
		storage.removeItem(key);
	} catch {
		return;
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
	persistence: PublicPaymentPersistence,
	reason: PublicPaymentStorageReason,
): PublicPaymentStorageResult<T> {
	return { value, persistence, reason };
}
