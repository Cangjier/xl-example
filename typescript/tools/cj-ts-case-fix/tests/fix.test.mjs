/**
 * case_fix 的离线测试：真解析 / 真规则，假的边界、构建、对拍、审查与重新判定。
 *
 * 覆盖四层：
 * 1. 配置与安全边界：`core` 不能进 `editable`，计划/验收都按同一套边界说话；
 * 2. 用例解析：一个用例 / 一个目录 / 状态与 kind 过滤（真 `.infer` + 真 `build/ts`）；
 * 3. 任务书：缺口、实现上下文、验收标准、落盘；
 * 4. 验收与重新判定：通过、缺口、越界、审查不过、判定有分歧，以及「构建在前、判定在后」的顺序。
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { normalizeConfig } from '../src/config.mjs'
import {
  describeRows,
  loadCase,
  resolveTargets,
  selectRows,
  summarizeRows,
} from '../src/cases.mjs'
import { parseGitStatus } from '../src/boundary.mjs'
import { gatherContext } from '../src/context.mjs'
import { runFix } from '../src/fix.mjs'
import { createFixTool } from '../src/tools/fix.mjs'
import { createReviewer, passes } from '../src/review.mjs'
import { parserAvailable } from '../../shape-actual.mjs'

/** 一个按顺序回放固定回答的假模型。 */
function fakeLlm(answers) {
  let index = 0
  const calls = []
  return {
    calls,
    stream(request) {
      calls.push(request)
      const text = answers[Math.min(index, answers.length - 1)]
      index++
      return (async function* () {
        yield { type: 'text-delta', text }
        yield { type: 'finish', reason: { kind: 'stop' } }
      })()
    },
  }
}

function fakeContext(llm) {
  return {
    get(name) {
      if (name === 'llm') return llm
      if (name === 'agentDefaultModel') return { currentSelection: () => ({ provider: 'fake', model: 'fake-1' }) }
      return undefined
    },
  }
}

function logger() {
  return { info() {}, error() {}, warn() {} }
}

/** 一个够用的临时仓库：用例目录 + 可写目录 + 规则文档。 */
function makeWorkspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'case-fix-'))
  const caseDir = path.join(root, 'typescript', 'cases', 'tts', 'success', 'types')
  fs.mkdirSync(caseDir, { recursive: true })
  fs.mkdirSync(path.join(root, 'shapes'), { recursive: true })
  fs.mkdirSync(path.join(root, 'docs'), { recursive: true })
  fs.writeFileSync(path.join(root, 'docs', 'IMPORTANCE.md'), '# IMPORTANCE\nshape 禁止覆盖 ComputePossibleShapes\n', 'utf8')
  const ts = path.join(caseDir, 'x.ts')
  fs.writeFileSync(ts, 'let x = 1\n', 'utf8')
  fs.writeFileSync(ts.replace(/\.ts$/, '.infer'), '# 假 .infer（对拍被注入，不解析它）\n', 'utf8')
  const shape = path.join(root, 'shapes', 'x-shape.xl.md')
  fs.writeFileSync(shape, [
    '# class XShape',
    '',
    '## method Build:()=>void',
    '',
    '```ts',
    'const CREATE_AT = 6;',
    '```',
    '',
  ].join('\n'), 'utf8')
  return { root, ts, shape }
}

/** 一行「不一致」的对拍结果。 */
function badRows() {
  return [{
    id: 'X|0|0',
    info: { kind: 'X', pos: 0, start: 0, end: 9 },
    llm: 16,
    created: 6,
    delta: 10,
    status: 'late +10',
  }]
}

/** 一行「一致」的对拍结果。 */
function okRows() {
  return [{
    id: 'X|0|0',
    info: { kind: 'X', pos: 0, start: 0, end: 9 },
    llm: 16,
    created: 16,
    delta: 0,
    status: 'ok',
  }]
}

/**
 * 一份对拍现场：读 entry 的源码与 `.infer`，行由调用方给。
 *
 * @param {object} entry
 * @param {object[]} rows
 * @param {number} [unfilled]
 * @returns {object}
 */
