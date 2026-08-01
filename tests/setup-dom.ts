import { afterEach } from "bun:test";
import { GlobalWindow } from "happy-dom";

const happyWindow = new GlobalWindow({ url: "http://localhost" });
const globalObject = globalThis as Record<string, unknown>;

Object.defineProperty(happyWindow, "localStorage", {
	configurable: true,
	value: undefined,
});

Object.defineProperty(globalObject, "window", {
	configurable: true,
	value: happyWindow,
});
Object.defineProperty(globalObject, "document", {
	configurable: true,
	value: happyWindow.document,
});
Object.defineProperty(globalObject, "navigator", {
	configurable: true,
	value: happyWindow.navigator,
});
Object.defineProperty(globalObject, "self", {
	configurable: true,
	value: happyWindow,
});

for (const property of [
	"HTMLElement",
	"HTMLInputElement",
	"HTMLButtonElement",
	"HTMLFormElement",
	"Node",
	"Event",
	"KeyboardEvent",
	"MouseEvent",
	"FocusEvent",
	"CustomEvent",
	"MutationObserver",
	"ResizeObserver",
	"DOMRect",
	"getComputedStyle",
	"requestAnimationFrame",
	"cancelAnimationFrame",
]) {
	const value = happyWindow[property as keyof GlobalWindow];

	if (value !== undefined) {
		Object.defineProperty(globalObject, property, {
			configurable: true,
			value,
		});
	}
}

const { cleanup } = await import("@testing-library/react");

afterEach(() => {
	cleanup();
	happyWindow.document.body.innerHTML = "";
});
