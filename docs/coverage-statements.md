# statements family 覆盖（chunk 1 + chunk 2 + trivia chunk + chunk 3 + labeled chunk）

> **labeled chunk**（分支 `cover-label-root-1`，起点 `origin/integration @26dd9b3b`）：
> 新 stem `typescript/cases/labeled-statements.ts` **42/42** 完全一致；全量 **2337 → 2379** 全绿；tsc 0 error。
>
> 机制（两处配合，都在 statements 家族内）：
> - `expression-statement-possible-shape.xl.md`（最小改动）：累计扫描加 `CodeCount` / `FirstIdentifier` / `SawQuestion`，
>   只有「首单元是 Common 标识符、第 2 个代码单元是 `Symbol ":"`、且此前没出现过 `?`」才 `Reject`。
>   合法的三元（`a ? b : c`）第 2 单元是 `?`，不会被误杀；对象字面量 / 类型上下文以括号或关键字起头，也不受影响。
> - `statement-scanner.xl.md`：`ScanRoot` 对「普通标识符起头」在第一个代码单元用文档前视 `NextChar` 判断
>   （跳过空白与注释后下一个字符是 `:` 才继续等，否则立刻 `Mismatch`，普通表达式语句的判定时机与改动前完全一样）；
>   见到 `:` 后 `ScanBody(at + 2)` 递归扫体。`ScanBody` 同时支持**体内嵌套标签**（`Identifier ":"` 递归），
>   修掉了 `a: b: { c(); }`（嵌套标签 + 块体）之前「一直等 `;` 到 EOF」的问题。
> - `LabeledStatementShape` 与 `BuildLabeled`（chunk 2 就有）直接复用；`break lbl;` / `continue lbl;` 的标签叶子也复用。
>
> 42 条覆盖：`lbl: b;`、`lbl: { }` / `{ break lbl; }`、`lbl: if`、`lbl: while` / `for` / `do` / `switch`
> （块体与非块体）、`break` 与 `continue` 的目标标签、嵌套标签 `a: b: c;` / `a: b: c: d;` / `a: b: { c(); }`、
> 双层循环里 `break a;`；trivia：前导 / 标签后冒号前 / 冒号后注释、行尾注释、`lbl:\nb;`、块内多行；
> 重复形与混排（两条 / 三条标签、标签与 `let` / 表达式混排）；
> 回归：`a;`、`a ? b : c;`、嵌套三元、`a.b;`、`a();`、`a = b;`、`a, b;`、`(a, b);`、`f(a, b);` 全部不受影响。
>
> 暂缓：标签直接修饰函数/类声明（TS 语法本身非法，故不收）；标签与 ASI 的交互（end 家族边界）。
>

> **trivia chunk**（分支 `cover-statements-trivia-1`，起点 `origin/integration @ebbbacab`）：
> 纯测量轮——**只 append `typescript/cases/statements.ts`**，没有改任何 token 源文件 / shape / candidate。
> statements.ts **91 → 174**（新增 83 条 trivia / 重复形），全量 **1734 → 1817** 完全一致，
> 结构差 / 位置差 / 字段差均 0；**无意外红项**（所有新增行一次通过 TS oracle）。
>
> 新增覆盖（base 已在 chunk 1/2 有过，这里只叠 trivia 与重复形）：
> - if/else 链：头与体之间注释、`if ( /* c */ a /* c */ )`、空体带注释（`if (a) /* c */ ;`）、
>   `} else {` 多行变体、`if (a)\n{ b; }`、else 前/后注释、`if (a) { } else if (b) { } else { }`；
> - 循环：while / do-while / for / for-in / for-of 的头与体之间注释与换行、空体带注释、
>   体内多语句（`{ b; c; }`）、`do b;\nwhile (a);`、for 体里再放一条变量语句；
> - 变量语句：多 declarator（有无 init 混排）、declarator 之间注释、`var a = 1, b = 2; // tail`、
>   `let x = 1; /* c */`、同文件 2~3 条；
> - switch/try/with：`switch` 头/块/case 值/case 冒号前后/子句语句前后注释、多 case 换行、
>   try 头注释、`} /* c */ catch`、catch 绑定括号内外注释、空 catch 块、finally 前注释、嵌套 try、
>   with 头/体注释与体内多语句；
> - labeled/break/continue/throw/return/debugger 的标签/表达式前注释与行尾注释；
> - 混排：同文件 3~5 条语句（if + while、switch + try + let、with + do + debugger 等）。
>
> 结论：statements 家族的 trivia 口径（Pos / 区间 / trivia 过滤 / 可选关键字前视）在既有 shape 上全部成立，
> 本轮没有需要报给 statements 源文件 owner 的红项。

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
`\n` 由生成器还原成真实换行。当前 **174 条**（chunk 1 的 55 + chunk 2 的 36 + trivia chunk 的 83）。

