/**
 * 插件配置的归一化。
 *
 * 三条安全边界写死在这里，不随配置变：
 * 1. `editable` 只能落在仓库内、且不能是 `core`、`typescript/cases`、`docs`
 *    （`core` 是用户明确禁止修改的；用例与 IMPORTANCE 是规格，不是实现）；
 * 2. `editable` 默认只有 `typescript/shapes`——`case_fix` 只编排「让形状在正确的格建出来」；
 * 3. `.infer` 不是实现，重新判定走 `action: "regen"`，不走可写范围。
 *
 * @module cj-ts-case-fix/config
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))

/** 插件自己所在的仓库根目录（typescript/tools/cj-ts-case-fix/src → 上四级）。 */
export const DEFAULT_ROOT = path.resolve(HERE, '..', '..', '..', '..')

/** `failOn` 的合法值：审到哪一级算「不通过」。`any` = 有一条 finding 就不过。 */
export const FAIL_ON = ['P0', 'P1', 'P2', 'P3', 'any']

/** 默认的可写目录（相对仓库根）。`core` 永远不在里面。 */
export const DEFAULT_EDITABLE = ['typescript/shapes']

/** 永远不能进 `editable` 的目录：core 是安全边界，用例与文档是规格。 */
export const PROTECTED_ROOTS = ['core', 'typescript/cases', 'docs']

/**
 * @param {unknown} raw - cordis.patch.yml 里这一行的 `config`。
 * @returns {{
 *   root: string,
 *   provider: string|null,
 *   model: string|null,
 *   maxTokens: number,
 *   timeoutMs: number,
 *   retries: number,
 *   runs: number,
 *   maxCases: number,
 *   editable: string[],
 *   maxContextFiles: number,
 *   maxContextBytes: number,
 *   maxFileBytes: number,
 *   excerptLines: number,
 *   maxRulesBytes: number,
 *   buildCommand: string|null,
 *   gate: boolean,
 *   boundary: boolean,
 *   review: boolean,
 *   failOn: string,
 * }} 归一化后的配置。
 * @throws {Error} 某一项类型不对、可写目录越过安全边界时。
 */
export function normalizeConfig(raw) {
  const config = raw === undefined || raw === null ? {} : raw
  if (typeof config !== 'object' || Array.isArray(config)) {
    throw new Error('配置必须是对象')
  }

  const root = config.root === undefined || config.root === null
    ? DEFAULT_ROOT
    : String(config.root)
  if (root.trim() === '') {
    throw new Error('root 不能是空字符串（留空请直接删掉这一项）')
  }
  const resolvedRoot = path.resolve(root)

  const provider = config.provider === undefined || config.provider === null ? null : String(config.provider)
  const model = config.model === undefined || config.model === null ? null : String(config.model)
  if ((provider === null) !== (model === null)) {
    throw new Error('provider 与 model 要同时写或同时留空')
  }

  const buildCommand = config.buildCommand === undefined || config.buildCommand === null
    ? null
    : String(config.buildCommand)
  if (buildCommand !== null && buildCommand.trim() === '') {
    throw new Error('buildCommand 不能是空字符串（走默认构建就删掉这一项）')
  }

  return {
    root: resolvedRoot,
    provider,
    model,
    maxTokens: positiveInteger(config.maxTokens, 8192, 'maxTokens'),
    timeoutMs: positiveInteger(config.timeoutMs, 180_000, 'timeoutMs'),
    retries: nonNegativeInteger(config.retries, 1, 'retries'),
    runs: boundedInteger(config.runs, 3, 1, 9, 'runs'),
    maxCases: positiveInteger(config.maxCases, 8, 'maxCases'),
    editable: editableList(config.editable, resolvedRoot),
    maxContextFiles: positiveInteger(config.maxContextFiles, 6, 'maxContextFiles'),
    maxContextBytes: positiveInteger(config.maxContextBytes, 80_000, 'maxContextBytes'),
    maxFileBytes: positiveInteger(config.maxFileBytes, 24_000, 'maxFileBytes'),
    excerptLines: positiveInteger(config.excerptLines, 80, 'excerptLines'),
    maxRulesBytes: positiveInteger(config.maxRulesBytes, 16_000, 'maxRulesBytes'),
    buildCommand,
    gate: booleanValue(config.gate, true, 'gate'),
    boundary: booleanValue(config.boundary, true, 'boundary'),
    review: booleanValue(config.review, true, 'review'),
    failOn: failOnValue(config.failOn, 'P0'),
  }
}

