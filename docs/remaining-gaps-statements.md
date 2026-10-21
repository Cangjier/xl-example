# 剩余失败分类：statements / expressions / ambiguous（9 份 crash）

> **状态：全部条目已在 round 21–26 修复；最终读数 token 1690 ok / 0 crash / 0 diff / 10 ts-invalid / 3 gap-now-passing，ast 4848/4848（47 构造）、ast:dts 226/226（HEAD `840258dc`）。**

本文件只做**分析**：主仓 HEAD **`85daba1d`** 上 `tests/cases/token/` 里 statements / expressions /
ambiguous 三个目录剩下的 **9 份 crash**，逐份给出「最小复现 → 完整崩溃链 → 根因（`typescript/**/*.xl.md` 方法:
行）→ §6 七类归属 → 修复思路（何时 build / build 提什么 / 何时 close / close 提什么）→ 难度 → 回归风险 →
标记 → 修复顺序」，并按根因分组、标出与 declarations / types 组**共用的根因**，便于后续合并修。

- 克隆/分支：`C:\Users\Admin\Documents\GitHub\xl-example-set\cover-gaps-stmt`，分支 `cover-gaps-stmt`
- 构建：`xl build(core, typescript)` → `862 written, 0 error(s)`；`tsc` → 退出码 **0**
- 全量基线（本分支）： `token-ast.mjs --quiet` → **total=1703 ok=1648 crash=35 diff=9 ts-invalid=10
  gap-now-passing=1**；`ast-json.mjs` → **4806/4806**（42 构造）
- 探针口径：`SourceFileRunner.Parse(src,'a.ts')` + `ts.createSourceFile(..., ScriptKind.TS)`
  （`parseDiagnostics` 全为 0，**9 份都不是 TS-recovery、也不是 TS 非法**）；崩溃链展开 `InnerException`

## 0. 一句话结论

9 份里 **7 份（G1 5 + G2 1 + G4 1）是同一件事：`BuildVariableStatement` / `BuildReturnOrThrow`
的「这条语句到哪结束」只认 `;`，不吃换行 ASI**——而 `BuildExpressionStatement` 早在
`statement-builder.xl.md:543` 已经有 `EndsAtLineBreak` 这一档，两条路径不同源。
剩下 2 份分别是**声明体的 `{` 被 ASI 误判**（G3，与已修的 label/`iface:` 同族）和**模块体内没有
import 声明分派**（G5，与 declarations 组的 import/export 收口共用根因）。
**没有一份需要动 basic token，也没有一份需要用户拍板**；8/9 在 `typescript/` 层可解。

## 1. 分组总表

| 组 | 根因（一句话） | 数量 | 文件清单 | §6 主类 | 难度 | 能否一起修 |
| --- | --- | --- | --- | --- | --- | --- |
| **G1** | 变量语句的 `endExclusive` 只找 `;`（`statement-builder.xl.md:642-668`），初始化表达式的区间因此跨过换行，`BuildExpressionRange` 抛「表达式没有读完」 | **5** | `statements/st-switch-block-case.ts`<br>`statements/stmt-switch-block-scoped-case.ts`<br>`statements/stmt-asi-long-chain.ts`<br>`expressions/ex-await-yield.ts`<br>`expressions/ex-call-comment-before-args.ts` | end compute 不对 | **S** | ✅ 一个判据（复用 `EndsAtLineBreak`） |
| **G2** | `BuildReturnOrThrow`（`statement-builder.xl.md:1040`）的表达式区间同样只认 `;`/段末 | **1** | `statements/stmt-unreachable-after-return.ts` | end compute 不对 | **S** | ✅ 与 G1 同一判据 |
| **G3** | 声明体 `{` 写在下一行时，终结候选把它当 ASI 边界（`IsAsiBoundary` 的「语句头」判据不认 `label:` 头、也不认 `enum/interface` 头），与仍在持有被标声明的 `StatementPossibleShape` 撞车 | **1** | `statements/gap-r929-label-body-brace-newline.ts` | end compute 不对（次：possible compute 不对） | **M** | ⚠️ 单独修（共享判据，回归面大） |
| **G4** | 函数声明的**返回类型**扫描跨过换行，把下一行 `f<string>;` 吃进返回类型 | **1** | `statements/expr-generic-inst-statement.ts` | end compute 不对 | **M** | ⚠️ 与 types/declarations 的「类型扫描 ASI」共用 |
| **G5** | `declare module` 的**模块体**内没有 import/export 声明分派，`import { B } from "b"` 落进 `BuildExpressionStatement` | **1** | `ambiguous/am-declare-module-nested.ts` | **缺少 possible** | **M** | ⚠️ 与 declarations 组 import 收口共用 |

