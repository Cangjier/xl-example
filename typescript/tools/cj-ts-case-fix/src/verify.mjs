/**
 * 验收：工作区边界 → 构建 → 回归门禁 → 逐用例对拍 → `code_review`。
 *
 * `case_fix` 不写实现，所以验收必须是**独立**的：它只读工作区、`build/ts` 和 `.infer`，
 * 按同一套口径判断「修好了没有」。`action: "regen"` 复用同一条流水线，只是在对拍之前
 * 插一步「重新生成 `.infer`」。
 *
 * 结论按优先级取第一个失败项：边界 → 构建 → 门禁 → 重新判定 → 缺口 → 审查。
 *
 * @module cj-ts-case-fix/verify
 */

import { selectRows } from './cases.mjs'
import { passes } from './review.mjs'

/**
 * 验收一条（或一目录）用例。
 *
 * @param {object} options
 * @param {object} options.config - 归一化配置。
 * @param {object} options.logger
 * @param {object} options.builder - `createBuilder` 的结果。
 * @param {Function} options.measure - `(entry, options) => loadCase(...)`，测试可注入。
 * @param {object} options.reviewer - `createReviewer` 的结果。
 * @param {object} options.boundary - `createBoundary` 的结果。
 * @param {object[]} options.entries - `resolveTargets` 的 cases。
 * @param {object} options.run - 归一化后的调用参数。
 * @param {object|null} [options.regenerator] - 传了就先重新生成 `.infer`。
 * @returns {Promise<object>} 验收结果（渲染前的结构化数据）。
 */
export async function runVerify({ config, logger, builder, measure, reviewer, boundary, entries, run, regenerator = null }) {
  const boundaryBefore = await boundary.inspect()
  if (boundaryBefore.ok !== true) {
    return {
      ok: false,
      status: 'boundary-failed',
      boundary: boundaryBefore,
      build: null,
      gate: null,
      regen: null,
      cases: [],
      review: skippedReview('安全边界没过，没到审查这一步'),
      changed: boundaryBefore.changes.map((change) => change.path),
      calls: 0,
    }
  }

  const built = await checkBuildAndGate({ builder, logger })
  if (built.ok !== true) {
    return {
      ok: false,
      status: built.stage,
      boundary: boundaryBefore,
      build: built.build,
      gate: built.gate,
      regen: null,
      cases: [],
      review: skippedReview(built.stage === 'build-failed' ? '构建失败，没到审查这一步' : '门禁失败，没到审查这一步'),
      changed: boundaryBefore.changes.map((change) => change.path),
      calls: 0,
    }
  }

  let regen = null
  if (regenerator !== null) {
    regen = await regenerateAll({ regenerator, entries, run, logger })
  }

  const cases = inspectCases({ measure, entries, run })
  const boundaryAfter = regenerator === null ? boundaryBefore : await boundary.inspect()
  const review = await reviewChanged({ config, logger, reviewer, boundary: boundaryAfter, run })

  const casesOk = cases.every((item) =>
    item.available === true && item.remaining.length === 0 && (!run.strictInfer || item.unfilled === 0))
  const regenOk = regen === null || regen.cases.every((item) => item.ok === true)
  const ok = boundaryAfter.ok === true && casesOk && regenOk && review.passed === true

  let status = 'pass'
  if (boundaryAfter.ok !== true) status = 'boundary-failed'
  else if (regen !== null && regen.cases.some((item) => item.available !== true)) status = 'regen-unavailable'
  else if (regen !== null && regen.cases.some((item) => item.needsDecision)) status = 'needs-decision'
  else if (regen !== null && regenOk !== true) status = 'regen-failed'
  else if (cases.some((item) => item.available !== true)) status = 'measure-failed'
  else if (cases.some((item) => !run.strictInfer ? false : item.unfilled > 0)) status = 'needs-infer'
  else if (!casesOk) status = 'gaps'
  else if (review.passed !== true) status = 'review-failed'

  return {
    ok,
    status,
    boundary: boundaryAfter,
    build: built.build,
    gate: built.gate,
    regen,
    cases,
    review,
    changed: [...new Set(boundaryAfter.changes.map((change) => change.path))].sort(),
    calls: (regen?.calls ?? 0) + (review.calls ?? 0),
  }
}

/**
 * 构建 + 门禁。两步都过才算 ok。
 *
 * @param {{builder: object, logger: object}} options
 * @returns {Promise<{ok: boolean, stage: string|null, build: object, gate: object|null}>}
 */
export async function checkBuildAndGate({ builder, logger }) {
  const build = await builder.build()
  if (build.ok !== true) {
    return { ok: false, stage: 'build-failed', build, gate: null }
  }
  const gate = await builder.gate()
  if (gate.ok !== true) {
    return { ok: false, stage: 'gate-failed', build, gate }
  }
  logger.info('case-fix: 构建与门禁都通过')
  return { ok: true, stage: null, build, gate }
}

