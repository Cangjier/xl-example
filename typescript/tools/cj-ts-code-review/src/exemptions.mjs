/**
 * 规则适用范围：三类「字面命中、实质不适用」的形态。
 *
 * 误报的根源是**规则适用范围**没写进 prompt：模型看到 `- case Reject` 就套「禁止散文」，
 * 看到基类的 `ExitOrPre` 就套「禁止覆盖 ExitOrPre」，看到 `return BranchStates.Undo`
 * 就套「未消费 basic token 的四种去向」。这三处都在 2026-11-01 的 P0/P1 审查里真实发生过
 * （见 `docs/reports/code-review-core-syntax-1102.md` 第五节）。
 *
 * 所以这里做两条通道，缺一不可：
 *
 * 1. `applicabilityNotes` → 进 prompt。模型一开始就不生成，省调用也省重试；
 * 2. `exemptionFor` → 本地确定性筛除。模型仍然报了也不会进主报告——但**要被记下来**，
 *    在报告末尾单独列出。排除不等于静默丢弃：一份「审了 49 个文件，0 条 finding」的报告，
 *    必须能看出有 8 条是被规则适用范围挡掉的，而不是模型什么都没看见。
 *
 * 判定全部基于文件自身文本（围栏、`# enum` 块、`## … ExitOrPre` 段落），与规则全文无关，
 * 因此 IMPORTANCE 增删条目不会让这里失效。
 *
 * @module cj-ts-code-review/exemptions
 */

/**
 * 声明 `ExitOrPre` 钩子的基类。
 *
 * 规则 `禁止覆盖 ExitOrPre` 约束的是**子形状**：子类把这个钩子改成自己的出口，才是违规。
 * 基类必须提供这个钩子（`ShapeToken` 里它只 `return BranchStates.Undo;`，是个空默认），
 * 否则子类无处可覆盖。新增基类时把名字加到这里。
 *
 * @type {ReadonlySet<string>}
 */
export const BASE_HOOK_OWNERS = new Set(['ShapeToken'])

/** `# enum` 里的成员行，例如 `- case Reject`。 */
const ENUM_CASE = /^\s*-\s*case\s+[A-Za-z_]/

/** 分支回退/重派：`Undo`（该字符不并入）与 `Reload`（交回上层重新分派）。 */
const BRANCH_RETURN = /^\s*return\s+BranchStates\.(?:Undo|Reload)\b/

/** 代码围栏的开/闭标记（``` 或 ```ts 等）。 */
const FENCE = /^\s*```/

/** 段首标题。 */
const HEADING = /^(#{1,2})\s+(.*)$/

/**
 * 把一份 `*.xl.md` 读成「这类 finding 该不该被排除」所需的上下文。
 *
 * @param {string} text - 文件原文。
 * @returns {{
 *   fenced: Set<number>,
 *   enumCases: Set<number>,
 *   className: string|null,
 *   exitOrPre: {start: number, end: number, ownerIsBase: boolean}|null,
 * }} 1 起算的行号集合。
 */
export function analyzeFile(text) {
  const lines = String(text).replace(/\r\n?/g, '\n').split('\n')
  const fenced = new Set()
  const enumCases = new Set()
  let className = null
  let inFence = false
  let inEnum = false
  let exitOrPre = null

  for (let index = 0; index < lines.length; index++) {
    const number = index + 1
    const line = lines[index]

    if (FENCE.test(line)) {
      fenced.add(number)
      inFence = !inFence
      continue
    }
    if (inFence) {
      fenced.add(number)
      continue
    }

    const heading = HEADING.exec(line)
    if (heading !== null) {
      const level = heading[1].length
      const body = heading[2].trim()
      // 顶级标题：切换 enum / class 语境。
      if (level === 1) {
        inEnum = /^enum\b/.test(body)
        const asClass = /^class\s+([A-Za-z_$][\w$]*)(?:\s+extends\s+[\w$.]+)?/.exec(body)
        if (asClass !== null) {
          className = asClass[1]
        }
        if (exitOrPre !== null && exitOrPre.end === lines.length) {
          exitOrPre.end = number - 1
        }
        continue
      }
      // 二级标题：结束上一段；命中 ExitOrPre 就开一个段。
      if (exitOrPre !== null && exitOrPre.end === lines.length) {
        exitOrPre.end = number - 1
      }
      if (exitOrPre === null && /\bExitOrPre\b/.test(body)) {
        // ownerIsBase 在这里就定下来：段会在下一个 `##` 处被关闭，那时 className 已经不在手边。
        exitOrPre = {
          start: number,
          end: lines.length,
          ownerIsBase: className !== null && BASE_HOOK_OWNERS.has(className),
        }
      }
      continue
    }

    if (inEnum && ENUM_CASE.test(line)) {
      enumCases.add(number)
    }
  }

  return { fenced, enumCases, className, exitOrPre }
}

