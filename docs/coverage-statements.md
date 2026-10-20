# statements family 覆盖（chunk 1）

本页记 `typescript/cases/statements.ts` 这一轮收了什么、怎么实现、还差什么。口径是
`node typescript/cases/ast-json.mjs` + `node typescript/cases/ast-json-diff.mjs`（本分支唯一权威 AST 尺子）。

## 1. 本轮落地

根级可达：空语句 `;`、块 `{}`、变量语句（`var` / `let` / `const`，单 / 多声明，无类型注解、
无解构）、`if` / `else` / `else-if`、`while`、`do-while`、`for`（三子句、含空子句与多声明初始化）、
`for-in`（标识符 / 变量声明绑定）、`for-of`（同上）、`return`、`break`（含标签）、`continue`（含标签）、
`throw`、`debugger`；`labeled` 在块 / 体内可达（`{ lbl: b; }`）。

实现方式（`typescript/tokens/statements/`）：

| 文件 | 职责 |
| --- | --- |
| `statement-scanner.xl.md` | 符号层的递归下降**终结位置扫描器**：回答「到齐没有、到齐在哪个下标」。不建形状。 |
| `statement-builder.xl.md` | 到齐后一次建完整条语句的递归下降建树器；表达式片段交 `ExpressionBuilder`。 |
| `statement-possible-shape.xl.md` | 根级候选：只认本族起点（`{` / `;` / 固定关键字），其它起点 `Reject`；`BuildByIndex` 只消费到扫描出的 `End`。 |

为什么用「扫描器 + 原子建树」而不是每个语句一个挂载型 possible：

- `if` 的终结位置要等「`;` 之后是不是 `else`」才知道；扫描器把「还差单元」与「到齐点早于当前下标」
  分开回答，`BuildByIndex` 只 `splice(start..End)`，剩下的单元留给下一条语句。
- 块 / 循环体里的语句由建树器递归建，不需要每层再挂一份候选目录；表达式仍复用既有 `ExpressionBuilder`，
  没有新写表达式子系统。

区间口径：`Pos = 前一个非 trivia 单元 End + 1`（与 TS 的 `pos` 一致），shape 的 `SourceRange` 是闭区间；
块内第一条语句的 `Pos` 取 `{` 的下一个位置，与 TS 一致。

## 2. 用例

`statements.ts`：base 用例 + trivia 变体（前导注释 / 词间注释 / 词间多空格 / 词间换行 / 行尾注释）+
重复形（同文件多语句），共 60 余条。`\n` 由生成器还原成真实换行。

## 3. 暂缓（写成 `//` 目标行，未煮进用例）

| 目标 | 原因 / 依赖 |
| --- | --- |
| `switch` / `case` / `default` | 下一 chunk |
| `try` / `catch` / `finally` | 下一 chunk |
| `with` | 下一 chunk |
| 解构绑定 `const [a,b] = arr` / `const {p,q} = o` | 依赖 cover-members-1 的 binding pattern |
| ASI（无分号断句） | 属 cover-end-1 |
| 函数 / 类声明 | 后续 declarations 成员 |
| **根级标签语句** `lbl: b;` | 与 expression 候选在「标识符起头」上无法共存：`ExpressionStatementPossibleShape.CanStart` 接受标识符且整段不 Reject，两个候选会一直同时存活、`CatalogGuide` 永远等不到唯一候选。块 / 体内已可建（本 chunk 的 `{ lbl: b; }`）。要收根级标签需要 expression 候选侧配合（改动属 cover-end-1 的文件）。 |

## 4. 依赖与注意事项

- 变量语句 / `for` 初始化的测量载体是 `typescript/tokens/declarations/variable-declaration*.xl.md`；
  本 chunk 只把建树器接到它们的 shape 上（`VariableDeclarationListShape` / `VariableDeclarationShape`），
  两个 `*-possible-shape.xl.md` 仍是桩，没有启用。
- `typescript/cases/ast-json-diff.mjs` 的 `TS_KIND_ALIASES` 补了一条 `LastStatement → DebuggerStatement`
  （TS 的反查名是 `LastStatement`，产物侧类名是 `DebuggerStatementShape`；与既有
  `FirstStatement → VariableStatement` 同款归一）。
- 根候选表只加了 `new StatementPossibleShape()`；其余 27 行注释未动。
- 构建口径：`xl_build({cwd, targets:["ts"], paths:["core","typescript"]})`（整树会因
  `cjcli.xl.md` 引用已删除的 `dawn/text/*.xl.md` 而 0 产物），再 `tsc -p tsconfig.json`。

## 5. 读数

- `statements`：见提交报告（本轮实测条数与全量合计）。
- 全量：基线 782/782 → 本轮 `782 + statements` 全绿；expression / string / import / export / number / regex 无回归。
