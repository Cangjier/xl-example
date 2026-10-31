/**
 * `case_infer`：给一个 tts 用例生成 `case.infer`。
 *
 * 流程：本地生成骨架（created at 已从 ShapeToken.CreatedAt 填好）→ 把「节点清单 + 逐字表 + 源码」
 * 交给宿主默认模型 → 模型只回「节点 → llm determined 字符号」的数字 → 本地填回骨架、补上下文、
 * 写盘 → 立刻跑 llm determined vs created at 对拍。
 *
 * 模型只出数字，树和格式都在本地生成：输出小、可校验；不合格就带着问题重试，
 * 仍然不合格则不写盘。
 *
 * @module dsh-case-infer/tools/infer
 */

import fs from 'node:fs'
import path from 'node:path'
import {
  applyNumbers,
  astLines,
  charBlocks,
  evaluate,
  nodeInfo,
  scaffold,
} from '../../../case-infer.mjs'
import { traceActual } from '../../../shape-actual.mjs'
import { completeOnce, leastReasoningEffort, resolveModel } from '../llm.mjs'
import { parseNumbers } from '../parse.mjs'
import { buildPrompt } from '../prompt.mjs'

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
  const definition = createInferTool(ctx, config, logger)
  try {
    toolsCtx.tools.register(definition)
    logger.info('case-infer: 已注册工具 case_infer')
    return { registered: [definition.name], failed: [] }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error(`case-infer: 注册工具 case_infer 失败：${message}`)
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
export function createInferTool(ctx, config, logger) {
  return {
    name: 'case_infer',
    description: [
      'Generate <case>.infer for a tts case: for every node of the TypeScript AST, both the character at which the shape token was created (ShapeToken.CreatedAt) and the first character at which the model judges that shape to be determined.',
      'Only the judgement is made by the host\'s current default model (agentDefaultModel); the tool builds the skeleton with created at already filled, asks for the "llm determined" numbers only, fills them back, formats the notes and runs the llm-vs-created check.',
      'Writes the .infer file next to the .ts (refuses to overwrite unless overwrite:true), then reports ok / late +N / early -N / no-created / never per node.',
      `Model: ${config.provider ?? 'host default'} / ${config.model ?? 'host default'}. One model call per generation (plus at most ${config.retries} retry on a malformed answer).`,
    ].join(' '),
    parameters: {
      type: 'object',
      properties: {
        case: {
          type: 'string',
          description: 'Case id relative to typescript/cases/tts (for example "success/types/alias-conditional-infer"), or a path to a .ts file relative to the repository root.',
        },
        overwrite: {
          type: 'boolean',
          description: 'Replace an existing .infer. Default false: an existing file is refused so a previous judgement is not lost silently.',
        },
      },
      required: ['case'],
      additionalProperties: false,
    },
    output: {
      schema: { type: 'object', additionalProperties: true },
      render(_args, value) {
        const text = typeof value?.text === 'string' ? value.text : JSON.stringify(value, null, 2)
        return [{ type: 'text', text }]
      },
    },

    /**
     * @param {{case: string, overwrite?: boolean}} args
     * @returns {Promise<object>}
     */
    async execute(args) {
      const target = resolveCase(config.root, String(args.case ?? ''))
      if (!fs.existsSync(target.file)) {
        throw new Error(`找不到用例：${target.file}`)
      }
      const source = fs.readFileSync(target.file, 'utf8')
      const name = path.basename(target.file)
      const inferPath = target.file.replace(/\.ts$/, '.infer')
      const overwrite = args.overwrite === true
      if (fs.existsSync(inferPath) && !overwrite) {
        throw new Error(`${inferPath} 已存在；要重新判定请传 overwrite: true`)
      }

      // created at 来自 ShapeToken.CreatedAt：骨架里先填好，模型只补 llm determined。
      const actual = traceActual(source, name)
      const text = scaffold(source, name, actual.created)
      const nodes = astLines(source, name)
        .map(nodeInfo)
        .filter((node) => node !== null)
      const prompt = buildPrompt({ source, blocks: charBlocks(source), nodes })
      const system = prompt.system

      const model = resolveModel(ctx, config)
      const reasoningEffort = await leastReasoningEffort(model.llm, model.provider, model.model)
      logger.info(`case-infer: ${name} 用 ${model.provider}/${model.model}（reasoningEffort=${reasoningEffort ?? '默认'}）`)
      const charCount = Array.from(source).length

      let numbers = new Map()
      let issues = []
      let attempted = 0
      for (let attempt = 0; attempt <= config.retries; attempt++) {
        attempted = attempt + 1
        const user = attempt === 0
          ? prompt.user
          : `${prompt.user}\n\n# 你上一次的输出有这些问题，请重来\n\n${issues.map((issue) => `- ${issue}`).join('\n')}`
        const reply = await completeOnce({
          llm: model.llm,
          provider: model.provider,
          model: model.model,
          system,
          user,
          maxTokens: config.maxTokens,
          timeoutMs: config.timeoutMs,
          reasoningEffort,
        })
        logger.info(`case-infer: ${name} 第 ${attempted} 次模型输出 ${reply.text.length} 字符（${reply.elapsedMs}ms，${reply.finishReason ?? '—'}）`)
        const parsed = parseNumbers(reply.text, nodes, charCount)
        numbers = parsed.numbers
        issues = parsed.issues
        if (issues.length === 0) {
          break
        }
        // 把模型的原文留在日志和错误里：不合格时最想知道的就是它到底说了什么。
        const excerpt = reply.text.replace(/\s+/g, ' ').slice(0, 400)
        logger.info(`case-infer: ${name} 第 ${attempted} 次输出不合格：${issues.length} 个问题；原文前 400 字：${excerpt}`)
        issues = issues.map((issue) => issue).concat([`模型原文前 400 字：${excerpt}`])
      }
      if (issues.length > 0) {
        throw new Error(`模型 ${attempted} 次都没给出合格的节点表，未写盘：\n${issues.map((issue) => `- ${issue}`).join('\n')}`)
      }

      const applied = applyNumbers(source, text, numbers, actual.created)
      if (applied.missing.length > 0) {
        throw new Error(`有节点没填上（未写盘）：${applied.missing.join('、')}`)
      }
      fs.writeFileSync(inferPath, applied.text, 'utf8')
      logger.info(`case-infer: 写入 ${inferPath}（${applied.filled} 个节点）`)

      let check
      try {
        const { rows, stale } = evaluate(source, name, applied.text, actual)
        check = summarize(rows, stale)
      } catch (error) {
        check = {
          available: false,
          error: error instanceof Error ? error.message : String(error),
        }
      }

      const lines = [
        `已写入 ${path.relative(config.root, inferPath).split(path.sep).join('/')}`,
        `模型：${model.provider} / ${model.model}（${model.source === 'default' ? '宿主默认' : '配置写死'}）`,
        `节点 ${applied.filled} 个，模型调用 ${attempted} 次`,
      ]
      if (check.available === false) {
        lines.push(`对拍不可用：${check.error}`)
      } else {
        lines.push(`对拍：一致 ${check.ok} / ${check.total}（late ${check.late}，early ${check.early}，no-created ${check.unknown}，never ${check.never}，unfilled ${check.unfilled}${check.stale > 0 ? `，stale ${check.stale}` : ''}）`)
        lines.push('')
        for (const row of check.rows) {
          lines.push(`${row.status.padEnd(12)}${row.kind}  pos=${row.pos}  src=[${row.start},${row.end})  llm=${row.llm ?? '?'}  created=${row.created ?? '?'}`)
        }
      }

      return {
        ok: check.available !== false,
        file: inferPath,
        model: { provider: model.provider, model: model.model, source: model.source },
        calls: attempted,
        nodes: applied.filled,
        gaps: check.available === false ? null : check.issues,
        check,
        text: lines.join('\n'),
      }
    },
  }
}

/**
 * 把用例 id 或 .ts 路径解析成绝对路径。
 *
 * @param {string} root - 仓库根目录。
 * @param {string} spec - 用例 id（相对 typescript/cases/tts）或 .ts 路径（相对仓库根）。
 * @returns {{file: string, id: string}}
 */
function resolveCase(root, spec) {
  if (spec.trim() === '') {
    throw new Error('case 不能为空')
  }
  const isFile = spec.endsWith('.ts')
  const file = path.resolve(root, isFile ? spec : path.join('typescript', 'cases', 'tts', `${spec}.ts`))
  const id = isFile
    ? path.relative(root, file).split(path.sep).join('/').replace(/\.ts$/, '')
    : spec.replace(/\.ts$/, '')
  return { file, id }
}

/**
 * 对拍结果压缩成工具返回值。
 *
 * @param {{status: string, info: {kind: string, pos: number, start: number, end: number}, llm: number|null, created: number|null, delta: number|null}[]} rows
 * @param {string[]} stale
 * @returns {object}
 */
function summarize(rows, stale) {
  const counts = { ok: 0, late: 0, early: 0, unknown: 0, never: 0, unfilled: 0, other: 0 }
  for (const row of rows) {
    if (row.status === 'ok') counts.ok++
    else if (row.status.startsWith('late')) counts.late++
    else if (row.status.startsWith('early')) counts.early++
    else if (row.status === 'no-created') counts.unknown++
    else if (row.status === 'no-shape') counts.never++
    else if (row.status === 'unfilled') counts.unfilled++
    else counts.other++
  }
  return {
    available: true,
    total: rows.length,
    ok: counts.ok,
    late: counts.late,
    early: counts.early,
    unknown: counts.unknown,
    never: counts.never,
    unfilled: counts.unfilled,
    stale: stale.length,
    issues: rows.length - counts.ok + stale.length,
    rows: rows.map((row) => ({
      status: row.status,
      kind: row.info.kind,
      pos: row.info.pos,
      start: row.info.start,
      end: row.info.end,
      llm: row.llm,
      created: row.created,
      delta: row.delta,
    })),
  }
}
