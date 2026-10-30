/**
 * 把模型的输出解析成「节点身份 → 字符号」，并列出它哪里不合格。
 *
 * 校验不是形式主义：这份数字马上会被写进 `.infer` 并当作期望值，
 * 少一个节点、多一个节点、抄错 pos/start、字符越界，都必须当场拒绝。
 *
 * @module dsh-case-infer/parse
 */

/**
 * @param {string} text - 模型输出（可能带代码围栏或多余说明）。
 * @param {{kind: string, pos: number, start: number, end: number}[]} nodes - 期望覆盖的节点。
 * @param {number} charCount - 源码字符数（char 的合法范围 0..charCount-1）。
 * @returns {{numbers: Map<string, number>, issues: string[]}}
 */
export function parseNumbers(text, nodes, charCount) {
  const issues = []
  const numbers = new Map()
  const expected = new Map(nodes.map((node) => [keyOf(node), node]))

  const start = text.indexOf('[')
  const end = text.lastIndexOf(']')
  if (start < 0 || end <= start) {
    return { numbers, issues: ['输出里找不到 JSON 数组（缺少 [ … ]）'] }
  }

  let parsed
  try {
    parsed = JSON.parse(text.slice(start, end + 1))
  } catch (error) {
    return { numbers, issues: [`JSON 解析失败：${error instanceof Error ? error.message : String(error)}`] }
  }
  if (!Array.isArray(parsed)) {
    return { numbers, issues: ['输出的 JSON 不是数组'] }
  }

  for (const [index, item] of parsed.entries()) {
    if (item === null || typeof item !== 'object' || Array.isArray(item)) {
      issues.push(`第 ${index + 1} 项不是对象`)
      continue
    }
    const { kind, pos, start: srcStart, char } = item
    if (typeof kind !== 'string' || !Number.isInteger(pos) || !Number.isInteger(srcStart)) {
      issues.push(`第 ${index + 1} 项缺少 kind/pos/start（收到 ${JSON.stringify(item)}）`)
      continue
    }
    const id = `${kind}|${pos}|${srcStart}`
    if (!expected.has(id)) {
      issues.push(`第 ${index + 1} 项的节点不在清单里：${kind} pos=${pos} start=${srcStart}`)
      continue
    }
    if (numbers.has(id)) {
      issues.push(`第 ${index + 1} 项重复给了同一个节点：${id}`)
      continue
    }
    if (!Number.isInteger(char) || char < 0 || char >= charCount) {
      issues.push(`第 ${index + 1} 项的 char 不合法（${JSON.stringify(char)}），应在 0..${charCount - 1}`)
      continue
    }
    numbers.set(id, char)
  }

  for (const [id, node] of expected) {
    if (!numbers.has(id)) {
      issues.push(`缺节点：${node.kind} pos=${node.pos} start=${node.start}`)
    }
  }

  return { numbers, issues }
}

/**
 * @param {{kind: string, pos: number, start: number}} node
 * @returns {string}
 */
function keyOf(node) {
  return `${node.kind}|${node.pos}|${node.start}`
}
