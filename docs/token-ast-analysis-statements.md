# statements / ambiguous：57 份崩溃文件的 §6 归因

本文件回答一件事：`tests/cases/token/statements/**` 与 `tests/cases/token/ambiguous/**` 里
**57 份 AST 崩溃文件**各自属于 `typescript/IMPORTANCE.md` §6 的哪一类问题、根因在哪个 `*.xl.md` 的哪个方法、
以及「何时 build / build 提什么 / 何时 close / close 提什么」该怎么答。

**只读分析**：本轮没有改任何 `*.xl.md`、没有改 `tests/cases/**`、没有改 `core/**`、没有改 `package.json`。
探针脚本只在克隆的 `tmp/`（不提交）。diff 行（4 条）由另一个任务负责，本文不涉及。

- 克隆/分支：`C:\Users\Admin\Documents\GitHub\xl-example-set\cover-token-an-stmt`，分支 `cover-token-an-stmt`
- 构建读数：`xl build`（`paths:["core","typescript"]`）→ `859 written, 0 error(s), 2444 warning(s)`；
  `node node_modules/typescript/bin/tsc` → 退出码 0。

## 1. 基线读数

`tmp/token-ast-baseline.json` 按目录过滤（`statements` + `ambiguous`）：

```text
364 行；ok 303 / crash 57 / diff 4（diff 不在本文范围）
crash 57 行在克隆里逐条复现：57/57，首条错误消息与基线完全一致（无一条在克隆里「不再崩溃」）
```

探针口径与 Lead 的 `tmp/recon-token4.mjs`、`typescript/cases/ast-json.mjs` 相同：
`SourceFileRunner.Parse(source, file)`，失败时展开 `InnerException` 取最内层消息。

## 2. 分组总表

| 组 | 形态（一句话） | 条数 | 主类（§6） | 次类 |
| --- | --- | --- | --- | --- |
| **A** | **块体 / case 体里的语句之间没有分号时，语句不收口**，两条语句被当成一段表达式 | **23** | **end compute 不对** | 缺少 end（块内没有自己的收尾判据） |
| **B** | 语句已在 EOF 收尾，但**普通候选在 EOF 哨兵 / 尾随 trivia 上不定案**，撞上 `CatalogGuide` 的「终结候选与其它候选同时成立」 | **8** | **possible compute 不对** | end compute 不对 |
| **C** | **类型扫描越过了换行**（`declare const …: T` / `type X = T` / `x as T` / 返回类型），把下一行当成本类型的续体 | **7** | **end compute 不对** | 缺少 end |
| **D** | **泛型箭头 / `async` 泛型箭头**（`async<T>(x)=>x`、`<T,>(x:T)=>x`）没有可选形态 | **4** | **缺少 possible** | — |
| **E** | **类型实参列表带逗号**（`Map<string, number>`、`new Map<string, number>()`、`obj.m<string, number>(x)`）在声明 / `new` / 成员调用位失败 | **3** | **possible compute 不对** | — |
| **F** | **`do` 无块体**：体与 `while` 之间换行时体不收口 | **2** | **end compute 不对** | — |
| **G** | **`catch (e: unknown)` 形参带类型标注** | **2** | **possible build 不对** | 缺少 possible |
| **H** | **变量声明的明确赋值断言 `!`**（`let a!: number`） | **1** | **possible build 不对** | — |
| **I** | **`export as namespace A` 无分号**没有收口路径 | **1** | **缺少 end** | end compute 不对 |
| **J** | **`async(1);`**（`async` 当标识符 + 分号） | **1** | **possible compute 不对** | — |
| **K** | **类里的索引签名** `[k: string]: number` 被当 computed 成员名 | **1** | **possible compute 不对** | — |
| **L** | **前缀一号运算符的操作数写在下一行**（`a++; --\n a;`） | **1** | **end compute 不对** | — |
| **M** | **`if (a) /re/.test(x);` 里 `/` 被判成除号** | **1** | **basic token 存在问题（交用户决定）** | possible compute 不对 |
| **N** | **标签 + 声明体**（`iface: interface I {…}`） | **1** | **possible compute 不对** | — |
| **O** | **循环体后置 `;` 写在下一行**（`while (a) break\n;`） | **1** | **end compute 不对** | — |

按类合计：

| §6 类别 | 条数 | 组 |
| --- | --- | --- |
| end compute 不对 | **34** | A 23、C 7、F 2、L 1、O 1 |
| possible compute 不对 | **14** | B 8、E 3、J 1、K 1、N 1 |
| 缺少 possible | **4** | D 4 |
| possible build 不对 | **3** | G 2、H 1 |
| 缺少 end | **1** | I 1 |
| basic token 存在问题 | **1** | M 1 |
| **合计** | **57** | |

**一句话结论：57 条里 42 条（A 23 + B 8 + C 7 + F 2 + L 1 + O 1）都落在「语句/类型在哪里结束」这一侧——
不是 token 化的问题，也不是缺形状的问题。真正的「缺形态」只有 D（泛型箭头 4 条）；
真正需要动 basic token 的只有 M（1 条，且必须交用户决定）。**

## 3. 证据链（每组根因）

### A 组：块体 / case 体里的语句无分号时不收口（23 条，最大一组）

**症状**：`Error: 表达式没有读完`（个别文件最内层是 `语句没有读完`）。异常链固定两层
`SyntaxException: throw by line 0` → 业务错误。

**最小复现（克隆实测，改前 / 改后对照）**：

```text
{ a()
  b() }                    → CRASH 表达式没有读完
{ a();
  b(); }                   → OK  BlockShape[0,16]

while (x < 10) {
  f()
  x++ }                    → CRASH 表达式没有读完
while (x < 10) {
  f();
  x++; }                   → OK  WhileStatementShape[0,31]

switch (x) {
  case 1:
    f()
    break }                → CRASH 表达式没有读完
switch (x) {
  case 1:
    f();
    break; }               → OK  SwitchStatementShape[0,43]

do {
  f()
  x++ } while (x < 10)     → CRASH 表达式没有读完
function f() {
  return 1
  g() }                    → CRASH 表达式没有读完
function f() {
  return 1;
  g(); }                   → OK  FunctionDeclarationShape[0,34]
```

**按真实文件验证（`;` 插入到各语句行尾，其余不动）**：

