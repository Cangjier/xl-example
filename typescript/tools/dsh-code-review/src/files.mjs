/**
 * 收集要审的文件。
 *
 * 全部是确定性代码：路径展开、扩展名过滤、跳过目录、大小与数量上限。上限到了就**明说**
 * 跳过了哪些，不静默截断——一次只审了一半代码却报告「没问题」，比不审更糟。
 *
 * @module dsh-code-review/files
 */

import fs from 'node:fs'
import path from 'node:path'

/** 不进入的目录（生成物与依赖）。 */
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'tmp', '.work', 'out'])

/** 默认审的扩展名：xl 规范源、脚本、TS。 */
export const DEFAULT_EXTENSIONS = ['.xl.md', '.mjs', '.js', '.ts']

/** 没有给 paths 时审这里（形状与核心语法层）。 */
export const DEFAULT_SCOPE = ['typescript/shapes', 'core/syntax']

/**
 * @param {string} root - 仓库根目录。
 * @param {object} options
 * @param {string[]} [options.paths] - 相对 root 或绝对路径；目录会递归。
 * @param {string[]} [options.extensions]
 * @param {number} [options.maxFiles]
 * @param {number} [options.maxFileBytes]
 * @returns {{
 *   files: {path: string, rel: string, text: string, bytes: number, lines: number}[],
 *   skipped: {path: string, reason: string}[],
 * }} 收集结果。
 */
export function collectFiles(root, options = {}) {
  const specs = (options.paths ?? []).length > 0 ? options.paths : DEFAULT_SCOPE
  const extensions = options.extensions ?? DEFAULT_EXTENSIONS
  const maxFiles = options.maxFiles ?? 200
  const maxFileBytes = options.maxFileBytes ?? 24_000

  const files = []
  const skipped = []
  const seen = new Set()

  for (const spec of specs) {
    const absolute = path.isAbsolute(spec) ? spec : path.resolve(root, spec)
    if (!fs.existsSync(absolute)) {
      skipped.push({ path: spec, reason: '不存在' })
      continue
    }
    const targets = fs.statSync(absolute).isDirectory() ? walk(absolute) : [absolute]
    for (const target of targets) {
      const rel = path.relative(root, target).split(path.sep).join('/')
      if (seen.has(rel)) {
        continue
      }
      seen.add(rel)
      if (!extensions.some((extension) => target.endsWith(extension))) {
        continue
      }
      if (files.length >= maxFiles) {
        skipped.push({ path: rel, reason: `超过 maxFiles=${maxFiles}` })
        continue
      }
      const stat = fs.statSync(target)
      if (stat.size > maxFileBytes) {
        skipped.push({ path: rel, reason: `${stat.size} 字节 > maxFileBytes=${maxFileBytes}` })
        continue
      }
      const text = fs.readFileSync(target, 'utf8')
      files.push({
        path: target,
        rel,
        text,
        bytes: stat.size,
        lines: text.split('\n').length,
      })
    }
  }

  return { files, skipped }
}

/**
 * 递归列出一个目录下的文件（跳过 SKIP_DIRS）。
 *
 * @param {string} dir
 * @returns {string[]}
 */
function walk(dir) {
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) {
        continue
      }
      out.push(...walk(path.join(dir, entry.name)))
      continue
    }
    if (entry.isFile()) {
      out.push(path.join(dir, entry.name))
    }
  }
  return out.sort()
}

/**
 * 给文件内容加上 1 起算的行号，供 prompt 使用。
 *
 * @param {string} text
 * @returns {string} 每行形如 `  12| const x = 1`。
 */
export function withLineNumbers(text) {
  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  const width = String(lines.length).length
  return lines
    .map((line, index) => `${String(index + 1).padStart(width, ' ')}| ${line}`)
    .join('\n')
}

/**
 * 分批：一批一次模型调用，同时受「文件个数」与「正文字节」两个上限约束。
 *
 * 只按个数分批会让 24KB 的大文件把单次 prompt 撑爆；只按字节分批又会把 1KB 的
 * 小文件拼成上百个一批。两个上限一起用，成本才可预期。
 *
 * @param {object[]} files
 * @param {{maxFiles: number, maxBytes: number}} limits
 * @returns {object[][]} 批次。
 */
export function batchFiles(files, limits) {
  const maxFiles = Math.max(1, limits.maxFiles)
  const maxBytes = Math.max(1, limits.maxBytes)
  const batches = []
  let current = []
  let size = 0
  for (const file of files) {
    const full = current.length >= maxFiles || (current.length > 0 && size + file.bytes > maxBytes)
    if (full) {
      batches.push(current)
      current = []
      size = 0
    }
    current.push(file)
    size += file.bytes
  }
  if (current.length > 0) {
    batches.push(current)
  }
  return batches
}
