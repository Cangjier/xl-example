/**
 * 任务书（work order）：把「改什么、改哪里、什么算修好」写成 DSH 能直接执行的说明。
 *
 * 这里**不调用模型、不改代码**：`case_fix` 的定位是编排与验收，实际编辑由 DSH 用自己
 * 的工具完成。任务书里的每一段都是本地确定性算出来的（缺口、上下文、边界、验收标准）。
 *
 * @module cj-ts-case-fix/plan
 */

import path from 'node:path'
import { charBlocks } from '../../case-infer.mjs'

/** 每个状态桶给一句「该怎么改」。方向与 `case-infer.mjs` 的 `delta = llm - created` 一致。 */
const HINTS = {
  late: (row) => `llm 那一格比 created 晚 ${row.delta} 格：把创建往后挪到字符 ${row.llm}（或说明为什么不挪）。`,
  early: (row) => `llm 那一格比 created 早 ${-row.delta} 格：把创建提前到字符 ${row.llm}（或说明为什么不挪）。`,
  'no-created': () => '树里有这颗形状但没记 CreatedAt：在真正建出它的那一格补上 create 入口（possible/end 的 build）。',
  'no-shape': () => '逐字推进的任何一格都没建出它：需要一个能建出它的 possible/end，而不是等到收口再解析。',
}

/**
 * 渲染任务书。
 *
 * @param {object} options
 * @param {object} options.config - 归一化配置。
 * @param {object} options.run - 归一化后的调用参数。
 * @param {string} options.rules - IMPORTANCE 全文（或说明为什么没给）。
 * @param {string} options.build - 构建通道说明。
 * @param {object} options.boundary - 边界现状（`createBoundary().inspect()` 的结果）。
 * @param {object[]} options.cases - `[{entry, counts, source, targets, unfilled, context}]`。
 * @param {boolean} [options.inline] - 是否把实现文件正文与规则全文写进来（`taskPath` 时为 true）。
 * @returns {string} Markdown 任务书。
 */
export function renderPlan({ config, run, rules, build, boundary, cases, inline = false }) {
  const lines = []
  const scope = run.mode === 'dir' ? `${cases.length} 个用例` : cases[0]?.entry.id ?? '-'
  lines.push(`# case_fix 任务：${scope}`)
  lines.push('')
  lines.push(
    '按 `.infer` 的 `llm` 列修实现：让每个目标形状的 `created` 落到 `llm` 那一格。' +
    '改完调 `case_fix { action: "verify" }` 验收；怀疑 `.infer` 本身用 `case_fix { action: "regen" }` 重新判定。',
  )
  lines.push('')

  lines.push('## 安全边界（越界即整体失败）')
  lines.push('')
  lines.push(`- 可写：${editableOf(config).map((dir) => `${dir}/**/*.xl.md`).join('、')}`)
  lines.push('- **`core/**` 一律禁止修改**（安全边界）。')
  lines.push('- `typescript/cases/**/*.ts`（用例）不可改；`docs/IMPORTANCE.md` 只能由用户编辑。')
  lines.push('- `.infer` 的 `llm` 列不可手改；要重新判定请调用 `case_fix { action: "regen" }`。')
  if (boundary.available === false) {
    lines.push(`- 现在拿不到 git status（${boundary.error}），` +
      '`verify` 会因为无法确认边界而失败——先把 git 修好。')
  } else if (boundary.ok === false) {
    lines.push('- 现在的工作区已经越界（见下），先把这些改动挪走再说：')
    for (const violation of boundary.violations) {
      lines.push(`  - \`${violation.path}\`：${violation.reason}`)
    }
  } else if (boundary.changes.length > 0) {
    lines.push(`- 工作区现有 ${boundary.changes.length} 个改动（${boundary.changes.slice(0, 6).map((item) => item.path).join('、')}` +
      `${boundary.changes.length > 6 ? ' 等' : ''}）；新改动会按上面的规则检查。`)
  }
  lines.push('')

  for (const item of cases) {
    renderCase(lines, item, config, inline)
  }

  if (inline) {
    lines.push('## 规则（`docs/IMPORTANCE.md`，只读）')
    lines.push('')
    lines.push(...indent(rules.split('\n')))
    lines.push('')
  } else {
    lines.push('## 规则')
    lines.push('')
    lines.push('`docs/IMPORTANCE.md`（用户独占，只读）：用 read 打开并遵守，P0 是硬约束。')
    lines.push('')
  }

  lines.push('## 验收（改完调用）')
  lines.push('')
  lines.push(`    case_fix { action: "verify", ${run.mode === 'dir' ? `dir: ${JSON.stringify(run.target)}` : `case: ${JSON.stringify(cases[0]?.entry.id ?? run.target)}`} }`)
  lines.push('')
  lines.push('通过的标准（`verify` 全绿才算）：')
  lines.push('')
  lines.push(`1. 目标行全部 \`created == llm\`（按这次的状态过滤：${run.statuses.join(' / ')}${run.kinds.length > 0 ? `，kind：${run.kinds.join(' / ')}` : ''}）；`)
  lines.push(`2. 构建通过（${build}）；`)
  lines.push('3. `typescript/cases/tts/run.mjs` 门禁全绿（success 182 个用例）；')
  lines.push(`4. \`code_review\` 在 failOn=${run.failOn} 及更高级别没有 finding；`)
  lines.push('5. 没有改动安全边界之外的文件。')
  lines.push('')

  lines.push('## 下一步')
  lines.push('')
  lines.push('1. 按上面的「要修节点」改实现（只改可写范围）；')
  lines.push('2. 调 `case_fix { action: "verify", ... }` 验收；仍有缺口就继续改；')
  lines.push('3. 如果 `.infer` 的判定本身可疑，或修完想用新判定复核：')
  lines.push(`   \`case_fix { action: "regen", case: ${JSON.stringify(cases[0]?.entry.id ?? '...')} }\`` +
    ' —— 重新生成 `.infer`（会覆盖 llm 列），然后自动跑一遍验收。')
  return lines.join('\n')
}

