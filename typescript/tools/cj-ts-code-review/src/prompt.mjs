/**
 * 拼审查 prompt：一个阶段的规则 + 一批带行号的源码。
 *
 * 只让模型回「哪一行违反了哪一条」的 JSON：规则由本地解析（含 id 与分级），
 * 证据由本地逐字核对，模型不负责定级、不负责决定审哪些规则。
 *
 * 源码用缩进而不是 ``` 围栏：被审文件本身就是 xl.md 时会带 ``` 围栏，围栏会截断 prompt。
 *
 * @module cj-ts-code-review/prompt
 */

import { applicabilityNotes } from './exemptions.mjs'
import { STAGE_INFO } from './rules.mjs'
import { withLineNumbers } from './files.mjs'

/**
 * @param {object} options
 * @param {string} options.stage - `P0`..`P3`。
 * @param {{id: string, text: string, sectionPath: string, level: string}[]} options.rules - 本阶段规则。
 * @param {{rel: string, text: string, lines: number}[]} options.files - 本批文件。
 * @returns {{system: string, user: string}}
 */
export function buildPrompt({ stage, rules, files }) {
  const info = STAGE_INFO[stage] ?? { label: stage, hint: '' }
  const system = [
    '你在按仓库的 IMPORTANCE 规范做代码审查。',
    `本轮只审 ${stage}（${info.label}）：${info.hint}。`,
    '规则清单由用户独占的文档解析而来，你只判断「哪一行违反了哪一条」。',
    '每条 finding 必须指向真实存在的一行，并逐字抄下那一行的片段；抄不出来就不要报。',
    '只输出 JSON 数组，不要解释，不要代码围栏。',
  ].join('\n')

  const ruleLines = rules.map((rule, index) =>
    `${index + 1}. [${rule.id}] ${rule.sectionPath}｜${rule.text}`)

  // 规则适用范围：只为本轮真实存在的规则生成，避免和「不得为凑数报」的约束打架。
  const notes = applicabilityNotes(rules)
  const noteBlock = notes.length === 0
    ? []
    : ['# 适用范围（下面这些不算违反，不要报）', '', ...notes, '']

  const fileBlocks = []
  for (const file of files) {
    fileBlocks.push(
      `## ${file.rel}（${file.lines} 行）`,
      '',
      indent(withLineNumbers(file.text)),
      '',
    )
  }

  const user = [
    `# 本轮规则（${stage}，共 ${rules.length} 条）`,
    '',
    ...ruleLines,
    '',
    ...noteBlock,
    '# 待审文件（行号在 `|` 左边，1 起算）',
    '',
    ...fileBlocks,
    '# 输出',
    '',
    '一个 JSON 数组，每个元素形如：',
    '    {"rule":"R2.10-7","file":"typescript/shapes/types/type-alias-declaration-shape.xl.md","line":21,"snippet":"ComputePossibleShapes:(context:SyntaxContext, source:PossibleSource)=>ComputePossibleShapesStates","why":"这条规则禁止 shape 覆盖 ComputePossibleShapes，这里覆盖了","fix":"把触发条件表达成 PossibleShape 候选，删掉这个 override"}',
    '',
    '约束：',
    '1. `rule` 必须是上面清单里的 id，原样抄，不要编。',
    '2. `file` 必须是上面出现的文件名，原样抄。',
    '3. `line` 是该问题所在的行号；`snippet` 必须逐字出现在那一行里（不含行号），长度至少 6 个字符。',
    '4. 同一个 (rule, file, line) 只报一次；一行违反两条规则就分两条写。',
    '5. 没有问题就输出 `[]`——空数组是合法答案，不要为了凑数把「可能」写成 finding。',
    '6. 只报这一轮规则里的问题；其它阶段的问题下一轮再审。',
  ].join('\n')

  return { system, user }
}

/**
 * @param {string} text
 * @returns {string[]}
 */
function indent(text) {
  return text.split('\n').map((line) => `    ${line}`)
}
