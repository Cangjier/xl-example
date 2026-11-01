/**
 * 用例这一层：把「一个用例 / 一个目录」解析成 `.ts` + `.infer`，算出缺口。
 *
 * 缺口的定义只有一条：`.infer` 里每个节点的两个位置，`created`（实现建出形状的那一格）
 * 必须等于 `llm`（模型判定的「最早确定」那一格）。`evaluate` 是仓库里现成的对拍实现，
 * 这里不重写它，只把行整理成模型能看懂、返回值能汇报的形状。
 *
 * @module cj-ts-case-fix/cases
 */

import fs from 'node:fs'
import path from 'node:path'
import { contextAt, evaluate, nodeId } from '../../case-infer.mjs'
import { canonicalKind, traceActual } from '../../shape-actual.mjs'

/** 用例根目录（相对仓库根）。 */
export const CASE_ROOT = path.join('typescript', 'cases', 'tts')

/** 可以修的状态桶。`ok` 不在里面：修的是缺口，不是已经一致的行。 */
export const STATUS_BUCKETS = ['late', 'early', 'no-created', 'no-shape']

/** 目录模式默认最多修几个用例。 */
export const DEFAULT_MAX_CASES = 8

/**
 * 把工具参数解析成一组用例。
 *
 * `case` 与 `dir` 必须给且只给一个。`case` 接受用例 id（相对 `typescript/cases/tts`）、
 * `.ts` 路径或 `.infer` 路径（相对仓库根或绝对）。`dir` 接受目录，递归找「有 `.infer`
 * 的 `.ts`」，按 id 排序，超过 `maxCases` 的进 `skipped`（不是静默丢掉）。
 *
 * @param {string} root - 仓库根目录。
 * @param {{case?: unknown, dir?: unknown}} args
 * @param {{maxCases?: number}} [options]
 * @returns {{
 *   mode: 'case'|'dir',
 *   cases: {file: string, id: string, rel: string, inferPath: string}[],
 *   skipped: {path: string, reason: string}[],
 * }} 解析结果。
 * @throws {Error} 两个都给 / 都没给 / 找不到 / 不在用例根目录下时。
 */
export function resolveTargets(root, args, options = {}) {
  const caseSpec = args.case === undefined || args.case === null ? null : String(args.case).trim()
  const dirSpec = args.dir === undefined || args.dir === null ? null : String(args.dir).trim()
  if ((caseSpec === null || caseSpec === '') && (dirSpec === null || dirSpec === '')) {
    throw new Error('要给 case（一个用例）或 dir（一个目录），二选一')
  }
  if (caseSpec !== null && caseSpec !== '' && dirSpec !== null && dirSpec !== '') {
    throw new Error('case 与 dir 只能给一个')
  }

  const caseRoot = path.resolve(root, CASE_ROOT)
  if (dirSpec !== null && dirSpec !== '') {
    const absolute = existingPath(root, dirSpec) ?? path.resolve(caseRoot, dirSpec)
    if (!fs.existsSync(absolute)) {
      throw new Error(`找不到目录：${absolute}`)
    }
    if (!fs.statSync(absolute).isDirectory()) {
      throw new Error(`不是目录：${absolute}（修一个用例请用 case）`)
    }
    assertInside(caseRoot, absolute, 'dir')
    const maxCases = options.maxCases ?? DEFAULT_MAX_CASES
    const found = walkCaseFiles(absolute).sort()
    const cases = []
    const skipped = []
    for (const file of found) {
      const entry = describeEntry(root, file)
      if (!fs.existsSync(entry.inferPath)) {
        skipped.push({ path: entry.rel, reason: '没有 .infer（先跑 case_infer）' })
        continue
      }
      if (cases.length >= maxCases) {
        skipped.push({ path: entry.rel, reason: `超过 maxCases=${maxCases}` })
        continue
      }
      cases.push(entry)
    }
    return { mode: 'dir', cases, skipped }
  }

  const absolute = resolveCaseFile(root, caseSpec)
  assertInside(caseRoot, absolute, 'case')
  const entry = describeEntry(root, absolute)
  if (!fs.existsSync(entry.inferPath)) {
    throw new Error(`找不到 ${entry.inferPath}：先跑 case_infer { case: ${JSON.stringify(entry.id)} }`)
  }
  return { mode: 'case', cases: [entry], skipped: [] }
}

