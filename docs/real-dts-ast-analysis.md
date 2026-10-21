# 全量 AST 实测：语料内已全绿，真实 `.d.ts` 暴露 112/226 崩溃

本文回答 `IMPORTANCE.md` §6 的两个问题：**跑完全量 AST 之后，剩下的红点属于七类里的哪一类**，
以及**按「何时 build / build 提什么 / 何时 close / close 提什么」该怎么修**。
本文只做只读测量与归因，没有改任何 shape / possible / end / basic token。

## 0. 直接回答

| 口径 | 结论 |
| --- | --- |
| `typescript/cases` 全量 AST 对拍 | **4497 / 4497 完全一致**，结构差 0 / 位置差 0 / 字段差 0 —— **七类问题一个都没有** |
| 语料 `//` deferred + 边界探针（105 条） | 11 条红：**8 条 TS 自身非法**（尺子不测）＋ **3 条 TS 静默恢复**（`throw\na;` ×2、`class {}`） |
| 真实 `.d.ts`（README 口径：lib / @types/node / undici-types，226 份） | **114 份解析成功且 AST 114/114 完全一致**；**112 份直接抛异常**，且 112 份**全部是合法 TS**（`parseDiagnostics = 0`） |

所以「哪个问题」的答案是分层的：

1. **已收进 `typescript/cases` 的形态：七类全 0**，不是「某类没修好」，而是这一层没有红点。
2. **语料之外的真实世界里**：不是某一个类别，而是 **`possible build`（类型/成员产生式缺口）为主、
   `end`（无分号 ambient 收口）次之、`possible compute` 两处、`basic token` 0 处**。
   `112` 份崩溃按首条报错分成 **16 种消息、15 个根因**，下面逐条给最小复现与归类。
3. `README.md` 里「node_modules 下 200 个真实 `.d.ts` 全部解析成功、零异常」这句话**对本分支不成立**：
   它描述的是 `dawn/text/parse-pipeline` 那套旧架构（本分支没有 `dawn/`），
   当前 shapes 架构实测 226 份里 112 份崩溃。这条旧结论应当视为 **stale claim**。

## 1. 基线读数（可复跑）

```bash
node typescript/cases/ast-json.mjs          # 4497 条用例，cj-ok = 4497
node typescript/cases/ast-json-diff.mjs     # 合计 4497 条：完全一致 4497 / 4497
node tmp/probe-reds.mjs tmp/reds-all.json   # 105 条 deferred/边界探针 → RED 11 / 105
```

- 用例：32 个构造，4497 条，`cj-ok 4497`。
- 对拍：结构差 0、位置差 0、字段差 0。
- 探针 11 条红 = 8 条 TS 非法 + 3 条 TS 静默恢复（§2）。

## 2. 语料外探针：11 条红里只有 3 条是「可测但没对齐」

### 2.1 8 条 TS 自身非法（`parseDiagnostics ≠ 0`，尺子不测）

`export …\nwith {…}` 系列、`export declare\ninterface` / `export abstract\nclass`、
`class C<T<U>>`、`import source` 等。它们不是 shape 层缺陷：TS 自己都不接受。
本轮结论不变：**不追、不入尺子**。

### 2.2 3 条 TS 静默恢复（`parseDiagnostics = 0`，可测但 TS 的 AST 是恢复产物）

