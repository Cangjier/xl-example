# B0a · 括号角色机制（Known / Deferred / Fallback）落地报告

| 项 | 值 |
|---|---|
| 角色 | 基建智能体 B0a（只建机制、不迁 site） |
| 工作副本 | `C:\Users\Admin\Documents\GitHub\xl-example-set\b0a-bracket-role`，分支 `feature/b0a-bracket-role` |
| 基于 | 主仓库 `3f0d4c42`（`feature/all-possible`） |
| 性质 | 新增机制 + 默认关闭的开关；**site 一个都没迁**，目标与实测都是**零行为变化** |
| 依据 | `_reports/BRACKET-A1.md`（26 site 矩阵 / §2 契约 / §5 风险）、`_reports/BRACKET-A2.md`（19 site / `WaitingEnd` / A4b `(` 格）、`_reports/S1-structural.md` §0 P0/P1 |

---

## 0. 一句话结论

B0 的三件套（`BracketRoleResolver` / `BracketCatalogInstaller` / `DeferredBracketCatalog`）+ 承重件
`WaitingEndPossible` 已经落地，并被 `Bracket.Transit` 在**族收尾之后**调用；**默认开关 `false` 时钩子根本不装**，
`Transit` 只多一次 `null` 比较。验收五条与基线**逐项相同**（§4）。机制已被两条只读探针证明「装上也不改树」：
开关打开、目录注册表仍为空时 `known=5 / already=5 / installs=0`，AST 6/6 逐字节一致；
再注册一份合成目录后 `installs=1 / guard=1`，AST 仍一致（§5）。

---

## 1. 交付物（7 个文件）

### 1.1 新建（5）

| 文件 | 内容 | 关键点 |
|---|---|---|
| `typescript/tokens/statements/bracket-role-resolver.xl.md` | `BracketRoleState` / `BracketRole` / `BracketRoleCatalog` / `BracketRoleResult` / `BracketRoleResolver` | `Resolve` 只看**宿主形状 + 括号字符 + 已确定语句族**；**不调用 `TypeBuilder.IsBodyBrace`**，不读字符；函数体 vs 返回类型对象字面量只用「括号前一个非 trivia 单元是不是已闭合的 `(`」这种结构位区分 |
| `typescript/tokens/statements/bracket-catalog-installer.xl.md` | `BracketInstallResult` / `BracketCatalogInstaller` | 幂等；已有目录时只 `SetEndPossible`，**绝不覆盖 `PossibleShapes`**；冲突 / 双 Accept 显式计数；`Known` 一律配 `WaitingEndPossible` |
| `typescript/tokens/statements/deferred-bracket-catalog.xl.md` | `DeferredBracketEntry` / `DeferredBracketCatalog` | `Register` / `Bind` / `Replay` / `Drop` / `Report`；R1–R7 七条硬规则逐条落地并各配计数 |
| `typescript/tokens/statements/waiting-end-possible.xl.md` | `WaitingEndPossible extends PossibleShape` | `ComputeByIndex` **永远 `Uncertain`（永不 Accept）**；`BuildByIndex` 抛错桩（不可达） |
| `typescript/tokens/statements/bracket-role-catalog-hook.xl.md` | `BracketRoleCatalogHook extends BracketRoleHook` | typescript 侧的唯一实现 + `EnsureInstalled` 幂等装配点 |

### 1.2 修改（2）

| 文件 | 改动（全部零行为） |
|---|---|
| `core/syntax/basic-tokens/bracket.xl.md` | ① 新增 `BracketRoleHook`（抽象类 + `static Current`）；② `Bracket.Transit` 在 `OnBracketCreatedEvent` 与 `ChildBracketCreatedHook` 补通知**之后**调用 `BracketRoleHook.Current`；③ `Bracket` 加三个**纯标量**字段 `RoleState` / `Role` / `ReplayCount`（不进 `Data`、不进 XML）；④ `OnBracketCreatedEvent` 的文档降级为「族收尾」，**代码一字未改** |
| `typescript/tokens/statements/statement-route-util.xl.md` | 只加字段（无逻辑改动）：`EnableBracketRoleCatalog=false`、`BracketRoleKnownCount` / `DeferredCount` / `FallbackCount` / `ReplayCount` / `ReplayFailureCount`、`EnableArrowParenCatalog=false` |
| `typescript/tokens/files/source-file-shape.xl.md` | 构造器里一行 `BracketRoleCatalogHook.EnsureInstalled()`（开关为假时立即返回） |
| `typescript/tokens/expressions/forms/primary/composite-initializer-forms-judge.xl.md` | A4b `(` 格：`Family` 增加 `"arrowparen"` 前瞻（**只在 `EnableArrowParenCatalog` 为真时**）+ 新方法 `IsArrowParen` + 文档 |

