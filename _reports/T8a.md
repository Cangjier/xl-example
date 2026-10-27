# T8a — 翻开关：`EnableBracketCreatePossible` 默认 `true`，026 在默认路径不再 fallback

- 集成分支：`feature/all-possible-1027` @ `2d561d63`（= `3da90caf` + 3 个 docs 提交；T7f 之后）
- 工作分支：`feature/all-possible-1027-t8a`；工作副本 `xl-example-set/all-possible-1027-t8a`
- 行号均指 `*.xl.md`（唯一事实源）；未跑 gates / wide-ast / tts；未 push；未合并；目录保留
- 结论：**默认路径 30/30 ok、fallback=0**；026 单文件 `tshape-judge ts` 默认路径 `status=ok`、exit 0

## 1. 改了什么（3 文件，+22 / −21；实际语义 1 行）

| 文件 | 行 | 改动 |
|---|---|---|
| `typescript/tokens/statements/statement-route-util.xl.md` | 1146 | 字段默认值 `bool = false` → **`bool = true`**（语义改动就是这 1 行） |
| 同上 | 1148–1174 | 该字段的文档重写：T2/T7b 的历史、翻转后剩下的两处含义、翻/关两档读数 |
| `typescript/tokens/statements/control-head-possible-shape.xl.md` | 310–314 | 让位说明改为「默认路径的判据」；代码行 323 **一字未动**（仍读该开关） |
| `typescript/tokens/statements/bracket-role-catalog-hook.xl.md` | 46–48 | 「默认关时」→「关掉时」，补「T8a 起默认 `true`」 |

**为什么是翻默认值、而不是删门控**：任务给的两条路（翻默认 / 移除门控）在本仓库等价，
但翻默认值 ① 是 T2/T3 文档里预留的 G1 动作（`G1 决定是否把开关翻 true`），② 不动判据代码本身，
③ 与 B4b 把 `EnableExprBracketCatalog` 默认翻 `true` 是同一先例。默认路径下该开关**只剩一处行为**：

- `Bracket.Transit` 的 `BracketCreate` 触发自 T7b 起已**无条件直调**，不读该开关（`BracketRoleCatalogHook:46`）；
- `EnsureInstalled` 会因它装一次 `BracketRoleCatalogHook`，但 `OnBracketCreated` 第一句就是
  `if (!EnableBracketRoleCatalog) return;`，而增量路径的 `EnableBracketRoleCatalog` 本来就由
  `EnableExprBracketCatalog` / `EnableControlHeadCatalog`（两者默认 `true`）在 `SourceFileShape` 构造器里置真；
  非增量路径（`tshape-judge ts` 的 `compareWithTs`）里装上也只是每只括号多一次立即返回的分派；
- 于是默认读数的唯一变化 = `ControlHeadPossibleShape.AtomKind` 的 `IsMemberName` 让位生效：
  026 的 `test` 不再被提前建成 `IdentifierShape`，legacy `ParseName` 在 `.` 之后读得到 `Common`。

**否决的替代方案**：删掉 `AtomKind` 里的 `&& EnableBracketCreatePossible` 条件（改成无条件）。
效果相同，但会让字段变成「既不控触发、也不控判据」的死开关，还要改同一处文档与
`bracket-role-catalog-hook` 的「两处含义」表；翻默认值保留开关（仍可关档复现 026 的 29/1 基线），更小。

未新增 guide / observer / 静态 hook；未碰 `ContainerCloseGuide`；未删 `StatementShape`；未改 026 的 `xl:expect`。

## 2. 读数（全部默认路径，未加 preload）

| 项 | 要求 | 实测 |
|---|---|---|
| `xl_build(core,typescript → ts)` | 0 error | **3 written / 634 skipped / 0 error / 3 warning**（仍是既有 3 条 E1107） |
| `node node_modules/typescript/bin/tsc -p .` | exit 0 | **exit 0** |
| 运行期字段读数 | `true` | `EnableBracketCreatePossible = true` |
| 30 target（`node tmp/target-cases.mjs`） | 30/30 ok，fallback=0，diff=0，error=0 | **cases=30 ok=30 moved=0 diff=0 error=0 fallback=0 | LastFileFallback=0 | pin-miss=1** |
| 026 单文件 `tshape-judge ts` | status=ok, exit 0 | `{"status":"ok","structural":[],"moved":[],"fields":[]}`，**exit 0** |
| 5 smoke `ts.json` SHA256 前 16 位 | 不变 | **5 份全 `BB07DA2201FC5087`**（body 均 `{"status":"ok","structural":[],"moved":[],"fields":[]}`，exit 0） |

- `pin-miss=1` 是预期：026 的 `// xl:expect fallback` 按要求**未改**，仍钉旧读数；以 `fallback=0` 为准。
- 5 个 smoke 输入：`if (a) {}` / `const a = x + y` / `f(a)` / `class A {}` / `const o = { a: 1 }`。
- 变更前基线（同一 clone 现场构建）复现了任务给的读数：`ok=29 / fallback=1(026) / diff=0 / error=0`；
  026 `tshape-judge ts` 变更前为 `incremental-error`（step 101）exit 1，与 T3 M-merge 记录一致。

## 3. 回归

**无。** 30 条 target 无 moved / diff / error（026 从 fallback 变 ok，其余 29 条逐字一致）；
5 个 smoke 的 `ts.json` 字节不变；`xl_build` 无新增 warning；`tsc` 0 error。
开关翻 `true` 后 `BracketRoleHook.Current` 在非增量路径也会被装上，但如上所述只是立即返回的分派，
smoke 与 target 的读数证明它没有产生形状。

## 4. 复现命令

```powershell
$id = "all-possible-1027-t8a"
Set-Location C:\Users\Admin\Documents\GitHub\xl-example-set\$id
# xl_build(cwd=$PWD, paths=["core","typescript"], targets=["ts"])
node node_modules/typescript/bin/tsc -p .
node tmp/target-cases.mjs
node typescript/cases/tts/tools/tshape-judge.mjs ts tests/cases/all-possible-1027/026-if-regex-test.ts --out tmp/t8a-026-default
```

探针：`tmp/target-cases.mjs`（未改）；smoke 输入写在 `tmp/smoke-cases/`，输出在 `tmp/t8a-smoke-default/`（`tmp/` 被 gitignore）。
