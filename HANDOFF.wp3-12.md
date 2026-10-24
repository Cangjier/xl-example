# HANDOFF — impl-wp3-12（WP-3 第十二波：root 接线从 6108 继续）

STATUS: PARTIAL（**AST 6125 / 6167**，比起点 6108 +17；cj-fail 11→8；buffer 等价 22 FAIL→19 FAIL）
BRANCH: impl-wp3-12（从 impl-wp3-11 的 `33d2575e` 起，`reset --hard 9b68bb15` 取 6108 实测态）
BASE: impl-wp3-11 @ 33d2575e（绿树 6167；6108 态在 `9b68bb15`）

## 0. 一句话结论（**给 Lead 的裁决点**）

**6108 态本身就是红树，不只是 AST 红**：`gates.ps1 -Tier full -BaseBuild` 的两项必过门禁
（`buffer-equivalence`、`class-scaling --base`）在**纯 6108 态**（只把 `root-item-rule` 与
`source-file-tail-builder` 还原到 `9b68bb15`）就已经是 FAIL：

| 门禁 | 纯 6108 态 | 本波 6125 态 | 绿树门槛（TEAM §7.1） |
|---|---|---|---|
| buffer-equivalence xml | PASS **4478** / FAIL **22** / ERROR 53 | PASS **4481** / FAIL **19** / ERROR 53 | PASS 4504 / FAIL 0 |
| class-scaling --base | FAIL（same-line 错误文案不一致） | FAIL（同一项） | PASS 21/21 |

即：**「root 接线」这条路（wp3-8→wp3-12 的 6097→6125）与 byte 等价是冲突的**——
每多建对一个根 item，就有若干 `.d.ts` 的 XML 与基线（main 原实现）不同。
本波没有让它更糟，反而修好了 3 个文件（22→19）。**要 AST 6167 就要接受 buffer 不完全等价；
要 byte 等价就必须放弃 root 接线这条路。** 这是架构级取舍，只有 Lead 能裁。

## 1. 本波做了什么（3 处源码改动，2 个文件）

### A. A/B 类（15 条）真正根因 = 尾巴的 `isExportVariable` 整段 splice

`typescript/tokens/items/source-file-tail-builder.xl.md` · `BuildTrailingDeclaration` 的
`isExportVariable` 分支。

字段级证据（probe 实测）：`export const x = a as T` ⏎ `(b);` 的 `export const …` **从来不在
item 表里收口**——`ExportDeclarationShape.FromUnits` 对「带声明词的 export」直接抛，
于是整段（两条语句）落进 raw 回退，尾巴的 `isExportVariable` 用
`host.Data.splice(start, at - start + 1, statement)` 把**整段**换成**一条**语句，
后面那条（`(b);` / 第二条 `export const`）被一起吞掉。

修法：按语句右边界 `SourceRange.EndIndex` 数消费槽位（与 `BuildStatementSegments` 同口径），
只 splice 本条语句的槽位；剩余单元再递归 `BuildTrailingDeclaration`（`export const b = 2;`
仍是 `isExportVariable`），建不出来再 `BuildStatementSegments`。

修好：possible-compute #140..#148/#153/#154（**11 条 A 类全绿**）、export #203/#100、
end-import-export #22 的一部分。**6108→6122（+14）**。

### B. C 类：C 块收口后向前看一格 `;`（**实测中性，未推进读数**）

`root-item-rule.xl.md` · `Analyze` 的 `Alive.size === 1` 成功分支。

TS 实测：`a` ⏎ `;` 是 `ExpressionStatement[0,3]`、`type T = A` ⏎ `;` 是
`TypeAliasDeclaration[0,12]` ⇒ **跨行也算**，`;` 一律属于前一条 item（不必加「无换行」条件）。
已实现「`lastAt+1` 是 `;` 且形状没吃到它 → 按含 `;` 重建一次，收口到 `;`」。

**但它几乎不触发**：`predecessor` 收口时 `;` 往往**还没被喂进 `code`**（引擎每来一个 unit
才 `Analyze` 一次），所以 `code[lastAt+1]` 还不存在。C 类 4 条仍未过。

### C. C 类的「推迟一格」试过并**回滚（净负 6122→6117）**

在 C 块加「收在当前可用代码最后一格且非 EOF 时先不收口」，本意是等 `;` 到来再决定。
实测负收益：`if (a) f()` ⏎ `else g()` 会在 `else` 那一格重新 `Build` 出一个**截断**的形状
（`cj[0,10]` vs `ts[0,19]`），`try {}` ⏎ `catch`、`const` ⏎ `enum E {}` 同病。
已在源码注释里写明**别再试这个形状**。

### D. E 类（3 条）：带修饰词的 `ImportDeclaration` 补直接入口