function stateFor(entry, rows, unfilled = 0) {
  return {
    available: true,
    error: null,
    entry,
    hasInfer: true,
    source: fs.readFileSync(entry.file, 'utf8'),
    name: path.basename(entry.file),
    inferText: fs.readFileSync(entry.inferPath, 'utf8'),
    actual: { created: new Map() },
    rows,
    stale: [],
    counts: { ...summarizeRows(rows), unfilled },
  }
}

/** 假的对拍：`rows()` 决定这一轮看到什么。 */
function fakeMeasure(entry, rows) {
  return () => stateFor(entry, rows())
}

/** 假的边界。 */
function fakeBoundary({ ok = true, code = [], violations = [], changes = [], available = true } = {}) {
  const state = {
    available,
    skipped: false,
    ok,
    error: available ? null : 'fake git 不可用',
    changes: changes.length > 0 ? changes : code.map((file) => ({ status: ' M', path: file })),
    violations,
    infers: [],
    code,
  }
  return { inspect: async () => state, describe: () => 'fake boundary' }
}

/** 假的构建器；`order` 记录调用顺序，用来断言「先构建、后判定」。 */
function fakeBuilder({ buildOk = true, gateOk = true, order = [] } = {}) {
  return {
    describe: () => 'fake build',
    async build() {
      order.push('build')
      return { ok: buildOk, steps: [{ name: 'fake', ms: 1 }], errors: buildOk ? [] : ['fake 构建失败'] }
    },
    async gate() {
      order.push('gate')
      return { ok: gateOk, skipped: false, output: gateOk ? '' : 'fake 门禁失败', ms: 1 }
    },
  }
}

/** 假的审查。 */
function fakeReviewer({ findings = [], calls = 1 } = {}) {
  return {
    describe: () => 'fake review',
    async run({ paths }) {
      return {
        available: true,
        source: 'fake',
        error: null,
        counts: { P0: findings.filter((item) => item.level === 'P0').length, P1: 0, P2: 0, P3: 0 },
        blocking: findings.filter((item) => item.level === 'P0').length,
        findings,
        report: null,
        calls,
        files: paths,
        skipped: [],
      }
    },
  }
}

/** 假的重新判定：`write()` 决定重写后的 `.infer`。 */
function fakeRegenerator({ ok = true, needsDecision = false, calls = 3, write = null, order = [] } = {}) {
  return {
    describe: () => 'fake regen',
    async regenerate(entry) {
      order.push('regen')
      if (typeof write === 'function') {
        write(entry)
      }
      return {
        available: true,
        source: 'fake',
        ok,
        needsDecision,
        status: needsDecision ? 'needs-decision' : 'written',
        file: entry.inferPath,
        nodes: 1,
        pending: needsDecision ? [{ id: 'X|0|0', candidates: [{ char: 16, count: 2 }, { char: 17, count: 1 }] }] : [],
        calls,
        model: { provider: 'fake', model: 'fake-1' },
        error: null,
        text: 'fake regen',
      }
    },
  }
}

test('config：默认 shapes 可写，core / 用例 / 文档永远进不来', () => {
  const config = normalizeConfig({})
  assert.deepEqual(config.editable.map((dir) => path.relative(config.root, dir).split(path.sep).join('/')), ['typescript/shapes'])
  assert.equal(config.runs, 3)
  assert.equal(config.boundary, true)
  assert.equal(config.review, true)
  assert.equal(config.failOn, 'P0')
  assert.equal(config.gate, true)

  assert.throws(() => normalizeConfig({ editable: ['core'] }), /安全边界/)
  assert.throws(() => normalizeConfig({ editable: ['core/syntax'] }), /安全边界/)
  assert.throws(() => normalizeConfig({ editable: ['typescript/cases'] }), /安全边界/)
  assert.throws(() => normalizeConfig({ editable: ['docs'] }), /安全边界/)
  assert.throws(() => normalizeConfig({ editable: ['..'] }), /仓库内/)
  assert.throws(() => normalizeConfig({ provider: 'x' }), /同时写或同时留空/)
  assert.throws(() => normalizeConfig({ runs: 0 }), /runs/)
  assert.throws(() => normalizeConfig({ failOn: 'P9' }), /failOn/)
  assert.throws(() => normalizeConfig({ boundary: 'yes' }), /boundary/)
})

