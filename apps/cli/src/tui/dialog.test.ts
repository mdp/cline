import { KeyEvent, type TextareaRenderable } from "@opentui/core";
import { testRender } from "@opentui/react/test-utils";
import { act, createElement, type ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import {
	type ChoiceContext,
	type DialogActions,
	DialogProvider,
	useDialog,
	useDialogKeyboard,
} from "./dialog";

let setup: Awaited<ReturnType<typeof testRender>> | undefined;
let actions: DialogActions;

function Harness(props: { children?: ReactNode }) {
	actions = useDialog();
	return props.children ?? null;
}

function key(name: string) {
	return new KeyEvent({
		name,
		sequence: name === "escape" ? "\u001b" : name,
		raw: name,
		ctrl: false,
		meta: false,
		shift: false,
		option: false,
		number: false,
		eventType: "press",
		source: "raw",
	});
}

async function renderProvider(children?: ReactNode) {
	setup = await testRender(
		createElement(
			DialogProvider,
			{ size: "small" },
			createElement(Harness, null, children),
		),
		{ width: 80, height: 24 },
	);
	await act(async () => setup?.renderOnce());
}

afterEach(() => {
	act(() => setup?.renderer.destroy());
	setup = undefined;
});

describe("dialog compatibility", () => {
	it("resolves choices and dismisses them with Escape", async () => {
		await renderProvider();
		let first!: Promise<string | undefined>;
		act(() => {
			first = actions.choice({
				content: (context) =>
					createElement("text", null, `choice-${context.dialogId}`),
			});
		});
		await setup?.renderOnce();
		act(() => setup?.renderer.keyInput.emit("keypress", key("escape")));
		expect(await first).toBeUndefined();

		let second!: Promise<string | undefined>;
		let context!: ChoiceContext<string>;
		act(() => {
			second = actions.choice({
				content: (value) => {
					context = value;
					return createElement("text", null, "resolve me");
				},
			});
		});
		await setup?.renderOnce();
		act(() => context.resolve("selected"));
		expect(await second).toBe("selected");
	});

	it("closes loading-style dialogs by their targeted ID", async () => {
		await renderProvider();
		let id!: string | number;
		act(() => {
			id = actions.show({
				closeOnEscape: false,
				content: () => createElement("text", null, "Loading"),
			});
		});
		act(() => expect(actions.close(id)).toBe(id));
		expect(actions.close(id)).toBeUndefined();
	});

	it("routes keyboard input only to the topmost stacked dialog", async () => {
		const calls: string[] = [];
		function Capture(props: { context: ChoiceContext<string>; name: string }) {
			useDialogKeyboard(() => {
				calls.push(props.name);
			}, props.context.dialogId);
			return createElement("text", null, props.name);
		}
		await renderProvider();
		act(() => {
			for (const name of ["lower", "upper"]) {
				void actions.choice({
					closeOnEscape: false,
					content: (context) => createElement(Capture, { context, name }),
				});
			}
		});
		await setup?.renderOnce();
		act(() => setup?.renderer.keyInput.emit("keypress", key("x")));
		expect(calls).toEqual(["upper"]);
	});

	it("restores focus and honors the Escape close override", async () => {
		let textarea: TextareaRenderable | null = null;
		await renderProvider(
			createElement("textarea", {
				focused: true,
				ref: (value: TextareaRenderable | null) => {
					textarea = value;
				},
			}),
		);
		(textarea as TextareaRenderable | null)?.focus();
		let id!: string | number;
		act(() => {
			id = actions.show({
				closeOnEscape: false,
				content: () => createElement("text", null, "persistent"),
			});
		});
		await setup?.renderOnce();
		act(() => setup?.renderer.keyInput.emit("keypress", key("escape")));
		act(() => expect(actions.close(id)).toBe(id));
		await setup?.renderOnce();
		expect((textarea as TextareaRenderable | null)?.focused).toBe(true);
	});
});
