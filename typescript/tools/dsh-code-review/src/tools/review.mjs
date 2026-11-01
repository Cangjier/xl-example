/**
 * `code_review`：按 `docs/IMPORTANCE.md` 审代码。
 *
 * 分工与 `case_infer` 一样：确定性的部分全在本地——解析规则、定级、收集文件、校验证据、
 * 排序、渲染；模型只回答「哪一行违反了哪一条」。规则文档是用户独占的，这里只读。
 *
 * 分阶段审：P0 先审、P1 再审……每一轮只把该阶段的规则送进 prompt，模型不必在几十条规则里
 * 自己挑重点，报告的排序也因此天然是分级顺序。
 *
 * @module dsh-code-review/tools/review
 */

import fs from 'node:fs'
import path from 'node:path'
import { batchFiles, collectFiles } from '../files.mjs'
import { completeOnce, resolveModel } from '../llm.mjs'
import { parseFindings } from '../parse.mjs'
import { buildPrompt } from '../prompt.mjs'
import { countByStage, renderReport, sortFindings } from '../report.mjs'
import { groupByStage, readRules, STAGES } from '../rules.mjs'

/**
 * 注册工具。
 *
 * @param {object} ctx - Cordis 插件上下文（取模型服务）。
 * @param {object} toolsCtx - 提供 `tools` 的子上下文。
 * @param {object} config - 归一化后的配置。
 * @param {object} logger - 插件的 logger。
 * @returns {{registered: string[], failed: {name: string, error: string}[]}}
 */
export function registerTools(ctx, toolsCtx, config, logger) {
  const definition = createReviewTool(ctx, config, logger)
  try {
    toolsCtx.tools.register(definition)
    logger.info('code-review: 已注册工具 code_review')
    return { registered: [definition.name], failed: [] }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error(`code-review: 注册工具 code_review 失败：${message}`)
    return { registered: [], failed: [{ name: definition.name, error: message }] }
  }
}

/**
 * 构造工具定义。
 *
 * @param {object} ctx
 * @param {object} config
 * @param {object} logger
 * @returns {object}
 */
export function createReviewTool(ctx, config, logger) {
  return {
    name: 'code_review',
    description: [
      'Review code against the repository\'s IMPORTANCE rules (docs/IMPORTANCE.md, a user-owned document that is only ever read).',
      'The rules are parsed locally into ids and importance stages (P0 forbidden/mandatory, P1 constraint, P2 quality, P3 note); the model only answers which line violates which rule, and every finding must cite a real line with a verbatim snippet or it is rejected.',
      'Reviews stage by stage (P0 first) so the report is ordered by importance; ok only says the review ran, counts.P0 is the verdict.',
      `Model: ${config.provider ?? 'host default'} / ${config.model ?? 'host default'}. Scope defaults to ${config.maxFiles} files, ${config.filesPerCall} per call.`,
    ].join(' '),
    parameters: {
      type: 'object',
      properties: {
        paths: {
          type: 'array',
          items: { type: 'string' },
          description: 'Files or directories to review, relative to the repository root (directories are walked recursively). Default: ["typescript/shapes", "core/syntax"].',
        },
        stage: {
          type: 'string',
          enum: [...STAGES, 'all'],
          description: 'Review only this importance stage. Default: all configured stages (config.stages, normally P0..P3).',
        },
        outPath: {
          type: 'string',
          description: 'Write the Markdown report here (relative to the repository root). Default: return it without writing anything.',
        },
      },
      additionalProperties: false,
    },
    output: {
      schema: { type: 'object', additionalProperties: true },
      render(_args, value) {
        const text = typeof value?.report === 'string' ? value.report : JSON.stringify(value, null, 2)
        return [{ type: 'text', text }]
      },
    },

    /**
     * @param {{paths?: string[], stage?: string, outPath?: string}} args
     * @returns {Promise<object>}
     */
    async execute(args) {
      const rules = readRules(config.rulesPath)
      const codeRules = rules.rules.filter((rule) => rule.scope === 'code')
      const stages = requestedStages(args.stage, config.stages)
      const grouped = groupByStage(rules.rules, { stages })
      const activeStages = stages.filter((stage) => (grouped.get(stage) ?? []).length > 0)

      const collected = collectFiles(config.root, {
        paths: normalizePaths(args.paths),
        maxFiles: config.maxFiles,
        maxFileBytes: config.maxFileBytes,
      })

      // 没有文件 / 没有规则可审时不碰模型：空审查不该要求宿主先有 llm 服务。
      const model = collected.files.length === 0 || activeStages.length === 0
        ? { provider: '-', model: '-', source: 'default' }
        : resolveModel(ctx, config)
      const batches = batchFiles(collected.files, {
        maxFiles: config.filesPerCall,
        maxBytes: config.batchBytes,
      })
      const findings = []
      const calls = { count: 0 }

      for (const stage of activeStages) {
        const stageRules = grouped.get(stage) ?? []
        const ruleMap = new Map(stageRules.map((rule) => [rule.id, rule]))
        for (const batch of batches) {
          const fileMap = new Map(batch.map((file) => [file.rel, file]))
          const prompt = buildPrompt({ stage, rules: stageRules, files: batch })
          const found = await reviewBatch({
            config,
            logger,
            model,
            stage,
            prompt,
            ruleMap,
            fileMap,
            calls,
          })
          findings.push(...found)
        }
        logger.info(`code-review: ${stage} 完成，累计 ${findings.length} 条`)
      }

      const sorted = sortFindings(findings)
      const counts = countByStage(sorted)
      const skipped = collected.skipped.map((item) => `${item.path}（${item.reason}）`)
      const rulesRef = {
        path: path.relative(config.root, rules.path).split(path.sep).join('/'),
        title: rules.title,
        total: rules.rules.length,
        code: codeRules.length,
        meta: rules.rules.length - codeRules.length,
      }
      const report = renderReport({
        findings: sorted,
        rules: rulesRef,
        stages: activeStages,
        files: collected.files.map((file) => file.rel),
        skipped,
        model,
        calls: calls.count,
      })

      const outPath = args.outPath === undefined || args.outPath === null
        ? (config.outPath === null ? null : path.relative(config.root, config.outPath))
        : String(args.outPath)
      let written = null
      if (outPath !== null && outPath !== '') {
        written = path.isAbsolute(outPath) ? outPath : path.resolve(config.root, outPath)
        fs.mkdirSync(path.dirname(written), { recursive: true })
        fs.writeFileSync(written, `${report}\n`, 'utf8')
        logger.info(`code-review: 报告写入 ${written}`)
      }

      return {
        ok: true,
        rules: { path: rulesRef.path, total: rulesRef.total, code: rulesRef.code },
        stages: activeStages,
        files: collected.files.map((file) => file.rel),
        skipped,
        calls: calls.count,
        counts,
        blocking: counts.P0,
        findings: sorted.map((finding) => ({
          level: finding.level,
          rule: finding.rule,
          file: finding.file,
          line: finding.line,
          snippet: finding.snippet,
          why: finding.why,
          fix: finding.fix,
        })),
        report,
        outPath: written,
      }
    },
  }
}

