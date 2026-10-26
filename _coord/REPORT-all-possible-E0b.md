# REPORT-all-possible-E0b — 声明初始化器接新表达式目录（Phase A 总闸）

## 0. 身份与环境

| 项 | 值 |
| --- | --- |
| 任务 | `task-8` — WP-E0b：声明初始化器接新表达式目录（Phase A 总闸） |
| 分支 | `feat/e0b`（只提交本地分支，**未 push**） |
| 克隆 | `C:\Users\Admin\Documents\GitHub\xl-example-set\e0b-initializer`（`node_modules` 是指向 canonical 的 junction） |
| base | `base-e0a` = E0a `feat/e0a` @ `d03bfa82`（含 ShapeOperatorStack / ExpressionShapeCatalog / OperatorShapeMap / expr-probe / diff-report，以及 `_integration` @ `42153469` 的双开关基建） |
| commit | `0f81addf` — `feat(e0b): declaration initializer catalog switched to ExpressionShapeCatalog` |
| 构建产物 | `dist/ts/**`（`xl_build` 默认 out）+ `build/ts/**`（`tsc`），均 gitignored；`tmp/**` 为 gitignored 证据目录 |

**own 文件（只改这两个，`git status` 只有 2 个 `M`）**

1. `typescript/tokens/expressions/expression-catalog-factory.xl.md` — `Create()` 转调 E-base 目录（锚点 `// [E-CAT:REGISTER]`）
2. `typescript/tokens/declarations/variable-declaration-shape.xl.md` — EOF 收口改为「唯一表达式根 + 多根显式拒绝」（锚点 `// [E0B:INIT-ROOT]`）
3. 本报告

**没有碰**：`statement-route-util`（开关定义）/ `variable-declaration-possible-shape`（`CatalogGuide` 的真实挂载点）/ `variable-statement-possible-shape`（门控点）/ `expression-shape-catalog`（E0a 的注册区）/ `binary-expression-possible-shape` / `right-operand-possible-shape` / `statement-shape` / `root-expression-statement-possible-shape` / `direct-*` / `operator-table` / `core/**` / 任何 case。

## 1. 验收读数（全部可复算）

| # | 命令 | 读数 |
| --- | --- | --- |
| 1 | `xl_build {cwd=<克隆>, paths:["core","typescript"], targets:["ts"]}`（不传 out） | **0 error**，3 warning（既有 `E1107` 三处重名，与基线逐条相同）；改动文件重生成 2 个，其余 567 个 up-to-date |
| 2 | `node node_modules/typescript/bin/tsc -p .` | **exit 0** |
| 3 | `node typescript/cases/tts/run.mjs --json tmp/final1.json` | **PASS 380 / FAIL 0 / 380**；`throw 125/125 · atomic 202/202 · partial 53/53 · incremental 0/0` |
| 4 | `node typescript/cases/tts/tools/diff-report.mjs tmp/base.json tmp/final1.json` | **`380 个 id：一致 380 / 允许变化 0 / 不允许变化 0`** → **PASS**（本 WP 无 `--allow`：一条分类都没变） |
| 5 | `node typescript/cases/tts-impl/run.mjs` | **PASS 45 / FAIL 0 / 45**（`incremental 45`，无 throw/atomic/partial） |
| 6 | 同一命令两次 `--json` 的 SHA-256 | `final1.json` 与 `final2.json` **逐字节相同**（确定性保持） |
| 7 | `expr-probe --both --json` × 7 样本（改动前后各一遍） | **7/7 快照文件 SHA-256 逐字节相同**（legacy 与 incremental 两种模式的逐字符树 + EOF 树都一字未变） |
| 8 | 临时注入探针（不提交，见 §3） | 增量模式行为**按注入内容改变**（`declaration 初始化器多根` / `expression 数字字面量`），legacy 模式**不受影响** |

