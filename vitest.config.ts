import path from "path"
import { defineConfig } from "vitest/config"

export default defineConfig({
	test: {
		// Only include .vitest.ts files for Vitest
		include: ["**/*.vitest.ts"],
		// Exclude Mocha test files
		exclude: ["**/node_modules/**", "**/dist/**", "**/*.test.ts", "**/src/test/**", "**/src/**/__tests__/**"],
		// Use Node.js environment for VSCode extension testing
		environment: "node",
		// Setup file for Vitest-specific configuration
		setupFiles: ["./src/test/vitest-setup.ts"],
		// Enable globals for describe, it, expect
		globals: true,
		// TypeScript configuration
		typecheck: {
			tsconfig: "./tsconfig.unit-test.json",
		},
	},
	resolve: {
		alias: {
			// Add path aliases if needed for imports
			"@": path.resolve(__dirname, "./src"),
		},
	},
})
