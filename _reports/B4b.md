# B4b · 表达式括号目录默认打开（12 条崩溃的消费分支 + 关闭钩子）

| 项 | 值 |
| --- | --- |
| 角色 | 站点智能体 B4b（B4 的默认关 → 默认可用） |
| 工作副本 | `C:\Users\Admin\Documents\GitHub\xl-example-set\b4b-expr-on`，分支 `feature/b4b-expr-on` |
| base | 主仓库 HEAD `e5c22add`（B4 已合并，`EnableExprBracketCatalog=false`） |
| 性质 | 默认打开 + **消费分支 / 判据修复**；没有新增建树路径；新增一个 core/B0 关闭钩子 |
| 构建 | `xl_build {core,typescript}` **631 页 / 0 error / 3 warning**（3 条均既有 `E1107`）；`tsc -p .` exit 0 |
| 未合并 / 未 push / 未删目录 | 是 |

---

## 0. 结论先行

1. **`EnableExprBracketCatalog` 默认改为 `true`**（`statement-route-util.xl.md`），不再需要运行时拨开关。
2. **B4 打开后的 12 条崩溃全部清零**，全部落在「legacy 消费分支只吃 basic token / 提前收口」这一族；
   修法是把判据补齐到 `ExpressionBracketPossibleShape.IsBuildable` / `SealMember` / `SealPendingShorthand`
   与 `BracketRoleResolver.Classify`（§1、§2）。没有改任何 legacy 解析入口的建树顺序。
3. **默认档四道门与 base 逐位相同**：`wide-ast` **0 / 33 / 98 PASS**、`--legacy` **0 / 0 / 2 PASS**、
   `real-dts` **PASS（0 / 33）**、`tts` **429 PASS**、`ts-all` **429 / 426 / 3**、`gates` **4 / 0 / 7**（§4）。
4. 修崩溃过程中还暴露出 **14 条次生崩溃**（封口后下标过期导致的 `TypeError`）与 **7 件 fallback 回归**
   （`fn-expression` / `expr-func-expr-named` / `type-parenthesized` / `type-union-in-paren*` /
   `lib.dom.d.ts` / `lib.webworker.d.ts`），一并修掉；`on` 档的 fallback 集合与 `off` 档**逐件相同**（§2.2）。
5. **目标 1（容器形状的 post-close hook）只落了 core/B0 钩子**，没有让表达式目录在关闭拍替换父单元
   （那需要 A4b/W1 的收口所有权切换，见 §5.1）。**目标 2（箭头 `(` 的 Deferred replay）没有接通**：
   `DeferredBracketCatalog.Replay` 只接受 `Known` 且 `Shapes` 非空的计划，而 `ArrowParams` 没有候选目录
   ⇒ `Bind` 只会失败并丢弃（见 §5.2）。两处卡点都写得可机械复核，没有用默认关掩盖。

---

## 1. 12 条崩溃的逐条根因与修法

> 复算：`node tests/parse/wide-ast.mjs --list-crashes`（修改前 12 条，修改后 0 条）。