> 合计 1.1 的 5 个新文件 + 1.2 的 4 个已存在文件 = 9 个源文件；`xl_build` 626 写 / 0 error。

---

## 2. API（B1 / B2 直接调用）

### 2.1 解析与三态

```ts
// BracketRoleState: None=0 | Known=1 | Deferred=2 | Fallback=3
// BracketRole: 字符串常量 Unknown / ParameterList / FunctionBody / TypeLiteral / MemberList /
//              DeclarationList / StatementBlock / CaseBlock / ControlHead / ClauseList /
//              Heritage / ImportExportClause / ObjectLiteralMethodBody

BracketRoleResolver.Resolve(host: Token, bracket: Token, context: SyntaxContext): BracketRoleResult
// BracketRoleResult: State / Role / Owner / OwnerKey / Shapes / End / Reason
//                    IsKnown() / IsDeferred() / IsFallback()
BracketRoleResult.Known(catalog, end, role, owner, ownerKey)
BracketRoleResult.Deferred(role, reason, owner, ownerKey)
BracketRoleResult.Fallback(reason)
```

`host` 是**新括号的宿主**（`Bracket.Transit` 里的 `unit`），`bracket` 是刚建出来的括号。

### 2.2 接线（B1/B2 只需要这几行）

```ts
// ① 注册一份角色目录（候选实例可共享；终结候选由安装器统一补 WaitingEndPossible）
BracketRoleResolver.RegisterCatalog(new BracketRoleCatalog(BracketRole.ParameterList, [ ...候选... ], null));

// ② 打开总开关（探针 / harness 里；默认 false）
StatementRouteUtil.EnableBracketRoleCatalog = true;

// ③ 壳被建出来时唤醒延迟括号（D-b 型，如 class/interface/enum 成员块）
DeferredBracketCatalog.Bind(shellToken);          // 返回本次唤醒的括号数组
DeferredBracketCatalog.Bind 之外，登记用 Register / RegisterWithKey（hook 已自动调）
```

`BracketRoleCatalogHook.EnsureInstalled()` 已在 `SourceFileShape` 构造器里调用，B1/B2 **不必**再管装配。

### 2.3 安装器语义（B1/B2 依赖的返回值）

```ts
BracketCatalogInstaller.Install(bracket, plan, context): int
//   Installed=0        -> 新建了 CatalogGuide（Shapes 来自 plan，End 一定是 WaitingEndPossible）
//   AlreadyInstalled=1 -> 括号已有目录（族先装的）：只 SetEndPossible，PossibleShapes 一字不改
//   RefusedConflict=2  -> 同一括号出现第二个角色的 plan：保留先装者并计数
//   RefusedFallback=3  -> plan 不是 Known（Deferred/Fallback）或目录为空：什么都不做
BracketCatalogInstaller.SetEndPossible(bracket, end): bool   // 已有终结候选则保留（KeptExistingEndCount）
BracketCatalogInstaller.IsInstalled(bracket): bool
BracketCatalogInstaller.BuildGuide(plan): CatalogGuide | null  // Replay 也用它（R6 先建到本地）
```

### 2.4 计数器（`StatementRouteUtil`，只读）

| 字段 | 语义 | B0 实测 |
|---|---|---|
| `EnableBracketRoleCatalog` | 总开关，默认 `false` | `false` |
| `BracketRoleKnownCount` | `Resolve` 返回 `Known` 的次数 | 0（开关关）/ 5（合成探针） |
| `BracketRoleDeferredCount` | `Resolve` 返回 `Deferred` 的次数 | 0 |
| `BracketRoleFallbackCount` | `Resolve` 返回 `Fallback` 的次数 | 0 / 3（合成探针） |
| `BracketRoleReplayCount` | replay 成功数 | 0（注册表为空 ⇒ 无 replay） |
| `BracketRoleReplayFailureCount` | R2/R4/R5/R6 触发数 | 0 |

安装器另有 `InstallCount` / `AlreadyInstalledCount` / `RefusedConflictCount` / `RefusedFallbackCount` /
`DoubleAcceptGuardCount` / `KeptExistingEndCount` / `RefusedEmptyCount`；延迟目录另有 `ReplayCount` /
`ReplayFailureCount` / `BindCount` / `PendingCount()` / `Report()`。

