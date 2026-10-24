# HANDOFF — impl-wp3-7（WP-3 第七波：插桩定位 C；四处根因 + 四次修法，C 仍红，按降级路线摘回）

STATUS: PARTIAL（C 未接线；**根因已定位并逐条实测**，四次修法把 AST 从 925 推到 5770/6167，差最后一步；分支已摘回全绿）
BRANCH: impl-wp3-7 @ ee64deea（+ 本 HANDOFF 提交；工作树干净）
BASE: impl-wp3-6 @ ee64deea

## 做了什么

1. 从 `impl-wp3-6` 建 clone，基线复核全绿（见下表）。
2. 照 wp3-5 HANDOFF 接 C（`source-file-shape.xl.md`：`AdapterRoot` / `FinishBody` / `Process` EOF 分支），
   复现 925/6167（cj-fail=72）。
3. **插桩（不改源码，运行时替换 prototype）**看清 FinishBody / Analyze / Build / Flush / BuildTrailingItems
   的每一次调用。脚本留在 `tmp/wp37-probe*.mjs`（临时目录，未提交；做法见「插桩配方」）。
4. 按证据依次修了四处（`root-item-rule.xl.md` / `source-file-tail-builder.xl.md` / `source-file-shape.xl.md`），
   AST 读数：925 → 2324 → 5611 → **5770/6167**（结构差 397、位置差 121、字段差 5、cj-fail 151）。
5. 最后一档红在 `ShapeToken.SignOut` 的「End 已设置」上（151 个 cj-fail 的主因），不是再改一行能定；
   按降级路线把**三个 .xl.md 全部 checkout 回 ee64deea**，复测全绿，只提交本 HANDOFF。

## 根因（一句话 + 证据）

**A. `FinishBody` 先 Flush、后关最后一个子单元 → 末尾的 `;` 永远进不了 raw 段。**
`Process` 的 EOF 分支进入时，最后一句的 `;` 这个 basic token 还没关闭；它的 `OnBasicTokenClosed`
才把它喂进 item 引擎。旧补丁先 `FlushBatch`，`Engine.Flush` 看到的 `State.Checked` 停在 `;` 之前，
raw 段 `[0,7)`；`BuildTrailingItems(0..6)` 建出 VariableStatement 后，`;`（Data 下标 7）作为裸 token 留在根上。
证据（`const x = 1;`）：
```
[FinishBody] enter len=8 [Common,WrapSymbol,Common,WrapSymbol,Symbol,WrapSymbol,Common,Symbol]
[Flush] start=0 checked=7 complete=false -> raw=0,7,"incomplete"
[BuildTrailingItems] 0..6 -> 1 [VariableStatementShape]
[FinishBody] exit len=2 [VariableStatementShape, Symbol]
```
修法：`FinishBody` 第一步先 `const last = this.Last(); if (!last.Closed) last.TryToClose(context);`，再 Flush。

**B. `RawRange()` 只记最后一段 raw，且 raw 段可能出现在已建 item 之前 → 不能用它决定重建区间。**
`class C {}`：`ClassDeclarationPossibleShape.IsBuildable` 在**只有 `class` 一格**时就 true，Build 抛错 → raw `[0,1)`；
`C {}` 是第二段 raw `[2,5)`；`Flush` 只把最后一段写进 RawFallback（`start>=0 && checked>start` 分支优先），
于是 `BuildTrailingItems(2..4)` 只拿到 `C {}`，关键词 `class` 永远留下。
证据：`[Data] Common@0-5 | Common@6-7 | Bracket@8-10`。
修法：FinishBody 扫 `Data`，把**每一段连续裸 basic token**（`!(unit instanceof ShapeToken)`，含其间 trivia）
各自交给 `BuildTrailingItems` 重建，`ShapeToken` 之间的边界才是 item 边界。`Bracket` extends `UnitToken`、
`Common`/`Symbol`/`WrapSymbol` extends `BlockToken`，都不是 `ShapeToken`，这个判据成立。

**C（925/6167 的主因）：`IsBuildable` 只是「可以试着建」，不是「这一段建得出」。**
`ImportDeclarationPossibleShape.IsBuildable = state.Stage !== 0`——`import a` 就返回 true。旧 Analyze 见
`Alive.size===1 && IsBuildable` 立刻收口 → Build 抛错 → 把 `import a` 记 raw，引擎从 `from` 重新开始，
把 `from "m";` 建成一条 ExpressionStatement。证据（`import a from "m";`，旧代码）：
```
[Analyze] code=[import a] complete=true winner=0     ← 早收口
[Analyze] code=[from] ... complete=true winner=12    ← 从 from 重开，建成表达式
```
修法：Analyze 在 `IsBuildable` 之后**真建一次**（`BuildByKind` 的静态 `FromUnits` 入口，安全、不改 Data），
建出来才收口；结果存 `Pending`，`Build` 直接取用（同一段不建两次）。批量后读数从 925 跳到 5611。

