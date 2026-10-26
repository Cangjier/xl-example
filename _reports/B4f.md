# B4f · 箭头形参的默认值（R1）与嵌套箭头（R2）

| 项 | 值 |
| --- | --- |
| 角色 | 站点智能体 B4f（补 B4d §6 的 R1 / R2） |
| 工作副本 | `C:\Users\Admin\Documents\GitHub\xl-example-set\b4f-arrow-edge`，分支 `feature/b4f-arrow-edge` |
| base | 主仓库 HEAD `4de5202a`（B4e 已合并；`EnableExprBracketCatalog=true`，K1 容器钩子默认关） |
| 改动 | 3 改 + 2 探针（新建 `arrow-edge-probe.mjs`；修改 `arrow-param-probe.mjs`） |
| 构建 | `xl_build {core,typescript}` **0 error / 3 warning**（3 条均既有 `E1107`）；`tsc -p .` exit 0；`xl check`（3 个改动文件）0/0 |
| 未合并 / 未 push / 未删目录 | 是 |

---

## 0. 结论先行

1. **R1 通了**：`(a: number, b = 1) =>` 不再 `RejectCount+1`、不再整表 legacy。`=` + 默认值表达式
   被 `Probe` 的**动作 9 逐字吃掉**，`b` 成 `ParameterShape` + `IdentifierShape`（+ 默认值节点），
   `ReplayCount == 1`、`Failure == 0`、`HalfBuild == 0`、`RejectCount == 0`。
2. **默认值内部的括号 / 对象 / 数组不会被误当形参表**：`Data` 里嵌套括号本来就是**一个单元**，
   顶上层的 `,` 才是形参分隔（`(a = [1, 2], b = f(3, 4), c = 5) =>` 的第三个参数仍是 `c`）。
3. **默认值的树与 legacy 逐节点一致**：建造器就是 legacy 的 `ExpressionBuilder.ParseAssign`
   （`= 1` → `NumericLiteralShape`、`= {x:1}` → `ObjectLiteralExpressionShape`），不写第二套。
4. **R2 通了（内层括号真的 replay 了）**：`(a) => (b) => a + b` 外层 + 内层**各 replay 一次**
   （base：内层 `Fallback/no-host-rule`、只 replay 1 次）；三层嵌套 `(a) => (b) => (c) => …` 是 3 次，
   每条括号 `ReplayCount` 恒 ≤ 1。角色从 `Fallback` 变成 `Deferred / nested-arrow-paren-wait-for-arrow`。
5. **负样本不误 replay**：`(a)` / `(a) + 1` / `f(a, b)` / `function fn(…)` / 箭头体的分组括号
   `x => (a) + 1` 全部 replay 0（条目留在 `Pending`，legacy 原路读 raw）。
6. **`x => (b) => b` 只做到角色，replay 仍为 0**：这条片段的**整文件增量解析在 base 上就已经抛异常**
   （`ArrowBodyPossibleShape` 只做 `Common` 体，`x => (` 那一格就抛），文件级 fallback 的 legacy 重解析
   不认领 Deferred 条目 ⇒ 不 replay。角色这一半做到了，replay 这一半**没做到**，§6 R5 给最小复现，
   本报告不把它当完成。
7. **默认档四道门不恶化**：`gates` **4 / 0 / 7**；`wide-ast` **0 / 29 / 96**（base 33 差异，**少 4 件**；
   fallback 83+13=96 逐位同基）；`real-dts` **PASS**；`tts` **PASS 429**；`ts-all` **429 / 426 ok / 3**（同三条）；
   `--legacy` **0 / 0 / 2**。

---

## 1. 改了哪几处

