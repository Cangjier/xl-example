# literals 覆盖（cover-expressions-1 槽位）

本文件记录 cover-expressions-1 槽位在 literals 家族补的用例。每个小节对应一个分支：直接 append
`typescript/cases/literals.ts`（measurement-first：先 probe，只收绿），不改 shape 时明确标注。

## chunk 2（cover-literals-1）：字面量边界 sweep（measurement-first）

**未改任何 literal / basic-token shape**：候选先 append 再对拍，除一条换行转义外全部一次转绿。

### 新增（literals.ts，+46 条全绿）

- 数字：`1`、`1_000`、`1_000_000`、`1e10`、`1E10`、`1.5e-3`、`.5`、`0.5`、`0xFF`、`0o17`、`0b1010`、`0xFF_FF`
- bigint：`1n`、`1_000n`、`0xFFn`、`0b1010n`、`0o17n`
- 字符串转义：`"a"`、`'a'`、`""`、`"\u000A"`、`'\u0041'`、`"\u{1F600}"`、`'\x41'`、`"\0"`、`"it's"`
- 模板：`` `t` ``、`` `a${b}c` ``、`` `\u000A` ``、`` tag`\u{41}` ``、嵌套 `` `a${`b${c}`}d` ``
- 正则 flags：`/a/g`、`/a/gi`、`/a/u`、`/a/s`、`/a/d`、`/a/v`、`/[/]/`、`/\//`
- `-0`、`+1`、`- 1`（TS 都是 PrefixUnaryExpression）
- trivia：`1_000 /* c */`、`"a" /* c */`、`/a/g /* c */`

### 读数

```
literals  116 / 116      # 70 + 46
全量     4259 / 4259     # 4213 + 46；结构差 0 / 位置差 0 / 字段差 0
```

### 注意：ast-json 的 `\n` 反转义

`ast-json.mjs` 第 56 行把用例文本里的字面 `\n` 反转义成真换行（`.replace(/\\n/g, "\n")`），所以
"反斜杠+n" 这种转义无法在本套用例里表达（`"\n"` 会变成跨行字符串，TS 侧被切成两条语句）。
本块改用等价且可表达的 `"\u000A"` / `` `\u000A` `` 覆盖"字符串里的换行"；多行模板改用嵌套模板覆盖。

### 红→绿清单

- `"\n";`（红）：根因是 ast-json 用例加载层把 `\n` 反转义导致 TS/CJ 文本不同 → 换写成 `"\u000A";` 后转绿；
  属 harness 层限制，不在 literals 形状内修复。

### AST 口径（TS 实测）

数字带分隔符/进制前缀的 kind 仍是 NumericLiteral（text 保留分隔符写法）；bigint 是 BigIntLiteral；
`-0` / `+1` / `- 1` 都是 PrefixUnaryExpression（操作数 NumericLiteral），不是负字面量。
## chunk 3（cover-harness-newline-1）：修掉 ast-json 的 `\n` 反转义，转义字面量可以直测

### 根因

`typescript/cases/ast-json.mjs` 的 `readCases()` 对每条用例做了 `.replace(/\\n/g, "\n")`：
用例文件是「一行一个用例」，多行语句靠字面 `\n` 编码成一行，再由 harness 还原成真实换行。
但这条替换是**上下文无关**的：字符串/模板/正则字面量里的 `\n` 本来就是一个转义序列，也被还原成真换行，
于是 `"\n";` 变成 `"`↵`"`（TS 切成两条语句），`` `\n` `` 变成跨行模板——转义字面量因此无法测量。

### 修复（只改 ast-json.mjs，快照格式不变）

新增 `decodeCaseText(line)`：逐字符扫描，跟踪 `'…'` / `"…"` / `` `…` ``（含 `${…}` 嵌套 / 正则 `/…/` 与字符类）
状态；**只在普通代码与注释里**把「反斜杠 + n」展开成换行，字面量内部原样保留（`\` 后跟任意字符直接跳过两字符）。
`readCases()` 改用该函数。`ast-json-diff.mjs` 只读两份 JSON 快照，不读用例源文本，无需改动，快照格式也未变。

### 快照 churn

- 全量重生成后只有 **4 个快照文件变化**：`literals.{ts,cj}-ast.json`、`string.{ts,cj}-ast.json`。
- 原因只有一个：`string.ts` / `literals.ts` 里原有的 `` `a\nb` `` 模板用例，之前被转成跨行模板，现在保留为
  「单行源码 + 转义换行」，`src` 与 pos/end 因此变化；其余 4300+ 条用例的文本没有被这段逻辑影响（顶层多行用例
  的编码换行行为保持不变）。
- 之前 build/ts 未随 integration 重建导致的 declarations 假红已排除（先 `xl_build` + `tsc` 再重生成）。

### 新增用例（literals.ts）

- `"\n";`、`'\t';`、`` `\n`; ``、`"\u{1F600}";`（`\u000A` 的旧用例保留，两种写法都在）

### 读数

```
literals  120 / 120      # 116 + 4
全量     4312 / 4312     # 4308 + 4；结构差 0 / 位置差 0 / 字段差 0
```