/**
 * 可写目录：必须落在仓库内，且不能是 core / 用例 / 文档（安全边界不随配置放宽）。
 *
 * @param {unknown} value
 * @param {string} root
 * @returns {string[]} 绝对路径（去重、保持顺序）。
 */
function editableList(value, root) {
  if (value === undefined || value === null) {
    return DEFAULT_EDITABLE.map((item) => path.resolve(root, item))
  }
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('editable 必须是非空数组（相对仓库根的目录）')
  }
  const out = []
  for (const item of value) {
    const text = String(item).trim()
    if (text === '') {
      throw new Error('editable 里不能有空字符串')
    }
    const absolute = path.resolve(root, text)
    const relative = path.relative(root, absolute).split(path.sep).join('/')
    if (relative === '' || relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new Error(`editable 里的 ${JSON.stringify(text)} 必须落在仓库内的一个子目录`)
    }
    if (PROTECTED_ROOTS.some((protectedRoot) => relative === protectedRoot || relative.startsWith(`${protectedRoot}/`))) {
      throw new Error(`editable 里的 ${JSON.stringify(text)} 越过安全边界（${PROTECTED_ROOTS.join(' / ')} 不可写）`)
    }
    if (!out.includes(absolute)) {
      out.push(absolute)
    }
  }
  return out
}

/**
 * @param {unknown} value
 * @param {string} fallback
 * @returns {string}
 */
function failOnValue(value, fallback) {
  if (value === undefined || value === null) {
    return fallback
  }
  const text = String(value)
  const normalized = text.toLowerCase() === 'any' ? 'any' : text.toUpperCase()
  if (!FAIL_ON.includes(normalized)) {
    throw new Error(`failOn 只能是 ${FAIL_ON.join(' / ')}（收到 ${JSON.stringify(value)}）`)
  }
  return normalized
}

/**
 * @param {unknown} value
 * @param {boolean} fallback
 * @param {string} name
 * @returns {boolean}
 */
function booleanValue(value, fallback, name) {
  if (value === undefined || value === null) {
    return fallback
  }
  if (typeof value !== 'boolean') {
    throw new Error(`${name} 必须是 true / false（收到 ${JSON.stringify(value)}）`)
  }
  return value
}

/**
 * @param {unknown} value
 * @param {number} fallback
 * @param {string} name
 * @returns {number}
 */
function positiveInteger(value, fallback, name) {
  if (value === undefined || value === null) {
    return fallback
  }
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} 必须是正整数（收到 ${JSON.stringify(value)}）`)
  }
  return value
}

/**
 * @param {unknown} value
 * @param {number} fallback
 * @param {string} name
 * @returns {number}
 */
function nonNegativeInteger(value, fallback, name) {
  if (value === undefined || value === null) {
    return fallback
  }
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${name} 必须是非负整数（收到 ${JSON.stringify(value)}）`)
  }
  return value
}

/**
 * @param {unknown} value
 * @param {number} fallback
 * @param {number} min
 * @param {number} max
 * @param {string} name
 * @returns {number}
 */
function boundedInteger(value, fallback, min, max, name) {
  if (value === undefined || value === null) {
    return fallback
  }
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${name} 必须是 ${min}..${max} 的整数（收到 ${JSON.stringify(value)}）`)
  }
  return value
}
