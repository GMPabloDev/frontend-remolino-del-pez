import { z } from "zod";

import type { BranchDraftSection } from "../contracts/staff-branch.schemas";

export const BRANCH_DRAFT_VERSION = 1;
export const BRANCH_DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const BRANCH_DRAFT_KEY_PREFIX = "staff-branch-draft:v1:";

export interface StoredBranchDraft<TValues> {
	version: typeof BRANCH_DRAFT_VERSION;
	userId: string;
	branchId: string | null;
	section: BranchDraftSection;
	baseUpdatedAt: string | null;
	savedAt: string;
	expiresAt: string;
	values: TValues;
}

export interface BranchDraftStorage {
	readonly length: number;
	getItem(key: string): string | null;
	setItem(key: string, value: string): void;
	removeItem(key: string): void;
	key(index: number): string | null;
}

interface SaveBranchDraftInput<TValues> {
	userId: string;
	branchId: string | null;
	section: BranchDraftSection;
	baseUpdatedAt: string | null;
	values: TValues;
	now?: Date;
	storage?: BranchDraftStorage;
	valuesSchema: z.ZodType<TValues>;
}

interface ReadBranchDraftInput<TValues> {
	userId: string;
	branchId: string | null;
	section: BranchDraftSection;
	now?: Date;
	storage?: BranchDraftStorage;
	valuesSchema: z.ZodType<TValues>;
}

const storedDraftMetadataSchema = z.object({
	version: z.literal(BRANCH_DRAFT_VERSION),
	userId: z.string().min(1),
	branchId: z.uuid().nullable(),
	section: z.enum(["new", "details", "rules", "schedule"]),
	baseUpdatedAt: z.iso.datetime({ offset: true }).nullable(),
	savedAt: z.iso.datetime({ offset: true }),
	expiresAt: z.iso.datetime({ offset: true }),
});

export function getBranchDraftKey(
	userId: string,
	branchId: string | null,
	section: BranchDraftSection,
): string {
	if (branchId === null) {
		if (section !== "new") {
			throw new Error("Un borrador nuevo solo puede usar la sección new.");
		}

		return `${BRANCH_DRAFT_KEY_PREFIX}${userId}:new`;
	}

	if (section === "new") {
		throw new Error("Una sucursal existente no puede usar la sección new.");
	}

	return `${BRANCH_DRAFT_KEY_PREFIX}${userId}:${branchId}:${section}`;
}

export function saveBranchDraft<TValues>({
	userId,
	branchId,
	section,
	baseUpdatedAt,
	values,
	now = new Date(),
	storage = getDefaultDraftStorage(),
	valuesSchema,
}: SaveBranchDraftInput<TValues>): boolean {
	if (!storage) return false;

	const parsedValues = valuesSchema.safeParse(values);
	if (!parsedValues.success) return false;

	const savedAt = now.toISOString();
	const draft: StoredBranchDraft<TValues> = {
		version: BRANCH_DRAFT_VERSION,
		userId,
		branchId,
		section,
		baseUpdatedAt,
		savedAt,
		expiresAt: new Date(now.getTime() + BRANCH_DRAFT_TTL_MS).toISOString(),
		values: parsedValues.data,
	};

	try {
		storage.setItem(
			getBranchDraftKey(userId, branchId, section),
			JSON.stringify(draft),
		);
		return true;
	} catch {
		return false;
	}
}

export function readBranchDraft<TValues>({
	userId,
	branchId,
	section,
	now = new Date(),
	storage = getDefaultDraftStorage(),
	valuesSchema,
}: ReadBranchDraftInput<TValues>): StoredBranchDraft<TValues> | null {
	if (!storage) return null;

	const key = getBranchDraftKey(userId, branchId, section);
	let rawDraft: string | null;

	try {
		rawDraft = storage.getItem(key);
	} catch {
		return null;
	}

	if (!rawDraft) return null;

	try {
		const parsedDraft = JSON.parse(rawDraft) as unknown;
		const metadata = storedDraftMetadataSchema.safeParse(parsedDraft);

		if (!metadata.success) {
			storage.removeItem(key);
			return null;
		}

		if (
			metadata.data.userId !== userId ||
			metadata.data.branchId !== branchId ||
			metadata.data.section !== section
		) {
			storage.removeItem(key);
			return null;
		}

		if (new Date(metadata.data.expiresAt).getTime() <= now.getTime()) {
			storage.removeItem(key);
			return null;
		}

		const values = valuesSchema.safeParse(
			(parsedDraft as { values?: unknown }).values,
		);
		if (!values.success) {
			storage.removeItem(key);
			return null;
		}

		return {
			...metadata.data,
			values: values.data,
		};
	} catch {
		try {
			storage.removeItem(key);
		} catch {
			return null;
		}

		return null;
	}
}

export function removeBranchDraft(
	userId: string,
	branchId: string | null,
	section: BranchDraftSection,
	storage: BranchDraftStorage | undefined = getDefaultDraftStorage(),
): void {
	if (!storage) return;

	try {
		storage.removeItem(getBranchDraftKey(userId, branchId, section));
	} catch {
		return;
	}
}

export function removeAllBranchDrafts(
	userId: string,
	storage: BranchDraftStorage | undefined = getDefaultDraftStorage(),
): void {
	if (!storage) return;

	const userPrefix = `${BRANCH_DRAFT_KEY_PREFIX}${userId}:`;
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

export function hasBranchDraftConflict(
	draft: Pick<StoredBranchDraft<unknown>, "branchId" | "baseUpdatedAt">,
	currentUpdatedAt: string,
): boolean {
	return draft.branchId !== null && draft.baseUpdatedAt !== currentUpdatedAt;
}

function getDefaultDraftStorage(): BranchDraftStorage | undefined {
	if (typeof window === "undefined") return undefined;

	try {
		return window.localStorage;
	} catch {
		return undefined;
	}
}
