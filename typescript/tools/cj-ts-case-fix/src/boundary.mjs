/**
 * 安全边界：git 工作区里到底改了什么、哪些越界。
 *
 * 边界的口径写死在这里，不随模型或计划变：
 * - `core/**` 一律禁止（用户明确要求：禁止修改 core）；
 * - `typescript/cases` 下的 `.ts` 不可改（用例是规格，不是实现）；
 * - `docs/IMPORTANCE.md` 只能由用户编辑；
 * - `.xl.md` 只能改 `editable` 里的（默认 `typescript/shapes`）。
 *
 * `.infer` 的改动不算越界（它是派生/可重新判定的数据，`regen` 会写它），但会在结果里
 * 单列出来，谁改了一眼能看见。
 *
 * @module cj-ts-case-fix/boundary
 */

import path from 'node:path'
import { spawn } from 'node:child_process'

/** 无论配置怎么写都不可写的目录（相对仓库根）。 */
export const FORBIDDEN_ROOTS = ['core', 'typescript/cases']

/** 无论配置怎么写都不可写的文件。 */
export const FORBIDDEN_FILES = ['docs/IMPORTANCE.md']

/**
 * 构造边界检查器。
 *
 * @param {object} options
 * @param {object} options.config - 归一化配置（取 root / editable / boundary）。
 * @param {object} options.logger
 * @returns {{inspect: () => Promise<object>, describe: () => string}}
 */
export function createBoundary({ config, logger }) {
  const editable = config.editable.map((dir) => relativeOf(config.root, dir))
  return {
    describe() {
      return config.boundary === true
        ? `禁止 ${FORBIDDEN_ROOTS.join(' / ')} 与 ${FORBIDDEN_FILES.join(' / ')}；可写 ${editable.join(' / ')}`
        : 'boundary: false（没开 git 边界检查）'
    },

    /**
     * 看一遍工作区。
     *
     * @returns {Promise<{
     *   available: boolean,
     *   skipped: boolean,
     *   ok: boolean,
     *   error: string|null,
     *   changes: {status: string, path: string}[],
     *   violations: {path: string, reason: string}[],
     *   infers: string[],
     *   code: string[],
     * }>} 结果；`code` 是改过的、可写范围内的 `.xl.md`（给 code_review 用）。
     */
    async inspect() {
      const empty = { changes: [], violations: [], infers: [], code: [] }
      if (config.boundary !== true) {
        return { available: true, skipped: true, ok: true, error: null, ...empty }
      }
      const status = await gitStatus(config.root)
      if (status.ok === false) {
        return {
          available: false,
          skipped: false,
          ok: false,
          error: status.error,
          changes: [],
          violations: [{ path: '-', reason: `拿不到 git status，无法确认没有改 core：${status.error}` }],
          infers: [],
          code: [],
        }
      }

      const changes = status.changes
      const violations = []
      const infers = []
      const code = []
      for (const change of changes) {
        const rel = change.path
        if (rel === 'core' || isUnder(rel, 'core')) {
          violations.push({ path: rel, reason: 'core 禁止修改（安全边界）' })
          continue
        }
        if (FORBIDDEN_FILES.includes(rel)) {
          violations.push({ path: rel, reason: 'IMPORTANCE 只能由用户编辑' })
          continue
        }
        if (rel.endsWith('.infer')) {
          infers.push(rel)
          continue
        }
        if (rel.endsWith('.ts') && isUnder(rel, 'typescript/cases')) {
          violations.push({ path: rel, reason: '用例不可改' })
          continue
        }
        if (rel.endsWith('.xl.md')) {
          if (editable.some((dir) => isUnder(rel, dir))) {
            code.push(rel)
          } else {
            violations.push({
              path: rel,
              reason: `可写范围之外（只允许 ${editable.join(' / ')} 里的 .xl.md）`,
            })
          }
        }
      }

      if (violations.length > 0) {
        logger.error(`case-fix: 安全边界被越过：${violations.map((item) => `${item.path}（${item.reason}）`).join('；')}`)
      }
      return { available: true, skipped: false, ok: violations.length === 0, error: null, changes, violations, infers, code }
    },
  }
}

/**
 * `git status --porcelain=v1 -z`：拿工作区里改动/新增/重命名的文件。
 *
 * `-z` 关掉路径转义（中文路径原样），换行换成 NUL；重命名还会多一项旧路径。
 *
 * @param {string} root
 * @returns {Promise<{ok: true, changes: {status: string, path: string}[]}|{ok: false, error: string}>}
 */
export function parseGitStatus(output) {
  const parts = String(output).split('\0')
  const changes = []
  for (let index = 0; index < parts.length; index++) {
    const entry = parts[index]
    if (entry.length < 4) {
      continue
    }
    const status = entry.slice(0, 2)
    const file = entry.slice(3).split('\\').join('/')
    if (file === '') {
      continue
    }
    changes.push({ status, path: file })
    if (status.includes('R') || status.includes('C')) {
      index++
    }
  }
  return changes
}

/**
 * 跑一次 git status。
 *
 * @param {string} root
 * @returns {Promise<{ok: true, changes: object[]}|{ok: false, error: string}>}
 */
function gitStatus(root) {
  return new Promise((resolve) => {
    let settled = false
    const finish = (value) => {
      if (!settled) {
        settled = true
        resolve(value)
      }
    }
    const child = spawn('git', ['status', '--porcelain=v1', '-z'], { cwd: root, windowsHide: true })
    const chunks = []
    child.stdout?.on('data', (chunk) => chunks.push(chunk))
    child.stderr?.on('data', (chunk) => chunks.push(chunk))
    child.on('error', (error) => finish({ ok: false, error: `无法运行 git：${error.message}` }))
    child.on('close', (code) => {
      const text = Buffer.concat(chunks).toString('utf8')
      if (code !== 0) {
        finish({ ok: false, error: `git status 失败（exit=${code}）：${text.trim().slice(0, 400)}` })
        return
      }
      finish({ ok: true, changes: parseGitStatus(text) })
    })
  })
}

/**
 * @param {string} rel
 * @param {string} dir - 相对仓库根。
 * @returns {boolean}
 */
function isUnder(rel, dir) {
  return rel === dir || rel.startsWith(`${dir}/`)
}

/**
 * @param {string} root
 * @param {string} file
 * @returns {string}
 */
function relativeOf(root, file) {
  return path.relative(root, file).split(path.sep).join('/')
}
