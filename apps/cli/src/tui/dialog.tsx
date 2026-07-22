// @jsxImportSource @opentui/react
import type { BorderStyle, KeyEvent } from "@opentui/core";
import { RGBA } from "@opentui/core";
import { useRenderer, useTerminalDimensions } from "@opentui/react";
import { Dialog } from "@tuiparts/react/dialog";
import {
	type ComponentRef,
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";

export type DialogId = string | number;
export type DialogSize = "small" | "medium" | "large" | "full";

export interface DialogStyle {
	backgroundColor?: string;
	borderColor?: string;
	borderStyle?: BorderStyle;
	border?: boolean;
	width?: number | string;
	maxWidth?: number;
	minWidth?: number;
	maxHeight?: number;
	padding?: number;
	paddingX?: number;
	paddingY?: number;
	paddingTop?: number;
	paddingRight?: number;
	paddingBottom?: number;
	paddingLeft?: number;
}

export interface ChoiceContext<T> {
	resolve: (value: T) => void;
	dismiss: () => void;
	dialogId: DialogId;
}

export interface ShowOptions {
	id?: DialogId;
	content: () => ReactNode;
	size?: DialogSize;
	style?: DialogStyle;
	unstyled?: boolean;
	closeOnEscape?: boolean;
	closeOnClickOutside?: boolean;
	backdropColor?: string;
	backdropOpacity?: number | string;
	onClose?: () => void;
	onOpen?: () => void;
	onBackdropClick?: () => void;
}

export interface ChoiceOptions<T> extends Omit<ShowOptions, "id" | "content"> {
	content: (context: ChoiceContext<T>) => ReactNode;
	fallback?: T;
}

interface DialogEntry extends ShowOptions {
	id: DialogId;
	onDismiss?: () => void;
}

export interface DialogState {
	isOpen: boolean;
	dialogs: readonly DialogEntry[];
	topDialog: DialogEntry | undefined;
	count: number;
}

export interface DialogActions {
	show: (options: ShowOptions) => DialogId;
	close: (id?: DialogId) => DialogId | undefined;
	closeAll: () => void;
	replace: (options: ShowOptions) => DialogId;
	choice: <T>(options: ChoiceOptions<T>) => Promise<T | undefined>;
}

interface DialogContextValue {
	actions: DialogActions;
	state: DialogState;
}

export interface DialogProviderProps {
	children?: ReactNode;
	size?: DialogSize;
	dialogOptions?: { style?: DialogStyle };
	sizePresets?: Partial<Record<DialogSize, number>>;
	closeOnEscape?: boolean;
	closeOnClickOutside?: boolean;
	backdropColor?: string;
	backdropOpacity?: number | string;
	unstyled?: boolean;
}

const DialogContext = createContext<DialogContextValue | null>(null);

function useDialogContext(): DialogContextValue {
	const context = useContext(DialogContext);
	if (!context) {
		throw new Error("Dialog hooks must be used within a DialogProvider");
	}
	return context;
}

function normalizeOpacity(value: number | string | undefined): number {
	if (typeof value === "string") {
		return Math.max(0, Math.min(1, Number.parseFloat(value) / 100));
	}
	return Math.max(0, Math.min(1, value ?? 0.35));
}

function DialogLayer(props: {
	entry: DialogEntry;
	provider: Omit<DialogProviderProps, "children">;
	onDismiss: (id: DialogId) => void;
	onRoot: (id: DialogId, root: ComponentRef<typeof Dialog.Root> | null) => void;
}) {
	const { entry, provider, onDismiss, onRoot } = props;
	const dimensions = useTerminalDimensions();
	const closeOnEscape = entry.closeOnEscape ?? provider.closeOnEscape ?? true;
	const closeOnClickOutside =
		entry.closeOnClickOutside ?? provider.closeOnClickOutside ?? false;
	const unstyled = entry.unstyled ?? provider.unstyled ?? false;
	const style = {
		...(unstyled
			? {}
			: { backgroundColor: "#262626", border: false, padding: 1 }),
		...provider.dialogOptions?.style,
		...entry.style,
	};
	const size = entry.size ?? provider.size ?? "medium";
	const defaultWidths: Record<DialogSize, number> = {
		small: 40,
		medium: 60,
		large: 80,
		full: Math.max(1, dimensions.width - 4),
	};
	const width =
		style.width ?? provider.sizePresets?.[size] ?? defaultWidths[size];
	const backdrop = RGBA.fromHex(
		entry.backdropColor ?? provider.backdropColor ?? "#000000",
	);
	backdrop.a = normalizeOpacity(
		entry.backdropOpacity ?? provider.backdropOpacity,
	);

	return (
		<Dialog.Root
			ref={(root) => onRoot(entry.id, root)}
			open
			onOpenChange={(open, details) => {
				if (open) return;
				if (details.reason === "escape" && !closeOnEscape) {
					details.preventDefault();
					return;
				}
				if (details.reason === "outside") {
					entry.onBackdropClick?.();
					if (!closeOnClickOutside) {
						details.preventDefault();
						return;
					}
				}
				onDismiss(entry.id);
			}}
		>
			<Dialog.Portal
				width="100%"
				height="100%"
				alignItems="center"
				justifyContent="center"
			>
				<Dialog.Backdrop
					width="100%"
					height="100%"
					backgroundColor={backdrop}
				/>
				<Dialog.Popup
					width={width as number | `${number}%`}
					maxWidth={style.maxWidth ?? Math.max(1, dimensions.width - 2)}
					minWidth={style.minWidth}
					maxHeight={style.maxHeight}
					backgroundColor={style.backgroundColor}
					border={style.border}
					borderColor={style.borderColor}
					borderStyle={style.borderStyle}
					padding={unstyled ? 0 : style.padding}
					paddingX={style.paddingX}
					paddingY={style.paddingY}
					paddingTop={style.paddingTop}
					paddingRight={style.paddingRight}
					paddingBottom={style.paddingBottom}
					paddingLeft={style.paddingLeft}
				>
					{entry.content()}
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	);
}

export function DialogProvider(props: DialogProviderProps) {
	const { children, ...providerOptions } = props;
	const [dialogs, setDialogs] = useState<DialogEntry[]>([]);
	const dialogsRef = useRef(dialogs);
	dialogsRef.current = dialogs;
	const nextId = useRef(0);
	const roots = useRef(new Map<DialogId, ComponentRef<typeof Dialog.Root>>());
	const updateDialogs = useCallback((next: DialogEntry[]) => {
		dialogsRef.current = next;
		setDialogs(next);
	}, []);

	const close = useCallback(
		(id?: DialogId): DialogId | undefined => {
			const current = dialogsRef.current;
			const target = id ?? current.at(-1)?.id;
			if (target === undefined || !current.some((item) => item.id === target)) {
				return undefined;
			}
			const entry = current.find((item) => item.id === target);
			entry?.onClose?.();
			entry?.onDismiss?.();
			const root = roots.current.get(target);
			if (root) root.open = false;
			roots.current.delete(target);
			updateDialogs(current.filter((item) => item.id !== target));
			return target;
		},
		[updateDialogs],
	);

	const show = useCallback(
		(options: ShowOptions): DialogId => {
			const id = options.id ?? `dialog-${++nextId.current}`;
			const entry = { ...options, id };
			updateDialogs([...dialogsRef.current, entry]);
			queueMicrotask(() => entry.onOpen?.());
			return id;
		},
		[updateDialogs],
	);

	const actions = useMemo<DialogActions>(
		() => ({
			show,
			close,
			closeAll: () => {
				for (const entry of [...dialogsRef.current].reverse()) close(entry.id);
			},
			replace: (options) => {
				for (const entry of [...dialogsRef.current].reverse()) close(entry.id);
				return show(options);
			},
			choice: <T,>(options: ChoiceOptions<T>) =>
				new Promise<T | undefined>((resolvePromise) => {
					const id = `dialog-${++nextId.current}`;
					let settled = false;
					const settle = (value: T | undefined) => {
						if (settled) return;
						settled = true;
						close(id);
						resolvePromise(value);
					};
					const { content, fallback, ...rest } = options;
					const context: ChoiceContext<T> = {
						dialogId: id,
						resolve: (value) => settle(value),
						dismiss: () => settle(undefined),
					};
					updateDialogs([
						...dialogsRef.current,
						{
							...rest,
							id,
							content: () => content(context),
							onDismiss: () => {
								if (!settled) {
									settled = true;
									resolvePromise(fallback);
								}
							},
						},
					]);
				}),
		}),
		[close, show, updateDialogs],
	);

	const state = useMemo<DialogState>(
		() => ({
			isOpen: dialogs.length > 0,
			dialogs,
			topDialog: dialogs.at(-1),
			count: dialogs.length,
		}),
		[dialogs],
	);
	const handleRoot = useCallback(
		(id: DialogId, root: ComponentRef<typeof Dialog.Root> | null) => {
			if (root) roots.current.set(id, root);
			else roots.current.delete(id);
		},
		[],
	);

	return (
		<DialogContext.Provider value={{ actions, state }}>
			{children}
			{dialogs.map((entry) => (
				<DialogLayer
					key={entry.id}
					entry={entry}
					provider={providerOptions}
					onDismiss={close}
					onRoot={handleRoot}
				/>
			))}
		</DialogContext.Provider>
	);
}

export function useDialog(): DialogActions {
	return useDialogContext().actions;
}

export function useDialogState<T>(selector: (state: DialogState) => T): T {
	return selector(useDialogContext().state);
}

export function useDialogKeyboard(
	handler: (key: KeyEvent) => void | Promise<void>,
	dialogId?: DialogId,
): void {
	const renderer = useRenderer();
	const isTopmost = useDialogState(
		(state) => dialogId === undefined || state.topDialog?.id === dialogId,
	);
	useEffect(() => {
		const onKeyPress = (key: KeyEvent) => {
			if (isTopmost) void handler(key);
		};
		// Tuiparts owns Escape and Tab at the primitive layer. Register dialog
		// content first so existing Cline dialogs can resolve a choice on Escape
		// before the primitive applies the provider's dismissal policy.
		renderer.keyInput.prependListener("keypress", onKeyPress);
		return () => {
			renderer.keyInput.off("keypress", onKeyPress);
		};
	}, [handler, isTopmost, renderer]);
}
