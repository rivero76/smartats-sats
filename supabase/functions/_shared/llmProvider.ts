/**
 * UPDATE LOG
 * 2026-03-01 00:00:00 | P16 Story 0: Core LLM provider abstraction — consolidates OpenAI retry logic,
 *   error mapping, schema fallback, and cost estimation from ats-analysis-direct, async-ats-scorer,
 *   enrich-experiences, and generate-upskill-roadmap into a single shared module.
 */

// ---------------------------------------------------------------------------
// Public interfaces
// ---------------------------------------------------------------------------

export interface LLMRequest {
  /** System prompt sent to the model */
  systemPrompt: string
  /** User prompt sent to the model */
  userPrompt: string
  /**
   * Ordered list of model names to attempt. The second and beyond are fallbacks
   * used only when the primary model returns a 5xx or 429 error.
   */
  modelCandidates: string[]
  /** JSON Schema for structured output. When provided, the adapter uses
   * `response_format.json_schema` (OpenAI) or equivalent for other providers. */
  jsonSchema?: Record<string, unknown>
  /** Schema name required when jsonSchema is provided (OpenAI constraint). */
  schemaName?: string
  temperature: number
  maxTokens: number
  /** Max retry attempts per model on HTTP-level failure (0–2). */
  retryAttempts: number
  /** Short label used in console logs for observability, e.g. 'ats-scoring'. */
  taskLabel: string
  /**
   * Optional pricing override for cost estimation (USD per 1M tokens).
   * When not set, the adapter uses MODEL_PRICING_USD built-in table.
   */
  pricingOverride?: { input: number; output: number }
}

export interface LLMResponse {
  /** Raw string content from the model (may be JSON or plain text). */
  rawContent: string
  /** The model name that produced the successful response. */
  modelUsed: string
  /** The active provider name (e.g. 'openai'). */
  provider: string
  promptTokens: number
  completionTokens: number
  /** Estimated cost in USD, or null if pricing data is unavailable. */
  costEstimateUsd: number | null
  /** Wall-clock duration in milliseconds for the successful call. */
  durationMs: number
  /** Number of retry attempts consumed on the winning model (0 = first try). */
  retryAttemptsUsed: number
}

// ---------------------------------------------------------------------------
// Known model pricing (USD per 1M tokens)
// ---------------------------------------------------------------------------