| # | 文件 | 动作 | 内容 |
|---|---|---|---|
| 1 | `typescript/tokens/types/parameter-list-possible-shape.xl.md` | 修改 | ① 新增单元级判据 `IsSimpleArrowList`（允许 `= <默认值>`，只给箭头 site）；② 新增 `DefaultValueEnd` / `BuildDefaultValue` / `CanBuildDefaults`（默认值的边界、建造、干跑闸）；③ `Probe` 新增**动作 9**：`=` + 默认值整段建成一个子节点并从 `Data` 里吃掉；④ `PreviousParamPos` 改成「壳里最后一个子单元优先」（见 §2.4）；⑤ 新增计数 `DefaultValueCount` |
| 2 | `typescript/tokens/expressions/forms/primary/arrow-params-catalog.xl.md` | 修改 | ① `IsArrowable` = `IsSimpleList` **或** `IsSimpleArrowList`；② `BindArrowParen` 增加 `CanBuildDefaults` **干跑闸**（判否 ⇒ `RejectCount+1`、整份不 replay）；③ 已 replay 的括号再被问一次时**不记 reject** |
| 3 | `typescript/tokens/statements/bracket-role-resolver.xl.md` | 修改 | 新增 `IsArrowBodyPrefix`（前一个代码单元是 `=>`：`Symbol("=>")` 或 `EqualsGreaterThanTokenShape`）；`Classify` 的 `(` 分支新增 `Deferred ArrowParams / nested-arrow-paren-wait-for-arrow` 规则，宿主限定「表达式宿主 或 `ArrowFunctionShape`」 |
| 4 | `typescript/cases/tts/tools/arrow-edge-probe.mjs` | **新建** | 15 条只读断言：角色串、文件级 replay、**每次 Bind 后的括号 `ReplayCount`**、`ReplayFailureCount`、`HalfBuildCount`、`RejectCount`、`ParameterShape` 子节点类名、`fileFallback` |
| 5 | `typescript/cases/tts/tools/arrow-param-probe.mjs` | 修改 | B4d 的 13 条只读探针：`arrow-nested` 期望 1 → **2**（内层现在也 replay）、`arrow-default` 期望 0 → **1**（R1 接通） |

`Bracket`（core）/ `deferred-bracket-catalog` / `arrow-function-shape` / `expression-builder` / K1 的
容器钩子 / A4b 的 `CompositeInitializerForms*` **一个字节都没动**。

---

## 2. 机制

### 2.1 R1：`=` + 默认值（三件，缺一不可）