```text
stmt-block-statements.ts   orig CRASH 表达式没有读完   → semi-inserted OK BlockShape
stmt-while.ts              orig CRASH                  → semi-inserted OK WhileStatementShape
st-switch.ts               orig CRASH                  → semi-inserted OK SwitchStatementShape
stmt-do-while-block.ts     orig CRASH                  → semi-inserted OK DoStatementShape
stmt-directive-use-strict-fn.ts orig CRASH              → semi-inserted OK FunctionDeclarationShape
stmt-asi-long-chain.ts     orig CRASH                  → semi-inserted OK（5 条平级语句）
am-declare-module-css.ts   orig CRASH                  → semi-inserted OK ModuleDeclarationShape
```

**根因定位**

1. 抛错点：`typescript/tokens/statements/statement-builder.xl.md` 的
   `BuildExpressionRange(first, last)`（约 157–176 行）：

   ```ts
   const value = builder.ParseExpression();
   if (builder.At !== builder.Units.length) {
     throw new Error("表达式没有读完");
   }
   ```

   这个错误**只有在「交给表达式构建器的一段单元里装了不止一条语句」时**才会出现——
   也就是说，是**语句边界的判定**把 `a()` 与 `b()` 划进了同一个区间，表达式构建器读完 `a()` 就看到残留单元。
2. 划边界的是 `typescript/tokens/statements/statement-scanner.xl.md`：
   `StatementScanner.ScanExpressionBody`（约 349–406 行）的停止集只有三种——
   `;`（Complete）、EOF 哨兵（Complete/`AtEOF` 兜底）、被 `}` 截断；**没有「换行即边界」这一档**。
   块体内部拿到的单元序列里既没有分号、也没有 EOF 哨兵（`}` 被 `Bracket` 自己吃掉），
   于是 `ScanExpressionBody` 一路 `NeedMore`，最终把整个块体当成一条语句。
3. 对照：**根层**（`SourceFileShape` 宿主）之所以正确，是因为根层另有一套 ASI 判据——
   `typescript/tokens/statements/expression-statement-possible-shape.xl.md:293`
   `static method IsAsiBoundary(units, tokenIndex)`，以及
   `typescript/tokens/files/source-file-end-possible-shape.xl.md:48-63`（终结候选与普通候选**读同一个函数**）。
   块体内部没有这条线：`StatementScanner` 既不调 `IsAsiBoundary`，也没有自己的「下一句起点」判据。
4. 为什么 `return`/`switch`/`do` 也一起中：它们的体/分支体最终都走 `StatementBuilder` + `StatementScanner`
   （`statement-builder.xl.md:244`、`685`、`1088`、`1200` 等处的 `new StatementBuilder(...)`），
   是**同一个扫描器**，所以 23 份文件共用一个根因。

**§6 归类**：**end compute 不对**（「这条语句到哪里结束」判错）；**次类 缺少 end**——
块体（`block-shape`、`while-body`、`case-block`、`module-block`）里没有任何终结候选，收尾完全靠扫描器，
所以它是「没有 end 这一侧的东西」，而不是「end 算错了」这么简单。两者都指向同一个修点。

**用户五问（A 组）**

- **正确的应该什么时候 build**：块体内**下一个代码单元与上一个代码单元之间有换行、且上一条语句的
  表达式已经完整**（`CanEndExpression` 成立）时，就在换行处把上一条语句 build 掉——
  与根层 `ExpressionStatementPossibleShape` 现有的 ASI 时机完全一致，不新增时机。
- **build 时应该提取哪些信息**：`first..last` 这一段单元（不含行尾 trivia、不含下一条语句的第一个单元）；
  起止用 `StatementBuilder.Finish` 已有的 `SignIn/SignOut`（`head` / `tail` 的 `SourceRange`），
  `Pos` 用 `Positions[first]`；trivia 只参与 `Pos`，不参与 `End`。
- **什么时候 close**：三条边界——`;`（已有）、**换行 + `CanEndExpression`（缺）**、`}`/EOF（已有）。
  注意 `return` / `throw` / `break` / `continue` 是受限产生式：换行在**关键字之后**就结束（`return\n1`
  等于 `return;` + `1`），这一档扫描器里已有（`ScanReturnOrThrow` 约 337–346 行），不要被新判据覆盖。
- **close 时应该提取哪些信息**：`End` = 最后一个**非 trivia** 单元的 `SourceRange.End`
  （`statement-builder.xl.md:149-151` 现在直接用 `tail`，在 `tail` 是尾随 trivia 时会多撑一格，
  与 `docs/end-close-analysis.md` 的 A 组是同一类毛病）；字段仍从子形状取；basic token 残留按白名单丢弃。

**修复建议（A 组，只动 `typescript/`，不动 `core/**`）**

- 在 `statement-scanner.xl.md` 的 `ScanExpressionBody` 里加一条停止判据：
  「当前单元是代码单元 && 与上一个代码单元之间有换行 && `ExpressionStatementPossibleShape.CanEndExpression(prev)`」
  → `Complete(at - 1)`。这样 A 组 23 条一次收口（`switch` case 体、`do` 体、module 体、函数体同源）。
- 判据必须**复用** `ExpressionStatementPossibleShape` 的 `CanEndExpression` / `IsAsiBoundary`（IMPORTANCE
  §3.4 要求 possible 与 build 读同一份状态），不要另写一张表，否则「`'use strict'` 后换行」、
  「`x++` 后换行」这类形态会二次分叉。
- 风险点（修的时候必须一起钉住的对照组）：`f()\n(x)`、`f()\n[0]`、`a\n+b` 这些**换行后仍属于同一条表达式**
  的形态不能被切断——`CanEndExpression(prev)` 只回答「prev 这个单元能不能是表达式结尾」，
  还要叠「下一个单元不能续接」（`(`、`[`、`.`、运算符等）这一半，等价于 `IsAsiBoundary` 的现有实现。
- 可能需要的用例：`typescript/cases/statements-block.ts` 新增块体 ASI 对照组（约 40 条）。

### B 组：EOF 处普通候选不定案，撞 CatalogGuide 的共存抛错（8 条）

**症状**：`Error: CatalogGuide: 终结候选与其它候选同时成立（宿主 SourceFileShape，下标 N）`，
N 就是 EOF 哨兵 `EndOfFileTokenShape` 的下标。

**最小复现（克隆实测）**：