/**
 * 读一个用例：源码、`.infer`、逐个节点的对拍结果。
 *
 * `.infer` 不存在不是错误（目录模式下是「跳过」的理由，单例模式下由调用方拒绝）；
 * 解析器不可用（缺 `build/ts`）会给 `available: false`，不抛异常。
 *
 * @param {string} root - 仓库根目录。
 * @param {{file: string, id: string, rel: string, inferPath: string}} entry
 * @param {{fresh?: boolean}} [options] - `fresh`：先清 build/ts 的模块缓存（刚重建过）。
 * @returns {{
 *   available: boolean,
 *   error: string|null,
 *   entry: object,
 *   hasInfer: boolean,
 *   source: string,
 *   name: string,
 *   inferText: string|null,
 *   actual: object|null,
 *   rows: object[],
 *   stale: string[],
 *   counts: object,
 * }} 用例现场。
 */
export function loadCase(root, entry, options = {}) {
  const source = fs.readFileSync(entry.file, 'utf8')
  const name = path.basename(entry.file)
  const hasInfer = fs.existsSync(entry.inferPath)
  const inferText = hasInfer ? fs.readFileSync(entry.inferPath, 'utf8') : null

  const base = {
    available: true,
    error: null,
    entry,
    hasInfer,
    source,
    name,
    inferText,
    actual: null,
    rows: [],
    stale: [],
    counts: emptyCounts(),
  }
  if (!hasInfer) {
    return base
  }

  try {
    const actual = traceActual(source, name, { fresh: options.fresh === true })
    const { rows, stale } = evaluate(source, name, inferText, actual)
    return { ...base, actual, rows, stale, counts: summarizeRows(rows, stale) }
  } catch (error) {
    return {
      ...base,
      available: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * 从对拍结果里挑出要修的行。
 *
 * 只挑「llm 那一格已经有了、created 还对不上」的行：`unfilled`（`-> llm ?`）没有目标，
 * 只能先跑 `case_infer` 的 `decisions` 补完，所以永远不进目标集，只在返回值里报数量。
 *
 * @param {object[]} rows - `evaluate` 的行。
 * @param {{statuses?: string[], kinds?: string[]}} [options]
 * @returns {object[]} 目标行（带 `bucket` / `kind` 两个整齐的字段）。
 */
export function selectRows(rows, options = {}) {
  const statuses = new Set(options.statuses ?? STATUS_BUCKETS)
  const kinds = Array.isArray(options.kinds) && options.kinds.length > 0
    ? new Set(options.kinds.map((kind) => canonicalKind(String(kind))))
    : null
  const picked = []
  for (const row of rows) {
    const bucket = bucketOf(row.status)
    if (!statuses.has(bucket) || !STATUS_BUCKETS.includes(bucket)) {
      continue
    }
    if (row.llm === null || row.llm === undefined) {
      continue
    }
    const view = {
      id: row.id,
      kind: canonicalKind(row.info.kind),
      pos: row.info.pos,
      start: row.info.start,
      end: row.info.end,
      status: row.status,
      bucket,
      llm: row.llm,
      created: row.created,
      delta: row.delta,
    }
    if (kinds !== null && !kinds.has(view.kind)) {
      continue
    }
    picked.push(view)
  }
  return picked
}

/**
 * 对一个用例的每行做点视图：加上两处源码上下文与 `.infer` 的原始行，给 prompt 用。
 *
 * @param {object} loaded - `loadCase` 的结果。
 * @param {object[]} rows - `selectRows` 的行。
 * @returns {object[]} 带 `llmAt` / `createdAt` / `inferLine` 的行。
 */
export function describeRows(loaded, rows) {
  return rows.map((row) => ({
    ...row,
    llmAt: contextAt(loaded.source, row.llm),
    createdAt: row.created === null ? '' : contextAt(loaded.source, row.created),
    inferLine: inferLineOf(loaded.inferText, row.id),
  }))
}

/**
 * 一行的状态桶：`late +N` / `early -N` / `ok` / `no-shape` / …
 *
 * @param {string} status
 * @returns {string}
 */
export function bucketOf(status) {
  if (status === 'ok') return 'ok'
  if (status.startsWith('late')) return 'late'
  if (status.startsWith('early')) return 'early'
  if (status === 'no-shape') return 'no-shape'
  if (status === 'no-created') return 'no-created'
  if (status === 'unfilled') return 'unfilled'
  if (status === 'no-annotation') return 'no-annotation'
  return 'other'
}

/**
 * 行数统计（与 `case-infer --check` 的口径一致，多了 `mismatches` 这个和）。
 *
 * @param {object[]} rows
 * @param {string[]} [stale]
 * @returns {object}
 */
export function summarizeRows(rows, stale = []) {
  const counts = emptyCounts()
  counts.total = rows.length
  for (const row of rows) {
    const bucket = bucketOf(row.status)
    if (bucket === 'ok') counts.ok++
    else if (bucket === 'late') counts.late++
    else if (bucket === 'early') counts.early++
    else if (bucket === 'no-created') counts.noCreated++
    else if (bucket === 'no-shape') counts.noShape++
    else if (bucket === 'unfilled') counts.unfilled++
    else if (bucket === 'no-annotation') counts.noAnnotation++
    else counts.other++
  }
  counts.mismatches = counts.total - counts.ok
  counts.stale = stale.length
  return counts
}

/** @returns {object} 全零的统计。 */
function emptyCounts() {
  return {
    total: 0,
    ok: 0,
    late: 0,
    early: 0,
    noCreated: 0,
    noShape: 0,
    unfilled: 0,
    noAnnotation: 0,
    other: 0,
    mismatches: 0,
    stale: 0,
  }
}

/**
 * `.infer` 里某个节点的那一行原文（去掉行尾空白）。
 *
 * @param {string|null} inferText
 * @param {string} id
 * @returns {string}
 */
function inferLineOf(inferText, id) {
  if (typeof inferText !== 'string') {
    return ''
  }
  for (const line of inferText.split(/\r?\n/)) {
    const at = line.indexOf('// ')
    if (at < 0) {
      continue
    }
    if (nodeId(line.slice(0, at)) === id) {
      return line
    }
  }
  return ''
}

/**
 * 把一个 `.ts` 文件描述成用例条目。
 *
 * @param {string} root
 * @param {string} file - 绝对路径。
 * @returns {{file: string, id: string, rel: string, inferPath: string}}
 */
export function describeEntry(root, file) {
  const relative = path.relative(root, file).split(path.sep).join('/')
  const id = path.relative(path.resolve(root, CASE_ROOT), file).split(path.sep).join('/').replace(/\.ts$/, '')
  return {
    file,
    id,
    rel: relative,
    inferPath: file.replace(/\.ts$/, '.infer'),
  }
}

/**
 * 解析 `case` 参数：存在的路径优先，其次当成 `typescript/cases/tts` 下的用例 id。
 *
 * @param {string} root
 * @param {string} spec
 * @returns {string} `.ts` 的绝对路径。
 * @throws {Error} 找不到时。
 */
function resolveCaseFile(root, spec) {
  const asPath = existingPath(root, spec)
  if (asPath !== null) {
    if (!fs.statSync(asPath).isFile()) {
      throw new Error(`不是文件：${asPath}（目录请用 dir）`)
    }
    const file = asPath.replace(/\.infer$/, '.ts')
    if (!fs.existsSync(file)) {
      throw new Error(`找到 ${asPath}，但同名的 .ts 不存在：${file}`)
    }
    return file
  }
  const caseRoot = path.resolve(root, CASE_ROOT)
  const trimmed = spec.replace(/\.infer$/, '').replace(/\.ts$/, '')
  const file = path.resolve(caseRoot, `${trimmed}.ts`)
  if (!fs.existsSync(file)) {
    throw new Error(
      `找不到用例：${spec}（既不是一个存在的路径，也不是 ${path.relative(root, caseRoot).split(path.sep).join('/')} 下的用例 id）`,
    )
  }
  return file
}

/**
 * 相对路径 / 绝对路径里「存在的那个」。
 *
 * @param {string} root
 * @param {string} spec
 * @returns {string|null}
 */
function existingPath(root, spec) {
  const absolute = path.isAbsolute(spec) ? spec : path.resolve(root, spec)
  return fs.existsSync(absolute) ? absolute : null
}

/**
 * 递归找一个目录下所有 `.ts`。
 *
 * @param {string} dir
 * @returns {string[]}
 */
function walkCaseFiles(dir) {
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      out.push(...walkCaseFiles(full))
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      out.push(full)
    }
  }
  return out
}

/**
 * 路径必须在用例根目录里：这个工具只修 `.infer` 覆盖到的 tts 用例。
 *
 * @param {string} caseRoot
 * @param {string} absolute
 * @param {string} label
 * @returns {void}
 * @throws {Error} 越界时。
 */
function assertInside(caseRoot, absolute, label) {
  const relative = path.relative(caseRoot, absolute)
  if (relative === '' || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`${label} 必须落在 ${caseRoot} 里（收到 ${absolute}）`)
  }
}
