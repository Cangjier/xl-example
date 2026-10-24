# HANDOFF — impl-wp3-9（WP-3 第九波：用 WP-6 直接建造入口接 root）

STATUS: PARTIAL（C 已接到 root 的 4 个声明族 + `class<T>`；AST 从 6080 推到 **6097/6167**，仍未全绿；按降级路线把分支摘回绿态，6097 的实测态在**上一条提交** + `HANDOFF.wp3-9.patch`）
BRANCH: impl-wp3-9（tip = 摘回绿态；tip^ = 6097 实测态）
BASE: **impl-wp6 @ 79b7ff3e 与 impl-wp3-8 @ 5ac8ed27 两条线合并**（原因见下，Lead 必读）

## 0. 起点必须调整（Lead 必读）

`impl-wp6 @ 79b7ff3e` 是从 `refactor-integration @ aeb2cbd7` 起的，**不含 WP-3 的任何文件**：
`typescript/tokens/items/root-item-rule.xl.md` / `source-file-tail-builder.xl.md` 在 impl-wp6 里**根本不存在**。
所以 `new-member -From impl-wp6` 拿不到 C 接线点，`git apply impl-wp3-8\HANDOFF.wp3-8.patch` 也直接失败
（`No such file or directory` + `source-file-shape.xl.md: patch does not apply`）。

本波实际起点（两步，均已在分支历史里）：

```powershell
cd C:\Users\Admin\Documents\GitHub\xl-example-set
.\tools\new-member.ps1 -Name impl-wp3-9 -From impl-wp6 -Base impl-wp6
cd impl-wp3-9
git fetch ..\impl-wp3-8 "+refs/heads/*:refs/remotes/impl-wp3-8/*"
git reset --hard impl-wp3-8/impl-wp3-8          # 5ac8ed27 = 绿（6167）
git apply ..\impl-wp3-8\HANDOFF.wp3-8.patch     # 回到 6080 实测态（patch 只在 wp3-8 树上成立）
git commit -am "restore wp3-8 C wiring (6080 state)"
git fetch ..\impl-wp6 "+refs/heads/*:refs/remotes/impl-wp6/*"
git merge --no-ff impl-wp6/impl-wp6             # 只带新增文件，不改 wp3-8 已改的文件
```

合并冲突 **1 处**：`tests/body-drive/batch-split.mjs` 的族表（wp3-8 的 `root` 族 vs wp6 的 `module` 族）。
已在合并里两边都保留；但合并后跑 `batch-split --family root` 仍报「没有这个族（有：statement, module）」——
**root 族的入口没随分支带过来**，本波没时间定位（它不在任何门禁路径上，见「未完成项」）。

## 1. 做了什么（只改 `typescript/tokens/items/root-item-rule.xl.md`）

把 root 的**声明建造**从「一律 `FromUnits`」切成「**WP-6 直接建造入口优先，建不出再退回旧入口**」，
每个分支都是「只增不减」的保守切换（直接入口返回 `null` 时仍走 6080 已验证的旧路径）：

| kind | 族 | 本波口径 |
|---|---|---|
| 1 | import | `import defer …`（`Data[start+1]` 是 `defer`）→ `ImportDeclarationShape.BuildDirect(host, start, end+1, ctx)`；其余 import 仍 `FromUnits` |
| 3 | class | `KindOf` 里 `class` **紧跟 `<`** → 判 ClassExpression 语句（kind 9），不再当 ClassDeclaration |
| 7 | module | 段内**没有 `Bracket`**（无体 ambient `declare module "m"`）→ `ModuleDeclarationShape.BuildDirect`；带体仍走 `SourceFileTailBuilder.BuildModuleItem` |
| 10 | export assignment | `ExportAssignmentShape.BuildDirect` 优先（ASI 按表达式末尾收口），退回旧 `FromUnits(…, hasSemi)` |
| 11 | import equals | `ImportEqualsDeclarationShape.BuildDirect` 优先（`;` 可缺），退回旧 `FromUnits` |

