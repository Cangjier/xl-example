# 11 — core/syntax/basic-tokens（词法层 9 个 basic token）

审计范围：`core/syntax/basic-tokens/*.xl.md` 共 9 个（`string/` 子目录另成第 12 篇）。
判据见 [`01-rules.md`](01-rules.md)。

**本层总评**：IMPORTANCE 列的 10 类 basic token 这里能对上 8 类（区域注释、行注释、正则、括号、空白、符号、通用字符块、BOM、Shebang；字符串在 `string/`）。偏离集中在**「关闭即触发 possible」这条正向约定之上，又叠了一套每字符转发 + 回溯撤销 + 整段扫描**：三个 token（`Common/Symbol/WrapSymbol`）走 `BlockToken.Process`，另外四个（`Bracket/AreaAnnotation/LineAnnotation/RegexToken/Shebang`）走 `UnitToken.Process` + `ExitOrPre`，同一个词法层有两种驱动方式，而且两种都自己改写 `context.Index`。

正向证据要留住：`Common/Symbol/LineAnnotation/AreaAnnotation/RegexToken/Shebang/Bom` 的 `Close` 都**确实**去问父单元 `ComputePossibleShapes(PossibleSource.Close)`——这正是 R03/R13 的触发点。

---

### core/syntax/basic-tokens/bracket.xl.md（7363B / 100 行；`Bracket`、`BracketChildCreatedHook`、`BracketRoleHook`）
- 结构：括号 basic token——`Transit` 里创建子括号、装挂载、触发 possible；`ExitOrPre` 里遇闭括号签范围+关闭+卸载；`Close` 里补问自己的 possible 与父单元 possible。
- 偏离：
  - `[P4]` ● **全仓没有 `HandleCloseDispatch`**（机械扫描 0 处）。R15 要求 bracket 创建时按场景配置它，R16 要求 close 时若它非空就**直接调用它**完成晋升 + shape close，且**不再触发原 close 逻辑（possible 与 end 都不触发）**。这里的 `Close` 恰恰还在触发 possible（`:91-101`）。证据 `bracket.xl.md:81-103`。
  - `[P4]` ● `[B3:FLUSH]` 关闭前补判自己的最后一格（`this.ComputePossibleShapesByIndex(this.Data.length - 1, ...Close)`）——直接踩在 R16 的禁止项上，只是被 `FlushOnClose` 默认 `false` 挡住。证据 `bracket.xl.md:85-93`。
  - `[X1]` ● 三段设计外机制共享一个 close 时机：`BracketRoleHook.Current` 进程级单例（`:26-34`，调用点 `:163-165`）、`Bracket.ChildBracketCreatedHook` 进程级单例（`:122-130`，补调点 `:155-157`）、以及注释里自述的 `[B0:ROLE]`「通用括号角色机制」——设计里 bracket 晋升只有 catalog possible/end 一条路。
  - `[P1]` ○ create 时确实问了 possible（`:175-183`），但给父宿主那一问加了 `EndPossible !== null` 前置（`:180`），且要求 `value === "{"` 且宿主是 `Bracket`。R13 没有这些前置；加上它等于「候选全灭时就不问」，把 R28 本该抛的错绕开了。证据 `bracket.xl.md:166-183`。
  - `[X1]` ○ `RoleState/Role/ReplayCount` 三个过程字段（`:51-55`）+ `Use()` 在运行时把括号改写成另一种括号（`:63-79`）。括号的字符对在设计中是它的身份，不是可变状态。
  - `[S1]` ○ `ExitOrPre`/`Transit` 里用 `Common.IsInUnicodeBraceEscape(this)` 判定「这个 `}` 属于 `\u{…}` 转义」（`:111`、`:138-140`）——`\u{}` 是词法细节，却由括号层来裁决。
  - `[R1]` ○ 覆盖 `ExitOrPre` 并用它结束自己（`SignOut`→`TryToClose`→`Quit`，`:107-120`）。R33 字面针对 shape，但手法同源：关闭动作挂在「每字符预判」上，而不是挂在 basic token 关闭事件上。
- 结论：偏离（7 条，4 条明确）。