/**
 * 逐用例对拍：`remaining` 就是这次过滤下还没修好的行。
 *
 * @param {object} options
 * @param {Function} options.measure
 * @param {object[]} options.entries
 * @param {object} options.run
 * @returns {object[]}
 */
export function inspectCases({ measure, entries, run }) {
  return entries.map((entry) => {
    const loaded = measure(entry, { fresh: true })
    if (loaded.available !== true) {
      return {
        entry,
        available: false,
        error: loaded.error,
        counts: null,
        remaining: [],
        unfilled: 0,
        stale: [],
      }
    }
    const remaining = selectRows(loaded.rows, { statuses: run.statuses, kinds: run.kinds })
    return {
      entry,
      available: true,
      error: null,
      counts: loaded.counts,
      remaining,
      unfilled: loaded.counts.unfilled,
      stale: loaded.stale,
    }
  })
}

/**
 * 审查改过的实现文件（`boundary.code`）。
 *
 * @param {object} options
 * @returns {Promise<object>}
 */
async function reviewChanged({ config, logger, reviewer, boundary, run }) {
  if (run.review !== true) {
    return skippedReview('review: false，没审')
  }
  const paths = boundary.code
  if (paths.length === 0) {
    return skippedReview('没有改过可写范围内的实现文件')
  }
  const result = await reviewer.run({ paths })
  const verdict = passes(result, run.failOn)
  logger.info(`case-fix: 审查 ${verdict.passed ? '通过' : '不通过'}（${verdict.reason}）`)
  return {
    skipped: false,
    reason: verdict.reason,
    passed: verdict.passed,
    available: result.available === true,
    paths,
    calls: result.calls ?? 0,
    counts: result.counts,
    findings: result.findings,
    report: result.report,
  }
}

/**
 * 重新判定每个用例的 `.infer`（会覆盖 llm 列）。
 *
 * @param {object} options
 * @returns {Promise<{cases: object[], calls: number}>}
 */
async function regenerateAll({ regenerator, entries, run, logger }) {
  const cases = []
  let calls = 0
  for (const entry of entries) {
    if (run.decisions !== null && entries.length > 1) {
      cases.push({
        entry,
        available: false,
        ok: false,
        needsDecision: false,
        pending: [],
        calls: 0,
        error: 'decisions 只能配合单个 case 使用',
      })
      continue
    }
    const result = await regenerator.regenerate(entry, {
      runs: run.runs,
      decisions: run.decisions,
    })
    calls += result.calls ?? 0
    cases.push({ entry, ...result })
    logger.info(`case-fix: 重新判定 ${entry.id} → ${result.ok ? 'ok' : result.error ?? result.status ?? 'failed'}`)
  }
  return { cases, calls }
}

/**
 * @param {string} reason
 * @returns {object}
 */
function skippedReview(reason) {
  return { skipped: true, reason, passed: true, available: true, paths: [], calls: 0, counts: null, findings: [], report: null }
}

/**
 * 人读的验收报告。
 *
 * @param {object} result - `runVerify` 的返回值。
 * @param {object} run - 归一化后的调用参数。
 * @returns {string}
 */
