# token 语料 AST 对拍：modules/lexical 17 崩溃 + 29 条 diff 的归因

本文件只做**只读分析**：不改任何 `*.xl.md`、不改 `tests/cases/**`、不改 `core/**`。
它回答两件事：这 46 份失败（17 crash + 29 diff）按根因分成哪几组、每组落在
`typescript/IMPORTANCE.md` §6 的哪一类；以及每条 diff 到底是**真 shape 缺口**、
**尺子归一表缺条目**、还是 **TS 自己恢复**。

## 1. 基线读数

- Lead 基线 `tmp/token-ast-baseline.json`：1703 行 = `ok 1501 / crash 162 / diff 29 / ts-invalid 10 / gap-now-passing 1`。
  本任务范围 = `tests/cases/token/modules/**` 8 crash + `tests/cases/token/lexical/**` 9 crash + **全部 29 条 diff**。
- 我在自己的克隆（分支 `cover-token-an-mod-diff`，基线 `6920174b`）上复测：
  - `xl_build`（`paths:["core","typescript"]`）→ `859 written, 0 error(s)`，2400+ 条 W3102/W3103 为既有噪音；
  - `node node_modules/typescript/bin/tsc` → exit 0；
  - `tmp/probe-all.mjs` 逐份复跑 46 个文件：**17/17 crash 全部复现；29 条 diff 复现 28 条**，
    `modules/gap-r869-exp-named-newline-then-from-like.ts` 在本次复测里没复现（见 §9 未归因清单）。

## 2. 探针方法与口径

- 崩溃：`SourceFileRunner.Parse(src,'a.ts')`，抓 `InnerException` 全链；**最小复现**用「逐行前缀二分」：
  从第 1 行开始逐步把文件前缀交给 `Parse`，第一个抛错的前缀的最后一行就是最小复现行（`tmp/probe-all.mjs`）。
- diff：与 `typescript/cases/ast-json.mjs` 同口径（结构差 / 同 kind 位置差 / 字段差）；
  位置差额外打印两侧的源码切片，用来判断「谁把范围吃多了」。
- 已确认：`recon-token4.mjs` 的别名表比 `typescript/cases/ast-json.mjs:138-152` 多 7 条
  （`FirstLiteralToken→NumericLiteral`、`LastStatement→DebuggerStatement`、`LastAssignment/LastCompoundAssignment/LastPunctuation/LastBinaryOperator→CaretEqualsToken`、
  `FirstPunctuation→OpenBraceToken`、`FirstAssignment→EqualsToken`）。**本文件的 29 条判定按 recon 口径**；
  若改用 `ast-json.mjs` 的 10 条别名表，`FirstLiteralToken` 那类会变成假「结构差」——这属于尺子归一表，不是 shape 缺口（§8）。

## 3. 归因总表

### 3.1 17 份崩溃（8 组）

| 组 | 根因一句话 | §6 主类 | 次类 | 文件数 |
| --- | --- | --- | --- | --- |
| C1 | import 声明在下一条语句第一个 code 单元上「终结候选 Accept」与普通候选同格成立 | **end compute 不对** | — | 3 |
| C2 | `import A = …` / `import type x = …` 的声明范围跨行吞并 or 无候选，build 时抛实体名/表达式错误 | **end compute 不对** | 缺少 possible | 3 |
| C3 | `declare module` 体内 `export default` 无分号，语句在换行处没被 close 住 | **end compute 不对** | end build | 2 |
| C4 | shebang `#!` 没被当 trivia 承接，`#` 走到 PrivateIdentifier 分支 | **缺少 possible** | basic token | 2 |
| C5 | `$` 被 token 层归为符号（内插前缀），标识符被拆开 | **basic token 存在问题** | — | 3 |
| C6 | `\uXXXX` 转义标识符没有字符级归类 | **basic token 存在问题** | — | 2 |
| C7 | U+FEFF（BOM）不是 trivia，粘进 `Common` 词 | **basic token 存在问题** | — | 1 |
| C8 | `readonly` 作成员名时成员候选只把它当修饰词 | **possible compute 不对** | possible build | 1 |

### 3.2 29 条 diff（14 组）

| 组 | 根因一句话 | §6 主类 | 文件数 |
| --- | --- | --- | --- |
| D1 | 数组字面量空槽不建零宽 `OmittedExpression`（binding pattern 里已有） | possible build 不对 | 3 |
| D2 | 解构 / 类成员的计算名 `[k]` 被当表达式而不是 `ComputedPropertyName` | possible build 不对 | 2 |
| D3 | 成员起点的「修饰词 vs 名字」判据：`public/private/readonly` + 换行（含块注释内换行、行注释） | possible compute 不对 | 4 |
| D4 | 顶层 `abstract` / `declare` 与声明关键字之间换行，被 ASI 断成两条 | possible compute 不对 | 2 |
| D5 | 上下文关键字 `async` 与 `function` 之间换行/注释的升级判据 | possible compute 不对 | 2 |
| D6 | `new` 的被构造者后面的后缀链（`!` / `[k]` / 模板）归属与 `NewExpression` 范围 | possible build 不对 | 3 |
| D7 | `f<T>` 后的模板串被当比较运算 / 标签模板归属（`TypeReference`/`BinaryExpression`/`GreaterThanToken`） | possible build 不对 | 4 |
| D8 | 泛型箭头 vs 尖括号断言的判据（`<T>(x:T):T => x`） | possible compute 不对 | 1 |
| D9 | 无分号声明的收口（声明 End 吞到下一条语句 / 零宽节点落点） | end compute 不对 / end build 不对 | 3 |
| D10 | 类型位「词 + `{`」（`extends {…}` / `is {…}` / `asserts {…}`） | possible compute 不对 | 1 |
| D11 | 类型别名 `=` 右值在换行 `[` 处被多续了一格 | end compute 不对 | 1 |
| D12 | 映射类型「值那一格」换行边界 | possible compute 不对 | 1 |
| D13 | 具名导入的字符串名（`import { "a-b" as c }`）投影成 Identifier | possible build 不对 | 1 |
| D14 | 复现差异（基线结构差 2 个节点，本克隆未复现） | 非 shape／待复核 | 1 |

