/**
 * 规则解析的离线测试：id、分级、meta 归属、排除项，以及真实 IMPORTANCE.md 的形状。
 *
 * 这些断言就是「根据 IMPORTANCE 审查」的地基：id 错了、级别错了，报告里的结论就全错。
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { classifyLevel, groupByStage, parseImportance, readRules } from '../src/rules.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO = path.resolve(HERE, '..', '..', '..', '..')

const FIXTURE = [
  '# IMPORTANCE',
  '本文档只能由用户编辑。',
  '## 规范',
  '### 语法',
  'shape 禁止覆盖 ComputePossibleShapes',
  'compute/build 过程中发生的异常禁止 catch 吃掉',
  '### 质量',
  'compute/build 如果每轮都遍历，则质量等级为差',
  '需要注意：',
  '什么时候 close 才对？',
  '质量等级为：差/一般/好',
  '## 特性说明',
  '- 区域注释 `AreaAnnotation`',
].join('\n')

test('parseImportance：id 按章节点出来，分级来自关键词表', () => {
  const parsed = parseImportance(FIXTURE)
  assert.equal(parsed.title, 'IMPORTANCE')
  assert.deepEqual(
    parsed.rules.map((rule) => [rule.id, rule.level, rule.scope]),
    [
      ['R0.0-1', 'P1', 'meta'],
      ['R1.1-1', 'P0', 'code'],
      ['R1.1-2', 'P0', 'code'],
      ['R1.2-1', 'P2', 'code'],
    ],
  )
  assert.equal(parsed.rules[1].sectionPath, '1.1 语法')
  assert.equal(parsed.rules[1].line, 5)
})

test('parseImportance：引导句、问句、纯定义、名词列举都不算规则', () => {
  const texts = parseImportance(FIXTURE).rules.map((rule) => rule.text)
  assert.equal(texts.some((text) => text.endsWith('需要注意：')), false)
  assert.equal(texts.some((text) => text.includes('什么时候 close')), false)
  assert.equal(texts.some((text) => text.includes('质量等级为：差/一般/好')), false)
  assert.equal(texts.some((text) => text.includes('AreaAnnotation')), false)
})

test('classifyLevel：P0 先于 P1、P2 命中', () => {
  assert.equal(classifyLevel('只允许查看 tokenIndex 之前，禁止查看之后'), 'P0')
  assert.equal(classifyLevel('应当与 TS AST 同构'), 'P1')
  assert.equal(classifyLevel('越界 → 返回 Nothing'), 'P1')
  assert.equal(classifyLevel('如果能增量却全量，则质量等级为差'), 'P2')
  assert.equal(classifyLevel('这一行是纯叙述'), 'P3')
})

test('groupByStage：meta 默认不送审，阶段可裁剪', () => {
  const { rules } = parseImportance(FIXTURE)
  const all = groupByStage(rules)
  assert.deepEqual(all.get('P0').map((rule) => rule.id), ['R1.1-1', 'R1.1-2'])
  assert.deepEqual(all.get('P2').map((rule) => rule.id), ['R1.2-1'])
  // meta 规则（约束文档自身）不进任何阶段。
  assert.equal([...all.values()].flat().some((rule) => rule.scope === 'meta'), false)

  const onlyP0 = groupByStage(rules, { stages: ['P0'] })
  assert.equal(onlyP0.get('P2').length, 0)
})

test('真实 IMPORTANCE.md：覆盖 ComputePossibleShapes / ExitOrPre 都是 P0 代码规则', (t) => {
  const file = path.join(REPO, 'docs', 'IMPORTANCE.md')
  if (!fs.existsSync(file)) {
    t.skip('docs/IMPORTANCE.md 不存在')
    return
  }
  const { rules } = readRules(file)
  assert.ok(rules.length >= 20, `规则太少：${rules.length}`)

  const override = rules.find((rule) => rule.text.includes('禁止覆盖 ComputePossibleShapes'))
  assert.ok(override, '没解析出「禁止覆盖 ComputePossibleShapes」')
  assert.equal(override.level, 'P0')
  assert.equal(override.scope, 'code')

  const exitOrPre = rules.find((rule) => rule.text.includes('ExitOrPre'))
  assert.ok(exitOrPre)
  assert.equal(exitOrPre.level, 'P0')

  const meta = rules.filter((rule) => rule.scope === 'meta')
  assert.equal(meta.length, 1)
  assert.ok(meta[0].text.includes('本文档'))
})