## 3. 暂缓（写成 `//` 目标行）

| 目标 | 原因 / 依赖 |
| --- | --- |
| ASI（无分号断句） | 属 cover-end-1 |
| 函数 / 类声明 | 后续 declarations 成员 |
| ~~**根级标签语句** `lbl: b;`~~ | **已收（labeled chunk）**：expression 候选按「首单元 Identifier + 第 2 代码单元 `:`」Reject、statement 候选用 `NextChar` 前视 + `ScanBody` 递归负责；新 stem `labeled-statements.ts` 42/42。 |
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

- `statements`：174 / 174 完全一致（trivia chunk 新增 83 条，零红项）。
- 全量：trivia chunk 起点 1734 / 1734 → 本轮 1817 / 1817 全绿；其余构造无回归。
- tsc 0 error；xl_check 0 error（本轮未改 xl 源文件）。

## chunk 3：case 表达式 / catch 解构用例（来自 cover-statements-3，APPEND UNION 合并）

语句用例按 APPEND UNION 合并：base 1..91 + trivia 块 + case/catch 块；合并后 statements = 210 条（174+36，无重复行）。

> **chunk 3**（分支 `cover-statements-3`，起点 `origin/integration @c49f394b`）：
> statements.ts **91 → 127**（新增 36 条），**127/127** 完全一致；全量 **1893 → 1929** 全绿；tsc 0 error。
>
> chunk 3 唯一改动的源文件：`statement-builder.xl.md` 的 `BuildCaseBlock` —— case 标签的终结 `:` 改为
> **按三元深度 0 判定**：扫描时 `Symbol "?"` 让深度 +1、`Symbol ":"` 在深度 >0 时 -1 并继续，深度 0 的 `:`
> 才是 case 标签结束符（括号 / 逗号 / 运算符在本层都是整单元，挡不住 `:` 的只有三元）。
> 这样 `case a ? b : c:`、嵌套三元 `case a ? b : c ? d : e:`、`case (a, b):`、`case a || b:`、`case a = b:`
> 都能切出完整 case 表达式。
>
> 新增 36 条：
> - case 表达式：三元 / 嵌套三元 / 括号逗号 / `||` / 赋值 / 三元后接多语句或 default 前 / default 后再 case /
>   空 case（`case a ? b : c: case d: e();`）+ 终结符前后注释、三元中间换行；
> - switch：块内嵌套 switch、if 体内嵌套、case 体多语句、fallthrough（注释分隔）、case 体为块 / if；
> - catch 解构绑定：`catch ({ message })`、`catch ([a, b])`、`catch ({ a, b })`、`catch ({ a: c })`、
>   带 finally、空 try 体、catch 括号内绑定前注释（builder 的 `BuildCatchClause` 在 chunk 2 已按 brackets
>   分支接好 bindings，本轮只补测量，未改代码）；
> - for-of/for-in 解构 trivia：`for (const [a, b] of xs)`、`for (const { a } of xs)`、`for (const {a: c} of xs)`、
>   `for (const [ a , b ] of xs)`、头体间换行、体多语句、行尾注释；
> - 混排：switch + for-of、try/catch 解构 + let。
>
> 暂缓：根级标签（本 chunk 之后的 labeled chunk 已收）、`for await`、end 家族 ASI 边界。
> `catch` 绑定的 rest / 默认值（bindings 未测量）仍未收。
>

