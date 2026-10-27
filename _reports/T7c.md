# T7c — 括号角色目录安装搬进候选（四线）

- 集成分支：`feature/all-possible-1027` @ `1f6cd14e`（T7b 已合入）
- 工作分支：`feature/all-possible-1027-t7c`；工作副本 `xl-example-set/all-possible-1027-t7c`
- 对照树：`xl-example-set/base-1f6cd14e`（`git worktree add 1f6cd14e` + 独立 `xl_build` / `tsc`，未 push）
- 行号均指 `*.xl.md`（唯一事实源）；未跑 gates / wide-ast / tts；未 push；未合并；目录保留

## 1. 四线状态

| 线 | 状态 | 落点（`Install` 的新位置） | 改动文件 |
|---|---|---|---|
| ParameterList | **已搬** | `ParameterListPossibleShape.InstallAtBracketCreated`（`(` ⇒ 角色 `ParameterList`；`[` ⇒ `StepAtBracketCreated`） | `typescript/tokens/types/parameter-list-possible-shape.xl.md`、`typescript/tokens/declarations/function-declaration-shape.xl.md` |
| ControlHead | **已搬** | `ControlHeadPossibleShape.InstallAtBracketCreated`（`(` + 角色 `ControlHead`） | `typescript/tokens/statements/control-head-possible-shape.xl.md` |
| ExprBracket | **已搬** | `ExpressionBracketPossibleShape.InstallAtBracketCreated`（四个表达式角色之一） | `typescript/tokens/expressions/forms/shared/expression-bracket-possible-shape.xl.md` |
| MemberShell | **已合规**（安装点本来就在候选类里，只补了创建拍入口） | `MemberShellCatalog.InstallAtBracketCreated` → `OnBracketCreated`（`(` ⇒ `InstallParameterList`，`{` ⇒ `OpenMemberBody`） | `typescript/tokens/types/member-shell-catalog.xl.md` |
| 分派外壳 | — | `BracketRoleCatalogHook.OnBracketCreated` | `typescript/tokens/statements/bracket-role-catalog-hook.xl.md` |

共 **6 个文件**。四线都是「候选自己判据 + 复用 `BracketCatalogInstaller.Install`（幂等）」，
没有新增安装路径、没有改 `BuildGuide` / `SetEndPossible` / `WaitingEndPossible` 语义。

## 2. 改后的创建拍

```
Bracket.Transit
  → unit.OnBracketCreatedEvent            （族 hook，未改）
  → ChildBracketCreatedHook               （未改）
  → BracketRoleHook.Current.OnBracketCreated（T7c：纯分派）
       if (EnableBracketRoleCatalog):
         MemberShellCatalog.InstallAtBracketCreated   → true 就停
         ControlHeadPossibleShape.InstallAtBracketCreated
         ExpressionBracketPossibleShape.InstallAtBracketCreated
         ParameterListPossibleShape.InstallAtBracketCreated
  → [T7b] mounted.ComputePossibleShapes(BracketCreate) / 父宿主窄域（未改）
```

`Bracket.Transit`、`bracket-role-resolver`、`bracket-catalog-installer`、`bracket.xl.md` **未改**；
117 个候选签名未改（`InstallAtBracketCreated` 是新的静态入口，不动 `PossibleShape` 四参）；
T3 的 `IsMemberName` / 026 未改；T7b 的直调未改。

## 3. 旧 hook 剩余分支

`OnBracketCreated` 现在只有：

1. 参数守卫（`bracket === null || !(bracket instanceof Bracket)`）；
2. `if (!StatementRouteUtil.EnableBracketRoleCatalog) return;`；
3. 四线顺序分派（`if (…InstallAtBracketCreated(host, shape, context)) return;` ×3 + 尾调用）。

**已删除**：`BracketRoleResolver.Resolve`、`BracketCatalogInstaller.Install`、
`DeferredBracketCatalog.RegisterWithKey`、`RoleState` / `Role` 写入、`StepAtBracketCreated` 的旧调用点。
`EnsureInstalled` / `Installed` 保留（`SourceFileShape` 构造器与 `OpenParameterList` 仍调用它，
它是「把 `Current` 装上」的唯一装配点，T7e 与类一起删）。

## 4. 未搬项及理由

| 项 | 现状 | 理由 |
|---|---|---|
| 分派外壳本身 | 方法保留（非空，只有分派） | core `Bracket.Transit` 的 `BracketRoleHook.Current.OnBracketCreated(...)` 是唯一的创建拍 seam；本任务禁止改 T7b 的 `Transit`，也不许新增静态槽。T7e 删类时与 T7d 的 `ChildBracketCreatedHook` 合并即可。 |
| `DeferredBracketCatalog.RegisterWithKey`（创建拍登记） | 从 hook 删除，**未搬** | Deferred 只在「声明壳还没建」时出现（`class/namespace` 体），归 T7d 的成员体/块体候选；`ArrowParams` 的登记点本来就在 `arrow-params-catalog`。30 个 target case 里 Deferred 登记数为 0，OFF/ON 读数不变。 |
| `Fallback` 的 `RoleState` / `Role` 标记 | 未搬 | 只有 `BracketCatalogInstaller` 的冲突判据读 `RoleState`；Fallback 格不会走到安装，标记是纯计数/诊断。 |
| MemberShell 的 `{`（成员体）与成员体目录 | 留在 `MemberShellCatalog`（本来就是候选类实现） | T7a 把成员体归 T7c，但安装点已不在 hook；`BlockPossibleShape.MountBodyCatalog` 的 T7d 迁移不在本任务。 |
| 其它角色（`MemberList` / `StatementBlock` / `FunctionBody` / `CaseBlock` / `ClauseList` / `Heritage` / `ImportExportClause`） | 未改 | 族 hook 已装（`BracketCatalogInstaller` 返回 `AlreadyInstalled`，逐字节不变）；本任务只搬四线，不触碰族 hook。 |

