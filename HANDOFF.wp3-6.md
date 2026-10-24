# HANDOFF — impl-wp3-6（WP-3 第六波：B 修好并提交；C 接线仍未通，已第二次摘回）

STATUS: PARTIAL（B 两处缺陷已修 + 提交 + 全绿；C 接线补丁完善后仍 AST 红，按降级路线摘回）
BRANCH: impl-wp3-6 @ dcf56751（工作树干净）
BASE: impl-wp3-5 @ 85962d0a

## 做了什么

1. 从 `impl-wp3-5` 建 clone；基线复核（B 改前）：
   `xl_build(core,typescript)` = 885 written / 0 error / 2429 warning；`tsc` exit 0；
   `ast-json` 6167/6167、`ast-json-diff` 6167/6167 结构 0 / 位置 0 / 字段 0；`gates.ps1 -Tier quick` PASS。
2. **修 B（两处，`typescript/tokens/items/root-item-rule.xl.md`）并提交（`dcf56751`）**：
   - `Analyze`：`while` 循环走完后新增 EOF 无条件收口——
     `if (state.AtEof) { Complete = true; End = CodeAt[code.length-1]; Winner = -1; }`
     （`Alive.size===1` 那条 `IsBuildable` 恒 false 的死路因此有出口：收口 → `Build` 返回 `null`
     → 引擎记 raw 回退 → 容器 `FinishBody` 用 `BuildTrailingItems` 兜底。）
   - `SourceFileBodyItemHost.CloseBatch`：删掉 `Flush` 之后的 `this.Fallback.Reset()`
     （容器还没来得及读就把 raw 区间擦掉）。
3. **只改 B 时复测（Adapter 仍 null）全绿**：
   AST 6167/6167（0/0/0）、real-dts 226/226、`batch-split.mjs --family root` PASS（9 段 / 126 断言 / 0 失败）。
   → 提交 `dcf56751`。
4. **接 C（`typescript/tokens/files/source-file-shape.xl.md`，逐字照 wp3-5 HANDOFF 的可复用补丁）**：
   `import SourceFileBodyItemHost`（删 `CatalogGuide`）、`field AdapterRoot`、构造器
   `new SourceFileBodyItemHost(this, SourceFileBodyItemHost.CreateRules(CreatePossibleShapes()))` +
   `this.BatchAdapter = this.AdapterRoot`、`private method FinishBody`（FlushBatch → RawRange →
   `to = raw.To - 1`（排他）→ `BuildTrailingItems` → `Data.splice` → `raw.Reset()` → `Last().TryToClose`
   → 未签出则 `SignOut` → `this.TryToClose`）、`Process` 的 EOF 分支改调 `this.FinishBody(context)`。
   `xl_build` 0 error、`tsc` exit 0，但 **AST 立刻红**：
   6167 条里**只有 925 条一致**，结构差 **4740**、位置差 **1881**、字段差 0，且 `ast-json` 报 **72 条 cj-fail**。
5. **修 C 的第 1 次（也是唯一允许的一次）尝试**：把 `CloseBatch` 的 `Fallback.Reset()` 挪到 `Flush`
   **之前**（假设：口袋被第一批的 `!IsArmed()` 守卫钉在文件开头，`FinishBody` 只 tail-build 了一小段）。
   重建后 **读数与上一轮逐位相同**（925 / 4740 / 1881 / 72）→ 假设被证伪，`Reset` 位置不是变量。
6. 按降级路线摘回：`git checkout -- typescript/tokens/files/source-file-shape.xl.md
   typescript/tokens/items/root-item-rule.xl.md` → 重建 → 全部门禁复绿（见下表）。

## 门禁读数（本分支实测，摘回 C 之后）

