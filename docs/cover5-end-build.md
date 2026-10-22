# cover5 round5（end build，§6 第 7 类）：EOF 尾随声明的「修饰词 / 装饰器」前缀

本文件记录 **cover5-end-build** 分支的探测、归类、修复、用例与读数。全部工作只改
`typescript/` 层（未碰 `core/**`、未碰 `typescript/IMPORTANCE.md`、未动其它类别的 case 文件）。

## 1. 一句话结论

本轮 end-build 的**新真红不在「尾随 trivia 撑大 End」**——A 组（import/export 的无分号 EOF 尾注释）
修好之后，逐类探针的尾随 trivia / `;` 归属 / 内部 trivia / 位置对拍全部为绿；新真红在
**EOF 收口时 BuildByIndex 只认「段首字面就是声明词」**：

| 族 | 尾随声明形态 | 修复前 | TS 期望 |
| --- | --- | --- | --- |
| 修饰词 class | `abstract class C {}` / `declare abstract class C {}` | crash「表达式语句没有读完」 | 两条独立声明 |
| 修饰词 function | `async function g() {}` / `declare async function f(): void` | 结构差 / crash | 两条独立声明 |
| export enum | `export enum E {…}` / `export declare enum` / `export const enum` | crash「表达式语句没有读完」/ 变量声明报错 | EnumDeclaration + ExportKeyword |
| export import | `export import y = require("m")` | crash「表达式语句没有读完」 | ImportEqualsDeclaration + ExportKeyword |
| export default 声明形 | `export default class/function/interface …` | ExportAssignment + ClassExpression/FunctionExpression（结构差） | 声明自身带 ExportKeyword+DefaultKeyword |
| 装饰器 class | `@dec class C {}` 等（落在 EOF 兜底时） | crash「不支持的表达式起点」/ 结构差 | ClassDeclaration + Decorator |

修复落在 `typescript/tokens/files/source-file-end-possible-shape.xl.md` 的 EOF 兜底
（`BuildTrailingDeclaration`）：按「修饰词 + 声明词」识别整段、识别装饰器开头的 class、
`export default` 后是声明形时建声明、`export import` 走 ImportEquals、export 声明族补 enum。
新增 **54** 条用例（修复前 54/55 红，修复后全绿；唯一基线即绿的候选已剔除）。

## 2. 基线 / 最终读数

- 基线 HEAD `5362a38bffd3a94d605b321a95ac32f3fd02e34c`（分支 `cover5-end-build`），TS 6.0.3。
- 基线：ast-json 5335/5335、diff 0/0/0、token-ast non-known-gap 1704（ok 1694 / ts-invalid 10）、
  real-dts 226/226、tsc 0。
- 最终：**ast-json 5389/5389（5335+54，47 构造）**、**diff 5389/5389，结构/位置/字段差 0**、
  token-ast 1704（ok 1694 / ts-invalid 10，diff 0 / crash 0）、**real-dts 226/226**、**tsc 0 error**。
- `git status`：只 4 个预期文件（`end-build.ts`、两份派生快照、实现 xl 页）。

## 3. 探测方法（tmp 探针，不进 git）

口径与 `typescript/cases/ast-json-diff.mjs` 完全一致（复用 `ast-compare.mjs` 的 `createAstCore/cjAst`
与三栏 diff：结构 / 位置 / 字段）。**判定：TS `parseDiagnostics.length === 0` 且本仓 crash 或
AST 不一致才算真红**；TS 自己非法的形态只计数。

| 探针 | 条数 | 覆盖 | 结论 |
| --- | --- | --- | --- |
| `tmp/probe-end-build.mjs` | 560 | 33 种声明/语句 × 11 种尾随 trivia（空/空格/换行/行注释/块注释/CRLF…）、`;` 归属、边界、字段 | 557 绿；2 条红是 **end-compute**（见 §8.1）；尾随 trivia 一族全绿 |
| `tmp/probe-end-build2.mjs` | 591 | 模板块内部、多声明 EOF 连排、`;` 归属、import/export 内部 trivia、零宽/Omitted | 14 红：**8 条属本类**（EOF 连排的修饰词声明）、6 条模板块 export 成员（§8.5）；内部 trivia 全绿 |
| `tmp/probe-end-build3.mjs` | 775 | 9 前缀 × 25 尾随声明 + 三条连排 | 250 红，归并后是同一组「修饰词/装饰器声明」族 |
| `tmp/probe-end-build4.mjs` | 310 | 31 目标形态 × 10 上下文（含 2/3 条连排、尾注释、空行） | 修复前 177 红 → 修复后 24 红（剩下的全部是 §8.3/§8.4 的邻类） |
| `tmp/probe-linesep.mjs` | 23 | U+2028/U+2029（Lead 转来的 basic-token 线索） | 结论见 §8.2（end-compute） |