```text
debugger                  → OK    DebuggerStatementShape[0,7]
debugger\n                → CRASH CatalogGuide: …（下标 2）          ← 尾随换行是触发条件
f()                       → OK    ExpressionStatementShape
f()\n                     → OK    ExpressionStatementShape          ← 表达式语句这条线是对的

while (x < 10) x++        → OK    WhileStatementShape[0,16]
while (x < 10) x++\n      → CRASH CatalogGuide: …（下标 7）

throw 1                   → OK    ThrowStatementShape[0,6]
throw new Error("x")      → CRASH CatalogGuide: …（下标 6）          ← 不需要尾随换行也崩
throw new Error("x")\n    → CRASH CatalogGuide: …（下标 7）
throw new Error("x");     → OK    ThrowStatementShape[0,20]          ← 加 ; 就好

if (a) f()                → CRASH CatalogGuide: …（下标 6）
if (a) f();               → OK    IfStatementShape[0,10]
if (a) f()\n              → CRASH CatalogGuide: …（下标 7）
while (x < 10) x++;       → OK    WhileStatementShape[0,18]
for (const v of xs) f(v)  → CRASH CatalogGuide: …（下标 6）
for (const v of xs) f(v); → OK    ForOfStatementShape[0,24]
done: f()                 → OK    LabeledStatementShape[0,9]
done: f()\n               → CRASH CatalogGuide: …（下标 6）
```

**两个触发条件（同一条根因的两种表现）**

- **B1 尾随 trivia**：语句本身已经收成形，但 `\n` 让候选集在 trivia 那一格**重新起了一个候选**，
  它一路活到 EOF；`SourceFileEndPossibleShape` 在 EOF 上 `Accept`，于是 `Candidates > 0 && EndPossible Accept` →
  按 IMPORTANCE §3.3 的设计当场抛错。证据：同一份源码去掉尾随换行就不崩（`debugger` / `while x++` / `done: f()`）。
- **B2 尾表达式还能续接**：`throw new Error("x")` / `if (a) f()` / `for (const v of xs) f(v)` 的最后一个单元是
  `)`，候选认为「还能接调用 / 成员访问」，在 EOF 这一格**既不 Accept-build 也不 Reject**，停在 Uncertain。
  证据：`throw 1`（最后一个单元是字面量，不可能续接）不崩；`while (x < 10) x++`（`++` 之后无可续接）不带尾随换行也不崩。

**根因定位**

- 抛错点：`core/syntax/catalog-guide.xl.md` 的「终结候选 Accept 且 `Candidates > 0` → 抛错」这一支。
  这是**契约的看门狗**，不是缺陷本身（IMPORTANCE §3.3 明确要求它抛）。
- 缺陷在**普通候选那一侧**：宿主配置的 13 个候选（`ImportDeclarationPossibleShape` … `ExpressionStatementPossibleShape`）
  里，除 `ExpressionStatementPossibleShape` 之外的那批**没有把 `EndOfFileTokenShape` 当作「不可能继续」**：
  - `typescript/tokens/statements/statement-possible-shape.xl.md`（`ComputeByIndex` 约 48–128 行；
    `StatementScanner` 的 `AtEOF` 由 `:75` `owner.SourceRange.End !== null` 决定，
    在「上一条语句刚成形 + 尾随 trivia」这条路径上 `AtEOF` 还没有被置上，于是 `NeedMore`）；
  - 各语句自己的候选（`throw-statement-possible-shape`、`if-statement-possible-shape`、
    `for-of-statement-possible-shape`、`while-statement-possible-shape`、`debugger-statement-possible-shape`、
    `labeled-statement-possible-shape`）在 EOF 哨兵上返回 `Uncertain` 而不是 `Reject`。
- 为什么 `ExpressionStatementPossibleShape` 能过：它的 ASI 判据
  （`expression-statement-possible-shape.xl.md:293 IsAsiBoundary` / `:533` 调用点）
  把「尾随 trivia + EOF」也算成边界，所以它自己会 `Accept`/`Reject`。**B 组的修法就是把这套判据给到其它候选。**

**§6 归类**：**possible compute 不对**（普通候选不知道「EOF 之后不可能继续」）；次类 end compute 不对
（`SourceFileEndPossibleShape` 在候选未灭时 Accept——但它按契约只能这样，改它等于改契约）。

**用户五问（B 组）**

- **什么时候 build**：语句成形的最后一格（`;` / `}` / 换行 ASI / **EOF 哨兵**）。B 组缺的正是最后一档。
- **build 时提取哪些信息**：不变——`SignIn` 已在关键字/首单元上，`End` 取最后一个**非 trivia** 代码单元；
  `if/for/while` 的体若是「无块体的单条语句」，体与头属于同一条语句，`End` = 体的 `End`。
- **什么时候 close**：`;`（已有）、换行 ASI（A 组的修法顺带覆盖）、**EOF 哨兵（B 组缺）**。
- **close 时提取哪些信息**：`End` 不取 `Last()`（尾随 trivia 会撑大）；`SourceFileEndPossibleShape`
  在 EOF 上取「最后一个非 trivia 单元」的 End（它现在已经这么做了，见 `source-file-end-possible-shape.xl.md:48-63`）。

**修复建议（B 组，只动 `typescript/`）**

- 在 `statement-possible-shape.xl.md` 的 `ComputeByIndex` 里补一条前置判据：
  「当前单元是 `EndOfFileTokenShape`，且本条语句的 `StatementScanner.Scan*` 已经 `Complete`」→ `Accept`；
  「未 Complete」→ `Reject`（明确把 EOF 当 Mismatch，别留给 `AtEOF` 兜底）。
- 六个语句候选的 `ComputeByIndex` 同样补 EOF 分支：`Accept`（体/表达式已成形）或 `Reject`。
- 顺带把 `StatementScanner.AtEOF` 的置位时机从 `owner.SourceRange.End !== null` 改成
  「`owner` 的单元序列里出现 EOF 哨兵」——现在这条判据依赖宿主闭合，时序不稳。
- **不要**改 `core/syntax/catalog-guide.xl.md` 的抛错：它是设计上的看门狗，改它会把 A/C/…各组的真错误一起吞掉。

### C 组：类型扫描越过换行（7 条）

**症状**：`类型注解没有读完`（4 条）/ `类型别名声明的类型没有读完`（1 条）/
`函数声明的返回类型没有读完`（1 条）/ `表达式没有读完`（`x as A` 后换行，1 条）。

**最小复现 + 隔离实验（克隆实测）**

