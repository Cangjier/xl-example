/**
 * 编排：`case_fix` 的三个动作。
 *
 * - `plan`   —— 只读。算缺口、找实现文件、写一份给 DSH 的任务书（可落盘）；
 * - `verify` —— 只读。边界 → 构建 → 门禁 → 逐用例对拍 → `code_review`，给出结论；
 * - `regen`  —— 先构建/门禁，再调 `case_infer` 重新生成 `.infer`，然后走同一套验收。
 *
 * 这里**不调用模型改代码**：实际编辑由 DSH 用它自己的工具完成。插件负责把「改什么、
 * 改哪里、什么算修好、什么绝对不许碰」讲清楚，并在事后独立验收。
 *
 * @module cj-ts-case-fix/fix
 */

import fs from 'node:fs'
import path from 'node:path'
import { createBoundary } from './boundary.mjs'
import { createBuilder } from './build.mjs'
import { loadCase, resolveTargets, selectRows, describeRows } from './cases.mjs'
import { gatherContext } from './context.mjs'
import { FAIL_ON } from './config.mjs'
import { renderPlan } from './plan.mjs'
import { createRegenerator } from './regen.mjs'
import { createReviewer } from './review.mjs'
import { runVerify, renderVerify } from './verify.mjs'

/** 合法动作。 */
export const ACTIONS = ['plan', 'verify', 'regen']

/** 只读动作。 */
const READ_ONLY = new Set(['plan', 'verify'])

/**
 * 跑一个动作。
 *
 * @param {object} options
 * @param {object} options.ctx - Cordis 插件上下文（取 tools；regen 还要 llm）。
 * @param {object} options.config - 归一化配置。
 * @param {object} options.logger
 * @param {object} options.args - 工具参数。
 * @param {object} [options.deps] - 测试注入：`{ build, measure, review, boundary, regen }`。
 * @returns {Promise<object>} 工具返回值。
 */
export async function runFix({ ctx, config, logger, args, deps = {} }) {
  const run = normalizeArgs(args, config)
  const resolved = resolveTargets(config.root, args, { maxCases: run.maxCases })
  run.mode = resolved.mode
  run.target = resolved.mode === 'dir' ? String(args.dir) : resolved.cases[0].id

  if (resolved.cases.length === 0) {
    throw new Error(
      '没有可处理的用例：' +
      (resolved.skipped.length === 0
        ? '目录下没有 .ts'
        : `目录下的用例都没有 .infer（${resolved.skipped.slice(0, 3).map((item) => item.path).join('、')}）；先跑 case_fix { action: "regen", dir: ... } 或 case_infer`),
    )
  }

  const builder = deps.build ?? createBuilder({ ctx, config, logger })
  const measure = deps.measure ?? ((entry, options) => loadCase(config.root, entry, options))
  const reviewer = deps.review ?? createReviewer({ ctx, config, logger })
  const boundary = deps.boundary ?? createBoundary({ config, logger })
  const regenerator = deps.regen ?? createRegenerator({ ctx, config, logger })

  logger.info(
    `case-fix: action=${run.action} ${resolved.mode} ${resolved.cases.map((item) => item.id).join(', ')}；` +
    `边界 ${boundary.describe()}；构建 ${builder.describe()}`,
  )

  if (run.action === 'plan') {
    return runPlan({ config, logger, measure, boundary, builder, entries: resolved.cases, run, resolved })
  }
  const result = await runVerify({
    config,
    logger,
    builder,
    measure,
    reviewer,
    boundary,
    entries: resolved.cases,
    run,
    regenerator: run.action === 'regen' ? regenerator : null,
  })
  return {
    ...result,
    action: run.action,
    mode: resolved.mode,
    readOnly: READ_ONLY.has(run.action),
    skipped: resolved.skipped,
    text: renderVerify(result, run),
  }
}

/**
 * `plan`：算缺口、找实现文件、渲染任务书（可选落盘）。
 *
 * @param {object} options
 * @returns {Promise<object>}
 */