- 直接入口统一用**半开区间** `stop = end + 1`（`DeclarationSpan.Slice(host,start,end)` 的 `[start,end)` 口径）。
- `BuildByKind` 顶部加了注释说明「直接入口 → 旧入口」的退回关系；`end` 的宿主下标口径一个字没动。
- **未改 `declarations/**`**（0 个文件）：四个直接入口都返回 `null` 时退回旧路径，不需要动声明族。
- **未切换**（有意）：kind 2 export 子句（`ExportDeclarationShape.BuildDirect`）与 `export as namespace`
  （`NamespaceExportDeclarationShape.BuildDirect`）。理由：这两类**不在** wp3-8 剩余 diff 的类别里，
  而 WP-6 的直接入口在本仓**没有任何调用者**（wp6 HANDOFF 原话：「`BuildDirect` 无调用者，不进解析路径」），
  本轮只剩一次构建机会，不做无收益的替换。接任者有余量时应补上（一行一个）。

## 2. 读数（同一台机器、同一判据，`ast-json-diff` 全量）

| 状态 | 完全一致 | 结构差 | 位置差 | 字段差 | cj-fail |
|---|---|---|---|---|---|
| 6080（wp3-8 patch） | 6080 / 6167 | 76 | 37 | 11 | 19 |
| **6097（本波接入后）** | **6097 / 6167** | **64** | **33** | **0** | **17** |
| 目标 | 6167 | 0 | 0 | 0 | 0 |

其它读数（6097 态实测）：

| 项 | 命令 | 结果 | 判定 |
|---|---|---|---|
| xl_build | `xl_build(core,typescript→dist)` | 875 written / **0 error** / 2414 warning | 绿 |
| tsc | `node .\node_modules\typescript\bin\tsc -p tsconfig.json` | **exit 0** | 绿 |
| real-dts | `node .\typescript\cases\real-dts-ast.mjs` | **226/226**、崩溃 0、差异 0 | 绿 |
| buffer | `gates -Tier full -BaseBuild ..\baseline-build\build` 内 | xml **PASS 4476 / FAIL 24 / ERROR 53 / 同错 3** | 红（与 64/33 的结构差一致，预期） |
| class-scaling --base | 同上 | FAIL 1 项（T=2000 有 XML 差异） | 红（同上） |
| gates full | 同上 | **RESULT: FAIL（2 项必过门禁失败）** | 红（预期） |
| batch-split | `--family root` | 该族在合并后的脚本里不存在（只有 statement / module） | 未跑 |

**结论：WP-6 的直接入口只吃掉约四成目标用例。** wp3-8 分类里可被直接入口覆盖的
（1 import defer ≈12、3 export/= ASI ≈10、4 import-equals ASI ≈8、5 declare module End ≈8、8 class<T> 2，
合计约 40 条）实测只让 **17 条**转为完全一致（字段差 11 → 0，说明崩掉的那批变成了「结构接近」）。

## 3. 剩余 diff 的定位（6167 − 6097 = 70 条）

| # | 类别 | 约计 | 仍未过的原因 | 应改哪里（不在本波写范围） |
|---|---|---|---|---|
| 2 | `export const/let/var … ⏎ (b);` 的 ASI | 12 | item 的**收口点**在声明建造之前就定了（`Analyze` 走到 `(` 前收口），`StatementBuilder` 又把 `(` 续成调用 | `statements/statement-scanner.xl.md` 的 `EndsAtLineBreak` / `StatementBuilder` 的 ASI |
| 6 | `@dec` ⏎ `const x = 1;` | 5 | `KindOf` 已按 `StatementScanner.DecoratedHeadKeyword` 分派到语句，但根上 `FromUnits` 没有装饰器前导 | `statements/statement-builder.xl.md`（`BuildDecoratedStatement`） |
| 7 | 修饰词跨行（`async` ⏎ `function`、`declare` ⏎ `enum`） | 5 | 已 `ShouldDeferToTail` 让给尾巴，尾巴在多语句组合上仍崩 | `items/source-file-tail-builder.xl.md` 的 `BuildTrailingDeclaration` 分界 |
| 1/3/4/5 的残余 | 直接入口没接住的那部分 | ≈23 | 见下 | 直接入口或收口口径 |
| 9 | 注释后孤立 `;` | 2 | `FinishBody` 的 `;` 归并要求 `previous.EndIndex === semi.StartIndex`（中间有注释就不并） | `files/source-file-shape.xl.md`（要按声明族放宽，别按语句放宽） |
| 10 | 杂项（BOM / 无空格两连声明 / `extends {…}`） | 3 | 各自文件 | — |