| # | 用例 | 原错误 | 根因（实测） | 修法 |
|---|---|---|---|---|
| 1 | `decl-instantiation-followers` | 表达式意外结束 | `[f<number>]` 的 `f` 被建成 `IdentifierShape`，`AngleJudge.PredecessorAllows` 只认 `Common`/`Bracket`/`String` ⇒ `<` 落进 `ParseBinary` 被吃成比较链 | `IsBuildable`：单元原文**下一个非空白字符是 `<`** 时不给标识符建原子（`f<number>` / `f<T>(` 都交 legacy） |
| 2 | `ex-nonnull-member-chain` | 缺少标识符 | `{ v: 1 as number | null }`：值格 `1` 到达时 `as` 还没进 `Data`，`SealMember` 提前封 `v: 1`，`as number | null` 变成下一个成员的名字位 | 值格**不再**封成员；改由 `SealPendingShorthand` 在下一个原子到达（`,` 已在 `Data`）时回看封口 |
| 3 | `expr-array-of-arrows` | 不支持的表达式起点 | `{ a: () => 1, b: 2 }` 的箭头体 `1`（前一格 `=>`）在 `b` 到达时被 `SealPendingShorthand` 当成短写名字，箭头体消失 | 短写候选必须是**成员起点**（前一个代码单元是 `,` 或没有） |
| 4 | `expr-arrow-in-object-value` | 函数参数只支持标识符或绑定模式 | 值位 `(` 被 `Classify` 判成 `ParenExpression`，形参 `x`/`y` 与注解被建成原子，`BuildParameters` 读不到 `Common` | 复合字面量元素 / 值位 `(` 改为 **Deferred `ArrowParams`**（A2 §3 #4/#5 的第二处，不猜） |
| 5 | `expr-index-content-in-object` | 缺少标识符 | `{ start: range ? … }`：值 `range` 在 `?` 到达前被提前封成 `start: range` | 同 #2（值完整性推迟到下一个原子到达） |
| 6 | `expr-nonnull-unary-operand` | 不支持的表达式起点 | `{ get: 1, n: 2, m() {} }` 的值 `2` 在 `m` 到达时被短写封口 | 同 #3（成员起点判据） |
| 7 | `expr-object-keyword-method-names` | 不支持的类型起点 | `{ return(): number { … } }` 的返回类型名 `number` 被建成原子，`TypeBuilder.ParseReturnType` 读不到 `Common` | `IsBuildable`：前一格是**已闭合 `(` 括号** ⇒ 返回类型位，不建；`:` + `(` 组合同样挡 |
| 8 | `expr-object-member-named-function-import` | 不支持的类型起点 / 函数表达式缺少参数括号 | `function inner` 的 `inner` 被建成原子；`Promise<number>` 的类型参数也被建 | ① 函数 / 类**名字位**不建（前一格 `function`/`class`）；② 尖括号深度 > 0 不建；③ `IsCallCallee` 见到名字前的 `function`/`class` 让路 |
| 9 | `expr-object-member-named-if` | 不支持的类型起点 | `{ if(): number { … } }` 的返回类型名 | 同 #7 |
| 10 | `expr-object-members` | 不支持的对象类型成员 | `({ m(): { a: number } { … } })` 的返回类型对象字面量 `{` 被 `IsElementPosition` 判成 `ObjectLiteral`，`a`/`number` 建了原子 | `IsElementPosition`：`:` 的再前一格是**已闭合 `(`** ⇒ 返回类型位，返回 `false` |
| 11 | `expr-paren-in-arguments` | 函数参数只支持标识符或绑定模式 | `m: (v: number) => v * 2` 的值位 `(` | 同 #4 |
| 12 | `gap-r949-object-member-new-signature` | 不支持的类型起点 | `{ new (a: number): I }` 的返回类型名 `I` | 同 #7 |

### 1.1 修法汇总（4 处判据 + 1 处下标）

1. `IsBuildable` 新增五道闸：成员名位（既有）、`as`/`satisfies`（既有）、访问器 / `async` 名位（既有）、
   **返回类型位**（前格 `(` 或 `:`+`(`）、**尖括号深度 > 0**、**函数 / 类名字位**、**原文后随 `<`**。
2. `SealMember` 去掉「值格提前封 `a: 1`」；`SealPendingShorthand` 承担两种封口：
   ①候选前一格是 `:` 且再前一格是已建名字原子 ⇒ 封 `PropertyAssignment`（此时 `,` 已在 `Data`，值必完整）；
   ②候选前一格是 `,`/没有 ⇒ 封短写。
3. `BracketRoleResolver.Classify`：值位 `(` 改 Deferred；新增 `IsReturnTypeColon` / `IsTypeAnnotationColon`
   两道让路（返回类型 / 类型注解里的 `(`）；`IsCallCallee` 认 `function`/`class` 名字位。
4. `BuildByIndex`：封口可能摘掉本格之前的单元，**下标按身份重算**（`bracket.Data.indexOf(token)`），
   再算 `Pos` 与成员封口——修掉次生 `TypeError: Cannot read properties of undefined (reading 'IsTriviaToken')`。

---

## 2. 次生回归（修崩溃时暴露）与处置

### 2.1 14 条 `TypeError`（下标过期）

第一轮修完 12 条后 `wide-ast` 报 14 条 `Cannot read properties of undefined (reading 'IsTriviaToken')`，
全部来自 `BuildByIndex → SealMember → PreviousCode`：`SealPendingShorthand` 摘掉本格之前的 `:`/值后，
`tokenIndex` 已越界。修法见 §1.1 第 4 条，14 条一次清零。

### 2.2 7 件 fallback 回归（`on` 档比 `off` 档多出的文件）

用 `tmp/fallback-scan.mjs`（临时脚本，gitignored）逐件跑 `SourceFile.Parse` 并读 `LastFileFallback`，
`--off` 与默认档对比出 7 件；`--nofallback` 拿到首错：

