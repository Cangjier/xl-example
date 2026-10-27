# T2b · 移除静态 `BracketCreate` 辅助工具，触发改到既有实例路径

- 集成分支：`feature/all-possible-1027`（当前 HEAD `08a87d15`，已含 T2 / T5a1）
- 工作分支：`feature/all-possible-1027-t2b`
- 工作副本：`xl-example-set/all-possible-1027-t2b`
- 口径：**A 案**——触发放进已在 `Bracket.Transit` 里被调用的 `BracketRoleCatalogHook.OnBracketCreated`，
  角色目录 `Install` / `Register` 之后执行；不新建静态 `Current` / 静态 `EnsureInstalled` / 注册表。
- 未跑 gates；未 push；未合并；未删工作副本。

## 1. 删除清单

| 位置 | 删除内容 |
|---|---|
| `typescript/tokens/statements/bracket-create-possible-hook.xl.md` | **整个文件**（T2 的 `BracketCreatePossible*` 实现类 + 静态 `Installed` + 静态 `EnsureInstalled` + 静态槽 `Current` + `OnBracketCreatedPossible`） |
| `core/syntax/basic-tokens/bracket.xl.md` | T2 的 `BracketCreatePossible*` 接口类（抽象方法 + 静态 `Current`）；`Transit` 末尾对它的调用块 |
| `typescript/tokens/files/source-file-shape.xl.md` | 对已删文件的 import；`BracketCreatePossible*` 的 `EnsureInstalled` 调用行 |
| `Bracket.OnBracketCreatedEvent` | 旧窄触发不再用已删的静态槽判断，改问实例方法 `BracketRoleHook.HandlesBracketCreatePossible()` |

没有新增任何静态 `Current` / 静态 `EnsureInstalled` / 静态注册表。

## 2. 触发新位置

