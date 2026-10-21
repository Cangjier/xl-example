# 剩余失败分类与解决思路：declarations 组（19 个 crash）

> 只读分析。基线：主仓 `HEAD = 85daba1d`，克隆 `cover-gaps-decl`（分支同名），
> `xl_build core,typescript` → 0 error；`tsc` → 0；token 语料 1703 份。
> 口径：`build/ts` 的 `SourceFileRunner.Parse(src,"a.ts")` + `ts.createSourceFile` 对照（本组全部文件
> `parseDiagnostics = 0`，即 TS 侧全部合法，**都不是 TS-recovery**）。
>
> **数量校正**：任务书写「18 个 crash」，但列出的文件名逐一数下来是 **19 个**；实测这 19 份
> 在 `85daba1d` 上**全部 crash**。本文按实测 **19 份**归组（不凑数、不删减）。

## 0. 分组总表

| 组 | 数量 | 文件清单 | 共同根因一句话 | §6 主类 | 难度 | 能否一起修 |
| --- | --- | --- | --- | --- | --- | --- |
| **A 形参模式/默认值** | **9** | `declarations/decl-func-default-params.ts`、`decl-func-destructured-params-typed.ts`、`decl-func-destructured-params.ts`、`decl-func-optional-params.ts`、`decl-method-function-return.ts`、`decl-param-arr-pattern-comment.ts`、`decl-param-obj-pattern-comment.ts`、`fn-destructured-params.ts`、`fn-params.ts` | 形参 build 只给「带 `:`/`?:`/`...`」的组走 `ParseParameter`；`{…}`/`[…]` 模式与 `= 默认值` 落到「只认裸 Identifier」的兜底分支 | possible build 不对 | M | 可以（function 侧 8 份同点；class 侧 1 份同点不同文件） |
| **B 继承子句实体名** | **3** | `declarations/decl-heritage-tagged-template.ts`、`gap-r985-heritage-optional-chain.ts`、`gap-r985-heritage-template-expression.ts` | `HeritageClauseShape.BuildClauses` 的「表达式承载」判据只认括号 / `.` / `(`；`?.` 与模板串（`String` 基本 token）掉进「只读名字」分支 | possible build 不对 | S | 可以（同一处三支） |
| **C 声明头装饰器** | **3** | `declarations/decl-interface-decorator-modifiers.ts`、`decl-namespace-decorator-modifiers.ts`、`decl-type-alias-decorator.ts` | 只有 class 候选认 `@` 前缀；interface / namespace / type alias 的 possible 从 Stage 0 只认 `declare`/关键字 → `@` 落到表达式候选 | 缺少 possible | M | 可以（三处同构） |
| **D 孤立的上下文关键字** | **1** | `declarations/decl-standalone-declare-abstract.ts` | `declare`/`abstract` 被升级成关键字叶子后，表达式语句既不能当声明、也不能当 Identifier 收，EOF 兜底把 `;` 一起塞给 `requireSemicolon=false` 的入口 | possible compute 不对（次 **basic token**，需用户决策） | S~M | 单独一组（含 token 层决策） |
| **E `as` 类型实参后的裸 `,`** | **1** | `declarations/decl-obj-destructure-computed-key.ts` | 无分号、下一条语句紧跟时，初始化器扫顶层 `,`：`IsTypeArgumentStart` 走 `AngleJudge.CanStart`，其 follower 白名单不认「下一行语句首词」→ `<string, number>` 不被当类型实参段 → 在 `,` 处切断 | possible build 不对 | S | 单独（一处扫描判据） |
| **F 类型注解扫描跨行** | **1** | `declarations/destr-object-newline-after-keyword.ts` | 类型注解段终点只找 `=` / `,`，不以语句结尾为界（换行 + 下一条语句起点）→ 把下一行吞进类型 | possible build 不对（次 end compute 不对） | S | 单独（一处扫描） |
| **G module block 里的 import 声明** | **1** | `ambiguous/am-declare-module-nested.ts` | `ModuleBlockShape.BuildMember` 明确「`import x from "n"` 成员暂缓」→ 交 `StatementBuilder`，而 BuildStatement 无 import 分支 → 表达式语句兜底 | 缺少 possible（**属 modules/import 域，非 declarations**） | M | 单独，建议转 modules 组 |