async function runPlan({ config, logger, measure, boundary, builder, entries, run, resolved }) {
  const boundaryNow = await boundary.inspect()
  const rules = readRules(config)
  const cases = []

  for (const entry of entries) {
    const loaded = measure(entry, { fresh: true })
    if (loaded.available !== true) {
      cases.push({
        entry,
        available: false,
        error: loaded.error,
        counts: null,
        targets: [],
        unfilled: 0,
        context: { files: [], skipped: [], definitions: [] },
      })
      continue
    }
    const targets = selectRows(loaded.rows, { statuses: run.statuses, kinds: run.kinds })
    const kinds = [...new Set(targets.map((row) => row.kind))]
    const context = targets.length === 0
      ? { files: [], skipped: [], definitions: [] }
      : gatherContext({
        root: config.root,
        editable: config.editable,
        kinds,
        config,
        include: run.include,
      })
    cases.push({
      entry,
      available: true,
      error: null,
      counts: loaded.counts,
      source: loaded.source,
      targets: describeRows(loaded, targets),
      unfilled: loaded.counts.unfilled,
      context: {
        files: context.files,
        skipped: context.skipped,
        definitions: context.definitions,
      },
    })
  }

  const inline = run.inlineContext === true || run.taskPath !== null
  const text = renderPlan({
    config,
    run,
    rules,
    build: builder.describe(),
    boundary: boundaryNow,
    cases,
    inline,
  })
  const taskPath = writeTask(config, run.taskPath, text)
  const broken = cases.filter((item) => item.available !== true)
  const needsInfer = cases.filter((item) => item.unfilled > 0)

  const result = {
    ok: broken.length === 0,
    action: 'plan',
    mode: resolved.mode,
    readOnly: true,
    status: broken.length > 0
      ? 'unavailable'
      : cases.every((item) => item.targets.length === 0 && item.unfilled === 0)
        ? 'clean'
        : 'planned',
    boundary: boundaryNow,
    build: builder.describe(),
    editable: config.editable.map((dir) => relativeOf(config.root, dir)),
    cases: cases.map(publicPlanCase),
    skipped: resolved.skipped,
    needsInfer: needsInfer.map((item) => ({ case: item.entry.id, unfilled: item.unfilled })),
    calls: 0,
    taskPath,
    text,
  }
  logger.info(
    `case-fix: 任务书 ${cases.length} 个用例，${cases.reduce((sum, item) => sum + item.targets.length, 0)} 个目标` +
    `${taskPath === null ? '' : `，写入 ${relativeOf(config.root, taskPath)}`}`,
  )
  return result
}

/**
 * 任务书落盘（`taskPath` 给了才写）。
 *
 * @param {object} config
 * @param {string|null} taskPath - 相对仓库根或绝对。
 * @param {string} text
 * @returns {string|null} 写到的绝对路径。
 */
function writeTask(config, taskPath, text) {
  if (taskPath === null || taskPath === undefined) {
    return null
  }
  const absolute = path.isAbsolute(taskPath) ? taskPath : path.resolve(config.root, taskPath)
  const relative = path.relative(config.root, absolute)
  if (relative === '' || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`taskPath 必须落在仓库内（收到 ${taskPath}）`)
  }
  fs.mkdirSync(path.dirname(absolute), { recursive: true })
  fs.writeFileSync(absolute, `${text}\n`, 'utf8')
  return absolute
}

/**
 * 读规则文档（用户独占，只读）。
 *
 * @param {object} config
 * @returns {string}
 */
function readRules(config) {
  const file = path.join(config.root, 'docs', 'IMPORTANCE.md')
  if (!fs.existsSync(file)) {
    return `（找不到 ${relativeOf(config.root, file)}：按 IMPORTANCE 的常识执行，P0 优先）`
  }
  const text = fs.readFileSync(file, 'utf8')
  const bytes = Buffer.byteLength(text, 'utf8')
  if (bytes > config.maxRulesBytes) {
    return `（${relativeOf(config.root, file)} 有 ${bytes} 字节，超过 maxRulesBytes=${config.maxRulesBytes}；请直接读该文件）`
  }
  return text
}

/**
 * 计划结果里去掉上下文的正文（只留文件清单），返回值保持小。
 *
 * @param {object} item
 * @returns {object}
 */
function publicPlanCase(item) {
  return {
    case: item.entry.id,
    file: item.entry.rel,
    infer: item.entry.inferPath.split(path.sep).join('/'),
    available: item.available,
    error: item.error,
    counts: item.counts,
    unfilled: item.unfilled,
    targets: item.targets.map((row) => ({
      id: row.id,
      kind: row.kind,
      pos: row.pos,
      start: row.start,
      end: row.end,
      status: row.status,
      bucket: row.bucket,
      llm: row.llm,
      created: row.created,
      delta: row.delta,
      hint: row.llmAt,
    })),
    definitions: item.context.definitions,
    files: item.context.files.map((file) => ({
      file: file.rel,
      excerpt: file.excerpt,
      windows: file.windows,
      reason: file.reason,
    })),
    skippedFiles: item.context.skipped,
  }
}

