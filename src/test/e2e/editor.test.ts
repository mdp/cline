import { expect } from "@playwright/test"
import { addSelectedCodeToClineWebview, getClineEditorWebviewFrame, openTab, toggleNotifications } from "./utils/common"
import { e2e } from "./utils/helpers"

e2e("code actions and editor panel", async ({ page, sidebar, helper }) => {
	// Simplified debug logging to avoid browser context issues
	const logDebug = (message: string, data?: any) => {
		const timestamp = new Date().toISOString()
		console.log(`[${timestamp}] [E2E DEBUG] ${message}`, data ? JSON.stringify(data) : "")
	}

	// Track console errors without aggressive event handling
	const consoleErrors: string[] = []
	page.on("console", (msg) => {
		if (msg.type() === "error") {
			const errorText = msg.text()
			consoleErrors.push(errorText)
			console.error(`[E2E CONSOLE ERROR]`, errorText)
		}
	})

	logDebug("Test starting")

	await sidebar.getByRole("button", { name: "Get Started for Free" }).click({ delay: 100 })
	logDebug("Clicked Get Started button")

	// Sidebar - input should start empty
	const sidebarInput = sidebar.getByTestId("chat-input")
	await sidebarInput.click()
	await toggleNotifications(page)
	await expect(sidebarInput).toBeEmpty()
	logDebug("Initial setup complete - input is empty")

	// Open file tree and select code from file
	await openTab(page, "Explorer ")
	await page.getByRole("treeitem", { name: "index.html" }).locator("a").click()
	await expect(sidebarInput).not.toBeFocused()
	logDebug("File selected")

	// Critical section - the failing part
	logDebug("About to call addSelectedCodeToClineWebview")

	try {
		await addSelectedCodeToClineWebview(page)
		logDebug("addSelectedCodeToClineWebview completed")

		// Small wait for async operations
		await page.waitForTimeout(100)
		logDebug("Waited 100ms for async operations")
	} catch (error) {
		logDebug("ERROR in addSelectedCodeToClineWebview", { error: error.message })
		console.error("[E2E DEBUG] Console errors during failure:", consoleErrors)
		throw error
	}

	// The critical assertion with better error reporting
	try {
		await expect(sidebarInput).not.toBeEmpty()
		logDebug("SUCCESS - Input is not empty")
	} catch (error) {
		// Capture final state for debugging
		const inputValue = await sidebarInput.inputValue().catch(() => "COULD_NOT_READ")
		const inputVisible = await sidebarInput.isVisible().catch(() => false)

		const debugInfo = {
			inputValue,
			inputVisible,
			consoleErrorCount: consoleErrors.length,
			consoleErrors: consoleErrors.slice(-5), // Last 5 errors only
		}

		logDebug("FAILED EXPECTATION - Input remained empty", debugInfo)

		const errorMessage = `Input remained empty after 5 seconds. Debug: ${JSON.stringify(debugInfo)}`
		throw new Error(errorMessage)
	}

	await expect(sidebarInput).toBeFocused()
	logDebug("Input is focused as expected")

	await page.getByRole("button", { name: "Open in Editor" }).click()
	await page.waitForLoadState("load")
	const clineEditorTab = page.getByRole("tab", { name: "Cline, Editor Group" })
	await expect(clineEditorTab).toBeVisible()

	// Editor Panel
	const clineEditorWebview = await getClineEditorWebviewFrame(page)

	await clineEditorWebview.getByTestId("chat-input").click()
	await expect(clineEditorWebview.getByTestId("chat-input")).toBeEmpty()
	await addSelectedCodeToClineWebview(page)
	await expect(clineEditorWebview.getByTestId("chat-input")).not.toBeEmpty()
})
