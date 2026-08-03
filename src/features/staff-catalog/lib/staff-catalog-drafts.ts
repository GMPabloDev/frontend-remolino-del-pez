import { z } from "zod";

import type { BranchDishConfiguration } from "../contracts/staff-catalog.schemas";
import {
	type CatalogOrderItem,
	hasCatalogOrderConflict,
} from "./catalog-order";

export const STAFF_CATALOG_DRAFT_VERSION = 1;
export const STAFF_CATALOG_DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const STAFF_CATALOG_DRAFT_KEY_PREFIX = "staff-catalog-draft:v1:";

export const catalogDraftSectionSchema = z.enum([
	"category-new",
	"category-details",
	"category-order",
	"dish-new",
	"dish-details",
	"dish-order",
	"branch-configuration",
]);

export type CatalogDraftSection = z.infer<typeof catalogDraftSectionSchema>;

export interface StoredCatalogDraft<TValues, TBase> {
	version: typeof STAFF_CATALOG_DRAFT_VERSION;
	userId: string;
	section: CatalogDraftSection;
	resourceId: string | null;
	branchId: string | null;
	base: TBase;
	savedAt: string;
	expiresAt: string;
	values: TValues;
}

export interface StaffCatalogDraftStorage {
	readonly length: number;
	getItem(key: string): string | null;
	setItem(key: string, value: string): void;
	removeItem(key: string): void;
	key(index: number): string | null;
}

interface SaveStaffCatalogDraftInput<TValues, TBase> {
	userId: string;
	section: CatalogDraftSection;
	resourceId?: string | null;
	branchId?: string | null;
	base: TBase;
	values: TValues;
	now?: Date;
	storage?: StaffCatalogDraftStorage;
	valuesSchema: z.ZodType<TValues>;
	baseSchema: z.ZodType<TBase>;
}

interface ReadStaffCatalogDraftInput<TValues, TBase> {
	userId: string;
	section: CatalogDraftSection;
	resourceId?: string | null;
	branchId?: string | null;
	now?: Date;
	storage?: StaffCatalogDraftStorage;
	valuesSchema: z.ZodType<TValues>;
	baseSchema: z.ZodType<TBase>;
}

const storedCatalogDraftMetadataSchema = z.object({
	version: z.literal(STAFF_CATALOG_DRAFT_VERSION),
	userId: z.string().min(1),
	section: catalogDraftSectionSchema,
	resourceId: z.uuid().nullable(),
	branchId: z.uuid().nullable(),
	base: z.unknown(),
	savedAt: z.iso.datetime({ offset: true }),
	expiresAt: z.iso.datetime({ offset: true }),
	values: z.unknown(),
});

export function getStaffCatalogDraftKey(
	userId: string,
	section: CatalogDraftSection,
	resourceId: string | null = null,
	branchId: string | null = null,
): string {
	validateDraftContext(section, resourceId, branchId);

	switch (section) {
		case "category-new":
			return `${STAFF_CATALOG_DRAFT_KEY_PREFIX}${userId}:category:new`;
		case "category-details":
			return `${STAFF_CATALOG_DRAFT_KEY_PREFIX}${userId}:category:${resourceId}:details`;
		case "category-order":
			return `${STAFF_CATALOG_DRAFT_KEY_PREFIX}${userId}:category:order`;
		case "dish-new":
			return `${STAFF_CATALOG_DRAFT_KEY_PREFIX}${userId}:dish:new`;
		case "dish-details":
			return `${STAFF_CATALOG_DRAFT_KEY_PREFIX}${userId}:dish:${resourceId}:details`;
		case "dish-order":
			return `${STAFF_CATALOG_DRAFT_KEY_PREFIX}${userId}:dish:${resourceId}:order`;
		case "branch-configuration":
			return `${STAFF_CATALOG_DRAFT_KEY_PREFIX}${userId}:branch:${branchId}:dish:${resourceId}:configuration`;
	}
}

export function saveStaffCatalogDraft<TValues, TBase>({
	userId,
	section,
	resourceId = null,
	branchId = null,
	base,
	values,
	now = new Date(),
	storage = getDefaultDraftStorage(),
	valuesSchema,
	baseSchema,
}: SaveStaffCatalogDraftInput<TValues, TBase>): boolean {
	if (!storage) return false;

	const parsedValues = valuesSchema.safeParse(values);
	const parsedBase = baseSchema.safeParse(base);
	if (!parsedValues.success || !parsedBase.success) return false;

	const savedAt = now.toISOString();
	const draft: StoredCatalogDraft<TValues, TBase> = {
		version: STAFF_CATALOG_DRAFT_VERSION,
		userId,
		section,
		resourceId,
		branchId,
		base: parsedBase.data,
		savedAt,
		expiresAt: new Date(
			now.getTime() + STAFF_CATALOG_DRAFT_TTL_MS,
		).toISOString(),
		values: parsedValues.data,
	};

	try {
		storage.setItem(
			getStaffCatalogDraftKey(userId, section, resourceId, branchId),
			JSON.stringify(draft),
		);
		return true;
	} catch {
		return false;
	}
}