/**
 * 工具参数归一化。
 *
 * @param {object} args
 * @param {object} config
 * @returns {object}
 */
function normalizeArgs(args, config) {
  const action = args.action === undefined || args.action === null ? 'plan' : String(args.action)
  if (!ACTIONS.includes(action)) {
    throw new Error(`action 只能是 ${ACTIONS.join(' / ')}（收到 ${JSON.stringify(args.action)}）`)
  }
  const statuses = statusList(args.only)
  const kinds = args.kinds === undefined || args.kinds === null
    ? []
    : arrayOfStrings(args.kinds, 'kinds').map((kind) => kind.trim()).filter((kind) => kind !== '')
  const maxCases = args.maxCases === undefined || args.maxCases === null
    ? config.maxCases
    : bounded(args.maxCases, 1, 500, 'maxCases')
  const failOn = args.failOn === undefined || args.failOn === null ? config.failOn : failOnOf(args.failOn)
  const review = args.review === undefined || args.review === null ? config.review : Boolean(args.review)
  const runs = args.runs === undefined || args.runs === null
    ? config.runs
    : bounded(args.runs, 1, 9, 'runs')
  const include = args.include === undefined || args.include === null ? [] : arrayOfStrings(args.include, 'include')
  const taskPath = args.taskPath === undefined || args.taskPath === null ? null : String(args.taskPath)
  const inlineContext = args.inlineContext === true
  const decisions = decisionsOf(args.decisions)
  const strictInfer = (args.only === undefined || args.only === null)
    && (args.kinds === undefined || args.kinds === null || args.kinds.length === 0)

  return {
    action,
    statuses,
    kinds,
    maxCases,
    failOn,
    review,
    runs,
    include,
    taskPath,
    inlineContext,
    decisions,
    strictInfer,
    mode: null,
    target: null,
  }
}

/**
 * `only`：状态桶列表，或 `all`。
 *
 * @param {unknown} value
 * @returns {string[]}
 */
function statusList(value) {
  const buckets = ['late', 'early', 'no-created', 'no-shape']
  if (value === undefined || value === null) {
    return buckets
  }
  const list = arrayOfStrings(value, 'only')
  if (list.length === 1 && list[0].toLowerCase() === 'all') {
    return buckets
  }
  const out = []
  for (const item of list) {
    const text = item.toLowerCase()
    if (!buckets.includes(text)) {
      throw new Error(`only 里的 ${JSON.stringify(item)} 不认识，取值 late / early / no-created / no-shape / all`)
    }
    if (!out.includes(text)) {
      out.push(text)
    }
  }
  return out
}

/**
 * @param {unknown} value
 * @param {string} label
 * @returns {string[]}
 */
function arrayOfStrings(value, label) {
  if (typeof value === 'string') {
    return [value]
  }
  if (!Array.isArray(value)) {
    throw new Error(`${label} 必须是字符串或字符串数组`)
  }
  return value.map((item) => String(item))
}

/**
 * @param {unknown} value
 * @param {number} min
 * @param {number} max
 * @param {string} label
 * @returns {number}
 */
function bounded(value, min, max, label) {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${label} 必须是 ${min}..${max} 的整数（收到 ${JSON.stringify(value)}）`)
  }
  return value
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function failOnOf(value) {
  const text = String(value)
  const normalized = text.toLowerCase() === 'any' ? 'any' : text.toUpperCase()
  if (!FAIL_ON.includes(normalized)) {
    throw new Error(`failOn 只能是 ${FAIL_ON.join(' / ')}（收到 ${JSON.stringify(value)}）`)
  }
  return normalized
}

/**
 * `decisions`：`{ "<Kind|pos|start>": <char> }`，原样交给 `case_infer`。
 *
 * @param {unknown} value
 * @returns {Record<string, number>|null}
 */
function decisionsOf(value) {
  if (value === undefined || value === null) {
    return null
  }
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('decisions 必须是 { "Kind|pos|start": char } 对象')
  }
  const out = {}
  for (const [id, char] of Object.entries(value)) {
    if (!Number.isInteger(char)) {
      throw new Error(`decisions["${id}"] 必须是整数（收到 ${JSON.stringify(char)}）`)
    }
    out[id] = char
  }
  return out
}

/**
 * @param {string} root
 * @param {string} file
 * @returns {string}
 */
function relativeOf(root, file) {
  return path.relative(root, file).split(path.sep).join('/')
}