| 形态 | TS 的 AST | 本仓现状 | 归类 | 备注 |
| --- | --- | --- | --- | --- |
| `class {}` | `ClassDeclaration[0,8]`，**没有名字 child**，无诊断 | `ExpressionStatement[0,7] > ClassExpression` | **possible compute 不对** ＋ **possible build 不对** | `ClassDeclarationPossibleShape` Stage 2 见到 `{` 直接 Reject（等名字）；`BuildByIndex` 只调 `FromUnits`（要求名字）。`FromUnitsAllowAnonymous` 已存在（export default 用），**不需要合成节点** |
| `throw\na;` | `ThrowStatement[0,5]`，child 是**零宽 `Identifier[5,5]`**，`ExpressionStatement[5,8]` | `ThrowStatement[0,8]`（把 `a` 当表达式吞掉） | **end compute 不对**（throw 的受限产生式换行没断句）＋ **end build 不对**（`BuildReturnOrThrow` 只对 `return` 分流，throw 建了表达式） | 要逐节点相同还得**合成零宽 Identifier 子节点（text = ""）**——这是决策点，不是纯 shape 层 |
| `throw\na` | 同上 | `ThrowStatement[0,7]` | 同上 | 同上 |

`throw` 两条的根因出处：

- `typescript/tokens/statements/statement-scanner.xl.md:163` 把 `return` / `throw` **一起**丢给
  `ScanToSemicolon`，所以 `throw\na;` 的语句终点是 `;`，不是换行。
- `typescript/tokens/statements/statement-builder.xl.md:818-824` 的换行分流只对 `!isThrow` 生效，
  注释里已经写明「throw is left as is (core-blocked: TS recovery emits a zero-width Identifier child)」。

## 3. 真实 `.d.ts` 读数：226 份 → 112 份崩溃（全部合法 TS）

复跑（只读）：

```bash
node tmp/real-crash-groups.mjs      # 按首条报错归组 + 每组首个文件
node tmp/probe-real-ast.mjs @<ok 文件>   # 能解析的那批：AST 对拍
```

```text
total 226   parse-ok 114   crash 112
crash 且 TS 合法（parseDiagnostics = 0）: 112 / 112
114 份 parse-ok 的：AST 完全一致 114 / 114（结构差 / 位置差 / 字段差 全 0）
```

**结论：能解析的那一半，AST 是逐节点精确的；问题全在「解析不了」——即 candidate / builder 缺产生式，
不是位置/字段口径漂移。** 这正好落在 §6 的 `possible build` / `缺少 possible` / `end` 三族。

### 3.1 16 种首错消息

| 首错消息 | 文件数 | 代表文件 |
| --- | ---: | --- |
| 不支持的类型起点 | 24 | `lib.decorators.d.ts` |
| 类成员缺少函数体 | 18 | `undici-types/agent.d.ts` |
| 计算属性名只支持简单标识符 | 16 | `lib.es2015.symbol.wellknown.d.ts` |
| 缺少标识符 | 11 | `lib.dom.d.ts` |
| 表达式没有读完 | 9 | `typescript.d.ts` |
| 表达式语句没有读完 | 6 | `undici-types/cache.d.ts` |
| 类成员名字不是标识符 | 5 | `@types/node/async_hooks.d.ts` |
| 不支持的对象类型成员 | 4 | `lib.es5.d.ts` |
| Cannot read properties of undefined (reading 'IsTriviaToken') | 4 | `undici-types/api.d.ts` |
| 不支持的表达式起点 | 4 | `undici-types/fetch.d.ts` |
| 类成员参数不是标识符 | 3 | `@types/node/child_process.d.ts` |
| ImportDeclarationShape.Close: 未识别的单元（Common） | 3 | `undici-types/client.d.ts` |
| 泛型实参缺少 > | 2 | `@types/node/dns/promises.d.ts` |
| 类型意外结束 | 1 | `@types/node/net.d.ts` |
| 属性的类型没有读完 | 1 | `undici-types/errors.d.ts` |
| 函数声明缺少函数体或分号 | 1 | `undici-types/util.d.ts` |

> 计数是「每个文件的第一条报错」，同一文件往往还有后续根因；下表按**根因**合并，同一形态在多个消息里出现时注明。

### 3.2 15 个根因 → 七类归类（最小复现均已实测）