**D. 试建的收口点必须按 shape 的实际 `SourceRange.EndIndex` 反推，不能用试探格。**
`const a = 1` ⏎ `console.log(a)`：在 `console` 那一格才试建成功，但 VariableStatement 只到 `1`；
按试探格 `state.End` 收口会把 `console` 一起 splice 掉（整条表达式丢失）。修法：从 `at` 往回找
第一个 `SourceRange.Start < built.SourceRange.EndIndex` 的 code 单元，用它的 `CodeAt` 当 `state.End`。

**E. `BuildTrailingItems` 与「尾巴自带 `;`」的口径冲突。**
`BuildTrailingDeclaration` 的口径是「在最后一格之后**合成** `;`」（`host.Data.splice(at+1,0,semi)`）；
真 `;` 留在段内会变成 `;;`，`import a from "m";` 因此整段建不出来（无分号的 `import b from "m"` 反而能建）。
证据：
```
[Decl] 0..7 -> false  data=[Common,WrapSymbol,Common,WrapSymbol,Common,WrapSymbol,String,Symbol]
[Decl] 0..6 -> true   data=[ImportDeclarationShape]        ← 摘掉 `;` 就建得出
```
修法：`BuildTrailingItems` 先摘掉末尾 `;`（`code = at-1`，跳过 trivia），建完把最后一个 shape 的右界
签到 `;` 的 End，再丢掉这个 token。**但** `ShapeToken.SignOut` 对已经设过 End 的 shape 抛
`SourceRange.End has already been set`（`FromUnits` 建出来的声明 End 已设）——151 个 cj-fail 基本都是它。
下一步必须先给 `SourceRange`/`ShapeToken` 找一个能**改写 End** 的入口（或只在 End<0 时 SignOut、
把 `;` 作为一个受控尾巴处理），这是 C 的最后一公里。

**F. 无分号到 EOF 的语句需要 ExpressionStatement 兜底。**
`a` / `a + b` / `console.log(a)`：`BuildTrailingDeclaration` 只认声明族，`BuildByIndex` 的 EOF 分支对
「等不到 `;` 的语句」用的是 `ExpressionStatementShape.FromUnits(host, start, at, context, false)`。
`BuildTrailingItems` 里补同款兜底（`host.Data.length === length` 时）后，`end` / `end-compute` /
`literals` / `members` / `expression` 等组从大面积红变成接近全绿。

## 四次修法的准确读数（同一台机器、同一判据）

| 阶段 | 完全一致 | 结构差 | 位置差 | 字段差 | cj-fail |
|---|---|---|---|---|---|
| C 刚接线（wp3-6 读数复现） | 925 | 4740 | 1881 | 0 | 72 |
| + FinishBody 先关 last、扫描裸段重建 | 5611 | 554 | 115 | 5 | 87 |
| + Analyze 试建后才收口（Pending） | 5770 | 397 | 121 | 5 | 151 |
| + 尾巴摘 `;` / ExpressionStatement 兜底（最后一次） | 5770 | 397 | 121 | 5 | 151 |
| **摘回后（本分支现状）** | **6167** | **0** | **0** | **0** | **0** |

> 注：最后一次「摘 `;`」把 import/export 的建出率提上去了，但 SignOut 抛错把 cj-fail 从 87 抬到 151，
> 净读数只多了 159 条一致；修好 End 改写后预计能再大幅前进，但未验证。

## 可直接复用的插桩配方（不改源码）

```js
// node tmp/probe.mjs；先 tsc，再 require build/ts
const { SourceFileRunner } = require("./build/ts/typescript/run/source-file-runner.js");
const { SourceFileShape } = require("./build/ts/typescript/tokens/files/source-file-shape.js");
const { RootItemRule } = require("./build/ts/typescript/tokens/items/root-item-rule.js");
const { ItemListEngine } = require("./build/ts/core/syntax/batch/item-list.js");
const { SourceFileTailBuilder } = require("./build/ts/typescript/tokens/items/source-file-tail-builder.js");
// 逐个 prototype 方法包一层 console.log：Analyze（code 文本 / atEof / alive / complete / winner / pending）、
// Build（start..end -> 建出什么）、FinishBody（enter/exit 的 Data 构造器序列、RawRange）、
// Flush（start/checked/complete -> items / raw）、BuildTrailingItems（start..at -> 返回几条）。
// 最小样本："const x = 1;"、"a + b;"、"class C {}"、"const a = 1;\nconst b = 2;\n"、
//           'import a from "m";'、'class C {}\nconst x = 1;'、"a"、"a + b"、"const a = 1\nconsole.log(a)"。
SourceFileRunner.Parse(src, "s.ts");   // 返回根 shape；rootShape.Data.filter(u => !u.IsTriviaToken)
```
关键读数口：`unit.constructor.name` + `SourceRange.Start/EndIndex` + `ToXmlString()`；
引擎内部：`Engine.State.{Start,Checked,Complete,End,AtEof}`、`Engine.Built`、`RawFallback.{From,To,Reason}`。

## 未完成项（精确到函数）

