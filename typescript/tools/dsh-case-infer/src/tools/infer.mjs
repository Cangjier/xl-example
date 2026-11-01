/**
 * `case_infer`：给一个 tts 用例生成 `case.infer`。
 *
 * 流程：本地生成骨架（created at 已从 ShapeToken 的 created 位置填好）→ 把「节点清单 + 逐字表 + 源码」
 * 交给宿主默认模型，**跑 runs 次（默认 3）** → 每个节点投票：
 *   - 所有有效次都给同一个字符 → 采纳，写进 `.infer`；
 *   - 有分歧 → 这一行先写 `-> llm ?`，把每一票和上下文交回 DSH 决策，工具不猜。
 * DSH 决策后带 `decisions` 再调一次：那条路径不调用模型，只把选定字符填回文件、写盘、对拍。
 *
 * 模型只出数字，树和格式都在本地生成：输出小、可校验；不合格就带着问题重试，
 * 某一次仍然不合格就整体失败、不写盘（宁可不写，也不写半份错的）。
 *
 * @module dsh-case-infer/tools/infer
 */

import fs from 'node:fs'
import path from 'node:path'
import {
  applyNumbers,
  astLines,
  charBlocks,
  contextAt,
  evaluate,
  nodeInfo,
  parseInfer,
  scaffold,
} from '../../../case-infer.mjs'
import { canonicalKind, traceActual } from '../../../shape-actual.mjs'
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
      'Generate <case>.infer for a tts case: for every node of the TypeScript AST, both the character recorded as its created position (ShapeToken.CreatedRevisionAt when present, otherwise ShapeToken.CreatedAt) and the first character at which the model judges that shape to be determined.',
      'Only the judgement is made by the host\'s current default model (agentDefaultModel); the tool builds the skeleton with created at already filled, asks for the "llm determined" numbers only, fills them back, formats the notes and runs the llm-vs-created check.',
      `The judgement is asked ${config.runs} times by default (runs). A node every valid run agrees on is written; a node the runs disagree on is written as "-> llm ?" and returned in "pending" with each run's vote and its source window — the tool never picks for you.`,
      'Settle the pending nodes by calling again with decisions: { "<Kind|pos|start>": <char> } — that call makes no model call, fills the file and checks it. Pass overwrite:true to discard an existing .infer and judge again.',
      `Model: ${config.provider ?? 'host default'} / ${config.model ?? 'host default'}.`,
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
        runs: {
          type: 'integer',
          minimum: 1,
          maximum: 9,
          description: `How many independent judgements to ask for. Default ${config.runs}. Nodes the runs disagree on are returned as pending instead of being written.`,
        },
        decisions: {
          type: 'object',
          additionalProperties: { type: 'integer' },
          description: 'Settle nodes the runs disagreed on: { "<Kind|pos|start>": <char> } — the ids and candidate chars are in the previous result\'s "pending". Makes no model call.',
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
     * @param {{case: string, overwrite?: boolean, runs?: number, decisions?: Record<string, number>}} args
     * @returns {Promise<object>}
     */
    async execute(args) {
      const spec = String(args.case ?? '')
      const target = resolveCase(config.root, spec)
      if (!fs.existsSync(target.file)) {
        throw new Error(`找不到用例：${target.file}`)
      }
      const source = fs.readFileSync(target.file, 'utf8')
      const name = path.basename(target.file)
      const inferPath = target.file.replace(/\.ts$/, '.infer')
      const actual = traceActual(source, name)

      const decisions = readDecisions(args.decisions)
      if (decisions !== null) {
        return decide({ root: config.root, spec, source, name, inferPath, actual, decisions, logger })
      }

      const runs = resolveRuns(args.runs, config.runs)
      if (fs.existsSync(inferPath) && args.overwrite !== true) {
        throw new Error(`${inferPath} 已存在；要重新判定请传 overwrite: true`)
      }

      const nodes = astLines(source, name)
        .map(nodeInfo)
        .filter((node) => node !== null)
      const prompt = buildPrompt({ source, blocks: charBlocks(source), nodes })

      const model = resolveModel(ctx, config)
      const reasoningEffort = await leastReasoningEffort(model.llm, model.provider, model.model)
      const charCount = Array.from(source).length
      logger.info(`case-infer: ${name} 用 ${model.provider}/${model.model}，判定 ${runs} 次（reasoningEffort=${reasoningEffort ?? '默认'}）`)

      const outcomes = []
      let calls = 0
      for (let run = 0; run < runs; run++) {
        const outcome = await askOnce({
          model,
          system: prompt.system,
          user: prompt.user,
          config,
          nodes,
          charCount,
          name,
          run: run + 1,
          total: runs,
          reasoningEffort,
          logger,
        })
        calls += outcome.calls
        outcomes.push(outcome)
        logger.info(
          `case-infer: ${name} 第 ${run + 1}/${runs} 次判定：` +
          (outcome.issues.length === 0 ? `${outcome.numbers.size} 个节点` : `不合格（${outcome.issues.length} 个问题）`) +
          `，调用 ${outcome.calls} 次`,
        )
      }

      const valid = outcomes.filter((outcome) => outcome.issues.length === 0)
      if (valid.length === 0) {
        const details = outcomes.flatMap((outcome, index) =>
          outcome.issues.map((issue) => `第 ${index + 1} 次：${issue}`))
        throw new Error(`模型 ${runs} 次都没给出合格的节点表，未写盘：\n${details.map((line) => `- ${line}`).join('\n')}`)
      }
      if (runs >= 2 && valid.length < 2) {
        throw new Error(
          `只有 ${valid.length}/${runs} 次给出合格的节点表：至少要有 2 次有效判定才能定稿，未写盘`,
        )
      }

      const { agreed, disputed } = aggregate(valid, nodes)
      const applied = applyNumbers(source, scaffold(source, name, actual.created), agreed, actual.created)
      fs.writeFileSync(inferPath, applied.text, 'utf8')
      logger.info(
        `case-infer: 写入 ${inferPath}（${applied.filled}/${nodes.length} 个节点已定，` +
        `${disputed.length} 个待决策）`,
      )

      const check = safeCheck(source, name, applied.text, actual)
      const pending = disputed.map((entry) => describePending(source, entry))
      const lines = [
        `已写入 ${path.relative(config.root, inferPath).split(path.sep).join('/')}`,
        `模型：${model.provider} / ${model.model}（${model.source === 'default' ? '宿主默认' : '配置写死'}），` +
        `${valid.length}/${runs} 次有效，共 ${calls} 次模型调用`,
        `节点 ${applied.filled}/${nodes.length} 已定` + (pending.length === 0 ? '' : `，${pending.length} 个待 DSH 决策（文件里先写作 \`-> llm ?\`）`),
      ]
      if (pending.length > 0) {
        lines.push('', '待决策：')
        for (const entry of pending) {
          lines.push(`  ${entry.kind}  pos=${entry.pos}  src=[${entry.start},${entry.end})  id=${entry.id}`)
          for (const candidate of entry.candidates) {
            lines.push(`    ${candidate.char} ×${candidate.count}   ${candidate.at}`)
          }
        }
        lines.push('', '补完这次生成（不调用模型）：')
        lines.push(`  case_infer { case: ${JSON.stringify(spec)}, decisions: { ${pending.map((entry) => `"${entry.id}": <char>`).join(', ')} } }`)
      }
      lines.push('', ...describeCheck(check))

      return {
        ok: pending.length === 0 && check.available !== false,
        status: pending.length === 0 ? 'written' : 'needs-decision',
        file: inferPath,
        model: { provider: model.provider, model: model.model, source: model.source },
        runs,
        calls,
        nodes: applied.filled,
        pending,
        gaps: check.available === false ? null : check.issues,
        check,
        text: lines.join('\n'),
      }
    },
  }
}