合计 9+3+3+1+1+1+1 = **19**。

---

## A 形参模式 / 默认值（9 份）

**崩溃链（8 份函数形参 + 1 份类成员）**

```text
SyntaxException: throw by line 0 ---> SyntaxException: throw by line 0 ---> Error: 函数参数不是标识符     ×8
SyntaxException: throw by line 0 ---> SyntaxException: throw by line 0 ---> Error: 类成员参数不是标识符    ×1（decl-method-function-return）
```

**实测最小复现（都能独立复现，均 TS 合法）**

```text
function f(a = 1) {}                        → FAIL 函数参数不是标识符        （默认值）
function f({ a }) {}                        → FAIL 函数参数不是标识符        （对象模式）
function f({ a, b }, [c, d]) {}             → FAIL 函数参数不是标识符        （两种模式）
function f(a = 1, b = a + 1) {}             → FAIL 函数参数不是标识符
function f(a: number) {}                    → OK   （纯类型能过，说明不是类型位问题）
```

**根因（读代码确认）**

- `typescript/tokens/declarations/function-declaration-shape.xl.md:304-382` `static BuildParameters`：
  逐组 `ParseParameter` 的门槛是 `typed || headIsRest`（:326-339），`typed` 只由「名字后面紧跟 `:` / `?` / `?:`」判定；
  其余组落到 :355-357 `if (!(nameUnit instanceof Common)) throw new Error("函数参数不是标识符")`。
  于是 ① 形参名是 `{`/`[` 括号单元 → 直接 throw；② `a = 1` 被拆成「先建 Identifier `a`」，下一轮看到 `= 1` 又不是 Common → 同一个 throw。
- class 侧同一逻辑在 `typescript/tokens/declarations/class-declaration-shape.xl.md:430-499`（`BuildMemberParameters`）：
  `typed` 门槛 :479-494、抛错 :497；`{ a, b }, [c, d]` / `options: { once?: boolean } = {}` 都落进同一兜底。
- 参数形状本身没问题：`typescript/tokens/types/parameter-shape.xl.md` / `parameter-possible-shape.xl.md` 已能装
  Pattern 名与 Initializer；缺的是 build 时**没有把这两类组路由进 `ParseParameter`**。

**修复思路（when build / extract / close）**

- **何时 build**：形参表 `)` 括号单元闭合那一刻（现在就是这时点，时点不用改）。
- **build 提取什么**：每个形参组提取 `DotDotDot`、名字（Ident 或嵌套 `Array/ObjectBindingPattern`）、
  可选 `?`、类型、默认值 initializer。做法：把 `typed || headIsRest` 扩成
  `typed || headIsRest || headIsBindingPattern(Bracket) || groupHasEquals`，其中 `groupHasEquals` 时先
  `ParseParameter` 再把 `= Expr` 交给表达式构建器（或直接让 `ParseParameter` 吃 `=` 之后的一段）。
- **何时 close**：每个 `ParameterShape` 在自己那一段单元结束处 close；参数表闭合并进外层声明后不再追加。
- **close 提取什么**：区间（首单元 → 类型/默认值末单元，不含 `,`）、`Pos`（含前导 trivia）、Parent；
  `Data` 只剩 AST 子节点（DotDotDot / PropertyName / BindingName / Initializer）。

**逐文件**

