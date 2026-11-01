/**
 * 让宿主的模型说一次话。
 *
 * 这里**不 import 任何 harness 包**：`llm` 服务由调用方从 Cordis 上下文里取出来注入，
 * 所以一个假的 `{ stream() }` 就能离线测完整条链路。超时、取消、结束原因各是各的错，
 * 绝不把「没拿到答案」伪装成空字符串。
 *
 * 与 `dsh-case-infer/src/llm.mjs` 同源（同样零依赖），只是注意力的默认档位不同：
 * 代码审查需要推理，所以默认不传 `reasoningEffort`，让适配器用它自己的默认值。
 *
 * @module dsh-code-review/llm
 */

/**
 * 调用一次模型，把流里的文本拼起来。
 *
 * @param {object} options
 * @param {{stream: Function}} options.llm - 宿主的 `llm` 服务。
 * @param {string} options.provider - 提供方。
 * @param {string} options.model - 模型。
 * @param {string} options.system - 系统提示。
 * @param {string} options.user - 用户消息。
 * @param {number} [options.maxTokens]
 * @param {number} [options.timeoutMs]
 * @param {string} [options.reasoningEffort] - 不传则由适配器决定。
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<{text: string, finishReason: string|null, elapsedMs: number}>}
 * @throws {Error} 服务缺失、超时、被取消或模型报错时。
 */
export async function completeOnce({
  llm,
  provider,
  model,
  system,
  user,
  maxTokens = 8192,
  timeoutMs = 120_000,
  reasoningEffort,
  signal,
}) {
  if (llm === undefined || llm === null || typeof llm.stream !== 'function') {
    throw new Error('宿主没有加载 llm 服务（@deepseek-ai/dsh-llm），code_review 无法调用模型')
  }

  const started = Date.now()
  const controller = new AbortController()
  const forward = () => controller.abort()
  if (signal !== undefined && signal !== null && typeof signal.addEventListener === 'function') {
    signal.addEventListener('abort', forward, { once: true })
  }

  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)
  timer.unref?.()

  let text = ''
  let finish
  const shapes = new Set()
  try {
    const stream = llm.stream({
      provider,
      model,
      system,
      maxTokens,
      ...(reasoningEffort === undefined ? {} : { reasoningEffort }),
      messages: [{ role: 'user', content: [{ type: 'text', text: user }] }],
      signal: controller.signal,
    })
    for await (const chunk of stream) {
      const shape = chunk === null || typeof chunk !== 'object'
        ? typeof chunk
        : `${String(chunk.type ?? '?')}(${Object.keys(chunk).slice(0, 6).join(',')})`
      shapes.add(shape)
      if (chunk?.type === 'text-delta' && typeof chunk.text === 'string') text += chunk.text
      else if (chunk?.type === 'finish') finish = chunk
    }
  } finally {
    clearTimeout(timer)
    if (signal !== undefined && signal !== null && typeof signal.removeEventListener === 'function') {
      signal.removeEventListener('abort', forward)
    }
  }

  const elapsedMs = Date.now() - started
  if (timedOut) throw new Error(`模型在 ${timeoutMs}ms 内没有给出答案`)
  if (finish === undefined) throw new Error('模型调用没有结束标记（stream 提前断了）')
  if (text === '') {
    throw new Error(`模型返回了空文本（chunk 形状：${[...shapes].join(' | ') || '一个都没有'}；finish=${JSON.stringify(finish).slice(0, 200)}）`)
  }

  const kind = finish.reason?.kind ?? null
  if (kind === 'error' || kind === 'aborted') {
    throw new Error(finish.reason?.failure?.message ?? `模型调用结束于 ${kind}`)
  }
  if (kind === 'max-tokens') {
    throw new Error(`模型在 maxTokens=${maxTokens} 内没有给出正文（结束原因 max-tokens）：把配置里的 maxTokens 调大`)
  }
  return { text, finishReason: kind, elapsedMs }
}

/**
 * 决定这一次审查用哪个模型。
 *
 * 配置里写死了 provider/model 就用它；没写就用宿主当前默认模型——插件跟着会话走，
 * 用户在界面上换模型时它也跟着换。两样都没有就抛错，绝不静默换一个模型。
 *
 * @param {object} ctx - Cordis 插件上下文。
 * @param {{provider: string|null, model: string|null}} config
 * @returns {{llm: object, provider: string, model: string, source: 'config'|'default'}}
 * @throws {Error} 拿不到 llm 服务或默认模型时。
 */
export function resolveModel(ctx, config) {
  const llm = ctx.get('llm')
  if (llm === undefined || llm === null || typeof llm.stream !== 'function') {
    throw new Error('宿主没有加载 llm 服务（@deepseek-ai/dsh-llm），code_review 无法调用模型')
  }

  if (typeof config.provider === 'string' && typeof config.model === 'string') {
    return { llm, provider: config.provider, model: config.model, source: 'config' }
  }

  const service = ctx.get('agentDefaultModel')
  const selection = service === undefined || service === null ? null : service.currentSelection?.()
  if (selection === null || selection === undefined) {
    throw new Error('拿不到默认模型（agentDefaultModel 服务不可用）；请在插件配置里写死 provider 与 model')
  }
  if (typeof selection.provider !== 'string' || typeof selection.model !== 'string') {
    throw new Error('默认模型没有给出 provider/model；请在插件配置里写死这两个字段')
  }
  return { llm, provider: selection.provider, model: selection.model, source: 'default' }
}
