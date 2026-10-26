# B4g · 非 Common 箭头体（`x => (b) => b` / `x => [1,2]` / `x => ({a:1})`）的整文件增量解析与 Deferred replay

| 项 | 值 |
| --- | --- |
| 角色 | 站点智能体 B4g（补 B4f §6 R5：体不是 `Common` 的箭头 ⇒ 让 Deferred replay 真的发生） |
| 工作副本 | `C:\Users\Admin\Documents\GitHub\xl-example-set\b4g-arrow-body`，分支 `feature/b4g-arrow-body` |
| base | 主仓库 HEAD `ef5581da`（B4f 已合并；`EnableExprBracketCatalog=true`、K1 容器钩子默认关） |
| 改动 | 1 改 + 1 探针改 + 1 探针新建（`arrow-possible-shape.xl.md`、`arrow-edge-probe.mjs`、`arrow-body-probe.mjs`） |
| 构建 | `xl_build {core,typescript}` **0 error / 3 warning**（3 条均既有 `E1107`）；`tsc -p .` exit 0；`xl check` 0/0 |
| 未合并 / 未 push / 未删目录 | 是 |

---

## 0. 结论先行

1. **四个目标探针全通**：`x => (b) => b`、`x => (b) => b + 1` 的箭头形参 `(` **`ReplayCount == 1`**、
   `Bind` 每括号一次、`ReplayFailureCount == 0`、`HalfBuildCount == 0`、`Pending == 0`、**`fileFallback == false`**；
   `x => [1,2]` / `x => ({a:1})` 同样**不再 fileFallback**（它们没有箭头形参括号，replay 0 是正确读数）。
2. **选的是 B（声明族显式让位）而不是 A（扩展 `ArrowBodyPossibleShape` 建括号体）**，理由是量出来的：
   A 要么在「体还没到达」的那一格抢建（`x => (b) => b + 1` 的 `+ 1` 会被丢到箭头之外 = 错树，
   与 B4d §2 记的同一类坑），要么把 `(`/`[`/`{` 的建树范围整个搬进表达式目录（B3a/B3c/B3d 的写域）。
   B 的落点是**既有**通道：整条初始化器留 raw basic，声明收口格用 legacy `ExpressionBuilder` 原子建树，
   箭头形参 `(` 的 Deferred 条目就在那一次 legacy 建造里被 `ParseFunctionParameters` 绑定。
3. **树与 legacy 逐节点一致**（不是「不抛就算」）：四个目标探针 + 14 条同族片段（对象值位 / 实参位 /
   连续两条语句 / 块体首条语句 / `((y) => y)` / `(0,1)` / `(a,b) => a`）在「类名 + Pos + 区间」口径上
   与 `ParseCore(text, false)` 逐行相同（只有 `SourceFile` / `VariableStatement` / `VariableDeclarationList`
   的**语句边界区间**不同，那是 base 上就有的口径差，见 §4.3）。
4. **没有新增分歧**（A/B 实测）：把新判据在运行期关掉做对照，120 条箭头体组合里「不干净」的组合
   **114 → 74**；两趟的差集**只有** 40 条 `fallback → 不再 fallback`（树仍然 `same=true`），
   没有任何一条从 `same` 变成 `different`、没有新增 fallback、没有新增 throw。
5. **默认档四道门不恶化**：`gates` **4 / 0 / 7**；`wide-ast` **0 / 29 / 82+13=95**（base 83+13=96，
   fallback **少 1 件**，差异仍 29）；`real-dts` **PASS**；`tts` **PASS 429**（426/3/0/0 逐项同基）；
   `ts-all` **429 / 426 ok / 3**（同三条）；`--legacy` **0 / 0 / 2**。
6. **没有静默丢树**：`{` 块体（`x => { … }`）**刻意不放进本判据**——它的产物是非 basic 的 `BlockShape`，
   原子建树分支不可达，放进来就会变成「收下唯一根、丢掉 `x =>`」的静默错树；它保持原来的 file fallback
   （实测 `x => {}` / `x => { return 1; }` 仍是 fallback、树与 legacy 相同）。字符串 / 一元 / 三目 /
   `new` / `class` / `function` 体同一条出口，一个字没改。

---

## 1. 改了哪几处