> 说明：`MemberList:installed`（`class C {…}` 的成员体）来自 `ClassDeclarationShape.OnBracketCreatedEvent`
> 的 `MemberShellCatalog.InstallBodyCatalog`，不是角色 hook —— 实测计数已分开（见 §5.4）。

## 5. 读数

### 5.1 构建

| 项 | 读数 |
|---|---|
| `xl_build(paths=["core","typescript"], targets=["ts"])` | **6 written / 631 skipped / 0 error / 3 warning**（既有 3 条 E1107） |
| `node node_modules/typescript/bin/tsc -p .` | **exit 0** |

### 5.2 30 条 target

| 开关 | cases | ok | fallback | diff | error | pin-miss |
|---|---|---|---|---|---|---|
| OFF（默认） | 30 | **29** | **1（026）** | **0** | **0** | 0 |
| ON（`EnableBracketCreatePossible=true` preload） | 30 | **30** | **0** | **0** | **0** | 1（026 pin，T4 输入未改） |

与 `1f6cd14e` 的 OFF/ON 逐条一致（同一探针 `tmp/target-cases.mjs` / `tmp/target-on.mjs`）。

### 5.3 5 个 smoke（`tshape-judge ts` → `ts.json`，SHA256 前 16 位）

| case | 本树 | `1f6cd14e` 对照树 | T7b 基线 |
|---|---|---|---|
| `if (a) {}` | `BB07DA2201FC5087` | 同 | 同 |
| `const a = x + y` | `BB07DA2201FC5087` | 同 | 同 |
| `f(a)` | `BB07DA2201FC5087` | 同 | 同 |
| `class A {}` | `BB07DA2201FC5087` | 同 | 同 |
| `const o = { a: 1 }` | `BB07DA2201FC5087` | 同 | 同 |

5 份 `ts.json` 都是 `{"status":"ok","structural":[],"moved":[],"fields":[]}`。

### 5.4 BuildCount（`tmp/build-count-probe.mjs`，30 case 逐条 reset 后 `Parse`）

| 档 | 本树 | `1f6cd14e` 对照树（同一构建流程现场重建） |
|---|---|---|
| OFF | **127，guardSkips=0** | 127 |
| ON | **127，guardSkips=0** | 127 |

**逐 case `Compare-Object` 零差异**（OFF / ON 各自比）。`guardSkips=0` ⇒ 没有同格双触发。
注：T7b 报告记的是 124 / 123；在本机对 `1f6cd14e` 做一次干净 clone + `xl_build` + `tsc` 后实测也是 127 / 127，
说明 124/123 是 T7b 当时的探针/构建快照差异，不是本次改动引入的。

角色安装探针（`tmp/role-install-probe.mjs`，包一层 `BracketCatalogInstaller.Install` 统计 `plan.Role`）：
ON 实际装上的角色 = `ControlHead 21 / ObjectLiteral 1 / ArrayLiteral 1`（旧 hook 的活）+ `MemberList 2`（族）；
OFF 另有 `ParameterList 1`（`OpenParameterList` 的新入口）。搬完之后这些安装全部由候选发出，
`AlreadyInstalled` 仍是绝大多数（`StatementBlock 27` / `MemberList 2` / `FunctionBody 1`），逐字节不变。

## 6. 开关语义

- `EnableBracketCreatePossible` **不参与**装/触发判定：T7b 已无条件直调，T7c 的候选与分派外壳都不读它；
- 装只由 `EnableBracketRoleCatalog` 与候选自身判据（角色名 + 括号字符）决定；
- 两条已知的「开关被就地翻真」保持原样，未在本次扩大：
  `source-file-shape` 构造器在 `EnableExprBracketCatalog` / `EnableControlHeadCatalog` 打开时置
  `EnableBracketRoleCatalog = true`；`FunctionDeclarationShape.OpenParameterList` 在简单参数表处也置真。
  因此 ON（只翻 create）与 OFF 都会装上控制头/表达式目录 —— 这正是 OFF 026 仍 fallback 的原因，
  也是 T7b 记下的组合语义。要彻底折叠两个开关归 T7e。

## 7. 验收对照

| 项 | 要求 | 实测 |
|---|---|---|
| `xl_build` | 0 error | 0 error |
| `tsc -p .` | exit 0 | exit 0 |
| OFF 30 target | 29/1(026)/0/0 | 29/1(026)/0/0 |
| ON 30 target | 30/0/0/0 | 30/0/0/0 |
| 5 smoke SHA16 | 不变 | 全 `BB07DA2201FC5087` |
| BuildCount | 与 T7b 合并树逐 case 一致 | 与 `1f6cd14e` 逐 case 零差异，guardSkips 0 |
| 装目录不 splice 宿主 `Data` | 是 | 四条线只写 `bracket.CatalogGuide` / `Shape` 与既有 `StepAtBracketCreated`（`[`） |
| 不改 `Transit` / resolver / installer / 117 签名 / 026 | 是 | 未改 |
| 不 push | — | 未 push |

## 8. 留给后续

- **T7d**：成员体/块体的 `MountBodyCatalog`、`Deferred` 登记、容器等待 `Close`。
- **T7e**：删 `BracketRoleCatalogHook`（连同它的分派外壳）与 `BracketRoleHook` 调用点、
  三个恒 0 的 `BracketCreate*Count`、`BracketCloseHook`/`BracketClosedHook`，并折叠两个开关。