/**
 * 这条 finding 是否命中「规则适用范围」而应被排除。
 *
 * @param {{rule: string, ruleText: string, sectionPath: string, line: number, lineText: string}} finding
 * @param {ReturnType<typeof analyzeFile>} context
 * @returns {string|null} 排除原因；`null` 表示不在豁免之列。
 */
export function exemptionFor(finding, context) {
  const ruleText = String(finding.ruleText ?? '')
  const sectionPath = String(finding.sectionPath ?? '')
  const lineText = String(finding.lineText ?? '')

  // 1) 禁止散文：围栏内、# enum 的成员行都不是散文。
  if (ruleText.includes('禁止散文')) {
    if (context.fenced.has(finding.line)) {
      return '在 ``` 围栏内：围栏内的示例与注释不算散文'
    }
    if (context.enumCases.has(finding.line)) {
      return '`# enum` 的 `- case` 成员行：枚举成员是声明，不是散文'
    }
  }

  // 2) 禁止覆盖 ExitOrPre：基类上的默认钩子不算「shape 用它结束自己」。
  if (ruleText.includes('ExitOrPre') && context.exitOrPre !== null) {
    const { start, end, ownerIsBase } = context.exitOrPre
    if (ownerIsBase && finding.line >= start && finding.line <= end) {
      return `基类 \`${context.className}\` 上的 \`ExitOrPre\` 默认钩子：本规则约束的是子形状覆盖它`
    }
  }

  // 3) 未消费 basic token 的四种去向：不套用到分支返回值上。
  if (sectionPath.includes('未消费') && BRANCH_RETURN.test(lineText)) {
    return '`BranchStates.Undo` / `BranchStates.Reload` 是分支回退/重派语义，不是未消费 basic token 的去向'
  }

  return null
}

/**
 * 本阶段里哪些规则的适用范围要额外说明——只为本轮真实存在的规则生成。
 *
 * @param {{id: string, text: string, sectionPath: string}[]} rules
 * @returns {string[]} 形如 `- [R1.0-1] …` 的行。
 */
export function applicabilityNotes(rules) {
  const notes = []
  const seen = new Set()
  for (const rule of rules) {
    const key = noteKey(rule)
    if (key === null || seen.has(key)) {
      continue
    }
    seen.add(key)
    notes.push(`- [${rule.id}] ${NOTE_TEXT[key]}`)
  }
  return notes
}

/**
 * @param {{text: string, sectionPath: string}} rule
 * @returns {string|null} 说明的键。
 */
function noteKey(rule) {
  if (rule.text.includes('禁止散文')) {
    return 'prose'
  }
  if (rule.text.includes('ExitOrPre')) {
    return 'exitOrPre'
  }
  if (rule.sectionPath.includes('未消费')) {
    return 'unconsumed'
  }
  return null
}

/** 进 prompt 的适用范围说明，键与 `noteKey` 对应。 */
const NOTE_TEXT = {
  prose: '`# enum` 下的 `- case X` 成员行是枚举成员（声明），不是散文；``` 围栏内的内容同样不算散文。这两处不要报。',
  exitOrPre: '基类 `ShapeToken` 上 `ExitOrPre` 的默认钩子（`## … ExitOrPre` 声明行及其 `return BranchStates.Undo;` 默认实现）不是「shape 用 ExitOrPre 结束自己」：本规则约束的是**子形状覆盖**这个钩子。这两行不要报。',
  unconsumed: '`BranchStates.Undo` / `BranchStates.Reload` 是分支回退/重派语义（该字符不并入当前 basic token、交回上层重新分派），不是「未消费 basic token 的去向」。不要拿本节规则去判 `return BranchStates.Undo;` / `return BranchStates.Reload;` 这种行。',
}
