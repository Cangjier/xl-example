# B4e · K1：容器 shape 在括号关闭格出现（机制落地；开关默认 `false`，读数为证）

| 项 | 值 |
| --- | --- |
| 角色 | 站点智能体 B4e（K1：容器 shape 的创建格 + 与 legacy 收口的双建） |
| 工作副本 | `C:\Users\Admin\Documents\GitHub\xl-example-set\b4e-container`，分支 `feature/b4e-container` |
| base | 主仓库 HEAD `d97cd42b`（`EnableExprBracketCatalog=true`、`BracketCloseHook` 挂点存在） |
| 改动 | 9 个文件（1 新建机制 + 1 新建探针 + 1 core 钩子类）；没有第二棵建树路径 |
| 构建 | `xl_build {core,typescript}` **0 error / 3 warning**（3 条既有 `E1107`）；`tsc -p .` **exit 0** |
| 状态 | 机制 + 探针 + 所有权登记表全部落地；**开关 `EnableContainerShape` 默认 `false`**（§4 的读数） |

---

## 0. 结论先行

1. **机制**：`Bracket.Close` 在「问完父单元」之后新增一个 core 时机钩子 `BracketClosedHook`
   （`Current` 默认 `null`，与 `BracketCloseHook` 的默认语义一致、互不影响）。typescript 侧
   `ContainerShapeCloseHook` 是唯一实现：**只有父单元没有消费这只括号**时，才用 legacy
   `ExpressionBuilder`（`ParsePrimary` / `ParsePostfix`）把 `{` / `[` / `(` 建成
   `ObjectLiteralExpressionShape` / `ArrayLiteralExpressionShape` / `CallExpressionShape` /
   `ParenthesizedExpressionShape`，并顶替父单元 `Data` 里的那一段（`CallArgs` 连 callee 一起）。
   `Pos` / `src` / 子节点顺序与 legacy 收口格同源（同一份 `Positions` 口径）。
2. **所有权切换**：形状建出时登记进 `ExpressionAtomRegistry.Containers`，四处 legacy 收口
   **消费而不重建**：`ParsePrimary`（表达式起点）、`FinishIncremental` 的唯一根（既有路径）、
   `VariableDeclarationShape.TryBuildTypedInitializer`、`TypeCatalogFactory.StartsTypedInitializer`
   （`as` / `satisfies` 初始化器）。
3. **与任务书前提的偏差（实测，重要）**：在 base `d97cd42b` 上，声明初始化器里的四族括号
   **本来就在关闭那一拍**被既有收口方换成容器形状——`{`（A4 `CompositeInitializerPossibleShape`）、
   `[` / `(` / `(`（A4b `CompositeInitializerFormsPossibleShape`）、`f(…)`（P1
   `CallPossibleShape`）、`1 * (…)`（P4 `ParenthesizedPossibleShape`）。探针的 before/after 快照
   逐条可复算（§2）。**B4b §5.1 的「ObjectLiteralExpressionShape 在 `;` 格才出现」在 base
   上不成立**；K1 真正的空缺是既有收口方**不接**的那些位置（`as` 初始化器、嵌套括号等）。
4. **开关默认 `false` 是读数，不是保守**：打开后宽尺子从 `0/33/83+13` 变成
   `0/43/99+13`（最好的一档；另有 `0/46/100+13` 的两档），10 条新 structural 差异、
   14 件新 fallback，全部落在「本机制先建、`TypeCatalogFactory` / `FinishIncremental` 后消费」
   这条链上。关掉后四道门与 base **逐位相同**（§3）。
5. **探针在开关打开时 PASS**（§2）：四族在关闭格的父 `Data` 里都是容器形状、不是 `Bracket`，
   `pos` / `src` 与 TS 一致、子节点不丢不重。默认关只影响「默认可复算读数」，不影响机制可用性。

---

## 1. 机制改动（不新增建树路径）

### 1.1 core：`BracketClosedHook`（`core/syntax/basic-tokens/bracket.xl.md`）

