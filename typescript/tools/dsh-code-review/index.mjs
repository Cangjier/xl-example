/**
 * dsh-code-review：`code_review` 工具。
 *
 * 一件什么事：按 `docs/IMPORTANCE.md`（用户独占的硬性规范）审代码。规则由本地解析成
 * id + 分级（P0..P3），模型只回答「哪一行违反了哪一条」，证据逐字核对，报告按分级排序。
 *
 * 为什么是插件而不是脚本：模型通道（`llm` 服务）只在 DSH 进程里。
 *
 * 零依赖、纯 ESM：不 import 任何 harness 包，`llm` 从 Cordis 上下文里取，
 * 所以整条链路可以用一个假的 `{ stream() }` 离线测。
 *
 * @module dsh-code-review
 */

import { normalizeConfig } from './src/config.mjs'
import { registerTools } from './src/tools/review.mjs'

/** Cordis 插件名（也是 cordis.patch.yml 里那一行的 id）。 */
export const name = 'code-review'

/** 注册工具之前需要 `tools` 服务。 */
export const inject = ['tools']

export { normalizeConfig }

/**
 * 挂载插件。配置无效时不注册任何工具，把原因写进日志——一个带着错配置悄悄跑起来的
 * 审查工具，比一个明确不可用的要糟得多。
 *
 * @param {object} ctx - Cordis 插件上下文。
 * @param {object} [rawConfig] - 这一行的 `config`。
 * @returns {void}
 */
export function apply(ctx, rawConfig) {
  let config
  try {
    config = normalizeConfig(rawConfig)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    ctx.logger.error(`code-review: 配置无效，插件未注册任何工具：${message}`)
    return
  }

  try {
    ctx.inject(['tools'], (toolsCtx) => {
      registerTools(ctx, toolsCtx, config, ctx.logger)
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    ctx.logger.error(`code-review: 无法注册工具（缺少 tools 服务）：${message}`)
  }
}
