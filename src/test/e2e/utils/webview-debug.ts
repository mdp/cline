import type { Page } from "@playwright/test"

/**
 * Debug utilities for tracking webview state during E2E tests
 */

export interface WebviewDebugInfo {
	timestamp: string
	label: string
	webviewCount: number
	sidebarExists: boolean
	tabCount: number
	activeWebview: {
		exists: boolean
		clientId?: string
		isVisible?: boolean
	}
	subscriptions: {
		addToInput?: boolean
	}
	errors: string[]
}

/**
 * Captures comprehensive webview state for debugging
 */
export async function captureWebviewState(page: Page, label: string): Promise<WebviewDebugInfo> {
	const timestamp = new Date().toISOString()

	try {
		// Try to get webview state from the extension host
		const webviewState = await page
			.evaluate(() => {
				// This will be executed in the extension host context
				// We need to check if these globals exist
				const win = window as any

				return {
					hasWebviewProvider: typeof win.WebviewProvider !== "undefined",
					// Add more checks as needed
				}
			})
			.catch(() => ({ hasWebviewProvider: false }))

		console.log(`[WEBVIEW DEBUG] ${label} at ${timestamp}:`, webviewState)

		return {
			timestamp,
			label,
			webviewCount: 0, // Will be populated from actual data
			sidebarExists: false,
			tabCount: 0,
			activeWebview: {
				exists: false,
			},
			subscriptions: {},
			errors: [],
		}
	} catch (error) {
		console.error(`[WEBVIEW DEBUG] Failed to capture state for ${label}:`, error)
		return {
			timestamp,
			label,
			webviewCount: -1,
			sidebarExists: false,
			tabCount: 0,
			activeWebview: {
				exists: false,
			},
			subscriptions: {},
			errors: [`Failed to capture state: ${error}`],
		}
	}
}

/**
 * Logs webview lifecycle events
 */
export function setupWebviewLifecycleLogging(page: Page) {
	// Log when webviews are created/destroyed
	page.on("frameattached", (frame) => {
		if (frame.url().includes("webview")) {
			console.log(`[WEBVIEW LIFECYCLE] Frame attached: ${frame.url()}`)
		}
	})

	page.on("framedetached", (frame) => {
		if (frame.url().includes("webview")) {
			console.log(`[WEBVIEW LIFECYCLE] Frame detached: ${frame.url()}`)
		}
	})
}

/**
 * Waits for webview to be ready with detailed logging
 */
export async function waitForWebviewReady(page: Page, sidebar: Page, maxWaitTime: number = 5000): Promise<boolean> {
	const startTime = Date.now()
	const checkInterval = 100

	console.log(`[WEBVIEW READY CHECK] Starting wait for webview (max ${maxWaitTime}ms)`)

	while (Date.now() - startTime < maxWaitTime) {
		try {
			// Check if the chat input exists and is visible
			const chatInput = sidebar.getByTestId("chat-input")
			const isVisible = await chatInput.isVisible().catch(() => false)
			const isEnabled = await chatInput.isEnabled().catch(() => false)

			if (isVisible && isEnabled) {
				console.log(`[WEBVIEW READY CHECK] Webview ready after ${Date.now() - startTime}ms`)
				return true
			}

			// Log periodic status
			if ((Date.now() - startTime) % 1000 < checkInterval) {
				console.log(`[WEBVIEW READY CHECK] Still waiting... (${Date.now() - startTime}ms elapsed)`)
			}
		} catch (error) {
			console.error(`[WEBVIEW READY CHECK] Error checking webview state:`, error)
		}

		await page.waitForTimeout(checkInterval)
	}

	console.error(`[WEBVIEW READY CHECK] Timeout after ${maxWaitTime}ms - webview not ready`)
	return false
}

/**
 * Captures and logs all relevant debug information when a test fails
 */
export async function captureFailureDebugInfo(page: Page, sidebar: Page, testName: string, error: any): Promise<void> {
	console.error(`\n${"=".repeat(80)}`)
	console.error(`TEST FAILURE DEBUG INFO: ${testName}`)
	console.error(`${"=".repeat(80)}`)

	// Capture final state
	const timestamp = new Date().toISOString()
	console.error(`Failure Time: ${timestamp}`)
	console.error(`Error:`, error)

	// Try to capture input state
	try {
		const chatInput = sidebar.getByTestId("chat-input")
		const inputState = {
			value: await chatInput.inputValue().catch(() => "COULD_NOT_READ"),
			visible: await chatInput.isVisible().catch(() => false),
			enabled: await chatInput.isEnabled().catch(() => false),
			focused: await chatInput.evaluate((el) => el === document.activeElement).catch(() => false),
		}
		console.error(`Chat Input State:`, JSON.stringify(inputState, null, 2))
	} catch (e) {
		console.error(`Could not capture input state:`, e)
	}

	// Try to capture page URL and title
	try {
		console.error(`Page URL: ${page.url()}`)
		console.error(`Page Title: ${await page.title()}`)
	} catch (e) {
		console.error(`Could not capture page info:`, e)
	}

	console.error(`${"=".repeat(80)}\n`)
}