```text
declare const xs: number[]
for (const x of xs) { break }        → CRASH 类型注解没有读完
declare const xs: number[]           → OK    VariableStatementShape[0,22]
const x: number                      → OK    VariableStatementShape[0,14]

type H = number
try { } catch { }                    → CRASH 类型别名声明的类型没有读完
type H = number;
try { } catch { }                    → OK    TypeAliasDeclarationShape[0,15] TryStatementShape[17,33]

const v = x as A
y = 2                                → CRASH 表达式没有读完
const v = x as A;
y = 2                                → OK    VariableStatementShape[0,16] ExpressionStatementShape[18,22]

declare function f<T>(): T
f<string>;                           → CRASH 函数声明的返回类型没有读完
```

**逐文件隔离（把文件里那条 `declare const …: T` / `type … = T` 行删掉，其余原样）**：

```text
stmt-empty-blocks.ts              original CRASH 类型注解没有读完 → 删 declare 行 OK（5 条语句全成形）
stmt-header-body-next-line.ts     original CRASH 类型注解没有读完 → 删 declare 行 OK（6 条语句全成形）
stmt-switch-comment-before-case.ts original CRASH 类型注解没有读完 → 删 declare 行 OK（SwitchStatementShape）
stmt-switch-inline-terminator-comment.ts 同上 → 删 declare 行 OK（两条 SwitchStatementShape）
```

**关键结论**：这 4 份文件的崩溃**与 switch / 循环体一点关系都没有**——它们只是文件头各带一行
`declare const a: number` / `declare const xs: number[]`；类型注解的扫描不认换行，把后面的整条语句
（`switch` / `for` / `while` …）当成了类型的一部分。同一份源码删掉那行就全绿。

**根因定位**

- 抛错点：`typescript/tokens/statements/statement-builder.xl.md:542`（`类型注解没有读完`）、
  `typescript/tokens/declarations/type-alias-declaration-shape.xl.md:165`、
  `typescript/tokens/declarations/function-declaration-shape.xl.md:197`，
  以及 `as` 类型那一支走到 `statement-builder.xl.md:173` 的 `表达式没有读完`。
- 共同点：**类型读取的停止集里没有「换行 + 下一句起点」**。类型层（`typescript/tokens/types/type-builder.xl.md`）
  的 `TypeBuilder` 读一个类型时只认「语法上完整的类型到哪结束」，不认 ASI；
  而变量声明 / 类型别名 / 函数签名这三处的外层（possible / statement-builder）也没有在换行处把类型切下来。
- 对照：参数位、返回值位在**括号内**是安全的（括号给出了硬边界），所以
  `function f(a: Map<string, Array<number>>) {}` 是 OK 的（见 E 组）；裸的 `declare const x: T` 没有边界，靠 ASI。

**§6 归类**：**end compute 不对**（类型这一段的结束判据不认换行）；次类 缺少 end。

**用户五问（C 组）**

- **什么时候 build**：类型读到「下一个代码单元与上一个之间有换行、且当前类型已经完整」时收口——
  即 `EndsType(prev)` × `HasLineBreakBefore(next)` × 下一句是语句起点。
- **build 时提取哪些信息**：类型节点 + 类型注解的 `End` = 最后一个**非 trivia** 类型单元的 End
  （`catch (e: unknown/*c*/)` 那种注释不能算进去，见 G 组同族问题）；
  `declare` 修饰符、`!`/`?` 标记各自单独提字段。
- **什么时候 close**：`;`（已有）、**换行 ASI（缺）**、`)`/`}`/`,`/`>`（括号已给出，已有）。
- **close 时提取哪些信息**：只提类型节点的区间与类型语法（`readonly` / `keyof` / 索引签名等），
  末尾 trivia 一律不进 `End`。

**修复建议（C 组，只动 `typescript/`）**

- 在类型读取的收口处加统一判据：「上一个类型单元可以是类型结尾」×「下一个代码单元前有换行」×
  「下一个单元是语句起点（不是 `|` `&` `.` `<` `[` `?` `:` `=>` 这类类型续接符）」→ 收口。
  三个调用点（变量声明 / 类型别名 / 函数签名）复用同一个 static 助手，别各写一张表。
  可放在 `type-builder.xl.md` 里做成 `static IsTypeBoundary(units, index)`。
- 顺带覆盖 `x as A` 与 `f<T>(): T` 两处（它们是 C 组同一个判据的另外两个入口）。

### D 组：泛型箭头 / `async` 泛型箭头没有形态（4 条）

**症状**：`箭头函数的参数只支持标识符` / `不支持的表达式起点` / `变量声明缺少标识符` /
`尖括号断言/泛型箭头缺少配对的 >`。

**最小复现（克隆实测）**

```text
const h = async<T>(x) => x;          → CRASH 箭头函数的参数只支持标识符
const h = async <T>(x: T) => x;      → CRASH 不支持的表达式起点
const f = async <T,>(x: T): Promise<T> => x;  → CRASH 变量声明缺少标识符
const g1 = <T,>(x: T) => x;          → CRASH 尖括号断言/泛型箭头缺少配对的 >
（对照组）const g2: <T>(x: T) => T = (x) => x;  → 该行在 stmt-adversarial-shapes.ts 里同样崩
```

**根因定位**

- `typescript/tokens/expressions/expression-builder.xl.md:756` 抛「箭头函数的参数只支持标识符」——
  说明箭头函数的**参数扫描路径只接受标识符**，`<T>` 类型参数根本没有入口；
- `expression-builder.xl.md:1812` 抛「尖括号断言/泛型箭头缺少配对的 >」——`<T,>`（尾逗号）在
  尖括号判定里没被当作类型参数表；
- `expression-builder.xl.md:2023` 抛「不支持的表达式起点」——`async` 后面跟 `<` 时，
  既没走 async 箭头、也没走尖括号断言，表达式起点表里没有这一档；
- `statement-builder.xl.md:512 / 520` 抛「变量声明缺少标识符」——`const f = …` 的初始化表达式
  在 `async` 处没收成形，回头当变量名看。

**§6 归类**：**缺少 possible**（这四种形态没有可选形状；不是判错，是压根没有候选接）。

**用户五问（D 组）**

- **正确的应该什么时候 build**：`=>` 出现之后（参数表 + 类型参数表都已闭合，箭头体的起点到达）才 build；
  `<T,>` 的尾逗号在**参数表闭合**那一刻就允许（TS 允许尾逗号）。
