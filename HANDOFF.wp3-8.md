# HANDOFF — impl-wp3-8（WP-3 第八波：C 接线推进到 6080/6167，最后一公里被「壳建造」卡住，按降级路线摘回）

STATUS: PARTIAL（C 已接线并实测到 **6080/6167、cj-fail 19**；剩余 87 条用例的根因全部归到「声明族靠 mount 壳建造」这一条架构差异上，按降级路线摘回，分支全绿）
BRANCH: impl-wp3-8 @ be60a71e（+ 本 HANDOFF 与补丁提交；分支在摘回后全绿）
BASE: impl-wp3-7 @ be60a71e

> **补丁全文在 `HANDOFF.wp3-8.patch`**（622 行、三个 `.xl.md` 的完整 diff，可直接 `git apply`）。
> 应用后重跑 `xl_build` + `tsc` 即回到 6080/6167 的实测状态；本次分支提交的源码已摘回（全绿）。

## 做了什么

1. 从 `impl-wp3-7` 建 clone，基线复核全绿（6167/6167、cj-fail 0、real-dts 226、gates full PASS）。
2. **把 wp3-7 HANDOFF 的 A–F 六处补丁全部重建并落地**（wp3-7 的工作树改动没有提交、也没有 stash，
   只剩描述；本波按描述重写并逐条实测）：
   - A `SourceFileShape.FinishBody` 先关最后一个子单元再 `FlushBatch`；
   - B `FinishBody` 扫 `Data` 里每一段连续裸 basic token（`ShapeToken` == item 边界）逐段
     `BuildTrailingItems`，**不再只信 `RawRange()`**；
   - C `RootItemRule.Analyze` 在 `IsBuildable` 之后**真建一次**，建出来才收口，结果存 `Pending`，`Build` 直接取用；
   - D 收口点按 `built.SourceRange.EndIndex` 反推（不用试探格，避免把 lookahead splice 掉）；
   - E `BuildTrailingItems` 认**段尾真 `;`**（不再合成第二个 `;`，见下「本波新增」）；
   - F `BuildTrailingItems` 建不出时按「语句段 → 表达式语句」兜底。
3. 逐步定位并修掉 wp3-7 之后的**四个新根因**（见下），AST 从 5770 推到 **6080/6167**、cj-fail 从 151 降到 **19**。
4. 剩余 19 个 cj-fail 与 87 条用例差异全部聚类完成（见「剩余 diff 分类」），阻塞点收敛到一条：
   **根级声明族在 legacy 里是「挂壳（mount）后由壳自己解析」，item 引擎的延迟 splice 契约装不下壳语义。**
5. 按降级路线 `git checkout --` 三个 `.xl.md`，重建后门禁全绿（见「门禁读数」），只提交本 HANDOFF 与补丁。

## 读数表（同一台机器、同一判据）

| 阶段 | 完全一致 | 结构差 | 位置差 | 字段差 | cj-fail |
|---|---|---|---|---|---|
| C 刚接线（wp3-6 读数复现） | 925 | 4740 | 1881 | 0 | 72 |
| + FinishBody 先关 last / 扫裸段（A+B） | 5611 | 554 | 115 | 5 | 87 |
| + Analyze 试建 + Pending（C+D） | 5770 | 397 | 121 | 5 | 151 |
| + 尾巴认真 `;` / 语句兜底（E+F，本波重写） | 6016 | 140 | 94 | 11 | 32 |
| + 候选按「本条目起点」切视图（`ItemUtil.ItemStart` 口径） | 6063 | 93 | 37 | 11 | 35 |
| + KindOf 补 `default` / `export type {` / 装饰器头 | 6088 | 68 | 28 | 11 | 19 |
| +「先不含这一格、再含这一格」两次试建（最后一次实验） | **6080** | 76 | 37 | 11 | **19** |
| **摘回后（本分支现状）** | **6167** | **0** | **0** | **0** | **0** |

