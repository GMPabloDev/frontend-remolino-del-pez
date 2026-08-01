import { ApiClientError } from "@/lib/api/api-error";

export const STAFF_REFRESH_LOCK = "staff-auth:refresh-lock:v1";

const DEFAULT_LEASE_DURATION_MS = 30_000;
const DEFAULT_MAX_WAIT_MS = 10_000;
const DEFAULT_RETRY_INTERVAL_MS = 50;

interface StorageLike {
	getItem(key: string): string | null;
	setItem(key: string, value: string): void;
	removeItem(key: string): void;
}

interface LockManagerLike {
	request<T>(
		name: string,
		options: LockOptions,
		callback: () => Promise<T>,
	): Promise<T>;
}

interface RefreshCoordinatorOptions {
	lockManager?: LockManagerLike | null;
	storage?: StorageLike | null;
	now?: () => number;
	sleep?: (milliseconds: number) => Promise<void>;
	ownerId?: string;
	lockName?: string;
	leaseDurationMs?: number;
	maxWaitMs?: number;
	retryIntervalMs?: number;
}

export interface RefreshCoordinator {
	run<T>(operation: () => Promise<T>): Promise<T>;
}

interface RefreshLease {
	expiresAt: number;
	ownerId: string;
}

export function createRefreshCoordinator(
	options: RefreshCoordinatorOptions = {},
): RefreshCoordinator {
	const lockName = options.lockName ?? STAFF_REFRESH_LOCK;
	const now = options.now ?? Date.now;
	const sleep = options.sleep ?? defaultSleep;
	const ownerId = options.ownerId ?? createOwnerId();
	const lockManager = options.lockManager ?? getBrowserLockManager();
	const storage = options.storage ?? getBrowserStorage();
	const leaseDurationMs = options.leaseDurationMs ?? DEFAULT_LEASE_DURATION_MS;
	const maxWaitMs = options.maxWaitMs ?? DEFAULT_MAX_WAIT_MS;
	const retryIntervalMs = options.retryIntervalMs ?? DEFAULT_RETRY_INTERVAL_MS;
	let inFlight: Promise<unknown> | null = null;

	return {
		run<T>(operation: () => Promise<T>): Promise<T> {
			if (inFlight) {
				return inFlight as Promise<T>;
			}

			const current = runWithDocumentLock(operation, lockManager, storage, {
				lockName,
				now,
				sleep,
				ownerId,
				leaseDurationMs,
				maxWaitMs,
				retryIntervalMs,
			});
			const tracked = current.finally(() => {
				if (inFlight === tracked) {
					inFlight = null;
				}
			});
			inFlight = tracked;

			return tracked as Promise<T>;
		},
	};
}

async function runWithDocumentLock<T>(
	operation: () => Promise<T>,
	lockManager: LockManagerLike | null,
	storage: StorageLike | null,
	options: {
		lockName: string;
		now: () => number;
		sleep: (milliseconds: number) => Promise<void>;
		ownerId: string;
		leaseDurationMs: number;
		maxWaitMs: number;
		retryIntervalMs: number;
	},
): Promise<T> {
	if (lockManager) {
		return runWithWebLock(
			operation,
			lockManager,
			options.lockName,
			options.maxWaitMs,
		);
	}

	if (storage && isStorageAvailable(storage)) {
		return runWithStorageLease(operation, storage, options);
	}

	return operation();
}

async function runWithWebLock<T>(
	operation: () => Promise<T>,
	lockManager: LockManagerLike,
	lockName: string,
	maxWaitMs: number,
): Promise<T> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), maxWaitMs);

	try {
		return await lockManager.request(
			lockName,
			{ mode: "exclusive", signal: controller.signal },
			operation,
		);
	} catch (error) {
		if (controller.signal.aborted) {
			throw new ApiClientError(
				503,
				"REFRESH_LOCK_TIMEOUT",
				"No se pudo coordinar la renovación de la sesión.",
			);
		}

		throw error;
	} finally {
		clearTimeout(timeout);
	}
}

async function runWithStorageLease<T>(
	operation: () => Promise<T>,
	storage: StorageLike,
	options: {
		lockName: string;
		now: () => number;
		sleep: (milliseconds: number) => Promise<void>;
		ownerId: string;
		leaseDurationMs: number;
		maxWaitMs: number;
		retryIntervalMs: number;
	},
): Promise<T> {
	const acquired = await acquireStorageLease(storage, options);

	if (!acquired) {
		return operation();
	}

	try {
		return await operation();
	} finally {
		releaseStorageLease(storage, options.lockName, options.ownerId);
	}
}

async function acquireStorageLease(
	storage: StorageLike,
	options: {
		lockName: string;
		now: () => number;
		sleep: (milliseconds: number) => Promise<void>;
		ownerId: string;
		leaseDurationMs: number;
		maxWaitMs: number;
		retryIntervalMs: number;
	},
): Promise<boolean> {
	const deadline = options.now() + options.maxWaitMs;

	while (options.now() <= deadline) {
		const currentLease = readStorageLease(storage, options.lockName);

		if (!currentLease || currentLease.expiresAt <= options.now()) {
			const lease: RefreshLease = {
				expiresAt: options.now() + options.leaseDurationMs,
				ownerId: options.ownerId,
			};

			try {
				storage.setItem(options.lockName, JSON.stringify(lease));
				const storedLease = readStorageLease(storage, options.lockName);

				if (storedLease?.ownerId === options.ownerId) {
					return true;
				}
			} catch {
				return false;
			}
		}

		const remaining = deadline - options.now();

		if (remaining <= 0) {
			break;
		}

		await options.sleep(Math.min(options.retryIntervalMs, remaining));
	}

	throw new ApiClientError(
		503,
		"REFRESH_LOCK_TIMEOUT",
		"No se pudo coordinar la renovación de la sesión.",
	);
}

function releaseStorageLease(
	storage: StorageLike,
	lockName: string,
	ownerId: string,
): void {
	try {
		const currentLease = readStorageLease(storage, lockName);

		if (currentLease?.ownerId === ownerId) {
			storage.removeItem(lockName);
		}
	} catch {
		return;
	}
}

function readStorageLease(
	storage: StorageLike,
	lockName: string,
): RefreshLease | null {
	const storedValue = storage.getItem(lockName);

	if (!storedValue) {
		return null;
	}

	try {
		const parsed: unknown = JSON.parse(storedValue);

		if (!isRefreshLease(parsed)) {
			return null;
		}

		return parsed;
	} catch {
		return null;
	}
}

function isRefreshLease(value: unknown): value is RefreshLease {
	if (!value || typeof value !== "object") {
		return false;
	}

	const lease = value as Record<string, unknown>;

	return (
		typeof lease.ownerId === "string" &&
		typeof lease.expiresAt === "number" &&
		Number.isFinite(lease.expiresAt)
	);
}

function isStorageAvailable(storage: StorageLike): boolean {
	try {
		storage.getItem(STAFF_REFRESH_LOCK);
		return true;
	} catch {
		return false;
	}
}

function getBrowserLockManager(): LockManagerLike | null {
	if (typeof navigator === "undefined" || !navigator.locks) {
		return null;
	}

	return navigator.locks;
}

function getBrowserStorage(): StorageLike | null {
	if (typeof window === "undefined") {
		return null;
	}

	try {
		return window.localStorage;
	} catch {
		return null;
	}
}

function createOwnerId(): string {
	return globalThis.crypto?.randomUUID?.() ?? `staff-refresh-${Date.now()}`;
}

function defaultSleep(milliseconds: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