/**
 * 决策路径：把 DSH 选定的字符填回 `.infer`，不调用模型。
 *
 * @param {object} options
 * @param {string} options.root - 仓库根目录。
 * @param {string} options.spec - 调用方传入的 case 原样（回显用）。
 * @param {string} options.source
 * @param {string} options.name
 * @param {string} options.inferPath
 * @param {{created: Map<string, number|null>}} options.actual
 * @param {Record<string, number>} options.decisions - 节点身份 → 字符。
 * @param {object} options.logger
 * @returns {object}
 */
function decide({ root, spec, source, name, inferPath, actual, decisions, logger }) {
  if (!fs.existsSync(inferPath)) {
    throw new Error(`还没有 ${inferPath}：先不传 decisions 跑一次判定`)
  }
  const nodes = astLines(source, name).map(nodeInfo).filter((node) => node !== null)
  const ids = new Set(nodes.map(keyOf))
  const unknown = Object.keys(decisions).filter((id) => !ids.has(id))
  if (unknown.length > 0) {
    throw new Error(`decisions 里有清单外的节点：${unknown.join('、')}（id 形如 TypeReference|11|12）`)
  }
  const charCount = Array.from(source).length
  for (const [id, char] of Object.entries(decisions)) {
    if (char < 0 || char >= charCount) {
      throw new Error(`decisions["${id}"]=${char} 越界，应在 0..${charCount - 1}`)
    }
  }

  const text = fs.readFileSync(inferPath, 'utf8')
  const notes = parseInfer(text)
  const numbers = new Map()
  for (const [id, note] of notes) {
    if (note.llm !== null && note.llm !== undefined) {
      numbers.set(id, note.llm)
    }
  }
  for (const [id, char] of Object.entries(decisions)) {
    numbers.set(id, char)
  }

  const applied = applyNumbers(source, text, numbers, actual.created)
  fs.writeFileSync(inferPath, applied.text, 'utf8')
  logger.info(`case-infer: 决策写入 ${inferPath}（${Object.keys(decisions).length} 个节点由 DSH 决定）`)

  const check = safeCheck(source, name, applied.text, actual)
  const unfilled = check.available === false ? null : check.unfilled
  const lines = [
    `已写入 ${path.relative(root, inferPath).split(path.sep).join('/')}`,
    `case: ${JSON.stringify(spec)}`,
    `DSH 决策 ${Object.keys(decisions).length} 个节点，未调用模型`,
  ]
  if (unfilled !== null && unfilled > 0) {
    lines.push(`仍未判定：${unfilled} 个节点（文件里还是 \`-> llm ?\`）`)
  }
  lines.push(...describeCheck(check))

  return {
    ok: check.available !== false && unfilled === 0,
    status: 'decided',
    file: inferPath,
    runs: 0,
    calls: 0,
    decided: Object.keys(decisions).length,
    check,
    text: lines.join('\n'),
  }
}

