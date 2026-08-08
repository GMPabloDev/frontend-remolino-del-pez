import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { z } from "zod";
import { createStaffApiClient } from "../src/features/staff-auth/api/staff-api-client";
import { sanitizeStaffReturnTo } from "../src/features/staff-auth/lib/staff-return-to";
import { createRefreshCoordinator } from "../src/lib/auth/refresh-coordinator";
import {
	createStaffAuthChannel,
	STAFF_AUTH_LOGOUT_STORAGE_KEY,
} from "../src/features/staff-auth/session/staff-auth-channel";
import {
	STAFF_REFRESH_LOCK,
	createStaffSession,
} from "../src/features/staff-auth/session/staff-session";

const originalFetch = globalThis.fetch;
const user = {
	id: "00000000-0000-4000-8000-000000000002",
	fullName: "Ada Lovelace",
	email: "ada@example.com",
	phone: null,
	role: "admin" as const,
	status: "active" as const,
	branchId: null,
	createdAt: "2026-08-01T00:00:00Z",
	updatedAt: "2026-08-01T00:00:00Z",
};

beforeEach(() => {
	process.env.PUBLIC_STAFF_RESTAURANT_ID =
		"00000000-0000-4000-8000-000000000001";
});

afterEach(() => {
	globalThis.fetch = originalFetch;
});

describe("staff returnTo", () => {
	test("preserves a safe staff path with query and hash", () => {
		expect(sanitizeStaffReturnTo("/staff/account?tab=security#password")).toBe(
			"/staff/account?tab=security#password",
		);
	});

	test("rejects external and login destinations", () => {
		expect(sanitizeStaffReturnTo("https://evil.example/staff")).toBe("/staff");
		expect(sanitizeStaffReturnTo("//evil.example/staff")).toBe("/staff");
		expect(sanitizeStaffReturnTo("/staff/login?returnTo=/staff")).toBe(
			"/staff",
		);
		expect(sanitizeStaffReturnTo("/public")).toBe("/staff");
	});
});

describe("refresh coordinator", () => {
	test("shares one in-flight operation and allows the next refresh", async () => {
		const coordinator = createRefreshCoordinator({
			lockManager: null,
			storage: null,
			lockName: STAFF_REFRESH_LOCK,
		});
		let resolveOperation: ((value: string) => void) | undefined;
		let calls = 0;
		const operation = () => {
			calls += 1;
			return new Promise<string>((resolve) => {
				resolveOperation = resolve;
			});
		};

		const first = coordinator.run(operation);
		const second = coordinator.run(operation);
		expect(first).toBe(second);
		resolveOperation?.("first");
		expect(await first).toBe("first");
		expect(calls).toBe(1);

		expect(
			await coordinator.run(async () => {
				calls += 1;
				return "second";
			}),
		).toBe("second");
		expect(calls).toBe(2);
	});

	test("uses Web Locks when available", async () => {
		let lockCalls = 0;
		const coordinator = createRefreshCoordinator({
			lockManager: {
				request: async (_name, _options, callback) => {
					lockCalls += 1;
					return callback();
				},
			},
			storage: null,
		});

		expect(await coordinator.run(async () => "locked")).toBe("locked");
		expect(lockCalls).toBe(1);
	});

	test("acquires and releases a localStorage lease", async () => {
		const storage = createStorage();
		const coordinator = createRefreshCoordinator({
			lockManager: null,
			storage,
			lockName: STAFF_REFRESH_LOCK,
			ownerId: "owner-a",
			now: () => 100,
		});

		expect(
			await coordinator.run(async () => storage.values.has(STAFF_REFRESH_LOCK)),
		).toBe(true);
		expect(storage.values.has(STAFF_REFRESH_LOCK)).toBe(false);
	});

	test("recovers an expired localStorage lease", async () => {
		const storage = createStorage();
		storage.values.set(
			STAFF_REFRESH_LOCK,
			JSON.stringify({ ownerId: "stale-owner", expiresAt: 50 }),
		);
		const coordinator = createRefreshCoordinator({
			lockManager: null,
			storage,
			lockName: STAFF_REFRESH_LOCK,
			ownerId: "owner-b",
			now: () => 100,
		});

		expect(await coordinator.run(async () => "recovered")).toBe("recovered");
		expect(storage.values.has(STAFF_REFRESH_LOCK)).toBe(false);
	});
});

describe("staff auth channel", () => {
	test("deduplicates logout notifications from channel and storage", () => {
		const broadcast = createBroadcastChannel();
		const eventTarget = createStorageEventTarget();
		const storage = createStorage();
		const channel = createStaffAuthChannel({
			channel: broadcast.channel,
			eventTarget: eventTarget.target,
			storage,
			nonceFactory: () => "logout-1",
			now: () => 100,
		});
		let notifications = 0;
		channel.subscribeLogout(() => {
			notifications += 1;
		});

		channel.publishLogout();
		const message = broadcast.messages[0];
		broadcast.emit(message);
		eventTarget.emit(STAFF_AUTH_LOGOUT_STORAGE_KEY, JSON.stringify(message));

		expect(notifications).toBe(1);
		expect(storage.removedKeys).toContain(STAFF_AUTH_LOGOUT_STORAGE_KEY);
		channel.close();
	});
});

