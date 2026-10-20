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