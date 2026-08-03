export interface BeforeUnloadTarget {
	addEventListener(
		type: "beforeunload",
		listener: (event: BeforeUnloadEvent) => void,
	): void;
	removeEventListener(
		type: "beforeunload",
		listener: (event: BeforeUnloadEvent) => void,
	): void;
}

export interface UnsavedChangesGuard {
	getSnapshot(): boolean;
	setDirty(isDirty: boolean): void;
	subscribe(listener: () => void): () => void;
	confirmNavigation(confirm: () => Promise<boolean>): Promise<boolean>;
}

export function createUnsavedChangesGuard(): UnsavedChangesGuard {
	let isDirty = false;
	const listeners = new Set<() => void>();

	const notify = (): void => {
		for (const listener of listeners) listener();
	};

	return {
		getSnapshot: () => isDirty,
		setDirty: (nextIsDirty) => {
			if (isDirty === nextIsDirty) return;
			isDirty = nextIsDirty;
			notify();
		},
		subscribe: (listener) => {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
		confirmNavigation: async (confirm) => (isDirty ? confirm() : true),
	};
}

export function attachUnsavedChangesBeforeUnload(
	guard: UnsavedChangesGuard,
	target: BeforeUnloadTarget,
): () => void {
	const handleBeforeUnload = (event: BeforeUnloadEvent): void => {
		if (!guard.getSnapshot()) return;

		event.preventDefault();
		event.returnValue = "";
	};

	target.addEventListener("beforeunload", handleBeforeUnload);
	return () => target.removeEventListener("beforeunload", handleBeforeUnload);
}
