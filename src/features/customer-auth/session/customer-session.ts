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
	createCustomerAuthChannel,
} from "./customer-auth-channel";

export const CUSTOMER_REFRESH_LOCK = "customer-auth:refresh-lock:v1";

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
	const listeners = new Set<() => void>();
	let snapshot: CustomerSessionSnapshot = checkingSnapshot;
	let accessToken: string | null = null;

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
			setAuthenticated(authentication, false);
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
				const authentication = await refreshCoordinator.run(() =>
					authClient.refresh(),
				);
				return setAuthenticated(authentication, true);
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
				const authentication = await refreshCoordinator.run(() =>
					authClient.refresh(),
				);
				setAuthenticated(authentication, true);
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
			unsubscribeInvalidation();
			channel.close();
			listeners.clear();
			clearMemory();
		},
	};
}

function isInvalidRefreshToken(error: unknown): error is ApiClientError {
	return (
		error instanceof ApiClientError &&
		error.code === "INVALID_CUSTOMER_REFRESH_TOKEN"
	);
}
