# 12 · core/syntax/basic-tokens/string 设计偏离审计

> 判据：`01-rules.md`（R01–R36、`S1…D1`）。设计：`IMPORTANCE.md`（只读，未改）。本批 9 个文件逐行读完，结论只来自源码。
> 事实表 `docs/importance-1028/_facts/core-syntax-basic-tokens-string.md` 在本仓库**不存在**（`_facts/` 下只有 core-common-util / core-exceptions / core-extensions / core-syntax / root / typescript-* 七份），因此清单以实读源码为准；建议后续补该事实表。
> 本批共性（先给结论，正文逐文件给证据）：字符串那一层把「引号/花括号/前缀符的延迟判定」外置成了 5 个 `GuideToken` 子类；`IMPORTANCE.md` 全文没有 GuideToken、没有 `Navigate`、没有 interp/verbatim/raw 三分，这 5 个类是本批 `X1` 的主体。

---

### core/syntax/basic-tokens/string/string.xl.md（15316B / 428行；String）

- 结构：basic token 层（词法）。`String extends UnitToken`、`IsBasicToken = true`，把一个字符串切成 `ConstString`（文本片段）、`InterpolationString`（插值单元）与若干向导子单元；自身不建 shape、不参与候选判定，关闭时向父级 `ComputePossibleShapes(PossibleSource.Close)` 报一次（`string.xl.md:156-162`，与 IMPORTANCE.md:20 一致）。
- 偏离：
  - `[S1]` ○ 字符串自己判语法边界：`{` 是否开插值、哪种引号串要退原串/verbatim，并把「表达式内容」整段挂成子单元（`MountedUnit`）——切词之外还决定了结构分层 — 证据 `string.xl.md:203-213`（`} else if (value === "{") { … const mounted = new InterpolationString(this.Template); this.Add(mounted); this.MountedUnit = mounted; }`）、`string.xl.md:393-406`（raw+内插时 `{` 挂 `InterpolationGuide`）。判 ○ 的理由：把边界判定放在词法层对「模板串切词」可辩护，但 IMPORTANCE.md:7 只给了「字符串切成词组」一句，没定义「谁是插值、插值里是什么」这一层判断。
  - `[X1]` ● 三个布尔开关位派生 6 条互不相同的字符串实现分支 — 证据 `string.xl.md:191`（`if (this.IsSupportInterpolation && this.IsSupportVerbatim && !this.IsSupportRaw)`）、`:217`、`:263`、`:278`、`:281`、`:284`，兜底 `:300`（`throw new Error(\`未知字符串情况，IsSupportInterpolation=…\`)`）。IMPORTANCE.md:11 只有一个 basic token「字符串 `String`」，没有 interp/verbatim/raw 三类及其组合。
  - `[X1]` ● 用 `GuideToken` 子类当「引导令牌」：`VerbatimQuoteGuide` / `RawQuoteExitGuide` / `InterpolationGuide` 由字符串挂成 `MountedUnit` 接管当前字符，何时吐字、何时退出由向导自己决定 — 证据 `string.xl.md:198-202`、`:380-391`（`const guide = new RawQuoteExitGuide(…); … this.MountedUnit = guide; (this.MountedUnit as RawQuoteExitGuide)!.SignIn(index); return BranchStates.Reload;`）、`:400-405`。这套机制承担的是「同一个字符要看前面几个字符才能定性」的延迟判定，IMPORTANCE 里没有它的位置。
  - `[B2]` — 不涉及（补充核对）：`Process` 的 try/catch 只包装后 `throw`，不吞异常，也不在 compute/build 内 — 证据 `string.xl.md:126-133`（`catch (e) { if (e instanceof SyntaxException) { throw e; } … throw SyntaxException.FromInner(range, e); }`）。
  - `[B4]` — 不涉及（补充核对）：未读 `tokenIndex` 之后 — 证据 `string.xl.md:83`（`buffer.ValueAt(index)`）、`:256`（`buffer.At(index - 1)`）；出现的 `index + 1` 只是 `SignOut` 参数（`:307`）。
  - `[R1]` — 不涉及（补充核对）：覆写 `ExitOrPre` 不构成 R33 — 它是 `UnitToken` 的抽象成员（`core/syntax/unit-token.xl.md:48-52` `throw new Error("abstract member: ExitOrPre")`），R33 只约束 shape（`ShapeToken`）。
  - `[U4]` — 不涉及（补充核对）：`String` 无 Text 字段，文本留在 `Data` 的 `ConstString` 分片里，但确在 build 那一刻一次取走、token 随即被换出 — 证据 `typescript/tokens/literals/string-literal-shape.xl.md:41-46`（`for (const part of token.Data) { if (part instanceof ConstString) { text += (part as ConstString).TempToString(); } }`）、`typescript/tokens/expressions/forms/primary/string-literal-primary-possible-shape.xl.md:83-85`（`const shape = StringLiteralShape.FromBasicToken(token as String, context); … token.Replace(shape);`）。R19/R35 成立。
