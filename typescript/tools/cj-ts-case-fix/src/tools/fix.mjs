/**
 * `case_fix`：编排「按 `.infer` 修实现」这件事，并做独立验收；改代码的是 DSH。
 *
 * 三个动作共用一份参数解析与渲染（`../fix.mjs`），工具定义只做声明。
 *
 * @module cj-ts-case-fix/tools/fix
 */

import { FAIL_ON } from '../config.mjs'
import { ACTIONS } from '../fix.mjs'
import { STATUS_BUCKETS } from '../cases.mjs'
import { runFix } from '../fix.mjs'

/**
 * 注册工具。
 *
 * @param {object} ctx - Cordis 插件上下文（取 tools；regen 还要 llm）。
 * @param {object} toolsCtx - 提供 `tools` 的子上下文。
 * @param {object} config - 归一化后的配置。
 * @param {object} logger - 插件的 logger。
 * @returns {{registered: string[], failed: {name: string, error: string}[]}}
 */
export function registerTools(ctx, toolsCtx, config, logger) {
  const definition = createFixTool(ctx, config, logger)
  try {
    toolsCtx.tools.register(definition)
    logger.info('case-fix: 已注册工具 case_fix')
    return { registered: [definition.name], failed: [] }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error(`case-fix: 注册工具 case_fix 失败：${message}`)
    return { registered: [], failed: [{ name: definition.name, error: message }] }
  }
}

/**
 * 构造工具定义。
 *
 * @param {object} ctx
 * @param {object} config
 * @param {object} logger
 * @param {object} [deps] - 测试注入，直接转给 `runFix`。
 * @returns {object}
 */
export function createFixTool(ctx, config, logger, deps = {}) {
  return {
    name: 'case_fix',
    description: [
      'Orchestrate fixing the implementation against a tts case\'s .infer — the DSH agent does the actual editing, this tool produces the work order and then verifies it independently.',
      'action "plan" (read-only) computes the gaps (created vs llm per node), locates the shape definitions and the code that builds them, and returns a work order: what to change, where (path + relevant line ranges by default, inlineContext for the full text), the safety boundary, and the acceptance criteria. Optionally writes it to taskPath.',
      'action "verify" (read-only) checks the git working tree against the boundary (core/**, case .ts files and docs/IMPORTANCE.md are never allowed; .xl.md only inside the editable roots), rebuilds (xl_build + tsc), runs the tts regression gate, re-measures every case, and calls code_review on the changed .xl.md files. ok means: no boundary violation, build+gate green, every selected node matches, review has no finding at failOn.',
      'action "regen" re-judges the .infer through case_infer (tool if registered, else the same implementation from the repo), overwriting the llm column, then runs the same verification — use it when the .infer itself is in doubt or to re-check after a fix. Pending (disputed) nodes are reported, never guessed.',
      'Works on one case (case: id, .ts or .infer path) or a whole directory (dir: every case with an .infer, up to maxCases). The tool itself writes only .infer (regen) and an optional taskPath; it never edits implementation source.',
      `Model: ${config.provider ?? 'host default'} / ${config.model ?? 'host default'} (only regen uses it). Default maxCases ${config.maxCases}, regen runs ${config.runs}, failOn ${config.failOn}.`,
    ].join(' '),
    parameters: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ACTIONS,
          description: 'plan: produce the work order (default). verify: build + gate + re-measure + code_review. regen: re-judge the .infer and then verify.',
        },
        case: {
          type: 'string',
          description: 'One case: an id relative to typescript/cases/tts (for example "success/types/alias-array"), a .ts path, or a .infer path. Give either case or dir.',
        },
        dir: {
          type: 'string',
          description: 'A directory relative to typescript/cases/tts (for example "success/types"): every .ts with a sibling .infer is handled, up to maxCases; the rest are reported as skipped.',
        },
        only: {
          type: 'array',
          items: { type: 'string', enum: [...STATUS_BUCKETS, 'all'] },
          description: 'Which mismatch kinds count: late (llm char later than created), early (llm char earlier), no-created (no CreatedAt recorded), no-shape (never built). Default all of them.',
        },
        kinds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Only nodes of these kinds (for example ["TypeParameter"]). Default: every kind.',
        },
        include: {
          type: 'array',
          items: { type: 'string' },
          description: 'plan: extra .xl.md files to put in front of the work order (relative to the repository root), when the automatic lookup misses the file that really needs the change.',
        },
        taskPath: {
          type: 'string',
          description: 'plan: write the work order Markdown here (relative to the repository root). Default: return it without writing anything. Writing a task file implies inlineContext.',
        },
        inlineContext: {
          type: 'boolean',
          description: 'plan: also put the full text of the located implementation files and docs/IMPORTANCE.md into the work order. Default false: list the files (with the relevant line ranges) so the agent opens them itself.',
        },
        runs: {
          type: 'integer',
          minimum: 1,
          maximum: 9,
          description: `regen: how many independent judgements case_infer asks for. Default ${config.runs}; lower it to 1 to save calls.`,
        },
        decisions: {
          type: 'object',
          additionalProperties: { type: 'integer' },
          description: 'regen: settle nodes case_infer left as pending, { "<Kind|pos|start>": <char> }. Single case only; makes no model call.',
        },
        maxCases: {
          type: 'integer',
          minimum: 1,
          maximum: 500,
          description: `Directory mode: handle at most this many cases. Default ${config.maxCases}; the rest are listed as skipped, never silently dropped.`,
        },
        review: {
          type: 'boolean',
          description: `verify/regen: call code_review on the changed .xl.md files and require it to pass. Default ${config.review}.`,
        },
        failOn: {
          type: 'string',
          enum: FAIL_ON,
          description: `verify/regen: a review finding at this level or higher means the review failed. Default ${config.failOn}.`,
        },
      },
      additionalProperties: false,
    },
    output: {
      schema: { type: 'object', additionalProperties: true },
      render(_args, value) {
        const text = typeof value?.text === 'string' ? value.text : JSON.stringify(value, null, 2)
        return [{ type: 'text', text }]
      },
    },

    /**
     * @param {object} args - 工具参数。
     * @returns {Promise<object>}
     */
    async execute(args) {
      return runFix({ ctx, config, logger, args, deps })
    },
  }
}
