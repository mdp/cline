import { getFileMentionFromPath } from "@/core/mentions"
import { WebviewProvider } from "@/core/webview"
import { singleFileDiagnosticsToProblemsString } from "@/integrations/diagnostics"
import { telemetryService } from "@/services/posthog/PostHogClientProvider"
import { CommandContext, Empty } from "@/shared/proto/index.cline"
import { Controller } from "../index"
import { sendAddToInputEventToClient } from "../ui/subscribeToAddToInput"

// 'Add to Cline' context menu in editor and code action
// Inserts the selected code into the chat.
export async function addToCline(controller: Controller, request: CommandContext): Promise<Empty> {
	const timestamp = new Date().toISOString()
	console.log(`[${timestamp}] addToCline called with:`, {
		hasSelectedText: !!request.selectedText,
		selectedTextLength: request.selectedText?.length || 0,
		filePath: request.filePath,
		language: request.language,
		diagnosticsCount: request.diagnostics.length,
	})

	if (!request.selectedText) {
		console.log(`[${timestamp}] No selected text, returning early`)
		return {}
	}

	// Debug: Log all active webview instances
	const allInstances = WebviewProvider.getAllInstances()
	const visibleInstance = WebviewProvider.getVisibleInstance()
	const sidebarInstance = WebviewProvider.getSidebarInstance()
	const tabInstances = WebviewProvider.getTabInstances()
	console.log(`[${timestamp}] Webview instances state:`, {
		totalCount: allInstances.length,
		visibleExists: !!visibleInstance,
		sidebarExists: !!sidebarInstance,
		tabInstancesCount: tabInstances.length,
		instances: allInstances.map((inst) => ({
			clientId: inst.getClientId(),
			isVisible: inst.isVisible(),
			controllerId: inst.controller?.id,
		})),
	})

	const filePath = request.filePath || ""
	const fileMention = await getFileMentionFromPath(filePath)

	let input = `${fileMention}\n\`\`\`\n${request.selectedText}\n\`\`\``
	if (request.diagnostics.length) {
		const problemsString = await singleFileDiagnosticsToProblemsString(filePath, request.diagnostics)
		input += `\nProblems:\n${problemsString}`
	}

	const lastActiveWebview = WebviewProvider.getLastActiveInstance()

	if (!lastActiveWebview) {
		const errorDetails = {
			timestamp,
			activeInstancesCount: allInstances.length,
			visibleInstance: visibleInstance ? "exists" : "none",
			sidebarInstance: sidebarInstance ? "exists" : "none",
			tabInstances: tabInstances.length,
			lastActiveControllerId: WebviewProvider.getLastActiveControllerId(),
			allInstanceDetails: allInstances.map((inst) => ({
				controllerId: inst.controller?.id,
				clientId: inst.getClientId(),
				isVisible: inst.isVisible(),
			})),
		}

		const errorMessage = `No active webview found to send input to. Debug info: ${JSON.stringify(errorDetails, null, 2)}`
		console.error(`[${timestamp}] ERROR in addToCline:`, errorMessage)
		throw new Error(errorMessage)
	}

	const clientId = lastActiveWebview.getClientId()
	console.log(`[${timestamp}] Found active webview, sending to client:`, {
		clientId,
		inputLength: input.length,
		webviewIsVisible: lastActiveWebview.isVisible(),
	})

	try {
		await sendAddToInputEventToClient(clientId, input)
		console.log(`[${timestamp}] Successfully sent input to client:`, clientId)
	} catch (error) {
		console.error(`[${timestamp}] Failed to send input to client ${clientId}:`, error)
		throw new Error(`Failed to send input to webview (client: ${clientId}): ${error.message}`)
	}

	console.log(`[${timestamp}] addToCline completed successfully`)
	telemetryService.captureButtonClick("codeAction_addToChat", controller.task?.ulid)

	return {}
}