| 项 | 命令 | 结果 | 判定 |
|---|---|---|---|
| xl_build 全量 | `xl_build(cwd=clone, paths=["core","typescript"], out="dist")` | 885 written / 0 error / 2429 warning | 绿 |
| tsc | `node .\node_modules\typescript\bin\tsc -p tsconfig.json` | exit 0 | 绿 |
| AST 全量 | `node .\typescript\cases\ast-json.mjs` → `ast-json-diff.mjs` | **6167/6167**，结构 0 / 位置 0 / 字段 0 | 绿 |
| real-dts | `node .\typescript\cases\real-dts-ast.mjs` | **226/226**、崩溃 0、差异 0 | 绿 |
| batch-split root | `node .\tests\body-drive\batch-split.mjs --family root` | PASS（9 段 / 建出 item 9 / 全 raw 0 / 126 断言） | 绿 |
| **full 门禁** | `..\tools\gates.ps1 -Tier full -BaseBuild ..\baseline-build\build` | **PASS**（37.8 s） | 绿 |
| buffer-equivalence | 同上（xml 通道） | **xml PASS 4504 / FAIL 0 / ERROR 0 / 同错 52**；digest 同 | 绿 |
| class-scaling --base | 同上 | PASS（12 档，XML 等价 21 项） | 绿 |
| parse-perf | `node .\tests\bench\parse-perf.mjs --dts 8 --repeat 3` | TOTAL median **557.8 ms**（lib.es5 27.35 ms） | 参考读数 |
| xl_check | `xl_check(paths=[root-item-rule.xl.md, files/])` | **0 error** / 7 warning（W3102/W3103） | 绿 |
| tests/gates/run.mjs | 同上 | 1/8 通过（基线已知红，`RED*`，不计失败） | 基线 |

C 接线那次（已摘回）的读数，留给接任者对比：`xl_build` 0 error、`tsc` 0、
`ast-json` 6095/6167（**cj-fail=72**）、`ast-json-diff` **925/6167**、结构差 4740 / 位置差 1881 / 字段差 0。

## 未完成项（精确到函数）

`typescript/tokens/files/source-file-shape.xl.md`：`AdapterRoot` / `FinishBody` / EOF 分支**仍未提交**
（补丁本身编译绿，问题在语义）。现象与下一步排查点：

- 差异形态（`angle` 构造 0/19、`#1 "a < b;"`）：
  `ExpressionStatement -1  BinaryExpression -1  Identifier -2  FirstBinaryOperator -1  Common +2  Symbol +2`
  ——期望的形状全缺，多出来的是**裸 basic token**。即：`FinishBody` 之后根 `Data` 里**仍然留着原始 token**，
  `BuildTrailingItems` 的结果没有覆盖到它们（要么 raw 区间不对，要么 splice 没执行，要么它自己没建出来）。
- 关键未知量（下一轮直接插桩，别再猜）：
  1. `FinishBody` 里 `raw.From` / `raw.To` / `raw.Reason` / `this.Data.length` 各是多少；
  2. `raw.IsArmed()` 是否为真、`to = raw.To - 1` 是否 `>= from`；
  3. `BuildTrailingItems(this, from, to, context)` 返回几个 item（可能是 0）；
  4. `Process` 的 EOF 分支到底有没有进（`cj-fail=72` 说明有一部分用例是**抛异常**，
     很可能是 `Close` 里那句 `throw new Error("SourceFileShape.Close: 有子单元无法关闭")`）。
  插桩**不必改源码**：在临时脚本里 `require` `build/ts/typescript/tokens/files/source-file-shape.js`
  与 `build/ts/typescript/tokens/items/root-item-rule.js`，替换 `prototype.Process` / `FinishBody` /
  `CloseBatch`、`RawRange` 打日志即可（wp3-5 HANDOFF 的坑 5 有同样做法）。
- 被证伪的两个假设（别重跑）：
  1. 「`CloseBatch` 在 `Flush` 之后 `Reset` 把区间擦掉」——已修（B，且 B 单独全绿），但接上 C 后红；
  2. 「口袋被 `!IsArmed()` 钉在文件开头 → 把 `Reset` 挪到 `Flush` 之前」——**读数逐位不变**，无效。