零漂移的证据链：本 WP 的两个改动都不改变「开关 on 时跑出来的目录内容」——`Create()` 的返回值从内联
`[NumericLiteralPossibleShape, BinaryExpressionPossibleShape]` 换成
`ExpressionShapeCatalog.CreateDeclarationInitializer()`，后者此刻**逐项相同**（`CreatePrimary()` = 数字字面量；
`CreateOperators()` = 旧二元候选 + 空的 `AppendFragments` 注册区），候选顺序也一样，所以
`CatalogGuide.Candidates` 的下标语义不变；`FinishIncremental` 的改动只把「收下所有非 basic 单元」
换成「收下唯一的非 basic 单元」，对现有全部形态等价。数字读数见 #3/#4/#5/#7。

## 2. 接法（实际调用链、门控点）

### 2.1 真实调用链（实读，不是 PLAN 里的推测）

```text
VariableStatementPossibleShape.BuildByIndex                 (variable-statement-possible-shape.xl.md:144)
  └─ if StatementRouteUtil.IsIncrementalVariableShapesEnabled()      ★ 门控点（E0b 未改，只读）
      └─ IncrementalVariableStatementBuilder.Build                    (variable-declaration-possible-shape.xl.md:132)
          └─ declaration.CatalogGuide =
               new CatalogGuide(ExpressionCatalogFactory.Create(),    ← ★ E0b 的唯一接线点
                                new VariableDeclarationEndPossibleShape())
              └─ ExpressionCatalogFactory.Create()                    (expression-catalog-factory.xl.md)
                  └─ ExpressionShapeCatalog.CreateDeclarationInitializer()   ← E0a 装配点
                      ├─ CreatePrimary()   = [NumericLiteralPossibleShape]
                      └─ CreateOperators() = [BinaryExpressionPossibleShape] + AppendFragments(...)
              └─ 逐字符建形状 → declaration.Data
                  └─ VariableDeclarationShape.FinishIncremental()     ← ★ E0b 的 EOF 收口点
                      └─ 唯一表达式根 .TryToClose() → 作为唯一子节点收下
```

⚠️ **与 PLAN §4.1 的偏差（重要，给 Lead 与 A5/A6）**：PLAN 把 E0b 的 own 写成
「`variable-declaration-shape.xl.md`：改造 `FinishIncremental` 分支，gate 新开关」，但实读发现
**`CatalogGuide` 的挂载点在 `variable-declaration-possible-shape.xl.md`**、**门控点在
`variable-statement-possible-shape.xl.md`**，两者都不在 E0b 的写域里。因此本 WP 的接法改成：
**唯一接线点放在 `ExpressionCatalogFactory.Create()`**（它本来就是「表达式候选目录的唯一装配点」，
且只有增量路径会调用它），`variable-declaration-shape.xl.md` 只承担 EOF 收口职责。
这样 A1–A4 的片段**不需要任何新接线**就能进入初始化器目录——这也是「Phase A 总闸」的正确位置。

### 2.2 门控点（为什么 `EnableIncrementalVariableShapes=false` 时 legacy 逐字节不变）

- 机械保证链：`EnableIncrementalVariableShapes == false` ⇒ `VariableStatementPossibleShape.BuildByIndex`
  不调 `IncrementalVariableStatementBuilder.Build` ⇒ `VariableDeclarationShape` 只会由 legacy
  `StatementBuilder` 建出（`Incremental` 恒为 false）⇒ `ExpressionCatalogFactory.Create()` **一次都不执行**、
  `FinishIncremental()` **一次都不执行**。新路径是「一步不走」，不是「走了但结果相同」。
- 本 WP 没有新增任何开关读取：`Create()` 的调用点自身就是「旧开关 on」的产物，所以
  **旧开关 on ⇒ 新目录**（任务书口径），无需在工厂里再读一次开关。