- 结论：偏离（3 条）。

---

### core/syntax/basic-tokens/string/translate.xl.md（5904B / 230行；Translate）

- 结构：`String` 的私有转义解码器，无 token 身份、不继承 Token、不碰 buffer。`Accept/Append` 逐字收敛一条转义串，`DecodeClear` 把它结算成 cooked 文本或 `null`（行续接），`IsInvalidTemplateEscape` 提供「模板串非法转义 → cooked 为 undefined」的语言口径。
- 偏离：无（符合：纯工具类，不建 shape、不参与 possible/cache；转义在 basic token 层就解成 cooked 文本（`string.xl.md:229`、`:290` 调 `DecodeClear` 后写进 `ConstString`），正是 R03「basic token 把字符串切成词组、语法层直接消费」的前置；`IsHex` 用正则而不读缓冲区）。
  - `[B2]` — 不涉及（补充核对）：`:191` 的 `throw new Error(\`未知转义字符:\\${this.Temp}\`)` 不被吞，由 `String.Process` 包成 `SyntaxException` 重抛 — 证据 `translate.xl.md:189-192`。
  - `[B4]` — 不涉及（补充核对）：只看自身 `Temp` 与调用方传入的当前字符 `nextItem`，无 index 概念 — 证据 `translate.xl.md:106-113`（`strictTemplateEscapes && (… || (this.Temp === "0" && nextItem !== undefined …))`）。
- 结论：无偏离（符合：纯转义解码工具，不涉及 shape/possible/cache；解码在 basic token 关闭前完成）。

---

### core/syntax/basic-tokens/string/string-guide.xl.md（4429B / 148行；StringGuide）

