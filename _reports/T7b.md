# T7b — 创建拍 / 关闭拍的来源直归 `IComputePossibleShapes`

- 集成分支：`feature/all-possible-1027` @ `aeaedd28`（T7a 报告基于 `1e35bfd7`；本分支 tip 已含 T5b2 合并）
- 工作分支：`feature/all-possible-1027-t7b`；工作副本 `xl-example-set/all-possible-1027-t7b`
- 行号均指 `*.xl.md`（唯一事实源），用 UTF-8 行号（PowerShell `Get-Content` 在 GBK 码页下会并/错行，勿用）
- 范围：`core/syntax/basic-tokens/bracket.xl.md`、`typescript/tokens/statements/bracket-role-catalog-hook.xl.md`
- 未跑 gates / wide-ast / tts / ts-all；未 push；未合并；目录保留

## 1. 改动（2 文件，+46 / −89）

| 文件 | 改动 |
|---|---|
| `core/syntax/basic-tokens/bracket.xl.md` | ① `Transit` 末尾新增 `[T7b:CREATE]`：直调 `mounted.ComputePossibleShapes(ctx, BracketCreate)`（新括号自己）与父宿主 `ComputePossibleShapes(ctx, BracketCreate)`（窄域）；② `OnBracketCreatedEvent` 删掉旧窄触发（`[T2b:CREATE]` 整段，创建拍传 `Close` 的那条）；③ `BracketRoleHook` 接口删 `HandlesBracketCreatePossible`（它唯一的消费者就是被删的旧窄触发） |
| `typescript/tokens/statements/bracket-role-catalog-hook.xl.md` | 删 `TriggerBracketCreatePossible`（整方法，触发职责**搬走不复制**）、删 `HandlesBracketCreatePossible`、`OnBracketCreated` 只留 `Resolve → Install / Register`、去掉因此不再使用的 `IComputePossibleShapes` / `PossibleSource` import |

未改：`Bracket.Close`（两条 `Close` 来源原样，行 230 / 240）、安装/建树逻辑、候选 `BuildByIndex`、
`bracket-role-resolver` / `bracket-catalog-installer` / `EnsureInstalled` 语义、`statement-route-util`。

## 2. 改后的触发顺序（创建拍）

```
Bracket.Transit:
  unit.Add(mounted) → mounted.Use(value).SignIn(index)
  → 宿主 OnBracketCreatedEvent                 ← 只剩族收尾（ChildBracketCreatedHook 转调），不再重算候选
  → 非括号宿主补一次 ChildBracketCreatedHook
  → BracketRoleHook.Current.OnBracketCreated   ← 只剩 Resolve / Install / Register（Install 待 T7c 搬）
  → [T7b] mounted.CatalogGuide !== null        ⇒ mounted.ComputePossibleShapes(ctx, BracketCreate)   // 新括号自己
  → [T7b] value === "{" && 宿主是括号 && 宿主 guide.EndPossible !== null
                                               ⇒ host.ComputePossibleShapes(ctx, BracketCreate)      // 父宿主窄域
```

顺序必须是「族收尾 → 角色 Install → 直调」：自举约束要求新括号自己的 `CatalogGuide` 先非空，它的候选才有机会被问。
关闭拍不变：`Close` 里 `FlushOnClose` 补判自身最后一格（230）+ 问父单元（240），两条都传 `PossibleSource.Close`。

## 3. 旧触发的处理（来源错配 → 彻底删除，不是并存）

- `Bracket.OnBracketCreatedEvent` 的 `[T2b:CREATE]` 旧窄触发**整段删除**：创建拍不再有任何 `PossibleSource.Close`。
- `BracketRoleCatalogHook.TriggerBracketCreatePossible` **整个方法删除**（触发搬到 `Transit`，不是复制）⇒ 同一格不会双触发；
  实测 `CatalogGuide.RepeatedCellSkipCount = 0`（OFF / ON 都是 0，见 §4.4）。
- `BracketRoleHook.HandlesBracketCreatePossible`（core 抽象 + ts 实现）随之删除：它只服务于「让位」，让位对象没了就是死代码。
- **`EnableBracketCreatePossible` 不再能门控触发**：core 拿不到 typescript 静态开关，而任务禁止新增 hook / 静态槽，
  所以两次 `BracketCreate` 判定改为无条件执行。默认关时角色目录没装、`CatalogGuide` 全为 `null`，两次判定自然落空
  ⇒ 默认态逐字节不变（§4.3 / §4.4 有读数）。语义后果见 §5。

## 4. 读数

### 4.1 构建

| 项 | 读数 |
|---|---|
| `xl_build(cwd=<clone>, paths=["core","typescript"], targets=["ts"])` | **2 written / 635 skipped / 0 error / 3 warning**（仍是既有 3 条 E1107） |
| `node node_modules/typescript/bin/tsc -p .` | **exit 0** |

### 4.2 30 条 target（`tmp/target-cases.mjs` / `tmp/target-on.mjs`）

