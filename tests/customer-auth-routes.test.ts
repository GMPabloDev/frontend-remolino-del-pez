import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";

const routeFiles = [
	"src/pages/customer/access.astro",
	"src/pages/customer/account.astro",
	"src/pages/auth/magic-link.astro",
];

describe("customer-auth routes", () => {
	test("mark all customer routes as non-indexable", async () => {
		for (const file of routeFiles) {
			const content = await readFile(file, "utf8");
			expect(content).toContain('robots="noindex, nofollow"');
		}
	});

	test("only the magic-link route requests no referrer", async () => {
		const magicLink = await readFile(routeFiles[2], "utf8");
		const access = await readFile(routeFiles[0], "utf8");
		const account = await readFile(routeFiles[1], "utf8");

		expect(magicLink).toContain('referrerPolicy="no-referrer"');
		expect(access).not.toContain("referrerPolicy=");
		expect(account).not.toContain("referrerPolicy=");
	});

	test("link public entry points to customer access", async () => {
		const home = await readFile("src/pages/index.astro", "utf8");
		const menu = await readFile("src/pages/menu.astro", "utf8");
		const confirmation = await readFile(
			"src/features/public-payment/components/PublicPaymentConfirmation.tsx",
			"utf8",
		);

		expect(home).toContain('href="/customer/access"');
		expect(menu).toContain('href="/customer/access"');
		expect(confirmation).toContain('href="/customer/access"');
	});
});