/**
 * 一个用例一节。
 *
 * @param {string[]} lines
 * @param {{entry: object, loaded: object, targets: object[], unfilled: number, context: object}} item
 * @param {object} config
 * @param {boolean} inline
 * @returns {void}
 */
function renderCase(lines, item, config, inline) {
  const { entry, counts, targets, unfilled, context, source } = item
  lines.push(`## 用例：${entry.id}`)
  lines.push('')
  lines.push(`- 文件：\`${entry.rel}\``)
  lines.push(`- 期望：\`${relativeOf(config.root, entry.inferPath)}\``)
  if (item.available === false) {
    lines.push(`- **对拍读不出来**：${item.error}`)
    lines.push('')
    return
  }
  lines.push(
    `- 当前一致 ${counts.ok}/${counts.total}；目标 ${targets.length} 个；` +
    `unfilled ${unfilled}`,
  )
  if (unfilled > 0) {
    lines.push(
      `- **注意**：有 ${unfilled} 行还是 \`-> llm ?\`（判定没定下来）。这些行不能当规格：` +
      `先 \`case_fix { action: "regen", case: ${JSON.stringify(entry.id)} }\` 重新判定，或用 \`case_infer\` 的 \`decisions\` 定下来。`,
    )
  }
  lines.push('')
  if (targets.length === 0) {
    lines.push('已经一致：这个用例不需要改。')
    lines.push('')
    return
  }

  lines.push('### 源码（逐字表，`⏎` 是换行）')
  lines.push('')
  lines.push(...indent(source.replace(/\r?\n$/, '').split('\n')))
  lines.push('')
  lines.push(...indent(charBlocks(source)))
  lines.push('')

  lines.push(`### 要修的节点（${targets.length} 个）`)
  lines.push('')
  for (const [index, row] of targets.entries()) {
    lines.push(`#### ${index + 1}. ${row.kind}  pos=${row.pos}  src=[${row.start},${row.end})`)
    lines.push('')
    lines.push(`- 状态：\`${row.status}\`（${row.bucket}）`)
    lines.push(`- 目标格：llm=${row.llm}  ${row.llmAt}`)
    lines.push(`- 现在：created=${row.created === null ? '?' : row.created}${row.createdAt === '' ? '（没有记录 / 没有这颗形状）' : `  ${row.createdAt}`}`)
    lines.push(`- 节点 id：\`${row.id}\``)
    if (row.inferLine !== '') {
      lines.push(`- \`.infer\` 原文：\`${row.inferLine.trim()}\``)
    }
    lines.push(`- 怎么改：${HINTS[row.bucket]?.(row) ?? '按缺口修到那一格。'}`)
    const definition = context.definitions.find((entryItem) => entryItem.kind === row.kind)
    if (definition !== undefined && definition.files.length > 0) {
      lines.push(`- 定义：${definition.files.map((file) => `\`${file}\``).join('、')}`)
    }
    lines.push('')
  }

  lines.push('### 实现上下文')
  lines.push('')
  if (context.files.length === 0) {
    lines.push('（没有找到实现文件：这些 kind 的定义不在可写范围里，先确认 kind 名字。）')
    lines.push('')
  }
  for (const file of context.files) {
    const where = file.excerpt
      ? `片段 ${file.windows.length} 段：${file.windows.slice(0, 6).map((window) => `${window.from}–${window.to}`).join('、')}` +
        `${file.windows.length > 6 ? ' …' : ''}`
      : '全文'
    lines.push(`#### \`${file.rel}\`（${where}）`)
    lines.push('')
    if (inline) {
      lines.push(...indent(file.text.replace(/\r?\n$/, '').split('\n')))
      lines.push('')
    } else {
      lines.push(`用 read 打开（${file.reason}${file.excerpt ? '；只看上面列出的行段即可' : ''}）。`)
      lines.push('')
    }
  }
  if (context.skipped.length > 0) {
    lines.push('没有随附的文件：')
    for (const item of context.skipped) {
      lines.push(`- \`${item.path}\`（${item.reason}）`)
    }
    lines.push('')
  }
}

/**
 * @param {string[]} lines
 * @returns {string[]}
 */
function indent(lines) {
  return lines.map((line) => `    ${line}`)
}

/**
 * @param {object} config
 * @returns {string[]}
 */
function editableOf(config) {
  return config.editable.map((dir) => relativeOf(config.root, dir))
}

/**
 * @param {string} root
 * @param {string} file
 * @returns {string}
 */
function relativeOf(root, file) {
  return path.relative(root, file).split(path.sep).join('/')
}