export function renderVerify(result, run) {
  const lines = []
  const action = run.action === 'regen' ? 'regen' : 'verify'
  lines.push(`case_fix ${action}：${result.ok ? '通过' : '不通过'}（status=${result.status}）`)
  lines.push('')

  const boundary = result.boundary
  if (boundary.available === false) {
    lines.push(`边界：检查不可用 —— ${boundary.error}`)
  } else if (boundary.skipped === true) {
    lines.push('边界：没开检查（boundary: false）')
  } else {
    lines.push(
      `边界：${boundary.ok ? 'ok' : '越界'}（改动 ${boundary.changes.length} 个` +
      `${boundary.code.length > 0 ? `，实现 ${boundary.code.length}` : ''}` +
      `${boundary.infers.length > 0 ? `，.infer ${boundary.infers.length}` : ''}）`,
    )
    for (const violation of boundary.violations) {
      lines.push(`  ✗ ${violation.path}：${violation.reason}`)
    }
  }

  if (result.build !== null) {
    const steps = Array.isArray(result.build.steps) ? result.build.steps : []
    lines.push(`构建：${result.build.ok ? 'ok' : '失败'}（${steps.map((step) => `${step.name} ${step.ms}ms`).join('，') || '—'}）`)
    for (const error of (result.build.errors ?? []).slice(0, 6)) {
      lines.push(`  ${error}`)
    }
  }
  if (result.gate !== null) {
    lines.push(`门禁：${result.gate.skipped ? '跳过' : result.gate.ok ? 'ok' : '失败'}`)
    if (!result.gate.ok) {
      for (const line of tailLines(result.gate.output)) {
        lines.push(`  ${line}`)
      }
    }
  }

  if (result.regen !== null) {
    lines.push('')
    lines.push(`重新判定：${result.regen.cases.length} 个用例，${result.regen.calls} 次模型调用`)
    for (const item of result.regen.cases) {
      lines.push(
        `  - ${item.entry.id}：${item.ok ? 'ok' : item.error ?? item.status ?? 'failed'}` +
        `${item.nodes === null || item.nodes === undefined ? '' : `（节点 ${item.nodes}` +
          `${item.pending.length > 0 ? `，${item.pending.length} 个待决策` : ''}）`}`,
      )
      for (const pending of item.pending.slice(0, 5)) {
        lines.push(`      待决策 ${pending.id}：${(pending.candidates ?? []).map((candidate) => candidate.char).join(' / ')}`)
      }
      if (typeof item.text === 'string') {
        for (const line of item.text.split('\n').slice(0, 6)) {
          lines.push(`      ${line}`)
        }
      }
    }
  }

  lines.push('')
  if (result.cases.length === 0) {
    lines.push('用例：没走到对拍这一步')
  } else {
    lines.push(`用例（${result.cases.length} 个）：`)
    for (const item of result.cases) {
      if (item.available !== true) {
        lines.push(`  - ${item.entry.id}：对拍读不出来（${item.error}）`)
        continue
      }
      const counts = item.counts
      const verdict = item.remaining.length === 0 && (!run.strictInfer || item.unfilled === 0) ? '通过' : '还差'
      lines.push(
        `  - ${item.entry.id}：一致 ${counts.ok}/${counts.total}，剩 ${item.remaining.length}` +
        `${item.unfilled > 0 ? `，unfilled ${item.unfilled}` : ''} → ${verdict}`,
      )
      for (const row of item.remaining.slice(0, 8)) {
        lines.push(`      还差 ${row.kind} pos=${row.pos}  created=${row.created === null ? '?' : row.created} → llm=${row.llm}（${row.status}）`)
      }
      if (item.stale.length > 0) {
        lines.push(`      stale（.infer 里有、.ast 里没有）：${item.stale.slice(0, 4).join('、')}`)
      }
    }
  }

  lines.push('')
  const review = result.review
  if (review.skipped) {
    lines.push(`审查：没跑（${review.reason}）`)
  } else {
    const counts = review.counts
    lines.push(
      `审查：${review.passed ? '通过' : '不通过'}` +
      (counts === null ? '' : `（P0 ${counts.P0} / P1 ${counts.P1} / P2 ${counts.P2} / P3 ${counts.P3}）`) +
      `，failOn=${run.failOn}，审了 ${review.paths.length} 个文件`,
    )
    for (const finding of (review.findings ?? []).slice(0, 8)) {
      lines.push(`  ${finding.level} ${finding.rule} ${finding.file}:${finding.line} — ${finding.why}`)
    }
  }

  lines.push('')
  lines.push(`下一个动作：${nextStep(result, run)}`)
  return lines.join('\n')
}

/**
 * @param {object} result
 * @param {object} run
 * @returns {string}
 */
function nextStep(result, run) {
  const single = run.mode === 'dir' ? `dir: ${JSON.stringify(run.target)}` : `case: ${JSON.stringify(run.target)}`
  switch (result.status) {
    case 'pass':
      return '完成了。想用新判定复核就再跑一次 regen。'
    case 'boundary-failed':
      return '把越界的改动挪出 core / 用例 / 文档，再重新 verify。'
    case 'build-failed':
      return '先修构建错误（tsc 的报错就是定位），再 verify。'
    case 'gate-failed':
      return '这个改动破坏了别的用例：回滚或换一种改法，再 verify。'
    case 'needs-decision':
      return `判定有分歧：用 case_infer 的 decisions 定下来（case_fix { action: "regen", ${single}, decisions: {...} }）。`
    case 'needs-infer':
      return `.infer 还有 -> llm ?：先 regen（case_fix { action: "regen", ${single} }）。`
    case 'measure-failed':
      return 'build/ts 读不出来：先 npm run build（或 xl_build + tsc）。'
    case 'regen-failed':
      return '重新判定失败：看上面的模型报错；必要时把 runs 降到 1 再试。'
    case 'review-failed':
      return '审查有 finding：按 finding 改实现（只改可写范围），再 verify。'
    case 'gaps':
      return '还有缺口：接着改实现，再 verify。'
    default:
      return '看上面的失败项。'
  }
}

/**
 * @param {string} output
 * @returns {string[]}
 */
function tailLines(output) {
  const lines = String(output).replace(/\r\n?/g, '\n').split('\n').filter((line) => line.trim() !== '')
  return lines.slice(-20)
}