## 4. 崩溃组（症状 + 最小复现 + 全清单 + 根因 + 五问 + 建议）

> 下面的「最小复现」都是**在我的克隆上实测**的：`tmp/probe-all.mjs` 从该文件逐行前缀喂 `Parse`，
> 打印 `firstCrashLine`；`chain` 为完整 `InnerException` 链的末条消息。

### C1 组：import 声明结束时机与普通候选同格（3 份）

- 症状：`CatalogGuide: 终结候选与其它候选同时成立（宿主 ImportDeclarationShape，下标 N）`。
- 最小复现（实测）：
  - `modules/ex-default-after-import-01.ts`：`import './pool'` ⏎ `export default Agent`（firstCrashLine=4，下标 8）；
  - `modules/gap-r941-import-attributes-newline.ts`：`import b from "m" //c` ⏎ `with { type: "json" };`（下标 10）；
  - `modules/gap-sweep-linecomment-import-03.ts`：`import { a, b as c } //c` ⏎ `from "m";`（下标 10）。
- 完整清单：上述 3 份（`tests/cases/token/modules/`）。
- §6 归类：**end compute 不对**。
- 根因定位：
  - `typescript/tokens/declarations/import-declaration-end-possible-shape.xl.md:30-87` `ComputeByIndex`
    的 ASI 分支在「下一条语句第一个 code 单元」这一格 `Accept`；代码注释自己写着
    「`Accept` 必须发生在下一条语句第一个代码单元那一格，否则 CatalogGuide 会报共存」（:64-67）。
  - 同一文件 `CanEndAt`（:89-158）的**行注释分支**在 :116-118 直接 `return true`：
    遇到 `//c` 就判「可以结束」，根本不再看下一行的 `from` / `with`。这正是 C1 三份里两份
    （linecomment + attributes 换行）的现场；`ex-default-after-import` 则是 `export` 那一格
    普通候选仍活着（Accept 与候选同格）。
  - 结论：EndPossible 的 Accept 判据/接线还不满足 IMPORTANCE §3.3 的「终结候选 Accept 时候选必须为 0」。
- 五问：
  - 何时 build：不新增 build 时机；仍由终结候选在下一条语句第一个 code 单元上收口。
  - build 提什么：只提 Start（`import` 关键字）+ 声明区间，字段（`ImportClause`/`ModuleSpecifier`/`Attributes`）从子形状取。
  - 何时 close：`;`（已实现）、ASI 边界（本组出问题的就是这里）、EOF（已实现）。
  - close 提什么：End = 最后一个**非 trivia** 代码单元；属性和子句不从 trivia 取。
- 修复建议：`typescript/` 层可解——① `CanEndAt` 行注释分支不能 `return true`，要继续跨过注释看下一行
  首个词，只有词不在 `from/with/assert/as/defer` 续接表里才结束；② ASI Accept 前再核一次
  「普通候选是否已全部 Reject」，或在 `ImportDeclarationPossibleShape` 的 `ComputeByIndex` 里
  对这条边界先 Reject（把共存留到 CatalogGuide 之前消除）。无需动 `core/**`。

### C2 组：import-equals 右值/范围（3 份）

- 症状：`import equals 声明不完整` / `import equals 的实体名缺少点号` / `表达式语句没有读完`。
- 最小复现（实测）：
  - `modules/mod-import-equals-entity-name-newline.ts`：`import A = foo` ⏎ `("m");` →
    firstCrashLine=4，报「实体名缺少点号」——右值 `foo` 之后的下一条语句 `("m")` 被吞进同一份 import-equals；
  - `modules/mod-import-type-equals.ts`：`import type x = require("m")`（EOF 无分号）→
    「表达式语句没有读完」——没有 `import type x = …` 候选，落到 ExpressionStatement 兜底；
  - `modules/mod-adversarial-shapes.ts`：`namespace N { export import M = K; }` →「import equals 声明不完整」。
- 完整清单：上述 3 份（`tests/cases/token/modules/`）。
- §6 归类：**end compute 不对**（主）＋ **缺少 possible**（次，`import type x =`）。
- 根因定位：
  - `typescript/tokens/declarations/import-equals-declaration-shape.xl.md:149-166` `FromUnits` 的实体名循环
    假定 `=` 右侧整段都是 `A.B.C`：`while (at < code.length - 1)` 强制要求点号，:160 抛
    「实体名缺少点号」。真正的问题是**喂给它的 `code` 已经跨过了换行**（终结候选没在换行处收口）。
  - `import type x = require(...)` 没有候选成形：声明候选表的入口（`typescript/tokens/declarations/`
    下的 import-equals possible）只认 `import <name> =`，`type` 这一格既没被吃成 `typeOnly` 标记也没被跳过。
  - `namespace N { export import M = K; }`：命名空间体内的 `export import` 组合在 import-equals 的
    前置修饰词/范围确定上还不完整（同形状，不同宿主）。
- 五问：
  - 何时 build：右值读完（`require(...)` 的 `)` 或限定名最后一个 Identifier）之后立即 build，
    **换行 + 下一格不是 `.` 就是边界**。
  - build 提什么：`LocalName`、`IsTypeOnly`、`Reference`（`ExternalModuleReference` 或 `QualifiedName` 链），
    换行后第一格不是 `.` 时不继续循环。
  - 何时 close：`;` / ASI（换行后首格不是 `.`）/ EOF。
  - close 提什么：End 取最后一个 code 单元（`)` 或限定名末名），不吞下一行。