test('parseGitStatus：M / ?? / 重命名（-z 格式）', () => {
  const output = [
    ' M typescript/shapes/a.xl.md',
    '?? core/syntax/new.xl.md',
    'R  typescript/shapes/b.xl.md',
    'typescript/shapes/old.xl.md',
    'A  typescript/cases/tts/success/x.ts',
    '',
  ].join('\0')
  assert.deepEqual(parseGitStatus(output), [
    { status: ' M', path: 'typescript/shapes/a.xl.md' },
    { status: '??', path: 'core/syntax/new.xl.md' },
    { status: 'R ', path: 'typescript/shapes/b.xl.md' },
    { status: 'A ', path: 'typescript/cases/tts/success/x.ts' },
  ])
})

test('resolveTargets：case / dir / 互斥 / 没有 .infer', () => {
  const { root } = makeWorkspace()
  const single = resolveTargets(root, { case: 'success/types/x' })
  assert.equal(single.mode, 'case')
  assert.equal(single.cases.length, 1)
  assert.equal(single.cases[0].id, 'success/types/x')

  const byPath = resolveTargets(root, { case: single.cases[0].file })
  assert.equal(byPath.cases[0].id, 'success/types/x')

  const byInfer = resolveTargets(root, { case: single.cases[0].inferPath })
  assert.equal(byInfer.cases[0].file, single.cases[0].file)

  const dir = resolveTargets(root, { dir: 'success' })
  assert.equal(dir.mode, 'dir')
  assert.equal(dir.cases.length, 1)

  fs.writeFileSync(path.join(root, 'typescript', 'cases', 'tts', 'success', 'y.ts'), 'let y = 2\n', 'utf8')
  const withSkip = resolveTargets(root, { dir: 'success' })
  assert.equal(withSkip.cases.length, 1)
  assert.equal(withSkip.skipped.length, 1)
  assert.match(withSkip.skipped[0].reason, /没有 \.infer/)

  assert.throws(() => resolveTargets(root, {}), /二选一/)
  assert.throws(() => resolveTargets(root, { case: 'success/types/x', dir: 'success' }), /只能给一个/)
  assert.throws(() => resolveTargets(root, { case: 'success/types/nope' }), /找不到用例/)
  assert.throws(() => resolveTargets(root, { case: path.join(root, 'shapes', 'x-shape.xl.md') }), /必须落在/)
})

test('loadCase / selectRows：真 .infer 的缺口与筛选', (t) => {
  if (!parserAvailable()) {
    t.skip('build/ts 不存在：先跑 npm run build')
    return
  }
  const root = process.cwd()
  const entry = resolveTargets(root, { case: 'success/types/alias-array' }).cases[0]
  const loaded = loadCase(root, entry, { fresh: true })
  assert.equal(loaded.available, true)
  assert.equal(loaded.counts.total, 5)
  assert.equal(loaded.counts.ok, 2)
  assert.equal(loaded.counts.mismatches, 3)

  const all = selectRows(loaded.rows, {})
  assert.deepEqual(all.map((row) => row.kind).sort(), ['ArrayType', 'StringKeyword', 'TypeAliasDeclaration'])

  const late = selectRows(loaded.rows, { statuses: ['late'] })
  assert.equal(late.length, 1)
  assert.equal(late[0].kind, 'TypeAliasDeclaration')
  assert.equal(late[0].delta, 2)

  const onlyArray = selectRows(loaded.rows, { kinds: ['ArrayType'] })
  assert.equal(onlyArray.length, 1)
  assert.equal(onlyArray[0].status, 'no-created')

  const described = describeRows(loaded, late)
  assert.match(described[0].llmAt, /【␣:8】/)
  assert.match(described[0].inferLine, /TypeAliasDeclaration/)
})