**red→green 证据**：把实现改动 `git stash` 后重建（`xl_build` + `tsc`），同一候选集 **54/55 红**
（唯一绿者是 `type T = A\nabstract class A {}\nabstract class B {}`，已按「基线已通过不加」剔除）；
`git stash pop` 重建后 **55/55 绿**。

## 4. 问题清单（根因 / 四问）

根因都在 EOF 终结候选的 **BuildByIndex / BuildTrailingDeclaration**（Accept 时机本身是对的：
EOF 哨兵上 Accept），所以归 **end build 不对**，不是 end compute。

| # | 形态（复现） | TS vs 本仓（修复前） | 根因（file:line，修复前→修复后） |
| --- | --- | --- | --- |
| 1 | `declare function f(): void` ⏎ `abstract class C {}` / `declare abstract class C {}` | TS 两条声明；本仓 crash「表达式语句没有读完」（段首 `abstract` 不认 → `return false` → 调用方按 ExpressionStatement 兜底） | `source-file-end-possible-shape.xl.md` 的 `isClass` 只认 `class`/`declare class`（旧 :874-875）→ 新增 `LeadingDeclarationKeyword`（:112）跳过修饰词后识别 `class`（新 :876-878），交给 `ClassDeclarationShape.FromUnits`（自消费 declare/abstract） |
| 2 | `declare function f(): void` ⏎ `async function g() {}`；`declare async function f(): void` 到 EOF | TS 两条声明 / 一条无体函数；本仓结构差（FunctionDeclaration 丢失）或 crash | `isFunction` 只认 `function`/`declare function`（旧 :966-967）→ 改为 `LeadingDeclarationKeyword` 跳过 declare/async 后认 `function`（新 :984） |
| 3 | `…` ⏎ `export enum E { A }` / `export declare enum` / `export const enum` | TS EnumDeclaration+ExportKeyword；本仓 crash 或落进变量声明 | export 声明族的关键字表只有 class/interface/namespace/module/global（旧 :638-639；新 :643），补 `enum`（:660）；`export const enum` 会先被 `isExportVariable` 抢走，新增 `isExportConstEnum` 放行（:587-591） |
| 4 | `export import y = require("m")`（含 `export import type …`）到 EOF | TS ImportEqualsDeclaration+ExportKeyword；本仓 crash「表达式语句没有读完」 | `isImportEquals` 只认 `text === "import"`（旧 :952-961）→ 增 `export import` 两种形（新 :955-981）；`ImportEqualsDeclarationShape.FromUnits` 本来就消费 export 前缀 |
| 5 | `…` ⏎ `export default class C {}` / `abstract class` / `function` / `async function` / `function*` / `interface` | TS：声明自身带 ExportKeyword+DefaultKeyword；本仓 ExportAssignment + ClassExpression/FunctionExpression | `isExportDefault` 一律走表达式路（旧 :694-729）→ 先用 `BodyDeclarationKeyword`（:137）判 default 后是不是声明形；class 走 `ClassDeclarationShape.FromUnitsAllowAnonymous`，function/interface 建声明后按 TS children 顺序 unshift DefaultKeyword/ExportKeyword（新 :698-772） |
| 6 | `type T = A` ⏎ `@dec class C {}`（含 `@a @b` / `@dec()` / `@dec export class` / `@dec export default class`） | TS ClassDeclaration+Decorator；本仓 crash「不支持的表达式起点」/ 结构差 | 段首是 Symbol `@` 时旧代码在 `head instanceof Common` 处直接 `return false`（旧 :500-503）；新增装饰器分支（新 :500-515）交给 `ClassDeclarationShape.FromUnits`（自消费装饰器与 export/default/declare/abstract）；多声明边界循环补 `@`（换行后装饰器＝下一条声明起点）与 `async`（新 :433-444） |

