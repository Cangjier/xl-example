/**
 * 拼 prompt：源码 + 逐字编号 + 节点清单 + 规则。
 *
 * 只让模型回「节点 → 字符号」的数字，不让它重抄整棵树：输出小、好校验，
 * 树本身是本地生成的（`case-infer.mjs` 的骨架）。
 *
 * 源码和逐字表都用缩进而不是 ``` 围栏：用例里可能就有反引号（模板字面量类型），
 * 围栏会被它们截断。
 *
 * @module dsh-case-infer/prompt
 */

/**
 * @param {object} options
 * @param {string} options.source - 用例源码。
 * @param {string[]} options.blocks - 逐字编号行（`[0-19] |…|`）。
 * @param {{kind: string, pos: number, start: number, end: number}[]} options.nodes - 节点清单。
 * @returns {{system: string, user: string}}
 */
export function buildPrompt({ source, blocks, nodes }) {
  const chars = Array.from(source)
  const system = [
    '你在读一段 TypeScript 源码的语法树。',
    '任务：判断每个节点「最早在哪一个字符确定」——从第 0 个字符开始逐字往后，取第一个让这个节点的形状不再可能改变的字符。',
    '只输出 JSON，不要解释，不要前后缀。',
  ].join('\n')

  const indent = (lines) => lines.map((line) => `    ${line}`)
  const nodeLines = nodes.map((node, index) =>
    `${index + 1}. ${node.kind}  pos=${node.pos}  start=${node.start}  end=${node.end}`)

  const user = [
    `# 源码（共 ${chars.length} 个字符，字符号 0..${chars.length - 1}）`,
    '',
    ...indent(source.replace(/\r?\n$/, '').split('\n')),
    '',
    '# 逐字编号（[起-止] |字符|，⏎ 表示换行）',
    '',
    ...indent(blocks),
    '',
    '# 节点（kind、pos、src 起点、src 终点）',
    '',
    ...nodeLines,
    '',
    '# 示例（另一个用例 `let x = 1`，只演示口径与输出格式）',
    '',
    '    SourceFile             char 0   ← 根节点从第 0 格就存在',
    '    VariableStatement      char 5   ← `let x ` 之后名字收口，语句的形状定了',
    '    VariableDeclarationList char 5  ← 同上，列表跟着语句一起定',
    '    VariableDeclaration    char 5   ← 同上',
    '    Identifier             char 5   ← 名字 `x` 在空格处收口',
    '    NumericLiteral         char 9   ← 数字 `1` 在换行处收口',
    '',
    '    对应输出：',
    '    [{"kind":"SourceFile","pos":0,"start":0,"char":0}, {"kind":"VariableStatement","pos":0,"start":0,"char":5}, …]',
    '',
    '# 输出',
    '',
    '一个 JSON 数组，每个元素形如 {"kind":"Identifier","pos":4,"start":5,"char":6}，',
    '与上面的节点一一对应：不多、不少、不重复；kind/pos/start 必须原样抄。',
    '',
    '# 判定规则',
    '',
    '1. 取「最早确定」的字符：这一格之后，无论接下来写什么，这个节点的形状都不会再改变。',
    '2. 拿不准时取晚的（宁晚勿早）：把「还不确定」当成「确定」是最糟的错。',
    `3. char 必须落在 0..${chars.length - 1}。`,
    '4. 由列表转换出来的节点取列表的那一格：例如头部 TypeParameter 来自 TypeParameterList，取 `<` 的字符。',
    '5. 每个节点想一句理由就够，不要长篇推演；只输出 JSON 数组，不要代码围栏，不要解释。',
  ].join('\n')

  return { system, user }
}
