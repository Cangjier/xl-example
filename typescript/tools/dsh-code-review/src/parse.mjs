/**
 * 解析并校验模型给出的 findings。
 *
 * 校验不是形式主义：finding 会进报告并被当作事实。规则 id 必须在清单里、文件必须在本批里、
 * 行号必须真实存在、**片段必须逐字出现在那一行**——四条有一條不过，这条 finding 就不算数，
 * 连同原因退回给模型重试。片段抄错是模型最常见的编造方式，所以它不是「警告」，是硬门槛。
 *
 * @module dsh-code-review/parse
 */

/** 片段至少这么长才算证据（防止 `const` 这种到处都有的短串）。 */
const MIN_SNIPPET = 6

/**
 * @param {string} text - 模型输出（可能带代码围栏或前后说明）。
 * @param {object} context
 * @param {Map<string, object>} context.rules - 本轮允许的规则（id → 规则）。
 * @param {Map<string, {rel: string, text: string, lines: number}>} context.files - 本批文件。
 * @returns {{findings: object[], issues: string[]}}
 */
export function parseFindings(text, { rules, files }) {
  const issues = []
  const findings = []
  const seen = new Set()

  const sliced = sliceArray(text)
  if (sliced === null) {
    return { findings, issues: ['输出里找不到 JSON 数组（缺少 [ … ]）'] }
  }

  let parsed
  try {
    parsed = JSON.parse(sliced)
  } catch (error) {
    return { findings, issues: [`JSON 解析失败：${error instanceof Error ? error.message : String(error)}`] }
  }

  // 容忍 {"findings": [...]} 这种包一层的写法。
  const items = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.findings) ? parsed.findings : null)
  if (items === null) {
    return { findings, issues: ['输出的 JSON 不是数组（也没有 findings 字段）'] }
  }

  for (const [index, item] of items.entries()) {
    const at = `第 ${index + 1} 项`
    if (item === null || typeof item !== 'object' || Array.isArray(item)) {
      issues.push(`${at} 不是对象`)
      continue
    }
    const ruleId = typeof item.rule === 'string' ? item.rule.trim() : ''
    const file = typeof item.file === 'string' ? item.file.trim() : ''
    const line = item.line
    const snippet = typeof item.snippet === 'string' ? item.snippet : ''

    const rule = rules.get(ruleId)
    if (rule === undefined) {
      issues.push(`${at} 的 rule ${JSON.stringify(item.rule)} 不在本轮规则清单里`)
      continue
    }
    const target = files.get(file)
    if (target === undefined) {
      issues.push(`${at} 的 file ${JSON.stringify(item.file)} 不在本批文件里`)
      continue
    }
    if (!Number.isInteger(line) || line < 1 || line > target.lines) {
      issues.push(`${at} 的 line ${JSON.stringify(line)} 不合法，应在 1..${target.lines}`)
      continue
    }
    const lineText = target.text.replace(/\r\n?/g, '\n').split('\n')[line - 1] ?? ''
    const normalizedLine = normalize(lineText)
    const normalizedSnippet = normalize(snippet)
    if (normalizedSnippet.length < MIN_SNIPPET) {
      issues.push(`${at} 的 snippet 太短（${JSON.stringify(snippet)}），至少 ${MIN_SNIPPET} 个字符`)
      continue
    }
    if (!normalizedLine.includes(normalizedSnippet)) {
      issues.push(`${at} 的 snippet 在该行找不到：第 ${line} 行是 ${JSON.stringify(lineText.trim().slice(0, 120))}`)
      continue
    }
    const key = `${ruleId}|${file}|${line}`
    if (seen.has(key)) {
      issues.push(`${at} 与前面重复：${ruleId} ${file}:${line}`)
      continue
    }
    seen.add(key)

    findings.push({
      rule: ruleId,
      level: rule.level,
      ruleText: rule.text,
      sectionPath: rule.sectionPath,
      file,
      line,
      snippet: snippet.trim(),
      lineText: lineText.trim(),
      why: typeof item.why === 'string' ? item.why.trim() : '',
      fix: typeof item.fix === 'string' ? item.fix.trim() : '',
    })
  }

  return { findings, issues }
}

/**
 * 取输出里第一个 `[` 到最后一个 `]` 之间的文本。
 *
 * @param {string} text
 * @returns {string|null}
 */
function sliceArray(text) {
  const start = text.indexOf('[')
  const end = text.lastIndexOf(']')
  if (start < 0 || end <= start) {
    return null
  }
  return text.slice(start, end + 1)
}

/**
 * 折叠空白后比较：模型抄代码时常把缩进/多空格压平，这不算抄错。
 *
 * @param {string} value
 * @returns {string}
 */
function normalize(value) {
  return String(value).replace(/\s+/g, ' ').trim()
}
