/**
 * 拼 prompt：源码 + 逐字编号 + 节点清单 + 口径规则。
 *
 * 只让模型回「节点 → 字符号」的数字，不让它重抄整棵树：输出小、好校验，
 * 树本身是本地生成的（`case-infer.mjs` 的骨架）。
 *
 * 规则 1–2 是 2026-11-01 补的口径：原来只写「形状不再可能改变」，模型会把它读成
 * 「这个构造写完了」（容器等到收口、`T` 等到 `extends` 收口 = 21），或者读成
 * 「下一个记号的开头」（`T` 判成 `extends` 的首字母 = 14）。现在把「取自己的名字/关键字
 * 收口那一格」写成第一条，并给了一个含条件类型的完整例子。
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
    '任务：判断每个节点「最早在哪一个字符确定」——取第一个让这个节点的 kind 不再可能变成别的形状的字符。',
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
    '# 判定规则',
    '',
    '1. 先找这个节点自己的名字或关键字，取它**收口**的那一格（最后一个字符的下一格）：',
    '   Identifier 取名字、TypeReference 取类型名、TypeAliasDeclaration 取别名、',
    '   ConditionalType 取 `extends`、InferType 取 `infer`、NeverKeyword 取 `never`。',
    '2. 不要等这个构造写完：`<…>` 的 `>`、`?`、`:`、`;`、换行、EOF 都是「写完」，不是「确定」。',
    '3. 不要取下一个记号的首字符：看到 `e` 就判成 `extends` 的首字母，比正确位置晚一格。',
    '4. 只包着孩子的节点与孩子同格（TypeReference 包 Identifier、TypeParameter 包 Identifier）；',
    '   除非它自己带了新记号（ConditionalType 的 `extends`、InferType 的 `infer`）。',
    '5. 由列表转换出来的节点取列表的那一格：头部 TypeParameter 来自 TypeParameterList，取 `<` 的字符。',
    '6. 只有上面几条都算不出时才用「宁晚勿早」；能用规则 1–4 算出来的，不要靠感觉往后推。',
    `7. char 必须落在 0..${chars.length - 1}。`,
    '',
    '# 口径示例',
    '',
    '`let x = 1`：',
    '',
    '    SourceFile              0    ← 根在第一个字符之前就存在',
    '    VariableStatement       5    ← `let x ` 之后名字收口，语句的形状定了',
    '    Identifier `x`          5    ← 名字在空格处收口',
    '    NumericLiteral `1`      9    ← 数字在换行处收口',
    '',
    '`type A<T> = T extends Array<infer U> ? U : never`：',
    '',
    '    TypeAliasDeclaration    6    ← 名字 `A` 在 `<` 处收口',
    '    ConditionalType         21   ← `extends` 收口；不是 37（`?`）',
    '    TypeReference `T`       13   ← 名字 `T` 在空格处收口；不是 14（`e`），也不是 21（父节点等 `extends`）',
    '    Identifier `T`          13   ← 同上',
    '    TypeReference `Array…`  27   ← 名字 `Array` 在 `<` 处收口；不是 36（`>`）',
    '    InferType               33   ← `infer` 收口；不是 35（`>`）',
    '    NeverKeyword            48   ← `never` 在换行处收口',
    '',
    '# 输出',
    '',
    '一个 JSON 数组，每个元素形如 {"kind":"Identifier","pos":4,"start":5,"char":6}，',
    '与上面的节点一一对应：不多、不少、不重复；kind/pos/start 必须原样抄。',
    '',
    '对应上面第一个例子的输出：',
    '',
    '    [{"kind":"SourceFile","pos":0,"start":0,"char":0}, {"kind":"VariableStatement","pos":0,"start":0,"char":5}, …]',
    '',
    '只输出 JSON 数组，不要代码围栏，不要解释。',
  ].join('\n')

  return { system, user }
}