按类合计：**end compute 不对 8 / 缺少 possible 1**（basic token 0、possible build 0、缺少 end 0、end build 0）。

## 2. G1（5 份）变量语句收口只认 `;` —— 本批最大一组

### 症状与复现（克隆实测）

同一形状在「块体」与「根级」都成立，改前/改后对照（改后 = 手工补 `;`）：

```text
{ const a = 1\n  break }                         → CRASH（throw by line 0 + 表达式没有读完）
{ const a = 1;\n break; }                        → OK  Block
switch (x) { case 1: {\n  let a = 1\n  break\n } }  → CRASH（表达式没有读完）
switch (x) { case 1: {\n  let a = 1;\n  break;\n } } → OK  SwitchStatement
const last = xs[xs.length - 1]\nlog("done");      → CRASH（表达式没有读完）
const last = xs[xs.length - 1];\nlog("done");     → OK  VariableStatement+ExpressionStatement
async function f() {\n  const a = await g()\n  const b = await (h())\n} → CRASH（表达式没有读完）
async function f() {\n  const a = await g()\n}                          → OK  FunctionDeclaration
const o = 1\no.m()\n;(() => 1)()                   → CRASH（表达式没有读完）
```

### 逐份文件

| 文件 | 行号原文 | 最小复现（实测） | 完整崩溃链 | 根因定位 | §6 | 难度 |
| --- | --- | --- | --- | --- | --- | --- |
| `statements/st-switch-block-case.ts` | 3–8：`switch (x) {` / `  case 1: {` / `    let a = 1` / `    break` / `  }` / `}` | `switch (x) {\n  case 1: {\n    let a = 1\n    break\n  }\n}` | `throw by line 0` ×2 → `表达式没有读完`；栈 `statement-builder.js:131`(BuildExpressionRange) ← `:680`(BuildVariableDeclarationList 初始化表达式) ← `:533`(BuildVariableStatement) ← `:206`(BuildStatement) | `statement-builder.xl.md` **BuildVariableStatement（642–668，`658` 的 `while (!IsSymbol(";")) endExclusive++`）** + BuildVariableDeclarationList（670、680） | end compute 不对 | S |
| `statements/stmt-switch-block-scoped-case.ts` | 3–9：同上，case 体块里多一条 `f(a)` | 同 st-switch-block-case（ddmin 4 行） | 同上（同一栈） | 同上 | end compute 不对 | S |
| `statements/stmt-asi-long-chain.ts` | 3–10：`let total = 0` / `for (…) {` / `  total += xs[i]` / `  if (total > 100) break` / `}` / `const last = xs[xs.length - 1]` / `f(total, last)` / `log("done");` | `const last = xs[xs.length - 1]\nlog("done");`（ddmin 2 行） | `throw by line 0` → `表达式没有读完`（栈同上） | 同上（根级变量语句；同族还有 for 头/体内无分号行，修完 G1 后逐条复测） | end compute 不对 | S |
| `expressions/ex-await-yield.ts` | 3–11：`async function f() {` / `  const a = await g()` / `  const b = await (h())` / `}` / `function* gen() {` / `  const c = yield` / `  const d = yield 1` / `  const e = yield* other()` / `}` | `async function f() {\n  const a = await g()\n  const b = await (h())\n}` | 同上 | 同上。**注**：`yield`/`yield*` 在变量初始化里已能正确解析（单测 `function* gen() { const e = yield* other() }` → OK），所以本份**不是** yield 的缺口，纯 G1 | end compute 不对 | S |
| `expressions/ex-call-comment-before-args.ts` | 3–5：`declare const o: { m: (...args: any[]) => any }` / `o.m /* ( */ ()` / `;(() => 1)()` | `declare const o: { m: (...args: any[]) => any }\no.m /* ( */ ()` → **OK**；加第 3 行 `;(() => 1)()` → CRASH `类型注解没有读完` | `throw by line 0` → `类型注解没有读完`；栈 `statement-builder.js:633`(BuildVariableDeclarationList 类型注解 抛错) ← `:533` ← `:196`/`:206`(BuildStatement) ← `statement-possible-shape.js:95`(BuildByIndex) | `statement-builder.xl.md` **BuildVariableStatement:658**：`endExclusive` 一路找到**第 3 行开头的 `;`**，于是类型注解的区间跨过 `o.m /* ( */ ()` 整行 ⇒ 类型扫描抛「类型注解没有读完」。同一个 `;` 也是下一条语句的起点（与 O 组「`;` 归谁」同源） | end compute 不对 | S |