**四问（本类统一答案）**

- **正确的应该什么时候 build**：EOF 哨兵上 Accept（既有路径）；多声明连排时在「下一条声明的第一个
  代码单元」处切分后再递归到各段——本类**不改 Accept 时机**，只改 Accept 之后怎么建。
- **build 时应该提取哪些信息**：整段按「修饰词 + 声明词」识别；`End` 一律取最后一个**非 trivia 代码单元**
  （`}` / `void` / `)` / 字符串），修饰词与关键字不投影、只作为声明 children 的 KeywordShape。
- **什么时候 close**：同一条 EOF / ASI 收口（`TryToClose` / `Quit` 时机不变）。
- **close 时应该提取哪些信息**：`Data` 只剩子节点形状（Keyword / Identifier / Parameter / Type / Body），
  trivia 不参与；`ParseFromShape` 只做 `Pos = shape.Pos`、`End = SourceRange.End.Index + 1` 的换算。

## 5. 修复文件（1 个 xl 页，+169/−12 行）

`typescript/tokens/files/source-file-end-possible-shape.xl.md`

| 改动 | 位置（新行号） |
| --- | --- |
| 新依赖 `DefaultKeywordShape` | deps |
| 新助手 `LeadingDeclarationKeyword`（跳过 export/default/declare/abstract/async/const 找声明词） | :112 |
| 新助手 `BodyDeclarationKeyword`（`export default` 后判 class/function/interface/enum） | :137 |
| 多声明边界循环：换行后的 `@` 是下一条声明起点；补 `async` | :433-444 |
| 装饰器开头的 class：整段交 `ClassDeclarationShape.FromUnits` | :500-515 |
| `export const enum` 不被 `isExportVariable` 抢走 | :587-591 |
| export 声明族补 `enum` / `const` 修饰词 | :627-663 |
| `export default` + 声明形：建声明（class 用 AllowAnonymous；function/interface 手工插 Default/Export keyword） | :698-772 |
| class 识别改为「修饰词 + class」 | :876-878 |
| `export import =` 识别 | :955-981 |
| function 识别改为「修饰词 + function」 | :984 |

构建：`xl_build(cwd=cover5-end-build, paths=["core","typescript"], targets=["ts"], out="dist")` →
`1 written / 862 skipped / 0 error`（其余是既有 W3102/W3103 文档噪音 + 3 个既有 E2004 孤儿产物）；
`tsc -p tsconfig.json` → 0 error。

## 6. 新增用例

`typescript/cases/end-build.ts` 末尾追加 `// ══ cover5 round5（end build）…` 段，**+54 条**
（end-build stem 120 → 174），一行一例、行内 `\n` 转义、无重复；两组派生快照同步更新。

分组与数量：① abstract/declare abstract class 11；② async/declare async function 11；
③ export enum / declare / const enum 7；④ export import = 6；⑤ export default 声明形 9；
⑥ 装饰器开头的 class 10。每组 base 先行，随后是 trivia 变体（空行 / 前缀行注释 / 前缀块注释 /
后缀行注释 / 后缀换行）与重复形（三条声明连排）；同一 stem 无重复行（探针脚本核对）。

## 7. 复跑方法

```powershell
cd C:\Users\Admin\Documents\GitHub\xl-example-set\cover5-end-build
node typescript/cases/ast-json.mjs
node typescript/cases/ast-json-diff.mjs
node typescript/cases/token-ast.mjs --quiet
node typescript/cases/real-dts-ast.mjs
.\node_modules\.bin\tsc.cmd -p tsconfig.json
```

## 8. 需裁定 / 遗留（不属于 end build，转交对应类别）

### 8.1 `export { a } from "m"` ⏎ `type T = A`（end-compute）

TS：两条声明（ExportDeclaration[0,21] + TypeAliasDeclaration）；本仓：ExportDeclaration 撑到
`0,32/0,40`，`type T = A` 被吃进声明。根因在**终结候选的 ComputeByIndex 判据**：
`export-declaration-end-possible-shape.xl.md:95/:157` 的 `CanEndAt` 延续词表含 `type`（换行后的
`type` 被当成「export type」的续接词）→ 不 Accept。import 侧已经因为同一问题把 `type` 从表里剔除
（`import-declaration-end-possible-shape.xl.md:94-97` 写明理由），export 侧建议同样处理，
或把「`type` 只在 `export type {…}` 的声明头位置算续接」的判据下沉。**属 end compute 不对**。