| 文件 | 行号 + 原文片段 | 最小复现（实测） | 根因位置 | §6 | 难度 | 回归风险面 | 决策/备注 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `decl-func-default-params.ts` | :3 `function f(a = 1, b = a + 1) {` | `function f(a = 1) {}` | function-declaration-shape:304-382（:357） | possible build 不对 | M | 函数声明/方法形参全语料；`parameter-shape` 消费方 | 否 |
| `decl-func-destructured-params-typed.ts` | :3 `function f({ a, b }: { a: number; b: number } = { a: 0, b: 0 }) {` | `function f({ a }) {}` | 同上 | 同上 | M | 同上 + TypeLiteral 参数 | 否 |
| `decl-func-destructured-params.ts` | :3 `function f({ a, b }, [c, d]) {` | `function f({ a, b }, [c, d]) {}` | 同上 | 同上 | M | 同上 | 否 |
| `decl-func-optional-params.ts` | :4 `function fmt(a?: string, b: number = 2, c = 3) {` | `function f(a = 1) {}` | 同上（可选本身 OK，`=` 触发） | 同上 | M | 可选参数 + 默认值组合 | 否 |
| `decl-param-arr-pattern-comment.ts` | :3 `function g(/*c*/ [c]) { return c }` | `function g(/*c*/ [c]) { return c }` | 同上（模式 + 前导注释） | 同上 | M | 注释型 trivia 位置 | 否 |
| `decl-param-obj-pattern-comment.ts` | :3 `function f(/*c*/ { b }) { return b }` | `function f(/*c*/ { b }) { return b }` | 同上 | 同上 | M | 同上 | 否 |
| `fn-destructured-params.ts` | :3 `function f({ a, b }: Options, [c, d]: number[], { e = 1 } = {}): void {}` | `function f({ a }) {}` | 同上 | 同上 | M | 同上 + rest/默认值混合 | 否 |
| `fn-params.ts` | :3 `function f(a: number, b: string = "x"): void {` | `function f(a = 1) {}` | 同上 | 同上 | M | 同上 | 否 |
| `decl-method-function-return.ts` | :6 `on(fn: (payload: T) => void, options: { once?: boolean } = {}): () => void {` | `class E<T> { on(fn: (payload:T)=>void, options: {once?: boolean} = {}): () => void {} }` | class-declaration-shape:430-499（:497） | possible build 不对 | M | 类成员/方法参数；`ParseParameter` 共用 | 否 |

**预计读数**：修好 A 一次 **−9 crash / +9 ok**（token 1648→1657 量级），是本组最大单点。

---

## B 继承子句实体名（3 份）

**崩溃链**：`Error: 缺少标识符`（3 份一致，无 SyntaxException 外包）。

**实测最小复现**

```text
class D extends tag`t` {}        → FAIL 缺少标识符
class D extends a?.b {}          → FAIL 缺少标识符
class D extends `a${X}b` {}      → FAIL 缺少标识符
class D extends a.b {}           → OK
class D extends B {}             → OK
```

**根因（读代码确认）** `typescript/tokens/members/heritage-clause-shape.xl.md`：

- :145 `if (headUnit instanceof Bracket || startsWithAccess || genericCall)` —— `startsWithAccess` 的判据
  （:98-107）只看两种后继：第二单元是 `.`、或第二单元是 `(` 括号。**`?.` Symbol 与「反引号开头的 `String`」都不在列**。
- 因此三支都走 else 分支 :177 `const name = builder.ParseName();`：
  - `` tag`t` ``：先读 `tag` 成功，下一轮 `headUnit` 是 `String`（非 Common/Bracket/Symbol），仍走 else →
    `TypeBuilder.ParseName()`（`typescript/tokens/types/type-builder.xl.md:1780`）抛「缺少标识符」；
  - `a?.b`：先读 `a`，下一轮 `headUnit` 是 `?.` Symbol → 同一处抛错；
  - `` `a${X}b` ``：`headUnit` 直接是 `String` → 同一处抛错。

**修复思路**

- **何时 build**：`extends` / `implements` 之后「一项」的整段到齐时 build `ExpressionWithTypeArguments`。
- **build 提取什么**：表达式（Identifier / PropertyAccess（含 `?.`）/ TaggedTemplate / 模板串）与类型实参；
  `?.` 与 `String` 必须交给 `ExpressionBuilder`（折链唯一算式是 `print-ast-common` 的 `projectExpression`），
  不能自己拼名字。做法：把 `startsWithAccess` 扩成「headUnit/第二单元是 `String` 或第二单元是 `?.`」
  （判据问「这一格是什么」，不要问 `{` 是什么——与 round1237 同一条经验）。
- **何时 close**：该项整段到齐后 close，再收 HeritageClause（`extends A, B` 的 `,` 是列表分隔）。
- **close 提取什么**：`expression` 子节点 + 类型实参子节点；区间到表达式末单元（含 `>`）。

**逐文件**

