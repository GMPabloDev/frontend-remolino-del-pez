export const STAFF_AUTH_CHANNEL = "staff-auth:v1";
export const STAFF_AUTH_LOGOUT_STORAGE_KEY = "staff-auth:logout:v1";

interface BroadcastChannelLike {
	postMessage(message: unknown): void;
	addEventListener(
		type: "message",
		listener: (event: MessageEvent) => void,
	): void;
	removeEventListener(
		type: "message",
		listener: (event: MessageEvent) => void,
	): void;
	close(): void;
}

interface StorageLike {
	setItem(key: string, value: string): void;
	removeItem(key: string): void;
}

interface StorageEventTargetLike {
	addEventListener(
		type: "storage",
		listener: (event: StorageEvent) => void,
	): void;
	removeEventListener(
		type: "storage",
		listener: (event: StorageEvent) => void,
	): void;
}

interface StaffAuthChannelOptions {
	channel?: BroadcastChannelLike | null;
	storage?: StorageLike | null;
	eventTarget?: StorageEventTargetLike | null;
	nonceFactory?: () => string;
	now?: () => number;
	channelName?: string;
	storageKey?: string;
}

export interface StaffAuthChannel {
	publishLogout(): void;
	subscribeLogout(listener: () => void): () => void;
	close(): void;
}

interface LogoutMessage {
	nonce: string;
	timestamp: number;
	type: "logout";
}

export function createStaffAuthChannel(
	options: StaffAuthChannelOptions = {},
): StaffAuthChannel {
	const channelName = options.channelName ?? STAFF_AUTH_CHANNEL;
	const storageKey = options.storageKey ?? STAFF_AUTH_LOGOUT_STORAGE_KEY;
	const channel = options.channel ?? getBrowserChannel(channelName);
	const storage = options.storage ?? getBrowserStorage();
	const eventTarget = options.eventTarget ?? getBrowserEventTarget();
	const nonceFactory = options.nonceFactory ?? createNonce;
	const now = options.now ?? Date.now;
	const listeners = new Set<() => void>();
	const handledNonces = new Set<string>();

	const notifyLogout = (message: unknown): void => {
		if (!isLogoutMessage(message) || handledNonces.has(message.nonce)) {
			return;
		}

		handledNonces.add(message.nonce);
		if (handledNonces.size > 32) {
			handledNonces.delete(handledNonces.values().next().value as string);
		}

		for (const listener of listeners) {
			listener();
		}
	};

	const onChannelMessage = (event: MessageEvent): void => {
		notifyLogout(event.data);
	};

	const onStorageEvent = (event: StorageEvent): void => {
		if (event.key !== storageKey || !event.newValue) {
			return;
		}

		try {
			notifyLogout(JSON.parse(event.newValue));
		} catch {
			return;
		}
	};

	channel?.addEventListener("message", onChannelMessage);
	eventTarget?.addEventListener("storage", onStorageEvent);

	return {
		publishLogout(): void {
			const message: LogoutMessage = {
				type: "logout",
				nonce: nonceFactory(),
				timestamp: now(),
			};

			try {
				channel?.postMessage(message);
			} catch {
				publishStorageLogout(storage, storageKey, message);
				return;
			}

			publishStorageLogout(storage, storageKey, message);
		},
		subscribeLogout(listener: () => void): () => void {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
		close(): void {
			channel?.removeEventListener("message", onChannelMessage);
			eventTarget?.removeEventListener("storage", onStorageEvent);
			channel?.close();
			listeners.clear();
			handledNonces.clear();
		},
	};
}

function publishStorageLogout(
	storage: StorageLike | null,
	storageKey: string,
	message: LogoutMessage,
): void {
	if (!storage) {
		return;
	}

	try {
		storage.setItem(storageKey, JSON.stringify(message));
		storage.removeItem(storageKey);
	} catch {
		return;
	}
}

function isLogoutMessage(value: unknown): value is LogoutMessage {
	if (!value || typeof value !== "object") {
		return false;
	}

	const message = value as Record<string, unknown>;

	return (
		message.type === "logout" &&
		typeof message.nonce === "string" &&
		typeof message.timestamp === "number"
	);
}

function getBrowserChannel(name: string): BroadcastChannelLike | null {
	if (typeof BroadcastChannel === "undefined") {
		return null;
	}

	try {
		return new BroadcastChannel(name);
	} catch {
		return null;
	}
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

function getBrowserEventTarget(): StorageEventTargetLike | null {
	return typeof window === "undefined" ? null : window;
}

function createNonce(): string {
	return globalThis.crypto?.randomUUID?.() ?? `staff-logout-${Date.now()}`;
}