| 文件 | 首错 | 根因 | 修法 |
|---|---|---|---|
| `fn-expression.ts` | 函数参数只支持标识符或绑定模式 | `function inner(` 的 `(` 被当成调用实参表 | `IsCallCallee` 让路（名字前是 `function`/`class`）+ 名字位不建 |
| `expr-func-expr-named.ts` | 同上 | 同上 | 同上 |
| `type-parenthesized.ts` | 不支持的类型起点 | `x: (A \| B)` 的类型注解 `(` 被判 `ParenExpression` | `IsTypeAnnotationColon` 让路 |
| `type-union-in-paren.ts` | 同上 | 同上 | 同上 |
| `type-union-in-paren-with-generic.ts` | 同上 | 同上 | 同上 |
| `lib.dom.d.ts` / `lib.webworker.d.ts` | 同上 | 同上（大量 `declare const x: (…) => …`） | 同上 |

对比结果：`on` 档 fallback 集合 = `off` 档 fallback 集合（本仓 85 + 白名单 13 = 98），一件不多。

---

## 3. 机制改动（不新增建树路径）

### 3.1 core/B0：`BracketCloseHook`（`core/syntax/basic-tokens/bracket.xl.md`）

`Bracket.Close` 在「`Closed = true` → `FlushOnClose` 补判 → 问父单元」之间插一次
`BracketCloseHook.Current.OnBracketClosing(this, context)`。`Current` 默认 `null` ⇒ 默认只多一次
`null` 比较，产物逐字节不变。它提供的正是 A2 §1 缺的那个信号：**`Data` 已完整、父单元尚未被问**，
实现方若要在这一拍改父单元 `Data`（容器形状）有自己的落点；core 不替它决定、也不建任何节点。

### 3.2 表达式侧判据（不改 legacy 建树）

- `ExpressionBracketPossibleShape.IsArrowParameterBracket`：`)=>` / `): T =>` 前瞻（父单元 `Data` 结构位，
  不读文本），挡住值位 `(` 里的形参被原子化。
- `IsBuildable` 的类型位 / 函数名位 / 尖括号 / 原文后随 `<` 四道闸；`SealPendingShorthand` 两段封口。
- `BracketRoleResolver` 新增 `IsReturnTypeColon` / `IsTypeAnnotationColon`，`IsCallCallee` 认名字位。

---

## 4. 验收读数（默认档，`EnableExprBracketCatalog=true`）

| 命令 | base `e5c22add`（开关 false） | 本提交（默认 true） |
| --- | --- | --- |
| `xl_build {core,typescript}` | 631 页 / 0 error / 3 warning | **631 页 / 0 error / 3 warning** |
| `node node_modules/typescript/bin/tsc -p .` | exit 0 | **exit 0** |
| `node tests/parse/wide-ast.mjs` | 0 / 33 / 98 PASS | **0 / 33 / 98 PASS** |
| `node tests/parse/wide-ast.mjs --legacy` | 0 / 0 / 2 PASS | **0 / 0 / 2 PASS** |
| `node typescript/cases/tts/run.mjs` | PASS 429 | **PASS 429 / FAIL 0** |
| `node typescript/cases/tts/tools/tshape-judge.mjs ts-all` | 429 / 426 / 3 | **429 / 426 / 3**（同三条） |
| `node tests/gates/run.mjs` | 4 PASS / 0 FAIL / 7 N/A | **4 / 0 / 7**（`wide-ast`、`real-dts` 两道尺子 PASS） |

`real-dts`：崩溃 0 / 差异 **0/33** / 缺 range 0 —— PASS。

---

## 5. 没做完的两条（可机械复核的卡点）

### 5.1 目标 1：容器 shape 的 post-close hook（只落了钩子，没有落消费）

现状：`BracketCloseHook` 已存在且被 `Close` 调用（§3.1），但**没有实现方**；`{`/`[`/`(` 的
`ObjectLiteralExpressionShape` / `ArrayLiteralExpressionShape` / `CallExpressionShape` /
`ParenthesizedExpressionShape` 仍然只在 `;` / `}` / `)` 的 legacy 收口格建出来（`Pos` 由收口路径给出）。
因此探针在**创建格**看到的仍是 `Bracket`（`Pos=-`），而不是容器形状。

卡点（与 B4 §4 容器形状那一条同一处，逐条核过）：
1. 在关闭拍把括号换成容器形状，必须**改父单元的 `Data`**，而把括号换成形状之后，legacy 收口
   （`CompositeInitializerJudge.Build` / `CallPossibleShape.BuildByIndex` / `P4`）会**再建一次**，
   两棵容器同时挂进父单元 ⇒ 树错（不是崩溃，更难查）。
