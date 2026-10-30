/**
 * case_infer 的离线测试：假的 `llm` 服务 + 真的骨架 / 校验 / 对拍。
 *
 * 模型通道是注入的（`ctx.get('llm')`），所以整条链路不需要网络就能测完：
 * 正确的答案应该写盘并给出对拍结论，不合格的答案必须不写盘。
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { createInferTool } from '../src/tools/infer.mjs'
import { normalizeConfig } from '../src/config.mjs'
import { parseNumbers } from '../src/parse.mjs'
import { parserAvailable } from '../../shape-actual.mjs'

const SOURCE = 'type A<T> = T extends Array<infer U> ? U : never\n'

/** 一个按顺序回放固定回答的假模型。 */
function fakeLlm(answers) {
  let index = 0
  return {
    stream() {
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

/** 用例的期望数字（就是仓库里那份 .infer 的判定，供假模型照抄）。 */
const NUMBERS = [
  { kind: 'SourceFile', pos: 0, start: 0, char: 0 },
  { kind: 'TypeAliasDeclaration', pos: 0, start: 0, char: 6 },
  { kind: 'Identifier', pos: 4, start: 5, char: 6 },
  { kind: 'TypeParameter', pos: 7, start: 7, char: 6 },
  { kind: 'Identifier', pos: 7, start: 7, char: 8 },
  { kind: 'ConditionalType', pos: 11, start: 12, char: 21 },
  { kind: 'TypeReference', pos: 11, start: 12, char: 14 },
  { kind: 'Identifier', pos: 11, start: 12, char: 13 },
  { kind: 'TypeReference', pos: 21, start: 22, char: 27 },
  { kind: 'Identifier', pos: 21, start: 22, char: 27 },
  { kind: 'InferType', pos: 28, start: 28, char: 33 },
  { kind: 'TypeParameter', pos: 33, start: 34, char: 35 },
  { kind: 'Identifier', pos: 33, start: 34, char: 35 },
  { kind: 'TypeReference', pos: 38, start: 39, char: 41 },
  { kind: 'Identifier', pos: 38, start: 39, char: 40 },
  { kind: 'NeverKeyword', pos: 42, start: 43, char: 48 },
]

function makeWorkspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'case-infer-'))
  const dir = path.join(root, 'typescript', 'cases', 'tts', 'success', 'types')
  fs.mkdirSync(dir, { recursive: true })
  const file = path.join(dir, 'alias-conditional-infer.ts')
  fs.writeFileSync(file, SOURCE, 'utf8')
  return { root, file }
}

test('正确的模型输出：写盘 + 对拍', async (t) => {
  if (!parserAvailable()) {
    t.skip('build/ts 不存在：先跑 npm run build')
    return
  }
  const { root, file } = makeWorkspace()
  const tool = createInferTool(fakeContext(fakeLlm([JSON.stringify(NUMBERS)])), normalizeConfig({ root }), logger())
  const result = await tool.execute({ case: 'success/types/alias-conditional-infer' })

  assert.equal(result.ok, true)
  assert.equal(result.nodes, 16)
  assert.equal(result.calls, 1)
  assert.equal(fs.existsSync(file.replace(/\.ts$/, '.infer')), true)

  const text = fs.readFileSync(file.replace(/\.ts$/, '.infer'), 'utf8')
  assert.match(text, /^# 预期形状创建位置（逐字）：/m)
  assert.match(text, /\/\/ char 6 "type A【<】T> ="/)
  assert.equal(text.includes('// char ?'), false)

  // 与仓库里的判定一致：10 一致 / 6 late
  assert.equal(result.check.available, true)
  assert.equal(result.check.total, 16)
  assert.equal(result.check.ok, 10)
  assert.equal(result.check.late, 6)
})

test('已有 .infer 时拒绝覆盖，除非 overwrite: true', async () => {
  const { root } = makeWorkspace()
  const ctx = fakeContext(fakeLlm([JSON.stringify(NUMBERS)]))
  const tool = createInferTool(ctx, normalizeConfig({ root }), logger())

  await tool.execute({ case: 'success/types/alias-conditional-infer' })
  await assert.rejects(
    () => tool.execute({ case: 'success/types/alias-conditional-infer' }),
    /已存在/,
  )
  const second = await tool.execute({ case: 'success/types/alias-conditional-infer', overwrite: true })
  assert.equal(second.nodes, 16)
})

test('模型输出缺节点：不写盘', async () => {
  const { root, file } = makeWorkspace()
  const broken = NUMBERS.slice(0, 3)
  const tool = createInferTool(fakeContext(fakeLlm([JSON.stringify(broken)])), normalizeConfig({ root, retries: 0 }), logger())
  await assert.rejects(
    () => tool.execute({ case: 'success/types/alias-conditional-infer' }),
    /没给出合格的节点表/,
  )
  assert.equal(fs.existsSync(file.replace(/\.ts$/, '.infer')), false)
})

test('parseNumbers：缺节点 / 越界 / 多余节点都报出来', () => {
  const nodes = [
    { kind: 'SourceFile', pos: 0, start: 0, end: 10 },
    { kind: 'Identifier', pos: 0, start: 0, end: 1 },
  ]
  const missing = parseNumbers(JSON.stringify([{ kind: 'SourceFile', pos: 0, start: 0, char: 0 }]), nodes, 10)
  assert.equal(missing.numbers.size, 1)
  assert.equal(missing.issues.length, 1)
  assert.match(missing.issues[0], /缺节点/)

  const outOfRange = parseNumbers(JSON.stringify([
    { kind: 'SourceFile', pos: 0, start: 0, char: 0 },
    { kind: 'Identifier', pos: 0, start: 0, char: 99 },
  ]), nodes, 10)
  // 越界的那个不会被采纳，于是它同时报了「char 不合法」和「缺节点」——两条都是事实。
  assert.equal(outOfRange.issues.length, 2)
  assert.match(outOfRange.issues.join('\n'), /char 不合法/)
  assert.match(outOfRange.issues.join('\n'), /缺节点/)

  const extra = parseNumbers(JSON.stringify([
    { kind: 'SourceFile', pos: 0, start: 0, char: 0 },
    { kind: 'Identifier', pos: 0, start: 0, char: 1 },
    { kind: 'Nope', pos: 0, start: 0, char: 2 },
  ]), nodes, 10)
  assert.equal(extra.issues.length, 1)
  assert.match(extra.issues[0], /不在清单里/)
})