- 结构：basic token 层的「引号引导器」。`StringGuide extends GuideToken`；`BasicDispatch` 把引号交给它（`core/syntax/templates/basic-dispatch.xl.md:117-119`），它回看前缀符、按引号个数改判普通/verbatim/raw，把自身 `Replace` 成 `String`，或在数引号期间把自己挂成 `MountedUnit`。
- 偏离：
  - `[X1]` ● 一套 IMPORTANCE 没有的「回看 + 回退 + 重放」机制：沿文档向前逐个读前缀符（`:33-46`），把**已经消费掉**的字符用 `unit.Undo(i)` 退回（`:54`），再造 `String` 并把起点按 `index - 1` / `index - 2` 硬算回来（`:111`、`:119`、`:125`），最后靠 `ReloadMessage.WithoutProcessOwner` 让当前字符重放（`:112`、`:120-121`、`:127`、`:135`） — 证据 `string-guide.xl.md:33-55`（`while (true) { last = last - 1; … whole.At(last) … }` / `unit.Undo(i)`）。IMPORTANCE 没有「引导令牌」，也没有「回退已消费字符」这一步。
  - `[P3]` ○ 自己造出的 `String` 有一支被显式卸下 `MountedUnit`，从此永不 `TryToClose`，`Closed` 恒为 false — 证据 `string-guide.xl.md:123-128`（`const item = this.CreateString(false, 1); this.Replace(item).SignIn(index - 2).SignOut(index); this.Parent!.MountedUnit = null;`）对比同一文件 `:106-113`（同分支不卸下，`String` 由自己的 `ExitOrPre` 关闭）。后果直接落到 AST：`typescript/tokens/literals/string-literal-shape.xl.md:47`（`shape.IsUnterminated = !token.Closed;`）会把 `""` 读成未闭合串。判 ○ 是因为它需要运行时复现确认（空串 `""` 正走这条路径）。
  - `[C1]` ○ 每开一个引号就把前缀沿文档重扫一遍，结果（`undoSources`）是局部数组、不进任何 cache — 证据 `string-guide.xl.md:30-46`。严格说 C1 只约束 compute/build，这里是 `Transit`，故记 ○ 而非 ●。
  - `[B4]` — 不涉及（补充核对）：只回看 `index - 1` 及更早（`:34`），未读 `index + 1`。
  - `[D1]` — 不涉及（补充核对）：围栏外只有标题，说明文字全在 ```ts 围栏内（如 `:99`、`:105` 前的注释）。
- 结论：偏离（3 条）。

---

### core/syntax/basic-tokens/string/interpolation-string.xl.md（4033B / 147行；InterpolationString）

- 结构：basic token 层的「插值容器」。`InterpolationString extends UnitToken`，由 `String` 在 `{` 处挂成 `MountedUnit`（`string.xl.md:209-213`），用 `BasicBranchQueue`（只有 `BasicDispatch.Transit`，`core/syntax/templates/template.xl.md:61-70`）把插值内容词法化成自己的 `Data`，**不解析表达式**——表达式由语法层 `BuildInterpolation` 在 build 时读 `interp.Data` 产出（`typescript/tokens/expressions/forms/primary/template-primary-possible-shape.xl.md:215-239`）。
- 偏离：
  - `[X1]` ● 插值的终点不靠 end，而靠「数 `}`」的向导：`ExitOrPre` 遇 `}` 就挂 `InterpolationExitGuide` 并 `Reload`（`:131-146`），由该向导比 `BracketCount` 与 `AncestorString.InterpolationCount` 决定吃掉几个右花括号（`interpolation-exit-guide.xl.md:38-48`） — 证据 `interpolation-string.xl.md:140-144`（`const mounted = new InterpolationExitGuide(this.Template); this.Add(mounted); this.MountedUnit = mounted;`）。IMPORTANCE.md:19 里「形状是否完整」由 end 判，这里另开了一条按计数收口的通道。
  - `[U1]` ○ `Default` 对任何字符都不消费 — 证据 `interpolation-string.xl.md:42-48`（`if (value === "\r" \|\| value === "\n" \|\| value === " " \|\| value === "\t") { return; }`，其余无语句）。正常路径由 `BasicDispatch` 兜底，但一旦某个字符让 `BasicDispatch` 的某条分支 Undo 到底（如 `core/syntax/templates/basic-dispatch.xl.md:120` 注释里「`{` 在 `\u{…}` 转义进行中时要让位（Undo 给 Common）」的情形），落进 `Default` 的字符既不进 `Data` 也不发 `ReloadMessage`，等于静默丢弃。
  - `[B2]` — 不涉及（补充核对）：`:121-128` 的 catch 同样只包装后重抛。
  - `[B4]` — 不涉及（补充核对）：只读 `:78`（`buffer.ValueAt(index)`），`index + 1` 仅作 `:53` 的 `SignOut` 参数。
- 结论：偏离（2 条）。

---

### core/syntax/basic-tokens/string/const-string.xl.md（3939B / 210行；ConstString）

- 结构：字符串里的「文本片段」块。`ConstString extends BlockToken`，内容就是 `BlockToken.Temp` 一个原始字符串；不参与 basic dispatch（`IsAppend` 恒 false，`:24-28`），只由 `String.AppendToLastConstString` 逐段写入（`string.xl.md:166-186`），并对外提供缩进/换行的事后修剪方法。
- 偏离：
  - `[U4]` ○ 关闭时不产出任何结构化字段，文本始终是 raw `Temp` — 证据 `const-string.xl.md:13`（继承的 `Temp`）、`:51-56`（`Close` 只 `this.Closed = true; return CloseStates.Nothing;`）、`:67-71`（`AstText` 原样 `return this.Temp`）。语法层必须回到分片里再拼再切：`typescript/tokens/literals/string-literal-shape.xl.md:41-46` 逐片 `TempToString()` 串接，`typescript/tokens/expressions/forms/primary/template-primary-possible-shape.xl.md:126-137` 再按 `ConstString`/`InterpolationString` 切出 head/middle/tail。IMPORTANCE.md:55 的口径是「build 那一刻提取到 shape 字段」，这里实际是「build 时才从 raw 分片拼」，且 `String.Data` 里 `ConstString`（Block）/`InterpolationString`（Unit）/`GuideToken` 三型混装，关闭后 `Data` 不是「只剩子节点形状」的形态（IMPORTANCE.md:56）。
  - `[X1]` ○ 已词法化的文本被事后按字符改写：`FormatRawIndent` 用 `RemoveLastLine` / `RemoveFirstLine` / `RemoveIndent(At)` / `RemoveCharAt` 从 `Temp` 里逐个删字符来去掉原串缩进 — 证据 `const-string.xl.md:45-49`（`this.Temp = this.Temp.substring(0, Index) + this.Temp.substring(Index + 1);`）、`:110-133`、`:135-164`、`:186-210`，调用点 `string.xl.md:330-345`。IMPORTANCE 没有「关闭后再改写已词法化文本」这一步。
  - `[B2]` — 不涉及（补充核对）：`:40`、`:123`、`:153`、`:180`、`:183`、`:197` 的 `throw new Error` 都直接抛，没有 catch。
  - `[N]` — 不涉及：无 possible/cache/`ComputePossibleShapes`，`Close` 返回 `Nothing`（`:51-56`）。
- 结论：偏离（2 条）。

---

### core/syntax/basic-tokens/string/interpolation-guide.xl.md（2261B / 77行；InterpolationGuide）

- 结构：basic token 层的「前缀式内插定界向导」。`InterpolationGuide extends GuideToken`，数连续 `{`，够 `InterpolationCount` 个就挂 `InterpolationString`，不够就把这些 `{` 退回常量文本。
- 偏离：
  - `[X1]` ● 用「先记账再定界」代替词法切分：`Items` 记每个 `{` 的位置、`BracketCount` 计数（`:25-27`、`:73-76`），够数时 `RemoveSelf()` 后把多出来的 `{` 逐个写回常量（`:43-51`）、再往父字符串上挂 `InterpolationString`（`:52-61`）、最后 `ReloadMessage`（`:62`）；不够数时把所有 `{` 全退成常量（`:66-70`） — 证据 `interpolation-guide.xl.md:41-70`。IMPORTANCE 连「插值」这一概念都没有，更没有「先收集位置、再决定退回还是升级」的层。
  - `[B4]` — 不涉及（补充核对）：只读当前字符 `:38` 与已记下的历史坐标 `:47`、`:68`。
  - `[U3]` — 不涉及（补充核对）：重放走 `ReloadMessage.WithoutProcessOwner`（`:62`、`:70`），仍属 Reload Message 家族。
  - `[B3]` — 不涉及（补充核对）：`Items` 里是过去的括号，没有越过未消费单元去看后面的 shape/token。
- 结论：偏离（1 条）。

---

### core/syntax/basic-tokens/string/raw-quote-exit-guide.xl.md（1860B / 69行；RawQuoteExitGuide）

- 结构：basic token 层的「原串收尾向导」。`RawQuoteExitGuide extends GuideToken`，数结尾引号，数满 `RawQuoteCount` 个就替父字符串退出。
- 偏离：
  - `[X1]` ● 关闭动作由子单元跨对象执行：`this.ParentString.ForceExit(context, buffer, index)` + `this.ParentString.FormatRawIndent()`（`:44-46`）；不足数时把已收集的引号全部写回常量（`:57-60`）再 `ReloadMessage`（`:63`）；超出起始数量则抛 `Error`（`:51`） — 证据 `raw-quote-exit-guide.xl.md:40-52`。`GuideToken` 本身不在 IMPORTANCE 里，「由子单元命令父 token 退出」更不在。
  - `[B2]` — 不涉及（补充核对）：`:51` 的 `throw new Error("结尾原始字符串双引号数量超过起始数量")` 直接向上抛（最终由 `UnitToken.Process` 包成 `SyntaxException`），未被吞 — 符合 IMPORTANCE.md:66。
  - `[B4]` — 不涉及（补充核对）：只读 `:39` 当前字符与历史 `Items`（`:68`）。
- 结论：偏离（1 条）。

---

### core/syntax/basic-tokens/string/interpolation-exit-guide.xl.md（1319B / 54行；InterpolationExitGuide）

- 结构：basic token 层的「插值收尾向导」。`InterpolationExitGuide extends GuideToken`，数 `}`，够 `AncestorString.InterpolationCount` 个就让插值单元退出。
- 偏离：
  - `[X1]` ● 同族机制：`BracketCount++` 与祖先字符串的 `InterpolationCount` 比大小（`:38-48`），够数则 `RemoveSelf()` + `(this.Parent as InterpolationString)!.ForceExit(context, buffer, index)`（`:41-42`）；`Items`（`:26`、`:53`）只写不读，是这套计数机制的残留账本。
  - `[X1]` ○ 引导器自身的诊断退化：超量时抛空消息 `throw new Error("")`（`:47`），「不正常」时只有 `throw new Error("插值关闭异常")`（`:51`），两者都不带位置 — 与 IMPORTANCE.md:66「异常是用户期望看到的诊断」相悖。
  - `[B2]` — 不涉及（补充核对）：异常直接抛，没有 catch。
  - `[B4]` — 不涉及（补充核对）：只读 `:37` 当前字符。
- 结论：偏离（2 条）。

---

### core/syntax/basic-tokens/string/verbatim-quote-guide.xl.md（1241B / 49行；VerbatimQuoteGuide）

- 结构：basic token 层的「verbatim 引号判定器」。`VerbatimQuoteGuide extends GuideToken`，`"` 表示一个引号字符，非 `"` 表示字符串结束。
- 偏离：
  - `[X1]` ● 又是引导器，且退出位置与重放位置靠 `index±1` 硬算：`"` → 把一个引号写进常量、必要时把常量 `SignIn(index - 1)`（`:34-40`）；非 `"` → `ForceExit(context, buffer, index - 1)` 再 `ReloadMessage` 重放当前字符（`:43-47`） — 证据 `verbatim-quote-guide.xl.md:33-48`。
  - `[B4]` — 不涉及（补充核对）：只读 `:33` 的当前字符。
  - `[B2]` / `[D1]` — 不涉及（补充核对）：无 catch；围栏外只有标题。
- 结论：偏离（1 条）。

---

## 本批统计

| 文件 | 字节 | 代码行 | 主要类 | 偏离条数 | 编号 |
| --- | --- | --- | --- | --- | --- |
| core/syntax/basic-tokens/string/string.xl.md | 15316 | 428 | String | 3 | `S1` ○、`X1` ●×2 |
| core/syntax/basic-tokens/string/translate.xl.md | 5904 | 230 | Translate | 0 | 无（`N`） |
| core/syntax/basic-tokens/string/string-guide.xl.md | 4429 | 148 | StringGuide | 3 | `X1` ●、`P3` ○、`C1` ○ |
| core/syntax/basic-tokens/string/interpolation-string.xl.md | 4033 | 147 | InterpolationString | 2 | `X1` ●、`U1` ○ |
| core/syntax/basic-tokens/string/const-string.xl.md | 3939 | 210 | ConstString | 2 | `U4` ○、`X1` ○ |
| core/syntax/basic-tokens/string/interpolation-guide.xl.md | 2261 | 77 | InterpolationGuide | 1 | `X1` ● |
| core/syntax/basic-tokens/string/raw-quote-exit-guide.xl.md | 1860 | 69 | RawQuoteExitGuide | 1 | `X1` ● |
| core/syntax/basic-tokens/string/interpolation-exit-guide.xl.md | 1319 | 54 | InterpolationExitGuide | 2 | `X1` ●、`X1` ○ |
| core/syntax/basic-tokens/string/verbatim-quote-guide.xl.md | 1241 | 49 | VerbatimQuoteGuide | 1 | `X1` ● |
| **合计** | **40302** | **1412** | 9 类 | **15** | ● 8 / ○ 7 |

按编号：`X1` 10（● 8 / ○ 2）、`S1` 1（○）、`P3` 1（○）、`C1` 1（○）、`U1` 1（○）、`U4` 1（○）；`B2`/`B4`/`B3`/`R1`/`U3`/`D1` 全批为 0。

三条全批结论：

1. **`X1` 是本批的绝对主体（10/15）**：`GuideToken` + `Navigate` 是一套完整的「延迟判定」层——回看前缀（StringGuide）、数引号（RawQuoteExitGuide）、数 `{`/`}`（InterpolationGuide / InterpolationExitGuide）、判 `""` 双写（VerbatimQuoteGuide）。它承担的是「当前字符的定性依赖前/后若干字符」这件事，IMPORTANCE 里既没有 GuideToken 也没有对应的替代物（end 只在形状层面收口）。
2. **字符串的数据交付方式与 IMPORTANCE.md:55-56 有张力但不是硬违规**：`String` 没有 Text 字段，文本以 `ConstString.Temp` 原始分片留存，`ConstString.Close` 不产出任何字段（`const-string.xl.md:51-56`），真正的提取发生在 shape build 时逐片拼接（`string-literal-shape.xl.md:41-46`）。按 R19/R35 的字面（build 那一刻提取、basic token 用完丢弃）成立，故只记 `U4` ○；但它解释了为什么语法层必须知道 `ConstString`/`InterpolationString` 的存在（`template-primary-possible-shape.xl.md:126-137`）。
3. **`B2`/`B4` 干净**：两处 `try/catch`（`string.xl.md:126-133`、`interpolation-string.xl.md:121-128`）都是「非 `SyntaxException` → 包上源码范围 → 重抛」，没有吞异常；全批没有一处读 `index + 1`，`index + 1` 只出现在 `SignOut` 的参数里。唯一实质缺陷是 `string-guide.xl.md:126` 把刚造出的空串 `String` 卸下 `MountedUnit`，使它永不 `TryToClose`，`Closed` 恒 false，进而让 `IsUnterminated` 误报（`P3` ○）。
