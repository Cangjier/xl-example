# HANDOFF — impl-wp3-17（WP-3 第十七波：prefix-operand 根因定位到 item 表，未落地修正）

STATUS: **PARTIAL / 净零**（无源码改动。AST 仍 **6134 / 6167**、结构差 27、位置差 26、字段差 0、cj-fail 0；
buffer xml **PASS 4487 / FAIL 17 / ERROR 52**、digest PASS 4379 / FAIL 125 / ERROR 52 —— 与起点
`impl-wp3-16 @ ef468b72` **逐项相同**；quick/standard PASS、xl_check 0 error、tsc 0）。
本波的价值是**把 `prefix-operand-newline` 的失败点从「语句层的 ASI 判据」纠正到「root item 表的
`BuildByKind` 建造失败」**，并给出可复现的最小语料与下一波该打点的两行位置。

BRANCH: impl-wp3-17 @ ef468b72（本文件为唯一提交内容）
BASE: impl-wp3-16 @ ef468b72

## 0. 一句话结论（给 Lead）

`prefix-operand-newline` **不是** `StatementBuilder.BuildExpressionStatement` 的 ASI 判据问题
（`--` ⏎ `操作数` 这条判据是对的：`IsAsiBoundary` 在 `before < 0` 时返回 false，正是「前缀运算符等下一行
操作数」）。真正的失败点是：**root item 表为这条表达式语句调 `RootItemRule.BuildByKind(kind=9, …)` 时抛
`表达式意外结束`**，`Pending` 保持 null → 扫描一路滚到 EOF → `Winner=-1` → `RecordBuild` 把
`[Start, EOF)` 整段记成 raw。因为 root 是**一个批次**，一条 item 建不出来就把整段（含前面已经建对的语句）
一起回退，这解释了 HANDOFF.wp3-16 §4 记的「从第 1 条语句起全部退化」。

## 1. 最小复现（本波实测，全部用 `SourceFileRunner.Parse`）

语料（`\n` 为真换行）：

| # | 源码 | 结果 |
|---|---|---|
| Y | `a++; --` ⏎ `b;` | **正确**：`ExpressionStatement[0,4]` + `ExpressionStatement[5,10]`（`--b;`） |
| Z | `a++; --` ⏎ `b;` ⏎ `let c = 2;` | **整段塌成 raw**：`ExpressionStatement[0,4]` 之后从 `--` 起全是 raw Symbol/Common |
| X | `a++; --` ⏎ `b; let c = 2;` | 同 Z |
| P | `x; --` ⏎ `a;` | **正确** |
| S | `a;` ⏎ `--` ⏎ `b;` ⏎ `let c = 2;` | 塌（从 `a;` 之后） |
| I / J / K / L | `let a = 1; a++; --` ⏎ `a;` 及其变体（**后面没有别的语句**） | 全部正确 |

⇒ 触发条件是「**前缀运算符在行尾 + 操作数在下一行**的这一条表达式语句**不是文件最后一条**」；
与 `//c` 行注释**无关**（wp3-16 §4 把注释当触发点，本波证否：`b++; --` ⏎ `b;` 无注释、后面接
`let c = 2;` 一样塌）。真实用例 `tests/cases/token/statements/prefix-operand-newline.ts` 里前两条
`--` ⏎ `a;` 之后还有 8 行，所以整文件塌。

## 2. 打点证据（下一波直接照这个位置打）

在 `build/ts` 上临时打点（**打完已用 `Remove-Item` + 重跑 tsc 复原，未进提交**）：

1. `RootItemRule.BuildByKind` 入口打印 `kind / start / end`：
   - item1：`kind=9 start=0 end=2`（`a++;`）→ 成功；
   - item2：`kind=9 start=2 end=5`（`--` ⏎ `b;`，`end=5` 是 `;`，`Data[5]` 的 range `9-10`）→ **失败**。
2. `ItemListEngine.RecordBuild` 入口打印 `State.Start / to`：
   - item1：`start=0 to=3`（正常，`[0,3)` → 一条 `a++;`）；
   - item2：`start=2 to=15`（**to = EOF**）⇒ `rule.Build` 返回 **null**，`RecordBuild` 走
     `RawFrom/RawTo = [2,15)`，`Reason="build-null"`。这与 `Flush` 的 raw 口径一致
     （`RawFallback.To` 排他，`core/syntax/batch/item-list.xl.md` §RecordBuild/§Flush）。
3. 在 `BuildByKind` 的 `catch` 里打印 `error.message` + `host.Data[start..end]`：
   - `msg = 表达式意外结束`（该文案在 `build/ts` 里**只有一处**：
     `typescript/tokens/statements/statement-builder.js:170` = `StatementBuilder.BuildStatement` 的
     `if (this.At >= this.Units.length) throw`，即 `builder.Load(units, basePos)` 之后
     **`builder.Units` 是空的**（`At=0 >= 0`）；
   - `units = 2:Symbol(5-7) 3:WrapSymbol(7-8) 4:Common(8-9) 5:Symbol(9-10)`，
     即 `[--, 空白(WrapSymbol), b, ;]`。

