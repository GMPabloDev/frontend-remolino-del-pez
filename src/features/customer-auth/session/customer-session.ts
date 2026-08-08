import { ApiClientError } from "@/lib/api/api-error";
import {
	createRefreshCoordinator,
	type RefreshCoordinator,
} from "@/lib/auth/refresh-coordinator";
import {
	type CustomerAuthBffClient,
	createCustomerAuthBffClient,
} from "../api/customer-auth-bff-client";
import type {
	CustomerProfile,
	CustomerSessionResponse,
} from "../contracts/customer-auth.schemas";
import {
	type CustomerAuthChannel,
	type CustomerRefreshStartedMessage,
	createCustomerAuthChannel,
} from "./customer-auth-channel";

export const CUSTOMER_REFRESH_LOCK = "customer-auth:refresh-lock:v1";

const REFRESH_ELECTION_DELAY_MS = 25;
const REFRESH_WAIT_TIMEOUT_MS = 10_000;
const REFRESH_ANNOUNCEMENT_TTL_MS = 10_000;

export type CustomerSessionStatus =
	| "checking"
	| "anonymous"
	| "authenticated"
	| "unavailable";

export interface CustomerSessionSnapshot {
	status: CustomerSessionStatus;
	customer: CustomerProfile | null;
	accessToken: string | null;
}

export interface CustomerSessionAccess {
	getAccessToken(): string | null;
	refreshAccessToken(): Promise<string>;
	invalidateSession(): void;
}

export interface CustomerSessionController extends CustomerSessionAccess {
	getSnapshot(): CustomerSessionSnapshot;
	subscribe(listener: () => void): () => void;
	bootstrap(): Promise<CustomerSessionSnapshot>;
	exchangeMagicLink(token: string): Promise<CustomerSessionSnapshot>;
	logout(): Promise<void>;
	destroy(): void;
}

interface CustomerSessionOptions {
	authClient?: CustomerAuthBffClient;
	refreshCoordinator?: RefreshCoordinator;
	channel?: CustomerAuthChannel;
	now?: () => number;
	sleep?: (milliseconds: number) => Promise<void>;
	ownerId?: string;
}

const anonymousSnapshot: CustomerSessionSnapshot = {
	status: "anonymous",
	customer: null,
	accessToken: null,
};
const checkingSnapshot: CustomerSessionSnapshot = {
	status: "checking",
	customer: null,
	accessToken: null,
};

