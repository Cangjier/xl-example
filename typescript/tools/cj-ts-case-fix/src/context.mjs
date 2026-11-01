/**
 * 实现上下文：把要修的那几个 kind 相关的 `.xl.md` 找出来，按预算切给模型。
 *
 * 找法是确定性的，分三档：
 * 1. `# class <Kind>Shape` 的定义文件；
 * 2. 真的建出这颗形状的地方：`new <Kind>Shape` 与 `<Kind>Shape.From...`；
 * 3. 只是提到 `<Kind>Shape` 的文件（按相关度排序）——真正决定 created at 的
 *    `PossibleShape.BuildByIndex` 也可能落在这一档里。
 *
 * 大文件（`type-parser.xl.md` 有 51KB）只给相关片段：以每个 kind 名字出现处为锚，
 * 前后各留一段行，切开再合并。片段是原文的连续切片，所以模型从片段里抄出来的
 * `find` 仍然能在文件里逐字命中——这是 find/replace 能落地的前提。
 *
 * @module cj-ts-case-fix/context
 */

import fs from 'node:fs'
import path from 'node:path'

/** 不进入的目录（生成物与依赖）。editable 里通常没有，但配置可以是任意子目录。 */
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'tmp', '.xl'])

/**
 * 收集上下文。
 *
 * @param {object} options
 * @param {string} options.root - 仓库根目录。
 * @param {string[]} options.editable - 可写的绝对目录。
 * @param {string[]} options.kinds - 要修的 kind（canonical）。
 * @param {object} options.config - 归一化配置（取预算）。
 * @param {string[]} [options.include] - 调用方强制随附的文件（相对仓库根或绝对）。
 * @returns {{
 *   files: {rel: string, text: string, excerpt: boolean, windows: {from: number, to: number}[]|null, reason: string}[],
 *   skipped: {path: string, reason: string}[],
 *   definitions: {kind: string, files: string[]}[],
 * }} 上下文。
 */
export function gatherContext({ root, editable, kinds, config, include = [] }) {
  const library = readLibrary(root, editable)
  const byRel = new Map(library.map((file) => [file.rel, file]))
  const skipped = []
  const definitions = []
  const wanted = []
  const seen = new Set()

  const push = (file, reason) => {
    if (seen.has(file.rel)) {
      return
    }
    seen.add(file.rel)
    wanted.push({ file, reason })
  }

  for (const spec of include) {
    const file = includeFile(root, editable, spec, byRel)
    if (file === null) {
      skipped.push({ path: String(spec), reason: 'include 的文件不存在或在可写目录之外' })
      continue
    }
    push(file, 'include')
  }

  for (const kind of kinds) {
    const strong = []
    for (const file of library) {
      if (file.text.includes(`class ${kind}Shape`)) {
        strong.push(file)
      }
    }
    definitions.push({ kind, files: strong.map((file) => file.rel) })
    for (const file of strong) {
      push(file, `${kind} 的定义`)
    }
  }

  // 定义之后先给「真的建出这颗形状」的文件：`new XShape` 与 `XShape.From...`。
  // 再给只是提到它的文件，按相关度排序（构造 > 提及次数 > 小文件），
  // 免得一个 19KB 的弱相关文件挤掉另一个 kind 的定义。
  for (const kind of kinds) {
    const built = library
      .filter((file) => !seen.has(file.rel) && (
        file.text.includes(`new ${kind}Shape`) || file.text.includes(`${kind}Shape.From`)))
      .sort((a, b) => score(b.text, kind) - score(a.text, kind) || a.bytes - b.bytes || compare(a.rel, b.rel))
    for (const file of built) {
      push(file, `${kind} 的构造`)
    }
  }
  for (const kind of kinds) {
    const mentions = library
      .filter((file) => !seen.has(file.rel) && file.text.includes(`${kind}Shape`))
      .sort((a, b) => countOf(b.text, `${kind}Shape`) - countOf(a.text, `${kind}Shape`) || a.bytes - b.bytes || compare(a.rel, b.rel))
    for (const file of mentions) {
      push(file, `${kind} 的提及`)
    }
  }

  if (wanted.length === 0) {
    return { files: [], skipped, definitions }
  }

  const files = []
  let budget = config.maxContextBytes
  for (const { file, reason } of wanted) {
    if (files.length >= config.maxContextFiles) {
      skipped.push({ path: file.rel, reason: `超过 maxContextFiles=${config.maxContextFiles}` })
      continue
    }
    const slice = file.bytes <= config.maxFileBytes && file.bytes <= budget
      ? { text: file.text, excerpt: false, windows: null }
      : extract(file.text, kinds, config)
    if (slice === null) {
      skipped.push({ path: file.rel, reason: '片段里没有这些 kind 的锚点' })
      continue
    }
    const size = Buffer.byteLength(slice.text, 'utf8')
    if (size > budget) {
      skipped.push({ path: file.rel, reason: `超过 maxContextBytes=${config.maxContextBytes}` })
      continue
    }
    budget -= size
    files.push({ rel: file.rel, text: slice.text, excerpt: slice.excerpt, windows: slice.windows, reason })
  }

  return { files, skipped, definitions }
}

/**
 * 读可写目录下所有 `.xl.md`。
 *
 * @param {string} root
 * @param {string[]} editable
 * @returns {{abs: string, rel: string, text: string, bytes: number}[]}
 */
