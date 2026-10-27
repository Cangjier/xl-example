# T7f — 四线安装搬进 `BuildByIndex`：完成 1 条、保留 3 条（含结构原因）

- 集成分支：`feature/all-possible-1027` @ `c7b67747`（T7e 已合入）
- 工作分支：`feature/all-possible-1027-t7f`；工作副本 `xl-example-set/all-possible-1027-t7f`
- 行号均指 `*.xl.md`（唯一事实源）；未跑 gates / wide-ast / tts；未 push；未合并；目录保留
- 基线读数：同一份干净 clone 现场构建（`xl_build` + `tsc`）后实测，与 T7e 报告的 127 / 126 一致

## 1. 结论（先看这张表）

| 线 | 目标：install 进 `BuildByIndex` | 本轮实际 | 静态分派 |
|---|---|---|---|
| MemberShell | 未进 | **已从静态分派删除**（本来就有实例入口，是纯重复） | `BracketRoleCatalogHook` 不再有这一支；`MemberShellCatalog.InstallAtBracketCreated` 整个方法删除 |
| ControlHead | 未进 | 保留 | 仍在 `BracketRoleCatalogHook.OnBracketCreated` |
| ExprBracket | 未进 | 保留 | 同上 |
| ParameterList | 未进 | 保留 | 同上（`(` 的角色安装 + `[` 的 `StepAtBracketCreated`） |

**没有一条线搬进 `BuildByIndex`。** 这不是裁剪工作量，而是三条结构性阻塞（§4 给出证据链），
其中最硬的一条是**验收条件本身**：`CatalogGuide.BuildCount` 在创建拍是 0，任何在 `BuildByIndex` 里做的
安装都会 `+1`，而验收要求「BuildCount 逐 case 与 `c7b67747` 一致」。两者不可同时成立。

本轮的交付是一个**行为中性**的净删除（−1 个静态入口、−1 个静态方法、−14 行），
四线读数与基线逐字节相同（§3），可作为后续搬迁的干净起点。

## 2. 改了什么（2 文件，+9 / −23）

### 2.1 `typescript/tokens/statements/bracket-role-catalog-hook.xl.md`

- `OnBracketCreated` 的 `MemberShellCatalog.InstallAtBracketCreated` 分支**删除**（连同
  `MemberShellCatalog` 的 import 与三段历史叙述）；
- 判据/顺序/守卫一字未动：参数守卫 → `if (!StatementRouteUtil.EnableBracketRoleCatalog) return;` →
  ControlHead → ExprBracket → ParameterList 尾调用。

**为什么这一支可以删（不是「功能丢了」）**：`Bracket.Transit` 的调用顺序是

```
unit.OnBracketCreatedEvent(mounted)      // ← 实例方法，先跑
...
BracketRoleHook.Current.OnBracketCreated(unit, mounted, context)   // ← 静态钩子，后跑
```

七个成员形状（`method-declaration` / `method-signature` / `constructor` / `get-accessor` /
`set-accessor` / `construct-signature` / `class-static-block-declaration`）的
`OnBracketCreatedEvent` 都逐字调用 `MemberShellCatalog.OnBracketCreated(this, bracket, context)`。
钩子这一支传的 `host` 就是同一个 `unit`，`Find(host)` 命中同一个 `MemberShellEntry`，
所以两处是**同一个调用、同一批实参**；而 `InstallParameterList` 走 `InstallIfSimple`
（状态按 `Data` 数组对象登记）与 `OpenMemberBody`（`entry.BodyBlock !== null` 早退）各自幂等。
⇒ 后到的钩子这一支是纯重复，删掉不影响任何一次安装。

### 2.2 `typescript/tokens/types/member-shell-catalog.xl.md`

- 删除 `## static method InstallAtBracketCreated`（方法体只有 `Find(host)` 判空 + 转调
  `OnBracketCreated`）。删除后全仓无调用点（`grep` 见 §5）。

## 3. 读数（全部与 `c7b67747` 逐项一致）

| 项 | 要求 | 实测 |
|---|---|---|
| `xl_build(core,typescript → ts)` | 0 error | **637 written / 0 error / 3 warning**（仍是既有 3 条 E1107） |
| `node node_modules/typescript/bin/tsc -p .` | exit 0 | **exit 0** |
| OFF 30 target | 29 / 1(026) / 0 / 0 | **cases=30 ok=29 moved=0 diff=0 error=0 fallback=1（026-if-regex-test）** |
| ON 30 target（`EnableBracketCreatePossible=true` preload） | 30 / 0 / 0 / 0 | **ok=30 moved=0 diff=0 error=0 fallback=0，pin-miss=1（026，T4 输入未改）** |
| 5 smoke `ts.json` SHA256 前 16 位 | 不变 | **5 份全 `BB07DA2201FC5087`**（`{"status":"ok","structural":[],"moved":[],"fields":[]}`） |
| BuildCount OFF | 与 `c7b67747` 一致 | **127，guardSkips=0** |
| BuildCount ON | 同上 | **126，guardSkips=0** |

探针：`tmp/target-cases.mjs` / `tmp/target-on.mjs` / `tmp/build-count-probe.mjs` /
`tmp/build-count-on.mjs`（从主仓 `tmp/` 取同一批，未改），smoke 走
`typescript/cases/tts/tools/tshape-judge.mjs ts`（输出在 `tmp/t7f-smoke/<case>/ts.json`）。

