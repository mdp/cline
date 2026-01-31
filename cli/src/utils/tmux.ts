/**
 * Tmux window management utilities
 */

/**
 * Checks if the current process is running inside a tmux session
 */
export function isInTmux(): boolean {
	return !!process.env.TMUX
}

/**
 * Sets the tmux window name using escape sequences
 * This works by sending the escape sequence directly to stdout
 * Format: \033k<name>\033\\
 *
 * @param name The name to set for the tmux window
 */
export function setTmuxWindowName(name: string): void {
	if (!isInTmux()) {
		return
	}

	// Tmux escape sequence to rename window:
	// \033k = ESC k (start window name)
	// \033\\ = ESC \ (end window name)
	process.stdout.write(`\x1bk${name}\x1b\\`)
}

/**
 * Automatically sets the tmux window name to 'cline' if running in tmux
 */
export function autoSetTmuxWindowName(): void {
	setTmuxWindowName("cline")
}