2. 要让收口只消费已建容器，必须改 `variable-declaration-end-possible-shape`（W1/D2b）与 call / P4 的
   收口候选（A4b）——按任务书不在本棒写域；本棒只加了它们需要的**关闭信号**。
3. `Bracket.Close` 目前拿不到「父单元的数据槽位」，钩子只给 `bracket` + `context`；实现方要自己从
   `bracket.Parent.Data` 找槽位（钩子里可以拿到，但替换时机仍需与收口同一个 decide）。

结论：**钩子是这棒交付的机制**；「创建格出容器形状」的探针项**未通过**，卡点在上面的所有权切换。

### 5.2 目标 2：箭头 `(` 的 Deferred replay（未接通）

现状：`= (` / 值位 `(` 都登记 `Deferred ArrowParams`（探针 `deferred+1`），但**没有任何 owner 调
`DeferredBracketCatalog.Bind`**，因此 `ReplayCount` 仍为 0。

逐条卡点（读码 + 实测）：
1. `DeferredBracketCatalog.Replay` 先 `BracketCatalogInstaller.BuildGuide(effective)`，而 `BuildGuide`
   要求 `plan.IsKnown()` **且** `plan.Shapes.length > 0`；Deferred 计划两条都不满足 ⇒ `Bind` 只会
   返回空、`ReplayFailureCount+1`、`Drop`。
2. 于是要 replay 必须先有 **`ArrowParams` 候选目录**（`ArrowParamsCatalog`）把 `ParameterShape` /
   类型注解建出来——B3b 只留了 `EnableArrowParenCatalog`（默认 `false`）与 A4b 的 `"arrowparen"`
   前瞻，**没有落这个目录**（全仓 grep `ArrowParamsCatalog` 无实现）。
3. 参数一旦被逐字建成 `ParameterShape`，`BuildParameters` 必须改为消费已建参数；它与 `BuildParameters`
   的收口是**同一拍**（A4b / W1 的写域），不是本棒能安全接的。

结论：`ArrowFunctionShape` 的 `Bind` 调用点**没有加**——加了只会把 Deferred 条目变成失败计数并丢弃，
比不接更差；探针的「`=>` 后 replay 一次」**未通过**。

---

## 6. 探针（默认 true 下可直接复算）

`node typescript/cases/tts/tools/expr-bracket-probe.mjs`

| 片段 | `Resolve` 读数 | 计数 |
|---|---|---|
| `let x = { a: 1, b: 2, c };` | `{` → `Known ObjectLiteral` | `atoms+5 members+2 guides+1` |
| `let y = [1, 2];` | `[` → `Known ArrayLiteral` | `atoms+2 guides+1` |
| `let z = f(a, b);` | `(` → `Known CallArgs` | `atoms+2 guides+1` |
| `let w = 1 * (a + b);` | `(` → `Known ParenExpression` | `atoms+2 guides+1` |
| `let v = (a);` | `(` → `Deferred ArrowParams (arrow-paren-wait-for-arrow)` | `deferred+1`（**无 replay**，见 §5.2） |
| `class C { m(a: number) {} }` | 形参表 / 成员体归族（`family-installed`） | 0 |

> 探针原文的「收口后树里已无括号：容器形状顶替了它」在默认档仍然成立——括号在创建格是 `Bracket`，
> 容器形状由 legacy 在收口格建出并顶替。

---

## 7. 可复算命令

```powershell
$d = "C:\Users\Admin\Documents\GitHub\xl-example-set\b4b-expr-on"; Set-Location $d
xl_build { cwd: $d, paths: ["core","typescript"], targets: ["ts"] }   # 631 / 0 error / 3 warning
node node_modules/typescript/bin/tsc -p .                              # exit 0

node tests/parse/wide-ast.mjs                    # 0 / 33 / 98 PASS
node tests/parse/wide-ast.mjs --legacy           # 0 / 0 / 2 PASS
node tests/parse/wide-ast.mjs --list-crashes     # 0 条
node typescript/cases/tts/run.mjs                # PASS 429
node typescript/cases/tts/tools/tshape-judge.mjs ts-all   # 429 / 426 / 3
node tests/gates/run.mjs                         # 4 PASS / 0 FAIL / 7 N/A
node typescript/cases/tts/tools/expr-bracket-probe.mjs    # §6 的六个片段
```

`tmp/` 全部 gitignored，不提交（`tmp/crash-stack.mjs` / `tmp/fallback-scan.mjs` 是定位用的临时脚本）。
