# statements family 覆盖（chunk 1 + chunk 2）

本页记 `typescript/cases/statements.ts` 收了什么、怎么实现、还差什么。口径是
`node typescript/cases/ast-json.mjs` + `node typescript/cases/ast-json-diff.mjs`（本分支唯一权威 AST 尺子）。

## 1. 已落地

**chunk 1（核心语句）**：空语句 `;`、块 `{}`、变量语句（`var` / `let` / `const`，单 / 多声明）、
`if` / `else` / `else-if`、`while`、`do-while`、`for`（三子句、含空子句与多声明初始化）、
`for-in`、`for-of`、`return`、`break`（含标签）、`continue`（含标签）、`throw`、`debugger`；
`labeled` 在块 / 体内可达（`{ lbl: b; }`）。

**chunk 2（本块新增）**：
- `switch` / `case` / `default`：空 switch、多 case / fallthrough、default 首位 / 中间、嵌套、case 表达式；
- `try` / `catch` / `finally`：带绑定 catch、无绑定 catch、try-finally、try-catch-finally、嵌套；
- `with`（块体 / 单语句体）；
- 解构绑定：`let [a,b] = x;`、`let {a,b} = x;`、`let {a: c} = x;`、`for (const {a} of xs)`、`for (const [a] of xs)`；
- 类型注解：`let x: number = 1;`、`var t: boolean;`、`for (let i: number = 0; …)`。

实现方式（`typescript/tokens/statements/`）：

| 文件 | 职责 |
| --- | --- |
| `statement-scanner.xl.md` | 符号层的递归下降**终结位置扫描器**：回答「到齐没有、到齐在哪个下标」。不建形状。 |
| `statement-builder.xl.md` | 到齐后一次建完整条语句的递归下降建树器；表达式交 `ExpressionBuilder`、类型交 `TypeBuilder`。 |
| `statement-possible-shape.xl.md` | 根级候选：只认本族起点（`{` / `;` / 固定关键字），其它起点 `Reject`；`BuildByIndex` 只消费到扫描出的 `End`。 |

关键点：

- **可选关键字的前视**：`else` / `catch` / `finally` 可能还在文档里没被 token 化。扫描器在体 / 块到齐那一刻
  用 `NextWord`（跳过空白与 `//`、`/* */` 注释读一个词）判断「要不要继续等」，不需要第二套挂载 / 续接机制，
  也不会把「还差 else」拖到 EOF 哨兵上与根终结候选打架（`if (a) {}`、`try { … } catch { … }` 在文件末尾都本地建）。
- **chunk 2 的结构件**：`CaseBlockShape`（declarations，直接实例化）、`CaseClauseShape` / `DefaultClauseShape` /
  `CatchClauseShape`（members，直接实例化），成员顺序按 TS 的 children 顺序 Add。
- **解构绑定**：`Array/ObjectBindingPatternShape.FromBracket` 建元素（bindings 家族），语句层只做两件事：
  放到 declarator 的 Name 位并补 `Pos`；把元素孩子里的原始 basic token 归一成 `IdentifierShape`
  （`NormalizeBindingPattern`——bindings 那几页是「已实现未测量」，`FromTokens` 的孩子是 raw token）。
- **类型注解**：变量声明里 `名字 : 类型` 之间那段交 `TypeBuilder.Load + ParseType`，放到 Name 与 Initializer 之间。
- **区间口径**：`Pos = 前一个非 trivia 单元 End + 1`；shape 的 `SourceRange` 是闭区间；块内第一条语句的 `Pos`
  取 `{` 的下一个位置，与 TS 一致。

## 2. 用例

`statements.ts`：base + trivia 变体（前导 / 词间注释、词间多空格、词间换行、行尾注释）+ 重复形（同文件多语句）。
`\n` 由生成器还原成真实换行。

## 3. 暂缓（写成 `//` 目标行）

| 目标 | 原因 / 依赖 |
| --- | --- |
| ASI（无分号断句） | 属 cover-end-1 |
| 函数 / 类声明 | 后续 declarations 成员 |
| **根级标签语句** `lbl: b;` | 与 expression 候选在「标识符起头」上无法共存：`ExpressionStatementPossibleShape.CanStart` 接受标识符且整段不 Reject，两个候选会一直同时存活、`CatalogGuide` 永远等不到唯一候选。块 / 体内已可建（`{ lbl: b; }`）。要收根级标签需要 expression 候选侧配合（属 cover-end-1 的文件）。 |
| case 里的三元表达式 `case a ? b : c:` | `case` 条件按本层第一个 `:` 切分，三元里的 `:` 需要类型 / 条件层的配合，本块不越界 |
| catch 绑定的 `...` / 默认值 | bindings 的 rest 元素尚未测量，本块只收名字 / 改名 |

## 4. 依赖与注意事项

- 变量语句 / `for` 初始化的形状载体是 `variable-declaration(-list)-shape.xl.md`；两个 `*-possible-shape` 仍是桩、未启用。
- 解构绑定消费 bindings 家族（`Array/ObjectBindingPatternShape.FromBracket`、`BindingElementShape`）；
  case / default / catch 子句消费 members 家族的三个 clause shape；类型注解消费 types 家族的 `TypeBuilder`。
  这三族的文件一行未改。
- `typescript/cases/ast-json-diff.mjs` 的 `TS_KIND_ALIASES` 保留了 chunk 1 补的 `LastStatement → DebuggerStatement`。
- 根候选表只加了 `new StatementPossibleShape()`。
- 构建口径：`xl_build({cwd, targets:["ts"], paths:["core","typescript"]})`（整树会因 `cjcli.xl.md`
  引用已删除的 `dawn/text/*.xl.md` 而 0 产物），再 `tsc -p tsconfig.json`。

## 5. 读数

- `statements`：见提交报告（本轮实测条数与全量合计）。
- 全量：integration 基线 1152/1152 → 本轮 `1152 + 新增` 全绿；其余构造无回归。