- 为什么**不**再按 PLAN §6.1 的 `EnableIncrementalShapes` 二次门控（当时的备选方案，已否决）：
  tts / tts-impl / expr-probe 的 `setIncremental(enabled)` 都是**双开关同时置位**（`run.mjs:240-245`、
  `expr-probe.mjs:75-79`），二次门控对账本零影响；但 A1–A4 的片段一旦被二次门控挡住，任何只打开旧开关的
  调用方（包括以旧开关为准的第三方用法）都会看到「注册了却没生效」，排查成本高。旧开关 on 即启用新目录
  是最短、最少歧义的接线；将来 Lead 若要收紧成「新开关才算新路径」，只需在 `Create()` 里包一层
  `if (StatementRouteUtil.IsIncrementalShapesEnabled())`（3 行，已在文件注释里写明位置）。

### 2.3 两个改动文件的语义

`expression-catalog-factory.xl.md`

- `Create()`：删掉内联 `shapes.push(...)` 列表，改成
  `return ExpressionShapeCatalog.CreateDeclarationInitializer();`（锚点 `// [E-CAT:REGISTER]`）。
  注释写清了「E0b 之前的内联列表」「顺序逐项相同」「legacy 不经过本方法」。
- 依赖：去掉不再使用的 `BinaryExpressionPossibleShape` / `NumericLiteralPossibleShape` import，
  新增 `ExpressionShapeCatalog` import（候选的义务随之转到 E0a 目录，E0b 不再持有列表——避免两处漂移）。
- `CreateRightOperandCatalog()`：**一行未改**，仍转调 `RightOperandPossibleShape.Catalog()`；
  文档补了「E0b 不改这一份；A2 若需要更丰富的右操作数候选，扩 `RightOperandPossibleShape.Catalog()`
  那一处，不要复制列表」（旧二元候选实际直接挂 `RightOperandPossibleShape.Catalog()` 而不经本工厂，
  实测 `grep` 确认本方法是公开转调点、无运行期调用方，保留以免破坏旧行为与文档契约）。

`variable-declaration-shape.xl.md`

- 文件头补「WP-E0b」三节：候选从哪来 / 门控点在上游不在本文件 / EOF 收口契约。
- `FinishIncremental` 的 built-shape 分支（锚点 `// [E0B:INIT-ROOT]`）：
  - **旧**：遍历 `raw`，把**所有**非 basic 单元都 `kept.push(...)`；
  - **新**：找到**唯一**的非 basic 表达式根（多根 ⇒
    `throw new Error("增量变量形状未支持：declaration 初始化器多根")`），只对它 `TryToClose(context)` 并收下它。
  - 理由：A1–A4 会往目录里加候选；一旦某个候选把运算符形状 / 第二个操作数留在**父层**，
    旧代码会静默建出多子节点的错树（`divergent`，C10 硬红线），账本上表现为「树不同却判绿」。
    现在这种形态当场显式拒绝。对现有 45 条增量 baseline 与 380 条账本**等价**（读数 §1 #3/#4/#5/#7）。
  - `FinishIncremental` 的 EOF 收口本身（`TryToClose` 时机、`;`/`,`/`!`/`:`/括号/解构的既有 throw、
    `ExpressionBuilder` 降级分支）**全部保持原样**。

## 3. 证明新目录确实被使用（临时注入，不提交）

方法：临时把 `Create()` 的新分支改成「取 E-base 目录 → **摘掉** `BinaryExpressionPossibleShape`」，
重建、跑探针、再原样恢复（`tmp/factory-real.xl.md` 备份 + `Copy-Item` 还原，SHA-256 与提交前一致；
`git status` 最终只有那 2 个 `M`，注入代码**不在** `0f81addf` 里）。

| 探针（源码） | 模式 | 注入前 | 注入后（摘掉旧二元候选） |
| --- | --- | --- | --- |
| `let x = 1+2*3\n` | incremental | `增量变量形状未支持：expression 新运算符结合更紧（优先级 14）`（char 12） | **`增量变量形状未支持：expression 数字字面量`（char 7）** |
| `let x = 2*3+1\n` | incremental | 正常建树（EOF 根 = `BinaryExpressionShape(+)` → `Binary(*)`） | **`增量变量形状未支持：expression 数字字面量`（char 7）** |
| `let x = 2*3+1\n` | legacy | 正常建树 | **正常建树，逐字节相同** |