### core/syntax/basic-tokens/common.xl.md（13801B / 413 行；`Common`）
- 结构：通用字符块（标识符/数字/`\u{}` 转义），`IsAppend` 决定续接，`Transit` 负责创建/续接/前一个 token 的关闭与重放，`Close` 触发父 possible；另有整套数字/大整数分类。
- 偏离：
  - `[B4]` ● `IsUnicodeEscapeStart` 用 `SourceRange.Whole(document)` 从 `index` 一路向后扫到 `count`（`:69-105`），读的是当前位置之后任意远的字符；R22 禁止查看 `tokenIndex` 之后。证据 `common.xl.md:69-105`。
  - `[X1]` ● `Transit` 会把**前一个已产出的** `Symbol`（`.`）替换成新建的 `Common`（`dot.Replace(number)`，`:534-544`），并回填 `.` 与后续数字。这是词法层的回溯改写：被替换的 `Symbol` 可能已被某个 possible 当作 `Symbol` 消费过。证据 `common.xl.md:534-544`。
  - `[S1]` ○ 数字/大整数分类（`IsNumber`、`IsBigInt`、`IsNumberBody`、`IsDecimalNumber`、`IsRadixRun`…，`:249-494`）长在 basic token 上。设计说 basic token 只把字符串切成词组、由语法层消费（R03），这里 basic token 自己下了「是不是合法数字字面量」的语法级结论。
  - `[X1]` ○ 续接靠 `AppendAndSignOut` 反复改写 `SourceRange.End`（`:531`、`:542`、`:551`），而 `BlockToken.SignOut` 覆盖了基类的「已签即抛错」——签范围从单向不可变变成可反复改写。
  - `[U1]` ○ 数字的**值**没有在 build 时提取成字段，只留原文 `Temp`；AST 只拿 `AstText`（原文）。R19 说「数据必须在 build 那一刻全部提取到 shape 字段」，对数字而言「值」是缺的。
- 符合项：`Close` 触发父单元 possible，`common.xl.md:187-199`——R03 的正向证据；`IsAppend` 只做词法续接判断，没有越权到形状层。
- 结论：偏离（5 条，2 条明确）。

### core/syntax/basic-tokens/symbol.xl.md（3937B / 79 行；`Symbol`）
- 结构：符号 token（运算符/标点），`IsAppend` 处理可合并符号，`Transit` 创建/续接/关闭前一个 token 后重放，`Close` 触发父 possible。
- 偏离：
  - `[B4]` ○ `NextCharAfter` 读 `index + 1`（`:44-54`）来判断 `IsCombineBlocked`。词法上必需，但与 R22 的字面禁令冲突（R22 的语境是 possible compute；此处是词法，记疑似）。证据 `symbol.xl.md:41`、`:44-54`。
  - `[X1]` ○ `Transit` 反复用「先 `TryToClose` 前一 token，`Built` 就返回 `Reload`」来处理「上一步建出了形状」（`:111-113`、`:122-124`、`:128-130`）。R17④ 的 Reload 是给「没被消费的 basic token」兜底的，这里成了常规的「关闭后重放」手段。
- 符合项：`Close` 触发父单元 possible（`:76-88`）；符号合并（`IsSymbol`/`IsCombinedSymbol`/`IsCombineBlocked`）是纯词法判断，没有越界。
- 结论：偏离（2 条，均疑似）。

### core/syntax/basic-tokens/wrap-symbol.xl.md（2053B / 33 行；`WrapSymbol`）
- 结构：空白 token，作为 trivia 整段吞掉空白。
- 偏离：
  - `[X1]` ● `Transit` 用 `document.GetRaw(index, buffer.End)` 把窗口内连续空白**一次扫完**，然后直接 `context.Index = at`（`:51-70`）——跳过逐字符帧。R12 的验证口径是「每个字符打印一次 ast 树」，这个 token 让逐字符口径出现空洞；R24 只允许 trivia 例外，但设计没有「整段扫描 + 直接改 Index」这种实现方式。证据 `wrap-symbol.xl.md:50-70`。
  - `[P1]` ○ `Close` 只置 `Closed`，**不问**父单元 possible（`:32-37`）。与 R03「basic token 关闭即触发 possible」字面冲突；实质是「trivia 不触发 possible」的未明写取舍，设计没有把 trivia 单列。证据 `wrap-symbol.xl.md:32-37`。
- 结论：偏离（2 条，1 条明确）。

### core/syntax/basic-tokens/area-annotation.xl.md（4497B / 99 行；`AreaAnnotation`）
- 结构：`/* … */` 区域注释。
- 偏离：
  - `[X1]` ● 自造 `Process`：`document.GetRaw(index, end)` 找 `*/`，一次吞完并改写 `context.Index`（`:59-74`），不再走 `UnitToken.Process` 的逐字符帧；`Tmp` 累积整段原文。证据 `area-annotation.xl.md:34-75`。
  - `[X1]` ● 跨窗口补丁：`if (index > 0 && this.Tmp.endsWith("*") && document.GetValue(index) === "/")`（`:50-58`）——因为驱动层按 32 字符窗口切，注释结尾正好跨窗口时要特判。设计里没有窗口，也就不该有这条补丁（与 [`10-core-syntax.md`](10-core-syntax.md) 的 `X1` 同源）。
  - `[U4]` ○ 注释的原文留在 `Tmp`/`AstText`，没有结构化字段；对注释可接受，但它同时说明 basic token 的 `Close` 并不负责把数据交给 shape。