| # | 根因 | 最小复现（全部 `parseDiagnostics = 0`） | 首错消息 | 归类 | 修点 |
| --- | --- | --- | --- | --- | --- |
| R1 | 前导 `\|` / `&` 的联合/交叉类型 | `type T = \| A \| B;` / `type T = & A;` | 不支持的类型起点 | **possible build 不对**（`ParseType` 不认前导运算符） | `type-builder.xl.md:265` `ParseType` / `:569` |
| R2 | ambient 类成员**无分号、换行分隔**（`.d.ts` 常态） | `declare class A { x: number\n y: string }` / `declare class A { m(): void\n n(): void }` / `declare class A { constructor (a?: A) }` | 类成员缺少函数体 / 属性的类型没有读完 / 方法的返回类型没有读完 | **缺少 end ＋ end compute 不对**（成员收口只认 `;` 与 `{}` 体，无 ASI） | `class-declaration-shape.xl.md:502` `BuildMembers` / `:785` |
| R3 | 计算属性名是**属性访问**（`Symbol.iterator`） | `interface I { [Symbol.toPrimitive](h: string): symbol; }` | 计算属性名只支持简单标识符 | **possible build 不对**（TypeBuilder 计算名只认单标识符；class 侧已支持） | `type-builder.xl.md:857-953`（`:870-871`） |
| R4 | **泛型调用签名** `<T>(…)` | `interface I { <T>(value?: T): boolean; }` / `type T = { <T>(x: T): T };` | 不支持的对象类型成员 | **possible build 不对**（`ParseTypeMember` 无 `<` 分支；construct signature 已有） | `type-builder.xl.md:964-977` |
| R5 | 类成员名是**泛型方法** / 字符串字面量 | `declare class A { m<T>(x: T): T; }` / `declare class A { "foo"(): void; }` | 类成员名字不是标识符 | **possible build 不对**（成员名只认 `Common`） | `class-declaration-shape.xl.md:717` |
| R6 | 类成员参数是 **rest / 解构** | `declare class A { m(...args: any[]): void; }` / `m({a}: X)` | 类成员参数不是标识符 / 缺少标识符 | **possible build 不对**（`ParameterShape` 只认 name / name? / name:type） | `class-declaration-shape.xl.md:485` |
| R7 | 函数/方法**返回类型本身是对象类型**（或泛型实参里含对象、联合含 `{}`） | `declare function f(): { b: B };` / `declare class A { m(): { b: B }; }` / `declare function f(): Promise<{ b: B }>;` | 函数声明的返回类型为空 / 方法的返回类型为空 / 泛型实参缺少 > / 类型意外结束 | **possible compute 不对**（候选把返回类型里的 `{` 当函数体、提前 Accept）＋ **possible build 不对**（`FromUnits` 把尾 `{` 当体，`ParseReturnType` 对 `{` 不认） | `function-declaration-shape.xl.md:163-194`；`function-declaration-possible-shape` |
| R8 | `export interface` **带成员** | `export interface I { a: A }` | 表达式语句没有读完 | **possible compute 不对**（Stage 11 的「接口体非空就 Reject」是成员未实现时代的旧守卫，现已过时） | `export-declaration-possible-shape.xl.md:451-455` |
| R9 | `export declare function` / `export function` **无分号** | `export declare function f(a: A): B` | 表达式语句没有读完 / 不支持的表达式起点 | **缺少 end**（export 候选只在 `;` Done；根 EOF 兜底只认 type / import= / function，无 `export function` 支路） | `source-file-end-possible-shape.xl.md:363-370` |
| R10 | namespace 体里的 ambient function **无分号** | `declare namespace N { function f(): B }` | 函数声明缺少函数体或分号 | **end compute 不对**（模块体语句收口缺 ASI） | `module-block-*` / statement scanner |
| R11 | `import …` 无分号，**下一行是 `type` 声明** | `import x from "m"\ntype X = A;` | ImportDeclarationShape.Close: 未识别的单元（Common） | **end compute 不对**（`CanEndAt` 把 `type` 列为延续词；但 `IsCompleteAt` 已经拦住未完成的 `import type`，这一条是冗余且有害的） | `import-declaration-end-possible-shape.xl.md:144` |
| R12 | 可选属性类型以 `(` 开头（括号类型 / 函数类型） | `interface I { a?: (A \| B) }` / `a?: () => void` | 缺少标识符 / 不支持的对象类型成员 | **possible build 不对**（`?` 后的 `(` 被一律当可选方法的参数表；TS 只在 `)` 后跟 `:` 时才是方法） | `type-builder.xl.md:1017-1034` |
| R13 | 返回类型里联合含 `{}` | `declare class A { m(): A \| {}; }` | 类型意外结束 | **possible build 不对**（`ParseReturnType` 与 `ParseType` 口径不一致） | `type-builder.xl.md` `ParseReturnType` |
| R14 | namespace/module 体里的 **`declare <声明>`**（class/interface/enum/namespace/module） | `declare namespace A { declare interface I {} }`（`declare function/type/const/let/var` 已 OK） | 表达式没有读完 | **缺少 possible**（body 语句分派没有开这些 declare 前缀入口） | `statement-builder.xl.md:238`（只处理 declare + 变量） |
| R15 | 内部异常（候选/缓存状态越界） | `declare function request<T>(…)：Promise<…>` ＋ 紧跟 `export { … }`（单条都不复现，**成对**才复现） | Cannot read properties of undefined (reading 'IsTriviaToken') | **不是七类**（core 状态 bug，需单独 trace） | 待定位（`SourceFile……` 候选越界读 `units[i].IsTriviaToken`） |

