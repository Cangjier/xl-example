/**
 * 把 `docs/IMPORTANCE.md` 读成一份可引用的规则集。
 *
 * IMPORTANCE 是**用户独占**的文档（文档自己写了：只能由用户编辑，AI 与工具不得改动）。
 * 所以这里只读、不写，一个字节都不落盘；规则的身份（id）、分级（P0..P3）全部在本地
 * 由确定性代码算出来，模型只负责「哪一行违反了哪一条」，没有资格定级。
 *
 * 分级不是文档里写的，是这份代码写死的关键词表：禁止/必须 → P0，只允许/需要 → P1，
 * 质量/优先 → P2，其余 → P3。分级表放在这里，改分级就是改这一张表，可测、可审。
 *
 * @module dsh-code-review/rules
 */

import fs from 'node:fs'

/** 从高到低四个阶段；`P0` 先审，finding 也按这个顺序出。 */
export const STAGES = ['P0', 'P1', 'P2', 'P3']

/** 每个阶段的说明（进 prompt，也进报告）。 */
export const STAGE_INFO = {
  P0: { stage: 'P0', label: '禁止 / 必须', hint: '硬性禁止与必须项：违反即实现错误' },
  P1: { stage: 'P1', label: '约束', hint: '行为规范：只允许…、需要…、应当…' },
  P2: { stage: 'P2', label: '质量', hint: '质量等级：能增量却全量、每轮遍历…' },
  P3: { stage: 'P3', label: '说明', hint: '其余说明；一般不作 finding' },
}

/**
 * 情态标记 → 阶段。顺序即优先级：先命中 P0，再 P1、P2；都没命中就是 P3（说明）。
 *
 * `→` / `则走` / `等价` 这些不是情态词，但它们表达的同样是「这一格必须产出什么」的
 * 行为约定（`越界 → 返回 Nothing`、`其他情况 → Reload Message`），所以归到 P1。
 * 没有标记的行（`区域注释 AreaAnnotation`、`缺少possible`）是名词列举，不是规则。
 */
const LEVEL_MARKERS = [
  ['P0', /禁止|不得|严禁|一律|必须/],
  ['P1', /只允许|只能|需要|应当|应该|→|则走|等价|只剩/],
  ['P2', /优先|建议|质量|等级/],
]

/**
 * 判定一句话属于哪个阶段。
 *
 * @param {string} text - 去掉了 `- ` 与缩进的规则正文。
 * @returns {'P0'|'P1'|'P2'|'P3'}
 */
export function classifyLevel(text) {
  for (const [stage, pattern] of LEVEL_MARKERS) {
    if (pattern.test(text)) {
      return stage
    }
  }
  return 'P3'
}

/**
 * 一句话是不是「对本文档自身的约束」——它约束的是 IMPORTANCE.md，不是被审代码。
 *
 * @param {string} text
 * @returns {boolean}
 */
function isMetaRule(text) {
  return text.includes('本文档')
}

/**
 * 一句话有没有可审的规范性内容（而不是背景叙述或名词列举）。
 *
 * 判据就是分级表本身：命中任何情态标记才算规则。`区域注释 AreaAnnotation`、
 * `缺少possible`、`什么时候close` 这类枚举/疑问因此不会进 prompt。
 *
 * 三条排除：以冒号收尾的引导句（`需要注意的是：`）、问句（`解决思路` 那一节）、
 * 纯定义（`质量等级为：差/一般/好`）——它们不构成可违反的约束。
 *
 * @param {string} text
 * @returns {boolean}
 */
function isRuleCandidate(text) {
  if (/[：:]$/.test(text)) {
    return false
  }
  if (/^(什么|哪些|什么时候|是否|以及|如何)/.test(text) || /[？?]$/.test(text)) {
    return false
  }
  if (/等级为[：:]/.test(text)) {
    return false
  }
  return classifyLevel(text) !== 'P3'
}

/**
 * 解析 IMPORTANCE.md。
 *
 * 章节编号按出现顺序生成（`## 设计` 是 2，`### 框架` 是 2.1），规则 id 形如
 * `R2.10-2`：第 2 章第 10 节的第 2 条。id 进入报告，所以要能一眼定位回文档。
 *
 * @param {string} markdown - 文档全文。
 * @returns {{
 *   title: string,
 *   rules: {id: string, section: string, sectionPath: string, level: string, scope: 'code'|'meta', text: string, line: number}[],
 * }} 规则集。
 */
export function parseImportance(markdown) {
  const lines = String(markdown).replace(/\r\n?/g, '\n').split('\n')
  const rules = []
  let title = ''
  let h2 = 0
  let h3 = 0
  let section = ''
  let sectionPath = ''
  let perSection = new Map()
  let inFence = false

  for (let index = 0; index < lines.length; index++) {
    const raw = lines[index]
    const line = raw.trimEnd()
    if (line.trimStart().startsWith('```')) {
      inFence = !inFence
      continue
    }
    if (inFence) {
      continue
    }
    if (line.startsWith('# ')) {
      title = line.slice(2).trim()
      continue
    }
    if (line.startsWith('## ')) {
      h2 += 1
      h3 = 0
      section = line.slice(3).trim()
      sectionPath = `${h2} ${section}`
      continue
    }
    if (line.startsWith('### ')) {
      h3 += 1
      section = line.slice(4).trim()
      sectionPath = `${h2}.${h3} ${section}`
      continue
    }
    const text = line.trim()
    if (text === '' || text.startsWith('|') || text.startsWith('#')) {
      continue
    }
    if (!isRuleCandidate(text)) {
      continue
    }
    const body = text.startsWith('- ') ? text.slice(2).trim() : text
    if (body === '') {
      continue
    }
    const key = `${h2}.${h3}`
    const ordinal = (perSection.get(key) ?? 0) + 1
    perSection.set(key, ordinal)
    rules.push({
      id: `R${key}-${ordinal}`,
      section,
      sectionPath,
      level: classifyLevel(body),
      scope: isMetaRule(body) ? 'meta' : 'code',
      text: body,
      line: index + 1,
    })
  }

  return { title: title || 'IMPORTANCE', rules }
}

/**
 * 读规则文件。只读不写：IMPORTANCE 归用户所有。
 *
 * @param {string} file - 绝对路径。
 * @returns {{path: string, title: string, rules: object[]}}
 * @throws {Error} 文件不存在时。
 */
export function readRules(file) {
  if (!fs.existsSync(file)) {
    throw new Error(`找不到规则文件：${file}（它是用户独占的文档，插件只读不写）`)
  }
  const markdown = fs.readFileSync(file, 'utf8')
  const parsed = parseImportance(markdown)
  return { path: file, title: parsed.title, rules: parsed.rules }
}

/**
 * 按阶段分组，只保留要送进 review 的规则。
 *
 * @param {object[]} rules
 * @param {{stages?: string[], includeMeta?: boolean}} [options]
 * @returns {Map<string, object[]>} 阶段 → 规则（保持文档顺序）。
 */
export function groupByStage(rules, options = {}) {
  const wanted = new Set(options.stages ?? STAGES)
  const includeMeta = options.includeMeta === true
  const grouped = new Map(STAGES.map((stage) => [stage, []]))
  for (const rule of rules) {
    if (!wanted.has(rule.level)) {
      continue
    }
    if (!includeMeta && rule.scope === 'meta') {
      continue
    }
    grouped.get(rule.level).push(rule)
  }
  return grouped
}