`root-item-rule.xl.md` · `BuildByKind` 的 `kind === 1`。

`export import a from "m"` / `declare import …` / `export declare import …`：
`ImportDeclarationShape.FromUnits` 不认前导修饰词（抛），整条落进 `StatementBuilder`
报「表达式语句没有读完」。TS 侧它们是 **ImportDeclaration 带 ExportKeyword / DeclareKeyword
子节点**。新增入口：跳过修饰词建 import 本体，再把修饰词按原顺序插到 children 最前。

坑（第一次实现无效的原因）：`host.Data` 里**修饰词与 `import` 之间夹 trivia**，
所以跳修饰词必须**跳 trivia**（`unit.IsTriviaToken`），不能只看 `TextOf`。
修饰词的 `Pos` 是**前一个非 trivia 单元的右界**（`export declare import` 里 DeclareKeyword
的 Pos 是 `export` 的 End，不是 0）。

修好 import #47/#48/#49。**6122→6125**，`cj-fail` 11→8。

## 2. 剩余 42 条（40 个用例行）逐类状态

| 类 | 用例 | 条数 | 状态 / 下一步 |
|---|---|---|---|
| **C 剩余** | end-build #33/#37（`type T = A\|B // c` ⏎ `;`）、end-import-export #20、possible-compute #126 | 4 | 需要「收口时 `;` 已在 code 里」。真正可行的方向：**在 `;` 作为独立 item 的 `Analyze` 里把上一条 item 撤销**（同一批内 `ApplyBuilds` 还没落盘），或在引擎 `Feed` 里做「item 右界延后一格」——两者都在 `core/**`（本波禁止）。**留给 Lead 决定是否解锁 `core/syntax/batch/item-list.xl.md`** |
| **D 类** | end-compute #184、statements #290、end-export-assignment #37/#38 | 4 | `(` 续接判反：TS 只在「前一格刚结束一个**类型**」时 ASI。已证**不在** `IsDeclarationBoundary`（wp3-11 §3 + 本波 corroborate）。真正的点在 `StatementBuilder` / `ExportAssignmentShape.BuildDirect` 的**表达式终点**（后者不在本波写范围） |
| **F 类** | missing-possible #146/#147/#148/#149/#150 | 5 | `@dec` ⏎ `const`：item 表在 `@` 段就按 `VariableStatement` 收口（空声明列表、跨行）。修法在 `statements/statement-builder.xl.md` 的装饰器声明头边界（**本波没动**） |
| **G 类** | end-declarations #71/#72 | 2 | `module N` ⏎ `{}`：`{}` 是**下一个 unit**，`kind 7` 的 `hasBody` 扫不到 → 走 `BuildDirect` 建出无体模块。与 C 同一时序问题（体括号还没到）；**同一处 `core` 引擎改动可一并解决** |
| **H 类** | missing-end #48/#49（模块 End +1）、#95（`export as namespace` End +1）、end-build #155（ExportKeyword Pos 0→26）、end-build #92/#93（`var y` 结构差）、dts-types #81 | 6 | 全在 `source-file-tail-builder` 的**重锚 / Pos 口径**，本波没动（每条约 1 处小改，但需要逐条读该文件对应分支） |
| **越权 / 口径** | possible-build #10/#11/#13/#14/#15/#55/#56/#58/#61/#169/#171/#179（12）、dts-recovery #14/#15（class）、possible-compute #25（interface）、basic-token #86（BOM 脚本口径） | 16 | **不属 root**：表达式建造（WP-4）、class 声明、interface 体、diff 脚本 BOM 口径 |
| **B 剩余** | missing-possible #150（`@dec` ⏎ `const x = 1;` ⏎ `const y = 2;`） | 1 | 与 F 同族 |

## 3. 门禁读数（本分支实测，2026-10-24）