> 最后一档（6080）比前一档（6088）略差：把「两次试建」的先后顺序倒过来会在少数
> `export const … ⏎ (b);` 上过早收口。**要恢复最好读数，把 patch 里
> `Analyze` 的 ①/② 两步顺序换回来即可**（① 含这一格 → ② 不含这一格）。

## 本波新增的四个根因（wp3-7 HANDOFF 里没有的）

**G. 候选判定必须传「从本条目起点开始」的数组，否则 `ItemUtil.ItemStart` 会落到上一条 raw 的 token 上。**
`ItemUtil.ItemStart(units)` 的定义是「最后一个非 basic 单元之后」，它默认 `units` 是一个容器的完整 `Data`。
item 引擎的 `State.Code` 去掉了 trivia、又只从 `Start` 起；直接把 `owner.Data` 传给候选，
上一条只记了 raw（没有 splice）时 `ItemStart` 会回到 0，于是**下一条的候选在第一格全部 Reject**。
证据（`a` ⏎ `b;`，`Owner.Data=[a,\n,b,;]`）：
```
[A] code=[b] start=2 at=2 itemStart=0 asi=true  → alive 全空
```
修法：`Analyze` 里 `const base = state.Start; const units = base === 0 ? owner.Data : owner.Data.slice(base);`
候选下标一律 `CodeAt[at] - base`，`BuildByKind` 仍用宿主下标。修完 `a` ⏎ `b;`、`a` ⏎ `import …;` 全部转绿。

**H. 声明族候选在终结符 `;` 上是 `Reject`，所以「候选清空」≠「ASI 边界」。**
`ImportDeclarationPossibleShape.ComputeByIndex` 在 Stage 1 遇到 `;` 走 else 分支 → `Stage=3` → `Reject`；
legacy 之所以没事，是因为 import 在**第二格就挂壳**（`BuildByIndex` → `MountShell`），`;` 由壳自己吃。
item 引擎里必须在「Alive 清空」时先试一次**含这一格**的建造：`import …;` 的 `FromUnits` 正是要 `;` 才建得出。
证据：`import a from "m";` 的 `;` 那一格 `ImportDeclarationPossibleShape at=7 -> 0(Reject)`。
修法：`Analyze` 的 `Alive.size===0` 分支里「① 不含这一格建 → ② 含这一格建 → ③ 收口到上一格」。

**I. `BuildTrailingItems` 必须认段尾**真** `;`，不能再合成一个。**
wp3-7 的补丁是「摘掉 `;` 建完再 SignOut 到 `;` 的 End」，`ShapeToken.SignOut` 对已设 End 的形状抛
`SourceRange.End has already been set`（151 个 cj-fail 的主因）。本波改成：段尾最后一个**代码**单元是 `;` 就直接
`FromUnits(host, start, 代码下标)`、splice 到 `;` 为止；不是才合成零宽 `;`。`SourceRange.End` 是 public field，
兜底吸收落单 `;` 时可以直接赋值（见 J），不必再碰 `SignOut`。
修完 `import …;` 的 End 不再少一格（`[0,17]` → `[0,18]`）。

**J（口径，不是 bug）：`;` 的归属要在容器关根之前并回去。**
`import a from "m";` 建出来是 `[0,17]`（不含 `;`），`;` 会作为**裸 Symbol** 留在 `Data` 里（TS 的节点终点含 `;`）。
`FinishBody` 在逐段重建之后加一步：若 `Data[i]` 是 `;`、`Data[i-1]` 是 `ShapeToken` 且
`previous.EndIndex === semi.StartIndex`，就 `previous.SourceRange.End = semi.SourceRange.EndIndex` 并删掉这个 token。
这一步能一次吃掉「EmptyStatement +1 / End 少一格」一整族（~15 条）。

## 剩余 diff 分类（6080 状态，87 条用例；按「根因 → 应改哪里」排）