---

## 3. 机制要点（与 A1/A2 契约的对应）

1. **唯一创建点**：`Bracket.Transit` —— 顺序是「族 hook（`OnBracketCreatedEvent`）→ 非括号宿主补通知 →
   `BracketRoleHook`」。任务书要求的「`OnBracketCreatedEvent` 之后」被严格执行；`OnBracketCreatedEvent`
   因此自然降级为族收尾（它的代码一行没改，身份由调用顺序决定）。
2. **`ChildBracketCreatedHook` 只保留非括号宿主适配**：代码保留两处调用（删掉会改嵌套块行为），
   但**角色机制不再经过它**；后续各族的角色目录迁完后可以逐个删掉块体分支。
3. **Known 的两种来源**（这是 `BracketRoleKnownCount == 既有 MountCount 之和` 的对账口）：
   ① `bracket.CatalogGuide !== null`（族已装，`Reason = "family-installed"`，安装器只回 `AlreadyInstalled`）；
   ② 注册表里有该角色的目录（首次安装）。
4. **Deferred** 只登记、不建 shape、不改 `Data`；`OwnerKey` 为空串时是通配（声明族「壳还不存在」用）。
5. **Fallback 全部显式**：`Reason` 是可机械分组的英文短句（`return-type-position:TypeLiteral`、
   `object-literal-method-body`、`no-host-rule:<宿主><括号>`、`catalog-not-registered:<Role>`、
   `square-bracket-owned-by-expression-side` …）。B0 阶段后两条占了绝大多数，这是**机制缺件**而非 site 漏网；
   BF 审计的允许集合仍是 `{TypeLiteral, ObjectLiteralMethodBody}`。
6. **replay 绝不与 `Reload` 混用**：只喂 `bracket.Data` 里已存在的单元，不推消息、不调 `Close`；
   `Replaying` 期间 `Replay` / `Bind` 一律返回空（R7），条目留在 `Pending` 里等外层结束。

---

## 4. 验收（与基线逐项相同）

| 项 | 基线 | 实测 | 结论 |
|---|---|---|---|
| `tshape-judge ts-all` | 426 ok / 0 moved / 3 err / 0 structural / 0 fields | `total=429, ok=426, failures=3`，3 条全是 `incremental-error`（`class-ball.ts@365`、`expression-zoo.ts@58`、`generic-container.ts@471`），**`status="diff"` 的用例 0 条** ⇒ moved / structural / fields 均为 0 | 一致 |
| `tts` | PASS 429；throw 3 / incremental 426 | `[tts] 429 条 case：throw 3/3 · atomic 0/0 · partial 0/0 · incremental 426/426`、`PASS 429 / FAIL 0` | 一致 |
| `tests/gates/run.mjs` | 4 PASS / 0 FAIL / 7 N/A | 11 道门：4 通过 / 0 失败 / 7 不适用（`direct:lint`、`cases:check`、`wide-ast`、`real-dts-ast` 通过） | 一致 |
| `xl_build { core, typescript } ts` | 0 error | 626 written / 0 error / 3 warning（三条 `E1107` 重名告警是既有问题：`class-*-possible-shape` 与 `*-possible-shape` 同名类型） | 一致 |
| `tsc -p .` | exit 0 | `TSC_EXIT=0` | 一致 |
| `xl_check`（本次 7 个改动文件） | — | 0 error / 0 warning | 干净 |
| P1 示例 `function f(...args: number[]) {}` | step 31 一次补 7 个 shape（legacy 收口） | step 31 一次落地 `ParameterShape` / `DotDotDotTokenShape` / `IdentifierShape` / `ArrayTypeShape` / `NumberKeywordShape` / `BlockShape`，step 32 起不再变化 | **未变（预期）** |

---

## 5. 探针（只读，`tmp/` 已 gitignore，不入库）

### 5.1 `tmp/probe-b0a-counters.mjs` —— 默认零花费 + 开关打开也不改树

6 个增量用例（`function-rest-param` / `function-basic` / `const-add` / `declare-namespace` /
`class-field-modifiers` / `enum-numeric`），增量双开关打开：

```text
A-switch-off            hook=null      known=0 deferred=0 fallback=0 replay=0 installs=0 already=0 conflict=0 guard=0 pending=0
B-switch-on-no-catalog  hook=installed known=5 deferred=0 fallback=3 replay=0 installs=0 already=5 conflict=0 guard=0 pending=0
astIdentical=6/6
```