const MODEL_PRICING_USD: Record<string, { input: number; output: number }> = {
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4.1': { input: 2.00, output: 8.00 },
  'gpt-4.1-mini': { input: 0.40, output: 1.60 },
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Call the configured LLM provider with the given request.
 *
 * Provider is selected by the `SATS_LLM_PROVIDER` environment variable
 * (default: `'openai'`). Additional providers can be added here when needed.
 *
 * Throws if the provider is unrecognised or if all model candidates fail.
 */
export async function callLLM(request: LLMRequest): Promise<LLMResponse> {
  const provider = Deno.env.get('SATS_LLM_PROVIDER') || 'openai'

  if (provider === 'openai') {
    return callOpenAI(request)
  }

  throw new Error(
    `provider_not_implemented: LLM provider '${provider}' is not yet implemented. ` +
      `Set SATS_LLM_PROVIDER=openai or remove the variable to use the default.`
  )
}

// ---------------------------------------------------------------------------
// OpenAI adapter
// ---------------------------------------------------------------------------

async function callOpenAI(request: LLMRequest): Promise<LLMResponse> {
  const apiKey = Deno.env.get('OPENAI_API_KEY')
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured')
  }

  const baseUrl = (Deno.env.get('OPENAI_API_BASE_URL') || 'https://api.openai.com/v1').replace(
    /\/$/,
    ''
  )
  const chatCompletionsUrl = `${baseUrl}/chat/completions`

  let lastError: string | null = null
  const startTime = Date.now()

  for (const modelName of request.modelCandidates) {
    for (let attempt = 0; attempt <= request.retryAttempts; attempt++) {
      const retryHint =
        attempt === 0
          ? ''
          : '\n\nIMPORTANT: Your previous response was invalid. Return strict JSON that exactly matches the required schema keys and value types.'

      const userContent = `${request.userPrompt}${retryHint}`

      const buildBody = (useSchemaResponse: boolean) => ({
        model: modelName,
        temperature: request.temperature,
        max_tokens: request.maxTokens,
        messages: [
          { role: 'system', content: request.systemPrompt },
          { role: 'user', content: userContent },
        ],
        ...(useSchemaResponse && request.jsonSchema
          ? {
              response_format: {
                type: 'json_schema',
                json_schema: {
                  name: request.schemaName || 'response',
                  strict: true,
                  schema: request.jsonSchema,
                },
              },
            }
          : {}),
      })

      let response = await fetch(chatCompletionsUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(buildBody(true)),
      })

      if (!response.ok) {
        let providerBody = await response.text()

        // Schema unsupported by this model — retry the same attempt without schema mode
        if (response.status === 400 && request.jsonSchema && isSchemaUnsupportedError(providerBody)) {
          console.log(
            `[${request.taskLabel}] Schema output unsupported by ${modelName}; retrying without schema mode`
          )
          response = await fetch(chatCompletionsUrl, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(buildBody(false)),
          })
          providerBody = response.ok ? '' : await response.text()
        }

        if (!response.ok) {
          const { safeMessage, errorType } = mapProviderError(response.status, providerBody)
          console.error(
            `[${request.taskLabel}] OpenAI error: status=${response.status} type=${errorType} model=${modelName}`
          )

          // Auth errors — throw immediately; retries won't help
          if (response.status === 401 || response.status === 403) {
            throw new Error(safeMessage)
          }

          // Rate limit or server error — skip to next model
          if (response.status >= 500 || response.status === 429) {
            lastError = `Provider error on ${modelName}: ${response.status}`
            continue
          }

          throw new Error(safeMessage)
        }
      }

      const data = await response.json()
      const rawContent = data.choices?.[0]?.message?.content?.trim() || ''
      const usage = data.usage || {}
      const promptTokens: number = usage.prompt_tokens || 0
      const completionTokens: number = usage.completion_tokens || 0
      const durationMs = Date.now() - startTime

      const costEstimateUsd = calculateCost(
        promptTokens,
        completionTokens,
        modelName,
        request.pricingOverride
      )

      return {
        rawContent,
        modelUsed: modelName,
        provider: 'openai',
        promptTokens,
        completionTokens,
        costEstimateUsd,
        durationMs,
        retryAttemptsUsed: attempt,
      }
    }
  }

  throw new Error(lastError || 'All LLM model candidates exhausted without a successful response')
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function calculateCost(
  promptTokens: number,
  completionTokens: number,
  model: string,
  pricingOverride?: { input: number; output: number }
): number | null {
  const pricing = pricingOverride || MODEL_PRICING_USD[model]
  if (!pricing) return null

  const inputCost = (promptTokens / 1_000_000) * pricing.input
  const outputCost = (completionTokens / 1_000_000) * pricing.output
  return Number((inputCost + outputCost).toFixed(6))
}

function mapProviderError(
  status: number,
  providerBody?: string
): { safeMessage: string; errorType: string } {
  if (status === 401 || status === 403) {
    return {
      safeMessage: 'AI provider key misconfigured. Please contact support.',
      errorType: 'provider_auth_error',
    }
  }

  if (status === 429) {
    return {
      safeMessage: 'AI provider rate limit reached. Please retry shortly.',
      errorType: 'provider_rate_limited',
    }
  }

  if (status >= 500) {
    return {
      safeMessage: 'AI provider temporarily unavailable. Please retry shortly.',
      errorType: 'provider_unavailable',
    }
  }

  if (status === 400) {
    const normalizedBody = (providerBody || '').toLowerCase()
    if (
      normalizedBody.includes('response_format') ||
      normalizedBody.includes('json_schema') ||
      normalizedBody.includes('schema')
    ) {
      return {
        safeMessage: 'AI model does not support required structured output settings.',
        errorType: 'provider_model_capability_error',
      }
    }
    if (
      normalizedBody.includes('model') &&
      (normalizedBody.includes('not found') ||
        normalizedBody.includes('does not exist') ||
        normalizedBody.includes('invalid'))
    ) {
      return {
        safeMessage: 'AI model configuration is invalid. Check model env var settings.',
        errorType: 'provider_model_config_error',
      }
    }
  }

  return {
    safeMessage: `AI provider request failed (${status}).`,
    errorType: 'provider_request_error',
  }
}

function isSchemaUnsupportedError(providerBody: string): boolean {
  const normalizedBody = providerBody.toLowerCase()
  return (
    (normalizedBody.includes('response_format') || normalizedBody.includes('json_schema')) &&
    (normalizedBody.includes('unsupported') ||
      normalizedBody.includes('not support') ||
      normalizedBody.includes('invalid'))
  )
}