export function readStaffCatalogDraft<TValues, TBase>({
	userId,
	section,
	resourceId = null,
	branchId = null,
	now = new Date(),
	storage = getDefaultDraftStorage(),
	valuesSchema,
	baseSchema,
}: ReadStaffCatalogDraftInput<TValues, TBase>): StoredCatalogDraft<
	TValues,
	TBase
> | null {
	if (!storage) return null;

	const key = getStaffCatalogDraftKey(userId, section, resourceId, branchId);
	let rawDraft: string | null;

	try {
		rawDraft = storage.getItem(key);
	} catch {
		return null;
	}

	if (!rawDraft) return null;

	try {
		const parsedDraft = JSON.parse(rawDraft) as unknown;
		const metadata = storedCatalogDraftMetadataSchema.safeParse(parsedDraft);

		if (!metadata.success) {
			removeDraftSafely(storage, key);
			return null;
		}

		if (
			metadata.data.userId !== userId ||
			metadata.data.section !== section ||
			metadata.data.resourceId !== resourceId ||
			metadata.data.branchId !== branchId
		) {
			removeDraftSafely(storage, key);
			return null;
		}

		if (new Date(metadata.data.expiresAt).getTime() <= now.getTime()) {
			removeDraftSafely(storage, key);
			return null;
		}

		const values = valuesSchema.safeParse(metadata.data.values);
		const base = baseSchema.safeParse(metadata.data.base);
		if (!values.success || !base.success) {
			removeDraftSafely(storage, key);
			return null;
		}

		return {
			version: metadata.data.version,
			userId: metadata.data.userId,
			section: metadata.data.section,
			resourceId: metadata.data.resourceId,
			branchId: metadata.data.branchId,
			base: base.data,
			savedAt: metadata.data.savedAt,
			expiresAt: metadata.data.expiresAt,
			values: values.data,
		};
	} catch {
		removeDraftSafely(storage, key);
		return null;
	}
}

export function removeStaffCatalogDraft(
	userId: string,
	section: CatalogDraftSection,
	resourceId: string | null = null,
	branchId: string | null = null,
	storage: StaffCatalogDraftStorage | undefined = getDefaultDraftStorage(),
): void {
	if (!storage) return;

	try {
		storage.removeItem(
			getStaffCatalogDraftKey(userId, section, resourceId, branchId),
		);
	} catch {
		return;
	}
}

export function removeAllStaffCatalogDrafts(
	userId: string,
	storage: StaffCatalogDraftStorage | undefined = getDefaultDraftStorage(),
): void {
	if (!storage) return;

	const userPrefix = `${STAFF_CATALOG_DRAFT_KEY_PREFIX}${userId}:`;
	const keys: string[] = [];

	try {
		for (let index = 0; index < storage.length; index += 1) {
			const key = storage.key(index);
			if (key?.startsWith(userPrefix)) keys.push(key);
		}

		for (const key of keys) storage.removeItem(key);
	} catch {
		return;
	}
}

export function hasCatalogUpdatedAtConflict(
	baseUpdatedAt: string,
	currentUpdatedAt: string,
): boolean {
	return baseUpdatedAt !== currentUpdatedAt;
}

export function hasBranchDishConfigurationConflict(
	base: BranchDishConfiguration | null,
	current: BranchDishConfiguration | null,
): boolean {
	if (base === null || current === null) return base !== current;
	return base.price !== current.price || base.status !== current.status;
}

export function hasCatalogDraftOrderConflict(
	baseOrder: ReadonlyArray<CatalogOrderItem>,
	currentOrder: ReadonlyArray<CatalogOrderItem>,
): boolean {
	return hasCatalogOrderConflict(baseOrder, currentOrder);
}

function validateDraftContext(
	section: CatalogDraftSection,
	resourceId: string | null,
	branchId: string | null,
): void {
	const requiresResource =
		section === "category-details" ||
		section === "dish-details" ||
		section === "dish-order" ||
		section === "branch-configuration";
	const requiresBranch = section === "branch-configuration";

	if (requiresResource !== (resourceId !== null)) {
		throw new Error("El contexto del borrador no coincide con su sección.");
	}
	if (requiresBranch !== (branchId !== null)) {
		throw new Error("La sección de borrador requiere una sucursal diferente.");
	}
}

function removeDraftSafely(
	storage: StaffCatalogDraftStorage,
	key: string,
): void {
	try {
		storage.removeItem(key);
	} catch {
		return;
	}
}

function getDefaultDraftStorage(): StaffCatalogDraftStorage | undefined {
	if (typeof window === "undefined") return undefined;

	try {
		return window.localStorage;
	} catch {
		return undefined;
	}
}