### 3.3 每一族对应的「五个问题」

**A. end 族（R2 / R9 / R10 / R11 ＋ §2 的 throw）**

- **正确的应该什么时候 build**：终结判据在「下一条语句 / 下一个成员的第一个**代码**单元」上成立时
  （换行 + 前一个代码单元能收住 + 当前单元不是延续符），由终结候选或成员扫描器 `Accept/Build`；
  `;` 与 EOF 走既有老路。**不要在 `;` 之前顺手把下一条吞进来。**
- **build 时应该提取哪些信息**：`Start` = 首个修饰符/关键字；`End` = **最后一个非 trivia 代码单元**的 End；
  字段只从子形状取（名字 / 类型 / 参数 / 体），`;` 与 trivia 永远不进 AST。
- **什么时候 close**：`;` 路径、ASI 边界、EOF 哨兵三条；成员级多一条「下一个成员起点」。
  连续的两个声明（或两个 ambient 成员）之间必须是边界，而不是继续同一个 shape。
- **close 时应该提取哪些信息**：End 跳过 trivia；成员区间按 TS 口径含自己的 `;` / `,`；
  函数体/成员体字段在 close 前已由 build 摘好；basic token 残留按白名单丢弃。
- **本轮要小心的具体点**：R11 是 A/B 那轮引入的回归——`CanEndAt` 的延续词表里
  `type`（以及 `from` / `as` / `defer`）在 `IsCompleteAt` 已经判完整之后是**冗余**的；
  只有 `with` / `assert` 需要留在表里。

**B. possible build 族（R1 / R3 / R4 / R5 / R6 / R7 / R12 / R13）**

- **正确的应该什么时候 build**：candidate 的 `ComputeByIndex` 判到**结构完整**那一刻（`IsBuildable` 为真），
  builder 只消费已判定的范围。R7 的病根正好在这里：候选在返回类型的 `{` 上就 Accept 了，
  把「类型里的对象字面量」误当「函数体」——**build 时机错，build 内容就必然错**。
- **build 时应该提取哪些信息**：严格按 TS 的 children 顺序取：
  修饰符 → 名字 → 类型参数 → 参数 → 返回类型 → 体；分隔符计入成员区间但不进 AST。
