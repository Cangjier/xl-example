/**
 * 规则适用范围的测试：`analyzeFile` / `exemptionFor` / `applicabilityNotes`，以及一条端到端。
 *
 * 这里守的是三条被真实误报过的形态（见 `docs/reports/code-review-core-syntax-1102.md` 第五节）：
 * `# enum` 的 `- case` 成员行、基类 `ShapeToken` 的 `ExitOrPre` 默认钩子、
 * `BranchStates.Undo/Reload` 分支返回值。三条都必须「字面命中 → 排除 → 带原因进报告」，
 * 同时反例（真正的散文行）必须照样报出来——排除逻辑不能宽到把真问题也挡掉。
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { normalizeConfig } from '../src/config.mjs'
import { analyzeFile, applicabilityNotes, exemptionFor } from '../src/exemptions.mjs'
import { parseImportance } from '../src/rules.mjs'
import { createReviewTool } from '../src/tools/review.mjs'

/** 与真实 IMPORTANCE 同构的最小规则集：散文（P0）、ExitOrPre（P0）、未消费 basic token（P1）。 */
const RULES = [
  '# IMPORTANCE',
  '## xl.md 规范',
  '所有xl.md禁止散文。散文是指代码围栏之外、标题之外的说明文字。',
  '## 设计',
  '### 未消费的basic token',
  '其他情况，则走`Reload Message`',
  '### 其他注意点',
  'shape 禁止用 `ExitOrPre` 结束自己，禁止覆盖`ExitOrPre`。',
].join('\n')

const ENUM = [
  '# enum ShapeStates',
  '',
  '- case Reject',
  '- case Accept',
  '- case Uncertain',
].join('\n')

const BASE = [
  '# class ShapeToken extends UnitToken',
  '',
  '## protected method ExitOrPre:(context:SyntaxContext, buffer:SourceRange, index:int, value:string)=>BranchStates',
  '',
  '```ts',
  'return BranchStates.Undo;',
  '```',
  '',
  '## static method Transit:(context:SyntaxContext, unit:Token, value:string)=>BranchStates',
  '',
  '```ts',
  'return BranchStates.Undo;',
  '```',
].join('\n')

const PROSE = [
  '# class Foo',
  '',
  '这一段是真正的说明文字，不是围栏也不是枚举成员。',
].join('\n')

const FILES = {
  'src/enum.xl.md': ENUM,
  'src/base.xl.md': BASE,
  'src/prose.xl.md': PROSE,
}

const lineOf = (text, needle) => text.split('\n').findIndex((line) => line.includes(needle)) + 1

function rulesById() {
  const { rules } = parseImportance(RULES)
  return {
    prose: rules.find((rule) => rule.text.includes('禁止散文')),
    exitOrPre: rules.find((rule) => rule.text.includes('ExitOrPre')),
    unconsumed: rules.find((rule) => rule.sectionPath.includes('未消费')),
  }
}

function makeWorkspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'code-review-exempt-'))
  fs.mkdirSync(path.join(root, 'docs'), { recursive: true })
  fs.mkdirSync(path.join(root, 'src'), { recursive: true })
  fs.writeFileSync(path.join(root, 'docs', 'IMPORTANCE.md'), RULES, 'utf8')
  for (const [rel, text] of Object.entries(FILES)) {
    fs.writeFileSync(path.join(root, rel), text, 'utf8')
  }
  return { root }
}