## 4. 为什么四线都进不了 `BuildByIndex`（三条阻塞，按硬度排序）

### 4.1 阻塞一：创建拍根本没有「候选」被问到（`(` / `[`）

`Bracket.Transit`（`core/syntax/basic-tokens/bracket.xl.md:291-308`）在创建拍只做两次 compute：

1. `mounted.ComputePossibleShapes(BracketCreate)` —— **仅当 `mounted.CatalogGuide !== null`**。
   而四线要装的**正是**这只括号的 `CatalogGuide`，安装前它是 `null`：这一步必然被跳过；
   即便跳过安装先问，此刻 `Data` 为空，`tokenIndex = Data.length - 1 = -1` ⇒ `Data[-1]` 为
   `undefined`，`CatalogGuide` 直接返回 `Nothing`（同文件 `:295-296` 的注释已写明这一点）。
2. 父宿主窄域 —— **仅当 `value === "{"` 且父是 `Bracket` 且 `EndPossible !== null`**。

⇒ `(`（ControlHead / ParameterList / CallArgs / ParenExpression）与 `[`（ArrayLiteral）在创建拍
**没有任何 `PossibleShape` 会被调用**。`PossibleSource.BracketCreate` 在这些格上送不到任何候选的
`ComputeByIndex`，自然也到不了 `BuildByIndex`。唯一能在这两格执行代码的 seamp 是
`BracketRoleHook.Current.OnBracketCreated`（静态），或宿主实例的 `OnBracketCreatedEvent`
——它们都不是 `PossibleShape`。

### 4.2 阻塞二：`BuildCount` 在创建拍是 0，安装进 `BuildByIndex` 必然 `+N`

`CatalogGuide.ComputePossibleShapesByIndex` 每成功一次 `BuildByIndex` 就 `BuildCount += 1`
（`core/syntax/catalog-guide.xl.md:157 / 180`）。基线在创建拍**没有任何构建**（否则 BuildCount
早就不等于 127/126）。把安装搬进 `BuildByIndex` 意味着每装一次多一次构建：ON 档实测安装数为
`ControlHead 21 + ObjectLiteral 1 + ArrayLiteral 1`（T7c §5.4），同批 30 case 的 BuildCount 会
从 127/126 涨到约 150/149。**验收要求 BuildCount 逐 case 与基线一致，与这条搬法直接冲突。**
没有「顺带发生的构建」可以把安装折进去——创建拍不是任何既有构建的宿主。

### 4.3 阻塞三：把候选挂进宿主 catalog 会破坏「恰好一个候选」不变量

`CatalogGuide` 只在**只剩一个**候选时构建（`:167-181`），且
`EndPossible` 接受时若 `Candidates.size > 0` 直接抛错（`:146-152`）。而四线的宿主分为两类：

- **`CatalogGuide === null`**：成员外壳（`MemberShellCatalog.Create` 不给壳挂向导）、
  `StatementShape` 等；
- **`new CatalogGuide([], End)`**：`ClassDeclarationShape` / `InterfaceDeclarationShape` /
  `FunctionDeclarationShape` 壳 / 各类 `StatementShape` 壳（`[]` + 终结候选，见
  `class-declaration-shape.xl.md:113`、`function-declaration-possible-shape.xl.md:483`、
  `control-flow-statement-possible-shape.xl.md:257` 等）。

对第二类「补注册」一个安装候选，会让终结候选接受时 `Candidates.size > 0` 当场抛错；
唯一绕法是让该候选对 `source !== BracketCreate` 一律 `Reject` —— 但 `Reject` 会把它从
`Candidates` 里摘掉，而 `Reset()` 只在构建之后才重新填满，于是「下一次括号创建」可能拿不到它。
这是**可靠性**问题，不是风格问题。

## 5. 删除静态分派的验收 grep

| 模式 | 位置 |
|---|---|
| `InstallAtBracketCreated` | `function-declaration-shape.xl.md:199`（`OpenParameterList` 内，实例链）、`control-head-possible-shape.xl.md:361`（定义）、`expression-bracket-possible-shape.xl.md:329`（定义）、`parameter-list-possible-shape.xl.md:986`（定义）、`bracket-role-catalog-hook.xl.md`（三条线的分派调用） |
| `BracketRoleCatalogHook.OnBracketCreated` 中的 `MemberShellCatalog` | **0**（已删） |
| `MemberShellCatalog.InstallAtBracketCreated` | **0**（方法与调用点都已删） |

**未达成的验收项**：`InstallAtBracketCreated` **仍由** `BracketRoleCatalogHook` 静态分派（三条线）。
按任务书 §5 的逃生舱如实登记，不粉饰。

## 6. 要继续做，需要先裁决的两件事

1. **放宽 `Transit` 的父宿主域**：把 `value === "{"` 扩到 `(` / `[`（仍需 `EndPossible !== null` 兜底）。
   这正是本任务第 4 条禁止改的那段；没有它，§4.1 无解。
2. **`BuildCount` 语义**：要么接受 BuildCount 因安装而上升（改验收口径），要么给安装一条**不计数**
   的入口（例如宿主实例直接调 `PossibleShape.BuildByIndex`，但那与「形状确认」的本意已经不同）。

## 7. 交付

- 提交在 `feature/all-possible-1027-t7f`（不 push、不合并、不删目录）。
- 行为中性证明：§3 六项读数全绿且与 `c7b67747` 一致。