| # | 文件 | 动作 | 内容 |
|---|---|---|---|
| 1 | `typescript/tokens/expressions/forms/primary/arrow-possible-shape.xl.md` | 修改 | ① 新增 `BodyStartsBracket`（`=>` 之后第一个非空白字符是 `(` / `[`）；② 新增 `IsNestedArrowHead`（`=>` 的前一个代码单元是**可 replay 的箭头形参 `(`**，判据复用 `ArrowParamsCatalog.IsPendingArrowParen`）；③ `ComputeByIndex` 的 `=>` 分支：`BodyStartsBracket` 为真时 **`Uncertain`（不建）** 而不是 `Accept`；④ `IsBuildable` 同一份判据（跨步稳定）；⑤ `ContinuationClaim` 增加 `IsNestedArrowHead`。import 只多 `Bracket` / `ArrowParamsCatalog` 两个（无反向依赖：全仓无其它文件 import `arrow-possible-shape`） |
| 2 | `typescript/cases/tts/tools/arrow-body-probe.mjs` | **新建** | 14 条只读断言：不抛 + 不 fileFallback、文件级 `ReplayCount`、**每次 `Bind` 后该括号的 `ReplayCount`**（恒 1）、`ReplayFailureCount` / `HalfBuildCount`、**树签名与 legacy 逐行比对**、负样本 replay 0 |
| 3 | `typescript/cases/tts/tools/arrow-edge-probe.mjs` | 修改 | 一条期望：`nested-single-outer`（`let n = x => (b) => b;`）replay **0 → 1**，并去掉它的 `allowFallback: true`（B4f 当时写的是「这条只做到角色」） |

**只改这一个源文件**：`ArrowBodyPossibleShape` / `ArrowFunctionShape` / `ExpressionBuilder` / `DeferredBracketCatalog` /
`ArrowParamsCatalog` / `Bracket`（core）/ `variable-declaration-*`（W1）/ `control-head`（B3b）/
K1 容器钩子 **一个字节都没动**。

---

## 2. 机制

### 2.1 复现（先钉死事实，再改）

```powershell
node tmp/b4g-throw.mjs      # 逐片段 ParseCore(text, file, true)
```

| 片段 | base |
|---|---|
| `let n = x => (b) => b;` | **THROW** `CatalogGuide: 没有候选形状可以构成（宿主 ArrowFunctionShape，下标 3）` |
| `let a = x => [1, 2];` / `let o = x => ({ a: 1 });` / `let p = x => (b) => b + 1;` | 同上 |
| `let a = x => x;` / `x => x + 1` / `x => 1` | OK |

**抛的准确位置是内层 `)` 关闭那一格**（不是 `(` 那一格）：`Bracket.Close` 只问父单元，父单元
`ArrowFunctionShape` 把自己的 `Data` 交给 `CatalogGuide`，而它的目录里**只有** `ArrowBodyPossibleShape`
一个候选、`EndPossible === null`：

```
ArrowBodyPossibleShape.ComputeByIndex(Bracket) → Reject（它不是 Common）
→ Candidates.size === 0 且 EndPossible === null → throw「没有候选形状可以构成」
（栈：Bracket.Close → ArrowFunctionShape.ComputePossibleShapes → CatalogGuide）
```

于是整文件 fallback（`SourceFileRunner.Parse` 第二跳把 `EnableIncrementalShapes` /
`EnableIncrementalVariableShapes` 压成 `false` 重解析），legacy 那一趟**不读** `DeferredBracketCatalog`
⇒ `ReplayCount == 0`。B4f 的 §6 R5 复现与我这里逐字一致（异常文本 / 记号位置都相同）。

### 2.2 为什么选 B：A 的两条路都会踩「半截建树」

| 方案 | 具体做法 | 为什么不行（实测 / 结构） |
|---|---|---|
| **A1** 扩 `ArrowBodyPossibleShape`：见到 `(` 就把体建成箭头 | 在 `)` 关闭格 `Accept` 并建树 | `x => (b) => b` 的内层箭头在那个时刻**还没长完**（`=> b` 还没到）；建出来之后 `b + 1` 的 `+ 1` 落在内层箭头之外 = 错树。B4d §2 记的是同一类坑，只是这次在外层。 |
| **A2** 让 `ArrowBodyPossibleShape` 等 `=>` 到达再整棵建 | 等 `=>` 出现再 `ParseArrowFromBracket` | `x => (b) => b + 1` 的体在 `b` 格才算完，而「`b` 之后还有没有 `+ 1`」在这一格**不可知**；增量路径看得见过去、看不见未来，抢建就是 A1 的错树。 |
| **A3** 扩到 `[` / `{`（数组 / 对象 / 块） | — | 那是 B3c / B3d / 语句壳块体的写域（A2 §5 的 ownership 表），本棒不该碰。 |
| **B** 声明族在「体不是 `Common` 的箭头」上让位 | `=>` 格保持 `Uncertain`（不建），整条初始化器留 raw basic；收口格 legacy 原子建树 | 用既有通道，**建树那一拍仍是 legacy**（`ExpressionBuilder.ParseExpression`），树天然与 legacy 同源；`)=>` 成立时 legacy `ParseFunctionParameters` 走 B4d 的 `BindArrowParameter` ⇒ 定向、一次 replay。 |

