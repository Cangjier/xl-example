/**
 * cj-ts-case-fix：`case_fix` 工具。
 *
 * 一件什么事：编排「按 tts 用例的 `.infer` 修实现」——`plan` 把缺口、实现文件、安全边界和
 * 验收标准写成任务书交给 DSH，`verify` 独立验收（边界 + 构建 + 门禁 + 对拍 + `code_review`），
 * `regen` 调 `case_infer` 重新判定 `.infer`。
 *
 * 插件自己不改实现：模型改代码这件事被移到 DSH 那边（它可以被审阅、被回滚），插件只做
 * 确定性的部分——读 `.infer`、算缺口、找实现文件、查 git 边界、构建、对拍、调审查。
 *
 * 零依赖、纯 ESM：不 import 任何 harness 包，`tools` / `llm` 从 Cordis 上下文里取。
 *
 * @module cj-ts-case-fix
 */

import { normalizeConfig } from './src/config.mjs'
import { registerTools } from './src/tools/fix.mjs'

/** Cordis 插件名（也是 cordis.patch.yml 里那一行的 id）。 */
export const name = 'case-fix'

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
    ctx.logger.error(`case-fix: 配置无效，插件未注册任何工具：${message}`)
    return
  }

  try {
    ctx.inject(['tools'], (toolsCtx) => {
      registerTools(ctx, toolsCtx, config, ctx.logger)
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    ctx.logger.error(`case-fix: 无法注册工具（缺少 tools 服务）：${message}`)
  }
}