- 符合项：`Close` 触发父单元 possible（`:101-113`）；`Transit` 是唯一创建点，创建后立刻挂载（`:164-168`），符合 R32 的「未关闭 + 挂载」。
- 结论：偏离（3 条，2 条明确）。

### core/syntax/basic-tokens/line-annotation.xl.md（3484B / 70 行；`LineAnnotation`）
- 结构：`// …` 行注释。
- 偏离：
  - `[X1]` ● 注释起点靠**回溯撤销**判定：第二个 `/` 到达时，`Transit` 先 `unit.IsUndo(preIndex)` 确认上一个字符可撤销，再 `unit.Undo(preIndex)` 把已经产出的那个 `/` 抹掉，然后才建注释 token（`:114-134`）。设计中撤销只是 `BranchStates.Undo`（本字符不归我），没有「抹掉已产出 token」这一手。证据 `line-annotation.xl.md:114-134`。
  - `[U2]` ○ 撤销只能删掉 token 本身（`Token.Undo` → `WhichUnitRangeContains` → 子单元 `Undo`），如果那个 `/` 已经被某个 possible 当作除号消费掉，撤销删不掉已提取的数据 → 悬空。证据 `line-annotation.xl.md:40-49`、`token.xl.md:192-199`。
  - `[R1]` ○ `ExitOrPre` 承担关闭：遇换行签范围→`TryToClose`→`Quit`，并返回 `Reload` 让换行本身被重新处理（`:84-112`）。再一次把「关闭」挂在每字符预判上。
- 符合项：`Close` 触发父单元 possible（`:64-76`）；`AstText` 返回注释原文（注释的 AST 就该是原文）。
- 结论：偏离（3 条，1 条明确）。

### core/syntax/basic-tokens/regex-token.xl.md（4210B / 105 行；`RegexToken`）
- 结构：`/…/flags` 正则字面量，`Consume` 逐字符累积，`Transit` 判定「这个 `/` 是不是正则开头」。
- 偏离：
  - `[S1]` ● 正则 vs 除号的区分在 basic token 里做，而且要读**前两个代码 token**（`data[at]`、`previousCode`）与模板 `CanStartAt`（`:127-156`）——这是语法层（possible/表达式形状）才能下的判断。证据 `regex-token.xl.md:127-156`。
  - `[X1]` ● 三个外挂叠在一起：`context.RegexStartAfter` 外部强制点（`:152`）、`unit.Undo(preIndex)` 回溯抹掉 `/`（`:157`）、`Consume` 在 token 内自驱动整个正则体（`:64-108`）。
  - `[R1]` ○ `ExitOrPre` 直接转给 `Consume`（`:110-114`）——`ExitOrPre` 从「预判是否退出」变成了「消费字符」的入口，与 R33 的精神正相反。
- 符合项：`Close` 触发父单元 possible（`:28-40`）。
- 结论：偏离（3 条，2 条明确）。

### core/syntax/basic-tokens/shebang.xl.md（2693B / 50 行；`Shebang`）
- 结构：文件首行 `#!…`。
- 偏离：
  - `[B4]` ● `Transit` 预读 `index + 1`（`whole.At(index + 1)`，`:90-93`）判断 `#!`。
  - `[R1]` ○ `ExitOrPre` 在行尾结束自己并返回 `Reload`；EOF 时返回 `Done`（`:39-54`）。
- 符合项：`Close` 触发父单元 possible（`:56-68`）；起点约束（必须紧跟 BOM 或位于 0）在 `Transit` 里判（`:73-82`），属词法自洽。
- 结论：偏离（2 条，1 条明确）。

### core/syntax/basic-tokens/bom.xl.md（2249B / 30 行；`Bom`）
- 结构：BOM 字符。
- 偏离：无。
- 符合项：`Transit` 创建后**立即** `SignIn`+`SignOut`+`TryToClose`（`:77-82`），是 R31「立即关闭」的标准例子；`Close` 触发父单元 possible（`:44-56`）；`CanStart` 只看模板字符集，无越权。
- 结论：符合。

---

## 本批统计

- 文件数：9；有偏离：8（明确 5）；完全符合：1（`bom`）。
- 按编号计数：`X1:8`、`R1:6`、`P4:2`、`P1:2`、`S1:2`、`B4:3`、`U2:1`、`U1:1`、`U4:1`。
- 本批最严重 3 条：
  1. `[P4]` 括号晋升完全没按 R15/R16 实现——没有 `HandleCloseDispatch`，close 时还在触发 possible，甚至有 `FlushOnClose` 反向加一次。
  2. `[X1]` 两个 token（`Common`、`RegexToken`/`LineAnnotation`）会**回溯改写已产出的 token**，词法层因此不再是单向流。
  3. `[S1]` 正则起点、数字合法性这类语法级判断落在 basic token 里，词法层与语法层的分界被抹平。