/**
 * 跑一次判定（含不合格重试）。
 *
 * @param {object} options
 * @returns {Promise<{numbers: Map<string, number>, issues: string[], calls: number}>}
 */
async function askOnce({ model, system, user, config, nodes, charCount, name, run, total, reasoningEffort, logger }) {
  let numbers = new Map()
  let issues = []
  let calls = 0

  for (let attempt = 0; attempt <= config.retries; attempt++) {
    calls++
    const message = attempt === 0
      ? user
      : `${user}\n\n# 你上一次的输出有这些问题，请重来\n\n${issues.map((issue) => `- ${issue}`).join('\n')}`
    const reply = await completeOnce({
      llm: model.llm,
      provider: model.provider,
      model: model.model,
      system,
      user: message,
      maxTokens: config.maxTokens,
      timeoutMs: config.timeoutMs,
      reasoningEffort,
    })
    logger.info(
      `case-infer: ${name} 第 ${run}/${total} 次判定、第 ${attempt + 1} 次调用输出 ` +
      `${reply.text.length} 字符（${reply.elapsedMs}ms，${reply.finishReason ?? '—'}）`,
    )
    const parsed = parseNumbers(reply.text, nodes, charCount)
    numbers = parsed.numbers
    issues = parsed.issues
    if (issues.length === 0) {
      return { numbers, issues, calls }
    }
    // 把模型的原文留在日志和错误里：不合格时最想知道的就是它到底说了什么。
    const excerpt = reply.text.replace(/\s+/g, ' ').slice(0, 400)
    logger.info(`case-infer: ${name} 第 ${run}/${total} 次、第 ${attempt + 1} 次调用不合格：${issues.length} 个问题；原文前 400 字：${excerpt}`)
    issues = issues.concat([`模型原文前 400 字：${excerpt}`])
  }

  return { numbers, issues, calls }
}

