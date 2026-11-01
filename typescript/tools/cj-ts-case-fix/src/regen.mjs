/**
 * 重新生成 `.infer`：把「判定」这件事交回 `case_infer`，不在这里重写。
 *
 * 两条路，优先第一条：
 * 1. 宿主里注册了 `case_infer`（`cj-ts-case-infer` 插件）→ 直接调那个工具；
 * 2. 没有注册 → import 仓库里的同一份实现（`typescript/tools/cj-ts-case-infer/src/tools/infer.mjs`）。
 *
 * 这样 `case_fix` 对 `.infer` 的判定口径与 `case_infer` 完全一致：同一个 prompt、同一套
 * 校验、同一条 `llm` 通道。判定有分歧（`pending`）时不替用户选，原样报 `needs-decision`。
 *
 * @module cj-ts-case-fix/regen
 */

/**
 * 构造重生成器。
 *
 * @param {object} options
 * @param {object} options.ctx - Cordis 插件上下文（取 llm / agentDefaultModel / tools）。
 * @param {object} options.config - 归一化配置（取 root / provider / model / runs / 超时）。
 * @param {object} options.logger
 * @returns {{describe: () => string, regenerate: (entry: object, options?: object) => Promise<object>}}
 */
export function createRegenerator({ ctx, config, logger }) {
  let fallback = null

  return {
    describe() {
      const tool = inferTool(ctx)
      return tool === null
        ? 'case_infer 里的同一份实现（case_infer 工具未注册）'
        : 'case_infer 工具'
    },

    /**
     * 重新判定一个用例。
     *
     * @param {{id: string, file: string, rel: string, inferPath: string}} entry
     * @param {{runs?: number, decisions?: Record<string, number>}} [options]
     * @returns {Promise<{
     *   available: boolean,
     *   source: 'tool'|'sibling'|null,
     *   ok: boolean,
     *   needsDecision: boolean,
     *   status: string|null,
     *   file: string|null,
     *   nodes: number|null,
     *   pending: object[],
     *   calls: number|null,
     *   model: object|null,
     *   error: string|null,
     *   text: string|null,
     * }>} 结果。
     */
    async regenerate(entry, options = {}) {
      const tool = await resolveTool()
      if (tool === null) {
        return {
          available: false,
          source: null,
          ok: false,
          needsDecision: false,
          status: null,
          file: null,
          nodes: null,
          pending: [],
          calls: null,
          model: null,
          error: '拿不到 case_infer 实现：工具未注册，仓库里的 cj-ts-case-infer 也加载不了',
          text: null,
        }
      }

      const args = {
        case: entry.id,
        overwrite: true,
        runs: options.runs ?? config.runs,
      }
      if (options.decisions !== undefined && options.decisions !== null) {
        args.decisions = options.decisions
      }

      logger.info(`case-fix: 重新判定 ${entry.id}（runs=${args.runs}${args.decisions === undefined ? '' : '，decisions'}）`)
      try {
        const result = await tool.execute(args, { cwd: config.root })
        return {
          available: true,
          source: tool.source,
          ok: result?.ok === true,
          needsDecision: result?.status === 'needs-decision',
          status: typeof result?.status === 'string' ? result.status : null,
          file: typeof result?.file === 'string' ? result.file : null,
          nodes: typeof result?.nodes === 'number' ? result.nodes : null,
          pending: Array.isArray(result?.pending) ? result.pending : [],
          calls: typeof result?.calls === 'number' ? result.calls : null,
          model: result?.model ?? null,
          error: null,
          text: typeof result?.text === 'string' ? result.text : null,
        }
      } catch (error) {
        return {
          available: true,
          source: tool.source,
          ok: false,
          needsDecision: false,
          status: null,
          file: null,
          nodes: null,
          pending: [],
          calls: null,
          model: null,
          error: error instanceof Error ? error.message : String(error),
          text: null,
        }
      }
    },
  }

  /**
   * 先找工具，再退回仓库里的同一份实现；两边都没有就返回 null。
   *
   * @returns {Promise<{execute: Function, source: 'tool'|'sibling'}|null>}
   */
  async function resolveTool() {
    const tool = inferTool(ctx)
    if (tool !== null) {
      return { execute: (args, context) => tool.execute(args, context), source: 'tool' }
    }
    if (fallback === null) {
      try {
        fallback = await loadSibling(ctx, config, logger)
      } catch (error) {
        logger.error(`case-fix: 加载 cj-ts-case-infer 失败：${error instanceof Error ? error.message : String(error)}`)
        fallback = false
      }
    }
    return fallback === false ? null : fallback
  }
}

/**
 * 宿主里注册的 `case_infer` 工具。
 *
 * @param {object} ctx
 * @returns {object|null}
 */
function inferTool(ctx) {
  const tools = typeof ctx?.get === 'function' ? ctx.get('tools') : undefined
  if (tools === undefined || tools === null || typeof tools.get !== 'function') {
    return null
  }
  const tool = tools.get('case_infer')
  return tool !== null && tool !== undefined && typeof tool.execute === 'function' ? tool : null
}

/**
 * 从仓库里加载同一份 `case_infer` 实现。
 *
 * @param {object} ctx
 * @param {object} config
 * @param {object} logger
 * @returns {Promise<{execute: Function, source: 'sibling'}>}
 */
async function loadSibling(ctx, config, logger) {
  const inferUrl = new URL('../../cj-ts-case-infer/src/tools/infer.mjs', import.meta.url)
  const configUrl = new URL('../../cj-ts-case-infer/src/config.mjs', import.meta.url)
  const inferModule = await import(inferUrl.href)
  const configModule = await import(configUrl.href)
  const inferConfig = configModule.normalizeConfig({
    root: config.root,
    provider: config.provider,
    model: config.model,
    maxTokens: config.maxTokens,
    timeoutMs: config.timeoutMs,
    retries: config.retries,
    runs: config.runs,
  })
  const tool = inferModule.createInferTool(ctx, inferConfig, logger)
  logger.info('case-fix: 用仓库里的 cj-ts-case-infer 实现重新判定（case_infer 工具未注册）')
  return { execute: (args, context) => tool.execute(args, context), source: 'sibling' }
}
