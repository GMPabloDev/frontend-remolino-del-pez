import { describe, expect, test } from "bun:test";

import {
	attachUnsavedChangesBeforeUnload,
	createUnsavedChangesGuard,
} from "../src/features/staff-branches/lib/staff-branch-unsaved-changes";

describe("unsaved branch changes guard", () => {
	test("confirms navigation only while changes are pending", async () => {
		const guard = createUnsavedChangesGuard();
		let confirmations = 0;
		const confirm = async () => {
			confirmations += 1;
			return true;
		};

		expect(await guard.confirmNavigation(confirm)).toBe(true);
		expect(confirmations).toBe(0);

		guard.setDirty(true);
		expect(await guard.confirmNavigation(confirm)).toBe(true);
		expect(confirmations).toBe(1);
	});

	test("notifies subscribers when the dirty state changes", () => {
		const guard = createUnsavedChangesGuard();
		let notifications = 0;
		const unsubscribe = guard.subscribe(() => {
			notifications += 1;
		});

		guard.setDirty(true);
		guard.setDirty(true);
		guard.setDirty(false);
		unsubscribe();
		guard.setDirty(true);

		expect(notifications).toBe(2);
	});

	test("blocks beforeunload only when the guard is dirty", () => {
		const guard = createUnsavedChangesGuard();
		let listener: ((event: BeforeUnloadEvent) => void) | undefined;
		const target = {
			addEventListener: (
				_type: "beforeunload",
				nextListener: (event: BeforeUnloadEvent) => void,
			) => {
				listener = nextListener;
			},
			removeEventListener: () => undefined,
		};
		const cleanup = attachUnsavedChangesBeforeUnload(guard, target);
		const cleanEvent = {
			preventDefault: () => undefined,
			returnValue: "original",
		} as BeforeUnloadEvent;

		listener?.(cleanEvent);
		expect(cleanEvent.returnValue).toBe("original");

		guard.setDirty(true);
		const dirtyEvent = {
			preventDefault: () => undefined,
			returnValue: "original",
		} as BeforeUnloadEvent;
		listener?.(dirtyEvent);
		expect(dirtyEvent.returnValue).toBe("");
		cleanup();
	});
});
