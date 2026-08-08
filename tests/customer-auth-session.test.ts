import { describe, expect, test } from "bun:test";
import type { CustomerSessionResponse } from "../src/features/customer-auth/contracts/customer-auth.schemas";
import type {
	CustomerAuthChannel,
	CustomerRefreshStartedMessage,
} from "../src/features/customer-auth/session/customer-auth-channel";
import {
	CUSTOMER_REFRESH_LOCK,
	createCustomerSession,
} from "../src/features/customer-auth/session/customer-session";
import { ApiClientError } from "../src/lib/api/api-error";

const authentication: CustomerSessionResponse = {
	accessToken: "access-1",
	customer: {
		fullName: "Ana Pérez",
		email: "ana@example.com",
		phone: "+51987654321",
		restaurantSlug: "restaurante-olimpico",
	},
};

function createChannel() {
	const refreshedListeners = new Set<
		(authentication: CustomerSessionResponse) => void
	>();
	const startedListeners = new Set<
		(message: CustomerRefreshStartedMessage) => void
	>();
	const invalidationListeners = new Set<() => void>();
	const calls = {
		invalidated: 0,
		logout: 0,
		refreshed: 0,
		started: 0,
	};

	const channel: CustomerAuthChannel = {
		publishSessionRefreshed(value) {
			calls.refreshed += 1;
			for (const listener of refreshedListeners) listener(value);
		},
		subscribeSessionRefreshed(listener) {
			refreshedListeners.add(listener);
			return () => refreshedListeners.delete(listener);
		},
		publishRefreshStarted(ownerId) {
			calls.started += 1;
			for (const listener of startedListeners) {
				listener({
					type: "refresh-started",
					nonce: `nonce-${ownerId}`,
					ownerId,
					timestamp: Date.now(),
				});
			}
		},
		subscribeRefreshStarted(listener) {
			startedListeners.add(listener);
			return () => startedListeners.delete(listener);
		},
		publishLogout() {
			calls.logout += 1;
		},
		publishSessionInvalidated() {
			calls.invalidated += 1;
			for (const listener of invalidationListeners) listener();
		},
		subscribeInvalidation(listener) {
			invalidationListeners.add(listener);
			return () => invalidationListeners.delete(listener);
		},
		close() {},
	};

	return { channel, calls };
}

function createAuthClient(overrides: Record<string, unknown> = {}) {
	return {
		requestMagicLink: async () => ({ message: "ok" }),
		exchangeMagicLink: async () => authentication,
		refresh: async () => authentication,
		logout: async () => {},
		...overrides,
	};
}

const coordinator = {
	run<T>(operation: () => Promise<T>): Promise<T> {
		return operation();
	},
};

describe("customer session", () => {
	test("keeps the access token in memory after bootstrap", async () => {
		const { channel } = createChannel();
		const session = createCustomerSession({
			authClient: createAuthClient(),
			channel,
			refreshCoordinator: { ...coordinator },
			ownerId: "owner-a",
			sleep: async () => {},
		});

		await session.bootstrap();

		expect(session.getSnapshot().status).toBe("authenticated");
		expect(session.getAccessToken()).toBe("access-1");
		session.destroy();
	});

	test("uses the customer-specific refresh lock by default", () => {
		expect(CUSTOMER_REFRESH_LOCK).toBe("customer-auth:refresh-lock:v1");
	});

	test("invalidates locally and broadcasts a rejected refresh", async () => {
		const { channel, calls } = createChannel();
		const session = createCustomerSession({
			authClient: createAuthClient({
				refresh: async () => {
					throw new ApiClientError(
						401,
						"INVALID_CUSTOMER_REFRESH_TOKEN",
						"La sesión ya no es válida.",
					);
				},
			}),
			channel,
			refreshCoordinator: { ...coordinator },
			ownerId: "owner-a",
			sleep: async () => {},
		});

		await session.bootstrap();

		expect(session.getSnapshot().status).toBe("anonymous");
		expect(session.getAccessToken()).toBeNull();
		session.invalidateSession();
		expect(calls.invalidated).toBe(0);
		session.destroy();
	});

	test("logs out and clears the in-memory profile", async () => {
		const { channel, calls } = createChannel();
		const session = createCustomerSession({
			authClient: createAuthClient(),
			channel,
			refreshCoordinator: { ...coordinator },
			ownerId: "owner-a",
			sleep: async () => {},
		});

		await session.exchangeMagicLink("opaque-token");
		await session.logout();

		expect(session.getSnapshot().status).toBe("anonymous");
		expect(session.getAccessToken()).toBeNull();
		expect(calls.logout).toBe(1);
		session.destroy();
	});
});