- 新类 `BracketClosedHook`：`static Current:...|null = null`，抽象 `OnBracketClosed(bracket, context)`；
- `Bracket.Close` 的收尾改成：**先问父单元**（与 base 逐字相同）→ 再调用 `Current`（默认 `null`，
  只多一次比较）→ 返回父单元给出的 `Built` / `Nothing`；
- `BracketCloseHook`（B4b）**一个字节没改**，默认 `null` 语义保持；`BracketClosedHook` 是它的 sibling。

**为什么必须排在父单元之后**（B4e 第一版踩过的坑）：在父单元之前换掉括号会把 A4/A4b/P1/P4
整族候选跳过，而那些候选同时是「右操作数封口 / 在飞单元卸载」的收口方。最小复现：
`let w = 1 * (a + b);` ⇒ `BinaryExpressionShape` 右操作数永不封口，`;` 落进二元形状的 `Data`，
抛 `CatalogGuide: 没有候选形状可以构成（宿主 BinaryExpressionShape）`。排在之后即消失。

### 1.2 typescript

| 文件 | 改动 |
| --- | --- |
| `expressions/forms/shared/container-shape-catalog.xl.md` | **新建**：`ContainerShapeCatalog` + `ContainerShapeCloseHook`（角色闸、`ArrowAhead` 文档前瞻、`BasePos`、`CalleeStart`、宿主白名单 `IsSafeHost`、建 / 登记 / 顶替） |
| `expressions/forms/shared/expression-atom-registry.xl.md` | 新增 `Containers` 身份表 + `RegisterContainer` / `HasContainer` / `Reset` |
| `expressions/expression-builder.xl.md` | `ParsePrimary` 新增 `HasContainer` 消费分支（唯一消费点） |
| `declarations/variable-declaration-shape.xl.md` | `TryBuildTypedInitializer` 的「`=` 之后全 basic」闸放行容器（`as` 初始化器走 `ParseInitializer`） |
| `types/type-catalog-factory.xl.md` | `StartsTypedInitializer` 认容器头（`{ … } as T` 的 `raw[0]` 不再是括号） |
| `files/source-file-shape.xl.md` | 构造器里 `ContainerShapeCatalog.EnsureInstalled()`（开关 + 增量模式；位于 `BracketRoleCatalogHook` 之前） |
| `statements/statement-route-util.xl.md` | 新开关 `EnableContainerShape`（**默认 `false`**）、`ContainerShapeBuildCount`、口径文档 |
| `cases/tts/tools/container-shape-probe.mjs` | **新建**：关闭格 before/after 快照 + 四族槽位 + AST 对拍 |

`Bracket.Role` / `RoleState` 直接复用 B0/B4b 的结论：只对 `Known` 的
`ObjectLiteral` / `ArrayLiteral` / `CallArgs` / `ParenExpression` 接手；`Deferred ArrowParams`
在 `ArrowAhead` 为假时按 `ParenExpression` 建（分组那一半），为真时原样让给 B4d 的 replay。
`IsSafeHost` 白名单当前只有 `VariableDeclarationShape`（§4 的实测边界）。

---

## 2. 探针（开关打开时 PASS，可复算）

`node typescript/cases/tts/tools/container-shape-probe.mjs`（探针自己把开关翻 `true`）

| 片段 | 关闭格父 `Data` 的槽位 | 谁建 | `pos` / `src` |
| --- | --- | --- | --- |
| `let x = { a: 1 };` | `ObjectLiteralExpressionShape` | legacy（A4，同一格） | 7 / `[8,16)` |
| `let y = [1, 2];` | `ArrayLiteralExpressionShape` | legacy（A4b，同一格） | 7 / `[8,14)` |
| `let z = f(1, 2);` | `CallExpressionShape`（含 callee） | legacy（P1，同一格） | `[7,16)` |
| `let w = (a + b);` | `ParenthesizedExpressionShape` | legacy（P4，同一格） | 7 / `[8,15)` |
| `let a = { x: 1 } as unknown as T;` | `ObjectLiteralExpressionShape` | **k1** | 7 / `[8,16)` |
| `let n = [1, { a: 2 }];`（读数，不属验收） | 外层 `ArrayLiteralExpressionShape`；内层 `{` 仍是 `Bracket` | legacy | — |