- **什么时候 close**：子形状建完立刻 `TryToClose`（或交给父单元收），成员区间在 close 时按 TS 含分隔符；
  不覆盖 `ExitOrPre`、不覆盖 `ComputePossibleShapes`、被消费的 basic token 一律丢弃。
- **close 时应该提取哪些信息**：名字 / 类型 / 参数 / 返回类型 / 体；End = 最后代码单元（含 `;`/`,`）；
  计算名（R3）要按 `ComputedPropertyName` 装表达式而不是只装 Identifier。

**C. possible compute 族（R8）**

- **正确的应该什么时候 build**：接口体 `{}` 闭合、成员已能由 `InterfaceDeclarationShape` 建出时 Accept。
- **build / close 提什么**：与普通 `interface` 完全一致（成员节点、区间已实现）；
  只是导出候选的 Stage 11 还留着「非空就 Reject」的旧守卫——**删守卫**即可，不需要新 build 逻辑。
- 对照：`export class C { x = 1 }` 已经能走通（Stage 10 早就不看空体），说明差值只在 Stage 11 这一条。

**D. 非七类（R15）**

- 不是任何一项 compute/build/end 判据写错，而是**候选状态越界**：单条语句不复现、成对/成前缀才复现，
  指向候选 cache 或 `Start` 未随新语句重置。需要单独立项 trace（可能要动 `core/**`，是约束外）。

**E. basic token**

- **0 条。** 16 种报错没有一个来自 basic token：`[Symbol.toPrimitive]` 被正确收成一个 `Bracket` 单元、
  `?:` 被正确收成一个组合 `Symbol`、`|`/`&`/`...` 都是正常单元。
  问题全部发生在其上的 compute/build。**本轮不需要你为 basic token 拍板任何场景。**

## 4. 这些缺口为什么没被 cases 拦住（语料洞）

`typescript/cases` 是全绿的，但它**没覆盖**上表里的这些合法形态（`grep` 实测 0 命中）：

| 语料洞 | 真实世界触发 |
| --- | --- |
| 前导 `\|` / `&` 类型、`interface` 成员 `?: (` 括号类型、泛型调用签名 `<T>(…)` | lib / @types 大量 |
| `declare class` 的 rest 参数、字符串/泛型成员名 | @types/node / undici-types |
| `export interface` 带成员（语料只有 `export interface I {}` 空体） | undici-types / lib |
| `import …` 无分号后接 `type` 声明（A/B 那轮的回归） | undici-types |
| `.d.ts` 常态：ambient 成员/函数**无分号、换行分隔** | 几乎全部 .d.ts |

上一轮的 coverage 结论是「按 SyntaxKind 度量、measurable 全覆盖」，但尺子量的是**节点种类**，
不是**源码形态组合**。这次真实语料证明：**节点种类的全覆盖 ≠ 语法的全覆盖**。

## 5. 建议修法次序（按性价比）

1. **P0 R11（回归）**：`CanEndAt` 延续词表收紧到 `with` / `assert`（`IsCompleteAt` 已兜底）；
   补 3 条 case（`import x from "m"\ntype X = A;` / 后接 interface / class）。
2. **P1 R8（合法 TS 的语料洞）**：删 `export-declaration-possible-shape` Stage 11 非空守卫；
   新 stem 覆盖 `export interface I { a: A }` 家族（base + trivia + 成员形态）。
3. **P2 R2 / R10 / R9（end 族，真实 .d.ts 最常见）**：类体成员、namespace 体函数、`export function/declare function`
   三处的无分号 ASI 收口。修完预期能解掉最大一批崩溃（18 + 1 + 4 + …）。
4. **P3 R1 / R12（两处很小、收益很大）**：`ParseType` 前导 `|`/`&`；`ParseTypeMember` 的 `?: (` 消歧
   （`?` 后 `(` 只在 `)` 后跟 `:` 时才是方法参数表）。