describe("staff session", () => {
	test("keeps access token in memory and clears it on remote logout", async () => {
		const channel = createTestAuthChannel();
		const session = createStaffSession({
			channel,
			refreshCoordinator: { run: (operation) => operation() },
			authClient: {
				login: async () => ({ accessToken: "access-1", user }),
				refresh: async () => ({ accessToken: "access-2", user }),
				logout: async () => undefined,
			},
		});

		await session.login({ email: user.email, password: "Password123" });
		expect(session.getAccessToken()).toBe("access-1");
		expect(session.getSnapshot().status).toBe("authenticated");

		channel.emitLogout();
		expect(session.getAccessToken()).toBeNull();
		expect(session.getSnapshot().status).toBe("anonymous");
		session.destroy();
	});
});

describe("staff API client", () => {
	test("refreshes once after unauthorized and retries with the new token", async () => {
		let refreshCalls = 0;
		let requestCalls = 0;
		let accessToken = "access-old";
		globalThis.fetch = async (_input, init) => {
			requestCalls += 1;
			expect(new Headers(init?.headers).get("Authorization")).toBe(
				`Bearer ${requestCalls === 1 ? "access-old" : "access-new"}`,
			);

			if (requestCalls === 1) {
				return Response.json(
					{ error: { code: "UNAUTHORIZED", message: "expired" } },
					{ status: 401 },
				);
			}

			return Response.json({ value: "ok" });
		};
		const session = {
			getAccessToken: () => accessToken,
			refreshAccessToken: async () => {
				refreshCalls += 1;
				accessToken = "access-new";
				return accessToken;
			},
			invalidateSession: () => undefined,
		};
		const client = createStaffApiClient(session, {
			apiBaseUrl: "http://localhost:3000",
		});

		expect(
			await client.request("/resource", z.object({ value: z.string() })),
		).toEqual({ value: "ok" });
		expect(refreshCalls).toBe(1);
		expect(requestCalls).toBe(2);
	});

	test("does not refresh a forbidden response", async () => {
		let refreshCalls = 0;
		globalThis.fetch = async () =>
			Response.json(
				{ error: { code: "FORBIDDEN", message: "denied" } },
				{ status: 403 },
			);
		const client = createStaffApiClient(
			{
				getAccessToken: () => "access-1",
				refreshAccessToken: async () => {
					refreshCalls += 1;
					return "access-2";
				},
				invalidateSession: () => undefined,
			},
			{ apiBaseUrl: "http://localhost:3000" },
		);

		await expect(
			client.request("/resource", z.object({ value: z.string() })),
		).rejects.toMatchObject({ code: "FORBIDDEN", status: 403 });
		expect(refreshCalls).toBe(0);
	});

	test("does not retry unauthorized more than once", async () => {
		let requestCalls = 0;
		let refreshCalls = 0;
		globalThis.fetch = async () => {
			requestCalls += 1;
			return Response.json(
				{ error: { code: "UNAUTHORIZED", message: "expired" } },
				{ status: 401 },
			);
		};
		const client = createStaffApiClient(
			{
				getAccessToken: () => "access-1",
				refreshAccessToken: async () => {
					refreshCalls += 1;
					return "access-2";
				},
				invalidateSession: () => undefined,
			},
			{ apiBaseUrl: "http://localhost:3000" },
		);

		await expect(
			client.request("/resource", z.object({ value: z.string() })),
		).rejects.toMatchObject({ code: "UNAUTHORIZED", status: 401 });
		expect(refreshCalls).toBe(1);
		expect(requestCalls).toBe(2);
	});
});

function createStorage() {
	const values = new Map<string, string>();
	const removedKeys: string[] = [];

	return {
		values,
		removedKeys,
		getItem: (key: string) => values.get(key) ?? null,
		setItem: (key: string, value: string) => values.set(key, value),
		removeItem: (key: string) => {
			values.delete(key);
			removedKeys.push(key);
		},
	};
}

function createBroadcastChannel() {
	let listener: ((event: MessageEvent) => void) | undefined;
	const messages: unknown[] = [];

	return {
		messages,
		emit(message: unknown) {
			listener?.({ data: message } as MessageEvent);
		},
		channel: {
			postMessage: (message: unknown) => messages.push(message),
			addEventListener: (
				_type: "message",
				next: (event: MessageEvent) => void,
			) => {
				listener = next;
			},
			removeEventListener: () => {
				listener = undefined;
			},
			close: () => undefined,
		},
	};
}

function createStorageEventTarget() {
	let listener: ((event: StorageEvent) => void) | undefined;

	return {
		emit(key: string, newValue: string) {
			listener?.({ key, newValue } as StorageEvent);
		},
		target: {
			addEventListener: (
				_type: "storage",
				next: (event: StorageEvent) => void,
			) => {
				listener = next;
			},
			removeEventListener: () => {
				listener = undefined;
			},
		},
	};
}

function createTestAuthChannel() {
	let listener: (() => void) | undefined;

	return {
		emitLogout() {
			listener?.();
		},
		publishLogout: () => undefined,
		subscribeLogout: (next: () => void) => {
			listener = next;
			return () => {
				listener = undefined;
			};
		},
		close: () => undefined,
	};
}