| # | 类别 | 约计 | 代表用例 | 根因 | 修法位置 |
|---|---|---|---|---|---|
| 1 | `import defer …` | 12 | `import defer * as ns from "m";` / `import defer a from "m";`（crash） | `ImportDeclarationShape.FromUnits` 只认 `type`，把 `defer` 当默认导入名；`defer` 的 phase modifier 只在 `ImportClausePossibleShape` 的挂壳路径里实现 | `declarations/import-declaration-shape.xl.md`（FromUnits 补 `defer`），或走壳协议 |
| 2 | `export const/let/var … ⏎ (b);` 的 ASI | 12 | `export const x = a as T` ⏎ `(b);` | `StatementBuilder` 把 `(` 当调用续接；TS 在 `as T` 后按 ASI 断句（判据在 `StatementScanner.EndsAtLineBreak`，FromUnits/BuildStatement 不复制） | 候选扫描器口径，或 `statement-builder` 的 ASI |
| 3 | `export default …` / `export = …` 的 ASI | 10 | `export default a as T` ⏎ `(b);`、`export = a as T` ⏎ `[b];`（crash） | `ExportAssignmentShape.FromUnits` 要求表达式在区间末尾，括号会把它续成调用；`requireSemicolon` 只是有无 `;` | `declarations/export-assignment-shape.xl.md` + ASI |
| 4 | import-equals / `export import` 的 ASI | 8 | `import x = require("m")` ⏎ `z;`、`import a = require("m")` ⏎ `foo()`（crash） | `ImportEqualsDeclarationShape.FromUnits` **强制**要 `;`，ASI 尾巴没有 `;` 就抛 | 同 3 |
| 5 | `declare module "m"` 的 End 差 1 | 8 | `declare module "m"` ⏎ `class C {}`（19 vs 18） | `ModuleDeclarationShape.FromUnits` 的 SignOut 把尾部 trivia 算进 End | `declarations/module-declaration-shape.xl.md` |
| 6 | `@dec` ⏎ `const x = 1;` | 5 | 装饰器 + 变量语句 | `StatementBuilder.BuildDecoratedStatement` 只在语句体路径里；根上 `FromUnits` 没有装饰器前导 | `statements/statement-builder` 或候选扫描器 |
| 7 | `async` ⏎ `function` / `declare` ⏎ `enum` 等修饰词跨行 | 5 | `async` ⏎ `function f() {}`、`declare` ⏎ `enum E { A }` | `FromUnits` 不看「修饰词 ↔ 声明词」之间的换行；本波已用 `ShouldDeferToTail` 把它们让给 tail，tail 在 `declare function …` ⏎ `export import …` 组合上仍崩 | `source-file-tail-builder` 的 `BuildTrailingDeclaration` 多语句分界 |
| 8 | 声明族不认 `class<T> {}` | 2 | `class<T> {}`（TS 是 ClassExpression 语句） | `KindOf` 只看 `class` → kind 3（ClassDeclaration） | `root-item-rule` 的 `KindOf`（看 `<` 判表达式） |
| 9 | 注释后的孤立 `;` | 2 | `type T = A \| B // c` ⏎ `;` | TS 把 `;` 与注释都算进 TypeAlias 的 End | 同 J（吸收 `;` 时把中间的 trivia 也并入形状） |
| 10 | 杂项 | 3 | `const﻿b8 = 3;`（BOM）、`export const a = 1;export const b = 2;`（无空格）、`interface I5 extends { a: 1 } { }` | BOM 前缀把 `const` 吞成 Common 正文；`export` 变量的 ExportKeyword 依赖 tail 的 `isExportVariable` 分支；`extends {…}` 的对象字面量被当类型字面量 | 各自文件 |

> 「约计」按 `ast-json-diff` 的**用例**层计（一条用例可能同时有结构差与位置差，三项计数相加会大于用例数）。

## 架构级结论（Lead 需要拍板的三选一）