结论：**增量模式的建树行为完全由 `ExpressionCatalogFactory.Create()` 返回的候选列表决定**
（把其中一个候选从新目录里摘掉，`let x = 1+2*3` 与 `let x = 2*3+1` 的增量行为立刻改变）；
legacy 模式不受影响（开关 false ⇒ 不经过 `Create()`）。因此 `let x = 1+2*3` 的初始化器目录就是新目录。

注入过程还实测到一个**给 A1–A4 的关键坑**（见 §4.4）：目录里只剩 1 个活候选时，`CatalogGuide`
会在 `=`/空白处**立刻**建形状（`expression 数字字面量` 报错就是 `BuildByIndex` 拿到 `Symbol("=")`）。

## 4. 给 A1–A4 的注册示例（唯一入口、锚点、格式、顺序）

### 4.1 注册区（唯一入口）

文件：`typescript/tokens/expressions/expression-shape-catalog.xl.md`（**E0a own**，form WP **只追加、不重排、不删别人的行**），
锚点在 `AppendFragments` 方法体末尾（当前 `:107`）：

```ts
// [E-CAT:FRAGMENTS] 以下是各形态片段，每行一个，按 WP id 排序（form WP 只在本行之后追加，不重排）：
```

每行格式固定、一行一个片段、**按 WP id 排序**（`[A1]` → `[A2]` → `[A3]` → `[A4]` …）：

```ts
  StringLiteralPossibleShape.AppendTo(shapes); // [A1]
  OperatorPossibleShape.AppendTo(shapes);     // [A2]
  MemberAccessPossibleShape.AppendTo(shapes);  // [A3]
  ObjectLiteralPossibleShape.AppendTo(shapes); // [A4]
```

片段类自己实现（§7.2），**只追加自己那一个新实例**：

```ts
## static method AppendTo:(shapes:Array<PossibleShape>)=>void

```ts
shapes.push(new StringLiteralPossibleShape());
```
```

注册后**不需要改任何其它文件**：`CreateDeclarationInitializer()` 已经把 `CreateOperators()`（含注册区）
拼进声明初始化器目录；本 WP 的 `ExpressionCatalogFactory.Create()` 已经转调它。
（顺序影响不大——候选判据互斥，`CatalogGuide` 的 `Candidates` 是下标集合；但**不要**把同一个候选注册两次，
见 §4.4。）

### 4.2 目录的实际构成（注册后）

```text
ExpressionShapeCatalog.CreateDeclarationInitializer()
 = CreatePrimary()   → [NumericLiteralPossibleShape]
 + CreateOperators() → [BinaryExpressionPossibleShape]  ← 旧 `*`/`+`，保留给你们当“已支持二元”基线
                       + AppendFragments()             ← A1–A4 各一行，追加在最后
```

### 4.3 初始化器的收口是 **E0b 已经做好的**，form WP 不用管

- 候选只负责「建形状 + 挂进 `VariableDeclarationShape.Data`」；**收口时机**由
  `VariableDeclarationShape.FinishIncremental` 决定（EOF 时对唯一根 `TryToClose`）。
- 因此 A1–A4 的候选必须保证：**一次 build 之后，父层 `Data` 里只会留下 1 个非 basic 表达式根**
  （原位 `Replace` / `splice` 合并，与 `BinaryExpressionPossibleShape` 的既有惯用法一致）。
  若留下 2 个以上，会收到
  `增量变量形状未支持：declaration 初始化器多根` —— 这是 C10 的显式拒绝，**不要**去改 `FinishIncremental`
  放宽它（那是 divergent 的入口）。
- 中间态允许临时出现多个形状，但**下一个候选 build 或 EOF 收口前必须合并成一个根**。

### 4.4 三个必须遵守的约束（都是实测出来的，不是推测）

