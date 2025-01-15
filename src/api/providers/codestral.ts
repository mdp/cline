import { Anthropic } from "@anthropic-ai/sdk"
import OpenAI from "openai"
import { ApiHandlerOptions, ModelInfo, CodestralModelId, codestralModels, codestralDefaultModelId } from "../../shared/api"
import { ApiHandler } from "../index"
import { ApiStream } from "../transform/stream"
import { convertToOpenAiMessages } from "../transform/openai-format"

export class CodestralHandler implements ApiHandler {
    private options: ApiHandlerOptions
    private apiKey: string
    private baseURL: string = 'https://codestral.mistral.ai'

    constructor(options: ApiHandlerOptions) {
        this.options = options
        this.apiKey = this.options.codestralApiKey || ''
        if (!this.apiKey) {
            throw new Error('Codestral API key is required')
        }
    }

    async *createMessage(systemPrompt: string, messages: Anthropic.Messages.MessageParam[]): ApiStream {
        const model = this.getModel()

        try {
            const response = await fetch(`${this.baseURL}/v1/fim/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: model.id,
                    messages: [{ role: "system", content: systemPrompt }, ...convertToOpenAiMessages(messages)],
                    max_tokens: model.info.maxTokens,
                    temperature: 0,
                    stream: true
                })
            })

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }

            const reader = response.body?.getReader()
            if (!reader) {
                throw new Error('Response body is not readable')
            }

            const decoder = new TextDecoder()
            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                const chunk = decoder.decode(value)
                const lines = chunk.split('\n')
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = JSON.parse(line.slice(6))
                        if (data.choices && data.choices[0]?.delta?.content) {
                            yield {
                                type: "text",
                                text: data.choices[0].delta.content,
                            }
                        }
                        if (data.usage) {
                            yield {
                                type: "usage",
                                inputTokens: data.usage.prompt_tokens || 0,
                                outputTokens: data.usage.completion_tokens || 0,
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error calling Codestral API:', error)
            throw error
        }
    }

    getModel(): { id: CodestralModelId; info: ModelInfo } {
        const modelId = this.options.codestralModelId as CodestralModelId
        if (modelId && modelId in codestralModels) {
            return { id: modelId, info: codestralModels[modelId] }
        }
        return {
            id: codestralDefaultModelId,
            info: codestralModels[codestralDefaultModelId],
        }
    }
}