### 2.3 B 的完整链路（从 `=>` 到 replay）

```
`=>` 格：ArrowPossibleShape.ComputeByIndex
    IsArrowHead（`<identifier> =>`，初始化器首位）
    && BodyStartsBracket（`=>` 之后第一个非空白字符是 `(` 或 `[`）
        ⇒ Uncertain（不建）+ IsBuildable 同一份判据为 false
        ⇒ 声明的 GuardedCatalog 里没有任何候选建形状 ⇒ 初始化器保持 raw basic
            （`DeclarationCellGuard` 在 `;` / `,` / `}` 格拒掉全部候选，留给终结候选）
内层 `(` 创建格：BracketRoleResolver 照 B4f 的规则登记 Deferred / ArrowParams
    （宿主是 VariableDeclarationShape 也命中：`IsExpressionHost` 认它）
    ⇒ 条目进 DeferredBracketCatalog.Pending，**不挂任何 CatalogGuide**（A2 R7）
内层 `)` 关闭格：终结候选的 Bracket 分支 `[D1:RAW-INITIALIZER]`
    IsRawInitializer 为真 ⇒ Reject（继续等），只涨 `DeclarationBracketWaitCount`
内层 `=>` 格：终结候选的 Symbol 分支
    A4b 的 Family 对「标识符起首的箭头」返回 ""（它明确不认领这一族）⇒ 兜底 throw 原本会在这里炸
    ⇒ 本棒补 `ContinuationClaim`（IsNestedArrowHead：前一个代码单元是 IsPendingArrowParen 的括号）
        ⇒ 终结候选 Reject（继续等），不抛
`;` 格：VariableDeclarationListEndPossibleShape.Accept
    ⇒ CloseAtSemicolon → VariableDeclarationShape.TryToClose → FinishIncremental
    ⇒ 初始化器没有非 basic 单元（builtShape === null）⇒ **legacy 原子建树**
        ExpressionBuilder.Load(raw, = 的 EndIndex) + ParseExpression()
        并记 `StatementLegacyMetrics.DeclarationInitializerAtomicCount += 1`（D1 既有的命名计数）
    ⇒ ParseExpression → ParseAssign → … → ParseArrowFromBracket(内层括号)
        → ParseFunctionParameters → ArrowFunctionShape.BindParameterBracket
        → ArrowParamsCatalog.BindArrowParen → DeferredBracketCatalog.Bind("ArrowFunctionShape", 括号)
        ⇒ Replay：括号 Data 里的 `b` 交给参数目录逐格建 ⇒ ParameterShape + IdentifierShape
```

**为什么「不建」反而是让 replay 发生的那一步**：`ReplayCount` 只由 `DeferredBracketCatalog.Bind` 增加，
而 Bind 的唯一入口 `ParseFunctionParameters` 只在 **legacy** 表达式建造里被调用（B4d §2 的实测结论：
这份 base 的声明初始化器目录在 `=>` 格不再被问）。只要箭头在增量路径里被建出来，那一趟 legacy 建造
就**根本不会发生**；反过来，把整条初始化器交给收口格的原子建树，就等于把「`)=>` 成立」这一次判断
交回给唯一知道它的那个建造器。

### 2.4 为什么不把 `{` 一起放进去（这一条是纪律，不是遗漏）

`x => { … }` 的 `{` 由**语句壳的块体目录**接管（A2 §2 #6 / #8），它收口时产出的是 `BlockShape`——
一个**非 basic** 单元。而 `FinishIncremental` 的「原子建树」分支只在 `builtShape === null` 时可达；
一旦初始化器里落了 `BlockShape`，走的是「唯一根」分支，`x` / `=>` 会被当成「根之外的 basic」丢掉
（`=>` 不是二元运算符，不会触发 `[D3a:ORPHAN-OPERATOR]` 那条显式错误）——**静默错树**，C10 禁止。
所以 `BodyStartsBracket` 只认 `(` 与 `[`：这两族的括号在 raw 初始化器里保持 basic，原子建树一定可达。
`x => {}` / `x => { return 1; }` 因此保持原样（file fallback，树正确），没有变好也没有变坏。

---

## 3. 探针读数

### 3.1 `arrow-body-probe.mjs`（新建，14 条全 OK）

| 片段 | replay | 每括号 | 与 legacy 同树 | fail/half | pending / fileFallback |
|---|---:|---|---|---|---|
| `let n = x => (b) => b;` | **1** | `[13:1]` | 是 | 0 / 0 | 0 / **false** |
| `let p = x => (b) => b + 1;` | **1** | `[13:1]` | 是（`+ 1` 在**内层箭头内**） | 0 / 0 | 0 / **false** |
| `let a = x => [1, 2];` | 0 | — | 是 | 0 / 0 | 0 / **false** |
| `let o = x => ({ a: 1 });` | 0 | — | 是 | 0 / 0 | **1** / **false**（那只 `(` 是分组括号，永不合流，见 §6 R4） |
| `let b = x => [1].length;` | 0 | — | 是 | 0 / 0 | 0 / false |
| `let c = { f: x => (b) => b };` | 1 | `[18:1,18:1]`（同一括号被问两次，次次 1） | 是 | 0 / 0 | 0 / false |
| `let d = h(x => (b) => b);` | 1 | `[15:1]` | 是 | 0 / 0 | 0 / false |
| `let e = x => (b) => b;` ⏎ `let f = y => [y];` | 1 | `[13:1]` | 是 | 0 / 0 | 0 / false |
| `let q = x => (b) => (c) => c;`（三层） | **2** | `[13:1,20:1]` | 是 | 0 / 0 | 0 / false |
| `let q = x => (b) => (c) => c + 1;`（三层） | **2** | `[13:1,20:1]` | 是 | 0 / 0 | 0 / false |
| `let v = (a);` | 0 | — | 是 | 0 / 0 | 1 / false（负样本：等不到 `=>`） |
| `let q = f(a, b);` | 0 | — | 是 | 0 / 0 | 0 / false（负样本：实参表） |
| `let s = x => x;` | 0 | — | 是 | 0 / 0 | 0 / false |
| `let u = x => 1;` | 0 | — | 是 | 0 / 0 | 0 / false |

「与 legacy 同树」= 把 `Parse(text)` 与 `ParseCore(text, false)` 各投影成「类名 + Pos + 区间」逐行比对；
`SourceFileShape` / `VariableStatementShape` / `VariableDeclarationListShape` 只比类名 + `Pos`
（语句边界区间在 base 上就有差，见 §4.3）。

### 3.2 `arrow-edge-probe.mjs`（B4f 的 15 条，改 1 条期望后全 OK）

`nested-single-outer`：replay **0 → 1**、`fileFallback` **true → false**、`pending` 1 → 0、`bindReplayCounts=[13:1]`。
其余 14 条读数逐条同 B4f（`default-*` 6 条 replay 1、`nested-inner-typed` 2、`nested-three` 3、
`paren-only` / `paren-binop` / `call-args` / `function-params` / `arrow-body-paren` / `arrow-body-paren2` 不变）。

### 3.3 `arrow-param-probe.mjs`（B4d 的 13 条）：**PASS**，读数逐条不变。

### 3.4 A/B 对照（证明没有新增分歧）

同一份 120 条「箭头体 × 4 种声明外壳」扫描，把新判据在**运行期**关掉（只改静态方法，不改源码）：

```
B4G_BASE=1（新判据关）: non-clean combinations: 114 / 120
默认（新判据开）      : non-clean combinations:  74 / 120
两趟差集：只有 40 条 `fallback → 不再 fallback`，并且这 40 条的 `same=true` 不变
```

40 条 = `(b) => b` / `(b) => b + 1` / `(b: number) => b` / `[1,2]` / `[]` / `({a:1})` / `[1].length` /
`(0,1)` / `((y) => y)` / `(a,b) => a` × 4 种外壳。**没有一条**从 `same` 变 `different`。

---

## 4. 验收读数（默认档 / legacy 档）

### 4.1 命令读数

| 命令 | base `ef5581da` | 本提交 |
| --- | --- | --- |
| `xl_build {core,typescript}` | 0 error / 3 warning | **0 error / 3 warning**（同三条既有 `E1107`） |
| `node node_modules/typescript/bin/tsc -p .` | exit 0 | **exit 0** |
| `xl check`（改动文件） | — | **0 error / 0 warning** |
| `node tests/gates/run.mjs` | 4 PASS / 0 FAIL / 7 N/A | **4 / 0 / 7** |
| `node tests/parse/wide-ast.mjs` | 崩溃 0 / 差异 29 / fallback 83+13=96 | **0 / 29 / 82+13=95 PASS**（差异**不恶化**，fallback **少 1 件**） |
| `node tests/parse/wide-ast.mjs --legacy` | 0 / 0 / 2 | **0 / 0 / 2 PASS** |
| `real-dts-ast` | PASS（0 崩溃 / 0-33 差异） | **PASS：崩溃 0 / 差异 0/33 / 缺 range 0** |
| `node typescript/cases/tts/run.mjs` | PASS 429（426 / 3 / 0 / 0） | **PASS 429 / FAIL 0**（逐项同基） |
| `tshape-judge ts-all` | 429 / 426 ok / 3 err | **429 / 426 ok / 3 err**（`class-ball` / `expression-zoo` / `generic-container`，逐条同基） |
| `cases:check` | 1720 / 0 不合格 | **1720 / 0** |

### 4.2 少掉的那 1 件 fallback 是哪一件

`FileFallbackByFamily tests/cases/token=81、samples/declarations.ts=1`（base 82 / 1）。逐文件对照
（把新判据在运行期关掉再扫一遍全语料）只差一行：

```
fallback  →  no-fallback   tests/cases/token/expressions/expr-arrow-object-body.ts
         const f = a => ({ x: 1 });        // 正是本棒的目标形态之一
```

wide-ast 的差异数仍是 29（不增不减）⇒ 这件文件从「靠 legacy 重解析才对」变成「增量路径直接对」。

### 4.3 关于「树相等」的口径（不夸大）

增量路径的**语句边界区间**与 legacy 不同：`VariableStatementShape` / `VariableDeclarationListShape`
的 `src` 取「前一个非 trivia 单元的终点」，legacy 取「语句首字符 / 含尾部换行」。这是**base 上就有**的
口径差，与箭头无关——`let a = 1;` ⏎ `let b = 2;` 的第二条语句同样是 `[10,…)` vs `[11,…)`。wide-ast 的
29 条差异里登记的就是这一族。本报告的「同树」一律排除这三个节点的区间（`Pos` 仍然比对）。

---

## 5. 与既有 WP 的边界（逐条核过）

| 边界 | 本棒做了什么 | 为什么安全 |
|---|---|---|
| `ArrowBodyPossibleShape` | **未改**（一个字节都没动） | 它的 `Reject` 仍然是它自己的语义；本棒只是让 `ArrowPossibleShape` **不去建**那种箭头，于是它根本不会被问到括号体 |
| `ArrowFunctionShape` / `ExpressionBuilder` | **未改** | replay 的入口仍是 B4d 的 `ParseFunctionParameters`（`ParseArrowFromBracket` 里那一句已经存在） |
| `DeferredBracketCatalog` / `ArrowParamsCatalog` | **未改**（只调用 `IsPendingArrowParen`） | 没有任何新的 replay 通道；`Bind` 仍是定向 + 一次 |
| `Bracket`（core） | **未改** | 只读 `StartBracketChar` / `ReplayCount`（经 B4d 的谓词） |
| `variable-declaration-*`（W1） | **未改** | 收口仍走 `CloseAtSemicolon` → `FinishIncremental` 的**既有**原子建树分支；本棒只是让它成为可达分支 |
| K1 容器开关 / `control-head`（B3b） | **未改** | 不涉及 |
| `DeclarationCellGuard` / `DeclarationAsiBoundary` | **未改** | `;` / `,` / `}` 格仍由终结候选收口 |
| A4b 的 `Family` / `Claims` | **未改** | 它对「标识符起首的箭头」返回 "" 的既有决定原样保留；本棒补的是**箭头自己**的 `ContinuationClaim`（D0 的通用委派口） |

---

## 6. 剩下的、写在明处的卡点（没有静默）

| id | 项 | 现状 | 原因 / 下一步 |
| --- | --- | --- | --- |
| **R1** | `{` 块体（`x => { … }`） | 仍 file fallback（树正确、replay 0） | §2.4：块体产物是非 basic 的 `BlockShape`，原子建树分支不可达 ⇒ 放进来会静默丢树。要做需要「块体目录在 raw 初始化器里也让位」或「`FinishIncremental` 的单根分支能消费 BlockShape」——前者是语句壳的写域，后者是 W1 的写域，都不在本棒 |
| **R2** | 其余非 Common 体：`x => "s"` / `` x => `t` `` / `x => -1` / `x => !x` / `x => typeof x` / `x => a ? b : c` / `x => new A()` / `x => class {}` / `x => function () {}` / `x => a.b.c` / `x => a[0]` / `x => 1 as const` / `x => async () => 1` | 全部与 base 相同（file fallback 或既有分歧），**一个字没改** | 它们起首不是括号：字符串 / 模板 / 前缀符号会**作为非 basic 单元**落进初始化器（原子建树不可达）；`a.b.c` / `a[0]` / `as` / 三目 / `new` 是既有跨步分歧账本（§6 R3）。判据刻意只放 `(` 与 `[`，把「能确定原子建树可达」的那一族修好，其余保持原状 |
| **R3** | `x => x + 1` / `x => f(a)` 的**既有**分歧（`BinaryExpressionShape` / `CallExpressionShape` 包住箭头，legacy 是箭头包住体） | **base 就有**，本棒没碰也没改善 | `ArrowBodyPossibleShape` 在体那一格建完就 `Quit`，后续运算符落到箭头之外。要修需要「体等长完再建」的判据（A2 R1 的「同格双 Accept」问题），是另一棒的写域。**本报告不把它算作本棒的成果，也不把它算作回归**（A/B 扫描里它两趟都一样） |
| **R4** | `x => ({ a: 1 })` 的 `Pending == 1` | 那只 `(` 是**分组括号**，`)=>` 永不成立 ⇒ 永远留在 `Pending`（与 `let v = (a);` 同一条出口） | 不是泄漏也不是半建：条目不会被 Bind、不会 replay、不参与建树。`wide-ast` / `tts` 的 `Pending` 读数没有变化 |
| **R5** | replay 的**格位** | 仍在「收口格的 legacy 建造」那一拍里（`ParseFunctionParameters`），**不是** `=>` 那一格、也不是括号关闭格 | 同 B4d §6 R3：这份 base 的声明初始化器目录在 `=>` 格不再被问。本棒把「体不是 Common」这一族整体交给那一拍之后，`ReplayCount` 与 A2 §3 的「一次」都满足，但**语义上**仍是「收口时统一 replay」 |
| **R6** | `x => (b) => (c) => c`（三层、体是括号） | **已证并进探针**：两条箭头形参 `(` **各 replay 一次**（`[13:1,20:1]`），`fileFallback=false`、`Pending=0`、`fail=0`；`(c) => c + 1` 同读数 | 判据对所有 `=> (` 一视同仁；三层只是同一个 replayer（legacy `ParseExpression`）递归两次 |

---

## 7. 可复算命令

```powershell
$d = "C:\Users\Admin\Documents\GitHub\xl-example-set\b4g-arrow-body"; Set-Location $d
xl_build { cwd: $d, paths: ["core","typescript"], targets: ["ts"] }   # 0 error / 3 warning
node node_modules/typescript/bin/tsc -p .                              # exit 0（build/ts 由 dist/ts 编出）

node typescript/cases/tts/tools/arrow-body-probe.mjs   # 本棒的 14 条（含与 legacy 同树），PASS
node typescript/cases/tts/tools/arrow-edge-probe.mjs   # B4f 的 15 条（nested-single-outer 改 1），PASS
node typescript/cases/tts/tools/arrow-param-probe.mjs  # B4d 的 13 条，PASS
node tests/parse/wide-ast.mjs                          # 0 / 29 / 82+13=95 PASS
node tests/parse/wide-ast.mjs --legacy                 # 0 / 0 / 2 PASS
node typescript/cases/tts/run.mjs                      # PASS 429
node typescript/cases/tts/tools/tshape-judge.mjs ts-all # 429 / 426 / 3
node tests/gates/run.mjs                               # 4 PASS / 0 FAIL / 7 N/A
```

`tmp/` 全部 gitignored，不提交（`tmp/b4g-throw*.mjs` 复现、`tmp/b4g-cells.mjs` 目录逐格读数、
`tmp/b4g-sweep.mjs` 的 120 条 A/B 扫描（`B4G_BASE=1` 关新判据）、`tmp/b4g-fallback-scan.mjs` 全语料
fallback 对照、`tmp/b4g-tree.mjs` / `tmp/b4g-same.mjs` 树对照）。