读数解释：开关关 ⇒ 钩子根本没装、四个计数全 0（**这就是「默认逐字节走现状」的证据**）；
开关开但注册表空 ⇒ 5 个已有族目录的括号走 `AlreadyInstalled`（不改一个字节），3 个「没有角色」的括号
计 `Fallback`，`installs=0`，AST 6/6 一致。

### 5.2 `tmp/probe-b0a-install.mjs` —— B1/B2 将要走的 Known → Install 路径

注册一份**合成目录**（角色 `ControlHead`，一个永不 Accept 的候选；`End` 故意传 `null`），解析
`if (a) { b(); }`：

```text
installs=1 already=1 known=2 deferred=0 fallback=1 conflict=0 guard=1 keptEnd=0 empty=0 astIdentical=true
```

读数解释：`(` 上真的装出了一份新 `CatalogGuide`（`installs=1`）；`{` 走族已装（`already=1`）；
`guard=1` 证明「传入的 `End` 不是 `WaitingEndPossible` 时被替换并计数」这条规则生效；
`CatalogGuide` 的两条抛错出口一次都没触发；AST 与不注册目录时**逐字节一致**。

---

## 6. A4b `(` 格（`arrowparen` 前瞻）

- 落点：`CompositeInitializerFormsJudge.Family` 里、`(` 括号**通过**了「内部无 `:` / `as` / `satisfies`」
  扫描之后，返回 `"arrowparen"` 而不是 `"paren"`。
- 门：`StatementRouteUtil.EnableArrowParenCatalog`，**默认 `false`**；唯一调用点是 `Family`，被这个门包着。
- 判据：`IsArrowParen` 双读法（`=>` 已在单元里 / 括号已闭合且文档前瞻是 `=>`），照 `HasAssertSuffix` 的写法。
- **`bin-paren-mul` 不受影响**：`let x = (1+2)*3` 的 `Family` 仍是 `"paren"`，`OperatorContinuation` 逐字不变
  （门关时那条分支根本不进）。
- 已知局限（写给 B3b）：读法①只看「`=` 之后有没有 `=>`」，同一段单元里若还有别的箭头
  （`let x = (a), f = () => 1`）会误命中 ⇒ **B3b 打开开关前必须把入参限定到当前 declarator 的切片**
  （`CompositeInitializerJudge.EqualIndex` 之后那一段），这也是「开关与 `ArrowParamsCatalog` 必须同一个 WP 一起翻」的原因。

---

## 7. 未完成项 / 交接

1. **注册表是空的**（设计如此）：`BracketRoleResolver.Catalogs.length === 0`。B1 注册 `ParameterList`、
   B2 注册 `MemberList` / `DeclarationList` 之后对应格子才会 `Known`。
2. **replay 没有被真实运行过**：没有目录 ⇒ 没有 `Known` ⇒ 没有 `Deferred` 被 `Bind`。R1–R7 的代码与计数
   都在，但**第一次真实 replay 会发生在 B2**；届时必须看 `BracketRoleReplayFailureCount === 0`（非 0 即缺陷）。
3. **`Drop` 还没有调用点**：A2 §3 规则 3 要求 `Quit()` / `Undo` / 解构让位时把延迟条目丢掉。B0 默认不
   登记任何条目，所以没有漏；**B2 引入真实 Deferred 时必须补这个调用**（`DeferredBracketCatalog.Drop`）。
4. **`StatementShellCatalog.Take` 的身份匹配**（A1 §5 R4）没做：它属于 B3 的 `statement-shell-catalog` 所有权；
   B0 只要不 replay 就不会触发错配。
5. **`ClauseList` / `Heritage` 两个角色只声明、`Classify` 不返回**：`import`/`export` 子句统一返回
   `ImportExportClause`；`Heritage` 是无括号事件（A1 #21），只占位。B3e 如果要用 `ClauseList`，
   改 `Classify` 一处即可。
6. **`Fallback` 的 `Reason` 分布**在 B1–B3 之后要收紧到 `{TypeLiteral, ObjectLiteralMethodBody}`（WP-BF 的
   断言）；当前 `catalog-not-registered:*` / `square-bracket-owned-by-expression-side` 是机制缺件的显式读数。
7. **`Role` / `RoleState` / `ReplayCount` 三个字段只由本机制写**：`Replay` 失败时会把 `RoleState` 清回 `0`；
   其它路径不写（族 hook 不感知它们）。