| 文件 | 行号 + 片段 | 最小复现 | 根因位置 | §6 | 难度 | 回归风险 | 决策 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `decl-heritage-tagged-template.ts` | :8 `class D extends tag`t` {}`、:9 `class E implements tag`t` {}` | `class D extends tag`t` {}` | heritage-clause-shape:98-107 / :145 / :177 → type-builder:1780 | possible build 不对 | S | 继承子句全语料（class/interface extends/implements）；`A.B<C>` 路径 | 否 |
| `gap-r985-heritage-optional-chain.ts` | :5 `class D extends a?.b {}`、:6 `class E implements a?.b {}` | `class D extends a?.b {}` | 同上 | 同上 | S | 同上 + 可选链表达式投影 | 否 |
| `gap-r985-heritage-template-expression.ts` | :4 `class D extends `a${X}b` {}` | `class D extends `a${X}b` {}` | 同上（headUnit 是 String） | 同上 | S | 同上 + 模板串投影 | 否 |

**预计读数**：−3 crash / +3 ok。三份是同一处三个分支，一次改完。

---

## C 声明头装饰器（3 份）

**崩溃链**：`Error: 不支持的表达式起点`（3 份一致）。

**实测最小复现**

```text
@dec export declare interface I {}   → FAIL 不支持的表达式起点
@dec export declare namespace N {}   → FAIL 不支持的表达式起点
@dec export type T = number          → FAIL 不支持的表达式起点
@dec class C {}                      → OK      ← 只有 class 候选认 `@`
```

**根因（读代码确认）**

- `@` 是 `Symbol`，根级候选里只有 class 的 possible 有「装饰器前缀」路径；三处声明的 possible 从 Stage 0 起只认
  `declare` / 声明关键字：
  - `typescript/tokens/declarations/interface-declaration-possible-shape.xl.md:81-95`（Stage 0 只 `declare`/`interface`）
  - `typescript/tokens/declarations/type-alias-declaration-possible-shape.xl.md:88-110`（同构）
  - `typescript/tokens/declarations/module-declaration-possible-shape.xl.md:138+` `ComputeByIndex`（namespace/module 同构）
- `@` 不被任何声明候选接住 → 落进表达式语句候选 → `typescript/tokens/expressions/expression-builder.xl.md:2154`
  `throw new Error("不支持的表达式起点")`（`@` 不是表达式起点）。

**修复思路**

- **何时 build**：`@dec …` 前缀之后、声明关键字到齐且声明体闭合时 build 整条声明（与 class 现有做法一致）。
- **build 提取什么**：装饰器列表（`@` 到装饰器表达式末）、`export`/`declare`/`abstract` 等修饰词、声明关键字、
  名字、剩余部分（interface/namespace 是 `{…}` 体，type alias 是 `= 类型`）。
- **何时 close**：声明整条到齐后 close；装饰器是 `modifiers` 的第一个子节点、`Pos` 从 `@` 起（TS 口径）。
- **close 提取什么**：`modifiers` 顺序（Decorator / ExportKeyword / DeclareKeyword…）+ 声明自身 children。

**逐文件**

| 文件 | 行号 + 片段 | 最小复现 | 根因位置 | §6 | 难度 | 回归风险 | 决策 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `decl-interface-decorator-modifiers.ts` | :8 `@dec` 起，:9-11 `declare function dec(target: any): any;` + `@dec export declare interface I {}` | `@dec export declare interface I {}` | interface-declaration-possible-shape:81-95；expression-builder:2154 | 缺少 possible | M | interface 声明候选；`export/declare/abstract` 修饰链 | 否 |
| `decl-namespace-decorator-modifiers.ts` | :7 `@dec`，:12 `@dec export declare namespace N { … }` | `@dec export declare namespace N {}` | module-declaration-possible-shape:138+；同上 | 缺少 possible | M | namespace/module 声明；modifiers 投影 | 否 |
| `decl-type-alias-decorator.ts` | :7 `@dec export type T = number` | `@dec export type T = number` | type-alias-declaration-possible-shape:88-110；同上 | 缺少 possible | M | type alias 候选；TypeAssign 投影 | 否 |

