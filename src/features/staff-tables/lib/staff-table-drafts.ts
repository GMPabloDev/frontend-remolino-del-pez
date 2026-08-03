import { z } from "zod";

export const STAFF_TABLE_DRAFT_VERSION = 1;
export const STAFF_TABLE_DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const STAFF_TABLE_DRAFT_KEY_PREFIX = "staff-table-draft:v1:";

export const tableDraftSectionSchema = z.enum(["new", "details"]);
export type TableDraftSection = z.infer<typeof tableDraftSectionSchema>;

export interface StoredStaffTableDraft<TValues> {
	version: typeof STAFF_TABLE_DRAFT_VERSION;
	userId: string;
	branchId: string;
	tableId: string | null;
	section: TableDraftSection;
	baseUpdatedAt: string | null;
	savedAt: string;
	expiresAt: string;
	values: TValues;
}

export interface StaffTableDraftStorage {
	readonly length: number;
	getItem(key: string): string | null;
	setItem(key: string, value: string): void;
	removeItem(key: string): void;
	key(index: number): string | null;
}

interface SaveStaffTableDraftInput<TValues> {
	userId: string;
	branchId: string;
	tableId: string | null;
	section: TableDraftSection;
	baseUpdatedAt: string | null;
	values: TValues;
	now?: Date;
	storage?: StaffTableDraftStorage;
	valuesSchema: z.ZodType<TValues>;
}

interface ReadStaffTableDraftInput<TValues> {
	userId: string;
	branchId: string;
	tableId: string | null;
	section: TableDraftSection;
	now?: Date;
	storage?: StaffTableDraftStorage;
	valuesSchema: z.ZodType<TValues>;
}

const storedTableDraftMetadataSchema = z.object({
	version: z.literal(STAFF_TABLE_DRAFT_VERSION),
	userId: z.string().min(1),
	branchId: z.uuid(),
	tableId: z.uuid().nullable(),
	section: tableDraftSectionSchema,
	baseUpdatedAt: z.iso.datetime({ offset: true }).nullable(),
	savedAt: z.iso.datetime({ offset: true }),
	expiresAt: z.iso.datetime({ offset: true }),
});

export function getStaffTableDraftKey(
	userId: string,
	branchId: string,
	tableId: string | null,
	section: TableDraftSection,
): string {
	if (tableId === null) {
		if (section !== "new") {
			throw new Error("Un borrador nuevo solo puede usar la sección new.");
		}

		return `${STAFF_TABLE_DRAFT_KEY_PREFIX}${userId}:${branchId}:new`;
	}

	if (section === "new") {
		throw new Error("Una mesa existente no puede usar la sección new.");
	}

	return `${STAFF_TABLE_DRAFT_KEY_PREFIX}${userId}:${branchId}:${tableId}:details`;
}

export function saveStaffTableDraft<TValues>({
	userId,
	branchId,
	tableId,
	section,
	baseUpdatedAt,
	values,
	now = new Date(),
	storage = getDefaultDraftStorage(),
	valuesSchema,
}: SaveStaffTableDraftInput<TValues>): boolean {
	if (!storage) return false;

	const parsedValues = valuesSchema.safeParse(values);
	if (!parsedValues.success) return false;

	const savedAt = now.toISOString();
	const draft: StoredStaffTableDraft<TValues> = {
		version: STAFF_TABLE_DRAFT_VERSION,
		userId,
		branchId,
		tableId,
		section,
		baseUpdatedAt,
		savedAt,
		expiresAt: new Date(now.getTime() + STAFF_TABLE_DRAFT_TTL_MS).toISOString(),
		values: parsedValues.data,
	};

	try {
		storage.setItem(
			getStaffTableDraftKey(userId, branchId, tableId, section),
			JSON.stringify(draft),
		);
		return true;
	} catch {
		return false;
	}
}

export function readStaffTableDraft<TValues>({
	userId,
	branchId,
	tableId,
	section,
	now = new Date(),
	storage = getDefaultDraftStorage(),
	valuesSchema,
}: ReadStaffTableDraftInput<TValues>): StoredStaffTableDraft<TValues> | null {
	if (!storage) return null;

	const key = getStaffTableDraftKey(userId, branchId, tableId, section);
	let rawDraft: string | null;

	try {
		rawDraft = storage.getItem(key);
	} catch {
		return null;
	}

	if (!rawDraft) return null;

	try {
		const parsedDraft = JSON.parse(rawDraft) as unknown;
		const metadata = storedTableDraftMetadataSchema.safeParse(parsedDraft);

		if (!metadata.success) {
			storage.removeItem(key);
			return null;
		}

		if (
			metadata.data.userId !== userId ||
			metadata.data.branchId !== branchId ||
			metadata.data.tableId !== tableId ||
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

export function removeStaffTableDraft(
	userId: string,
	branchId: string,
	tableId: string | null,
	section: TableDraftSection,
	storage: StaffTableDraftStorage | undefined = getDefaultDraftStorage(),
): void {
	if (!storage) return;

	try {
		storage.removeItem(
			getStaffTableDraftKey(userId, branchId, tableId, section),
		);
	} catch {
		return;
	}
}

export function removeAllStaffTableDrafts(
	userId: string,
	storage: StaffTableDraftStorage | undefined = getDefaultDraftStorage(),
): void {
	if (!storage) return;

	const userPrefix = `${STAFF_TABLE_DRAFT_KEY_PREFIX}${userId}:`;
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

export function hasStaffTableDraftConflict(
	draft: Pick<StoredStaffTableDraft<unknown>, "tableId" | "baseUpdatedAt">,
	currentUpdatedAt: string,
): boolean {
	return draft.tableId !== null && draft.baseUpdatedAt !== currentUpdatedAt;
}

function getDefaultDraftStorage(): StaffTableDraftStorage | undefined {
	if (typeof window === "undefined") return undefined;

	try {
		return window.localStorage;
	} catch {
		return undefined;
	}
}
