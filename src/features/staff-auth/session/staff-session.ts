import { ApiClientError } from "@/lib/api/api-error";
import {
	createStaffAuthBffClient,
	type StaffAuthBffClient,
} from "../api/staff-auth-bff-client";
import type {
	LoginInput,
	StaffSessionResponse,
	StaffUser,
} from "../contracts/staff-auth.schemas";
import {
	createRefreshCoordinator,
	type RefreshCoordinator,
} from "@/lib/auth/refresh-coordinator";
import {
	createStaffAuthChannel,
	type StaffAuthChannel,
} from "./staff-auth-channel";

export const STAFF_REFRESH_LOCK = "staff-auth:refresh-lock:v1";

export type StaffSessionStatus =
	| "checking"
	| "anonymous"
	| "authenticated"
	| "unavailable";

export interface StaffSessionSnapshot {
	status: StaffSessionStatus;
	user: StaffUser | null;
	accessToken: string | null;
}

export interface StaffSessionAccess {
	getAccessToken(): string | null;
	refreshAccessToken(): Promise<string>;
	invalidateSession(): void;
}

export interface StaffSessionController extends StaffSessionAccess {
	getSnapshot(): StaffSessionSnapshot;
	subscribe(listener: () => void): () => void;
	bootstrap(): Promise<StaffSessionSnapshot>;
	login(input: LoginInput): Promise<StaffSessionSnapshot>;
	logout(): Promise<void>;
	destroy(): void;
}

interface StaffSessionOptions {
	authClient?: StaffAuthBffClient;
	refreshCoordinator?: RefreshCoordinator;
	channel?: StaffAuthChannel;
}

const anonymousSnapshot: StaffSessionSnapshot = {
	status: "anonymous",
	user: null,
	accessToken: null,
};
const checkingSnapshot: StaffSessionSnapshot = {
	status: "checking",
	user: null,
	accessToken: null,
};

export function createStaffSession(
	options: StaffSessionOptions = {},
): StaffSessionController {
	const authClient = options.authClient ?? createStaffAuthBffClient();
	const refreshCoordinator =
		options.refreshCoordinator ??
		createRefreshCoordinator({ lockName: STAFF_REFRESH_LOCK });
	const channel = options.channel ?? createStaffAuthChannel();
	const listeners = new Set<() => void>();
	let snapshot: StaffSessionSnapshot = checkingSnapshot;
	let accessToken: string | null = null;

	const notify = (): void => {
		for (const listener of listeners) {
			listener();
		}
	};

	const setSnapshot = (nextSnapshot: StaffSessionSnapshot): void => {
		snapshot = nextSnapshot;
		notify();
	};

	const setAuthenticated = (
		authentication: StaffSessionResponse,
	): StaffSessionSnapshot => {
		accessToken = authentication.accessToken;
		const nextSnapshot: StaffSessionSnapshot = {
			status: "authenticated",
			user: authentication.user,
			accessToken,
		};
		setSnapshot(nextSnapshot);
		return nextSnapshot;
	};

	const clearMemory = (status: "anonymous" | "unavailable" = "anonymous") => {
		accessToken = null;
		setSnapshot(
			status === "anonymous"
				? anonymousSnapshot
				: { status, user: null, accessToken: null },
		);
	};

	const invalidate = (broadcast: boolean): void => {
		const hadSession =
			accessToken !== null || snapshot.status === "authenticated";
		clearMemory();

		if (broadcast && hadSession) {
			channel.publishLogout();
		}
	};

	const unsubscribeRemoteLogout = channel.subscribeLogout(() => {
		invalidate(false);
	});

	return {
		getSnapshot(): StaffSessionSnapshot {
			return snapshot;
		},
		subscribe(listener: () => void): () => void {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
		getAccessToken(): string | null {
			return accessToken;
		},
		async bootstrap(): Promise<StaffSessionSnapshot> {
			setSnapshot({ status: "checking", user: null, accessToken: null });
			accessToken = null;

			try {
				const authentication = await refreshCoordinator.run(() =>
					authClient.refresh(),
				);
				return setAuthenticated(authentication);
			} catch (error) {
				if (isInvalidRefreshToken(error)) {
					clearMemory();
				} else {
					clearMemory("unavailable");
				}

				return snapshot;
			}
		},
		async login(input: LoginInput): Promise<StaffSessionSnapshot> {
			const authentication = await authClient.login(input);
			return setAuthenticated(authentication);
		},
		async refreshAccessToken(): Promise<string> {
			try {
				const authentication = await refreshCoordinator.run(() =>
					authClient.refresh(),
				);
				setAuthenticated(authentication);
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
				return invalidate(true);
			}

			invalidate(true);
		},
		invalidateSession(): void {
			invalidate(true);
		},
		destroy(): void {
			unsubscribeRemoteLogout();
			channel.close();
			listeners.clear();
			clearMemory();
		},
	};
}

function isInvalidRefreshToken(error: unknown): error is ApiClientError {
	return (
		error instanceof ApiClientError && error.code === "INVALID_REFRESH_TOKEN"
	);
}
