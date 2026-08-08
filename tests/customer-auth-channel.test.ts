import { describe, expect, test } from "bun:test";
import type { CustomerSessionResponse } from "../src/features/customer-auth/contracts/customer-auth.schemas";
import { createCustomerAuthChannel } from "../src/features/customer-auth/session/customer-auth-channel";
import { createCustomerSession } from "../src/features/customer-auth/session/customer-session";

const authentication = {
	accessToken: "access-token",
	customer: {
		fullName: "Ana Pérez",
		email: "ana@example.com",
		phone: "+51987654321",
		restaurantSlug: "restaurante-olimpico",
	},
} satisfies CustomerSessionResponse;

class Bus {
	private readonly channels = new Set<FakeChannel>();

	register(channel: FakeChannel): void {
		this.channels.add(channel);
	}

	send(sender: FakeChannel, message: unknown): void {
		for (const channel of this.channels) {
			if (channel !== sender) {
				channel.emit(message);
			}
		}
	}
}

class FakeChannel {
	private readonly listeners = new Set<(event: MessageEvent) => void>();

	constructor(private readonly bus: Bus) {
		bus.register(this);
	}

	postMessage(message: unknown): void {
		this.bus.send(this, message);
	}

	addEventListener(
		_type: "message",
		listener: (event: MessageEvent) => void,
	): void {
		this.listeners.add(listener);
	}

	removeEventListener(
		_type: "message",
		listener: (event: MessageEvent) => void,
	): void {
		this.listeners.delete(listener);
	}

	close(): void {}

	emit(message: unknown): void {
		for (const listener of this.listeners) {
			listener({ data: message } as MessageEvent);
		}
	}
}

const coordinator = {
	run<T>(operation: () => Promise<T>): Promise<T> {
		return operation();
	},
};

function authClient(calls: { refresh: number }) {
	return {
		requestMagicLink: async () => ({ message: "ok" }),
		exchangeMagicLink: async () => authentication,
		refresh: async () => {
			calls.refresh += 1;
			return authentication;
		},
		logout: async () => {},
	};
}

describe("customer-auth channel", () => {
	test("transports refresh results through BroadcastChannel only", () => {
		const bus = new Bus();
		const first = createCustomerAuthChannel({
			channel: new FakeChannel(bus),
			storage: null,
			eventTarget: null,
		});
		const second = createCustomerAuthChannel({
			channel: new FakeChannel(bus),
			storage: null,
			eventTarget: null,
		});
		let received: CustomerSessionResponse | null = null;
		second.subscribeSessionRefreshed((value) => {
			received = value;
		});

		first.publishSessionRefreshed(authentication);

		expect(received).toEqual(authentication);
		first.close();
		second.close();
	});

	test("lets a follower consume the leader refresh without a second backend call", async () => {
		const bus = new Bus();
		const firstChannel = createCustomerAuthChannel({
			channel: new FakeChannel(bus),
			storage: null,
			eventTarget: null,
		});
		const secondChannel = createCustomerAuthChannel({
			channel: new FakeChannel(bus),
			storage: null,
			eventTarget: null,
		});
		const firstCalls = { refresh: 0 };
		const secondCalls = { refresh: 0 };
		const first = createCustomerSession({
			authClient: authClient(firstCalls),
			channel: firstChannel,
			refreshCoordinator: coordinator,
			ownerId: "a-leader",
			sleep: async () => {},
		});
		const second = createCustomerSession({
			authClient: authClient(secondCalls),
			channel: secondChannel,
			refreshCoordinator: coordinator,
			ownerId: "z-follower",
			sleep: async () => {},
		});

		await Promise.all([first.bootstrap(), second.bootstrap()]);

		expect(firstCalls.refresh).toBe(1);
		expect(secondCalls.refresh).toBe(0);
		expect(second.getSnapshot().status).toBe("authenticated");
		first.destroy();
		second.destroy();
	});
});