### 共同根因（代码级）

- `statement-builder.xl.md` **BuildVariableStatement:642-668**：

  ```ts
  let endExclusive = this.At;
  while (endExclusive < this.Units.length && !this.IsSymbol(this.Units[endExclusive], ";")) {
    endExclusive++;          // ← 只认 `;`：没有换行 ASI、也没有「下一条语句起点」这一档
  }
  ```

- 对比同文件 **BuildExpressionStatement:530-562** 已经接上 ASI：
  `:543 if (at > first && StatementBuilder.EndsAtLineBreak(this.Units[at-1], this.Units[at])) { asiEnd = at-1; break; }`
  ——**同一种「这条语句到哪结束」的问题，两条路径不同源**，这是本组（以及 G2）的唯一根因。
- 抛错点：`BuildExpressionRange`（`:162`，实现 `:157-176`）在交给 `ExpressionBuilder` 的区间里发现残留单元。

### 用户五问（G1）

- **正确的应该什么时候 build**：变量语句在四档之一结束——`;`（已有）、**换行 + 前一单元能收住表达式 + 下一单元接不上**
  （缺）、块体/段末（已有）、EOF（已有）。与 `BuildExpressionStatement` **同一时机**。
- **build 时提取哪些信息**：`VariableDeclarationList` 只到 `endExclusive-1`（不含 `;`、不含换行 trivia）；
  每个声明提 `name` / `ExclamationToken` / `Type` / `Initializer`；`End` = 最后一个**非 trivia** 代码单元的 End。
- **什么时候 close**：`;`（`endExclusive` 现语义）、**新 ASI 边界（新增）**、段末（`this.Units.length`）。
- **close 时提取什么**：只提「最后一个代码单元」的 End 给 `Finish`；trivia 一律不进 End。

### 修复思路（S）

1. `BuildVariableStatement:658` 的循环加第二档（直接复用同文件已有的 `EndsAtLineBreak`）：

   ```ts
   while (endExclusive < this.Units.length && !this.IsSymbol(this.Units[endExclusive], ";")) {
     if (endExclusive > this.At && StatementBuilder.EndsAtLineBreak(this.Units[endExclusive - 1], this.Units[endExclusive])) {
       break;   // 换行 + 上一位能收尾 + 下一位接不上 ⇒ 变量语句在此收口
     }
     endExclusive++;
   }
   ```

2. 但要先判「声明列表还没写完」：`const a = 1,` + 换行 `b = 2`、`const a: T` + 换行 `= 1`、
   `declare const o: {…}` 的类型里换行，都不能断。判据建议与 `BuildExpressionStatement` 一样叠
   `ContinuesAcrossLine(next)`（`:589`）+「不是 `,` / `=` / `=>` / `|` / `&` / `:` 这类声明续接符」。
3. 收紧 `endExclusive` 之后，`BuildVariableDeclarationList` 的初始化表达式自然不再越界，**G1 五份一起绿**。

### 回归风险面（G1）

