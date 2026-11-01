/**
 * 修完之后的 `code_review`。
 *
 * 有两条路，优先第一条：
 * 1. 宿主里注册了 `code_review`（`cj-ts-code-review` 插件）→ 直接调那个工具；
 * 2. 没有注册 → 从同一个仓库里 import 同一份审查实现
 *    （`typescript/tools/cj-ts-code-review/src/tools/review.mjs`）来跑。
 *
 * 两条路用的是同一份规则解析、同一份校验、同一条 `llm` 通道，结论不会有第二种口径。
 * 两条都不通就明确报 `available: false`，不假装审过了。
 *
 * @module cj-ts-case-fix/review
 */

/** 阶段从高到低；`failOn` 是「到这一级就算不通过」。 */
const RANK = { P0: 0, P1: 1, P2: 2, P3: 3 }

/**
 * 构造审查器。
 *
 * @param {object} options
 * @param {object} options.ctx - Cordis 插件上下文。
 * @param {object} options.config - 归一化配置（取 root / provider / model）。
 * @param {object} options.logger
 * @returns {{run: (options: {paths: string[]}) => Promise<object>, describe: () => string}}
 */
export function createReviewer({ ctx, config, logger }) {
  let fallback = null

  return {
    describe() {
      return reviewTool(ctx) === null
        ? 'cj-ts-code-review 里的同一份实现（code_review 工具未注册）'
        : 'code_review 工具'
    },

    /**
     * 审这些文件。
     *
     * @param {{paths: string[]}} options - 相对仓库根的路径。
     * @returns {Promise<{
     *   available: boolean,
     *   source: 'tool'|'sibling'|null,
     *   error: string|null,
     *   counts: object|null,
     *   blocking: number|null,
     *   findings: object[],
     *   report: string|null,
     *   calls: number|null,
     * }>} 审查结果。
     */
    async run({ paths }) {
      if (paths.length === 0) {
        return emptyResult(null, '没有改过文件，不需要审查')
      }
      const tool = reviewTool(ctx)
      if (tool !== null) {
        return normalize(await call(tool, paths), 'tool')
      }

      if (fallback === null) {
        try {
          fallback = await loadSibling(ctx, config, logger)
        } catch (error) {
          return emptyResult(error instanceof Error ? error.message : String(error))
        }
      }
      if (fallback === null) {
        return emptyResult('拿不到审查实现：code_review 工具未注册，仓库里的 cj-ts-code-review 也加载不了')
      }
      return normalize(await call(fallback, paths), 'sibling')
    },
  }
}

/**
 * 判定一次审查算不算通过。
 *
 * @param {object} result - `run` 的返回值。
 * @param {string} failOn - `P0` / `P1` / `P2` / `P3` / `any`。
 * @returns {{passed: boolean, reason: string}}
 */
export function passes(result, failOn) {
  if (result.available !== true) {
    return { passed: false, reason: `审查不可用：${result.error ?? '未知原因'}` }
  }
  if (result.error !== null && result.error !== undefined) {
    return { passed: false, reason: `审查没跑完：${result.error}` }
  }
  const findings = Array.isArray(result.findings) ? result.findings : []
  if (failOn === 'any') {
    return findings.length === 0
      ? { passed: true, reason: '没有任何 finding' }
      : { passed: false, reason: `有 ${findings.length} 条 finding（failOn=any）` }
  }
  const threshold = RANK[failOn]
  if (threshold === undefined) {
    return { passed: false, reason: `failOn 不认识：${failOn}` }
  }
  const blocking = findings.filter((finding) => (RANK[finding.level] ?? 3) <= threshold)
  return blocking.length === 0
    ? { passed: true, reason: `${failOn} 及更高级别没有 finding` }
    : { passed: false, reason: `${failOn} 及更高级别有 ${blocking.length} 条 finding` }
}

/**
 * 宿主里注册的 `code_review` 工具。
 *
 * @param {object} ctx
 * @returns {object|null}
 */
function reviewTool(ctx) {
  const tools = typeof ctx?.get === 'function' ? ctx.get('tools') : undefined
  if (tools === undefined || tools === null || typeof tools.get !== 'function') {
    return null
  }
  const tool = tools.get('code_review')
  return tool !== null && tool !== undefined && typeof tool.execute === 'function' ? tool : null
}

/**
 * 从仓库里加载同一份审查实现。
 *
 * @param {object} ctx
 * @param {object} config
 * @param {object} logger
 * @returns {Promise<object>} 可以直接 `execute({ paths })` 的工具定义。
 */
async function loadSibling(ctx, config, logger) {
  const reviewUrl = new URL('../../cj-ts-code-review/src/tools/review.mjs', import.meta.url)
  const configUrl = new URL('../../cj-ts-code-review/src/config.mjs', import.meta.url)
  const reviewModule = await import(reviewUrl.href)
  const configModule = await import(configUrl.href)
  const reviewConfig = configModule.normalizeConfig({
    root: config.root,
    provider: config.provider,
    model: config.model,
  })
  logger.info('case-fix: 用仓库里的 cj-ts-code-review 实现审查（code_review 工具未注册）')
  return reviewModule.createReviewTool(ctx, reviewConfig, logger)
}

/**
 * 调工具并压成统一形状。工具本身报错不吞：写进 `error`，由调用方判不通过。
 *
 * @param {object} tool
 * @param {string[]} paths
 * @returns {Promise<object>}
 */
async function call(tool, paths) {
  try {
    return await tool.execute({ paths }, { cwd: process.cwd() })
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      findings: [],
      counts: null,
      report: null,
      calls: null,
    }
  }
}

/**
 * @param {object} result
 * @param {'tool'|'sibling'} source
 * @returns {object}
 */
function normalize(result, source) {
  const counts = result?.counts ?? null
  return {
    available: true,
    source,
    error: typeof result?.error === 'string' ? result.error : null,
    counts,
    blocking: counts !== null && typeof counts.P0 === 'number' ? counts.P0 : null,
    findings: Array.isArray(result?.findings) ? result.findings : [],
    report: typeof result?.report === 'string' ? result.report : null,
    calls: typeof result?.calls === 'number' ? result.calls : null,
    files: Array.isArray(result?.files) ? result.files : [],
    skipped: Array.isArray(result?.skipped) ? result.skipped : [],
  }
}

/**
 * @param {string|null} error
 * @param {string} [note]
 * @returns {object}
 */
function emptyResult(error, note = '') {
  return {
    available: false,
    source: null,
    error,
    note,
    counts: null,
    blocking: null,
    findings: [],
    report: null,
    calls: null,
    files: [],
    skipped: [],
  }
}