- **build 时应该提取哪些信息**：`TypeParameters`（`<T,>` 的 `,` 不进节点）、`Parameters`、`ReturnType`、
  箭头体的 `Body`；`async` 作为 `AsyncKeyword` 标记而不是表达式名。
- **什么时候 close**：箭头体是块时以 `}` 收；是表达式时以「表达式完整 + 语句边界」收（复用一个 A 组的判据）。
- **close 时提取哪些信息**：`End` = 体最后一个非 trivia 单元的 End；`ReturnType` 的 `:` 不投影。

**修复建议（D 组，只动 `typescript/`）**

- 在 `expression-builder.xl.md` 的箭头入口加「`<` → `TypeParameter` 列表 → `(`」这条路，
  尾逗号放行；`async` 与 `<` 之间允许空白/换行（TS 的 `async <T>(…)` 合法）。
- 这条对 `stmt-adversarial-shapes.ts` 是**附带影响**：该文件 24 行里只有第 9 行 `<T,>(x: T) => x` 崩，
  修 D 组后应整文件转绿（其余 23 行在探针里单独都是 OK 的）。

### E 组：类型实参列表带逗号（3 条）

**症状**：`泛型实参缺少 >`（`type-builder.xl.md:1665`）/ `变量声明里有无法识别的单元`（`statement-builder.xl.md:582`）。

**最小复现（克隆实测，注意逗号是分水岭）**

```text
const a = f<string>(1)                       → OK    VariableStatementShape
const a = obj.m<number>(x)                   → OK    VariableStatementShape
const b = a.b<string>(1);                    → OK    VariableStatementShape
const a = obj.m<string, number>(x)           → CRASH 变量声明里有无法识别的单元     ← 两个实参
const a = new Map()                          → OK
const a = new Map<string, number>()          → CRASH 变量声明里有无法识别的单元     ← 两个实参
let x: Array<Array<number>>                  → OK        （单实参、可嵌套）
let x: Foo<Bar<Baz>>                         → OK        （单实参、可嵌套）
let x: Map<string, number>                   → CRASH 泛型实参缺少 >                ← 两个实参
function f(a: Map<string, Array<number>>) {} → OK        （括号位有硬边界）
```

**结论：触发条件是「类型实参表里有逗号（多实参）」，不是嵌套层级、不是 `>>` 切分问题。**
（这一点纠正了「嵌套泛型 `>>` 需要拆 token」的直觉——`Foo<Bar<Baz>>` 全绿就是反证。）

**根因定位**：`<` 之后的类型实参扫描在「声明类型 / `new` / 成员调用」这三个位置把
**逗号当成了「尖括号内结束」之外的符号**，于是 `Map<string, number>` 只读了第一个实参、
剩下的 `, number>` 成了无法识别的单元：
`typescript/tokens/types/type-builder.xl.md`（泛型实参表读取，约 1600–1670 行，抛错点 1665）、
`typescript/tokens/statements/statement-builder.xl.md:582`（变量声明的残留单元检查）。
参数位能过是**因为括号给的类型边界让另一条路径接管了**（同一个 type-builder 的另一入口）。

**§6 归类**：**possible compute 不对**（`<` 的判定：能读单实参、不能读逗号分隔的多实参）。

**修复建议（E 组，只动 `typescript/`）**：在类型实参表的读取循环里把「`,` → 继续读下一个实参」
作为显式分支，直到配对的 `>`；三个入口（声明类型 / `new` / 成员调用的 `TypeArguments`）复用同一个函数。

### F 组：`do` 无块体的收口（2 条）

```text
do x++
while (x < 10)     → CRASH 表达式语句没有读完
do x++; while (x < 10);   → OK DoStatementShape[0,22]
do { } while (x < 10)     → OK DoStatementShape
```

**根因**：`statement-scanner.xl.md` 的 `ScanDo`（约 476–515 行）先 `ScanBody(code, at + 1)` 读体，
体的扫描器没有在「`x++` 后面的换行 + `while`」处收口（同 A 组缺换行判据），`whileAt` 找不到 →
落回 `表达式语句没有读完`（`expression-statement-shape.xl.md:71`）。
**§6 归类**：**end compute 不对**。修 A 组的换行判据后此组大概率连带转绿；`ScanDo` 需额外确认
「体后面的 `while` 关键字必须在同一条语句里」这一档不被新判据切断。

### G 组：`catch (e: unknown)`（2 条）

```text
try { } catch (e: unknown) { }              → CRASH catch 绑定没有读完
try { } catch (f) { }                        → OK    TryStatementShape[0,20]
try {} catch (e: unknown/*c*/) {}            → CRASH catch 绑定没有读完
try { } catch (e: unknown) { };              → CRASH（加分号也救不了）
```

**根因**：`statement-builder.xl.md:1227` 抛「catch 绑定没有读完」——catch 形参的读取只吃标识符，
`:` 之后类型那一段被留下。TS 允许 `catch (e: any | unknown)`（`parseDiagnostics = 0`，基线判为 crash 而非 ts-invalid）。
**§6 归类**：**possible build 不对**（候选接下了这条语句，build 时没把「`: 类型`」这段单元提取成 `type` 字段）；
次类 缺少 possible（若判定为「根本没有 catch-with-type 形态」，则主类换成缺少 possible，修法相同）。
修法：catch 绑定读取里加 `: Type` 分支，`End` 跳过尾部注释（与 `TypeDefineCloseRule` 同一处注释白名单）。

### H 组：明确赋值断言 `!`（1 条）

```text
let a!: number        → CRASH 变量声明里有无法识别的单元
let a!: number;       → CRASH（分号救不了）
let a! = 1            → CRASH
class C { x!: number } → OK    ClassDeclarationShape
```

**根因**：`statement-builder.xl.md:582`，变量声明的单元白名单里没有「`!`（明确赋值断言）」
这一格；类的字段位由另一条路径处理，所以 `x!: number` 反而 OK。
**§6 归类**：**possible build 不对**。修法：变量声明读取时把 `!` 当 `ExclamationToken` 提成字段
（TS 的 `VariableDeclaration.exclamationToken`），`End` 不含它。

### I 组：`export as namespace` 无分号（1 条）

```text
declare namespace A { … }
export as namespace A
export = A                      → CRASH 表达式语句没有读完
（三条都加分号）                  → OK ModuleDeclarationShape, EmptyStatementShape,
                                      NamespaceExportDeclarationShape[66,87], ExportAssignmentShape[89,99]
```