```
)=> 成立 → ParseFunctionParameters → BindParameterBracket → BindArrowParen：
    IsArrowable            ：文本闸 IsSimpleList 判否（默认值里有 `{` / `(`）
                             ⇒ 第二份单元级闸 IsSimpleArrowList 判真（语法面相同，额外接受 `= default`）
    CanBuildDefaults       ：对 Data 里每个顶层 `=`，用 legacy 的 ExpressionBuilder.ParseAssign
                             把 [= 之后, 下一个顶层 `,`) 整段建一遍（建完就丢）——判否 ⇒ RejectCount+1、不 replay
    Bind（定向、一次）      ：replay 逐格推进目录
    Probe 动作 9           ：`=` + 默认值 → 一个子节点进壳、从 Data 里 splice 掉
    FinalizeBracket        ：CloseShell（终点 = 最后一个子单元终点，与 legacy SpanNode 同口径）
    ParseFunctionParameters：已是 ParameterShape ⇒ 直接收下
```

**为什么判据要两份、而不是改 `IsSimpleList`**：`IsSimpleList` 是**源码文本**判据
（`TextBetween` 遇到 `(` / `{` / `}` / `;` 就整段放弃），它同时是 `function` 声明参数表的入口
（`InstallIfSimple`，B1 的写域）。改它会把 `function f(a = 1) {}` 一起拉进逐字建。所以箭头 site
另开一份**单元级**判据：语法面完全相同，只多接受 `= <默认值>`。`function` 声明侧的读数因此逐字节不变。

**为什么默认值必须用 legacy 的 `ParseAssign`**：参数壳一旦由 replay 建好，那一段就不再经过 legacy
`ParseFunctionParameters`（它的 `parameter.Add(inner.ParseAssign())` 是原来建默认值的地方）。两份代码
只要差一个节点，`(a: number, b = 1) => …` 的树就会与 base 不同——所以这里**不写第二套**，
连 `Positions` 的口径都对齐（`Load(slice, data[at].SourceRange.EndIndex)` 与 legacy 的
`Load(bracket.Data, 括号起点+1)` 都是「前一个非 trivia 单元的 `EndIndex`」）。

**为什么要有干跑闸**：`IsBuildable` 说能建、`BuildByIndex` 建不出来 ⇒ 括号停在
「名字已建、`=` 还留在 `Data` 里」的半建态，legacy 会报「函数参数只支持标识符或绑定模式」。
干跑把这条出口变成「整份不 replay」（`RejectCount+1`，整段交 legacy，与 B4d 的现状一致）。

**默认值内部的括号 / 对象 / 数组**：`Data` 里它们各自是**一个单元**，默认值区间只由**顶层** `,` 切
（`DefaultValueEnd`）。所以 `(a = [1, 2], b = f(3, 4), c = 5)` 有三个参数，`c` 是第三个——
内部 `,` 结构上不可能被当成形参分隔。

### 2.2 R2：嵌套箭头的内层 `(`

```
(` 格：Classify 的 `(` 分支
    IsArrowBodyPrefix(host, previous)          // previous 是 `=>`
    && (IsExpressionHost(host) || hostKey === "ArrowFunctionShape")
        ⇒ Deferred ArrowParams / nested-arrow-paren-wait-for-arrow
)=> 格：ParseFunctionParameters → Bind（定向、一次）→ 内层 replay
```

- **两种 `=>` 都认**：声明还没收口时是 `Symbol("=>")`（`let o = (a) => (b) => …` 的宿主是
  `VariableDeclarationShape`）；单标识符箭头已被增量建成 `ArrowFunctionShape` 时是
  `EqualsGreaterThanTokenShape`（`x => (b) => b` 的内层 `(` 宿主是 `ArrowFunctionShape`）。
  都只比符号文本 / 类名，不 import 表达式族。
- **为什么宿主只放两类、不放宽 `IsExpressionHost`**：放宽它会把 `CallArgs` / `ObjectLiteral` 目录也
  引进箭头体（`x => f(a)` 的实参、`x => ({…})` 的括号），那些内容的收口入口只吃 basic token，
  会踩 A2 R8 的「半截形状毒化 legacy 读参」。所以这一条规则单独放行 `ArrowFunctionShape` 宿主，
  其余分类分支照旧。类型位（`type F = (a) => (b) => C` 的宿主是 `TypeAliasDeclarationShape`）**一个都不认**。

### 2.3 不误 replay 的两条证据

| 片段 | 角色 | replay | 为什么 |
|---|---|---:|---|
| `let v = (a);` | `Deferred ArrowParams` | 0 | 等不到 `=>`，条目留在 `Pending` |
| `let w = (a) + 1;` | 同上 | 0 | 同上 |
| `let q = f(a, b);` | `Known CallArgs` | 0 | R2 规则只看 `=>` 之后，碰不到实参位 |
| `function fn(a: number) {}` | `Known ParameterList` | 0 | B1 的文本闸原样 |
| `let r = x => (a) + 1;` | `Deferred nested-arrow-paren-wait-for-arrow` | 0 | 箭头体是**分组括号**，`)=>` 不成立 ⇒ 永远不 Bind |
| `let s = (a) => (b) + 1;` | 外层 Deferred / 内层 Deferred | 1 | 只 replay 外层，内层留在 `Pending` |

「`=>` 之后紧跟的 `(`」在语法上只有两种可能：内层形参表（`)` 之后必有 `=>`）或分组括号。
规则只登记、不建，所以分组括号那一种**一次都不 replay**，legacy 原路读 raw。

### 2.4 顺手修掉的一条位置漂移（R1 的连带项）

`PreviousParamPos` 原写法是「先取壳里最后一个子单元的终点，再让 `Data` 里前一个单元的终点覆盖它」。
`...` / `:` 这些**已经被吃进壳里**的单元在下一次 `Probe` 时已不在 `Data` 里，于是 `Data` 里的上一个
单元变成了那个**逗号**——它的终点比 `...` 的终点小 3。`(a, b = 1, ...c)` 的 `c` 因此被算成
`Pos = 127`（逗号的终点），而 tsc 是 `131`（`...` 的终点）：

```
moved  Identifier[3] 131-132 vs 127-132      （expr-arrow-params-default-rest.ts）
```

改成「壳里有子单元就用它，没有才退到 `Data`」，与 B1 自己的注释（`args` 的 `Pos = 14` 靠这一条）
和 legacy `Positions[nameIndex]` 同口径。**这条修复让 `wide-ast` 的差异从 33 降到 29**
（`decl-fn-rest-parameter` / `decl-func-rest-params` / `lex-template-tagged` /
`type-combination-adversarial` 四件从此与 tsc 一致）。

---

## 3. 探针读数

### 3.1 `arrow-edge-probe.mjs`（新建，15 条全 OK）

| 片段 | replay | 每括号 | params（子节点） | fail / half / reject |
|---|---:|---|---|---|
| `let d = (a: number, b = 1) => a;` | **1** | ≤1 | `(9, Identifier+NumberKeyword)` ; `(19, Identifier+NumericLiteral)` | 0/0/0 |
| `let e = (a = {x:1}) => a;` | **1** | ≤1 | `(9, Identifier+ObjectLiteralExpression)` | 0/0/0 |
| `let f = (a: string, b = {k: 2}) => b;` | **1** | ≤1 | `(9, Identifier+StringKeyword)` ; `(19, Identifier+ObjectLiteralExpression)` | 0/0/0 |
| `let g = (a = [1, 2], b = f(3, 4), c = 5) => c;` | **1** | ≤1 | `(9, Identifier+ArrayLiteral)` ; `(20, Identifier+CallExpression)` ; `(33, Identifier+NumericLiteral)` | 0/0/0（`defaults=3`） |
| `let h = (a = 1) => a;` | **1** | ≤1 | `(9, Identifier+NumericLiteral)` | 0/0/0 |
| `let i = (a, b = a) => b;` | **1** | ≤1 | `(9, Identifier)` ; `(11, Identifier+Identifier)` | 0/0/0 |
| `let p = (a) => (b: number) => a + b;` | **2** | 1 / 1 | `(9, Identifier)` ; `(16, Identifier+NumberKeyword)` | 0/0/0 |
| `let q = (a) => (b) => (c) => a + b + c;` | **3** | 1/1/1 | 三个 `(9/16/23, Identifier)` | 0/0/0 |
| `let n = x => (b) => b;` | **0**（§6 R5） | — | `(7, Identifier)` ; `(14, Identifier)` | 0/0/0（**角色已是 `Deferred/nested-…`**，`fileFallback=true` 同 base） |
| `let v = (a);` | 0 | — | — | 0/0/0（`Pending=1`） |
| `let w = (a) + 1;` | 0 | — | — | 0/0/0（`Pending=1`） |
| `let q = f(a, b);` | 0 | — | — | 角色 `Known/CallArgs` |
| `function fn(a: number) {}` | 0 | — | `(12, Identifier+NumberKeyword)` | 角色 `Known/ParameterList` |
| `let r = x => (a) + 1;` | 0 | — | `(7, Identifier)` | 0/0/0（`Pending=1`，`fileFallback` 同 base） |
| `let s = (a) => (b) + 1;` | **1** | ≤1 | `(9, Identifier)` | 0/0/0（内层 `Pending=1`） |

每条的 `bindReplayCounts` 都是「同一括号被问两次、次次读到的 `ReplayCount` 都是 1」——
A2 §3 的「一次」是硬规则，重复 Bind 不重复建（`DeferredBracketCatalog` 的 R1）。
15 条里 `ReplayFailureCount` / `HalfBuildCount` **恒为 0**。

### 3.2 `arrow-param-probe.mjs`（B4d 的 13 条，改两条期望后全 OK）

`arrow-typed` / `arrow-two` / `arrow-async` / `arrow-object-value` / `arrow-call-arg` / `arrow-twice`
读数逐条同 B4d；**`arrow-nested` 1 → 2**、**`arrow-default` 0 → 1**（`rejected` 2 → 0）；
`arrow-single` / `paren-only` / `paren-binop` / `paren-call` / `function-params` 仍是 0。

---

## 4. 验收读数（默认档 / legacy 档）

| 命令 | base `4de5202a` | 本提交 |
| --- | --- | --- |
| `xl_build {core,typescript}` | 0 error / 3 warning | **0 error / 3 warning**（同三条既有 `E1107`） |
| `node node_modules/typescript/bin/tsc -p .` | exit 0 | **exit 0** |
| `node tests/gates/run.mjs` | 4 PASS / 0 FAIL / 7 N/A | **4 / 0 / 7** |
| `node tests/parse/wide-ast.mjs` | 崩溃 0 / 差异 33 / fallback 83+13=96 | **0 / 29 / 83+13=96 PASS**（差异**少 4 件**） |
| `node tests/parse/wide-ast.mjs --legacy` | 0 / 0 / 2 | **0 / 0 / 2 PASS** |
| `real-dts-ast` | PASS（0 崩溃 / 0-33 差异） | **PASS：崩溃 0 / 差异 0/33 / 缺 range 0** |
| `node typescript/cases/tts/run.mjs` | PASS 429（incremental 426 / throw 3 / atomic 0 / partial 0） | **PASS 429 / FAIL 0**（逐项同基） |
| `tshape-judge ts-all` | 429 / 426 ok / 3 err | **429 / 426 ok / 3 err**（`class-ball` / `expression-zoo` / `generic-container`，逐条同基） |
| `cases:check` | 1720 / 0 不合格 | **1720 / 0** |

`FileFallbackByFamily`：`tests/cases/token=82`、`samples/declarations.ts=1`（base 同）。
`wide-ast` 少掉的 4 件差异与「多出来的 1 件」都在 §2.4 那一条修复的口径里，逐文件对过：

```
base 33 → 本提交 29
减：decl-fn-rest-parameter.ts / decl-func-rest-params.ts /
   lex-template-tagged.ts / type-combination-adversarial.ts（各 moved=1）
增：（无）
```

---

## 5. 与既有 WP 的边界（逐条核过）

| 边界 | 本棒做了什么 | 为什么安全 |
|---|---|---|
| B1 的 `IsSimpleList`（文本闸） | **原样不动**（`function` 声明的参数表走的就是它） | `function f(a = 1) {}` 仍然整表 legacy，B1 的读数逐字节不变 |
| B1 的 `Probe` / `Step` / `CloseShell` / `CollectBuiltParameters` | 只**新增**动作 9，其余动作码与判据未改 | 动作码 1..7 的代码一字未动 |
| B1 的 `PreviousParamPos` | 改成「壳里最后一个子单元优先」 | 与它自己的注释（`args = 14`）和 legacy `Positions` 同口径；`wide-ast` 差异 33→29 |
| B4d 的 `DeferredBracketCatalog` / `ArrowFunctionShape.BindParameterBracket` | **未改** | 仍然只有一条 Bind 通路：`ParseFunctionParameters` → `BindArrowParen` → 定向 `Bind` |
| A4b 的 `CompositeInitializerForms*` / `Family` | **未改** | 分组括号的判定一字未动（`x => (a) + 1` 仍是 legacy，探针 0） |
| `IsExpressionHost` | **未放宽** | 只给 R2 这一条规则单独放行 `ArrowFunctionShape` 宿主（见 §2.2） |
| core `bracket.xl.md` / K1 容器钩子 | **未改** | R1/R2 都只用既有 `ReplayCount` / `RoleState` / `Deferred` 通道 |
| `expression-builder` / `arrow-function-shape` | **未改** | 默认值的建造靠 `ParseAssign`，不需要改 legacy 的收口 |

---

## 6. 剩下的、写在明处的卡点（没有静默）

| id | 项 | 现状 | 原因 / 下一步 |
| --- | --- | --- | --- |
| **R5** | `x => (b) => b` 的 **replay** | 角色已改成 `Deferred / nested-arrow-paren-wait-for-arrow`（base：`Fallback / no-host-rule:ArrowFunctionShape(`），但 `ReplayCount` 仍为 **0**、`fileFallback=true`（**与 base 相同**） | 这条片段的**整文件增量解析在 base 上就抛异常**（不是本棒引入）：`ArrowBodyPossibleShape` 只建 `Common` 体，`x => (` 那一格就抛 ⇒ 文件级 fallback（`SourceFileRunner.Parse` 第二跳把 `EnableIncrementalShapes` / `EnableIncrementalVariableShapes` 压成 `false`，legacy 重解析**不读** `DeferredBracketCatalog`）⇒ 条目留在 `Pending`，永远等不到 Bind。<br>最小复现：`tmp/b4f-throw.mjs`（调用 `SourceFileRunner.ParseCore(text, file, true)`）对 `let n = x => (b) => b;` 抛 `throw by line 0 … ^^`（列在第二个 `=>`）。<br>要 replay 必须让**声明级**在「体不是 `Common` 的箭头」上放弃增量（把整条声明交 legacy 收口，而不是抛），那是声明族的写域（`variable-declaration-*` / `ArrowPossibleShape` 的退让），不在 R1/R2 的文件 ownership 内；本棒试过在 `ArrowPossibleShape` 上退让（`HasBuildableBody`），`x => [1,2]` / `x => ({…})` / `x => {…}` 的 fallback 会消失，但 `x => (b) => b` 换到**内层 `=>` 格**再抛（声明级兜底 `declaration 符号 =>`），仍然到不了 replay，所以那一步**已回退**，不留在提交里 |
| **R6** | 其余形参形态 | `?` 可选 / 解构 `{…}` `[…]` / 装饰器 `@dec` / 泛型类型 `A<B>` / 默认值里带箭头（`(a = () => 1) =>`） | `IsSimpleArrowList` 判否 ⇒ 整份不 replay、`RejectCount+1`、整段交 legacy（与 B4d 同一条出口）。语法面刻意不放大：判据面窄于建造器的能力，就不会出现「说能建、建不出来」 |
| **R7** | replay 的格位 | 仍在 `ParseFunctionParameters` 那一拍（收口格），**不是** `=>` 那一格 | 同 B4d §6 R3，未变：这份 base 的声明初始化器目录在 `=>` 格不再被问 |
| **R8** | 默认值的 `Pos` 口径 | 已与 legacy 同口径（`Load(slice, EndIndex(=))`） | 由 `wide-ast` 的 `moved` 栏守：R1 的 6 条默认值片段 0 漂移，语料里 `expr-arrow-params-default-rest.ts` 也已回到 0（§2.4） |

**没有把失败静默掉**：`ReplayFailureCount` / `HalfBuildCount` 在 15 + 13 条探针里分别恒 0；
`RejectCount` 在 R6 那条出口上仍会涨（**预期**），R1/R2 的片段上为 0；
`DeferredBracketCatalog.ReplayDropCount` 与 `Pending` 的读数都进了探针输出。

---

## 7. 可复算命令

```powershell
$d = "C:\Users\Admin\Documents\GitHub\xl-example-set\b4f-arrow-edge"; Set-Location $d
xl_build { cwd: $d, paths: ["core","typescript"], targets: ["ts"] }   # 0 error / 3 warning
node node_modules/typescript/bin/tsc -p .                              # exit 0

node typescript/cases/tts/tools/arrow-edge-probe.mjs   # R1/R2 的 15 条，PASS
node typescript/cases/tts/tools/arrow-param-probe.mjs  # B4d 的 13 条（改成 2/1），PASS
node tests/parse/wide-ast.mjs                          # 0 / 29 / 96 PASS
node tests/parse/wide-ast.mjs --legacy                 # 0 / 0 / 2 PASS
node typescript/cases/tts/run.mjs                      # PASS 429
node typescript/cases/tts/tools/tshape-judge.mjs ts-all # 429 / 426 / 3
node tests/gates/run.mjs                               # 4 PASS / 0 FAIL / 7 N/A
```

`tmp/` 全部 gitignored，不提交（`tmp/b4f-base-check.mjs` / `tmp/b4f-body-check.mjs` /
`tmp/b4f-throw.mjs` / `tmp/b4f-err.mjs` / `tmp/b4f-wide-*.txt` 是定位用的临时脚本与读数）。