读数：`BuildCount=1`、`AlreadyConsumed=5`、`Refused=0`；六个片段的 AST 与 TS 逐节点一致。
探针结论：**四族在关闭格都不是 `Bracket`**（前三族由既有收口方建、`as` 初始化器由本机制建），
`pos` / `src` 与 TS 的 `node.pos` / 区间一致，子节点不丢不重。

---

## 3. 默认（开关 `false`）的四道门 —— 与 base 逐位相同

| 命令 | base `d97cd42b` | 本提交（默认 `false`） |
| --- | --- | --- |
| `node tests/parse/wide-ast.mjs` | 0 / 33 / 83+13=96 PASS | **0 / 33 / 83+13=96 PASS** |
| `node tests/parse/wide-ast.mjs --legacy` | 0 / 0 / 2 PASS | **0 / 0 / 2 PASS** |
| `node tests/gates/run.mjs` | 4 / 0 / 7 | **4 / 0 / 7**（`wide-ast`、`real-dts-ast` 两道尺子 PASS） |
| `node typescript/cases/tts/run.mjs` | PASS 429（throw 3 / incremental 426） | **PASS 429 / FAIL 0** |
| `node typescript/cases/tts/tools/tshape-judge.mjs ts-all` | 429 / 426 / 3 | **429 / 426 / 3**（同三条：`class-ball` / `expression-zoo` / `generic-container`） |
| `xl_build {core,typescript}` + `tsc -p .` | 0 error / 3 warning + exit 0 | **0 error / 3 warning + exit 0** |

开关为 `false`（或 legacy 模式）时 `BracketClosedHook.Current` 恒 `null`：`Close` 只多一次
`null` 比较；`Containers` 恒空，`ParsePrimary` / `TryBuildTypedInitializer` /
`StartsTypedInitializer` 的三处 `HasContainer` 恒为 `false` ⇒ 三处所有权改动一个字节都不执行。

---

## 4. 开关打开时的读数（为什么默认关）与卡点

| 配置 | 崩溃 | 差异 | fallback | 越界 |
| --- | --- | --- | --- | --- |
| base（开关不存在） | 0 | 33 | 83+13=96 | 0 |
| ① 关闭钩子里**先换**括号（B4b 的 `BracketCloseHook` 位置） | 0 | **43** | **107+13=120** | 3 |
| ② `BracketClosedHook`（父单元之后）+ 白名单 `Bracket`/`VarDecl` | 0 | **46** | **100+13=113** | 3 |
| ③ ② + 白名单只留 `VarDecl`（本提交的落点） | 0 | **43** | **99+13=112** | 0 |

①的额外症状：`BinaryExpressionShape` 右操作数不封口（§1.1 的最小复现），
`CatalogGuide: 没有候选形状可以构成`；②/③ 消除了它，但仍有 10 条新 structural 差异与
14 件新 fallback。**新增失败集中在声明初始化器这一条链**（代表性文件）：
`ex-as-chain` / `expr-paren-operand` / `expr-new-callee-postfix-chain` /
`gap-as-bang-array-type` / `expr-r1227-opt-tagged-template` / `expr-r1228-array-tag` /
`lex-division-after-paren` / `lex-regex-after-paren` / `stmt-r1235-bare-block-tail` /
`expr-r1232-decl-newline-operator`（逐文件 `--top` 清单可用
`node tests/parse/wide-ast.mjs --top 0` 复算；本报告没有把这 10 条逐条归因完）。

**机制判断（可机械复核）**：

1. **不是「双建」**：开关打开时四族的树里只有一个容器形状（探针 `stillBracket=false`、
   `data` 里没有第二个容器）；`AlreadyConsumed` 的格上本机制一个节点都不建。