function fakeLlm(handler) {
  const calls = []
  return {
    calls,
    stream(request) {
      calls.push(request)
      const text = handler(request)
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

test('analyzeFile：围栏、enum 成员行、ExitOrPre 段都能被定位', () => {
  const base = analyzeFile(BASE)
  assert.equal(base.className, 'ShapeToken')
  assert.equal(base.exitOrPre.start, lineOf(BASE, 'ExitOrPre'))
  assert.equal(base.exitOrPre.end, lineOf(BASE, '## static method Transit') - 1)
  assert.equal(base.exitOrPre.ownerIsBase, true)
  // 围栏内的两处 return 都被算进 fenced。
  assert.equal(base.fenced.has(lineOf(BASE, 'return BranchStates.Undo;')), true)

  const enumFile = analyzeFile(ENUM)
  assert.deepEqual([...enumFile.enumCases].sort((a, b) => a - b), [3, 4, 5])

  const prose = analyzeFile(PROSE)
  assert.equal(prose.enumCases.size, 0)
  assert.equal(prose.exitOrPre, null)
})

test('exemptionFor：三条形态分别给出原因，真正的散文行不给', () => {
  const { prose, exitOrPre, unconsumed } = rulesById()
  const enumFile = analyzeFile(ENUM)
  const base = analyzeFile(BASE)
  const proseFile = analyzeFile(PROSE)

  const findBy = (text, ctx, needle) => ({
    rule: prose.id,
    ruleText: prose.text,
    sectionPath: prose.sectionPath,
    line: lineOf(text, needle),
    lineText: text.split('\n')[lineOf(text, needle) - 1].trim(),
    __ctx: ctx,
  })

  // 1) enum 成员行
  const caseFinding = findBy(ENUM, enumFile, '- case Reject')
  assert.match(exemptionFor(caseFinding, enumFile), /`- case` 成员行/)

  // 2) 围栏内（散文规则不看围栏里的代码）
  const fencedFinding = { ...findBy(BASE, base, 'return BranchStates.Undo;'), ruleText: prose.text, sectionPath: prose.sectionPath }
  assert.match(exemptionFor(fencedFinding, base), /围栏内/)

  // 3) 基类 ExitOrPre 的声明行与默认实现
  const heading = {
    rule: exitOrPre.id,
    ruleText: exitOrPre.text,
    sectionPath: exitOrPre.sectionPath,
    line: lineOf(BASE, '## protected method ExitOrPre'),
    lineText: '## protected method ExitOrPre:',
  }
  assert.match(exemptionFor(heading, base), /默认钩子/)
  const body = { ...heading, line: lineOf(BASE, 'return BranchStates.Undo;') }
  assert.match(exemptionFor(body, base), /默认钩子/)

  // 4) 分支返回值不套「未消费 basic token」
  const branch = {
    rule: unconsumed.id,
    ruleText: unconsumed.text,
    sectionPath: unconsumed.sectionPath,
    line: lineOf(BASE, '## static method Transit') + 3,
    lineText: 'return BranchStates.Undo;',
  }
  assert.match(exemptionFor(branch, base), /分支回退\/重派语义/)

  // 5) 反例：真正的散文行照样算问题
  const realProse = findBy(PROSE, proseFile, '真正的说明文字')
  assert.equal(exemptionFor(realProse, proseFile), null)
})

test('exemptionFor：非基类里的 ExitOrPre 不在豁免之列', () => {
  const { exitOrPre } = rulesById()
  const derived = ['# class FooShape extends ShapeToken', '', '## protected method ExitOrPre:(x:int)=>BranchStates', '', '```ts', 'return BranchStates.Exit;', '```'].join('\n')
  const ctx = analyzeFile(derived)
  const finding = {
    rule: exitOrPre.id,
    ruleText: exitOrPre.text,
    sectionPath: exitOrPre.sectionPath,
    line: lineOf(derived, '## protected method ExitOrPre'),
    lineText: '## protected method ExitOrPre:(x:int)=>BranchStates',
  }
  assert.equal(ctx.exitOrPre.ownerIsBase, false)
  assert.equal(exemptionFor(finding, ctx), null)
})

test('applicabilityNotes：只为本轮存在的规则生成，且按规则去重', () => {
  const { prose, exitOrPre, unconsumed } = rulesById()
  const notes = applicabilityNotes([prose, prose, exitOrPre, unconsumed])
  assert.equal(notes.length, 3)
  assert.ok(notes.some((note) => note.includes('- case X')))
  assert.ok(notes.some((note) => note.includes('ExitOrPre')))
  assert.ok(notes.some((note) => note.includes('BranchStates')))
  assert.deepEqual(applicabilityNotes([]), [])
})

test('端到端：三条形态被排除并写进报告，真问题仍然报出', async () => {
  const { root } = makeWorkspace()
  const { prose, exitOrPre, unconsumed } = rulesById()

  const llm = fakeLlm((request) => {
    const stage = /本轮只审 (P\d)/.exec(request.system)?.[1]
    // prompt 里带着适用范围说明，模型不必靠猜。
    if (!request.messages[0].content[0].text.includes('# 适用范围')) {
      return '[]'
    }
    if (stage === 'P0') {
      return JSON.stringify([
        { rule: prose.id, file: 'src/enum.xl.md', line: lineOf(ENUM, '- case Reject'), snippet: '- case Reject', why: '散文', fix: '删掉' },
        { rule: prose.id, file: 'src/base.xl.md', line: lineOf(BASE, 'return BranchStates.Undo;'), snippet: 'return BranchStates.Undo;', why: '散文', fix: '删掉' },
        { rule: exitOrPre.id, file: 'src/base.xl.md', line: lineOf(BASE, '## protected method ExitOrPre'), snippet: 'ExitOrPre:(context:SyntaxContext', why: '覆盖了 ExitOrPre', fix: '删掉' },
        { rule: prose.id, file: 'src/prose.xl.md', line: lineOf(PROSE, '真正的说明文字'), snippet: '真正的说明文字', why: '这行是散文', fix: '改成标题' },
      ])
    }
    if (stage === 'P1') {
      return JSON.stringify([
        { rule: unconsumed.id, file: 'src/base.xl.md', line: lineOf(BASE, '## static method Transit') + 3, snippet: 'return BranchStates.Undo;', why: '未消费 basic token 走了 Undo', fix: '改 Reload' },
      ])
    }
    return '[]'
  })

  const tool = createReviewTool(fakeContext(llm), normalizeConfig({ root, stages: ['P0', 'P1'], retries: 0 }), logger())
  const result = await tool.execute({ paths: ['src'] })

  // 4 条命中适用范围 → 只剩 1 条真散文。
  assert.deepEqual(result.counts, { P0: 1, P1: 0, P2: 0, P3: 0 })
  assert.equal(result.excludedCount, 4)
  assert.equal(result.findings.length, 1)
  assert.equal(result.findings[0].file, 'src/prose.xl.md')
  // 排除必须带原因、且单独成节——不能静默消失。
  assert.match(result.report, /## 已按适用范围排除（4）/)
  assert.match(result.report, /`- case` 成员行/)
  assert.match(result.report, /默认钩子/)
  assert.match(result.report, /分支回退\/重派语义/)
  assert.equal(result.excluded.every((item) => typeof item.reason === 'string' && item.reason.length > 0), true)
  // blocking 只算 P0 的真 finding。
  assert.equal(result.blocking, 1)
})
