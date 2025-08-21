// Vitest setup file for Cline extension tests
// This file is loaded before all Vitest tests run

import { vi } from "vitest"

// Mock VSCode API for Vitest tests
const mockVscode = {
	workspace: {
		getConfiguration: vi.fn(() => ({
			get: vi.fn(),
			update: vi.fn(),
			has: vi.fn(),
			inspect: vi.fn(),
		})),
		workspaceFolders: [],
		onDidChangeConfiguration: vi.fn(),
		onDidChangeWorkspaceFolders: vi.fn(),
		createFileSystemWatcher: vi.fn(() => ({
			onDidCreate: vi.fn(),
			onDidChange: vi.fn(),
			onDidDelete: vi.fn(),
			dispose: vi.fn(),
		})),
	},
	window: {
		showErrorMessage: vi.fn(),
		showWarningMessage: vi.fn(),
		showInformationMessage: vi.fn(),
		createOutputChannel: vi.fn(() => ({
			appendLine: vi.fn(),
			show: vi.fn(),
			dispose: vi.fn(),
		})),
	},
	commands: {
		registerCommand: vi.fn(),
		executeCommand: vi.fn(),
	},
	Uri: {
		file: vi.fn((path: string) => ({ fsPath: path, path })),
		parse: vi.fn(),
	},
	ExtensionContext: vi.fn(),
	Disposable: {
		from: vi.fn(),
	},
}

// Make VSCode API available globally for tests
vi.stubGlobal("vscode", mockVscode)

// Setup any other global test configuration here