**根因**：`export as namespace A` 已经能成形（`NamespaceExportDeclarationShape` 在加分号后出现），
但**没有无分号（EOF / 换行）收口路径**：`source-file-end-possible-shape.xl.md` 的
`BuildTrailingDeclaration` 兜底分支里没有 `export as namespace`，落回
`ExpressionStatementShape.FromUnits` → `expression-statement-shape.xl.md:71` 抛「表达式语句没有读完」。
**§6 归类**：**缺少 end**（与 `docs/end-close-analysis.md` C1「`export =` 没有无分号收口」同族，同一个兜底表）。
修法：`BuildTrailingDeclaration` 增 `export as namespace` 分支，或给
`NamespaceExportDeclarationPossibleShape` 加 ASI/EOF 收口。

### J 组：`async(1);`（1 条）

```text
async (1)      → OK    ExpressionStatementShape[0,8]
async(1)       → OK    ExpressionStatementShape
async(1);      → CRASH 表达式语句没有读完      ← 只多了一个分号
async(1)\n     → OK
```

**根因**：`async` 后面紧跟 `(`、且整段以 `;` 结束时，`async` 被当成 async 箭头函数的头部
（`expression-builder.xl.md` 的 async 箭头入口）却没有 `=>`，而表达式语句那条路已经在 `)` 处让位；
`;` 到达时两边都不认这一格 → `expression-statement-shape.xl.md:71`。
**§6 归类**：**possible compute 不对**（async 箭头候选的 Reject 时机：`async (expr)` 后面没有 `=>` 时，
必须在 `)` 处 Reject，而不是把 `;` 留成孤儿）。修法：async 箭头候选在「`(` 闭合 + 下一格不是 `=>`」时 Reject。

### K 组：类里的索引签名（1 条）

```text
class C { static [k: string]: number; }   → CRASH computed 成员名没有读完
class E { readonly [k: string]: number; } → CRASH computed 成员名没有读完
```

**根因**：`typescript/tokens/declarations/class-declaration-shape.xl.md:692` 抛「computed 成员名没有读完」——
类体成员候选在 `[` 上一律走「computed 属性名」分支，没有先判「这是不是索引签名 `[k: T]: U`」。
（`typescript/tokens/types/index-signature-*` 这套形状存在，只是类体这一侧没接上。）
**§6 归类**：**possible compute 不对**（成员候选在 `[` 上的分支判定）。
修法：类体成员在 `[` 上先试索引签名（`[标识符 : 类型 ] : 类型`），失败再落 computed 名。

### L 组：前缀运算符的操作数在下一行（1 条）

```text
let a = 1; a++; --
a;                 → CRASH 表达式意外结束
if (a) { a++; } --
a;                 → CRASH 表达式意外结束
```

**根因**：`Statement.EndsOperand` 一类判据只问「上一个单元是不是运算符」，于是把 `--` 当成了
上一条语句的合格结尾（可以断句），断句之后 `--` 自己缺操作数 → `表达式意外结束`。
TS 的规则是：**前缀一号运算符不能作为语句结尾**（ASI 不在 `--` 前断句），它必须吞掉下一行的操作数。
**§6 归类**：**end compute 不对**。修法：`EndsOperand` 补「`--` / `++` / `!` / `~` / `typeof` / `void` / `delete` 这些
必须是前缀的单元不算结尾」；对应位置在 `typescript/tokens/statements/statement-scanner.xl.md`
的表达式体收尾判据里（与 A 组同一处判据，建议一起改）。

### M 组：`if (a) /re/.test(x);`——`/` 被判成除号（1 条，**basic token 场景，交用户决定**）

```text
x = /re/.test(y);            → OK    ExpressionStatementShape
if (a) /re/.test(x);         → CRASH 不支持的表达式起点
if (a) /re/.test(x)          → CRASH CatalogGuide: 终结候选与其它候选同时成立（下标 10）
```

**根因**：`/` 的 basic token 归属由**前一个 token** 决定：前一个是 `)` → 判成 `Symbol("/")`（除号），
于是 `if` 体的第一个单元是除号符号，`expression-builder.xl.md:2023` 抛「不支持的表达式起点」。
TS 的做法是在**表达式起点位置 re-scan**（`reScanSlashToken`）把 `/` 重新读成正则——
本仓的 basic token 只判一次、不支持 re-scan，所以这一格是**词法层（basic token）的归属问题**。

**§6 归类**：**basic token 存在问题**（主类；次类 possible compute 不对）。

**基本 token 场景清单（哪些场景、为什么是 basic token、交用户决定）**

| 场景 | 为什么是 basic token | 交用户决定的问题 |
| --- | --- | --- |
| 语句 / `if` 体 / `else` 体 / 循环体 / `return` 之后这类**表达式起点位置**上的 `/` | 与 `x = /re/`、`a / b` 的区别只在前一个 token：前一个是 `)` 或 `}` 时，本仓判成除号；TS 靠 parser 在表达式起点 re-scan 改判成正则 | 本仓是否允许「按 parser 位置重判 basic token」（即引入 re-scan / Reload）？若不允许，`if (a) /re/…` 这类形态就得**声明为不支持**，语料里的期望值要改；若允许，`RegexToken` 的判定入口需要新增一条「parser 在这些位置请求 re-scan」的通道（那是 `core/syntax/basic-tokens/` 的范围，AI 不得自行改） |
| （同类但本轮**未**崩，供用户一并拍板）`export default /re/;` 之后的 `/`、`do /re/.test(x); while(...)`、`case /re/.source:` | 同一条「前一个 token 判不过来」的规则 | 同上：re-scan 还是「声明不支持」 |

除 M 组外，本轮 57 条里**没有第二条**基本 token 场景：`>>` 的嵌套泛型已证伪（`Foo<Bar<Baz>>` 全绿），
尾随注释/空白撑大 `End` 是 close 时取值问题（见 A 组 close 一问），不是 trivia 基本单元的问题。

### N 组：标签 + 声明体（1 条）

```text
lbl: while
(a) { break lbl; }            → OK    LabeledStatementShape[0,28]
done: f()                     → OK    LabeledStatementShape[0,9]
iface: interface I
{ m(): void }                 → CRASH CatalogGuide: 终结候选与其它候选同时成立（下标 7）
iface: interface I { m(): void }   → CRASH CatalogGuide: …（下标 8）   ← 同一行也崩
en: enum E
{ A }                         → CRASH CatalogGuide: …（下标 7）
```