**预计读数**：−3 crash / +3 ok，建议三处一起改（同一判据：Stage 0 前先吃 `@` 前缀，并且 `BuildByIndex` 把装饰器
放进 `modifiers`）。

---

## D 孤立的上下文关键字 `declare` / `abstract`（1 份）

**崩溃链**：`Error: 表达式语句没有读完`（单层，无 SyntaxException 外包）。

**实测最小复现**

```text
declare;          → FAIL 表达式语句没有读完
abstract;         → FAIL 表达式语句没有读完
declare x;        → FAIL 表达式语句没有读完
abstract x;       → FAIL 表达式语句没有读完
declare\nx;       → FAIL（换行也救不了）
foo;              → OK      ← 同一个入口，普通标识符没问题
```

**根因（读代码确认，两层）**

1. `declare` / `abstract` 是上下文关键字：`typescript/tokens/statements/statement-builder.xl.md:238-256`
   的 `declare` 分支要求「后面紧跟变量关键字」才按声明建，否则 `@` 以下的路径继续下坠；表达式构建器的
   keyword 叶子路径（`typescript/tokens/expressions/expression-builder.xl.md` 里 `MakeKeywordLeaf` 一带）把
   `declare`/`abstract` 提成**关键字叶子**，它既不是 Identifier 也不是表达式起点。
2. 无分号到 EOF 时 `typescript/tokens/files/source-file-end-possible-shape.xl.md:154-185` 的 EOF 兜底把
   「最后一个真实代码单元」（这里就是 `;`）一起交给 `ExpressionStatementShape.FromUnits(..., requireSemicolon=false)`
   （`typescript/tokens/statements/expression-statement-shape.xl.md:36-72`，:71 抛错）：表达式读完 `declare`
   还剩 `;` → 「表达式语句没有读完」。

**修复思路**

- **何时 build**：单条语句到 `;` / EOF 时 build（现在就是）。
- **build 提取什么**：能接上声明就按声明建（现有 `declare` + 变量关键字分支）；接不上时应当按
  `Identifier` 表达式建（TS 的恢复形就是 `ExpressionStatement(Identifier)`）。
- **何时 close**：语句到齐后 close；EOF 收口时不应把 `;` 当表达式内容（或先剥离 `;`）。
- **close 提取什么**：`ExpressionStatement(Identifier)`；`End` 到标识符末单元（`;` 不投影）。
- **两个可选修法**：① 纯 `typescript/` 层兜底：EOF/ASI 兜底路径在 `requireSemicolon=false` 时先剥尾 `;`，
  且表达式层把「孤立的 declare/abstract」当 Identifier（与 `foo;` 同路）；② 按用例注释「不升级成 Keyword」
  在 **basic token** 层解决 → 按 IMPORTANCE 3.1 **交用户决定**（会动 `core/syntax/basic-tokens/`，本组不动）。

**逐文件**

| 文件 | 行号 + 片段 | 最小复现 | 根因位置 | §6 | 难度 | 回归风险 | 决策 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `decl-standalone-declare-abstract.ts` | :3 `declare;`、:4 `abstract;`（另 :5-:8 组合变体） | `declare;` / `abstract;` | statement-builder:238-256；source-file-end:154-185；expression-statement-shape:36-72（:71）；expression-builder keyword 叶子 | possible compute 不对（次 basic token） | S~M | 所有以 `declare`/`abstract` 起头的 ambient 声明（`declare const/class/function`），以及 EOF 无分号语句 | **需用户决策**：是否允许 basic-token 层不升级 |

**预计读数**：−1 crash / +1 ok（若走 ① 纯 ts 层）。

---

## E `as` 类型实参后的裸 `,`（1 份）

**崩溃链**：`Error: 泛型实参缺少 >`（单层）。

**实测最小复现**

```text
const { [k]: v } = o as Record<string, number>
console.log(v)                                       → FAIL 泛型实参缺少 >
const { [k]: v } = o as Record<string, number>;
console.log(v)                                       → OK    ← 有分号就没事
const { [k]: v } = o as Record<string, number>       → OK    ← 单独一条也 OK
```

**根因（读代码确认）**

