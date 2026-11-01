/**
 * 把 findings 渲染成一份可读的报告（Markdown），并给出按阶段的计数。
 *
 * 排序就是分级：P0 → P1 → P2 → P3，同一阶段内按文件、行号。计数与排序都在本地做，
 * 模型给的顺序一律不用。
 *
 * @module dsh-code-review/report
 */

import { STAGES, STAGE_INFO } from './rules.mjs'

/**
 * @param {object[]} findings
 * @returns {object[]} 按阶段、文件、行号排好序的副本。
 */
export function sortFindings(findings) {
  const order = new Map(STAGES.map((stage, index) => [stage, index]))
  return [...findings].sort((left, right) => {
    const stage = (order.get(left.level) ?? 9) - (order.get(right.level) ?? 9)
    if (stage !== 0) return stage
    if (left.file !== right.file) return left.file < right.file ? -1 : 1
    return left.line - right.line
  })
}

/**
 * @param {object[]} findings
 * @returns {Record<string, number>} 阶段 → 条数（含 P0..P3 全键）。
 */
export function countByStage(findings) {
  const counts = Object.fromEntries(STAGES.map((stage) => [stage, 0]))
  for (const finding of findings) {
    if (Object.hasOwn(counts, finding.level)) {
      counts[finding.level] += 1
    }
  }
  return counts
}

/**
 * @param {object} options
 * @param {object[]} options.findings
 * @param {{path: string, title: string, total: number, code: number, meta: number}} options.rules
 * @param {string[]} options.stages - 本次审了哪些阶段。
 * @param {string[]} options.files - 审了哪些文件（相对路径）。
 * @param {string[]} options.skipped - 跳过的文件与原因，形如 `path（reason）`。
 * @param {{provider: string, model: string, source: string}} options.model
 * @param {number} options.calls
 * @returns {string} Markdown 报告。
 */
export function renderReport({ findings, rules, stages, files, skipped, model, calls }) {
  const sorted = sortFindings(findings)
  const counts = countByStage(sorted)
  const lines = []

  lines.push('# 代码审查（IMPORTANCE）')
  lines.push('')
  lines.push(`- 规则集：${rules.path}（${rules.total} 条，代码 ${rules.code} / 文档 ${rules.meta}）`)
  lines.push(`- 审查阶段：${stages.join(' / ') || '（无）'}`)
  lines.push(`- 审查范围：${files.length} 个文件${files.length > 0 ? `（${files.join('、')}）` : ''}`)
  if (skipped.length > 0) {
    lines.push(`- 跳过：${skipped.join('；')}`)
  }
  lines.push(`- 模型：${model.provider} / ${model.model}（${model.source === 'config' ? '配置写死' : '宿主默认'}），调用 ${calls} 次`)
  lines.push('')

  if (sorted.length === 0) {
    lines.push('没有 finding。')
    lines.push('')
  }

  for (const stage of STAGES) {
    const items = sorted.filter((finding) => finding.level === stage)
    if (items.length === 0) {
      continue
    }
    const info = STAGE_INFO[stage]
    lines.push(`## ${stage} ${info.label}（${counts[stage]}）`)
    lines.push('')
    for (const finding of items) {
      lines.push(`- **${finding.file}:${finding.line}**　\`${finding.rule}\`　${finding.ruleText}`)
      lines.push(`  - 代码：\`${clip(finding.snippet)}\``)
      if (finding.why !== '') {
        lines.push(`  - 为什么：${finding.why}`)
      }
      if (finding.fix !== '') {
        lines.push(`  - 建议：${finding.fix}`)
      }
    }
    lines.push('')
  }

  const empty = stages.filter((stage) => counts[stage] === 0)
  if (empty.length > 0 && sorted.length > 0) {
    lines.push(`无 finding 的阶段：${empty.join(' / ')}`)
    lines.push('')
  }

  lines.push(`合计：${sorted.length} 条（${STAGES.map((stage) => `${stage} ${counts[stage]}`).join('，')}）`)

  return lines.join('\n')
}

/**
 * @param {string} value
 * @returns {string} 单行、限长，供报告里内联。
 */
function clip(value) {
  const single = String(value).replace(/\s+/g, ' ').trim()
  return single.length <= 100 ? single : `${single.slice(0, 97)}…`
}