**根因**：标签后面跟**声明**（`interface` / `enum`）时，`LabeledStatementPossibleShape` 与
声明候选（`InterfaceDeclarationPossibleShape` / `EnumDeclarationPossibleShape`）**同时存活到 EOF**，
撞上 `CatalogGuide` 的共存抛错（B 组同一个看门狗，但这里的活口是标签语句候选）。
`statement-scanner.xl.md` 的 `ScanBody`（约 270–281 行）已经把声明关键字分派给 `ScanDeclarationBody`，
但**标签头的存在让「声明体是不是属于这条语句」这个判定没有归属**：
`ScanBody` 从标签名之后开始看，看到的第一个词是 `interface`，能分派；
可 `LabeledStatementShape` 自己不知道「标签后面允许声明」。
**§6 归类**：**possible compute 不对**（标签候选在声明体上不收口/不 Reject）。
修法：标签语句候选在「标签头之后是声明关键字」时把整条声明交给声明候选并自己 Reject；
或 `ScanBody` 对标签头跳过（本仓历史上叫 `SkipLabelHeads`）后再判声明体。

### O 组：循环体后置 `;` 写在下一行（1 条）

```text
while (a) break
;                      → CRASH 语句没有读完          （statement-possible-shape.xl.md:128）
while (a) break;
;                      → OK    WhileStatementShape + EmptyStatementShape
for (const x of y) continue
;                      → CRASH 语句没有读完
```

**根因**：`while (a) break` 已经成形，换行后那个 `;` 被当成**新语句的起点**（空语句），
但它又是上一条无块体语句的终结符（TS 的 `canParseSemicolon` 把下一行的 `;` 归给上一句），
两边都不认 → 外层壳的右端借不到那一格，`StatementPossibleShape` 一直 `NeedMore`。
**§6 归类**：**end compute 不对**（`;` 归谁：换行后以 `;` 开头时**不是**语句边界）。
修法：在 A 组的新边界判据里加一条例外：「下一行第一个代码单元是 `;` → 不是边界，`;` 归上一条语句」
（解析期与收尾期共用同一判据）。

## 4. 五问的统一回答（跨组）

- **正确的应该什么时候 build**
  语句/类型的**最后一格**只有四种：`;`、闭合的 `}`/`)`/`]`/`>`、**换行 ASI 边界**、**EOF 哨兵**。
  本目录 57 条里 40 条（A/C/F/L/O = 34 条，加上 B 的 EOF 一档）缺的是后两种。
  块体内部的语句与根层语句必须**同一时机**，不能一个走 `SourceFileEndPossibleShape`、一个走裸扫描器。
- **build 时应该提取哪些信息**
  起止只取 `SignIn(head)` / `SignOut(最后一个非 trivia 单元的 End)` + `Pos = Positions[first]`；
  字段从子形状取（语句体 / 表达式 / 类型 / 标签名 / catch 绑定 / 明确赋值断言 / 类型实参表）；
  trivia 只影响 `Pos`，**永不进 `End`**（本轮 A、C 两组的 `End` 问题都是这一条）。
- **什么时候 close**
  `;`（已有）、换行 ASI（缺，A/C/F/L/O）、EOF 哨兵（缺，B/I）、括号闭合（已有）。
  受限产生式（`return`/`throw`/`break`/`continue`）的换行在**关键字之后**就结束，这一档已有，别被新判据覆盖。
- **close 时应该提取哪些信息**
  最后一个**非 trivia** 代码单元的 `End`；字段全部在 build 时提完，close 只做白名单校验与 basic token 丢弃
  （IMPORTANCE §3.5）；类型注解/catch 绑定要跳过尾随注释。

## 5. 修复优先级建议

| 序 | 修点 | 覆盖组 | 条数 | 落点 | 是否动 core |
| --- | --- | --- | --- | --- | --- |
| P1 | 语句扫描器加「换行 + `CanEndExpression`」边界 | A（含 F 大半、L 的 `EndsOperand` 例外） | 23+ | `typescript/tokens/statements/statement-scanner.xl.md`（`ScanExpressionBody` 等）、`expression-statement-possible-shape.xl.md` 复用 `IsAsiBoundary` | 否 |
| P2 | 普通候选在 EOF 哨兵上 `Accept`/`Reject` | B、N | 8+1 | `statement-possible-shape.xl.md` + 6 个语句候选 | 否 |
| P3 | 类型读取的 ASI 收口（统一 `IsTypeBoundary`） | C | 7 | `types/type-builder.xl.md` / `statement-builder.xl.md:542` / `type-alias-declaration-shape.xl.md:165` / `function-declaration-shape.xl.md:197` | 否 |
| P4 | 类型实参表支持逗号 | E | 3 | `types/type-builder.xl.md`（约 1600–1670） | 否 |
| P5 | 泛型箭头 / `async <T>` 形态 | D | 4 | `expressions/expression-builder.xl.md`（756 / 1812 / 2023） | 否 |
| P6 | build 字段补齐（`!`、`catch (e: T)`、`export as namespace` 收口、`do` 体、`[` 索引签名、`async(1);`、`;` 归上一句） | G/H/I/J/K/O | 1+2+1+2+1+1+1 | `statement-builder.xl.md`（582 / 1227）、`source-file-end-possible-shape.xl.md`、`class-declaration-shape.xl.md:692` | 否 |
| P7 | `/` 在表达式起点位置的归属（re-scan） | M | 1 | **需用户决定**：`core/syntax/basic-tokens/` + `typescript/run/typescript-template.xl.md`（正则模板） | **是 → 需用户决定** |

**总体判断**：57 条里 **56 条可以只在 `typescript/` 层解**（不碰 `core/**`、不碰 basic token）；
只有 M 组 1 条涉及 basic token 的归属，必须交用户决定（要么引入 parser 侧 re-scan，要么把
`if (a) /re/…` 这类形态声明为不支持并改语料期望）。

## 6. 完整受影响文件清单（57/57，全部有归属）

### A 组（23）end compute 不对