export function createCustomerSession(
	options: CustomerSessionOptions = {},
): CustomerSessionController {
	const authClient = options.authClient ?? createCustomerAuthBffClient();
	const refreshCoordinator =
		options.refreshCoordinator ??
		createRefreshCoordinator({ lockName: CUSTOMER_REFRESH_LOCK });
	const channel = options.channel ?? createCustomerAuthChannel();
	const now = options.now ?? Date.now;
	const sleep = options.sleep ?? defaultSleep;
	const ownerId = options.ownerId ?? createOwnerId();
	const listeners = new Set<() => void>();
	const refreshWaiters = new Set<
		(authentication: CustomerSessionResponse) => void
	>();
	let snapshot: CustomerSessionSnapshot = checkingSnapshot;
	let accessToken: string | null = null;
	let latestAuthentication: CustomerSessionResponse | null = null;
	let refreshVersion = 0;
	let remoteRefreshStarted: CustomerRefreshStartedMessage | null = null;

	const notify = (): void => {
		for (const listener of listeners) {
			listener();
		}
	};

	const setSnapshot = (nextSnapshot: CustomerSessionSnapshot): void => {
		snapshot = nextSnapshot;
		notify();
	};

	const setAuthenticated = (
		authentication: CustomerSessionResponse,
		broadcast: boolean,
	): CustomerSessionSnapshot => {
		accessToken = authentication.accessToken;
		latestAuthentication = authentication;
		remoteRefreshStarted = null;
		const nextSnapshot: CustomerSessionSnapshot = {
			status: "authenticated",
			customer: authentication.customer,
			accessToken,
		};
		setSnapshot(nextSnapshot);

		if (broadcast) {
			channel.publishSessionRefreshed(authentication);
		}

		return nextSnapshot;
	};

	const clearMemory = (
		status: "anonymous" | "unavailable" = "anonymous",
	): void => {
		accessToken = null;
		latestAuthentication = null;
		remoteRefreshStarted = null;
		setSnapshot(
			status === "anonymous"
				? anonymousSnapshot
				: { status, customer: null, accessToken: null },
		);
	};

	const invalidate = (broadcast: boolean, logout = false): void => {
		const hadSession =
			accessToken !== null || snapshot.status === "authenticated";
		clearMemory();

		if (broadcast && hadSession) {
			if (logout) {
				channel.publishLogout();
			} else {
				channel.publishSessionInvalidated();
			}
		}
	};

	const unsubscribeRefreshed = channel.subscribeSessionRefreshed(
		(authentication) => {
			refreshVersion += 1;
			setAuthenticated(authentication, false);

			for (const waiter of refreshWaiters) {
				waiter(authentication);
			}
			refreshWaiters.clear();
		},
	);
	const unsubscribeRefreshStarted = channel.subscribeRefreshStarted(
		(message) => {
			if (
				message.ownerId !== ownerId &&
				message.timestamp + REFRESH_ANNOUNCEMENT_TTL_MS >= now()
			) {
				remoteRefreshStarted = message;
			}
		},
	);
	const unsubscribeInvalidation = channel.subscribeInvalidation(() => {
		invalidate(false);
	});

	return {
		getSnapshot(): CustomerSessionSnapshot {
			return snapshot;
		},
		subscribe(listener: () => void): () => void {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
		getAccessToken(): string | null {
			return accessToken;
		},
		async bootstrap(): Promise<CustomerSessionSnapshot> {
			setSnapshot(checkingSnapshot);
			accessToken = null;

			try {
				const beforeRefreshVersion = refreshVersion;
				const authentication = await runCoordinatedRefresh(
					beforeRefreshVersion,
					() => authClient.refresh(),
				);
				return setAuthenticated(
					authentication,
					refreshVersion === beforeRefreshVersion,
				);
			} catch (error) {
				if (isInvalidRefreshToken(error)) {
					clearMemory();
				} else {
					clearMemory("unavailable");
				}

				return snapshot;
			}
		},
		async exchangeMagicLink(token: string): Promise<CustomerSessionSnapshot> {
			const authentication = await authClient.exchangeMagicLink(token);
			return setAuthenticated(authentication, true);
		},
		async refreshAccessToken(): Promise<string> {
			try {
				const beforeRefreshVersion = refreshVersion;
				const authentication = await runCoordinatedRefresh(
					beforeRefreshVersion,
					() => authClient.refresh(),
				);
				setAuthenticated(
					authentication,
					refreshVersion === beforeRefreshVersion,
				);
				return authentication.accessToken;
			} catch (error) {
				if (isInvalidRefreshToken(error)) {
					invalidate(true);
				}

				throw error;
			}
		},
		async logout(): Promise<void> {
			try {
				await authClient.logout();
			} catch {
				invalidate(true, true);
				return;
			}

			invalidate(true, true);
		},
		invalidateSession(): void {
			invalidate(true);
		},
		destroy(): void {
			unsubscribeRefreshed();
			unsubscribeRefreshStarted();
			unsubscribeInvalidation();
			channel.close();
			listeners.clear();
			refreshWaiters.clear();
			clearMemory();
		},
	};

	async function runCoordinatedRefresh(
		beforeRefreshVersion: number,
		operation: () => Promise<CustomerSessionResponse>,
	): Promise<CustomerSessionResponse> {
		channel.publishRefreshStarted(ownerId);
		await sleep(REFRESH_ELECTION_DELAY_MS);

		if (refreshVersion > beforeRefreshVersion && latestAuthentication) {
			return latestAuthentication;
		}

		const remote = remoteRefreshStarted;
		if (
			remote &&
			remote.timestamp + REFRESH_ANNOUNCEMENT_TTL_MS >= now() &&
			remote.ownerId < ownerId
		) {
			try {
				return await waitForRemoteRefresh(beforeRefreshVersion);
			} catch {
				remoteRefreshStarted = null;
			}
		}

		return refreshCoordinator.run(operation);
	}

	function waitForRemoteRefresh(
		beforeRefreshVersion: number,
	): Promise<CustomerSessionResponse> {
		if (refreshVersion > beforeRefreshVersion && latestAuthentication) {
			return Promise.resolve(latestAuthentication);
		}

		return new Promise((resolve, reject) => {
			const timeout = setTimeout(() => {
				refreshWaiters.delete(onRefresh);
				reject(
					new ApiClientError(
						503,
						"REFRESH_COORDINATION_TIMEOUT",
						"No se pudo coordinar la renovación de la sesión.",
					),
				);
			}, REFRESH_WAIT_TIMEOUT_MS);
			const onRefresh = (authentication: CustomerSessionResponse): void => {
				clearTimeout(timeout);
				refreshWaiters.delete(onRefresh);
				resolve(authentication);
			};

			refreshWaiters.add(onRefresh);
		});
	}
}

function isInvalidRefreshToken(error: unknown): error is ApiClientError {
	return (
		error instanceof ApiClientError &&
		error.code === "INVALID_CUSTOMER_REFRESH_TOKEN"
	);
}

function createOwnerId(): string {
	return globalThis.crypto?.randomUUID?.() ?? `customer-refresh-${Date.now()}`;
}

function defaultSleep(milliseconds: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