`typescript/tokens/files/source-file-shape.xl.md`：`AdapterRoot` / `FinishBody` / EOF 分支**未接线**（已摘回）。
`root-item-rule.xl.md` 的 `Analyze`（试建 + Pending + 按 shape End 收口）与 `source-file-tail-builder.xl.md`
的 `BuildTrailingItems`（摘 `;` + ExpressionStatement 兜底）**也未提交**——它们是 C 的配套改动，
单独提交会在没有调用方的情况下改变公共静态入口，等 C 定稿一起进。补丁全文见上面 A–F 各段代码。

**下一步唯一阻塞**：给「已设过 End 的 shape」找到改 End 的口子（`core/syntax/shape-token.xl.md` 在冻结区，
但它是只读契约——先确认有没有 `SetEnd`/`AppendEnd`；若没有，可能要改成「不摘 `;`，让
`BuildTrailingDeclaration` 认末尾 `;`」，那属于 `source-file-tail-builder` 的内部改动，仍在允许写范围）。

## 门禁读数（摘回 C 之后，本分支实测）

| 项 | 命令 | 结果 | 判定 |
|---|---|---|---|
| xl_build | `paths=["typescript/tokens/items","typescript/tokens/files"]` | 3 written / 0 error | 绿 |
| tsc | `node .\node_modules\typescript\bin\tsc -p tsconfig.json` | exit 0 | 绿 |
| AST 全量 | `ast-json.mjs` → `ast-json-diff.mjs` | **6167/6167**，0/0/0，cj-fail 0 | 绿 |
| real-dts | `real-dts-ast.mjs` | **226/226**、崩溃 0 | 绿 |
| batch-split root | `batch-split.mjs --family root` | PASS（9 段 / 126 断言 / 0 失败） | 绿 |
| full 门禁 | `..\tools\gates.ps1 -Tier full -BaseBuild ..\baseline-build\build` | **PASS**（37.7 s） | 绿 |
| buffer-equivalence | 同上 | xml **4504 / FAIL 0 / ERROR 0 / 同错 52**，digest 同 | 绿 |
| class-scaling | 同上 | PASS（12 档，等价 21 项） | 绿 |
| parse-perf | 同上 | TOTAL median **578.1 ms**（lib.es5 29.35 ms） | 参考 |
| xl_check | `paths=["typescript/tokens/items","typescript/tokens/files"]` | 0 error | 绿 |
| tests/gates/run.mjs | 同上 | 1/8（基线已知红） | 基线 |

## 踩过的坑（省下一轮）

1. `ast-json.mjs` 每次都重写 `typescript/cases/*.cj-ast.json`：跑完立刻 `git checkout -- typescript\cases`。
2. `BuildByKind` 里 kind 9 的 `StatementBuilder.BuildStatement` **建不出变量声明**（`const …` 会被当表达式），
   变量声明走 kind 9 只有在语句族兜底时才对；`KindOf` 的 `9` 覆盖太宽，这是后续要盯的次生风险。
3. `class` 一格就 `Complete` 是 `ClassDeclarationPossibleShape.IsBuildable` 的语义（可试建），不是 bug；
   根规则必须用「建出来」当收口判据。
4. `Bracket` extends `UnitToken`，`Common/Symbol/WrapSymbol` extends `BlockToken`——所以 `instanceof ShapeToken`
   是「这一格是已建 item」的可靠判据。
5. `gates.ps1 -Tier full` 的 `RED*` 是基线已知红（samples 门依赖根级 cjcli/dawn），不是本轮引入。
6. 别信 wp3-5「IsBuildable 恒 false」：实测 `import`/`class` 都是**过早 true**，两个方向都会咬人。

## 下一步的精确命令

```powershell
cd C:\Users\Admin\Documents\GitHub\xl-example-set
.\tools\new-member.ps1 -Name impl-wp3-8 -From impl-wp3-7 -Base impl-wp3-7
cd impl-wp3-8
# 1) 先把本 HANDOFF 的 A–F 六处照抄回去（source-file-shape 的接线 + root-item-rule 的 Analyze 试建 +
#    tail-builder 的 BuildTrailingItems）；xl_build paths=["typescript/tokens/items","typescript/tokens/files"]；tsc
# 2) 只改「尾巴 `;` 的 End」这一件事：查 ShapeToken/SourceRange 有无改 End 的入口；
#    没有就改成「让 BuildTrailingDeclaration 自己吞末尾 `;`」，不要再 SignOut 已设 End 的 shape
# 3) node .\typescript\cases\ast-json.mjs ; node .\typescript\cases\ast-json-diff.mjs ; git checkout -- typescript\cases
#    判据：6167/6167、0/0/0、cj-fail 0
# 4) real-dts 226；batch-split --family root；gates -Tier full（buffer 4504/0/52）；xl_check 0 error
# 红了仍然 git checkout -- 三个 .xl.md，别带病提交
```

## 阻塞点

无外部阻塞（xl_build / tsc / 门禁都可用）。真正的阻塞是 **End 的不可改写** + 根级 item 引擎的收口语义
（IsBuildable 过早 true），需要用「试建」当判据（本 HANDOFF 已给出可用实现与读数）。
未改 `core/**`、`statements/**`、`declarations/**`、`members/**`、`typescript/run/**`、`TEAM.md`、`tools/**`；
没有 merge、没有 push。