```text
tests/cases/token/ambiguous/am-block-lambda-array-compound.ts
tests/cases/token/ambiguous/am-declare-module-css.ts
tests/cases/token/ambiguous/am-declare-module-nested.ts
tests/cases/token/statements/mut-stmt-asi-return-newline-expr-115.ts
tests/cases/token/statements/st-switch-block-case.ts
tests/cases/token/statements/st-switch.ts
tests/cases/token/statements/stmt-asi-long-chain.ts
tests/cases/token/statements/stmt-asi-postfix-then-continue.ts
tests/cases/token/statements/stmt-asi-return-newline-expr.ts
tests/cases/token/statements/stmt-block-statements.ts
tests/cases/token/statements/stmt-break.ts
tests/cases/token/statements/stmt-continue-label.ts
tests/cases/token/statements/stmt-continue.ts
tests/cases/token/statements/stmt-directive-use-strict-fn.ts
tests/cases/token/statements/stmt-do-while-block.ts
tests/cases/token/statements/stmt-switch-block-scoped-case.ts
tests/cases/token/statements/stmt-switch-complex-case.ts
tests/cases/token/statements/stmt-switch-default-first.ts
tests/cases/token/statements/stmt-switch-default-middle.ts
tests/cases/token/statements/stmt-switch-fallthrough.ts
tests/cases/token/statements/stmt-switch-no-braces-body.ts
tests/cases/token/statements/stmt-unreachable-after-return.ts
tests/cases/token/statements/stmt-while.ts
```

### B 组（8）possible compute 不对

```text
tests/cases/token/statements/st-throw.ts
tests/cases/token/statements/stmt-debugger.ts
tests/cases/token/statements/stmt-for-of-no-block.ts
tests/cases/token/statements/stmt-if-no-block.ts
tests/cases/token/statements/stmt-label-statement.ts
tests/cases/token/statements/stmt-throw-new-error.ts
tests/cases/token/statements/stmt-throw-template.ts
tests/cases/token/statements/stmt-while-no-block.ts
```

### C 组（7）end compute 不对

```text
tests/cases/token/statements/expr-generic-inst-statement.ts
tests/cases/token/statements/stmt-asi-as-then-statement.ts
tests/cases/token/statements/stmt-empty-blocks.ts
tests/cases/token/statements/stmt-header-body-next-line.ts
tests/cases/token/statements/stmt-switch-comment-before-case.ts
tests/cases/token/statements/stmt-switch-inline-terminator-comment.ts
tests/cases/token/statements/stmt-type-alias-then-try.ts
```

### D 组（4）缺少 possible

```text
tests/cases/token/statements/expr-async-generic-arrow-spaced.ts
tests/cases/token/statements/expr-async-generic-arrow.ts
tests/cases/token/statements/gap-d-generics-tuple-mapped-02.ts
tests/cases/token/statements/stmt-adversarial-shapes.ts
```

### E 组（3）possible compute 不对

```text
tests/cases/token/ambiguous/am-call-type-args.ts
tests/cases/token/ambiguous/am-nested-generics.ts
tests/cases/token/ambiguous/am-type-arg-in-new.ts
```

### F 组（2）end compute 不对

```text
tests/cases/token/statements/stmt-do-while-body-terminated.ts
tests/cases/token/statements/stmt-do-while-no-block.ts
```

### G 组（2）possible build 不对

```text
tests/cases/token/statements/stmt-catch-define-typed.ts
tests/cases/token/statements/try-catch-define-comment.ts
```

### H/I/J/K/L/M/N/O 组（各 1）

```text
H  tests/cases/token/statements/stmt-asi-type-annotation-then-class.ts   possible build 不对
I  tests/cases/token/ambiguous/am-export-equals-namespace.ts             缺少 end
J  tests/cases/token/statements/expr-async-identifier-value.ts           possible compute 不对
K  tests/cases/token/statements/stmt-index-signature-static.ts           possible compute 不对
L  tests/cases/token/statements/prefix-operand-newline.ts                end compute 不对
M  tests/cases/token/statements/stmt-if-body-regex-not-comment.ts        basic token（交用户决定）
N  tests/cases/token/statements/gap-r929-label-body-brace-newline.ts     possible compute 不对
O  tests/cases/token/statements/gap-r942-loop-body-terminator.ts         end compute 不对
```

### 目录 × 类别汇总

| 目录 | 条数 | end compute | possible compute | 缺少 possible | possible build | 缺少 end | basic token |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `tests/cases/token/statements/` | 50 | 31 | 11 | 4 | 3 | 0 | 1 |
| `tests/cases/token/ambiguous/` | 7 | 3 | 3 | 0 | 0 | 1 | 0 |
| **合计** | **57** | **34** | **14** | **4** | **3** | **1** | **1** |

`ambiguous` 的 7 条：A 组 3（`am-block-lambda-array-compound` / `am-declare-module-css` /
`am-declare-module-nested`）、E 组 3（`am-call-type-args` / `am-nested-generics` / `am-type-arg-in-new`）、
I 组 1（`am-export-equals-namespace`）。逐文件归属以 §6 清单为准。

## 7. 未归因 / 未做

- **未归因文件：0**。57 条全部有主类与根因组。
- **精度限制（如实记录）**：
  - B 组的「哪个候选还活着」没有插桩到成员级——`CatalogGuide.ComputePossibleShapesByIndex` 的包装探针
    （`tmp/probe3.mjs`）只能拿到宿主级信息（`EndPossible = SourceFileEndPossibleShape`、
    崩溃格 = `EndOfFileTokenShape`、候选配置 13 个），活口候选的集合没有取到（Candidates 是 Set，
    包装后实例状态不可见）。**结论（普通候选在 EOF 上不定案）有行为证据**（加分号/去尾随换行即绿），
    但具体是哪几个候选的哪一行，留给修复成员插桩确认。
  - A 组精确到「`ScanExpressionBody` 停止集缺换行判据」；块体宿主是否还需要新增终结候选，
    要修复时按实际测到的 `Candidates` 再定（A 组修法两条路：改扫描器 / 给块体加终结候选）。
  - `gap-r929`（N 组）与 `gap-r942`（O 组）、`prefix-operand-newline`（L 组）的语料注释里写了
    「第 930 / 944 / 934 轮转绿」——那是**另一份语料/另一版实现**的历史记录，在本仓当前实现里仍然崩
    （本轮已逐条复现），所以仍按崩溃归因，不当作已修。
- **下一步建议**：先做 P1（A 组 23 条，一次收口且能连带 F/L 大半），再做 P2（B/N），
  然后 P3/P4/P5 各自独立。M 组单独走用户决定，不要和 P1~P6 混在一个 patch 里。