| 开关 | cases | ok | fallback | diff | error | pin-miss |
|---|---|---|---|---|---|---|
| OFF（默认） | 30 | **29** | **1（026）** | **0** | **0** | 0 |
| ON（T3 preload 同域） | 30 | **30** | **0** | **0** | **0** | 1（026 的 `xl:expect fallback`，T4 输入文件未改） |

与改前逐条一致（同一探针、同一机器、同一 build 流程）。

### 4.3 5 个 smoke（`tshape-judge ts` → `ts.json`，SHA256 前 16 位）

| case | SHA16 | T1/T3 基线 |
|---|---|---|
| `if (a) {}` | `BB07DA2201FC5087` | 同 |
| `const a = x + y` | `BB07DA2201FC5087` | 同 |
| `f(a)` | `BB07DA2201FC5087` | 同 |
| `class A {}` | `BB07DA2201FC5087` | 同 |
| `const o = { a: 1 }` | `BB07DA2201FC5087` | 同 |

5 条 `ts.json` 都是 `{"status":"ok","structural":[],"moved":[],"fields":[]}`，改前 / 改后同值。

### 4.4 BuildCount（`tmp/build-count-probe.mjs`：30 case 逐条 reset 后 Parse，读 `CatalogGuide.BuildCount`）

| 档 | 改前 | 改后 |
|---|---|---|
| OFF | `BuildCount=124 guardSkips=0` | **`BuildCount=124 guardSkips=0`** |
| ON | `BuildCount=123 guardSkips=0` | **`BuildCount=123 guardSkips=0`** |

逐 case `Compare-Object` **零差异**（OFF / ON 各自比）。026 是 `OFF=4 / ON=3`，改前也是 4 / 3 ——
差的那一次是控制头原子，由 T3 的 `ControlHeadPossibleShape.IsMemberName` 判据开关决定，**不是触发器**，
所以搬触发对它没有影响。`guardSkips=0` 说明没有留下同格双触发。

### 4.5 grep（创建拍没有 `Close`）

`PossibleSource.Close` 在 `bracket.xl.md` 只剩 3 处：行 230（`Close` 的 `FlushOnClose`）、行 240（`Close` 问父单元）、
行 307（文档描述旧错配）。`Transit` 段（360-377）里只有 `PossibleSource.BracketCreate`（行 370 / 375）。

## 5. 语义变化（登记，不掩盖）

1. `EnableBracketCreatePossible` 不再控制触发，只剩两个含义：`EnsureInstalled` 的装配条件之一 + 候选侧判据开关
   （`ControlHeadPossibleShape.IsMemberName`，T3 的 026 修法）。默认 OFF 的读数不变是**因为** `CatalogGuide` 为 `null` 时
   两次直调都落空，不是因为它被开关挡住。
2. `EnableBracketRoleCatalog=true & EnableBracketCreatePossible=false` 这一组合**现在也会触发** `BracketCreate`（改前不会）。
   该组合不在 OFF/ON 两个 gate 的覆盖范围内，本任务**未实测**；按 T7a §5.4 应由 T7c（接管 `Install` 后重定义两个开关）收口。
3. 三个探针计数 `BracketCreatePossibleCount / BracketCreateSelfCount / BracketCreateParentCount` 已无递增点（恒 0）；
   声明留在 `statement-route-util.xl.md`（不在 T7b own 的文件集里），删/搬留给 T7c/T7e。

## 6. 留给后续 wave

- **T7c**：把 role hook 的 `Resolve → Install / Register` 搬进候选 `BuildByIndex`；`BracketRoleCatalogHook` 只剩 `EnsureInstalled`。
- **T7d**：`OnBracketCreatedEvent` 的 `ChildBracketCreatedHook` 转调 + 三个 Mount 函数。
- **T7e**：`BracketCloseHook`（`Close` 里的死调用）、`BracketClosedHook` + `ContainerShapeCloseHook`、三个计数；
  旧窄触发与 `HandlesBracketCreatePossible` 本任务已删，T7e 不必再找。

## 7. 验收对照

| 项 | 要求 | 实测 |
|---|---|---|
| `xl_build` | 0 error | 0 error（2 written / 3 既有 warning） |
| `tsc -p .` | exit 0 | exit 0 |
| OFF 30 target | 29/1(026)/0/0 | 29/1(026)/0/0，pin-miss 0 |
| ON 30 target | 30/0/0/0 | 30/0/0/0 |
| 5 smoke `ts.json` SHA16 | 不变 | 全 `BB07DA2201FC5087` |
| BuildCount 不增加 | 不增 | 124/123 逐 case 零差异，guardSkips 0 |
| 创建拍无 `PossibleSource.Close` | 无 | `Transit` 只有 `BracketCreate`；`Close` 两来源原样 |
| 不改安装/建树、候选 `BuildByIndex`、resolver/installer | 不改 | 未改 |
| 不 push | — | 未 push |