- `typescript/cases/*.ts` 里所有 `let/const/var` 相关构造（当前 4806 条全绿）：重点回归
  `const a = 1, b = 2`、`let a: T = v`、`for (let i = 0; ...)`（`for` 头用的是同一 builder）、
  `declare const x: T`（ambient，`declare` 分支在 `ScanRoot` 侧另有判据）、以及换行后的 `= 1` / `? :` / `.` 续接。
- 与 **O 组（`;` 归谁）** 交界：`const a = 1\n;` 这种「下一行以 `;` 开头」必须仍把 `;` 归本条语句
  （`EndsAtLineBreak` 判据里要放行 `;`），否则会把 `;` 留给空语句、位置漂一格。
- 与 **declarations/types 组共用**：类型注解的收口（`:633` 那条抛错）与 G4 是同一个「类型扫描不认 ASI」判据，
  两边修法要一致，建议**先 G1 后 G4**，共用一个新的 `StatementBuilder.EndsTypeAtLineBreak`。

## 3. G2（1 份）`return` 的表达式区间不吃换行

- **文件**：`statements/stmt-unreachable-after-return.ts`，行 3–6：
  `function f() {` / `  return 1` / `  g()` / `}`（期望 `Function,FunctionBody,Statement`）
- **最小复现**：`function f() {\n  return 1\n  g()\n}` → CRASH（`throw by line 0` ×2 → `表达式没有读完`）；
  对照 `return 1;` → OK；`return\n g()`（受限产生式）→ OK
- **崩溃链**：`BuildExpressionRange`（`statement-builder.js:131`）← `BuildReturnOrThrow`（`:925`）←
  `BuildStatement`（`:247`）← `BuildBlock`（`:422`）
- **根因**：`statement-builder.xl.md` **BuildReturnOrThrow**（`:1040` 的
  `this.BuildExpressionRange(this.At, endExclusive)`）：`endExclusive` 只按 `;`/段末算，`return 1\n g()` 的
  表达式区间把 `g()` 也包进去 → 残留单元。同 G1 的判据缺失，只是入口不同。
- **§6**：end compute 不对。**难度 S**。
- **修复**：与 G1 同一个 `EndsAtLineBreak` 判据，在 `BuildReturnOrThrow` 求 `endExclusive` 处加一档；
  `return`/`throw` 的**受限产生式**（关键字后换行即无操作数）已有（`:1052` 一带），新判据不得覆盖它。
- **风险**：`return (\n x )`、`return a\n + b`（续接符必须留在区间内）、`return` 在 `case` 里后跟 `}`。
  ast 构造里 statements 家族的 return 用例需要全量回归。
- **四问**：build 时机 = `;` / 换行 ASI / 段末；提取 = 操作数表达式 + `End` 取最后非 trivia 单元；close 同上；
  close 提取 = 只取 End，操作数在 build 时已成形。

## 4. G3（1 份）声明体的 `{` 写在下一行：ASI 误判 + 候选共存

- **文件**：`statements/gap-r929-label-body-brace-newline.ts`，行 11–16：
  `lbl: while` / `(a) { break lbl; }` / `iface: interface I` / `{ m(): void }` / `en: enum E` / `{ A }`
- **最小复现**（ddmin 4 行，实测）：`lbl: while\n(a) { break lbl; }\nen: enum E\n{ A }` →
  `CatalogGuide: 终结候选与其它候选同时成立（宿主 SourceFileShape，下标 9）`。
  更小的单点复现：**`en: enum E\n{ A }` 本身就崩**（下标 7）；而 `en: enum E { A }`（同一行）、
  `iface: interface I { m(): void }`（同一行）、`iface: interface I` + 换行 `{ … }` 在**当前 HEAD 已修**
  （→ `LabeledStatement`，说明 N 组上一轮修过 label+同一行的形态，**只剩「声明体 `{` 换行」这一档**）。
- **崩溃链**：`throw by line 0` ×2 → `CatalogGuide: 终结候选与其它候选同时成立（宿主 SourceFileShape，下标 9）`；
  栈 `catalog-guide.js:42`（看门狗）← 宿主 `SourceFileShape` ← `bracket.js:44`（`{` 关闭时触发重算）
