import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { autoSetTmuxWindowName, isInTmux, setTmuxWindowName } from "./tmux"

describe("tmux", () => {
	let originalTmuxEnv: string | undefined
	let stdoutWriteSpy: ReturnType<typeof vi.spyOn>

	beforeEach(() => {
		// Save original TMUX env var
		originalTmuxEnv = process.env.TMUX
		// Spy on stdout.write
		stdoutWriteSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true)
	})

	afterEach(() => {
		// Restore original env var
		if (originalTmuxEnv !== undefined) {
			process.env.TMUX = originalTmuxEnv
		} else {
			delete process.env.TMUX
		}
		// Restore stdout.write
		stdoutWriteSpy.mockRestore()
	})

	describe("isInTmux", () => {
		it("should return true when TMUX env var is set", () => {
			process.env.TMUX = "/tmp/tmux-1000/default,12345,0"
			expect(isInTmux()).toBe(true)
		})

		it("should return false when TMUX env var is not set", () => {
			delete process.env.TMUX
			expect(isInTmux()).toBe(false)
		})

		it("should return false when TMUX env var is empty string", () => {
			process.env.TMUX = ""
			expect(isInTmux()).toBe(false)
		})
	})

	describe("setTmuxWindowName", () => {
		it("should write escape sequence when in tmux", () => {
			process.env.TMUX = "/tmp/tmux-1000/default,12345,0"
			setTmuxWindowName("test-name")
			expect(stdoutWriteSpy).toHaveBeenCalledWith("\x1bktest-name\x1b\\")
		})

		it("should not write when not in tmux", () => {
			delete process.env.TMUX
			setTmuxWindowName("test-name")
			expect(stdoutWriteSpy).not.toHaveBeenCalled()
		})

		it("should handle special characters in name", () => {
			process.env.TMUX = "/tmp/tmux-1000/default,12345,0"
			setTmuxWindowName("my-app:prod")
			expect(stdoutWriteSpy).toHaveBeenCalledWith("\x1bkmy-app:prod\x1b\\")
		})
	})

	describe("autoSetTmuxWindowName", () => {
		it('should set window name to "cline" when in tmux', () => {
			process.env.TMUX = "/tmp/tmux-1000/default,12345,0"
			autoSetTmuxWindowName()
			expect(stdoutWriteSpy).toHaveBeenCalledWith("\x1bkcline\x1b\\")
		})

		it("should not write when not in tmux", () => {
			delete process.env.TMUX
			autoSetTmuxWindowName()
			expect(stdoutWriteSpy).not.toHaveBeenCalled()
		})
	})
})