/**
 * 审一批文件：调用模型、校验、带问题重试。
 *
 * @param {object} options
 * @param {object} options.config
 * @param {object} options.logger
 * @param {object} options.model
 * @param {string} options.stage
 * @param {{system: string, user: string}} options.prompt
 * @param {Map<string, object>} options.ruleMap
 * @param {Map<string, object>} options.fileMap
 * @param {{count: number}} options.calls
 * @returns {Promise<object[]>}
 */
async function reviewBatch({ config, logger, model, stage, prompt, ruleMap, fileMap, calls }) {
  let issues = []
  for (let attempt = 0; attempt <= config.retries; attempt++) {
    calls.count += 1
    const user = attempt === 0
      ? prompt.user
      : `${prompt.user}\n\n# 你上一次的输出有这些问题，请重来\n\n${issues.map((issue) => `- ${issue}`).join('\n')}`
    const reply = await completeOnce({
      llm: model.llm,
      provider: model.provider,
      model: model.model,
      system: prompt.system,
      user,
      maxTokens: config.maxTokens,
      timeoutMs: config.timeoutMs,
    })
    const parsed = parseFindings(reply.text, { rules: ruleMap, files: fileMap })
    issues = parsed.issues
    if (issues.length === 0) {
      logger.info(`code-review: ${stage} 第 ${attempt + 1} 次输出 ${parsed.findings.length} 条 finding（${reply.elapsedMs}ms）`)
      return parsed.findings
    }
    const excerpt = reply.text.replace(/\s+/g, ' ').slice(0, 300)
    logger.info(`code-review: ${stage} 第 ${attempt + 1} 次输出不合格：${issues.length} 个问题；原文前 300 字：${excerpt}`)
    issues = [...issues, `模型原文前 300 字：${excerpt}`]
  }
  throw new Error(`code-review: ${stage} 的模型输出 ${config.retries + 1} 次都不合格：\n${issues.map((issue) => `- ${issue}`).join('\n')}`)
}

/**
 * 把 `stage` 参数折成要审的阶段列表。
 *
 * @param {unknown} stage
 * @param {string[]} configured
 * @returns {string[]}
 */
function requestedStages(stage, configured) {
  if (stage === undefined || stage === null || stage === 'all') {
    return configured
  }
  const value = String(stage)
  if (!STAGES.includes(value)) {
    throw new Error(`stage 只能是 ${[...STAGES, 'all'].join(' / ')}（收到 ${JSON.stringify(stage)}）`)
  }
  return [value]
}

/**
 * `paths` 允许单个字符串（工具调用方常这么传）。
 *
 * @param {unknown} value
 * @returns {string[]|undefined}
 */
function normalizePaths(value) {
  if (value === undefined || value === null) {
    return undefined
  }
  if (typeof value === 'string') {
    return [value]
  }
  if (!Array.isArray(value)) {
    throw new Error('paths 必须是字符串数组')
  }
  return value.map((item) => String(item))
}