- **两个候选是谁、为什么同时成立**（dist 侧插桩实测，已还原）：
  ```text
  idx=9 host=SourceFileShape unit=Bracket  alive=[StatementPossibleShape]
  ```
  - **`StatementPossibleShape`**：正持有被标声明 `en: enum E`（`ScanRoot` 的标签分支 → `ScanBody(code,2)` →
    `enum` → `ScanDeclarationBody` 在 `{` 上有 `Complete`），它需要这一格 `{ A }` 当**声明体**；
  - **`SourceFileEndPossibleShape`**：在同一个 `{` 上 `Accept`——因为 `IsAsiBoundary`
    （`expression-statement-possible-shape.xl.md:293-351`）判出「换行 + 前一位 `E` 能收住表达式 + 当前 `{` 不是延续符」，
    它的规则 5（语句头是不是声明关键字）**从段首往回走 basic token**，而 `en: enum E` 的段首是**标签名 `en`**
    ⇒ 查不到 `enum` ⇒ 判成普通表达式语句的 ASI 边界。
  - 于是「终结候选 Accept + Candidates>0」→ 看门狗抛错（`core/syntax/catalog-guide.xl.md` 的契约，**不能改**）。
- **§6**：**end compute 不对**（终结候选的 ASI 判据在「被标声明的声明体 `{`」处误判）；次类 possible compute 不对。
- **收紧还是让位？** —— 应当**收紧终结判据**，不是让 `StatementPossibleShape` 让位：
  被标声明必须由 `StatementPossibleShape` 建成 `LabeledStatement(EnumDeclaration)`（TS 的 AST 就是这么写的：
  `LabeledStatement+Identifier+EnumDeclaration+…`），让位会给不出正确的 AST。收紧方式二选一：
  1. `IsAsiBoundary` 的规则 5 在「往回找段首」时**跳过标签头**（`标识符 :`），再看是不是
     `class/interface/enum/namespace/module/type/declare/abstract` 等声明头；
  2. 或判定 `current` 是 `{` 且「段首是声明关键字（含跳过标签头之后）」→ 返回 false（声明体不是 ASI 边界）。
  建议同时加一条**子判据**：`current` 是 `{`、且段首声明关键字是 `enum/interface/class/namespace/module` 时，
  **换行不是边界**（这些声明体必须跟 `{`）。
- **难度 M**；**回归风险**：`IsAsiBoundary` 是「解析期（候选 Reject）」与「收尾期（终结候选 Accept）」**共用**的判据
  （见 `source-file-end-possible-shape.xl.md:48`），动它会同时影响：`if (a) b` 换行 `{}`、`class C` 换行 `{}`、
  `interface I` 换行 `{}`（这些**必须仍是同一条声明**）、以及 `f()\n{}`（这些**必须是两条**）。
  所以必须同时钉住这四类对照组，且**先跑全量 ast（4806）再跑 token 语料**。
- **四问**：build 时机 = 声明体 `{` 到达时（不是换行处）；build 提取 = 标签名 + 被标声明形状；close = 体括号收口；
  close 提取 = `End` 到 `}`；trivia 不进 End。

## 5. G4（1 份）函数声明的返回类型跨过换行

- **文件**：`statements/expr-generic-inst-statement.ts`，行 6–7：`declare function f<T>(): T` / `f<string>;`
- **最小复现**：`declare function f<T>(): T\nf<string>;` → CRASH（`throw by line 0` → `函数声明的返回类型没有读完`）；
  对照：`declare function f<T>(): T;\nf<string>;` → OK `FunctionDeclaration+ExpressionStatement`
- **崩溃链**：`function-declaration-shape.js:156`（`函数声明的返回类型没有读完`，
  对应 `function-declaration-shape.xl.md:197`）← `function-declaration-possible-shape.js:309`
  （`BuildByIndex` → `FunctionDeclarationShape.FromUnits`，`function-declaration-possible-shape.xl.md:316`）
  ← `catalog-guide.js:66`（唯一候选 Build）