- 无分号 + 下一语句紧跟时，`const … = …` 这条声明的 `endExclusive` 一直延伸到文件末；
  `typescript/tokens/statements/statement-builder.xl.md:780-800` 的初始化器扫描按顶层 `,` 断句：
  `<` 只在「初始化器首单元」或 `IsTypeArgumentStart(...)` 为真时计深度（:790-795），
  而 `IsTypeArgumentStart`（同文件 :629-640）直接委派 `AngleJudge.CanStart`；
  `AngleJudge.CanStart` 的 follower 白名单（`typescript/tokens/types/angle-judge.xl.md` `FollowerAllows`）
  不认「下一行语句首词 `console`/`foo`」→ 判否 → `<string, number>` 里的 `,` 被当声明分隔符切断。
- 切出来的类型段是 `Record<string`，交给 `TypeBuilder.ParseTypeArguments`
  （`typescript/tokens/types/type-builder.xl.md:1758`）时读不到 `>` → 抛「泛型实参缺少 >」。

**修复思路**

- **何时 build**：变量声明整段到齐（`;` / 换行边界）时（现在也是）。
- **build 提取什么**：初始化器里 `as` / `satisfies` 之后的类型实参段必须按**强制配对**数角
  （`AngleJudge.FindPair`），不要用「类型实参起点」判据（后者要 follower，语句边界处必然判否）。
  即：见到 `as`/`satisfies` 后的 `<` 就用 `FindPair(units, index)` 的闭合下标跳过整段。
- **何时 close**：声明整段到齐后 close。
- **close 提取什么**：同普通变量声明；`End` 到初始化器末单元（不含尾随 trivia）。

**逐文件**

| 文件 | 行号 + 片段 | 最小复现 | 根因位置 | §6 | 难度 | 回归风险 | 决策 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `decl-obj-destructure-computed-key.ts` | :3 `const k = "a"`、:4 `const { [k]: v } = { a: 1 } as Record<string, number>`、:5 `console.log(v)` | 见上（objA/objC 实测 FAIL，objD 有分号 OK） | statement-builder:780-800 + :629-640 → angle-judge FollowerAllows；type-builder:1758 | possible build 不对 | S | 所有 `as`/`satisfies` 带泛型实参且语句无分号的语料；比较运算误判面（`a < b` 无配对 `>` 不受影响） | 否 |

**预计读数**：−1 crash / +1 ok。

---

## F 类型注解扫描跨行（1 份）

**崩溃链**：`SyntaxException: throw by line 0 ---> Error: 类型注解没有读完`。

**实测最小复现**

```text
const o: any
const b = 1;                → FAIL 类型注解没有读完
const o: any;
const b = 1;                → OK
declare const o: any
const
{ a, b: c, d = 1, ...rest } = o;   → FAIL 类型注解没有读完（本用例原文）
```

**根因（读代码确认）**

- `typescript/tokens/statements/statement-builder.xl.md:720-762` 的类型注解段扫描（:724-745）终点只找
  `=` / `,`（顶层），**不以语句结尾（`;` / 换行 + 下一句起点）为界**；声明没有 `;` 时 `endExclusive`
  已经是一整段语句列表的末尾，类型段把下一行语句吞进去，`TypeBuilder.ParseType()` 读完 `any` 还剩
  `const …` → :757 抛「类型注解没有读完」。

**修复思路**

- **何时 build**：变量声明整段到齐（`;` / 换行边界）时。
- **build 提取什么**：类型段必须限定在本声明内；终点判据加「语句边界」（`;`、下一语句起始、换行）。
- **何时 close**：声明整段到齐后 close。
- **close 提取什么**：名字 / 类型 / 初值三个子节点 + 区间 + `Pos`。

**逐文件**

| 文件 | 行号 + 片段 | 最小复现 | 根因位置 | §6 | 难度 | 回归风险 | 决策 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `destr-object-newline-after-keyword.ts` | :3 `declare const o: any`、:4 `const`、:5 `{ a, b: c, d = 1, ...rest } = o;` | `const o: any` ⏎ `const b = 1;` | statement-builder:720-762（:724-745 扫描、:757 抛错） | possible build 不对（次 end compute 不对） | S | 所有多行变量声明/类型注解；带泛型逗号的类型（已有 `<>` 深度） | 否 |