| 项 | 命令 | 读数 | 判定 |
|---|---|---|---|
| xl_build | core+typescript → dist | 0 error / 2414 warning | PASS |
| tsc | `tsc -p tsconfig.json` | exit 0 | PASS |
| AST 全量 | `ast-json.mjs` + `ast-json-diff.mjs` | **6125 / 6167**；结构差 36、位置差 27、字段差 0；cj-fail **8** | 6108 → +17 |
| real-dts | `real-dts-ast.mjs` | 226 文件 / 解析成功 226 / 崩溃 0 / 一致 **226** | PASS |
| batch-split root | `--family root` | 9 段 / 126 断言 / 0 失败 | PASS |
| body-guide | interface/all（gates 内） | 35/35、25/25、23/23、16/16、10/10、class 54/54 | PASS |
| gates full | `-Tier full -BaseBuild ..\baseline-build\build` | tsc/ast-json/ast-json-diff/body-guide×4/real-dts/parse-perf/class-scaling(measure) **全 ok**；`tests/gates/run.mjs` KNOWN-RED（基线 1/8）；**buffer-equivalence FAIL**；**class-scaling --base FAIL** | **FAIL（2 项）——两项都是 6108 态继承** |
| buffer-equivalence | 同上 | xml PASS **4481** / FAIL **19** / ERROR 53 / 同错 3；digest PASS 4373 / FAIL 127 | 6108 态是 4478/22 ⇒ 本波**改善 3 个文件** |
| class-scaling --base | 同上 | FAIL 1 项：`same-line` 错误文案不一致（base=throw / new=类成员之间缺少分隔符） | 6108 态同样 FAIL ⇒ 继承 |
| parse-perf | `--dts 8 --repeat 3` | TOTAL median 726.9 ms | 参考（无基线对照，与 wp3-11 同量级） |
| class-scaling measure | 12 档 | 250→2000 斜率 x1.96 | PASS |

## 4. 未完成项（精确到文件 / 函数）

1. **C 剩余 4 条 + G 2 条**：卡在**时序**——收口时下一个 unit（`;` / `{`）还没进 `code`。
   唯一干净的解法在 `core/syntax/batch/item-list.xl.md` 的 `Feed`/`RecordBuild`
   （把 item 右界延后一格再建，或允许同批内撤销上一条 item），**本波写范围禁止 `core/**`**。
2. **D 4 条**：`StatementBuilder` / `ExportAssignmentShape.BuildDirect` 的表达式终点。
3. **F 5 条 + B 剩余 1 条**：`statements/statement-builder.xl.md` 装饰器声明头。
4. **H 6 条**：`source-file-tail-builder` 的 End 重锚 / ExportKeyword Pos / `var y` 分支。
5. **buffer-equivalence 与 AST 的结构性冲突**（见 §0）：需要 Lead 裁决验收口径。

## 5. 下一步的精确命令

```powershell
cd C:\Users\Admin\Documents\GitHub\xl-example-set
.\tools\new-member.ps1 -Name impl-wp3-13 -From impl-wp3-12 -Base impl-wp3-12
cd impl-wp3-13
# 起点就是 6125 态（本波 tip），不需要 reset
# 改 H 类（最没有争议的 6 条）：typescript/tokens/items/source-file-tail-builder.xl.md
#   xl_build(paths=["typescript/tokens/items/source-file-tail-builder.xl.md"]) → tsc
#   → ast-json.mjs + ast-json-diff.mjs → git checkout -- typescript/cases
# F 类：typescript/tokens/statements/statement-builder.xl.md（装饰器声明头边界）
```

## 6. 踩过的坑（新增，省一轮）

1. **`git checkout -- typescript/cases` 会毁掉读数**：`ast-json-diff` 必须紧跟在
   `ast-json.mjs` 之后跑；若先 checkout 再 diff，diff 比的是**已还原的绿快照**，
   会假报 **6167/6167 全绿**（本波踩过一次，差点误判完工）。
2. **`.NET` 静态方法不认 PowerShell 的 `cd`**：`[System.IO.File]::ReadAllText("dist/...")`
   会按**进程 cwd** 解析 → 必须传**绝对路径**。
3. **`xl_build` 单文件会覆盖 dist 里的手工探针**（好事），但 `git checkout <sha> -- <xl.md>`
   之后**必须 `xl_build` 才会进 `dist/`**，只 `tsc` 是白跑（本波踩过一次）。
4. **`xl_build` 的 `skipped:` 列表 ~800 行**，全量构建时输出会爆；只看结论就 grep
   `xl build — N written`。
5. **验收必须先在起点态跑一遍门禁**：`6108` 不是「只有 AST 红」，buffer 与 class-scaling
   也已经红。不先量起点就会把继承失败当成自己引入的（本波用一轮换来这个结论）。
6. `End` / `EndIndex` 在 `SourceRange` 上同值；`ImportDeclarationShape.FromUnits` 对
   `export import …` **抛异常而不是返回 null**，所以要用**内层 try/catch** 才能兜底。

## 7. 交付状态

- `impl-wp3-12` tip = **6125 态**（红树：结构差 36 / buffer 19 FAIL），未 merge、未 push。
- 3 个提交：`6fc1044e`（A/B 类，6122）、`ffae2ccf`（E 类，6125）、本提交（HANDOFF）。
- 改动文件 2 个：`typescript/tokens/items/root-item-rule.xl.md`、
  `typescript/tokens/items/source-file-tail-builder.xl.md`。
- 6108 态仍在历史里（`9b68bb15`），6122 态在 `6fc1044e`（若只想取 A/B 类收益而不取 E 类）。