- 另一个还没试过的方向：`FinishBody` 不要只信 `RawRange()`，而是从「最后一条已建 item 的右界」
  到 `Data` 末尾整段交给 `BuildTrailingItems`（legacy 的「终结候选」在 EOF 那次重算里覆盖的正是整段尾巴）；
  以及确认 `SourceFileTailBuilder.BuildTrailingItems(host,start,at)` 的 `at` 语义（含/不含）与它
  对「多语句尾巴」的支持范围（它的三个已提升入口是 `BuildTrailingDeclaration` / `BuildStatementSegments` /
  `BuildModuleDeclaration`，`BuildTrailingItems` 是第四个）。

## 下一步的精确命令

```powershell
cd C:\Users\Admin\Documents\GitHub\xl-example-set
.\tools\new-member.ps1 -Name impl-wp3-7 -From impl-wp3-6 -Base impl-wp3-6
cd impl-wp3-7
# xl_build 工具：cwd=...\impl-wp3-7, paths=["core","typescript"], targets=["ts"], out="dist"
node .\node_modules\typescript\bin\tsc -p tsconfig.json
# 1) 先插桩看清 FinishBody / EOF 分支（见上「关键未知量」1-4），不要再盲改
# 2) 再照 wp3-5 HANDOFF「可直接复用的补丁」接 C（注意 raw.To 排他、`to = raw.To - 1`、不要写 Array<Token> 注解）
# 3) xl_build(paths=["typescript"]) ; tsc ; node .\typescript\cases\ast-json.mjs ; ...ast-json-diff.mjs
#    判据：6167/6167、结构 0 / 位置 0 / 字段 0（且 cj-fail 必须为 0）
# 4) git checkout -- typescript\cases   （每跑完 AST 都清，否则 23 MB 脏工作树）
# 5) node .\typescript\cases\real-dts-ast.mjs        判据 226/226
# 6) node .\tests\body-drive\batch-split.mjs --family root   （空格，不是 --family=root）
# 7) ..\tools\gates.ps1 -Tier full -BaseBuild ..\baseline-build\build  判据 PASS + buffer xml 4504/0/52
# 红了就 git checkout -- typescript\tokens\files\source-file-shape.xl.md，别带病提交
```

## 踩过的坑（省下一轮）

1. **xl_build 的增量按文件指纹**：只改两个文件时用 `paths=["typescript/tokens/files"]` /
   `["typescript/tokens/items"]` 也够（1 written / 其余 skipped），不必全量重建。
2. **`ast-json.mjs` 会重写 `typescript/cases/*.cj-ast.json`**：每次跑完 `git checkout -- typescript/cases`，
   否则 `git status` 一片红、`git add -A` 会误提交。
3. `git commit` 用**显式 pathspec**（只 add 你要提交的 `.xl.md`）——本次 C 的源码改动与 B 的提交
   在同一工作树里并存过，靠显式 add 才没有把红代码带进 B 的提交。
4. **`RawFallback.To` 是排他的** `[From,To)`；`BuildTrailingItems` 的 `at` 是含的末下标 → `to = raw.To - 1`
   （wp3-5 已指出，本次复现：照抄 spec 的 `to = raw.To` 会整段跳过）。
5. `RootItemRule.Analyze` 的 EOF 收口必须放在 `while` **之后**（而不是 `Alive.size===1` 分支里）：
   收口点要等候选把整段代码都淘汰/试完，且 `Watermark` 已推进到 `code.length`，否则同一段会反复 Analyze。
6. B 的两处修复**单独全绿**（Adapter 为 null 时 `CloseBatch` 根本不会被调用，所以 B 对基线是零风险）——
   接任者可以放心在此基础上只碰 C。

## 阻塞点

无外部阻塞（xl_build / tsc / 门禁 / 测试脚本都可用）。真正的阻塞是 C 的**语义**问题（`FinishBody` +
`BuildTrailingItems` 没有把尾部建出来），需要插桩定位，不是再改一两行能解决。
未改 `core/**`、`statements/**`、`declarations/**`、`members/**`、`typescript/run/**`、其它 `items/` 文件、
`TEAM.md`、`tools/**`；没有 merge、没有 push。
