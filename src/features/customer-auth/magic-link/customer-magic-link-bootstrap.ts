const CUSTOMER_MAGIC_LINK_TOKEN_STORE = Symbol.for(
	"customer-auth:magic-link-token:v1",
);

interface CustomerMagicLinkTokenStore {
	captured: boolean;
	consumed: boolean;
	token: string | null;
}

type GlobalWithCustomerMagicLinkStore = typeof globalThis &
	Record<symbol, CustomerMagicLinkTokenStore | undefined>;

export function bootstrapCustomerMagicLink(): void {
	captureCustomerMagicLinkToken();
}

export function consumeCustomerMagicLinkToken(): string | null {
	const store = getTokenStore();

	if (!store.captured) {
		captureCustomerMagicLinkToken();
	}

	if (store.consumed) {
		return null;
	}

	store.consumed = true;
	return store.token;
}

function captureCustomerMagicLinkToken(): string | null {
	const store = getTokenStore();

	if (store.captured) {
		return store.token;
	}

	store.captured = true;

	if (typeof window === "undefined") {
		return null;
	}

	const url = new URL(window.location.href);
	store.token = url.searchParams.get("token");

	if (url.searchParams.has("token")) {
		url.searchParams.delete("token");
		window.history.replaceState(
			null,
			document.title,
			`${url.pathname}${url.search}${url.hash}`,
		);
	}

	return store.token;
}

function getTokenStore(): CustomerMagicLinkTokenStore {
	const globalScope = globalThis as GlobalWithCustomerMagicLinkStore;
	const existingStore = globalScope[CUSTOMER_MAGIC_LINK_TOKEN_STORE];

	if (existingStore) {
		return existingStore;
	}

	const store: CustomerMagicLinkTokenStore = {
		captured: false,
		consumed: false,
		token: null,
	};

	Object.defineProperty(globalScope, CUSTOMER_MAGIC_LINK_TOKEN_STORE, {
		configurable: false,
		enumerable: false,
		value: store,
		writable: false,
	});

	return store;
}

if (typeof window !== "undefined") {
	bootstrapCustomerMagicLink();
}