直接入口残余的三个具体嫌疑（接任者优先查，都有现成样本）：

1. **`import defer` 之外的 import ASI**：本波只把 `defer` 那一支交给 `BuildDirect`；`import a from "m"`（无 `;`）仍走 `FromUnits`。
2. **`export =` / `default` 的 ASI**：`BuildDirect` 只有在 `Analyze` 真的把整段交给它时才生效；`Analyze` 的两次试建
   （①不含这一格 → ②含这一格）在 `(b);` / `[b];` 上仍可能先用①收口，导致 `BuildDirect` 拿到的 `end` 已经不含续接括号。
   → 值得先打一次桩确认 `BuildByKind(10, …)` 拿到的 `[start,end)` 是不是完整表达式。
3. **无体 `declare module`**：`hasBody` 判据用「段内有没有 `Bracket`」，但 `declare module "m"` 后面紧跟的
   `class C {}` 的括号若被 `end` 包含进来就会误判为「有体」→ 退回旧入口（于是 End 仍差 1）。

## 4. 下一步的精确命令

```powershell
cd C:\Users\Admin\Documents\GitHub\xl-example-set
.\tools\new-member.ps1 -Name impl-wp3-10 -From impl-wp3-9 -Base impl-wp3-9
cd impl-wp3-10
# 1) 拿回 6097 实测态（tip 是绿态）：
git checkout HEAD^ -- typescript
git status --short            # 应是 3 个文件：root-item-rule / source-file-tail-builder / source-file-shape
#    等价做法：git apply HANDOFF.wp3-9.patch（在 wp3-8 绿树 + merge wp6 之上）
# 2) xl_build(cwd=<clone>, paths=["core","typescript"], targets=["ts"], out="dist")
# 3) node .\node_modules\typescript\bin\tsc -p tsconfig.json
# 4) node .\typescript\cases\ast-json.mjs ; node .\typescript\cases\ast-json-diff.mjs ; git checkout -- typescript\cases
# 5) 先查上面「直接入口残余」的三条，再按类别 2 → 6 → 7 推
```

## 5. 踩过的坑（省下一轮）

1. **`-From impl-wp6` 不能直接接 C**（见 §0）：wp6 与 wp3 是两条互不包含的线，必须先 reset 到 wp3-8 再 merge wp6。
2. 合并冲突 `batch-split.mjs` 用「保留两边」解，但 `root` 族的**入口**没保住（报「没有这个族」）。不影响 AST/门禁。
3. `git apply` 那个 patch 必须应用在 `impl-wp3-8` 的树上；在 wp6 树上会 `patch does not apply`。
4. `ast-json.mjs` 会重写 `typescript/cases/*.cj-json`：每次跑完 `git checkout -- typescript/cases`。
5. Windows PowerShell 5.1 里 `[IO.File]::ReadAllLines('相对路径')` 用的是**进程**当前目录（= 工作区根），
   不是 `Set-Location` 之后的目录 → 一律写绝对路径。
6. 本波只在第 7 轮做了一次 `xl_build`，第 8 轮一次性跑完 tsc/AST/real-dts/gates；**没有第二次构建**，
   所以 6097 之后没有逐类重测，§3 的「约计」是 wp3-8 的分类数，不是 6097 态的重测。

## 6. 门禁读数（tip = 摘回绿态）

tip 的源码与 `impl-wp3-8 @ 5ac8ed27` 的三个文件逐字节一致（另加 wp6 的新增文件），
两者各自实测全绿（6167 / 226 / full PASS），但**合并后的绿态没有重新构建测量**（轮次用尽）；
`dist/` 与 `build/` 里现在留的是 6097 态产物，接任者第一步必须重建。
