/**
 * dsh-case-infer：`case_infer` 工具。
 *
 * 一件什么事：给 tts 用例产出 `<名字>.infer` —— 每个形状的 `created at`（shape token）
 * 与 `llm determined`（模型判定的确定格），写完立刻做 llm vs created 对拍。
 *
 * 为什么是插件而不是仓库里的脚本：模型通道（`llm` 服务）只在 DSH 进程里。
 * 骨架、格式、对拍仍然复用 `typescript/tools/case-infer.mjs`，插件不重写这些。
 *
 * 零依赖、纯 ESM：不 import 任何 harness 包，`llm` 从 Cordis 上下文里取，
 * 所以整条链路可以用一个假的 `{ stream() }` 离线测。
 *
 * @module dsh-case-infer
 */

import { normalizeConfig } from './src/config.mjs'
import { registerTools } from './src/tools/infer.mjs'

/** Cordis 插件名（也是 cordis.patch.yml 里那一行的 id）。 */
export const name = 'case-infer'

/** 注册工具之前需要 `tools` 服务。 */
export const inject = ['tools']

export { normalizeConfig }

/**
 * 挂载插件。配置无效时不注册任何工具，把原因写进日志——一个带错配置悄悄跑起来的
 * 生成工具，比一个明确不可用的要糟得多。
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
    ctx.logger.error(`case-infer: 配置无效，插件未注册任何工具：${message}`)
    return
  }

  try {
    ctx.inject(['tools'], (toolsCtx) => {
      registerTools(ctx, toolsCtx, config, ctx.logger)
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    ctx.logger.error(`case-infer: 无法注册工具（缺少 tools 服务）：${message}`)
  }
}