## 3. 下一波该做的两件事（按顺序，各是一条探针）

1. **把「空 Units」这件事钉死。** 上面第 3 条自相矛盾：`WrapSymbol.IsTriviaToken = true`
   （`core/syntax/basic-tokens/wrap-symbol.xl.md` §field IsTriviaToken），`Load` 应该跳过它，剩下
   `[--, b, ;]`，`BuildStatement` 不可能抛 `At >= Units.length`。所以要么
   (a) `BuildByKind` 收到的 `units` 与 catch 时看到的 `host.Data[start..end]` **不是同一份**
   （`Analyze` 到 `catch` 之间 `host.Data` 被 splice 过），要么
   (b) `BuildStatement` 的 `units` 全被判成 trivia。**探针**：在 `statement-builder` 的 throw 处打印
   `this.At / this.Units.length / this.Units.map(u => u.constructor.name)`，并在 `RootItemRule.BuildStatement`
   里打印 `start / end / units.length / units.map(...)`（`.js` 打点用
   `[IO.File]::ReadAllText/WriteAllText + UTF8Encoding($false)`，改完 `Remove-Item build/ts/<file>.js` 再 tsc）。
2. **修 `RecordBuild` 的 raw 回退粒度（这才是根上的问题，也正好是 C 类的落点）。**
   `ItemListEngine.RecordBuild`（`core/syntax/batch/item-list.xl.md:237`）在 `rule.Build` 返回 null 时，
   把 `[State.Start, to)` 整段记 raw。`to = ItemEnd()` 在 `Winner=-1` 时等于 `Checked`（常常是 EOF），
   于是**一条建不出来的 item 会吞掉它后面的所有语句**。建议：`Build` 返回 null 且
   `to > Start` 时，把 raw 区间退到「本条 item 的第一个 `;`（含）」为止（`;` 必是语句边界，
   且 `RawFallback.To` 排他），让 `Checked` 之后的内容能被下一条 item 重新读一次。
   `RecordBuild` 成功后向前看 `;` 的 C 类需求也落在同一个方法里（`Flush` 里没有这条 lookahead，
   而 root-item-rule 的 `Alive.size===1` 分支在 `semiAt` 上已经做了一次「含 `;` 重建」——两处口径要对齐）。

## 4. 未动的类（与 wp3-14/15/16 §4 完全一致，一步没动）

- C 类 4（`core/syntax/batch/item-list.xl.md` 的 `RecordBuild` 向前看 `;`）——见 §3.2。
- D 类 4（`StatementBuilder` / `ExportAssignmentShape` 表达式终点）。
- F 类 5（装饰器变量声明：去掉 `@` 豁免 + 要求吃到 `;`，只在 root accept 点）。
- G 类 2（module `{}` 边界）、H 类 3（无体模块 `End+1` / namespace-export `End+1` / `ExportKeyword Pos`）。
- I 类 13（未评估）。

## 5. 本波门禁读数（实测，2026-10-24）

| 项 | 命令 | 读数 |
|---|---|---|
| xl_build | core+typescript → dist | 875 written / 0 error / 2414 warning |
| tsc | `tsc -p tsconfig.json` | exit 0 |
| xl_check | core+typescript | **0 error / 2414 warning** |
| AST 全量 | `ast-json` + `ast-json-diff` | 6167 条：一致 **6134**；结构差 27、位置差 26、字段差 0；cj-fail 0 |
| buffer | `--mode both --base ..\baseline-build\build --new build --dts 8 --quiet` | xml **4487 / 17 / 52**；digest **4379 / 125 / 52** |
| quick | `gates.ps1 -Tier quick` | **PASS** 5.7s |
| standard | `gates.ps1 -Tier standard` | **PASS** 10.6s（`tests/gates/run.mjs` 1/8 = 基线 KNOWN-RED） |

**与起点逐项相同，没有任何倒退**；`prefix-operand-newline` 仍 FAIL（本波未修）。

## 6. 踩过的坑（新增，省下一波的时间）

1. `StatementBuilder` 的 `Load` 会跳过 `WrapSymbol`（空白），所以**在 `host.Data` 上看到的 unit 列表
   不等于 builder 看到的 `Units`**——打点时两边都要打，否则会得出「units 非空却抛空 Units」的假矛盾。
2. 用 `-replace`/`.Replace()` 给 `build/ts/*.js` 打点时，**锚点字符串里的 `\r\n` 极容易不匹配**
   （tsc 产物是 LF）：匹配失败不会报错、只当没打上；匹配到同名 `while (at < code.length)` 还会插进
   `KindOf` 里（本波踩过，报 `ReferenceError: state is not defined`）。锚点用**单行 + 足够特殊的文本**。
3. 临时打点后复原：`Remove-Item build\ts\<path>.js` 再 `tsc`（`build/ts` 不进 git，别用编辑器「撤销」）。
4. `ast-json` / `gates.ps1` 都会重写 `typescript/cases/*.cj-ast.json`，跑完必须
   `git checkout -- typescript/cases`，否则提交里会带上 6000+ 快照。