1. **候选对「初始化器还没开始」的单元必须给 `Uncertain`，不能给 `Reject`。**
   `CatalogGuide` 只在**建出形状后**才 `Reset()` 重新填满 `Candidates`（`core/syntax/catalog-guide.xl.md:17,123-135`），
   中途 `Reject` 的候选**本条目内永不回来**。既有 `NumericLiteralPossibleShape` 对 `Symbol("=")` 和 trivia
   都给 `Uncertain`（`numeric-literal-possible-shape.xl.md:70-75`），新候选照抄这条。
2. **目录里必须始终 ≥2 个活候选，否则 `CatalogGuide` 会在 `=` 上直接建形状。**
   实读 `CatalogGuide.ComputePossibleShapesByIndex`：**只剩 1 个活候选时立刻 `BuildByIndex`**（不看
   `IsBuildable` 之外的「还没开始」信号）。§3 的注入探针把目录减到 1 个候选，就在 char 7 报
   `expression 数字字面量`（`BuildByIndex` 拿到 `Symbol("=")`）。所以：**不要**在注册区里删掉 / 替换
   `NumericLiteralPossibleShape` 或 `BinaryExpressionPossibleShape`；注册只**追加**。
3. **同一个候选类不能注册两次**（注册区重复行 / A2 又注册一个 `BinaryExpressionPossibleShape`）：
   两个相同候选会在同一格同时 `Accept` ⇒ `Candidates.size > 1` 永远 `Waiting` ⇒ 该格建不出形状，
   退化成 basic/EOF 兜底 ⇒ `divergent`。A2 的运算符形态请走**新类**（E-base 归约栈），不要复制旧二元候选。

### 4.5 右操作数目录（若 A2/A3 需要）

- 旧二元候选建 `BinaryExpressionShape` 时直接挂 `RightOperandPossibleShape.Catalog()`（**只有这一份定义**）。
- `ExpressionCatalogFactory.CreateRightOperandCatalog()` 保留为公开转调点（本 WP 一行未改）；
  E-base 归约栈若要更丰富的右操作数候选，**扩 `RightOperandPossibleShape.Catalog()` 那一处**，
  或按 E0a 契约在 `ExpressionShapeCatalog` 增加一个新方法（需 E0a/Lead 同意，本 WP 不越权）。

## 5. 风险与未竟项

1. **A5/A6 与本文件的串行性**：PLAN §5.1 把 `variable-declaration-shape.xl.md` 在 E0b 之后交给 A5（`:` 类型注解）
   与 A6（`,`/`;`/`!`/解构）。本 WP 已把该文件提交在 `0f81addf`，A5/A6 从 `integration/all-possible`
   合并后 rebase 再动；`FinishIncremental` 的 EOF 收口契约（唯一根）不要放宽。
2. **`;` 仍是显式 throw**（`declaration ;`），属于 A6 的范围；本 WP 不碰。
3. **多根 throw 是新增的错误面**：A1–A4 注册后若某形态留下多根，会从「静默 divergent」变成「显式 throw」——
   这是**预期**的（C10），排查时看 `declaration 初始化器多根` 即可定位到「哪个候选没把形状合并回父层」。
4. **既有 `src`/trivia 缺陷（§2.3 的缺陷 3/4）未修**：本 WP 零漂移即意味着 `residualBasicLines` 与
   `rangeOnlyDifference` 的读数与 base 完全一致（380 条里该有的仍有），按计划由 B6 收口；本 WP 没有把缺陷复制到新路径。
5. **未跑既有 gates**（按纪律：不跑 `npm run gates` / `tests/gates/**` / `samples` / `coverage` / `ast:*`）；
   **未 push**；工作目录保留。
6. **确定性**：两次独立进程 `--json` 逐字节相同（§1 #6）；`expr-probe` 7 样本两种模式逐字节相同（§1 #7）。
7. **给 A7 的提醒**：本 WP 没有迁移任何 case（目标分类零变化，`diff-report` 380/380 一致），
   Phase A 的迁移仍由 A7 在 A1–A6 完成后统一做。