2. **是「收口链的期望差」**：本机制在关闭格先建出的容器，`Pos` / `src` 与 legacy 收口格的
   产物同源，但后续 `TypeCatalogFactory.ParseInitializer`（`as` 链）与 `FinishIncremental`
   （唯一根）是按「legacy 在收口格才建」的中间态写的——它们对 `as` 续接、A4b 的 deferred
   tail（`CompositeInitializerTailJudge`）、`CompositeInitializerFormsJudge` 的族判定各有自己的
   「括号还在 `Data` 里」前提。括号提前消失后，这些候选只能 `Reject`，最终由**另一条**收口分支
   接走，树的 `Pos` / 包装层因此与 TS 有差（10 条 structural）或落到显式错误 → fallback（14 件）。
3. **最小复现**：`let a = { x: 1 } as unknown as T;`（本机制在 `}` 格建 OLS、`as` 链由
   `ParseInitializer` 消费，AST OK）；对照 `let x = { a: 1 }.b;` / `let z = f(1)(2);` 一类
   「容器后还有后缀」的形态，`NextTick` 的所有权就分叉了。下一步要逐条把这些收口方改成
   「`HasContainer` 即消费」（与 `ParsePrimary` 同一张表），属于 `composite-initializer-*` /
   `call-possible-shape` / `member-chain` 的写域。

**没有用默认关掩盖**：开关、机制、探针、所有权表全部在提交里；§3 给出默认关的四道门逐位读数，
§4 给出打开后的逐档读数与最小复现。开关是一个**验收中的**功能闸，不是死代码。

---

## 5. 交下一棒（按优先级）

| # | 残留 | 量 | 归属 / 落点 |
| --- | --- | --- | --- |
| 1 | 打开开关后 10 条新 structural：容器后还有后缀（`.b` / `(1)` / `as` 链） | 10 | `call-possible-shape` / `member-chain` 的「`HasContainer` 即消费」；`CompositeInitializerTailJudge` 的族判定 |
| 2 | 14 件新 fallback：收口方在括号消失后 `Reject` 到空集 / 走显式 throw | 14 | `variable-declaration-end-possible-shape` 的 `Reject` 分支 + `TypeCatalogFactory` |
| 3 | 嵌套括号（父 `Bracket`）没进白名单 | — | 先修 #1（父括号的收口方也要消费容器），再把 `Bracket` 加回 `IsSafeHost` |
| 4 | 四族在**声明初始化器**上的创建格其实 base 已经做到（§0.3） | — | 任务书 / B4b §5.1 的前提需要按实测修订；K1 的真实增量只在既有收口方不接的位置 |

---

## 6. 可复算命令

```powershell
$d = "C:\Users\Admin\Documents\GitHub\xl-example-set\b4e-container"; Set-Location $d
xl_build { cwd: $d, paths: ["core","typescript"], targets: ["ts"] }   # 0 error / 3 warning
node node_modules/typescript/bin/tsc -p .                              # exit 0

# 默认关（提交态）：与 base 逐位相同
node tests/parse/wide-ast.mjs                    # 0 / 33 / 83+13=96 PASS
node tests/parse/wide-ast.mjs --legacy           # 0 / 0 / 2 PASS
node tests/gates/run.mjs                         # 4 / 0 / 7
node typescript/cases/tts/run.mjs                # PASS 429
node typescript/cases/tts/tools/tshape-judge.mjs ts-all   # 429 / 426 / 3

# 机制探针（探针自己把 EnableContainerShape 翻 true）
node typescript/cases/tts/tools/container-shape-probe.mjs   # PASS（§2 的槽位读数）

# 打开开关的读数（§4）：把 statement-route-util 的 EnableContainerShape 改 true，再跑
node tests/parse/wide-ast.mjs --top 0
```

`tmp/` 全部 gitignored，不提交（`tmp/real.mjs` / `tmp/baseclose.mjs` / `tmp/catalog-6.ts` 是定位用的临时脚本）。