- 修复建议：`typescript/` 层可解——在 import-equals 的终结候选/范围裁剪里先做 ASI：
  `=` 右值行一旦换行且下一行首格不是 `.`，就把 `code` 截到本行为止；`import type x =` 补一个
  `typeOnly` 入口（`type` 只作属性、不进 Data）。不动 `core/**`。

### C3 组：`declare module` 体内无分号语句（2 份）

- 症状：`表达式没有读完`（`SyntaxException` 两层后抛出）。
- 最小复现（实测）：
  - `modules/ns-declare-module.ts`：`declare module "x" { export function f(): void` ⏎ `const y: number` ⏎ `export default y`，firstCrashLine=6；
  - `modules/ns-wildcard-module.ts`：`declare module "*.css" { const content: string` ⏎ `export default content`，firstCrashLine=5。
- 完整清单：上述 2 份（`tests/cases/token/modules/`）。
- §6 归类：**end compute 不对**（次：end build——最后一条语句的 End 也被撑大）。
- 根因定位：`typescript/tokens/statements/statement-builder.xl.md:173` 抛「表达式没有读完」，
  调用点在模块体语句切分；两条 fixture 的共同点是**上一条成员/语句无分号**、下一条 `export default`
  在换行处开始。模块体没有把「换行 + 语句关键字」当边界，于是上一条语句的表达式范围把下一行
  一起吃进来，`ParseExpression` 读不完全部单元。参照 `typescript/tokens/files/source-file-end-possible-shape.xl.md:512`
  自己写的：「无分号到 EOF 会落进 ExpressionStatement，报『表达式语句没有读完』」——模块体缺同一条 ASI 通道。
- 五问：
  - 何时 build：模块体每条语句仍在其首单元 build；收口放在终结候选。
  - build 提什么：语句自身字段；无分号语句的 End 只到本行最后一个 code 单元。
  - 何时 close：`;` / 换行（下一行首格是语句关键字）/ 模块体 `}`。
  - close 提什么：End 取本语句最后一个 code 单元，不能取到下一行。
- 修复建议：`typescript/` 层可解——模块体（`module-block-shape` / `namespace-body`）复用
  `ExpressionStatementPossibleShape` 的 ASI 边界判据，或在 `ExportDeclaration` 候选前先 Reject
  上一条无分号语句。不动 `core/**`。

### C4 组：shebang `#!`（2 份）

- 症状：`私有标识符缺少名字`。
- 最小复现（实测）：`lex-shebang.ts` / `lx-shebang.ts` 第一行 `#!/usr/bin/env node`，firstCrashLine=1。
  trace：`#` 是 `Symbol("#")` → `ExpressionBuilder.ParsePrimary`（`expression-builder.xl.md:1841-1856`）
  进 PrivateIdentifier 分支，下一格是 `/`（RegexToken/Symbol），不是 `Common` → :1847 抛错。
- 完整清单：`lexical/lex-shebang.ts`、`lexical/lx-shebang.ts`。
- §6 归类：**缺少 possible**（次：basic token——`#!` 的字符归类）。
- 根因定位：
  - `typescript/tokens/trivia/shebang-trivia-shape.xl.md` 已存在，但
    `typescript/tokens/trivia/shebang-trivia-possible-shape.xl.md:13-25` 的
    `ComputeByIndex` / `BuildByIndex` **是 `throw new Error("…未实现")` 的桩**，也没有进宿主（SourceFile）的候选表。
  - 字符层：`#` 被符号表当 PrivateIdentifier 前缀（`punctuation/hash-token-shape.xl.md:12` 写明
    「`#` 一律按 PrivateIdentifier 扫」），`!` 没有和它合成 shebang trivia。
- 五问：
  - 何时 build：文件第 0 格是 `#` 且下一格是 `!` 时（文件首、只此一次），由 SourceFile 的候选在
    **遇到第一个换行前** build `ShebangTriviaShape`，之后丢弃（trivia 不进 AST 节点）。
  - build 提什么：整行 `#!...` 的区间（End = 换行前最后一格）；不投影 AST 字段。
  - 何时 close：读到 `\n`（或 EOF）立即 close，并且只在本文件开头允许。
  - close 提什么：区间；后续语句从下一行继续。
- 修复建议：`typescript/` 层可解（补 `ShebangTriviaPossibleShape` 的 compute/build 并在 SourceFile
  `Process`/候选表里接线）。**但**「`#` 字符在 token 层是否应改成 shebang 前缀」属于 basic token，
  按 IMPORTANCE §3.1 只能由用户发起——**交用户决定**。

### C5 组：`$` 在标识符里（3 份）

- 症状：`缺少标识符` / `变量声明缺少标识符` / `变量声明里有无法识别的单元`。
- 最小复现（实测）：
  - `lex-ident-dollar-variable.ts`：`const $x = 1`（firstCrashLine=5，报「变量声明缺少标识符」）；
  - `lex-ident-dollar-middle.ts`：`const a$b = 1`（firstCrashLine=3，报「变量声明里有无法识别的单元」）；
  - `lex-ident-dollar-interface.ts`：`interface I$X {`（firstCrashLine=4，报「缺少标识符」）。
- 完整清单：上述 3 份（`tests/cases/token/lexical/`）。
- §6 归类：**basic token 存在问题**。
- 根因定位：`$` 在 token 层被归为符号（fixture 注记：它同时是 `$"…"` 内插的前缀），
  于是 `$x` = `Symbol($)` + `Common(x)`，`a$b` = `Common(a)`+`Symbol($)`+`Common(b)`。
  下游 `statement-builder.xl.md:512/520`（变量声明的名字只认 Bracket/Common）、
  `expression-builder.xl.md:2037`（表达式起点）、`type-builder.xl.md:1687` 都因此抛错。
  这是字符→token 的归类问题，**不是** shape 层能补出来的。