- **根因**：函数声明候选把「声明头 + 参数表 + `: 返回类型`」整段交给
  `function-declaration-shape.xl.md` 的构建器；构建器取返回类型的单元区间时**只按语法完整性**收，
  不认「换行 + 下一句起点」——`T` 与 `f<string>` 在单元序列里相邻，返回类型扫描把 `f<string>` 也读进去。
  与 **G1 的 `类型注解没有读完`（`:633`）是同一个判据**（类型扫描不认 ASI）。
- **§6**：end compute 不对。**难度 M**（与 types/declarations 组共用）。
- **修复**：给类型读取加统一出口 `StatementBuilder.EndsTypeAtLineBreak(units, from)`（或 `TypeBuilder` 侧
  `static IsTypeBoundary`）：「上一个单元可以是类型结尾」×「换行」×「下一个单元是语句起点（不是 `|` `&` `.` `<` `[` `?` `:` `=>` `=` 等类型续接符）」。
  三处调用点复用：变量声明类型注解（`:633`）、函数返回类型（`function-declaration-shape.xl.md:197`）、
  类型别名（`type-alias-declaration-shape.xl.md:165`）。
- **回归风险**：`let x: A\n| B = …`、`type T = A\n& B`、`function f(): A\n<B>()`（不可能）必须不被切断；
  多行类型字面量 `{\n a: string\n }` 不在此列（括号内）。ast 的 types/declarations 构造全量回归。
- **四问**：build 时机 = 类型语法完整 + 换行 + 下一句起点；提取 = 类型节点 + 类型 `End`（跳过尾随注释）；
  close = 同上；close 提取 = 只取 End。

## 6. G5（1 份）模块体内没有 import 声明分派

- **文件**：`ambiguous/am-declare-module-nested.ts`，行 3–8：
  `declare module "a" {` / `  import { B } from "b"` / `  export interface C {` / `    b: B` / `  }` / `}`
- **最小复现**：`declare module "a" {\n  import { B } from "b"` → CRASH `表达式没有读完`
  （ddmin 2 行；注意这是「模块体里只有一条 import」的最小形态，说明不是缺 `}` 引起的）；
  对照：`import { B } from "b";`（分号）→ OK `ModuleDeclaration`
- **崩溃链**：`statement-builder.js:131`（BuildExpressionRange）← `:456`（BuildExpressionStatement）←
  `:275`（BuildStatement）← `module-block-shape.js:548`（模块体循环 `inner.BuildStatement()`）
- **根因**：`module-block-shape.xl.md` 的模块体循环（`:548` 一带）用**根级的 `StatementBuilder.BuildStatement`**
  建体内语句，而 `BuildStatement` 的分派表里**没有 `import` / `export` 声明**（那是 root 的
  `ImportDeclarationPossibleShape` / `ExportDeclarationPossibleShape` 负责的）；于是 `import { B } from "b"`
  落到 `BuildExpressionStatement` → 表达式构建器读 `import` 后残留 `{ B } from "b"` → `表达式没有读完`。
  同理 `export interface C` 在模块体里也没有声明分派（只是这份文件先崩在 import 上）。
- **§6**：**缺少 possible**（模块体这一层没有 import/export 声明的候选/分派）。**难度 M**。
- **跨组共用根因**：与 **declarations 组的 import/export 收口**同源——root 的两个候选
  （`import-declaration-possible-shape` / `export-declaration-possible-shape`）需要能在「模块体」这个宿主里
  复用，或 `BuildStatement` 增 `import`/`export` 分派并调用 `ImportDeclarationShape.FromUnits` /
  `ExportDeclarationShape.FromUnits`（`module-block-shape.xl.md` 里已有 `BuildStatement` 的用法，最小改法是加分支）。
- **修复**：模块体循环里对首单元是 `import` / `export`（以及 `declare`）的语句，走声明构建器；
  或者把模块体的语句分派做成与 root 同一份表（推荐，避免两份分派表再次分叉）。
- **回归风险**：`declare module` 的 ambient 体（import/export/declare/interface/type/const 都要能建）、
  `namespace N { export const v = 1 }`（已有）、`declare namespace A { … }`（`am-export-equals-namespace` 已绿）。