```
Bracket.Transit
  → unit.Add(mounted) → mounted.Use(value).SignIn(index)
  → 宿主 OnBracketCreatedEvent（族收尾）
       └─ 旧窄触发：BracketRoleHook.Current === null || !HandlesBracketCreatePossible()
                     时才按 Close 补判（开关关时逐字节保持原行为）
  → ChildBracketCreatedHook（宿主不是括号时）
  → BracketRoleHook.Current.OnBracketCreated(host, mounted, context)   ← 唯一实例路径
       ├─ EnableBracketRoleCatalog ? 角色 Resolve → Install / Register / Fallback
       └─ TriggerBracketCreatePossible(host, mounted, context)         ← 新增，在 Install 之后
            ├─ 新括号自己：CatalogGuide !== null 才问（BracketCreate）
            └─ 父宿主：`{` + Bracket 宿主 + CatalogGuide !== null + EndPossible !== null（BracketCreate）
```

- **开关独立性**：`BracketRoleCatalogHook.EnsureInstalled` 现在在
  `EnableBracketRoleCatalog || EnableBracketCreatePossible` 为真时装配；`OnBracketCreated` 里角色段只在
  `EnableBracketRoleCatalog` 为真时执行，`BracketCreate` 段只在 `EnableBracketCreatePossible` 为真时执行。
  于是任意一个开关单独打开都有效，两个都关时仍只有一次 `null` 比较。
- **不双触发**：开关打开且钩子已装时，`HandlesBracketCreatePossible()` 返回 `true`，core 旧窄触发让位；
  `Transit` 只调用一次 `OnBracketCreated`，其中只问一次父宿主。实测 `guardSkips=0`、BuildCount 与关闭时相同。
- **为什么用实例方法而不是新静态槽**：`BracketRoleHook.Current` 是既有实例入口；把「是否接管」作为它的实例方法
  回答，core 不需要反向依赖 typescript 的开关，也不新增进程级引用。

## 3. 保留项

- `PossibleSource` 仍是必填形参，无默认值；`Close` / `BracketCreate` 语义未动。
- `CatalogGuide` 双 build 守卫（`LastBuildTokenIndex` / `LastBuildDataLength`）未动。
- `StatementRouteUtil` 三个计数器（`BracketCreatePossibleCount` / `Self` / `Parent`）未动。
- `EnableBracketCreatePossible` 默认仍为 `false`。
- `statement-route-util.xl.md` 只改文档（旧类名不再出现），**无逻辑改动**；未碰 117 个候选与 T3 的 statement 实现。

## 4. 读数

### 4.1 构建

| 项 | 读数 |
|---|---|
| `xl_build(cwd=<clone>, paths=["core","typescript"], targets=["ts"])` | **637 written / 0 skipped / 0 error / 3 warning**（少 1 个文件 = 被删的 hook；warning 仍是既有 3 条 E1107） |
| `node node_modules/typescript/bin/tsc -p .` | **exit 0** |

### 4.2 30 条 target

| 开关 | cases | ok | fallback | diff | error | pin-miss |
|---|---|---|---|---|---|---|
| 关（默认） | 30 | **29** | **1（026-if-regex-test）** | **0** | **0** | 0 |
| 开 | 30 | **29** | **1（026）** | **0** | **0** | 0 |

计数（同一探针，进程退出时读静态字段）：

| 开关 | builds | bridge | self | parent | guardSkips | hook |
|---|---|---|---|---|---|---|
| 关 | **250** | 0 | 0 | 0 | 0 | `BracketRoleCatalogHook` |
| 开 | **250** | 147 | 112 | 2 | **0** | `BracketRoleCatalogHook` |

与 T2 报告 §5.4 的 `bridge=147 self=112 parent=2 builds=250 guardSkips=0` 逐项相同：
**开关打开没有多建任何形状，同格仍只建一次**；`guardSkips=0` 说明旧窄触发确实让位、没有双触发。

### 4.3 5 个 smoke（`tshape-judge ts` → `ts.json`）

| case | 关 | 开 | T1 基线 |
|---|---|---|---|
| `if (a) {}` | `BB07DA2201FC5087` | 同 | `BB07DA2201FC5087` |
| `const a = x + y` | 同 | 同 | 同 |
| `f(a)` | 同 | 同 | 同 |
| `class A {}` | 同 | 同 | 同 |
| `const o = { a: 1 }` | 同 | 同 | 同 |

5 条内容均为 `{"status":"ok","structural":[],"moved":[],"fields":[]}`，SHA256 前 16 位全部等于 T1 基线。

### 4.4 grep 证据

| 检查 | 结果 |
|---|---|
| 旧静态辅助工具类名（`BracketCreatePossible*`），范围 `core/` + `typescript/` | **0** |
| 同上，范围 `dist/` + `build/`（生成物） | **0** |
| 已删文件名 `bracket-create-possible-hook`，范围 `dist/` + `build/` | **0**（无残留） |
| `EnsureInstalled`，范围 `core/` + `typescript/` | 11 处，**全部是既有 B0/B4e 装配点**（`BracketRoleCatalogHook.EnsureInstalled` / `ContainerShapeCatalog.EnsureInstalled` 及其文档）；T2 新增的静态装配点已随文件删除，**没有新增** |

历史报告 `_reports/T2.md` / `M-T2-merge.md` 仍按原样记录旧类名（历史记录不改）；源码树与生成物为 0。

## 5. 遗留 / 交接

1. T2 的静态辅助工具已清零；后续若还要加触发源，只能加在 `BracketRoleCatalogHook` 的实例路径或
   `IComputePossibleShapes` 的实例方法上（B 案），**不要再引入静态 `Current` / `EnsureInstalled`**。
2. 触发范围仍是旧窄触发的域（`{` + 括号宿主 + `EndPossible !== null`）；放宽到 `(` / `[` / 非括号宿主
   仍是 T3/T5 候选按来源收紧之后的事。
3. `statement-route-util.xl.md` 只改了文档；与 T3 的 statement 实现没有代码冲突面。
4. 未跑 gates、wide-ast、tts、ts-all；未 push。
