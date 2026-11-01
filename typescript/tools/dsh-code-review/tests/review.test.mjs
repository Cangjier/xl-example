/**
 * code_review 的离线测试：假模型 + 真规则解析 / 真校验 / 真排序。
 *
 * 模型通道是注入的（`ctx.get('llm')`），所以整条链路不需要网络：
 * 合格的 finding 必须进报告并按分级排序；抄错片段、编造行号必须被拒，并在重试耗尽后报错。
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { normalizeConfig } from '../src/config.mjs'
import { parseImportance } from '../src/rules.mjs'
import { createReviewTool } from '../src/tools/review.mjs'

const RULES = [
  '# IMPORTANCE',
  '本文档只能由用户编辑。',
  '## 规范',
  '### 语法',
  'shape 禁止覆盖 ComputePossibleShapes',
  'compute/build 过程中发生的异常禁止 catch 吃掉',
  '### 质量',
  'compute/build 如果每轮都遍历，则质量等级为差',
].join('\n')

const SOURCE = [
  '# class FooShape extends TypeShape',
  '',
  '## method ComputePossibleShapes:(context:SyntaxContext, source:PossibleSource)=>ComputePossibleShapesStates',
  '',
  '```ts',
  'try {',
  '  return this.CatalogGuide.ComputePossibleShapesByIndex(this, 0, context, source);',
  '} catch (error) {',
  '  return ComputePossibleShapesStates.Nothing;',
  '}',
  '```',
].join('\n')

const SOURCE_LINES = SOURCE.split('\n')
const METHOD_LINE = SOURCE_LINES.findIndex((line) => line.startsWith('## method ComputePossibleShapes')) + 1
const INDEX_LINE = SOURCE_LINES.findIndex((line) => line.includes('ComputePossibleShapesByIndex')) + 1
const CATCH_LINE = SOURCE_LINES.findIndex((line) => line.includes('} catch')) + 1

/** 规则 id 从插件自己的解析器取，避免测试里手抄 id。 */
function ruleIds() {
  const { rules } = parseImportance(RULES)
  const override = rules.find((rule) => rule.text.includes('禁止覆盖 ComputePossibleShapes'))
  const catchRule = rules.find((rule) => rule.text.includes('禁止 catch'))
  const quality = rules.find((rule) => rule.text.includes('质量等级为差'))
  return { override, catchRule, quality }
}

/** 按顺序回放回答的假模型；`handler` 拿到本次请求，便于按阶段回不同答案。 */
function fakeLlm(handler) {
  const calls = []
  return {
    calls,
    stream(request) {
      calls.push(request)
      const text = handler(request, calls.length - 1)
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

function makeWorkspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'code-review-'))
  fs.mkdirSync(path.join(root, 'docs'), { recursive: true })
  fs.mkdirSync(path.join(root, 'src'), { recursive: true })
  fs.writeFileSync(path.join(root, 'docs', 'IMPORTANCE.md'), RULES, 'utf8')
  fs.writeFileSync(path.join(root, 'src', 'shape.xl.md'), SOURCE, 'utf8')
  return { root }
}

/** 正常答案：P0 报两处（覆盖方法 + catch 吃掉），P2 报一处。 */
function goodHandler(request) {
  const { override, catchRule, quality } = ruleIds()
  const stage = /本轮只审 (P\d)/.exec(request.system)?.[1]
  if (stage === 'P0') {
    return JSON.stringify([
      { rule: override.id, file: 'src/shape.xl.md', line: METHOD_LINE, snippet: 'ComputePossibleShapes:(context:SyntaxContext', why: '规则禁止覆盖', fix: '改成 PossibleShape 候选' },
      { rule: catchRule.id, file: 'src/shape.xl.md', line: CATCH_LINE, snippet: '} catch (error) {', why: '异常被吞掉', fix: '删掉 catch' },
    ])
  }
  if (stage === 'P2') {
    return JSON.stringify([
      { rule: quality.id, file: 'src/shape.xl.md', line: INDEX_LINE, snippet: 'ComputePossibleShapesByIndex(this, 0, context, source)', why: '每轮都在遍历', fix: '结果记进 cache' },
    ])
  }
  return '[]'
}