5. **P4 R3 / R4 / R5 / R6 / R7 / R13 / R14**：类型/成员 builder 产生式补齐（计算名、泛型调用签名、
   类成员名、参数、返回类型分段、`declare <decl>` body 分派）。
6. **P5 R15**：单独 trace 的 core 状态 bug，先定位再谈是否解除「不动 core」。

每一步的验收口径都应该是：**`npm run cases` 全绿 + 对应的新 cases 逐条 AST 一致 + 真实 `.d.ts` 崩溃数下降**，
并且把「真实 `.d.ts` 崩溃数」记成一条可复跑读数（否则修完又会漂回去）。

## 6. 留给用户决定（本轮已按「全解决」落地，见 §9；下面保留为当时的决策记录）

1. **basic token**：本轮 0 条，不需要决定。
2. **TS 静默恢复 3 条**（`class {}` / `throw\na;` / `throw\na`）：
   - `class {}` 便宜（`FromUnitsAllowAnonymous` 现成、无需合成节点），要不要收？
   - `throw` 需要**合成零宽 `Identifier` 子节点 + 空文本口径**（`cjAst` 目前只在非空 `EscapedText/Text` 时写 `text`），
     本质是把 TS 的恢复产物复制进 AST。追还是记为 TS-recovery 不追？
3. **真实 `.d.ts` 的修复范围**：先做 P0–P2（回归 + 合法 TS 语料洞 + end 族），还是按表整族推进？
   是否解除「不动 core」以处理 R15？是否把 README 的 stale claim 改成当前实测读数？
4. **验收门**：是否把「真实 `.d.ts`（226 份）解析崩溃数 / AST 一致数」加进固定门禁（建议加，否则本次发现无法防回归）。

## 7. 复跑与探针清单

```bash
# 语料内（权威尺子）
node typescript/cases/ast-json.mjs
node typescript/cases/ast-json-diff.mjs

# 语料外：105 条 deferred/边界探针
node tmp/probe-reds.mjs tmp/reds-all.json

# 真实 .d.ts：崩溃清单 / 分组 / 能解析那批的 AST 对拍
node tmp/real-crash-groups.mjs
node tmp/narrow-crash.mjs <file>            # 递归找最小崩溃节点
node tmp/narrow-block.mjs <file>            # 模块/命名空间体内逐条找崩溃语句
node tmp/probe-real-ast.mjs <files...>      # AST 对拍
node tmp/min-repro*.mjs                     # 本文每条最小复现
```

> 探针脚本都在未跟踪的 `tmp/` 里（沿用本仓前几轮的习惯）；本文没有改任何 `typescript/**` 源。

## 8. 附带观察（未改，登记备查）

- `typescript/tokens/files/source-file-end-possible-shape.xl.md:260` / `:292` 两行注释是 **UTF-8 被按 GBK 读坏的乱码**
  （`鏃犲垎鍙峰埌 EOF…`）。不影响行为，但属于前几轮 docs-repair 的同一类残留在**源页**里的实例。
- `README.md` 的「200 个真实 `.d.ts` 零异常」与「`dawn/text/parse-pipeline` 是优先级唯一来源」都描述旧架构，
  与本分支（`typescript/` shapes + `core/`）不符，应改成本文 §3 的实测读数，否则下一次还会被当成基线。

## 9. 落地状态（R1–R15 全部修完，226/226）

**最终读数**

```text
node typescript/cases/ast-json.mjs        → 4622 / 4622 cj-ok（34 个构造）
node typescript/cases/ast-json-diff.mjs   → 4622 / 4622 完全一致；结构差 0 / 位置差 0 / 字段差 0
node typescript/cases/real-dts-ast.mjs    → 文件 226（跳过 TS 非法 0）：解析成功 226、崩溃 0；
                                            AST 完全一致 226、有差异 0
node tmp/probe-reds.mjs tmp/reds-all.json → RED 8 / 105（8 条全部是 TS 自身非法，尺子不测）
tsc -p tsconfig.json                      → 0 error
```

