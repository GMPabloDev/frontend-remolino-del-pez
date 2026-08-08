/// <reference lib="dom" />

import { describe, expect, test } from "bun:test";

import {
	bootstrapCustomerMagicLink,
	consumeCustomerMagicLinkToken,
} from "../src/features/customer-auth/magic-link/customer-magic-link-bootstrap";

describe("customer magic-link bootstrap", () => {
	test("removes the token from the visible URL and consumes it once", () => {
		window.history.replaceState(
			null,
			"",
			"/auth/magic-link?token=opaque-token&return=ignored#top",
		);

		bootstrapCustomerMagicLink();

		expect(window.location.pathname).toBe("/auth/magic-link");
		expect(window.location.search).toBe("?return=ignored");
		expect(window.location.hash).toBe("#top");
		expect(consumeCustomerMagicLinkToken()).toBe("opaque-token");
		expect(consumeCustomerMagicLinkToken()).toBeNull();
	});
});