### 8.2 U+2028 / U+2029 不是 ASI 断句点（end-compute，非 end build）

本分支基线里 U+2028/2029 还**不是 trivia**（会被 `Common`/数字吞：`a<LS>b` 成一个 Identifier、
`1<LS>` 报「不是数字字面量」），所以基线现状首先是 basic-token 的账。按 Lead 说明，basic-token
作者已在 ts 层把空白表扩成 ECMAScript WhiteSpace+LineTerminator；本分支做了一次**本地模拟**：
`TypeScriptSymbolTemplate.IsWhiteSpace` 临时补 `\u2028/\u2029`（模拟补丁已撤回，不在提交里）后复测：

- `function f(){ return<U+2028>1; }`：TS = `ReturnStatement[13,20]` + 独立 `ExpressionStatement(1)`；
  本仓 = `ReturnStatement[13,23]` 把 `1` 当返回值 → **ASI 换行判据不认识 U+2028**。
- `a<U+2028>b;`、`throw e<U+2028>foo;` 仍 crash「表达式语句没有读完」；`break<U+2028>1;` 把 `1` 当标签。
- 反例：`function f(){ return<U+2028>; }`、`class C {}<U+2028>class D {}`、`const x = 1;<U+2028>const y = 2;`
  在模拟口径下已绿（这些不依赖换行判据）。

**判定：end-compute（终结候选的 ASI 判据只认 `\n`/`\r`）**，不是 end-build 的 End 取值。
要扩的判据点（本分支现状）：`expression-statement-possible-shape.xl.md:171-186`（`HasLineBreak`）、
`statement-builder.xl.md:1170-1205`（`HasLineBreakAfter`）、`function-declaration-possible-shape.xl.md:308/338`、
`expression-builder.xl.md:650/668`、`statement-scanner.xl.md:657`、`member-boundary.xl.md:76`、
`typescript-template.xl.md:130`。建议端到端判定统一成一个「ECMAScript LineTerminator」助手，随 basic-token
合并后由 end-compute 作者收口。

### 8.3 装饰器尾随声明在「函数类声明前缀」之后（end-compute ＋ possible-build）

`declare function gf(): void` ⏎ `@dec class C {}`（以及 `function h(a: A): B` 前缀、三条连排）共 18 条
修复后仍红：TS 是两条声明，本仓把 `@dec class C {}` 当成上一条函数的**函数体 / 返回类型**（trace 里
`FunctionDeclaration` 多出 `Block[27,43]`，或抛「函数声明的返回类型没有读完」）。根因在
`FunctionDeclarationPossibleShape` 的 EOF Compute/Accept（候选应在装饰器/换行边界 Reject）
＋ `function-declaration-shape.xl.md:169` 的 `bodyIsLast = TypeBuilder.IsBodyBrace(...)`（把下一条
声明的 `{}` 当函数体）。**属 end compute（判据）＋ possible build（取错体）**，不在本类 case 里。

### 8.4 无体 ambient `global {}` 作为尾随声明（modules 侧）

`declare function gf(): void` ⏎ `global {}` / `global { const x = 1 }`：crash「表达式语句缺少分号」。
`global` 是 ModuleDeclaration 的 global 关键字形，module 分派/边界判据仍有缺口；形态极冷门
（只出现在全局增强语境），留待 modules 侧裁定。**不属 end build。**

### 8.5 模板块成员里的 `export { … }`（缺少 possible，modules 类）

`declare module "m" { export { a } }`：TS = ModuleDeclaration > ModuleBlock > ExportDeclaration >
NamedExports；本仓 = Block + ExportKeyword + ExpressionStatement。`declare module "m" { export { a } from "n" }`
crash「表达式没有读完」。根因：`module-block-shape.xl.md:95-111` 的 `BuildMember` 分派只覆盖
export-as-namespace / import-equals / 声明族，`export {…}` 落到 `StatementBuilder.BuildStatement`。
**缺少 possible**，不属 end build。
