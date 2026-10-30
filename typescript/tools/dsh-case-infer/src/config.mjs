/**
 * 插件配置的归一化。
 *
 * 没有必填项：`root` 留空就从插件自身位置推（`<repo>/typescript/tools/dsh-case-infer`
 * 上三级），`provider`/`model` 留空就用宿主当前默认模型。
 *
 * @module dsh-case-infer/config
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))

/** 插件自己所在的仓库根目录（typescript/tools/dsh-case-infer/src → 上四级）。 */
export const DEFAULT_ROOT = path.resolve(HERE, '..', '..', '..', '..')

/**
 * @param {unknown} raw - cordis.patch.yml 里这一行的 `config`。
 * @returns {{
 *   root: string,
 *   provider: string|null,
 *   model: string|null,
 *   maxTokens: number,
 *   timeoutMs: number,
 *   retries: number,
 * }} 归一化后的配置。
 * @throws {Error} 某一项类型不对时。
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

  const provider = config.provider === undefined || config.provider === null ? null : String(config.provider)
  const model = config.model === undefined || config.model === null ? null : String(config.model)
  if ((provider === null) !== (model === null)) {
    throw new Error('provider 与 model 要同时写或同时留空')
  }

  return {
    root: path.resolve(root),
    provider,
    model,
    maxTokens: positiveInteger(config.maxTokens, 8192, 'maxTokens'),
    timeoutMs: positiveInteger(config.timeoutMs, 120_000, 'timeoutMs'),
    retries: nonNegativeInteger(config.retries, 1, 'retries'),
  }
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