legacy 的根级**声明族**不是「攒齐 token 再建」，而是**挂壳**：
`XxxPossibleShape.BuildByIndex` → `BodyGuideUtil.MountShell` → `host.MountedUnit = 壳`，之后每个 basic token
由壳自己的 `CatalogGuide` 解析（`Close` 时再提字段）。import 的 `defer`、`export default` 的 ASI、
import-equals 的 `;` 口径、module 的 End 都在**壳的解析过程**里，`FromUnits`（本来是给模块体用的）不复制这些语义。
item 引擎的 `ItemRule.Build` 契约是「不得改 `host.Data`、splice 由引擎整批做」，**装不下 mount 壳**。

因此 6167 全绿只有三条路：

- **(a) 放开 `declarations/**`**：给 `FromUnits` 补齐 `defer` / ASI / import-equals 的 `;` 口径。
  改动集中在 `import-declaration-shape`、`export-assignment-shape`、`import-equals-declaration-shape`、
  `module-declaration-shape` 四个文件，预计能把上表 1–5 类（约 50 条）一次吃掉；剩余 6–10 类各是 1–3 行。
- **(b) 在 `core` 加「壳建造」协议**：允许 `Build` 返回一个已 mount 的壳、引擎识别后跳过 splice。
  语义最干净，但要动冻结区，风险最大。
- **(c) 根上只迁移语句族**：`RootItemRule` 的候选表里把声明族（0/1/3/4/5/6/7/8/10/11）摘掉，
  只留语句 + 表达式（2/12），声明族继续走 `SourceFileShape.CatalogGuide`（legacy）。
  这是最小改动、最容易全绿的一条，但「root 全部迁移」的目标只完成一半。

**建议**：先走 (c) 拿到全绿与门禁，再按 (a) 逐个族替换回来（每族替换都能用 6167 全量回归验证）。

## 可直接复用的配方

```powershell
cd C:\Users\Admin\Documents\GitHub\xl-example-set
.\tools\new-member.ps1 -Name impl-wp3-9 -From impl-wp3-8 -Base impl-wp3-8
cd impl-wp3-9
git apply ..\impl-wp3-8\HANDOFF.wp3-8.patch    # 回到 6080/6167 的实测状态
# xl_build 工具：paths=["typescript/tokens/items","typescript/tokens/files"]；tsc
node .\typescript\cases\ast-json.mjs ; node .\typescript\cases\ast-json-diff.mjs ; git checkout -- typescript\cases
```

插桩（不改源码，运行时包 prototype；本波留了 tmp/probe*.cjs，未提交）：
`RootItemRule.Analyze` 打 `code` 文本 / `Alive` / 每个候选的 `ComputeByIndex` 返回值 / `state.Start`·`End`·`Winner`·`Pending`；
`SourceFileShape.FinishBody` 打进出时的 `Data`（`constructor.name + [Start,End)`）；
`SourceFileTailBuilder.BuildTrailingItems` 打区间与返回条数。最小样本：
`"a;"`、`"a\nb;"`、`"a\n++b;"`、`"declare\nenum E { A }"`、`"import a from \"m\";"`、`"class C {}"`、`"import defer * as ns from \"m\";"`。

## 踩过的坑（新增，省下一轮）

1. `ImportDeclarationPossibleShape` 在 `;` 上**Reject**（Stage 1 的 else 分支），不要拿「候选清空」当 ASI 判据。
2. `ItemUtil.ItemStart(units)` 是「最后一个非 basic 之后」——调用方必须自己保证 `units` 从本条目起点开始。
3. `StatementItemScan.BasePos` 是**语句体**口径（宿主起点 + 1），根上直接用会让所有语句的 `Pos` 偏 1（525 条位置差）。
4. `BuildTrailingItems` 的 `delta` 切片在「合成 `;`」与「真 `;`」两种口径下差一格；改 E 之后要同时检查
   `import …;`（真 `;`）与 `import …`（合成 `;`）两个方向。