test('gatherContext：定义优先、include、片段是原文切片', () => {
  const { root, shape } = makeWorkspace()
  const config = normalizeConfig({ root, editable: ['shapes'], maxContextFiles: 3 })
  const gathered = gatherContext({ root, editable: config.editable, kinds: ['X'], config })
  assert.equal(gathered.files.length, 1)
  assert.equal(gathered.files[0].rel, 'shapes/x-shape.xl.md')
  assert.equal(gathered.files[0].excerpt, false)
  assert.deepEqual(gathered.definitions, [{ kind: 'X', files: ['shapes/x-shape.xl.md'] }])

  const big = Array.from({ length: 300 }, (_, index) => index === 150 ? 'class XShape extends TypeShape' : `// filler ${index}`)
  fs.writeFileSync(shape, `${big.join('\n')}\n`, 'utf8')
  const small = normalizeConfig({ root, editable: ['shapes'], maxFileBytes: 2000, excerptLines: 40 })
  const sliced = gatherContext({ root, editable: small.editable, kinds: ['X'], config: small })
  assert.equal(sliced.files.length, 1)
  const file = sliced.files[0]
  assert.equal(file.excerpt, true)
  assert.ok(file.windows.length >= 1)
  const first = file.windows[0]
  const original = fs.readFileSync(shape, 'utf8').split('\n')
  assert.equal(file.text.split('\n')[0], original[first.from - 1])

  const included = gatherContext({
    root,
    editable: small.editable,
    kinds: ['X'],
    config: small,
    include: ['shapes/x-shape.xl.md'],
  })
  assert.equal(included.files[0].rel, 'shapes/x-shape.xl.md')
})

