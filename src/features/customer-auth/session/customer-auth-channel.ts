import {
	type CustomerSessionResponse,
	customerSessionResponseSchema,
} from "../contracts/customer-auth.schemas";

export const CUSTOMER_AUTH_CHANNEL = "customer-auth:v1";
export const CUSTOMER_AUTH_SIGNAL_STORAGE_KEY = "customer-auth:signal:v1";

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

interface CustomerAuthChannelOptions {
	channel?: BroadcastChannelLike | null;
	storage?: StorageLike | null;
	eventTarget?: StorageEventTargetLike | null;
	nonceFactory?: () => string;
	now?: () => number;
	channelName?: string;
	storageKey?: string;
}

export interface CustomerAuthChannel {
	publishSessionRefreshed(authentication: CustomerSessionResponse): void;
	subscribeSessionRefreshed(
		listener: (authentication: CustomerSessionResponse) => void,
	): () => void;
	publishRefreshStarted(ownerId: string): void;
	subscribeRefreshStarted(
		listener: (message: CustomerRefreshStartedMessage) => void,
	): () => void;
	publishLogout(): void;
	publishSessionInvalidated(): void;
	subscribeInvalidation(listener: () => void): () => void;
	close(): void;
}

export interface CustomerRefreshStartedMessage {
	type: "refresh-started";
	nonce: string;
	ownerId: string;
	timestamp: number;
}

type CustomerAuthMessage =
	| SessionRefreshedMessage
	| CustomerRefreshStartedMessage
	| AuthSignalMessage;

interface SessionRefreshedMessage {
	type: "session-refreshed";
	authentication: CustomerSessionResponse;
}

interface AuthSignalMessage {
	type: "logout" | "session-invalidated";
	nonce: string;
	timestamp: number;
}

export function createCustomerAuthChannel(
	options: CustomerAuthChannelOptions = {},
): CustomerAuthChannel {
	const channelName = options.channelName ?? CUSTOMER_AUTH_CHANNEL;
	const storageKey = options.storageKey ?? CUSTOMER_AUTH_SIGNAL_STORAGE_KEY;
	const channel = options.channel ?? getBrowserChannel(channelName);
	const storage = options.storage ?? getBrowserStorage();
	const eventTarget = options.eventTarget ?? getBrowserEventTarget();
	const nonceFactory = options.nonceFactory ?? createNonce;
	const now = options.now ?? Date.now;
	const refreshedListeners = new Set<
		(authentication: CustomerSessionResponse) => void
	>();
	const refreshStartedListeners = new Set<
		(message: CustomerRefreshStartedMessage) => void
	>();
	const invalidationListeners = new Set<() => void>();
	const handledNonces = new Set<string>();

	const notify = (message: unknown): void => {
		if (!isCustomerAuthMessage(message)) {
			return;
		}

		if (message.type === "session-refreshed") {
			const result = customerSessionResponseSchema.safeParse(
				message.authentication,
			);

			if (!result.success) {
				return;
			}

			for (const listener of refreshedListeners) {
				listener(result.data);
			}
			return;
		}

		if (message.type === "refresh-started") {
			for (const listener of refreshStartedListeners) {
				listener(message);
			}
			return;
		}

		if (handledNonces.has(message.nonce)) {
			return;
		}

		handledNonces.add(message.nonce);
		if (handledNonces.size > 32) {
			handledNonces.delete(handledNonces.values().next().value as string);
		}

		for (const listener of invalidationListeners) {
			listener();
		}
	};

	const onChannelMessage = (event: MessageEvent): void => {
		notify(event.data);
	};

	const onStorageEvent = (event: StorageEvent): void => {
		if (event.key !== storageKey || !event.newValue) {
			return;
		}

		try {
			notify(JSON.parse(event.newValue));
		} catch {
			return;
		}
	};

	channel?.addEventListener("message", onChannelMessage);
	eventTarget?.addEventListener("storage", onStorageEvent);

	return {
		publishSessionRefreshed(authentication): void {
			const result = customerSessionResponseSchema.safeParse(authentication);

			if (!result.success) {
				return;
			}

			try {
				channel?.postMessage({
					type: "session-refreshed",
					authentication: result.data,
				});
			} catch {
				return;
			}
		},
		subscribeSessionRefreshed(listener): () => void {
			refreshedListeners.add(listener);
			return () => refreshedListeners.delete(listener);
		},
		publishRefreshStarted(ownerId): void {
			const message: CustomerRefreshStartedMessage = {
				type: "refresh-started",
				nonce: nonceFactory(),
				ownerId,
				timestamp: now(),
			};

			try {
				channel?.postMessage(message);
			} catch {
				publishStorageSignal(storage, storageKey, message);
				return;
			}

			publishStorageSignal(storage, storageKey, message);
		},
		subscribeRefreshStarted(listener): () => void {
			refreshStartedListeners.add(listener);
			return () => refreshStartedListeners.delete(listener);
		},
		publishLogout(): void {
			publishSignal("logout");
		},
		publishSessionInvalidated(): void {
			publishSignal("session-invalidated");
		},
		subscribeInvalidation(listener): () => void {
			invalidationListeners.add(listener);
			return () => invalidationListeners.delete(listener);
		},
		close(): void {
			channel?.removeEventListener("message", onChannelMessage);
			eventTarget?.removeEventListener("storage", onStorageEvent);
			channel?.close();
			refreshedListeners.clear();
			refreshStartedListeners.clear();
			invalidationListeners.clear();
			handledNonces.clear();
		},
	};

	function publishSignal(type: AuthSignalMessage["type"]): void {
		const message: AuthSignalMessage = {
			type,
			nonce: nonceFactory(),
			timestamp: now(),
		};

		try {
			channel?.postMessage(message);
		} catch {
			publishStorageSignal(storage, storageKey, message);
			return;
		}

		publishStorageSignal(storage, storageKey, message);
	}
}

function publishStorageSignal(
	storage: StorageLike | null,
	storageKey: string,
	message: CustomerRefreshStartedMessage | AuthSignalMessage,
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

function isCustomerAuthMessage(value: unknown): value is CustomerAuthMessage {
	if (!value || typeof value !== "object") {
		return false;
	}

	const message = value as Record<string, unknown>;

	if (message.type === "session-refreshed") {
		return "authentication" in message;
	}

	if (message.type === "refresh-started") {
		return (
			typeof message.nonce === "string" &&
			typeof message.ownerId === "string" &&
			typeof message.timestamp === "number"
		);
	}

	return (
		(message.type === "logout" || message.type === "session-invalidated") &&
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
	return globalThis.crypto?.randomUUID?.() ?? `customer-auth-${Date.now()}`;
}