/**
 * 逐节点投票：全部有效次一致才采纳，否则进 disputed。
 *
 * @param {{numbers: Map<string, number>}[]} runs
 * @param {{kind: string, pos: number, start: number, end: number}[]} nodes
 * @returns {{agreed: Map<string, number>, disputed: {node: object, id: string, votes: (number|null)[]}[]}}
 */
function aggregate(runs, nodes) {
  const agreed = new Map()
  const disputed = []
  for (const node of nodes) {
    const id = keyOf(node)
    const votes = runs.map((run) => {
      const vote = run.numbers.get(id)
      return vote === undefined ? null : vote
    })
    const settled = votes.every((vote) => vote !== null && vote === votes[0])
    if (settled) {
      agreed.set(id, votes[0])
    } else {
      disputed.push({ node, id, votes })
    }
  }
  return { agreed, disputed }
}

/**
 * 把一个分歧节点整理成给 DSH 看的形状：每一票 + 每一票落在源码哪里。
 *
 * @param {string} source
 * @param {{node: object, id: string, votes: (number|null)[]}} entry
 * @returns {object}
 */
function describePending(source, { node, id, votes }) {
  const tally = new Map()
  for (const vote of votes) {
    if (vote === null) {
      continue
    }
    tally.set(vote, (tally.get(vote) ?? 0) + 1)
  }
  const candidates = [...tally.entries()]
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])
    .map(([char, count]) => ({ char, count, at: contextAt(source, char) }))
  return {
    id,
    kind: node.kind,
    pos: node.pos,
    start: node.start,
    end: node.end,
    votes: votes.map((char, index) => ({ run: index + 1, char, at: char === null ? null : contextAt(source, char) })),
    candidates,
  }
}

/**
 * 对拍（读 `build/ts`）；不可用时把原因写进结果，不让它把整次生成变成异常。
 *
 * @param {string} source
 * @param {string} name
 * @param {string} text - `.infer` 全文。
 * @param {object} actual - `traceActual` 的结果。
 * @returns {object}
 */
function safeCheck(source, name, text, actual) {
  try {
    const { rows, stale } = evaluate(source, name, text, actual)
    return summarize(rows, stale)
  } catch (error) {
    return {
      available: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * 把对拍结果渲染成几行文字。
 *
 * @param {object} check
 * @returns {string[]}
 */
function describeCheck(check) {
  if (check.available === false) {
    return [`对拍不可用：${check.error}`]
  }
  const lines = [
    `对拍：一致 ${check.ok} / ${check.total}（late ${check.late}，early ${check.early}，` +
    `no-created ${check.unknown}，never ${check.never}，unfilled ${check.unfilled}` +
    `${check.stale > 0 ? `，stale ${check.stale}` : ''}）`,
  ]
  return lines
}

/** decisions 的粗校验：必须是对象、每个值必须是整数；越界在拿到源码后再查。 */
function readDecisions(raw) {
  if (raw === undefined || raw === null) {
    return null
  }
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('decisions 必须是 { "Kind|pos|start": char } 对象')
  }
  const out = {}
  for (const [id, char] of Object.entries(raw)) {
    if (!Number.isInteger(char)) {
      throw new Error(`decisions["${id}"] 必须是整数（收到 ${JSON.stringify(char)}）`)
    }
    out[id] = char
  }
  return out
}

/** runs 的调用级覆盖：1..9。 */
function resolveRuns(value, fallback) {
  if (value === undefined || value === null) {
    return fallback
  }
  if (!Number.isInteger(value) || value < 1 || value > 9) {
    throw new Error(`runs 必须是 1..9 的整数（收到 ${JSON.stringify(value)}）`)
  }
  return value
}

/** 节点身份与 `.ast` / `.infer` / 实际树三边一致：kind + pos + src 起点。 */
function keyOf(node) {
  return `${canonicalKind(node.kind)}|${node.pos}|${node.start}`
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