test('plan：任务书有缺口、上下文、边界与验收，taskPath 落盘', async () => {
  const { root } = makeWorkspace()
  const entry = resolveTargets(root, { case: 'success/types/x' }).cases[0]
  const config = normalizeConfig({ root, editable: ['shapes'] })
  const plain = await runFix({
    ctx: fakeContext(fakeLlm(['{}'])),
    config,
    logger: logger(),
    args: { action: 'plan', case: 'success/types/x' },
    deps: {
      measure: fakeMeasure(entry, () => badRows()),
      boundary: fakeBoundary({ code: [] }),
    },
  })

  assert.equal(plain.ok, true)
  assert.equal(plain.action, 'plan')
  assert.equal(plain.status, 'planned')
  assert.equal(plain.cases.length, 1)
  assert.equal(plain.cases[0].targets.length, 1)
  assert.equal(plain.cases[0].targets[0].kind, 'X')
  assert.equal(plain.cases[0].files.length, 1)
  assert.equal(plain.cases[0].files[0].file, 'shapes/x-shape.xl.md')
  assert.match(plain.text, /# case_fix 任务/)
  assert.match(plain.text, /一律禁止修改/)
  assert.match(plain.text, /case_fix \{ action: "verify"/)
  assert.match(plain.text, /llm 那一格比 created 晚 10 格/)
  assert.match(plain.text, /shapes\/x-shape\.xl\.md/)
  // 默认只给路径与行段，正文由 DSH 自己 read。
  assert.equal(plain.text.includes('const CREATE_AT = 6;'), false)
  assert.equal(plain.taskPath, null)

  // taskPath 落盘时是自包含版本。
  const withTask = await runFix({
    ctx: fakeContext(fakeLlm(['{}'])),
    config,
    logger: logger(),
    args: { action: 'plan', case: 'success/types/x', taskPath: 'tmp/plan.md' },
    deps: { measure: fakeMeasure(entry, () => badRows()), boundary: fakeBoundary() },
  })
  const written = path.join(root, 'tmp', 'plan.md')
  assert.equal(withTask.taskPath, written)
  assert.equal(fs.existsSync(written), true)
  assert.match(fs.readFileSync(written, 'utf8'), /# case_fix 任务/)
  assert.match(fs.readFileSync(written, 'utf8'), /const CREATE_AT = 6;/)

  // inlineContext: true 也把正文与规则放进返回值。
  const inlined = await runFix({
    ctx: fakeContext(fakeLlm(['{}'])),
    config,
    logger: logger(),
    args: { action: 'plan', case: 'success/types/x', inlineContext: true },
    deps: { measure: fakeMeasure(entry, () => badRows()), boundary: fakeBoundary() },
  })
  assert.equal(inlined.text.includes('const CREATE_AT = 6;'), true)
  assert.match(inlined.text, /shape 禁止覆盖 ComputePossibleShapes/)

  await assert.rejects(
    () => runFix({
      ctx: fakeContext(fakeLlm(['{}'])),
      config,
      logger: logger(),
      args: { action: 'plan', case: 'success/types/x', taskPath: '../outside.md' },
      deps: { measure: fakeMeasure(entry, () => badRows()), boundary: fakeBoundary() },
    }),
    /taskPath 必须落在仓库内/,
  )
})

test('plan：已经一致的用例不要求改，unfilled 会提醒先 regen', async () => {
  const { root } = makeWorkspace()
  const entry = resolveTargets(root, { case: 'success/types/x' }).cases[0]
  const config = normalizeConfig({ root, editable: ['shapes'] })

  const clean = await runFix({
    ctx: fakeContext(fakeLlm(['{}'])),
    config,
    logger: logger(),
    args: { action: 'plan', case: 'success/types/x' },
    deps: { measure: fakeMeasure(entry, () => okRows()), boundary: fakeBoundary() },
  })
  assert.equal(clean.status, 'clean')
  assert.equal(clean.cases[0].targets.length, 0)
  assert.match(clean.text, /已经一致/)

  const unfilled = await runFix({
    ctx: fakeContext(fakeLlm(['{}'])),
    config,
    logger: logger(),
    args: { action: 'plan', case: 'success/types/x' },
    deps: {
      measure: () => stateFor(entry, [], 2),
      boundary: fakeBoundary(),
    },
  })
  assert.equal(unfilled.needsInfer[0].case, 'success/types/x')
  assert.match(unfilled.text, /regen/)
})

test('verify：全绿才 ok；缺口、越界、审查不过各有 status', async () => {
  const { root } = makeWorkspace()
  const entry = resolveTargets(root, { case: 'success/types/x' }).cases[0]
  const config = normalizeConfig({ root, editable: ['shapes'] })

  const passing = await runFix({
    ctx: fakeContext(fakeLlm(['{}'])),
    config,
    logger: logger(),
    args: { action: 'verify', case: 'success/types/x' },
    deps: {
      measure: fakeMeasure(entry, () => okRows()),
      build: fakeBuilder(),
      boundary: fakeBoundary({ code: ['shapes/x-shape.xl.md'] }),
      review: fakeReviewer(),
    },
  })
  assert.equal(passing.ok, true)
  assert.equal(passing.status, 'pass')
  assert.equal(passing.review.passed, true)
  assert.deepEqual(passing.review.paths, ['shapes/x-shape.xl.md'])
  assert.match(passing.text, /case_fix verify：通过/)

  const gaps = await runFix({
    ctx: fakeContext(fakeLlm(['{}'])),
    config,
    logger: logger(),
    args: { action: 'verify', case: 'success/types/x' },
    deps: {
      measure: fakeMeasure(entry, () => badRows()),
      build: fakeBuilder(),
      boundary: fakeBoundary({ code: ['shapes/x-shape.xl.md'] }),
      review: fakeReviewer(),
    },
  })
  assert.equal(gaps.ok, false)
  assert.equal(gaps.status, 'gaps')
  assert.equal(gaps.cases[0].remaining.length, 1)
  assert.match(gaps.text, /还差 X pos=0/)

  let built = false
  const violation = await runFix({
    ctx: fakeContext(fakeLlm(['{}'])),
    config,
    logger: logger(),
    args: { action: 'verify', case: 'success/types/x' },
    deps: {
      measure: fakeMeasure(entry, () => okRows()),
      build: {
        describe: () => 'fake',
        async build() { built = true; return { ok: true, steps: [], errors: [] } },
        async gate() { return { ok: true, skipped: false, output: '', ms: 0 } },
      },
      boundary: fakeBoundary({
        ok: false,
        violations: [{ path: 'core/syntax/x.xl.md', reason: 'core 禁止修改（安全边界）' }],
      }),
      review: fakeReviewer(),
    },
  })
  assert.equal(violation.ok, false)
  assert.equal(violation.status, 'boundary-failed')
  assert.equal(built, false)
  assert.match(violation.text, /core\/syntax\/x\.xl\.md/)

  const reviewFailed = await runFix({
    ctx: fakeContext(fakeLlm(['{}'])),
    config,
    logger: logger(),
    args: { action: 'verify', case: 'success/types/x' },
    deps: {
      measure: fakeMeasure(entry, () => okRows()),
      build: fakeBuilder(),
      boundary: fakeBoundary({ code: ['shapes/x-shape.xl.md'] }),
      review: fakeReviewer({ findings: [{ level: 'P0', rule: 'R1', file: 'shapes/x-shape.xl.md', line: 1, snippet: 'x', why: 'w', fix: 'f' }] }),
    },
  })
  assert.equal(reviewFailed.ok, false)
  assert.equal(reviewFailed.status, 'review-failed')
})

test('verify：构建失败 / 门禁失败分别是 build-failed、gate-failed', async () => {
  const { root } = makeWorkspace()
  const entry = resolveTargets(root, { case: 'success/types/x' }).cases[0]
  const config = normalizeConfig({ root, editable: ['shapes'] })

  const buildFailed = await runFix({
    ctx: fakeContext(fakeLlm(['{}'])),
    config,
    logger: logger(),
    args: { action: 'verify', case: 'success/types/x' },
    deps: { measure: fakeMeasure(entry, () => okRows()), build: fakeBuilder({ buildOk: false }), boundary: fakeBoundary(), review: fakeReviewer() },
  })
  assert.equal(buildFailed.status, 'build-failed')
  assert.match(buildFailed.text, /fake 构建失败/)

  const gateFailed = await runFix({
    ctx: fakeContext(fakeLlm(['{}'])),
    config,
    logger: logger(),
    args: { action: 'verify', case: 'success/types/x' },
    deps: { measure: fakeMeasure(entry, () => okRows()), build: fakeBuilder({ gateOk: false }), boundary: fakeBoundary(), review: fakeReviewer() },
  })
  assert.equal(gateFailed.status, 'gate-failed')
  assert.match(gateFailed.text, /fake 门禁失败/)
})

test('regen：先构建/门禁，再重新判定，然后用新 .infer 验收', async () => {
  const { root } = makeWorkspace()
  const entry = resolveTargets(root, { case: 'success/types/x' }).cases[0]
  const config = normalizeConfig({ root, editable: ['shapes'] })
  const order = []
  let fresh = false

  const result = await runFix({
    ctx: fakeContext(fakeLlm(['{}'])),
    config,
    logger: logger(),
    args: { action: 'regen', case: 'success/types/x', runs: 2 },
    deps: {
      build: fakeBuilder({ order }),
      measure: fakeMeasure(entry, () => (fresh ? okRows() : badRows())),
      boundary: fakeBoundary({ code: ['shapes/x-shape.xl.md'] }),
      review: fakeReviewer(),
      regen: fakeRegenerator({ calls: 2, order, write: () => { fresh = true } }),
    },
  })

  assert.deepEqual(order, ['build', 'gate', 'regen'])
  assert.equal(result.ok, true)
  assert.equal(result.status, 'pass')
  assert.equal(result.regen.cases.length, 1)
  assert.equal(result.regen.cases[0].ok, true)
  assert.equal(result.calls, 2 + 1)
  assert.equal(result.action, 'regen')
  assert.match(result.text, /重新判定：1 个用例，2 次模型调用/)
})

test('regen：判定有分歧时报 needs-decision，不猜', async () => {
  const { root } = makeWorkspace()
  const entry = resolveTargets(root, { case: 'success/types/x' }).cases[0]
  const config = normalizeConfig({ root, editable: ['shapes'] })

  const result = await runFix({
    ctx: fakeContext(fakeLlm(['{}'])),
    config,
    logger: logger(),
    args: { action: 'regen', case: 'success/types/x' },
    deps: {
      build: fakeBuilder(),
      measure: fakeMeasure(entry, () => badRows()),
      boundary: fakeBoundary(),
      review: fakeReviewer(),
      regen: fakeRegenerator({ needsDecision: true, ok: false }),
    },
  })
  assert.equal(result.ok, false)
  assert.equal(result.status, 'needs-decision')
  assert.match(result.text, /待决策 X\|0\|0/)
})

test('regen：decisions 只能配单个 case', async () => {
  const { root } = makeWorkspace()
  fs.copyFileSync(
    path.join(root, 'typescript', 'cases', 'tts', 'success', 'types', 'x.infer'),
    path.join(root, 'typescript', 'cases', 'tts', 'success', 'types', 'y.infer'),
  )
  fs.writeFileSync(path.join(root, 'typescript', 'cases', 'tts', 'success', 'types', 'y.ts'), 'let y = 2\n', 'utf8')
  const config = normalizeConfig({ root, editable: ['shapes'] })

  const result = await runFix({
    ctx: fakeContext(fakeLlm(['{}'])),
    config,
    logger: logger(),
    args: { action: 'regen', dir: 'success/types', decisions: { 'X|0|0': 16 } },
    deps: {
      build: fakeBuilder(),
      measure: (entry) => stateFor(entry, okRows()),
      boundary: fakeBoundary(),
      review: fakeReviewer(),
      regen: fakeRegenerator(),
    },
  })
  assert.equal(result.ok, false)
  assert.equal(result.regen.cases.every((item) => item.available === false), true)
  assert.match(result.regen.cases[0].error, /单个 case/)
})

test('审查：优先用注册的 code_review，没有就 import 仓库里的同一份实现', async () => {
  const { root } = makeWorkspace()
  const config = normalizeConfig({ root, editable: ['shapes'], retries: 0 })

  const toolReview = {
    async execute(args) {
      assert.deepEqual(args.paths, ['shapes/x-shape.xl.md'])
      return {
        ok: true,
        counts: { P0: 1, P1: 0, P2: 0, P3: 0 },
        findings: [{ level: 'P0', rule: 'R1', file: 'shapes/x-shape.xl.md', line: 1, snippet: 'x', why: 'w', fix: 'f' }],
        calls: 1,
        files: ['shapes/x-shape.xl.md'],
      }
    },
  }
  const base = fakeContext(fakeLlm(['[]']))
  const toolCtx = {
    get(name) {
      if (name === 'tools') {
        return { get: (id) => (id === 'code_review' ? toolReview : undefined) }
      }
      return base.get(name)
    },
  }
  const viaTool = await createReviewer({ ctx: toolCtx, config, logger: logger() }).run({ paths: ['shapes/x-shape.xl.md'] })
  assert.equal(viaTool.available, true)
  assert.equal(viaTool.source, 'tool')
  assert.equal(viaTool.blocking, 1)
  assert.equal(passes(viaTool, 'P0').passed, false)

  const llm = fakeLlm(['[]'])
  const viaSibling = await createReviewer({ ctx: fakeContext(llm), config, logger: logger() }).run({ paths: ['shapes/x-shape.xl.md'] })
  assert.equal(viaSibling.available, true)
  assert.equal(viaSibling.source, 'sibling')
  assert.deepEqual(viaSibling.findings, [])
  assert.equal(passes(viaSibling, 'P0').passed, true)
  assert.ok(llm.calls.length >= 1)
})

test('真仓库 plan：只读、0 次模型调用、能给出缺口与边界', async (t) => {
  if (!parserAvailable()) {
    t.skip('build/ts 不存在：先跑 npm run build')
    return
  }
  const before = fs.readFileSync('typescript/cases/tts/success/types/alias-array.ts', 'utf8')
  const result = await runFix({
    ctx: fakeContext(fakeLlm(['{}'])),
    config: normalizeConfig({}),
    logger: logger(),
    args: { action: 'plan', case: 'success/types/alias-array' },
  })

  assert.equal(result.ok, true)
  assert.equal(result.action, 'plan')
  assert.equal(result.cases[0].targets.length, 3)
  assert.ok(result.cases[0].files.length >= 1)
  assert.equal(result.boundary.ok, true)
  assert.equal(result.calls, 0)
  assert.match(result.text, /typescript\/shapes\/types\/type-node-shapes\.xl\.md/)
  assert.equal(fs.readFileSync('typescript/cases/tts/success/types/alias-array.ts', 'utf8'), before)
})

test('工具定义：action、参数与渲染', () => {
  const tool = createFixTool(fakeContext(fakeLlm(['{}'])), normalizeConfig({}), logger())
  assert.equal(tool.name, 'case_fix')
  assert.deepEqual(tool.parameters.properties.action.enum, ['plan', 'verify', 'regen'])
  assert.ok(tool.parameters.properties.case)
  assert.ok(tool.parameters.properties.dir)
  assert.ok(tool.parameters.properties.taskPath)
  assert.ok(tool.parameters.properties.decisions)
  assert.deepEqual(tool.parameters.properties.only.items.enum.sort(), ['all', 'early', 'late', 'no-created', 'no-shape'].sort())
  const blocks = tool.output.render({}, { text: 'hello' })
  assert.deepEqual(blocks, [{ type: 'text', text: 'hello' }])
})