- 五问：本组不适用（basic token 先决定）。若按现状在 typescript 层绕：build 时把 `$` 的
  Symbol+Common 合成 Identifier 会与内插前缀的回退逻辑打架（fixture 已注明「修它要同时照顾内插前缀」）。
- 修复建议：**交用户决定**。建议在 `core/syntax/basic-tokens/` 的标识符扫描里把 `$` 当标识符字符，
  同时保留 `$"` 内插的 lookahead 回退；AI 不得自行改。

### C6 组：`\uXXXX` 转义标识符（2 份）

- 症状：`变量声明缺少标识符`。
- 最小复现（实测）：`lex-unicode-escape-identifier.ts` 的 `const \u0061bc = 1;`（firstCrashLine=3）；
  `lx-unicode-ident.ts` 的 `const \u0061bc = 3`（firstCrashLine=5；同一文件里 `变量`、`café` 两行是好的）。
- 完整清单：`lexical/lex-unicode-escape-identifier.ts`、`lexical/lx-unicode-ident.ts`。
- §6 归类：**basic token 存在问题**。
- 根因定位：`\` 是 Symbol，`u0061bc` 是 Common；标识符扫描没有「`\u` 起转义、转义后整体算一个标识符字符」的
  规则。TS 的 `Identifier` 文本是解码后的 `abc`（fixture 期望 `Let,Statement`），本仓连 token 都没拼起来。
- 五问：不适用（basic token 先决定）。若只做 AST 投影层：需要 token 层先给出一个 Common，才有得投影。
- 修复建议：**交用户决定**（字符归类）。若要动，范围在 `core/syntax/basic-tokens/` 的 Common/标识符扫描。

### C7 组：BOM（U+FEFF）（1 份）

- 症状：`表达式语句没有读完`。
- 最小复现（实测）：`lex-bom.ts` 第 4 行开头就是 U+FEFF：`\uFEFFconst a = 1;`（firstCrashLine=4）。
  第一个 token 变成 `Common("\uFEFFconst")`，所以 `const` 不再是关键字，落到 ExpressionStatement，
  `ParseExpression` 读不完整条 → 抛错。
- 完整清单：`lexical/lex-bom.ts`。
- §6 归类：**basic token 存在问题**。
- 根因定位：① `typescript/run/text-document.xl.md:31-40` 的 `TextDocument` 构造**不剥 BOM**，
  `Content` 原样交给 token 层（若 BOM 在第 0 格，应在运行层剥掉）；② 但本 fixture 的 BOM 在**中间行行首**，
  所以更根本的是 token 层没把 U+FEFF 当空白/trivia（TS 的 scanner 把 BOM 当 whitespace）。
- 五问：不适用（basic token 先决定）。
- 修复建议：**交用户决定**（U+FEFF 的字符归类）；运行层可在 `TextDocument` 里对**第 0 格**剥 BOM，
  但中间行的 U+FEFF 仍需 token 层解决。

### C8 组：`readonly` 作成员名（1 份）

- 症状：`类成员名字不是标识符`。
- 最小复现（实测）：`lex-readonly-as-member-name.ts` 里 `class A {` ⏎ `  readonly() {}`（firstCrashLine=6）。
  同文件另一支 `references?: readonly (A | B)[]` 是类型运算符，这一支是**名字**；分界是名字前面那一格。
- 完整清单：`lexical/lex-readonly-as-member-name.ts`。
- §6 归类：**possible compute 不对**（次：possible build）。
- 根因定位：`typescript/tokens/declarations/class-declaration-shape.xl.md:676-756` 的成员名分支只认
  Bracket/`#`/String/Common 四种单元，`readonly` 已经被前面的修饰词扫描吃掉，剩下的 `()` 不是名字 →
  :755 抛错。成员候选在「成员起点是修饰词表里的词」时没有同时开一条「它也可能是名字」的候选
  （`readonly` + `(` ⇒ MethodDeclaration 的名字）。
- 五问：
  - 何时 build：成员名那一格到达时（`readonly` 后是 `(`/`<`/`?` 时按名字 build）。
  - build 提什么：`name`（Identifier `readonly`）、修饰词列表（此时为空）、`QuestionToken`/`TypeParameters`/参数/返回类型。
  - 何时 close：成员体 `}` 后 / `;`。
  - close 提什么：成员 End、修饰词与名字各自的 Pos。
- 修复建议：`typescript/` 层可解——修饰词扫描改成「先看下一格」：下一格是 `(`/`<`/`?`/`=`/`;` 时
  把该词回退成名字；不改 `core/**`。

## 5. diff 组（症状 + 最小复现 + 全清单 + 根因 + 五问 + 建议）

> 每条 diff 的「最小复现」取 `tmp/probe-all.mjs` 的 `firstStructLine` / 位置差源码切片（实测）。
> 结构差写成 `KindΔ`，Δ = 本仓数量 − TS 数量。

### D1 组：数组空槽 `OmittedExpression`（3 份）

- 症状：`OmittedExpression-1`（基线另两条是 `OmittedExpression-8`）、`ArrayLiteralExpression+`。
  实测 `ex-array-holes.ts`：`const a = [1, , 3, ...xs]` 的 `[1, , 3]` 里空槽没有节点。
- 完整清单：`expressions/ex-array-holes.ts`、`expressions/expr-array-holes-trivia.ts`、`expressions/expr-array-holes.ts`。
- §6 归类：**possible build 不对**（`typescript/tokens/expressions/expression-builder.xl.md:1365`
  `ParseArrayLiteral` 只在逗号之间找元素，没有「相邻逗号 ⇒ 零宽 OmittedExpression」的分支；
  对照 `bindings/array-binding-pattern-shape.xl.md:83-86` 已有同款零宽节点）。
- 五问：build 时机=数组字面量 `]` 收口时；build 提「上一个逗号之后的零宽位置」；
  close 随 `]`；close 只提区间。**修复建议**：typescript 层可解，补空槽分支。

### D2 组：计算属性名（解构 / 类成员）（2 份）

- 症状：`decl-binding-computed-key.ts`：`ComputedPropertyName-2`、`BindingElement+4`、`ArrayBindingPattern+2`
  （`const { [k]: v } = o;` 里 `[k]` 被当数组解构）；`decl-class-computed-member.ts`：
  `ComputedPropertyName+2`、`PropertyDeclaration+2`、`BinaryExpression-1`。
- 完整清单：`declarations/decl-binding-computed-key.ts`、`declarations/decl-class-computed-member.ts`。
- §6 归类：**possible build 不对**（成员/绑定名的 `[` 分支没有先问「是不是计算名」；
  类那侧 `class-declaration-shape.xl.md:679-705` 已有正确分支，解构侧缺；
  `ObjectBindingPatternShape`/`NormalizeBindingPattern` 走的是数组解构路径）。
- 五问：build 时机=名字格到达；build 提 `ComputedPropertyName(expression)` 与 `Pos`（有修饰词时从修饰词后算起，
  `class-declaration-shape.xl.md:698-699` 已注明）；close 随 `]`。**建议**：typescript 层可解。

### D3 组：成员起点的修饰词 vs 名字（4 份）

- 症状：`public/private/readonly` 被投成名字（`Identifier-1 PropertyDeclaration-1 PublicKeyword+1`），
  或方法起点被撑大（`MethodDeclaration ts[186,201] cj[179,201]`）；`types/gap-r907-index-signature-newline-after-readonly.ts`
  里 `readonly` 与 `[` 之间换行，`readonly` 被当 PropertySignature 的名字。
- 实测最小复现：`decl-modifier-blockcomment-linebreak.ts` 的 `y*/ m() {} }`（块注释里的换行也是换行；
  TS 用 `hasPrecedingLineBreak` 读 ASI）；`gap-sweep-*-clsmod-0{3,4}` 是行注释/换行两版；
  `types/gap-r907-…` 的 `readonly` ⏎ `[k:string]:number`。
- 完整清单：`declarations/decl-modifier-blockcomment-linebreak.ts`、`declarations/gap-sweep-linecomment-clsmod-04.ts`、
  `declarations/gap-sweep-newline-clsmod-03.ts`、`types/gap-r907-index-signature-newline-after-readonly.ts`。
- §6 归类：**possible compute 不对**（成员候选把「换行/注释后的修饰词」当成上一个成员的名字续接；
  修饰词表的边界判据只看同一行）。
- 五问：compute 应在「成员起点 + 修饰词后第一格」分清修饰词与名字；build 时把修饰词收进 `Modifiers`；
  close 时 End 只到成员末。**建议**：typescript 层可解（成员候选的 `ComputeByIndex` 加「换行即成员边界」；
  块注释内换行也要计入 `HasLineBreak`）。

### D4 组：顶层修饰词换行（2 份）

- 症状：`ExpressionStatement-1 Identifier-1 AbstractKeyword+1`（`abstract` ⏎ `class A {}` 变成两条：
  `ExpressionStatement(abstract)` + `ClassDeclaration`，且 `ClassDeclaration ts[120,131] cj[0,131]`）；
  `declare` ⏎ `module "m" {}` 同形（`ModuleDeclaration ts[129,143] cj[0,143]`）。
- 完整清单：`declarations/gap-sweep-newline-decl-abstract-01.ts`、`modules/gap-sweep-newline-mod-declare-01.ts`。
- §6 归类：**possible compute 不对**（顶层声明候选没有把「修饰词在上一行、关键字在下一行」合成一条；
  TS 的 `abstract class` / `declare module` 允许换行）。
- 五问：build 时机=声明关键字到达时（修饰词已挂起）；build 提 `Modifiers` + 声明体；
  close 随声明体 `}`；close 只提区间。**建议**：typescript 层可解（声明候选在修饰词后跨换行继续等关键字）。

### D5 组：`async` 换行（2 份）

- 症状：`ExpressionStatement+1 Identifier+1 Block+1 AwaitExpression+1 CallExpression+1`（本仓多出五个节点）。
  实测：`gap-sweep-newline-async-01.ts` 是 `async ` ⏎ `function f() { await g(); }`；行注释版同形。
  文件头注记说「第 842 轮转绿」——即它曾按 `Identifier` 处理 `async`，当前基线又出现了结构差。
- 完整清单：`statements/gap-sweep-linecomment-async-01.ts`、`statements/gap-sweep-newline-async-01.ts`。
- §6 归类：**possible compute 不对**（次：待复核）。`async` 是上下文关键字，升级判据在
  `typescript/tokens/keywords/` 的 `IsUpgradable`（fixture 注记点名 `keyword.xl.md`）；
  换行/注释后不应再升级，但本仓却按「async 函数」收进了 `await g()` 的 `AwaitExpression`。
- 五问：compute 在 `async` 那一格决定「是否升级」（只有紧跟 `function`/`(`/标识符且无换行才升级）；
  build/close 随所选分支。**建议**：typescript 层可解；因与「第 842 轮转绿」的记录冲突，
  先按本基线复测确认是回归还是口径差（§9 待复核）。

### D6 组：`new` 的被构造者后缀（3 份）

- 症状：`NewExpression` 的 End 小一格（`ts[121,132] cj[121,127]`）、`CallExpression+5`、
  `PropertyAccessExpression`/`NonNullExpression` 被拆到外层。
- 实测最小复现：`expr-new-callee-postfix-assert.ts` 的 `new a!.b();`（firstStructLine=3）；
  `expr-new-callee-postfix-chain.ts` 的 `new ns` ⏎ `…`（firstStructLine=8）；
  `gap-r947-new-template-then-postfix.ts` 的 `new A` + 模板/后缀（firstStructLine=12）。
- 完整清单：上述 3 份（`expressions/`）。
- §6 归类：**possible build 不对**（`messages`：`typescript/tokens/expressions/expression-builder.xl.md:896`
  `ParseNew` 的 callee 取到 `a` 就停，`!`/`.b`/`[k]`/模板都留在外层；
  TS 把「callee + 后缀链」都算进同一条 `NewExpression`）。
- 五问：build 时机=`new` 收 callee 时把后续后缀链一起吃掉；build 提 `Expression`（callee）与 arguments；
  close 在 `)`/最后一个后缀后；close 提 End 到最后后缀。**建议**：typescript 层可解。

### D7 组：`f<T>` 与模板串（4 份）

- 症状：`TypeReference-1 TaggedTemplateExpression-1 BinaryExpression+2 FirstBinaryOperator+1 GreaterThanToken+1`：
  `f<T>` 被当比较运算（`<` ⇒ `FirstBinaryOperator`），模板串没成为 `TaggedTemplate` 的模板。
- 实测：`gap-r977-inst-tagged.ts` 的 `const a = f<T>`t`;`（firstStructLine=14）、
  `gap-r977-inst-tagged-template-expr.ts` 的 `const a = f<T>`${1}`;`（:10）、
  `expr-operand-template-generic.ts` 的 `const a = typeof f<T>;`（:10）、
  `expr-template-tagged-suffix.ts` 的 `const a = tag`abc`.length;`（:8）。
- 完整清单：上述 4 份（`expressions/`）。
- §6 归类：**possible build 不对**（`expression-builder.xl.md:577` `ParseTypeArgumentsAtCurrent`
  在表达式位没有优先把 `<…>` 试成类型实参；`1544` 附近的 tagged-template 归属拿不到带实参的 callee）。
- 五问：build 时机=表达式位遇到 `<` 时先试类型实参（失败再回退比较）；build 提 `typeArguments`；
  close 在模板串末；close 提 End。**建议**：typescript 层可解（与 `as`/`satisfies` 尾巴同一条入口）。

### D8 组：泛型箭头 vs 尖括号断言（1 份）

- 症状：`Identifier+5 TypeAssertionExpression+1 TypeReference+3 ArrowFunction+1 Parameter+1`。
  实测 `ambiguous/am-arrow-generic.ts` 的 `const f = <T>(x: T): T => x`（firstStructLine=3）。
- 完整清单：`ambiguous/am-arrow-generic.ts`。
- §6 归类：**possible compute 不对**（`expression-builder.xl.md:1802-1830` `ParseAngleStart`
  已按「`>` 后紧跟 `(…) =>`」判箭头，但带返回类型的 `(x: T): T =>` 那一段的 `=>` 探测没命中——:1816-1817
  只检查 `close+1` 是 `(` 且 `close+2` 是 `=>`，没有像 `(` 分支（:1870-1880）那样向后探 `=>`）。
- 五问：compute 在 `<…>` 收口时判定；build 提 `TypeParameter` 列表；close 随箭头体。**建议**：typescript 层可解。

### D9 组：无分号声明的收口（3 份）

- 症状：
  - `gap-r1231-decl-newline-operator.ts`：`const v = () => { }` ⏎ `/re/g;`，本仓把 `/re/g` 续进了
    `VariableStatement`（`ts[1164,1185] cj[1164,1192]`）；
  - `stmt-throw-no-argument-then-statement.ts`：零宽 `Identifier` 落点与 `ThrowStatement` End
    （`ts[178,184] cj[178,188]`）；
  - `type-tail-linecomment.ts`：`type T11 = A//c` ⏎ `[];`，本仓把 `[]` 续成 `ArrayType`（`ts[929,942] cj[929,949]`）。
- 完整清单：上述 3 份（`expressions/`、`statements/`、`types/`）。
- §6 归类：**end compute 不对**（`gap-r1231`、`type-tail-linecomment`）＋ **end build 不对**
  （`stmt-throw`：零宽节点 End 固定规则；`expression-statement-shape.xl.md:32-86` `FromUnits` 的
  `requireSemicolon=false` 分支与 `statement-builder` 的 throw 分支）。
- 五问：close 时机=换行且下一行首格不能续接（`/` 不是二元运算符续接、`[` 在类型位不能续）；
  close 提 End=最后一个 code 单元，throw 的零宽 Identifier pos=end=下一个 code 单元的起点。**建议**：typescript 层可解。

### D10 组：类型位「词 + `{`」（1 份）

- 症状：`gap-r1237-type-position-brace.ts` 的 `interface I extends { a: 1 } { }`：
  `HeritageClause ts[1615,1632] cj[1615,1623]`、`PropertySignature+3 LiteralType+3 …`。
  文件头注记已把三档（`extends` 的类型字面量实体名、`is {…}`、`asserts x is {…}`）写清并标
  `xl:known-gap`（第 1237 轮）。
- 完整清单：`types/gap-r1237-type-position-brace.ts`。
- §6 归类：**possible compute 不对**（接口实体的实体名那一格只认 Identifier，不认已收好的 `TypeLiteral`；
  谓词的类型格与成员类型不共用投影入口）。
- 五问：compute 在实体名/谓词类型格问「这一格是什么」而不是「`{` 是什么」；build 提类型节点；
  close 随接口/函数体。**建议**：typescript 层可解。

### D11 组：类型别名换行 `[`（1 份）

- 症状：`gap-r907-indexed-access-newline.ts`：`type T = A` ⏎ `["k"];`。TS 给
  `TypeAliasDeclaration`（到 `A`）+ 一条 `ExpressionStatement`；本仓把 `["k"]` 续成 `IndexedAccessType`
  （`TypeAliasDeclaration ts[0,599] cj[0,606]`、cj 多 `IndexedAccessType+1`）。
  文件注记说明第 912 轮曾把「TS 的读法记反了」，加过两道 `[` 护栏（`IsTypeAliasAssignment`）。
- 完整清单：`types/gap-r907-indexed-access-newline.ts`。
- §6 归类：**end compute 不对**（类型别名右值的收口没有在换行 `[` 处停下；
  护栏在解析期与收尾期共用，仍漏了这一格）。
- 五问：close 在换行且下一格是 `[` 时结束类型别名（TS `parsePostfixTypeOrHigher` 只在同一行吃 `[`）；
  close 提 End=类型最后 code 单元。**建议**：typescript 层可解。

### D12 组：映射类型值换行（1 份）

- 症状：`gap-r933-mapped-value-newline.ts`：`type T = { [K in keyof U as `k${K}`]:U` ⏎ …；
  `MappedType+1 Identifier+5 TypeReference+4 IndexedAccessType+1`。
- 完整清单：`types/gap-r933-mapped-value-newline.ts`。
- §6 归类：**possible compute 不对**（`typescript/tokens/types/type-builder.xl.md:2396` `ParseMappedType`
  的值格在换行处没有收口，`2488`「mapped type 没有读完」是同一条判据的另一出口）。
- 五问：compute 在 `]` 后 `:` 的值格问换行是否续接；build 提 `TypeParameter`/`NameType`/`Type`；
  close 随 `}`。**建议**：typescript 层可解。

### D13 组：具名导入的字符串名（1 份）

- 症状：`im-string-name.ts`：`import { "a-b" as c } from "m"`，`ImportSpecifier-1`、
  位置差把 `StringLiteral ts[106,112]`（"a-b"）对到了 `cj[124,128]`（"m"）。
- 完整清单：`modules/im-string-name.ts`。
- §6 归类：**possible build 不对**（import specifier 的 name 只从 Identifier 投影；字符串名没建 `StringLiteral`，
  位置顺移到 ModuleSpecifier）。参照 `export-specifier-shape` 已有「字符串导出名」分支。
- 五问：build 提 `name`（StringLiteral 的 Text 不带引号）；close 随 `}`/`from`。**建议**：typescript 层可解。

### D14 组：复现差异（1 份）

- `modules/gap-r869-exp-named-newline-then-from-like.ts`：基线行有
  `struct:["ParenthesizedExpression-1","StringLiteral-1"]`，本克隆复跑得到空结构差（§9）。
- §6 归类：**非 shape／待复核**（暂不归入真缺口）。

## 6. 每条 diff 的判定表（29 行）

| # | 文件 | 判定 | 类别 | 证据 |
| --- | --- | --- | --- | --- |
| 1 | expressions/ex-array-holes.ts | 真 shape 缺口 | possible build | `OmittedExpression-1`，`const a = [1, , 3]` |
| 2 | expressions/expr-array-holes-trivia.ts | 真 shape 缺口 | possible build | `OmittedExpression-8` |
| 3 | expressions/expr-array-holes.ts | 真 shape 缺口 | possible build | `OmittedExpression-1` |
| 4 | declarations/decl-binding-computed-key.ts | 真 shape 缺口 | possible build | `ComputedPropertyName-2`、ArrayBindingPattern+2 |
| 5 | declarations/decl-class-computed-member.ts | 真 shape 缺口 | possible build | `ComputedPropertyName+2`、BinaryExpression-1 |
| 6 | declarations/decl-modifier-blockcomment-linebreak.ts | 真 shape 缺口 | possible compute | `PublicKeyword+1`、MethodDeclaration ts[186,201] |
| 7 | declarations/gap-sweep-linecomment-clsmod-04.ts | 真 shape 缺口 | possible compute | `PrivateKeyword+1`、ts[196,208] |
| 8 | declarations/gap-sweep-newline-clsmod-03.ts | 真 shape 缺口 | possible compute | `PrivateKeyword+1`、ts[192,201] |
| 9 | declarations/gap-sweep-newline-decl-abstract-01.ts | 真 shape 缺口 | possible compute | ClassDeclaration ts[120,131] cj[0,131] |
| 10 | statements/gap-sweep-linecomment-async-01.ts | 真 shape 缺口（待复核） | possible compute | 结构差 5 节点 |
| 11 | statements/gap-sweep-newline-async-01.ts | 真 shape 缺口（待复核） | possible compute | 结构差 5 节点 |
| 12 | modules/gap-sweep-newline-mod-declare-01.ts | 真 shape 缺口 | possible compute | ModuleDeclaration ts[129,143] cj[0,143] |
| 13 | expressions/expr-new-callee-postfix-assert.ts | 真 shape 缺口 | possible build | NewExpression ts[121,132] cj[121,127] |
| 14 | expressions/expr-new-callee-postfix-chain.ts | 真 shape 缺口 | possible build | TaggedTemplate ts[575,583] cj[571,583] |
| 15 | expressions/gap-r947-new-template-then-postfix.ts | 真 shape 缺口 | possible build | NewExpression 范围小 |
| 16 | expressions/expr-operand-template-generic.ts | 真 shape 缺口 | possible build | BinaryExpression+2、GreaterThanToken+1 |
| 17 | expressions/expr-template-tagged-suffix.ts | 真 shape 缺口 | possible build | TaggedTemplate ts[586,595] cj[582,595] |
| 18 | expressions/gap-r977-inst-tagged.ts | 真 shape 缺口 | possible build | TypeReference-1、BinaryExpression+2 |
| 19 | expressions/gap-r977-inst-tagged-template-expr.ts | 真 shape 缺口 | possible build | 同上 |
| 20 | expressions/gap-r1231-decl-newline-operator.ts | 真 shape 缺口 | end compute | VariableStatement ts[1164,1185] cj[1164,1192] |
| 21 | statements/stmt-throw-no-argument-then-statement.ts | 真 shape 缺口 | end build | ThrowStatement ts[178,184] cj[178,188] |
| 22 | types/gap-r1237-type-position-brace.ts | 真 shape 缺口 | possible compute | HeritageClause ts[1615,1632] cj[1615,1623] |
| 23 | types/gap-r907-index-signature-newline-after-readonly.ts | 真 shape 缺口 | possible compute | IndexSignature ts[1094,1113] cj[1085,1113] |
| 24 | types/gap-r907-indexed-access-newline.ts | 真 shape 缺口 | end compute | TypeAlias ts[0,599] cj[0,606] |
| 25 | types/gap-r933-mapped-value-newline.ts | 真 shape 缺口 | possible compute | MappedType+1、Identifier+5 |
| 26 | types/type-tail-linecomment.ts | 真 shape 缺口 | end build | TypeAlias ts[929,942] cj[929,949] |
| 27 | modules/im-string-name.ts | 真 shape 缺口 | possible build | StringLiteral ts[106,112] cj[124,128] |
| 28 | ambiguous/am-arrow-generic.ts | 真 shape 缺口 | possible compute | TypeAssertion+1、ArrowFunction+1 |
| 29 | modules/gap-r869-exp-named-newline-then-from-like.ts | **非 shape／待复核** | — | 本克隆未复现基线结构差 |

## 7. basic token 场景（单独列，**交用户决定**）

按 IMPORTANCE §3.1，basic token 只能由用户发起修改。下面三组必须由用户决定字符归类：

1. **`$`（C5，3 份）**：现在 `$` 是 Symbol（内插前缀），`$x`/`a$b`/`I$X` 被拆开。
   若改成「`$` 是标识符字符」，必须同时保留 `$"…"` 内插前缀的回退判据（fixture 已注明）。
   场景：`const $x = 1`、`const a$b = 1`、`interface I$X { … }`。
2. **`\uXXXX`（C6，2 份）**：`\` + `u0061bc` 没有一个「转义标识符」的 token 归类；
   TS 的 Identifier 文本是解码后的 `abc`。场景：`const \u0061bc = 1;`。
3. **U+FEFF（C7，1 份）**：BOM 在行首时既不是空白也不是 trivia；`Common` 把 `\uFEFFconst` 吞成一个词。
   场景：`\uFEFFconst a = 1;`。运行层可剥第 0 格的 BOM，但中间行的仍需 token 层归类。
4. （附带）**`#!`（C4）**：`#` 已被定为 PrivateIdentifier 前缀，shebang 要不要在 token 层单独成一类
   trivia，也请用户定；typescript 层只能补 `ShebangTriviaPossibleShape` 的 compute/build。

## 8. 「非 shape／尺子契约」的判定结论

- 29 条里 **28 条是真 shape 缺口**（逐条见 §6），**没有一条能靠改尺子归一表消掉**：
  结构差都是节点种类/数量真的不同，位置差是区间真的不同。
- **尺子归一表**只需要注意一处：`typescript/cases/ast-json.mjs:138-152` 的 10 条别名
  **比 `tmp/recon-token4.mjs` 少 8 条**。对 token 语料跑 `ast-json.mjs` 口径时，
  `FirstLiteralToken`（NumericLiteral）、`LastStatement`（DebuggerStatement）、
  `LastAssignment` 族（CaretEqualsToken）、`FirstPunctuation`（OpenBraceToken）、`FirstAssignment`（EqualsToken）
  会印成别名反查名，可能凭空多出「结构差」。建议把 `ast-json.mjs` 补齐（属于尺子，不是 shape）。
- 唯一「非 shape」条目是 `modules/gap-r869-…`（D14）：基线结构与本克隆复测不一致，按待复核处理。

## 9. 未归因 / 待复核清单

1. `modules/gap-r869-exp-named-newline-then-from-like.ts`：基线 `struct:["ParenthesizedExpression-1","StringLiteral-1"]`，
   本克隆 `probe-all.mjs` 复测得空结构差（文件 8 行，均非注释行是 `import { a as b }` 一类）。
   需要 Lead 的 `recon-token4.mjs` 原样复跑并给出该行的 `pos/fields` 才能定组；暂列「非 shape／待复核」。
2. `statements/gap-sweep-*-async-01.ts`：文件头注记说「第 842 轮转绿」，但本基线是 diff；
   结构差指向 `async` 的上下文关键字升级（`await g()` 被当 `AwaitExpression`）。
   需要确认是回归还是基线口径（recon 用了 `await` 相关别名）问题。
3. `types/gap-r933-mapped-value-newline.ts`：结构差方向（`MappedType+1` 是 cj 多）与「值换行」的直觉相反，
   我只定位到 `type-builder.xl.md:2396/2488` 的 `ParseMappedType` 收口，具体是「多续一格」还是「多建一个 MappedType」
   需要单点 trace（`tmp/probe-all.mjs` 的 `firstStructLine=16`）。
4. `gap-r1231-decl-newline-operator.ts` 的 `RegularExpressionLiteral-1`/`SlashToken+2`：主因是无分号声明的收口，
   但 `/re/g` 的 `RegularExpressionLiteral` 也少了一个，可能叠加了「`/` 当除号」的 token 判据（待复核）。

## 10. 建议的修复顺序（全部 typescript 层，除 basic token 三组）

1. C1（3 份）：`import-declaration-end-possible-shape.xl.md` 的 `CanEndAt` 行注释分支 + Accept 时机；
2. D3/D4/D5/D8/D10/D12（12 份）：成员/声明/类型位的「边界/修饰词/换行」compute 判据；
3. D1/D2/D6/D7/D13（13 份）：build 分支（空槽、计算名、new 后缀、类型实参、字符串名）；
4. C2/C3/D9/D11（9 份）：end 收口（import-equals、模块体、无分号声明、类型别名）；
5. C4/C8（3 份）：shebang possible + readonly 回退；
6. C5/C6/C7（6 份）：**交用户决定**（basic token）。