- **四问**：build 时机 = 声明关键字到达（import 的 `from "…"` 到齐）；提取 = `ImportClause`/`ModuleSpecifier`；
  close = `;` / 换行 ASI / 模块体 `}`；close 提取 = End 到最后一个非 trivia 单元。

## 7. 跨组共用根因（给合并用）

| 共用根因 | 本批涉及 | 与哪些组共用 | 统一修点 |
| --- | --- | --- | --- |
| **ASI 语句边界判据「两个入口不同源」** | G1、G2 | declarations / types 组的「无分号语句收口」 | 把 `StatementBuilder.EndsAtLineBreak`（`:615`）作为唯一判据，`BuildVariableStatement` / `BuildReturnOrThrow` / `BuildExpressionStatement` 三处共用 |
| **类型扫描不认 ASI** | G4、G1 的 `ex-call-comment-before-args`（`:633`） | types / declarations 组（类型注解、类型别名、返回类型） | 新增 `EndsTypeAtLineBreak`，三个调用点复用 |
| **`;` 归谁（下一行以 `;` 开头）** | G1 的 ex-call-comment-before-args | 已修的 O 组（`gap-r942`）、以及 `;(() => 1)()` 这类空语句起始 | 边界判据里放行「下一个代码单元是 `;`」→ 归上一条语句 |
| **声明体 `{` 换行 + 被标声明** | G3 | 已修的 N 组（`label: interface I` 同一行）、以及 `class C\n{}` / `interface I\n{}` 的对照组 | `IsAsiBoundary` 的段首检测跳过标签头 + 认声明关键字 |
| **模块体/声明体里的语句分派表** | G5 | declarations 组的 import / export 收口 | 模块体复用 root 的声明分派表，不要第二份 |

## 8. 标记

| 文件 | TS-recovery？ | 用户决策？ | basic token？ |
| --- | --- | --- | --- |
| 9 份全部 | **否**（TS `parseDiagnostics = 0`，且 AST 不是恢复产物） | **否**（全部可在 `typescript/` 层解，不动 `core/**`） | **否**（`;` / `{` / `}` / 换行都在既有 token 能力内） |

唯一需要用户知道的是 **G3 的判据面**：`IsAsiBoundary` 是解析期与收尾期共用、且被已有 4806 条 ast 用例覆盖，
改它属于「共享判据」改动，建议单独一个 commit、先 ast 后语料。

## 9. 修复批次建议（预计读数变化）

| 批次 | 组 | 文件数 | 预计 crash 变化（全量 35） | 单独 commit？ |
| --- | --- | --- | --- | --- |
| **B1** | G1 + G2（同一判据） | 6 | 35 → **29**（目标 6 份全绿；同族未知名可能再降） | 是（S，收益最大） |
| **B2** | G4（类型扫描 ASI） | 1 | 29 → **28** | 是（与 types/declarations 组约定同一判据） |
| **B3** | G3（声明体 `{` + 标签头） | 1 | 28 → **27** | **是，单独一个 commit**（共享判据，回归面最大） |
| **B4** | G5（模块体声明分派） | 1 | 27 → **26** | 是（与 declarations 组合并时同一处） |

验收口径（每批都要）：该批目标 `node typescript/cases/token-ast.mjs <file>` 退出码 0；
全量 `token-ast.mjs --quiet` 的 crash/diff 只降、ok 只升、**0 份原 ok 变坏**（逐文件 pre/post 对比）；
`ast-json.mjs` + `ast-json-diff.mjs` 保持 **4806/4806、0/0/0**；`tsc` 0 error；`xl_check` 0 error（仅既有 W3102/W3103）。

## 10. 复现脚本（本轮用，未提交）

`tmp/probe9.mjs`：逐份打「行号原文 → ours 崩溃链+栈 → TS diags/kinds → 行级 ddmin 最小复现（要求最内层
消息一致）」。9 份的完整读数见本轮汇报。
⚠️ ddmin 只保证「消息一致」，个别最小片段可能引入第二种崩法（例如带前导缩进的残段）；
写文档/用例时以「独立可复现的最小片段」为准（上表给的都是独立片段）。