修之前：真实 `.d.ts` **112/226 解析崩溃**、能解析的 114 份 AST 一致；语料 4497/4497。
修之后：**226/226 解析成功且 226/226 AST 逐节点一致**；语料 4622/4622。

**按根因的落地位置**（全部在 `typescript/` 层，未改 `core/**`）

| 根因 | 修法落点 |
| --- | --- |
| R1 前导 `\|` / `&` | `types/type-builder`：`ParseUnionType` / `ParseIntersection` 认前导运算符（单成员也包一层） |
| R2 无分号 ambient 类成员 | `class-declaration-shape`：成员类型/返回类型改为贪心解析 + 换行处收口 |
| R3 计算属性名 | `type-builder`：计算名用 `ExpressionBuilder` 读表达式；class 侧对齐 `ComputedPropertyName.Pos` |
| R4 泛型调用签名 | `type-builder.ParseTypeMember`：`<` 分支建 `CallSignature`（TypeParameter → Parameter → 返回类型） |
| R5 类成员名（泛型方法 / 字符串 / 数字） | `class-declaration-shape`：名字后先解析 TypeParameterList；String / NumericLiteral 名字 |
| R6 rest / 解构参数 | `type-builder.ParseParameter`：`{…}` / `[…]` 绑定模式；class 参数走同一入口 |
| R7 返回类型是对象 | `function-declaration-possible-shape`：`{` 只在「前一个单元能收住类型」时才是函数体；`TypeBuilder.IsBodyBrace` |
| R8 `export interface` 成员 | `export-declaration-possible-shape`：删掉「接口体非空就 Reject」的旧守卫 |
| R9 export function 无分号 | `source-file-end-possible-shape.BuildTrailingDeclaration`：开放 export [declare] [async] function / class / interface / enum / namespace / global |
| R10 namespace 体函数无分号 | `module-block-shape`：函数/类型别名/变量成员的换行收口与合成 `;` |
| R11 `import` 后接 `type` | `import-declaration-end-possible-shape.CanEndAt`：延续词表去掉 `type` |
| R12 `?: (` 歧义 | `type-builder.ParseTypeMember`：`?(` 只有 `)` 后跟 `:` 才是可选方法 |
| R13 `declare <decl>` 进 namespace 体 | `module-block-shape`：分派关键字跳过 declare / abstract；修饰词 Pos 重锚 |
| R14 真实 .d.ts 其余形态 | 计算名泛型方法、字符串/数字成员名、`typeof x.y<T>`、`intrinsic`、负数字面量、继承列表逗号、匿名类、import-equals… |
| R15 内部异常 | `BuildTrailingDeclaration` 的递归兜底不再拿 splice 后的旧下标（越界读 `undefined.IsTriviaToken` 消失） |
| TS 恢复 `class {}` | `class-declaration-possible-shape`：Stage 2 接受匿名 / 匿名泛型 / 无 heritage 名；build 走 `FromUnitsAllowAnonymous` |
| TS 恢复 `throw\na` | `statement-scanner.ScanReturnOrThrow` + `statement-builder.BuildReturnOrThrow`：换行断句 + 合成零宽 `Identifier`；`cjAst` 允许 `text=""` |

**新语料**：`typescript/cases/dts-types.ts`（103 条：上面所有合法 TS 形态的 base + trivia / 重复形）与
`typescript/cases/dts-recovery.ts`（22 条：`throw` 受限产生式换行 + 匿名类恢复 + 对照）。

**新门禁**：`typescript/cases/real-dts-ast.mjs`（`npm run ast:dts`）——226 份真实 `.d.ts` 必须全部解析成功且
AST 逐节点一致；`npm run ast:verify` 一次跑「语料 + 真实 .d.ts」两门。`README.md` 的 stale claim 已改成实测读数。