5. `SourceRange.End` 是 public field，吸收终结符 `;` 时直接赋值即可；`SignOut` 只能设一次，别用。
6. `analyze` 里 `ShouldDeferToTail` 必须同时挡在 **Alive==1 试建**与 **Alive==0 两次试建**两处，
   否则 `async` ⏎ `function` 还是会被 `FromUnits` 合并。
7. 每跑一次 `ast-json.mjs` 都会重写 `typescript/cases/*.cj-ast.json`，跑完立刻 `git checkout -- typescript\cases`。

## 门禁读数（摘回后，本分支实测）

| 项 | 命令 | 结果 | 判定 |
|---|---|---|---|
| xl_build | `paths=["typescript/tokens/items","typescript/tokens/files"]` | 3 written / 0 error | 绿 |
| tsc | `node .\node_modules\typescript\bin\tsc -p tsconfig.json` | exit 0 | 绿 |
| AST 全量 | `ast-json.mjs` → `ast-json-diff.mjs` | **6167/6167**，0/0/0，cj-fail 0 | 绿 |
| real-dts | `node .\typescript\cases\real-dts-ast.mjs` | **226/226**、崩溃 0、差异 0 | 绿 |
| batch-split root | `node .\tests\body-drive\batch-split.mjs --family root` | PASS（9 段 / 126 断言 / 0 失败） | 绿 |
| full 门禁 | `..\tools\gates.ps1 -Tier full -BaseBuild ..\baseline-build\build` | **PASS**（37.3 s） | 绿 |
| buffer-equivalence | 同上 | xml **4504 / FAIL 0 / ERROR 0 / 同错 52**，digest 同 | 绿 |
| class-scaling | 同上 | PASS（12 档，等价 21 项） | 绿 |
| parse-perf | 同上 | TOTAL median **534.4 ms**（lib.es5 25.99 ms） | 参考 |
| xl_check | `paths=["typescript/tokens/items","typescript/tokens/files"]` | **0 error** / 9 warning | 绿 |
| tests/gates/run.mjs | 同上 | 1/8（基线已知红，`RED*` 不计失败） | 基线 |

## 未完成项（精确到函数）

- `typescript/tokens/files/source-file-shape.xl.md`：`AdapterRoot` / `FinishBody` / EOF 分支**未提交**（已摘回）。
- `typescript/tokens/items/root-item-rule.xl.md`：`Owner` / `Pending` / 视图切分 / 两次试建 / `ShouldDeferToTail` /
  `KindOf` 的 `default` 与 `export type {` 分支 / `BuildStatement` 的根 `basePos` **未提交**（在 patch 里）。
- `typescript/tokens/items/source-file-tail-builder.xl.md`：真 `;` 口径 + `BuildTrailingItems` 的语句/表达式兜底 **未提交**（在 patch 里）。
- 未改 `core/**`、`statements/**`、`declarations/**`、`members/**`、`typescript/run/**`、`TEAM.md`、`tools/**`；没有 merge、没有 push。

## 下一步的精确命令

```powershell
cd C:\Users\Admin\Documents\GitHub\xl-example-set
.\tools\new-member.ps1 -Name impl-wp3-9 -From impl-wp3-8 -Base impl-wp3-8
cd impl-wp3-9
git apply ..\impl-wp3-8\HANDOFF.wp3-8.patch
# 1) 拍板 (a)/(b)/(c)；选 (c) 时先把 RootItemRule.CreateRules 的候选表拆成「语句族」与「声明族」两套
# 2) 每改一族：xl_build(paths=["typescript/tokens/items"]) ; tsc ; ast-json ; ast-json-diff ; git checkout -- typescript\cases
# 3) 全绿后再跑：real-dts 226 / batch-split --family root / gates -Tier full（buffer 4504/0/52）/ xl_check 0 error
```