**预计读数**：−1 crash / +1 ok。

---

## G module block 里的 import 声明（1 份，**不属 declarations**）

**崩溃链**：`SyntaxException ---> SyntaxException ---> Error: 表达式没有读完`。

**实测最小复现**

```text
declare module "a" {
  import { B } from "b"
}
        → FAIL 表达式没有读完    （am-declare-module-nested 原文前 6 行即可）
```

**根因（读代码确认）**

- `typescript/tokens/declarations/module-block-shape.xl.md:104`：`import x from "n"` 形成员**明确暂缓**
  （「ImportDeclaration 没有 `FromUnits`，需要 import 侧改动」）。
- 于是 `ModuleBlockShape.BuildMember` 第 5 步（:108）把它交 `StatementBuilder.BuildStatement`，
  而 BuildStatement 没有 `import` 分支 → 落 `BuildExpressionStatement` → `BuildExpressionRange`
  （`typescript/tokens/statements/statement-builder.xl.md:178`）读不完 → 「表达式没有读完」。

**修复思路**

- **何时 build**：模块体里 `import … from "…"`（以及 `import "…"` / `import type …`）整段到齐时 build。
- **build 提取什么**：`ImportDeclaration` 的全部字段（`modifiers` / `importClause` / 模块说明符 / attributes）。
- **何时 close**：整条 import 到齐（`;` 或换行边界 / 块尾）后 close。
- **close 提取什么**：children 按 TS（ImportClause / StringLiteral / ImportAttributes）；`End` 到说明符末单元。
- 实现口径：给 `ImportDeclarationShape` 补 `FromUnits`（或给 ModuleBlock 一个 import 成员分支），
  不要走表达式语句兜底。

**逐文件**

| 文件 | 行号 + 片段 | 最小复现 | 根因位置 | §6 | 难度 | 回归风险 | 决策 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `ambiguous/am-declare-module-nested.ts` | :3 `declare module "a" {`、:4 `import { B } from "b"`、:5-7 `export interface C { b: B }` | 见上 | module-block-shape:104 + :108；statement-builder:178 | 缺少 possible（module/import 域） | M | `declare module` / namespace 体内 import 全族；ImportDeclaration 形状 | 建议**转 modules 组**，与 declarations 分开排期 |

**预计读数**：−1 crash / +1 ok（但属于 modules 批次）。

---

## 修复批次建议（按收益/风险排序）

1. **批次 1：B 继承子句（3 份，S）** —— `startsWithAccess` 加 `?.` 与 `String` 两档，单点、低风险、立等 +3 ok；
   与 round1237 的经验同源（判「这一格是什么」）。
2. **批次 2：A 形参模式/默认值（9 份，M）** —— 收益最大（−9 crash），但要同时改 function 与 class 两处 build；
   风险面是「所有函数/方法形参」，建议先写 2 条最小复现（`function f(a = 1) {}`、`function f({a}) {}`）
   再动，跑全量 token + ast:cases + ast:dts。
3. **批次 3：E + F 两处扫描（2 份，S）** —— 都在 `statement-builder` 同一文件：E 用 `FindPair` 处理 `as` 后的
   类型实参段；F 给类型注解扫描加语句边界。两处可同一提交，风险集中在多行声明/`as` 语料。
4. **批次 4：C 声明头装饰器（3 份，M）** —— 三处 possible 同构，互相独立；注意 `@dec class C {}` 已是绿的，
   不要改动 class 路径。
5. **批次 5：D 孤立上下文关键字（1 份）** —— 先确认走「`typescript/` 兜底」还是「basic token 不升级」；
   后者按 IMPORTANCE 3.1 **需用户决定**，不宜由修复者自定。
6. **批次 6：G module block import（1 份，M）** —— **转 modules/import 组**，不占 declarations 批次。

**总预计**：批次 1-5 = −15 crash / +15 ok（token 1648→1663 量级），G 另计 −1（跨组）；
按优先级做完 1-4 即 −15 ~ −17 中的 −14（B3 + A9 + E/F2 + C3 = 17，其中 E/F 各 1）——
实际以每组修完后的全量读数为准，逐组跑 `token-ast` + `ast:cases` + `ast:dts` 防止回归。