export function readLibrary(root, editable) {
  const out = []
  const seen = new Set()
  for (const dir of editable) {
    if (!fs.existsSync(dir)) {
      continue
    }
    for (const file of walk(dir)) {
      if (!file.endsWith('.xl.md') || seen.has(file)) {
        continue
      }
      seen.add(file)
      const text = fs.readFileSync(file, 'utf8')
      out.push({
        abs: file,
        rel: path.relative(root, file).split(path.sep).join('/'),
        text,
        bytes: Buffer.byteLength(text, 'utf8'),
      })
    }
  }
  return out.sort((a, b) => (a.rel < b.rel ? -1 : a.rel > b.rel ? 1 : 0))
}

/**
 * 一个大文件里与这些 kind 相关的连续片段：锚点前后各留 `excerptLines` 行，
 * 多个窗口重叠就合并，窗口之间用一行 `…（省略 N 行）…` 隔开。
 *
 * 省略标记**不在**片段内部：每个片段都是原文的连续切片，模型只能在切片内找 `find`。
 *
 * @param {string} text
 * @param {string[]} kinds
 * @param {{excerptLines: number}} config
 * @returns {{text: string, excerpt: boolean, windows: {from: number, to: number}[]}|null}
 */
export function extract(text, kinds, config) {
  const needles = kinds.flatMap((kind) => [`class ${kind}Shape`, `${kind}Shape`])
  return extractAround(text, needles, config)
}

/**
 * 按任意锚点（字符串）切片段：审查返工拿 finding 的片段当锚点，走的就是这一条。
 *
 * @param {string} text
 * @param {string[]} needles - 空的项会被忽略。
 * @param {{excerptLines?: number}} [config]
 * @returns {{text: string, excerpt: boolean, windows: {from: number, to: number}[]}|null}
 */
export function extractAround(text, needles, config = {}) {
  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  const half = Math.max(10, Math.floor((config.excerptLines ?? 80) / 2))
  const wanted = needles.filter((needle) => typeof needle === 'string' && needle !== '')
  const hits = []
  for (let index = 0; index < lines.length; index++) {
    if (wanted.some((needle) => lines[index].includes(needle))) {
      hits.push(index)
    }
  }
  if (hits.length === 0) {
    return null
  }
  const windows = []
  for (const hit of hits) {
    const from = Math.max(0, hit - half)
    const to = Math.min(lines.length - 1, hit + half)
    const last = windows[windows.length - 1]
    if (last !== undefined && from <= last.to + 1) {
      last.to = Math.max(last.to, to)
    } else {
      windows.push({ from, to })
    }
  }
  const parts = []
  for (let index = 0; index < windows.length; index++) {
    const window = windows[index]
    if (index > 0) {
      const gap = window.from - windows[index - 1].to - 1
      parts.push(`…（省略 ${gap} 行）…`)
    }
    parts.push(lines.slice(window.from, window.to + 1).join('\n'))
  }
  return {
    text: parts.join('\n'),
    excerpt: true,
    windows: windows.map((window) => ({ from: window.from + 1, to: window.to + 1 })),
  }
}

/**
 * 一个文件对一个 kind 的相关度：真的 `new` 出来最重，静态工厂次之，纯提及最轻。
 *
 * @param {string} text
 * @param {string} kind
 * @returns {number}
 */
function score(text, kind) {
  return 5 * countOf(text, `new ${kind}Shape`)
    + 3 * countOf(text, `${kind}Shape.From`)
    + countOf(text, `${kind}Shape`)
}

/**
 * @param {string} text
 * @param {string} needle
 * @returns {number}
 */
function countOf(text, needle) {
  let count = 0
  let at = text.indexOf(needle)
  while (at >= 0) {
    count++
    at = text.indexOf(needle, at + needle.length)
  }
  return count
}

/**
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
function compare(a, b) {
  return a < b ? -1 : a > b ? 1 : 0
}

/**
 * `include` 里的一项：相对仓库根 / 绝对，必须存在、`.xl.md`、在可写目录里。
 *
 * @param {string} root
 * @param {string[]} editable
 * @param {unknown} spec
 * @param {Map<string, object>} byRel
 * @returns {object|null}
 */
function includeFile(root, editable, spec, byRel) {
  const text = String(spec)
  const absolute = path.isAbsolute(text) ? text : path.resolve(root, text)
  const rel = path.relative(root, absolute).split(path.sep).join('/')
  const known = byRel.get(rel)
  if (known !== undefined) {
    return known
  }
  if (!absolute.endsWith('.xl.md') || !fs.existsSync(absolute)) {
    return null
  }
  const inside = editable.some((dir) => {
    const relative = path.relative(dir, absolute)
    return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative)
  })
  if (!inside) {
    return null
  }
  const content = fs.readFileSync(absolute, 'utf8')
  return { abs: absolute, rel, text: content, bytes: Buffer.byteLength(content, 'utf8') }
}

/**
 * 递归列文件（跳过生成物目录）。
 *
 * @param {string} dir
 * @returns {string[]}
 */
function walk(dir) {
  const out = []
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) {
        continue
      }
      out.push(...walk(path.join(dir, entry.name)))
    } else if (entry.isFile()) {
      out.push(path.join(dir, entry.name))
    }
  }
  return out.sort()
}