test('合格的 findings：进报告、按分级排序、blocking 等于 P0 数', async () => {
  const { root } = makeWorkspace()
  const llm = fakeLlm(goodHandler)
  const tool = createReviewTool(fakeContext(llm), normalizeConfig({ root, stages: ['P0', 'P2'], retries: 0 }), logger())
  const result = await tool.execute({ paths: ['src'] })

  assert.equal(result.ok, true)
  assert.equal(result.calls, 2)
  assert.deepEqual(result.counts, { P0: 2, P1: 0, P2: 1, P3: 0 })
  assert.equal(result.blocking, 2)
  // 排序就是分级：P0 的两条在前。
  assert.deepEqual(result.findings.map((finding) => finding.level), ['P0', 'P0', 'P2'])
  assert.match(result.report, /^# 代码审查（IMPORTANCE）/m)
  assert.match(result.report, /## P0 禁止 \/ 必须（2）/)
  assert.match(result.report, /src\/shape\.xl\.md:3/)
  assert.equal(result.outPath, null)
})

test('片段抄错：退回重试，第二次合格', async () => {
  const { root } = makeWorkspace()
  const { override } = ruleIds()
  let p0Attempts = 0
  const llm = fakeLlm((request) => {
    const stage = /本轮只审 (P\d)/.exec(request.system)?.[1]
    if (stage !== 'P0') return '[]'
    p0Attempts += 1
    if (p0Attempts === 1) {
      // 行号对、片段凭空编造。
      return JSON.stringify([{ rule: override.id, file: 'src/shape.xl.md', line: METHOD_LINE, snippet: 'this snippet is not in the file' }])
    }
    return JSON.stringify([{ rule: override.id, file: 'src/shape.xl.md', line: METHOD_LINE, snippet: 'ComputePossibleShapes:(context:SyntaxContext', why: '规则禁止覆盖' }])
  })
  const tool = createReviewTool(fakeContext(llm), normalizeConfig({ root, stages: ['P0'], retries: 1 }), logger())
  const result = await tool.execute({ paths: ['src'] })

  assert.equal(result.calls, 2)
  assert.equal(result.findings.length, 1)
  // 重试时把问题带给模型，而不是悄悄丢掉。
  const retryUser = llm.calls[1].messages[0].content[0].text
  assert.match(retryUser, /你上一次的输出有这些问题/)
  assert.match(retryUser, /snippet 在该行找不到/)
})

test('片段抄错且不重试：直接报错，不返回半份报告', async () => {
  const { root } = makeWorkspace()
  const { override } = ruleIds()
  const llm = fakeLlm(() => JSON.stringify([{ rule: override.id, file: 'src/shape.xl.md', line: METHOD_LINE, snippet: 'not in the file at all' }]))
  const tool = createReviewTool(fakeContext(llm), normalizeConfig({ root, stages: ['P0'], retries: 0 }), logger())
  await assert.rejects(() => tool.execute({ paths: ['src'] }), /都不合格/)
})

test('编造规则 id / 越界行号：都不算数', async () => {
  const { root } = makeWorkspace()
  const llm = fakeLlm(() => JSON.stringify([
    { rule: 'R9.9-9', file: 'src/shape.xl.md', line: 1, snippet: 'class FooShape' },
    { rule: ruleIds().override.id, file: 'src/shape.xl.md', line: 999, snippet: 'x' },
  ]))
  const tool = createReviewTool(fakeContext(llm), normalizeConfig({ root, stages: ['P0'], retries: 0 }), logger())
  await assert.rejects(() => tool.execute({ paths: ['src'] }), (error) => {
    assert.match(error.message, /rule "R9\.9-9" 不在本轮规则清单里/)
    return true
  })
})

test('stage 参数只审一个阶段：调用次数与 finding 都只算它', async () => {
  const { root } = makeWorkspace()
  const llm = fakeLlm(goodHandler)
  const tool = createReviewTool(fakeContext(llm), normalizeConfig({ root, retries: 0 }), logger())
  const result = await tool.execute({ paths: ['src'], stage: 'P2' })

  assert.equal(result.calls, 1)
  assert.deepEqual(result.stages, ['P2'])
  assert.deepEqual(result.findings.map((finding) => finding.level), ['P2'])
  assert.match(llm.calls[0].system, /本轮只审 P2/)
})

test('没有 finding 时报告明说，而不是假装审过', async () => {
  const { root } = makeWorkspace()
  const tool = createReviewTool(fakeContext(fakeLlm(() => '[]')), normalizeConfig({ root, stages: ['P0'], retries: 0 }), logger())
  const result = await tool.execute({ paths: ['src'] })

  assert.equal(result.findings.length, 0)
  assert.equal(result.blocking, 0)
  assert.match(result.report, /没有 finding/)
})

test('outPath：报告落到指定位置', async () => {
  const { root } = makeWorkspace()
  const tool = createReviewTool(fakeContext(fakeLlm(goodHandler)), normalizeConfig({ root, stages: ['P0'], retries: 0 }), logger())
  const result = await tool.execute({ paths: ['src'], outPath: 'tmp/review.md' })

  assert.equal(result.outPath, path.join(root, 'tmp', 'review.md'))
  const written = fs.readFileSync(result.outPath, 'utf8')
  assert.match(written, /## P0 禁止 \/ 必须/)
})

test('paths 指错：跳过并写进报告，不静默当作 0 finding', async () => {
  const { root } = makeWorkspace()
  const tool = createReviewTool(fakeContext(fakeLlm(() => '[]')), normalizeConfig({ root, stages: ['P0'], retries: 0 }), logger())
  const result = await tool.execute({ paths: ['src', 'no-such-dir'] })

  assert.deepEqual(result.files, ['src/shape.xl.md'])
  assert.match(result.report, /跳过：no-such-dir（不存在）/)
})
