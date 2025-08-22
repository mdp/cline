import { describe, expect, it } from "vitest"
import { shouldSkipReasoningForModel } from "../model-utils"

describe("shouldSkipReasoningForModel", () => {
	it("should return true for grok-4 models", () => {
		expect(shouldSkipReasoningForModel("grok-4")).toBe(true)
		expect(shouldSkipReasoningForModel("x-ai/grok-4")).toBe(true)
		expect(shouldSkipReasoningForModel("openrouter/grok-4-turbo")).toBe(true)
		expect(shouldSkipReasoningForModel("some-provider/grok-4-mini")).toBe(true)
	})

	it("should return false for non-grok-4 models", () => {
		expect(shouldSkipReasoningForModel("grok-3")).toBe(false)
		expect(shouldSkipReasoningForModel("grok-2")).toBe(false)
		expect(shouldSkipReasoningForModel("claude-3-sonnet")).toBe(false)
		expect(shouldSkipReasoningForModel("gpt-4")).toBe(false)
		expect(shouldSkipReasoningForModel("gemini-pro")).toBe(false)
	})

	it("should return false for undefined or empty model IDs", () => {
		expect(shouldSkipReasoningForModel(undefined)).toBe(false)
		expect(shouldSkipReasoningForModel("")).toBe(false)
	})

	it("should be case sensitive", () => {
		expect(shouldSkipReasoningForModel("GROK-4")).toBe(false)
		expect(shouldSkipReasoningForModel("Grok-4")).toBe(false)
	})
})
